import { detectBounces, detectCircular, detectInternal, detectLoans, detectPenalCharges, detectRecurring } from "./detectors";
import { buildMonthMetrics } from "./metrics";
import { normalizeTransactions } from "./normalize";
import { buildFlags, riskFromFlags } from "./risk";
import { buildAllModuleSheets } from "./moduleSheets";
import type { AnalysisInput, BounceEvent } from "./types";
import { accountId, bankName, formatINR, getInfo, groupBy, round, totalBy } from "./utils";

export function analyzeBankStatements(input: AnalysisInput) {
  const transactions = normalizeTransactions(input.statements);
  const months = buildMonthMetrics(transactions);
  const primaryStatement = input.statements[0];
  const extractedAccountName =
    getInfo(primaryStatement, /account name/i) ||
    getInfo(primaryStatement, /customer name/i) ||
    getInfo(primaryStatement, /account holder/i);
  const accountName =
    (extractedAccountName && extractedAccountName.trim()) ||
    (input.applicantName && input.applicantName.trim()) ||
    "Applicant";
  const accountNumber = primaryStatement ? accountId(primaryStatement, 0) : "-";
  const bank = primaryStatement ? bankName(primaryStatement) : "-";
  const totalCredits = totalBy(transactions, "credit");
  const totalDebits = totalBy(transactions, "debit");
  const netCashFlow = round(totalCredits - totalDebits);
  const averageBalance = round(months.reduce((sum, month) => sum + month.abb, 0) / Math.max(months.length, 1));
  const totalCashDeposits = months.reduce((sum, month) => sum + month.cashDeposits, 0);
  const cashDepositRatio = totalCredits ? (totalCashDeposits / totalCredits) * 100 : 0;
  const balanceValues = transactions
    .map((txn) => txn.balance)
    .filter((bal): bal is number => typeof bal === "number");
  const highestBalance = balanceValues.length ? Math.max(...balanceValues) : 0;
  const lowestBalance = balanceValues.length ? Math.min(...balanceValues) : 0;
  const bounces = detectBounces(transactions);
  const penalCharges = detectPenalCharges(transactions);
  const loans = detectLoans(transactions);
  const circular = detectCircular(transactions);
  const internalGroup = detectInternal(transactions);
  const recurringDebitRaw = detectRecurring(transactions, "Debit");
  const recurringCreditRaw = detectRecurring(transactions, "Credit");
  const recurringDebitTotal = recurringDebitRaw.reduce((sum, row) => sum + row.avgAmount * row.occurrences, 0);
  const recurringCreditTotal = recurringCreditRaw.reduce((sum, row) => sum + row.avgAmount * row.occurrences, 0);

  const penalEvents: BounceEvent[] = penalCharges.map((txn) => ({
    date: txn.dateText,
    monthKey: txn.monthKey,
    type: "Penal Charges",
    party: txn.party,
    amount: txn.amount,
    reason: /MIN BAL|MINIMUM BAL|CHARGE|FEE/i.test(txn.narration) ? "Bank charges / penalty" : "Bank charges",
    bank: txn.accountId,
  }));

  const events: BounceEvent[] = [...bounces, ...penalEvents];

  const flags = buildFlags({ months, transactions, bounces, penalCharges, circular, recurringDebitTotal, recurringCreditTotal });
  const riskScore = riskFromFlags(flags, months);

  const statementStart = transactions[0]?.dateText ?? "-";
  const statementEnd = transactions[transactions.length - 1]?.dateText ?? "-";

  const highestTns = [...transactions]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20)
    .map((txn, index) => ({
      rank: index + 1,
      date: txn.dateText,
      type: txn.direction,
      party: txn.party,
      amount: txn.amount,
      narration: txn.narration,
    }));

  const spendGroups = Object.values(groupBy(transactions.filter((txn) => txn.debit > 0), (txn) => txn.category));
  const spendTotal = spendGroups.reduce((sum, rows) => sum + rows.reduce((inner, txn) => inner + txn.debit, 0), 0);

  // Per-bank metrics for Exec Summary (first two accounts)
  const byAccount = groupBy(transactions, (txn) => txn.accountId);

  function buildBankSummary(accountIdValue: string | undefined) {
    if (!accountIdValue) return null;
    const rows = byAccount[accountIdValue];
    if (!rows || rows.length === 0) return null;

    const bankMonths = buildMonthMetrics(rows);
    const bankTotalCredits = totalBy(rows, "credit");
    const bankTotalDebits = totalBy(rows, "debit");
    const bankNetCashFlow = round(bankTotalCredits - bankTotalDebits);
    const bankAvgBalance = round(
      bankMonths.reduce((sum, m) => sum + m.abb, 0) / Math.max(bankMonths.length, 1),
    );
    const bankCashDeposits = bankMonths.reduce((sum, m) => sum + m.cashDeposits, 0);
    const bankCashDepositRatio = bankTotalCredits ? (bankCashDeposits / bankTotalCredits) * 100 : 0;
    const bankBalances = rows
      .map((txn) => txn.balance)
      .filter((bal): bal is number => typeof bal === "number");
    const bankHighestBalance = bankBalances.length ? Math.max(...bankBalances) : 0;
    const bankLowestBalance = bankBalances.length ? Math.min(...bankBalances) : 0;
    const bankCreditCount = rows.filter((txn) => txn.credit > 0).length;
    const bankDebitCount = rows.filter((txn) => txn.debit > 0).length;
    const bankBounceCount = bounces.filter((bounce) => bounce.bank === accountIdValue).length;

    return {
      totalCredits: bankTotalCredits,
      totalDebits: bankTotalDebits,
      netCashFlow: bankNetCashFlow,
      avgBalance: bankAvgBalance,
      highestBalance: bankHighestBalance,
      lowestBalance: bankLowestBalance,
      creditCount: bankCreditCount,
      debitCount: bankDebitCount,
      avgInflow: bankMonths.length ? bankTotalCredits / bankMonths.length : 0,
      avgOutflow: bankMonths.length ? bankTotalDebits / bankMonths.length : 0,
      cashDepositRatio: bankCashDepositRatio,
      bounceCount: bankBounceCount,
    };
  }

  const applicantBanks = input.statements.map((statement, index) => ({
    name: bankName(statement),
    account: accountId(statement, index),
    ifsc: getInfo(statement, /ifsc/i) || "-",
    branch: getInfo(statement, /branch/i) || "-",
  }));

  const bank1 = applicantBanks[0];
  const bank2 = applicantBanks[1];
  const bank1Summary = buildBankSummary(bank1?.account);
  const bank2Summary = buildBankSummary(bank2?.account);

  const txnsByMonth = groupBy(transactions, (txn) => txn.monthKey);
  const minAbb = months.reduce((min, month) => Math.min(min, month.abb), Infinity);
  const maxClosingBal = months.reduce((max, month) => Math.max(max, month.closingBal), 0);
  const inferredLimit = minAbb < 0 ? Math.abs(minAbb) : maxClosingBal || 1;

  const camAnalysis = months.map((month) => {
    const monthBounces = bounces.filter((bounce) => bounce.monthKey === month.monthKey);
    const inwardBounces = monthBounces.filter((bounce) => bounce.direction === "Inward");
    const outwardBounces = monthBounces.filter((bounce) => bounce.direction === "Outward");

    const iwReturnCount = inwardBounces.length;
    const iwReturn = inwardBounces.reduce((sum, bounce) => sum + bounce.amount, 0);
    const owReturnCount = outwardBounces.length;
    const owReturn = outwardBounces.reduce((sum, bounce) => sum + bounce.amount, 0);

    const absAbb = Math.abs(month.abb);
    const utilizationRaw = inferredLimit > 0 ? absAbb / inferredLimit : 0;
    const utilization = Math.max(0, Math.min(utilizationRaw, 2));

    const monthTxns = txnsByMonth[month.monthKey] || [];
    const balanceSamples = monthTxns
      .map((txn) => txn.balance)
      .filter((value): value is number => typeof value === "number");
    const positiveSamples = balanceSamples.filter((value) => value >= 0).length;
    const intServiced = balanceSamples.length
      ? Math.round((positiveSamples / balanceSamples.length) * 30)
      : null;

    return {
      month: month.month,
      netCreditCount: month.creditCount,
      netCredit: month.totalCredits,
      netDebitCount: month.debitCount,
      netDebit: month.totalDebits,
      iwReturnCount,
      iwReturn,
      owReturnCount,
      owReturn,
      abb: month.abb,
      utilization,
      intServiced,
    };
  });

  const bouncesByMonth = groupBy(bounces, (bounce) => bounce.monthKey);
  const penalByMonth = groupBy(penalCharges, (txn) => txn.monthKey);

  type MomContext = {
    monthKey: string;
    minEodBalance: number | null;
    maxEodBalance: number | null;
    avgEodBalance: number | null;
    overdrawInstances: number;
    overdrawDays: number;
    missingDatesLabel: string | null;
    tradeDebitAmount: number;
    tradeDebitCount: number;
    tradeCreditAmount: number;
    tradeCreditCount: number;
    salaryAmount: number;
    salaryCount: number;
    internalDebitAmount: number;
    internalDebitCount: number;
    internalCreditAmount: number;
    internalCreditCount: number;
    netDebitAmount: number;
    netDebitCount: number;
    netCreditAmount: number;
    netCreditCount: number;
    owBounceCount: number;
    owBounceAmount: number;
    owBouncePct: number;
    iwBounceCount: number;
    iwBounceAmount: number;
    iwBouncePct: number;
    technicalInwardCount: number;
    technicalInwardAmount: number;
    technicalInwardPct: number;
    chequeReturnChargeCount: number;
    chequeReturnChargeAmount: number;
    emiBounceCount: number;
    emiBounceAmount: number;
    bounceChargeCount: number;
    bounceChargeAmount: number;
    bankChargeCount: number;
    bankChargeAmount: number;
    penaltyCount: number;
    penaltyAmount: number;
    overutilPenaltyCount: number;
    overutilPenaltyAmount: number;
    ecsNachCount: number;
    ecsNachAmount: number;
    emiCount: number;
    emiAmount: number;
    loanDisbCount: number;
    loanDisbAmount: number;
    interestPaidCount: number;
    interestPaidAmount: number;
    cashDepositCount: number;
    cashDepositAmount: number;
    cashWithdrawalCount: number;
    cashWithdrawalAmount: number;
    chequeReceiptCount: number;
    chequeReceiptAmount: number;
    chequePaidCount: number;
    chequePaidAmount: number;
    upiCreditCount: number;
    upiCreditAmount: number;
    upiDebitCount: number;
    upiDebitAmount: number;
    onlineReceiptCount: number;
    onlineReceiptAmount: number;
    onlinePaymentCount: number;
    onlinePaymentAmount: number;
    otherReceiptCount: number;
    otherReceiptAmount: number;
    otherPaymentCount: number;
    otherPaymentAmount: number;
  };

  const chequePattern = /CHQ|CHEQUE|CLG|CHEQUE RET/i;
  const bouncePattern = /BOUNCE|RETURN/i;
  const penaltyPattern = /PENAL|PENALTY/i;
  const overutilPenaltyPattern = /MIN BAL|MINIMUM BAL|NON MAINTENANCE|OVER ?UTILISATION|OVER ?UTILIZATION/i;

  const momContexts: MomContext[] = months.map((month) => {
    const monthTxns = txnsByMonth[month.monthKey] || [];
    const debitTxns = monthTxns.filter((txn) => txn.debit > 0);
    const creditTxns = monthTxns.filter((txn) => txn.credit > 0);

    const tradeDebitTxns = debitTxns.filter((txn) => txn.category === "Trade Debit");
    const tradeCreditTxns = creditTxns.filter((txn) => txn.category === "Trade Credit");

    const salaryTxns = monthTxns.filter((txn) => txn.category === "Salary");
    const salaryAmount = salaryTxns.reduce((sum, txn) => sum + txn.debit + txn.credit, 0);

    const internalTxns = monthTxns.filter((txn) =>
      /\bSELF|OWN|SISTER|GROUP|PROMOTER|DIRECTOR|PARTNER|INTER.?COMPANY|TRANSFER TO OWN/i.test(txn.narration),
    );
    const internalDebitTxns = internalTxns.filter((txn) => txn.debit > 0);
    const internalCreditTxns = internalTxns.filter((txn) => txn.credit > 0);

    const internalDebitAmount = internalDebitTxns.reduce((sum, txn) => sum + txn.debit, 0);
    const internalCreditAmount = internalCreditTxns.reduce((sum, txn) => sum + txn.credit, 0);

    const netDebitAmount = month.totalDebits - internalDebitAmount;
    const netCreditAmount = month.totalCredits - internalCreditAmount;
    const netDebitCount = debitTxns.length - internalDebitTxns.length;
    const netCreditCount = creditTxns.length - internalCreditTxns.length;

    const monthBounces = bouncesByMonth[month.monthKey] || [];
    const outwardBounces = monthBounces.filter((bounce) => bounce.direction === "Outward");
    const inwardBounces = monthBounces.filter((bounce) => bounce.direction === "Inward");

    const owBounceCount = outwardBounces.length;
    const owBounceAmount = outwardBounces.reduce((sum, bounce) => sum + bounce.amount, 0);
    const iwBounceCount = inwardBounces.length;
    const iwBounceAmount = inwardBounces.reduce((sum, bounce) => sum + bounce.amount, 0);

    const owBouncePct = month.totalDebits > 0 ? (owBounceAmount / month.totalDebits) * 100 : 0;
    const iwBouncePct = month.totalCredits > 0 ? (iwBounceAmount / month.totalCredits) * 100 : 0;

    const technicalInward = inwardBounces.filter(
      (bounce) => bounce.type === "Cheque Return" && bounce.reason !== "Insufficient Funds",
    );
    const technicalInwardCount = technicalInward.length;
    const technicalInwardAmount = technicalInward.reduce((sum, bounce) => sum + bounce.amount, 0);
    const technicalInwardPct = month.totalCredits > 0 ? (technicalInwardAmount / month.totalCredits) * 100 : 0;

    const monthPenal = penalByMonth[month.monthKey] || [];
    const bankChargeCount = monthPenal.length;
    const bankChargeAmount = monthPenal.reduce((sum, txn) => sum + txn.debit, 0);

    const chequeReturnChargeTxns = monthPenal.filter((txn) => chequePattern.test(txn.narration));
    const chequeReturnChargeCount = chequeReturnChargeTxns.length;
    const chequeReturnChargeAmount = chequeReturnChargeTxns.reduce((sum, txn) => sum + txn.debit, 0);

    const emiBounceEvents = monthBounces.filter((bounce) => /EMI Bounce/i.test(bounce.type));
    const emiBounceCount = emiBounceEvents.length;
    const emiBounceAmount = emiBounceEvents.reduce((sum, bounce) => sum + bounce.amount, 0);

    const bounceChargeTxns = monthPenal.filter((txn) => bouncePattern.test(txn.narration));
    const bounceChargeCount = bounceChargeTxns.length;
    const bounceChargeAmount = bounceChargeTxns.reduce((sum, txn) => sum + txn.debit, 0);

    const penaltyTxns = monthPenal.filter((txn) => penaltyPattern.test(txn.narration));
    const penaltyCount = penaltyTxns.length;
    const penaltyAmount = penaltyTxns.reduce((sum, txn) => sum + txn.debit, 0);

    const overutilPenaltyTxns = penaltyTxns.filter((txn) => overutilPenaltyPattern.test(txn.narration));
    const overutilPenaltyCount = overutilPenaltyTxns.length;
    const overutilPenaltyAmount = overutilPenaltyTxns.reduce((sum, txn) => sum + txn.debit, 0);

    const ecsNachTxns = monthTxns.filter((txn) => txn.debit > 0 && txn.mode === "ECS/NACH");
    const ecsNachCount = ecsNachTxns.length;
    const ecsNachAmount = ecsNachTxns.reduce((sum, txn) => sum + txn.debit, 0);

    const emiTxns = monthTxns.filter(
      (txn) => txn.debit > 0 && txn.category === "Loan & EMI" && /EMI|LOAN|NACH|ECS/i.test(txn.narration),
    );
    const emiCount = emiTxns.length;
    const emiAmount = emiTxns.reduce((sum, txn) => sum + txn.debit, 0);

    const loanDisbTxns = monthTxns.filter(
      (txn) => txn.credit > 0 && txn.category === "Loan & EMI" && /LOAN|DISBURS/i.test(txn.narration),
    );
    const loanDisbCount = loanDisbTxns.length;
    const loanDisbAmount = loanDisbTxns.reduce((sum, txn) => sum + txn.credit, 0);

    const interestPaidTxns = monthTxns.filter(
      (txn) => txn.debit > 0 && (/\bINT\b/i.test(txn.narration) || /INTEREST/i.test(txn.narration)),
    );
    const interestPaidCount = interestPaidTxns.length;
    const interestPaidAmount = interestPaidTxns.reduce((sum, txn) => sum + txn.debit, 0);

    const cashDepositTxns = creditTxns.filter((txn) => txn.category === "Cash Deposit");
    const cashDepositCount = cashDepositTxns.length;
    const cashDepositAmount = cashDepositTxns.reduce((sum, txn) => sum + txn.credit, 0);

    const cashWithdrawalTxns = debitTxns.filter((txn) => txn.category === "Cash Withdrawal");
    const cashWithdrawalCount = cashWithdrawalTxns.length;
    const cashWithdrawalAmount = cashWithdrawalTxns.reduce((sum, txn) => sum + txn.debit, 0);

    const chequeReceiptTxns = creditTxns.filter((txn) => txn.mode === "CHEQUE");
    const chequeReceiptCount = chequeReceiptTxns.length;
    const chequeReceiptAmount = chequeReceiptTxns.reduce((sum, txn) => sum + txn.credit, 0);

    const chequePaidTxns = debitTxns.filter((txn) => txn.mode === "CHEQUE");
    const chequePaidCount = chequePaidTxns.length;
    const chequePaidAmount = chequePaidTxns.reduce((sum, txn) => sum + txn.debit, 0);

    const upiCreditTxns = creditTxns.filter((txn) => txn.mode === "UPI");
    const upiCreditCount = upiCreditTxns.length;
    const upiCreditAmount = upiCreditTxns.reduce((sum, txn) => sum + txn.credit, 0);

    const upiDebitTxns = debitTxns.filter((txn) => txn.mode === "UPI");
    const upiDebitCount = upiDebitTxns.length;
    const upiDebitAmount = upiDebitTxns.reduce((sum, txn) => sum + txn.debit, 0);

    const onlineReceiptTxns = creditTxns.filter(
      (txn) => txn.mode === "NEFT" || txn.mode === "RTGS" || txn.mode === "IMPS",
    );
    const onlineReceiptCount = onlineReceiptTxns.length;
    const onlineReceiptAmount = onlineReceiptTxns.reduce((sum, txn) => sum + txn.credit, 0);

    const onlinePaymentTxns = debitTxns.filter(
      (txn) => txn.mode === "NEFT" || txn.mode === "RTGS" || txn.mode === "IMPS",
    );
    const onlinePaymentCount = onlinePaymentTxns.length;
    const onlinePaymentAmount = onlinePaymentTxns.reduce((sum, txn) => sum + txn.debit, 0);

    const knownReceiptIds = new Set(
      [...cashDepositTxns, ...chequeReceiptTxns, ...upiCreditTxns, ...onlineReceiptTxns].map((txn) => txn.id),
    );
    const knownPaymentIds = new Set(
      [...cashWithdrawalTxns, ...chequePaidTxns, ...upiDebitTxns, ...onlinePaymentTxns].map((txn) => txn.id),
    );

    const otherReceiptTxns = creditTxns.filter((txn) => !knownReceiptIds.has(txn.id));
    const otherReceiptCount = otherReceiptTxns.length;
    const otherReceiptAmount = otherReceiptTxns.reduce((sum, txn) => sum + txn.credit, 0);

    const otherPaymentTxns = debitTxns.filter((txn) => !knownPaymentIds.has(txn.id));
    const otherPaymentCount = otherPaymentTxns.length;
    const otherPaymentAmount = otherPaymentTxns.reduce((sum, txn) => sum + txn.debit, 0);

    const balanceSamples = monthTxns
      .map((txn) => txn.balance)
      .filter((value): value is number => typeof value === "number");

    const minEodBalance = balanceSamples.length ? Math.min(...balanceSamples) : null;
    const maxEodBalance = balanceSamples.length ? Math.max(...balanceSamples) : null;
    const avgEodBalance =
      balanceSamples.length > 0
        ? balanceSamples.reduce((sum, balance) => sum + balance, 0) / balanceSamples.length
        : null;

    const byDate = groupBy(
      monthTxns.filter((txn) => typeof txn.balance === "number"),
      (txn) => txn.dateText,
    );
    const orderedDates = Object.keys(byDate).sort();
    let overdrawInstances = 0;
    let overdrawDays = 0;
    let prevOverdrawn = false;
    for (const date of orderedDates) {
      const dayTxns = byDate[date];
      const lastBalance = dayTxns[dayTxns.length - 1].balance as number;
      const isOverdrawn = lastBalance < 0;
      if (isOverdrawn) {
        overdrawDays += 1;
        if (!prevOverdrawn) {
          overdrawInstances += 1;
        }
      }
      prevOverdrawn = isOverdrawn;
    }

    const missingParts: string[] = [];
    applicantBanks.forEach((bank) => {
      const accountIdValue = bank.account;
      const accountTxns = monthTxns.filter((txn) => txn.accountId === accountIdValue);
      if (accountTxns.length === 0) return;

      const daysWithTxns = new Set(
        accountTxns.map((txn) => Number(txn.dateText.slice(8, 10))).filter((day) => Number.isFinite(day)),
      );
      if (daysWithTxns.size === 0) return;

      const allDays = Array.from(daysWithTxns.values());
      allDays.sort((a, b) => a - b);
      const minDay = allDays[0];
      const maxDay = allDays[allDays.length - 1];
      const missingDays: number[] = [];
      for (let d = minDay; d <= maxDay; d++) {
        if (!daysWithTxns.has(d)) missingDays.push(d);
      }
      if (missingDays.length === 0) return;

      const ranges: string[] = [];
      let start = missingDays[0];
      let prev = missingDays[0];
      for (let i = 1; i < missingDays.length; i++) {
        const current = missingDays[i];
        if (current === prev + 1) {
          prev = current;
          continue;
        }
        ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
        start = current;
        prev = current;
      }
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);

      const shortAccount = accountIdValue.slice(-4);
      missingParts.push(`[${ranges.join(", ")}] - ${shortAccount}`);
    });

    const missingDatesLabel = missingParts.length ? missingParts.join(", ") : null;

    return {
      monthKey: month.monthKey,
      minEodBalance: minEodBalance != null ? round(minEodBalance) : null,
      maxEodBalance: maxEodBalance != null ? round(maxEodBalance) : null,
      avgEodBalance: avgEodBalance != null ? round(avgEodBalance) : null,
      overdrawInstances,
      overdrawDays,
      missingDatesLabel,
      tradeDebitAmount: round(tradeDebitTxns.reduce((sum, txn) => sum + txn.debit, 0)),
      tradeDebitCount: tradeDebitTxns.length,
      tradeCreditAmount: round(tradeCreditTxns.reduce((sum, txn) => sum + txn.credit, 0)),
      tradeCreditCount: tradeCreditTxns.length,
      salaryAmount: round(salaryAmount),
      salaryCount: salaryTxns.length,
      internalDebitAmount: round(internalDebitAmount),
      internalDebitCount: internalDebitTxns.length,
      internalCreditAmount: round(internalCreditAmount),
      internalCreditCount: internalCreditTxns.length,
      netDebitAmount: round(netDebitAmount),
      netDebitCount,
      netCreditAmount: round(netCreditAmount),
      netCreditCount,
      owBounceCount,
      owBounceAmount: round(owBounceAmount),
      owBouncePct,
      iwBounceCount,
      iwBounceAmount: round(iwBounceAmount),
      iwBouncePct,
      technicalInwardCount,
      technicalInwardAmount: round(technicalInwardAmount),
      technicalInwardPct,
      chequeReturnChargeCount,
      chequeReturnChargeAmount: round(chequeReturnChargeAmount),
      emiBounceCount,
      emiBounceAmount: round(emiBounceAmount),
      bounceChargeCount,
      bounceChargeAmount: round(bounceChargeAmount),
      bankChargeCount,
      bankChargeAmount: round(bankChargeAmount),
      penaltyCount,
      penaltyAmount: round(penaltyAmount),
      overutilPenaltyCount,
      overutilPenaltyAmount: round(overutilPenaltyAmount),
      ecsNachCount,
      ecsNachAmount: round(ecsNachAmount),
      emiCount,
      emiAmount: round(emiAmount),
      loanDisbCount,
      loanDisbAmount: round(loanDisbAmount),
      interestPaidCount,
      interestPaidAmount: round(interestPaidAmount),
      cashDepositCount,
      cashDepositAmount: round(cashDepositAmount),
      cashWithdrawalCount,
      cashWithdrawalAmount: round(cashWithdrawalAmount),
      chequeReceiptCount,
      chequeReceiptAmount: round(chequeReceiptAmount),
      chequePaidCount,
      chequePaidAmount: round(chequePaidAmount),
      upiCreditCount,
      upiCreditAmount: round(upiCreditAmount),
      upiDebitCount,
      upiDebitAmount: round(upiDebitAmount),
      onlineReceiptCount,
      onlineReceiptAmount: round(onlineReceiptAmount),
      onlinePaymentCount,
      onlinePaymentAmount: round(onlinePaymentAmount),
      otherReceiptCount,
      otherReceiptAmount: round(otherReceiptAmount),
      otherPaymentCount,
      otherPaymentAmount: round(otherPaymentAmount),
    };
  });

  const momContextByKey = new Map<string, MomContext>(momContexts.map((ctx) => [ctx.monthKey, ctx]));

  const monthLabels = months.map((m) => m.month);
  const monthKeys = months.map((m) => m.monthKey);

  const maxCredits = months.reduce((max, m) => Math.max(max, m.totalCredits), 0);
  const minCredits = months.reduce((min, m) => Math.min(min, m.totalCredits), months[0]?.totalCredits ?? 0);

  const momSheet: Array<Array<string | number | null>> = [];

  momSheet.push([
    null,
    null,
    "Consolidated",
    bank1 ? `${bank1.name}-${bank1.account}` : null,
    bank2 ? `${bank2.name}-${bank2.account}` : null,
  ]);

  momSheet.push([accountName, null, null, null, "Index"]);
  momSheet.push(["Consolidated", null, null, null, "Go to top"]);

  momSheet.push(["Month Wise Balance and Transaction Summary"]);
  momSheet.push(["Particulars", ...monthLabels]);

  momSheet.push([
    "Total Amount of Debit Transactions",
    ...months.map((m) => m.totalDebits),
  ]);

  momSheet.push([
    "Total Number of Debit Transactions",
    ...months.map((m) => m.debitCount),
  ]);

  momSheet.push([
    "Total Amount of Credit Transactions",
    ...months.map((m) => m.totalCredits),
  ]);

  momSheet.push([
    "Total Number of Credit Transactions",
    ...months.map((m) => m.creditCount),
  ]);

  momSheet.push([
    "Total Net Debit Amount",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.netDebitAmount ?? 0),
  ]);

  momSheet.push([
    "Total Number of Net Debit Transactions",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.netDebitCount ?? 0),
  ]);

  momSheet.push([
    "Total Net Credit Amount",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.netCreditAmount ?? 0),
  ]);

  momSheet.push([
    "Total Number of Net Credit Transactions",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.netCreditCount ?? 0),
  ]);

  momSheet.push([
    "Total Amount of Trade Debit Transactions",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.tradeDebitAmount ?? 0),
  ]);

  momSheet.push([
    "Total Number of Trade Debit Transactions",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.tradeDebitCount ?? 0),
  ]);

  momSheet.push([
    "Total Amount of Trade Credit Transactions",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.tradeCreditAmount ?? 0),
  ]);

  momSheet.push([
    "Total Number of Trade Credit Transactions",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.tradeCreditCount ?? 0),
  ]);

  momSheet.push([
    "Total Amount of Salary Payment Transactions",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.salaryAmount ?? 0),
  ]);

  momSheet.push([
    "Total Number of Salary Payment Transactions",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.salaryCount ?? 0),
  ]);

  momSheet.push([
    "Peak/Lull Months",
    ...months.map((m) => {
      if (m.totalCredits === maxCredits) return "Peak";
      if (m.totalCredits === minCredits) return "Lull";
      return "-";
    }),
  ]);

  momSheet.push([
    "Min EOD Balance",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.minEodBalance ?? null),
  ]);

  momSheet.push([
    "Max EOD Balance",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.maxEodBalance ?? null),
  ]);

  momSheet.push([
    "Average EOD Balance",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.avgEodBalance ?? null),
  ]);

  momSheet.push([
    "Sanction Limit",
    ...months.map(() => inferredLimit),
  ]);

  momSheet.push([
    "Peak Utilization Limit",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.minEodBalance ?? null),
  ]);

  momSheet.push([
    "Peak Utilization Limit %",
    ...months.map((m) => {
      const ctx = momContextByKey.get(m.monthKey);
      if (!ctx || inferredLimit <= 0 || ctx.minEodBalance == null) return null;
      return Math.abs((ctx.minEodBalance / inferredLimit) * 100);
    }),
  ]);

  momSheet.push([
    "Average Utilization",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.avgEodBalance ?? null),
  ]);

  momSheet.push([
    "Average Utilization %",
    ...months.map((m) => {
      const ctx = momContextByKey.get(m.monthKey);
      if (!ctx || inferredLimit <= 0 || ctx.avgEodBalance == null) return null;
      return Math.abs((ctx.avgEodBalance / inferredLimit) * 100);
    }),
  ]);

  momSheet.push([
    "Number of Overdrawing instances",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.overdrawInstances ?? 0),
  ]);

  momSheet.push([
    "Overdrawn Days",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.overdrawDays ?? 0),
  ]);

  momSheet.push([
    "Missing Dates",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.missingDatesLabel ?? null),
  ]);

  momSheet.push([]);

  momSheet.push(["Month Wise Bounce and Charges Summary"]);
  momSheet.push(["Particulars", ...monthLabels]);

  momSheet.push([
    "Total Number of O/W Bounced",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.owBounceCount ?? 0),
  ]);

  momSheet.push([
    "Sum of O/W Bounced",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.owBounceAmount ?? 0),
  ]);

  momSheet.push([
    "Outward Bounced %",
    ...months.map((m) => {
      const ctx = momContextByKey.get(m.monthKey);
      if (!ctx) return null;
      return ctx.owBouncePct;
    }),
  ]);

  momSheet.push([
    "Total Number of I/W Bounced",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.iwBounceCount ?? 0),
  ]);

  momSheet.push([
    "Sum of I/W Bounced",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.iwBounceAmount ?? 0),
  ]);

  momSheet.push([
    "Inward Bounced %",
    ...months.map((m) => {
      const ctx = momContextByKey.get(m.monthKey);
      if (!ctx) return null;
      return ctx.iwBouncePct;
    }),
  ]);

  momSheet.push([
    "Total Number of Inward Cheque Bounced (Technical)",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.technicalInwardCount ?? 0),
  ]);

  momSheet.push([
    "Amount of Inward Cheque Bounced (Technical)",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.technicalInwardAmount ?? 0),
  ]);

  momSheet.push([
    "Inward Cheque Bounce (Technical) %",
    ...months.map((m) => {
      const ctx = momContextByKey.get(m.monthKey);
      if (!ctx) return null;
      return ctx.technicalInwardPct;
    }),
  ]);

  momSheet.push([
    "Total Number of cheque return charges",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.chequeReturnChargeCount ?? 0),
  ]);

  momSheet.push([
    "Total Amount of cheque return charges",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.chequeReturnChargeAmount ?? 0),
  ]);

  momSheet.push([
    "Total Number of EMI Bounce",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.emiBounceCount ?? 0),
  ]);

  momSheet.push([
    "Total of EMI Bounce Amount",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.emiBounceAmount ?? 0),
  ]);

  momSheet.push([
    "Total Number of Bounce Payment charges",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.bounceChargeCount ?? 0),
  ]);

  momSheet.push([
    "Total Amount of Bounce Payment charges",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.bounceChargeAmount ?? 0),
  ]);

  momSheet.push([
    "Number of Bank Charges",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.bankChargeCount ?? 0),
  ]);

  momSheet.push([
    "Amount of Bank Charges",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.bankChargeAmount ?? 0),
  ]);

  momSheet.push([
    "No.of Penalty Charges",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.penaltyCount ?? 0),
  ]);

  momSheet.push([
    "Total Amount of Penalty charges",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.penaltyAmount ?? 0),
  ]);

  momSheet.push([
    "No.of Penalty Charges for Over utilization / Non maintenance of Minimum Balance",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.overutilPenaltyCount ?? 0),
  ]);

  momSheet.push([
    "Total Amount of Penalty Charges for Over utilization / Non maintenance of Minimum Balance",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.overutilPenaltyAmount ?? 0),
  ]);

  momSheet.push([]);

  momSheet.push(["Month Wise Loan Payments"]);
  momSheet.push(["Particulars", ...monthLabels]);

  momSheet.push([
    "Total Number of ECS/NACH Transaction",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.ecsNachCount ?? 0),
  ]);

  momSheet.push([
    "Total of ECS/NACH Amount",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.ecsNachAmount ?? 0),
  ]);

  momSheet.push([
    "Total Number of EMI",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.emiCount ?? 0),
  ]);

  momSheet.push([
    "Total of EMI Amount",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.emiAmount ?? 0),
  ]);

  momSheet.push([
    "Total Number of Loan Disbursal",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.loanDisbCount ?? 0),
  ]);

  momSheet.push([
    "Total of Loan Disbursal Amount",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.loanDisbAmount ?? 0),
  ]);

  momSheet.push([
    "Total No. of Interest Paid",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.interestPaidCount ?? 0),
  ]);

  momSheet.push([
    "Total of Interest Paid Amount",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.interestPaidAmount ?? 0),
  ]);

  momSheet.push([]);

  momSheet.push(["Internal & Non-Trade Related Party Transaction"]);
  momSheet.push(["Particulars", ...monthLabels]);

  momSheet.push([
    "Total Number of Debit Internal & Non-Trade Related Party Transactions",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.internalDebitCount ?? 0),
  ]);

  momSheet.push([
    "Total Amount of Debit Internal & Non-Trade Related Party Transactions",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.internalDebitAmount ?? 0),
  ]);

  momSheet.push([
    "Total Number of Credit Internal & Non-Trade Related Party Transactions",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.internalCreditCount ?? 0),
  ]);

  momSheet.push([
    "Total Amount of Credit Internal & Non-Trade Related Party Transactions",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.internalCreditAmount ?? 0),
  ]);

  momSheet.push([
    "Total Net Debit Amount",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.netDebitAmount ?? 0),
  ]);

  momSheet.push([
    "Total Net Credit Amount",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.netCreditAmount ?? 0),
  ]);

  momSheet.push([]);

  momSheet.push(["Mode Wise Transactions"]);
  momSheet.push(["Particulars", ...monthLabels]);

  momSheet.push([
    "Number of Cash Deposit",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.cashDepositCount ?? 0),
  ]);

  momSheet.push([
    "Amount of Cash Deposit",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.cashDepositAmount ?? 0),
  ]);

  momSheet.push([
    "Number of Cheque Receipt",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.chequeReceiptCount ?? 0),
  ]);

  momSheet.push([
    "Amount of Cheque Receipt",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.chequeReceiptAmount ?? 0),
  ]);

  momSheet.push([
    "Number of UPI Transactions (Credit)",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.upiCreditCount ?? 0),
  ]);

  momSheet.push([
    "Amount of UPI Transactions (Credit)",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.upiCreditAmount ?? 0),
  ]);

  momSheet.push([
    "Number of Online Receipt (NEFT, RTGS & IMPS)",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.onlineReceiptCount ?? 0),
  ]);

  momSheet.push([
    "Amount of Online Receipt (NEFT, RTGS & IMPS)",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.onlineReceiptAmount ?? 0),
  ]);

  momSheet.push([
    "Number of Other Receipt",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.otherReceiptCount ?? 0),
  ]);

  momSheet.push([
    "Amount of  Other Receipt",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.otherReceiptAmount ?? 0),
  ]);

  momSheet.push([
    "Total Receipt",
    ...months.map((m) => m.totalCredits),
  ]);

  momSheet.push([
    "Number of Cash Withdrawls",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.cashWithdrawalCount ?? 0),
  ]);

  momSheet.push([
    "Amount of Cash Withdrawls",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.cashWithdrawalAmount ?? 0),
  ]);

  momSheet.push([
    "Number of Cheque Paid",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.chequePaidCount ?? 0),
  ]);

  momSheet.push([
    "Amount of Cheque Paid",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.chequePaidAmount ?? 0),
  ]);

  momSheet.push([
    "Number of UPI Transactions (Debit)",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.upiDebitCount ?? 0),
  ]);

  momSheet.push([
    "Amount of UPI Transactions (Debit)",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.upiDebitAmount ?? 0),
  ]);

  momSheet.push([
    "Number of Online Payment (NEFT, RTGS & IMPS)",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.onlinePaymentCount ?? 0),
  ]);

  momSheet.push([
    "Amount of Online Payment (NEFT, RTGS & IMPS)",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.onlinePaymentAmount ?? 0),
  ]);

  momSheet.push([
    "Number of Other Payment",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.otherPaymentCount ?? 0),
  ]);

  momSheet.push([
    "Amount of  Other Payment",
    ...months.map((m) => momContextByKey.get(m.monthKey)?.otherPaymentAmount ?? 0),
  ]);

  momSheet.push([
    "Total Payments",
    ...months.map((m) => m.totalDebits),
  ]);

  if (bank1) {
    momSheet.push([accountName, null, null, null, "Index"]);
    momSheet.push([
      `Account Number: ${bank1.account}, ${bank1.name}`,
      null,
      null,
      null,
      "Go to top",
    ]);
  }

  if (bank2) {
    momSheet.push([accountName, null, null, null, "Index"]);
    momSheet.push([
      `Account Number: ${bank2.account}, ${bank2.name}`,
      null,
      null,
      null,
      "Go to top",
    ]);
  }

  type CashflowBreakdown = {
    depositsAmount: number;
    depositsCount: number;
    withdrawalsAmount: number;
    withdrawalsCount: number;
    cashDepositAmount: number;
    cashDepositCount: number;
    internalInAmount: number;
    internalInCount: number;
    loanDisbursalAmount: number;
    loanDisbursalCount: number;
    roiAmount: number;
    roiCount: number;
    salaryInAmount: number;
    salaryInCount: number;
    inwardFtAmount: number;
    inwardFtCount: number;
    chequeReceiptAmount: number;
    chequeReceiptCount: number;
    onlineReceiptAmount: number;
    onlineReceiptCount: number;
    otherReceiptAmount: number;
    otherReceiptCount: number;
    returnInAmount: number;
    returnInCount: number;
    bankChargesAmount: number;
    bankChargesCount: number;
    penalChargesAmount: number;
    penalChargesCount: number;
    cashWithdrawalAmount: number;
    cashWithdrawalCount: number;
    emiAmount: number;
    emiCount: number;
    gamblingAmount: number;
    gamblingCount: number;
    insuranceAmount: number;
    insuranceCount: number;
    internalOutAmount: number;
    internalOutCount: number;
    investmentAmount: number;
    investmentCount: number;
    salaryOutAmount: number;
    salaryOutCount: number;
    taxAmount: number;
    taxCount: number;
    utilitiesAmount: number;
    utilitiesCount: number;
    outwardFtAmount: number;
    outwardFtCount: number;
    chequePaymentAmount: number;
    chequePaymentCount: number;
    onlinePaymentAmount: number;
    onlinePaymentCount: number;
    otherPaymentAmount: number;
    otherPaymentCount: number;
    returnOutAmount: number;
    returnOutCount: number;
    minEodBalance: number | null;
    maxEodBalance: number | null;
    avgEodBalance: number | null;
  };

  function computeCashflowBreakdown(monthTxns: any[]): CashflowBreakdown {
    const credits = monthTxns.filter((txn) => txn.credit > 0);
    const debits = monthTxns.filter((txn) => txn.debit > 0);

    const sumCredit = (rows: any[]) => rows.reduce((sum, txn) => sum + (txn.credit || 0), 0);
    const sumDebit = (rows: any[]) => rows.reduce((sum, txn) => sum + (txn.debit || 0), 0);

    let remainingCredits = [...credits];
    const takeCredit = (predicate: (txn: any) => boolean) => {
      const matched = remainingCredits.filter(predicate);
      if (matched.length === 0) return { amount: 0, count: 0 };
      const matchedIds = new Set(matched.map((txn) => txn.id));
      remainingCredits = remainingCredits.filter((txn) => !matchedIds.has(txn.id));
      return { amount: sumCredit(matched), count: matched.length };
    };

    let remainingDebits = [...debits];
    const takeDebit = (predicate: (txn: any) => boolean) => {
      const matched = remainingDebits.filter(predicate);
      if (matched.length === 0) return { amount: 0, count: 0 };
      const matchedIds = new Set(matched.map((txn) => txn.id));
      remainingDebits = remainingDebits.filter((txn) => !matchedIds.has(txn.id));
      return { amount: sumDebit(matched), count: matched.length };
    };

    const internalPattern = /\bSELF|OWN|SISTER|GROUP|PROMOTER|DIRECTOR|PARTNER|INTER.?COMPANY|TRANSFER TO OWN/i;
    const roiPattern = /ROI|DIVIDEND|INT INCOME|INTEREST INCOME|FD INT|RD INT|RETURN ON INVESTMENT/i;
    const inwardPattern = /I\/W|INWARD\b/i;
    const outwardPattern = /O\/W|OUTWARD\b/i;
    const returnPattern = /RETURN|REVERSAL|REFUND/i;
    const penaltyPatternCF = /PENAL|PENALTY/i;
    const overutilPenaltyPatternCF = /MIN BAL|MINIMUM BAL|NON MAINTENANCE|OVER ?UTILISATION|OVER ?UTILIZATION/i;
    const gamblingPattern = /CASINO|BETTING|POKER|RUMMY|LOTTO|LOTTERY|GAMBL|DREAM11|ONLINE GAME/i;
    const insurancePattern = /INSURANCE|PREMIUM|LIC\b|HDFCLIFE|SBI LIFE|ICICI PRU|TATA AIA|BAJAJ ALLIANZ|MAX LIFE/i;
    const investmentPattern = /MUTUAL FUND|MF SIP|\bSIP\b|EQUITY|SHARES|SECURITIES|INVESTMENT|BOND\b|DEMAT|IPO/i;
    const taxPattern = /GST|IGST|CGST|SGST|TDS|TCS|\bTAX\b|PF\b|ESIC|EPF|EPFO|INCOME TAX|ITAX/i;

    const cashDeposit = takeCredit((txn) => txn.category === "Cash Deposit");
    const internalIn = takeCredit((txn) => internalPattern.test(txn.narration));
    const loanDisbursal = takeCredit(
      (txn) => txn.category === "Loan & EMI" && /LOAN|DISBURS/i.test(txn.narration),
    );
    const roi = takeCredit((txn) => roiPattern.test(txn.narration));
    const salaryIn = takeCredit((txn) => txn.category === "Salary" && txn.credit > 0);
    const inwardFt = takeCredit((txn) => inwardPattern.test(txn.narration));
    const chequeReceipt = takeCredit((txn) => txn.mode === "CHEQUE");
    const onlineReceipt = takeCredit(
      (txn) => txn.mode === "NEFT" || txn.mode === "RTGS" || txn.mode === "IMPS",
    );
    const returnIn = takeCredit((txn) => returnPattern.test(txn.narration));
    const otherReceipt = { amount: sumCredit(remainingCredits), count: remainingCredits.length };

    const penalCharges = takeDebit(
      (txn) => penaltyPatternCF.test(txn.narration) || overutilPenaltyPatternCF.test(txn.narration),
    );
    const bankCharges = takeDebit(
      (txn) => txn.category === "Bank Charges" && !penaltyPatternCF.test(txn.narration) && !overutilPenaltyPatternCF.test(txn.narration),
    );
    const cashWithdrawal = takeDebit((txn) => txn.category === "Cash Withdrawal");
    const emi = takeDebit(
      (txn) =>
        txn.category === "Loan & EMI" && /EMI|LOAN|NACH|ECS/i.test(txn.narration) && txn.debit > 0,
    );
    const gambling = takeDebit((txn) => gamblingPattern.test(txn.narration));
    const insurance = takeDebit((txn) => insurancePattern.test(txn.narration));
    const internalOut = takeDebit((txn) => internalPattern.test(txn.narration));
    const investment = takeDebit((txn) => investmentPattern.test(txn.narration));
    const salaryOut = takeDebit((txn) => txn.category === "Salary" && txn.debit > 0);
    const tax = takeDebit((txn) => taxPattern.test(txn.narration));
    const utilities = takeDebit((txn) => txn.category === "Utilities");
    const outwardFt = takeDebit((txn) => outwardPattern.test(txn.narration));
    const chequePayment = takeDebit((txn) => txn.mode === "CHEQUE");
    const onlinePayment = takeDebit(
      (txn) => txn.mode === "NEFT" || txn.mode === "RTGS" || txn.mode === "IMPS",
    );
    const returnOut = takeDebit((txn) => returnPattern.test(txn.narration));
    const otherPayment = { amount: sumDebit(remainingDebits), count: remainingDebits.length };

    const balanceSamples = monthTxns
      .map((txn) => txn.balance)
      .filter((value: unknown): value is number => typeof value === "number");

    const minEodBalance = balanceSamples.length ? Math.min(...balanceSamples) : null;
    const maxEodBalance = balanceSamples.length ? Math.max(...balanceSamples) : null;
    const avgEodBalance =
      balanceSamples.length > 0
        ? balanceSamples.reduce((sum, balance) => sum + balance, 0) / balanceSamples.length
        : null;

    return {
      depositsAmount: sumCredit(credits),
      depositsCount: credits.length,
      withdrawalsAmount: sumDebit(debits),
      withdrawalsCount: debits.length,
      cashDepositAmount: round(cashDeposit.amount),
      cashDepositCount: cashDeposit.count,
      internalInAmount: round(internalIn.amount),
      internalInCount: internalIn.count,
      loanDisbursalAmount: round(loanDisbursal.amount),
      loanDisbursalCount: loanDisbursal.count,
      roiAmount: round(roi.amount),
      roiCount: roi.count,
      salaryInAmount: round(salaryIn.amount),
      salaryInCount: salaryIn.count,
      inwardFtAmount: round(inwardFt.amount),
      inwardFtCount: inwardFt.count,
      chequeReceiptAmount: round(chequeReceipt.amount),
      chequeReceiptCount: chequeReceipt.count,
      onlineReceiptAmount: round(onlineReceipt.amount),
      onlineReceiptCount: onlineReceipt.count,
      otherReceiptAmount: round(otherReceipt.amount),
      otherReceiptCount: otherReceipt.count,
      returnInAmount: round(returnIn.amount),
      returnInCount: returnIn.count,
      bankChargesAmount: round(bankCharges.amount),
      bankChargesCount: bankCharges.count,
      penalChargesAmount: round(penalCharges.amount),
      penalChargesCount: penalCharges.count,
      cashWithdrawalAmount: round(cashWithdrawal.amount),
      cashWithdrawalCount: cashWithdrawal.count,
      emiAmount: round(emi.amount),
      emiCount: emi.count,
      gamblingAmount: round(gambling.amount),
      gamblingCount: gambling.count,
      insuranceAmount: round(insurance.amount),
      insuranceCount: insurance.count,
      internalOutAmount: round(internalOut.amount),
      internalOutCount: internalOut.count,
      investmentAmount: round(investment.amount),
      investmentCount: investment.count,
      salaryOutAmount: round(salaryOut.amount),
      salaryOutCount: salaryOut.count,
      taxAmount: round(tax.amount),
      taxCount: tax.count,
      utilitiesAmount: round(utilities.amount),
      utilitiesCount: utilities.count,
      outwardFtAmount: round(outwardFt.amount),
      outwardFtCount: outwardFt.count,
      chequePaymentAmount: round(chequePayment.amount),
      chequePaymentCount: chequePayment.count,
      onlinePaymentAmount: round(onlinePayment.amount),
      onlinePaymentCount: onlinePayment.count,
      otherPaymentAmount: round(otherPayment.amount),
      otherPaymentCount: otherPayment.count,
      returnOutAmount: round(returnOut.amount),
      returnOutCount: returnOut.count,
      minEodBalance: minEodBalance != null ? round(minEodBalance) : null,
      maxEodBalance: maxEodBalance != null ? round(maxEodBalance) : null,
      avgEodBalance: avgEodBalance != null ? round(avgEodBalance) : null,
    };
  }

  const monthlyCFSheet: Array<Array<string | number | null>> = [];

  function buildCashflowSection(
    scopeLabel: string,
    scopeTxns: any[],
    options: { showConsolidatedHeader?: boolean; accountLabel?: string },
  ) {
    const scopeByMonth = groupBy(scopeTxns, (txn) => txn.monthKey);
    const scopeMonths = buildMonthMetrics(scopeTxns);
    const scopeMonthsByKey = new Map(scopeMonths.map((m) => [m.monthKey, m]));

    const breakdownByKey = new Map<string, CashflowBreakdown>();
    monthKeys.forEach((monthKey) => {
      const rowsForMonth = scopeByMonth[monthKey] || [];
      breakdownByKey.set(monthKey, computeCashflowBreakdown(rowsForMonth));
    });

    if (options.showConsolidatedHeader) {
      monthlyCFSheet.push([
        null,
        null,
        "Consolidated",
        bank1 ? `${bank1.name}-${bank1.account}` : null,
        bank2 ? `${bank2.name}-${bank2.account}` : null,
      ]);
      monthlyCFSheet.push([accountName, null, null, null, "Index"]);
      monthlyCFSheet.push(["Consolidated", null, null, null, "Go to top"]);
    } else if (options.accountLabel) {
      monthlyCFSheet.push([accountName, null, null, null, "Index"]);
      monthlyCFSheet.push([options.accountLabel, null, null, null, "Go to top"]);
    }

    const headerRow1: Array<string | number | null> = ["Particulars"];
    const headerRow2: Array<string | number | null> = [""];
    for (const label of monthLabels) {
      headerRow1.push(label, null);
      headerRow2.push("Amount", "Txn Count");
    }
    headerRow1.push("Total Amount", "Txn Count");
    headerRow2.push("Amount", "Txn Count");

    monthlyCFSheet.push(headerRow1);
    monthlyCFSheet.push(headerRow2);

    function pushRow(
      label: string,
      selector: (
        monthKey: string,
        breakdown: CashflowBreakdown,
        monthMetric: any | undefined,
      ) => { amount: number; count: number | null },
    ) {
      const row: Array<string | number | null> = [label];
      let totalAmount = 0;
      let totalCount = 0;
      let hasCount = false;

      monthKeys.forEach((monthKey) => {
        const breakdown = breakdownByKey.get(monthKey)!;
        const monthMetric = scopeMonthsByKey.get(monthKey);
        const { amount, count } = selector(monthKey, breakdown, monthMetric);
        const safeAmount = amount || 0;
        row.push(safeAmount, typeof count === "number" ? count : null);
        totalAmount += safeAmount;
        if (typeof count === "number") {
          totalCount += count;
          hasCount = true;
        }
      });

      row.push(totalAmount, hasCount ? totalCount : null);
      monthlyCFSheet.push(row);
    }

    // Opening balance (per scope)
    pushRow("Opening Balance", (_monthKey, _breakdown, metric) => ({
      amount: metric?.openingBal ?? 0,
      count: null,
    }));

    // Deposits and its components
    pushRow("Deposits", (_monthKey, breakdown) => ({
      amount: breakdown.depositsAmount,
      count: breakdown.depositsCount,
    }));

    pushRow("Cash Deposit", (_monthKey, breakdown) => ({
      amount: breakdown.cashDepositAmount,
      count: breakdown.cashDepositCount,
    }));

    pushRow("Internal Transfers", (_monthKey, breakdown) => ({
      amount: breakdown.internalInAmount,
      count: breakdown.internalInCount,
    }));

    pushRow("Loan Disbursal", (_monthKey, breakdown) => ({
      amount: breakdown.loanDisbursalAmount,
      count: breakdown.loanDisbursalCount,
    }));

    pushRow("Return on Investment", (_monthKey, breakdown) => ({
      amount: breakdown.roiAmount,
      count: breakdown.roiCount,
    }));

    pushRow("Salary", (_monthKey, breakdown) => ({
      amount: breakdown.salaryInAmount,
      count: breakdown.salaryInCount,
    }));

    pushRow("I/W Funds Transfer", (_monthKey, breakdown) => ({
      amount: breakdown.inwardFtAmount,
      count: breakdown.inwardFtCount,
    }));

    pushRow("Cheque Receipt", (_monthKey, breakdown) => ({
      amount: breakdown.chequeReceiptAmount,
      count: breakdown.chequeReceiptCount,
    }));

    pushRow("Online Receipt", (_monthKey, breakdown) => ({
      amount: breakdown.onlineReceiptAmount,
      count: breakdown.onlineReceiptCount,
    }));

    pushRow("Other Receipt", (_monthKey, breakdown) => ({
      amount: breakdown.otherReceiptAmount,
      count: breakdown.otherReceiptCount,
    }));

    pushRow("Return", (_monthKey, breakdown) => ({
      amount: breakdown.returnInAmount,
      count: breakdown.returnInCount,
    }));

    // Withdrawals and its components
    pushRow("Withdrawals", (_monthKey, breakdown) => ({
      amount: breakdown.withdrawalsAmount,
      count: breakdown.withdrawalsCount,
    }));

    pushRow("Bank Charges", (_monthKey, breakdown) => ({
      amount: breakdown.bankChargesAmount,
      count: breakdown.bankChargesCount,
    }));

    pushRow("Cash Withdrawal", (_monthKey, breakdown) => ({
      amount: breakdown.cashWithdrawalAmount,
      count: breakdown.cashWithdrawalCount,
    }));

    pushRow("EMI", (_monthKey, breakdown) => ({
      amount: breakdown.emiAmount,
      count: breakdown.emiCount,
    }));

    pushRow("Gambling", (_monthKey, breakdown) => ({
      amount: breakdown.gamblingAmount,
      count: breakdown.gamblingCount,
    }));

    pushRow("Insurance", (_monthKey, breakdown) => ({
      amount: breakdown.insuranceAmount,
      count: breakdown.insuranceCount,
    }));

    pushRow("Internal Transfers", (_monthKey, breakdown) => ({
      amount: breakdown.internalOutAmount,
      count: breakdown.internalOutCount,
    }));

    pushRow("Investment", (_monthKey, breakdown) => ({
      amount: breakdown.investmentAmount,
      count: breakdown.investmentCount,
    }));

    pushRow("Penal Charges", (_monthKey, breakdown) => ({
      amount: breakdown.penalChargesAmount,
      count: breakdown.penalChargesCount,
    }));

    pushRow("Salary Debited", (_monthKey, breakdown) => ({
      amount: breakdown.salaryOutAmount,
      count: breakdown.salaryOutCount,
    }));

    pushRow("Tax", (_monthKey, breakdown) => ({
      amount: breakdown.taxAmount,
      count: breakdown.taxCount,
    }));

    pushRow("Utilities", (_monthKey, breakdown) => ({
      amount: breakdown.utilitiesAmount,
      count: breakdown.utilitiesCount,
    }));

    pushRow("O/W Funds Transfer", (_monthKey, breakdown) => ({
      amount: breakdown.outwardFtAmount,
      count: breakdown.outwardFtCount,
    }));

    pushRow("Cheque Payment", (_monthKey, breakdown) => ({
      amount: breakdown.chequePaymentAmount,
      count: breakdown.chequePaymentCount,
    }));

    pushRow("Online Payment", (_monthKey, breakdown) => ({
      amount: breakdown.onlinePaymentAmount,
      count: breakdown.onlinePaymentCount,
    }));

    pushRow("Other Payment", (_monthKey, breakdown) => ({
      amount: breakdown.otherPaymentAmount,
      count: breakdown.otherPaymentCount,
    }));

    pushRow("Return", (_monthKey, breakdown) => ({
      amount: breakdown.returnOutAmount,
      count: breakdown.returnOutCount,
    }));

    // Net cash flows and balances
    pushRow("Net Cash Flows", (_monthKey, breakdown, metric) => ({
      amount:
        metric?.netFlow != null
          ? metric.netFlow
          : round(breakdown.depositsAmount - breakdown.withdrawalsAmount),
      count: null,
    }));

    pushRow("Closing Balance", (_monthKey, _breakdown, metric) => ({
      amount: metric?.closingBal ?? 0,
      count: null,
    }));

    pushRow("Min EOD Balance", (_monthKey, breakdown) => ({
      amount: breakdown.minEodBalance ?? 0,
      count: null,
    }));

    pushRow("Max EOD Balance", (_monthKey, breakdown) => ({
      amount: breakdown.maxEodBalance ?? 0,
      count: null,
    }));

    pushRow("Avg EOD Balance", (_monthKey, breakdown) => ({
      amount: breakdown.avgEodBalance ?? 0,
      count: null,
    }));

    monthlyCFSheet.push([]);
  }

  // Consolidated section
  buildCashflowSection("Consolidated", transactions, { showConsolidatedHeader: true });

  // Per-bank sections (if available)
  if (bank1) {
    const bank1Txns = transactions.filter((txn) => txn.accountId === bank1.account);
    buildCashflowSection("Bank1", bank1Txns, {
      accountLabel: `Account Number: ${bank1.account}, ${bank1.name}`,
    });
  }

  if (bank2) {
    const bank2Txns = transactions.filter((txn) => txn.accountId === bank2.account);
    buildCashflowSection("Bank2", bank2Txns, {
      accountLabel: `Account Number: ${bank2.account}, ${bank2.name}`,
    });
  }

  // Bounce & Penal module: build detailed sheet with Consolidated and per-bank sections
  const bounceSheet: Array<Array<string | number | null>> = [];

  type BounceSummaryRow = {
    amount: number;
    txnCount: number;
    clearedAmount: number;
    clearedCount: number;
    sameDayAmount: number;
    sameDayCount: number;
  };

  type BounceInstance = {
    date: string;
    description: string;
    category: string;
    debit: number | null;
    credit: number | null;
    clearedDate: string | null;
    clearedDays: number | null;
    chequeRef: string | null;
    reason: string | null;
    bankName: string | null;
    accountNumber: string | null;
  };

  const technicalReturnPattern = /INWARD CHEQUE RETURN|I\/W CHQ RET|I\/W CHQ RETURN/i;
  const chequeReturnChargesPattern = /RTRN CHRG|RTRN CHRGS|RETURN CHARG/i;
  const minBalancePatternBounce = /MIN BAL|MINIMUM BAL|MINIMUM BALANCE/i;
  const penalPatternBounce = /PENAL|PENALTY/i;
  const chequeBouncePattern = /(RETURN|BOUNCE|CHEQUE RET)/i;

  function classifyBouncePenalCategory(txn: any): string | null {
    const narration = txn.narration || "";
    const text = String(narration).toUpperCase();
    const isCheque = txn.mode === "CHEQUE" || /\bCHQ\b|CHEQUE|CLG/i.test(text);

    if (technicalReturnPattern.test(text)) {
      return "Inward Cheque Return Technical";
    }

    if (isCheque && chequeBouncePattern.test(text)) {
      if (txn.debit > 0) return "Cheque Outward Bounce";
      if (txn.credit > 0) return "Cheque Inward Bounce";
    }

    if (isCheque && /CLG\s+CHQ/i.test(text) && !chequeBouncePattern.test(text)) {
      if (txn.debit > 0) return "Cheque Inward Bounce-Contra";
      if (txn.credit > 0) return "Cheque Outward Bounce-Contra";
    }

    if (txn.debit > 0 && chequeReturnChargesPattern.test(text)) {
      return "Cheque Return Charges";
    }

    if (txn.debit > 0 && minBalancePatternBounce.test(text)) {
      return "Minimum Balance Charges";
    }

    if (txn.debit > 0 && penalPatternBounce.test(text)) {
      return "Penal Charges";
    }

    return null;
  }

  function extractChequeNumber(narration: string): string | null {
    const match = narration.match(/(\d{3,10})\s*(?:CLG\s+CHQ|CHQ\b)/i);
    return match ? match[1] : null;
  }

  function buildBounceSection(scopeTxns: any[], navLabel: string) {
    const summaryCategories = [
      "Cheque Inward Bounce",
      "Cheque Inward Bounce-Contra",
      "Cheque Outward Bounce",
      "Cheque Outward Bounce-Contra",
      "Cheque Return Charges",
      "Inward Cheque Return Technical",
      "Minimum Balance Charges",
      "Penal Charges",
    ];

    const summary = new Map<string, BounceSummaryRow>();
    summaryCategories.forEach((cat) => {
      summary.set(cat, {
        amount: 0,
        txnCount: 0,
        clearedAmount: 0,
        clearedCount: 0,
        sameDayAmount: 0,
        sameDayCount: 0,
      });
    });

    const instances: BounceInstance[] = [];

    scopeTxns.forEach((txn: any) => {
      const category = classifyBouncePenalCategory(txn);
      if (!category) return;

      const amount = Math.abs((txn.debit || 0) + (txn.credit || 0)) || Math.abs(txn.amount || 0);
      const entry = summary.get(category);
      if (!entry) return;
      entry.amount += amount;
      entry.txnCount += 1;

      const chequeRef = extractChequeNumber(txn.narration || "");
      const instance: BounceInstance = {
        date: txn.dateText,
        description: txn.narration,
        category,
        debit: txn.debit > 0 ? round(txn.debit) : null,
        credit: txn.credit > 0 ? round(txn.credit) : null,
        clearedDate: null,
        clearedDays: null,
        chequeRef,
        reason:
          category === "Minimum Balance Charges"
            ? "Minimum Balance Charges"
            : category === "Cheque Return Charges"
              ? "Cheque Return Charges"
              : category === "Penal Charges"
                ? "Penal Charges"
                : null,
        bankName: txn.bankName || null,
        accountNumber: txn.accountId || null,
      };

      instances.push(instance);
    });

    instances.sort((a, b) => a.date.localeCompare(b.date));

    // Navigation rows
    bounceSheet.push([accountName, null, null, null, "Index"]);
    bounceSheet.push([navLabel, null, null, null, "Go to top"]);

    // Summary section
    bounceSheet.push(["Bounce and Charge Summary"]);
    bounceSheet.push([
      "SN",
      "Category",
      "",
      "Amount",
      "Count of Transactions",
      "Cleared Amount",
      "Count of Transactions",
      "Same Day Clearance",
      "Count of Same Day Clearance Transactions",
    ]);

    summaryCategories.forEach((cat, index) => {
      const row = summary.get(cat)!;
      bounceSheet.push([
        index + 1,
        cat,
        "",
        row.amount ? round(row.amount) : 0,
        row.txnCount,
        row.clearedAmount || null,
        row.clearedCount || null,
        row.sameDayAmount || null,
        row.sameDayCount || null,
      ]);
    });

    bounceSheet.push([]);

    // Instances section
    bounceSheet.push(["Bounce and Charge Instances"]);
    bounceSheet.push([
      "SN",
      "DATE",
      "Description",
      "Category",
      "Debit",
      "Credit",
      "Cleared Date",
      "Cleared in Days",
      "Cheque No. / Ref. No.",
      "Reason for Penal",
      "Bank Name",
      "Account Number",
    ]);

    instances.forEach((inst, index) => {
      bounceSheet.push([
        index + 1,
        inst.date,
        inst.description,
        inst.category,
        inst.debit,
        inst.credit,
        inst.clearedDate,
        inst.clearedDays,
        inst.chequeRef,
        inst.reason,
        inst.bankName,
        inst.accountNumber,
      ]);
    });

    bounceSheet.push([]);
  }

  // Consolidated bounce & penal section
  buildBounceSection(transactions, "Consolidated");

  // Per-bank bounce & penal sections
  if (bank1) {
    const bank1Txns = transactions.filter((txn) => txn.accountId === bank1.account);
    buildBounceSection(bank1Txns, `Account Number: ${bank1.account}, ${bank1.name}`);
  }

  if (bank2) {
    const bank2Txns = transactions.filter((txn) => txn.accountId === bank2.account);
    buildBounceSection(bank2Txns, `Account Number: ${bank2.account}, ${bank2.name}`);
  }

  // Loans & EMI module: build detailed sheet for loan disbursals, EMI debits, and interest servicing
  const loansSheet: Array<Array<string | number | null>> = [];

  // Navigation rows
  loansSheet.push([accountName, null, null, null, "Index"]);
  loansSheet.push(["Consolidated", null, null, null, "Go to top"]);

  // Section 1: Loan Credit Instances
  loansSheet.push(["Loan Credit Instances"]);
  loansSheet.push([
    "SN",
    "DATE",
    "Description",
    "Name of FI",
    "Category",
    "Mode Of Transaction",
    "Amount",
    "Bank Name",
    "Account Number",
  ]);

  const loanCreditTxns = transactions
    .filter(
      (txn) =>
        txn.credit > 0 &&
        txn.category === "Loan & EMI" &&
        /LOAN|DISBURS|CREDIT PRIVATE|FINSERV|MOTOR FIN/i.test(txn.narration || ""),
    )
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  loanCreditTxns.forEach((txn, index) => {
    loansSheet.push([
      index + 1,
      txn.dateText,
      txn.narration,
      txn.party,
      "Loan Disbursal",
      txn.mode,
      round(txn.credit),
      (txn as any).bankName || null,
      txn.accountId || null,
    ]);
  });

  loansSheet.push([]);

  // Section 2: EMI Debit Instances
  loansSheet.push(["EMI Debit Instances"]);

  const emiTxns = transactions
    .filter(
      (txn) =>
        txn.debit > 0 &&
        /EMI|LOAN|NACH|ECS|FINSERV|MOTOR FIN/i.test(txn.narration || "") &&
        txn.category === "Loan & EMI",
    );

  const emiByLender = groupBy(emiTxns, (txn) => txn.party || "Unknown");

  const emiBounceKeys = new Set<string>();
  bounces
    .filter((bounce) => /EMI Bounce/i.test(bounce.type))
    .forEach((bounce) => {
      emiBounceKeys.add(`${bounce.party.toUpperCase()}|${bounce.monthKey}`);
    });

  Object.values(emiByLender).forEach((rows) => {
    if (!rows.length) return;
    const lender = rows[0].party || "Unknown";
    const sorted = rows.slice().sort((a, b) => a.date.getTime() - b.date.getTime());
    const totalEmi = sorted.reduce((sum, txn) => sum + txn.debit, 0);
    const hasDelayed = sorted.some((txn) => emiBounceKeys.has(`${lender.toUpperCase()}|${txn.monthKey}`));

    // Lender summary row: Lender | EMI amount | Has delay (YES/No)
    loansSheet.push([
      lender,
      round(totalEmi),
      hasDelayed ? "YES" : "No",
    ]);

    // Header for this lender's EMI instances
    loansSheet.push([
      "SN",
      "DATE",
      "Description",
      "Amount",
      "Mode Of Transaction",
      "DELAYED",
      "Bank Name",
      "Account Number",
    ]);

    sorted.forEach((txn, index) => {
      const delayed = emiBounceKeys.has(`${lender.toUpperCase()}|${txn.monthKey}`);
      loansSheet.push([
        index + 1,
        txn.dateText,
        txn.narration,
        round(txn.debit),
        txn.mode,
        delayed ? "Yes" : "No",
        (txn as any).bankName || null,
        txn.accountId || null,
      ]);
    });

    loansSheet.push([]);
  });

  // Section 3: Interest Servicing Instances
  loansSheet.push(["Interest Servicing Instances"]);
  loansSheet.push([
    "SN",
    "DATE",
    "Description",
    "Amount",
    "Interest Servicing in Days",
    "Bank Name",
    "Account Number",
  ]);

  const interestDaysByMonth = new Map<string, number | null>();
  camAnalysis.forEach((row) => {
    const monthLabel = row.month as string;
    const days = (row as any).intServiced as number | null;
    interestDaysByMonth.set(monthLabel, days ?? null);
  });

  const interestTxns = transactions
    .filter(
      (txn) =>
        txn.debit > 0 &&
        ((/\bINT\b/i.test(txn.narration || "")) || /INTEREST/i.test(txn.narration || "")),
    )
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  interestTxns.forEach((txn, index) => {
    const days = interestDaysByMonth.get(txn.month) ?? null;
    loansSheet.push([
      index + 1,
      txn.dateText,
      txn.narration,
      round(txn.debit),
      days,
      (txn as any).bankName || null,
      txn.accountId || null,
    ]);
  });

  const execSummary = [
    {
      particulars: "Total Credits",
      consolidated: formatINR(totalCredits),
      kotak: bank1Summary ? formatINR(bank1Summary.totalCredits) : "-",
      pnb: bank2Summary ? formatINR(bank2Summary.totalCredits) : "-",
    },
    {
      particulars: "Total Debits",
      consolidated: formatINR(totalDebits),
      kotak: bank1Summary ? formatINR(bank1Summary.totalDebits) : "-",
      pnb: bank2Summary ? formatINR(bank2Summary.totalDebits) : "-",
    },
    {
      particulars: "Net Cash Flow",
      consolidated: formatINR(netCashFlow),
      kotak: bank1Summary ? formatINR(bank1Summary.netCashFlow) : "-",
      pnb: bank2Summary ? formatINR(bank2Summary.netCashFlow) : "-",
    },
    {
      particulars: "Average Bank Balance",
      consolidated: formatINR(averageBalance),
      kotak: bank1Summary ? formatINR(bank1Summary.avgBalance) : "-",
      pnb: bank2Summary ? formatINR(bank2Summary.avgBalance) : "-",
    },
    {
      particulars: "Highest Balance",
      consolidated: formatINR(highestBalance),
      kotak: bank1Summary ? formatINR(bank1Summary.highestBalance) : "-",
      pnb: bank2Summary ? formatINR(bank2Summary.highestBalance) : "-",
    },
    {
      particulars: "Lowest Balance",
      consolidated: formatINR(lowestBalance),
      kotak: bank1Summary ? formatINR(bank1Summary.lowestBalance) : "-",
      pnb: bank2Summary ? formatINR(bank2Summary.lowestBalance) : "-",
    },
    {
      particulars: "No. of Credit Txns",
      consolidated: transactions.filter((txn) => txn.credit > 0).length.toLocaleString("en-IN"),
      kotak: bank1Summary ? bank1Summary.creditCount.toLocaleString("en-IN") : "-",
      pnb: bank2Summary ? bank2Summary.creditCount.toLocaleString("en-IN") : "-",
    },
    {
      particulars: "No. of Debit Txns",
      consolidated: transactions.filter((txn) => txn.debit > 0).length.toLocaleString("en-IN"),
      kotak: bank1Summary ? bank1Summary.debitCount.toLocaleString("en-IN") : "-",
      pnb: bank2Summary ? bank2Summary.debitCount.toLocaleString("en-IN") : "-",
    },
    {
      particulars: "Avg Monthly Inflow",
      consolidated: formatINR(months.length ? totalCredits / months.length : 0),
      kotak: bank1Summary ? formatINR(bank1Summary.avgInflow) : "-",
      pnb: bank2Summary ? formatINR(bank2Summary.avgInflow) : "-",
    },
    {
      particulars: "Avg Monthly Outflow",
      consolidated: formatINR(months.length ? totalDebits / months.length : 0),
      kotak: bank1Summary ? formatINR(bank1Summary.avgOutflow) : "-",
      pnb: bank2Summary ? formatINR(bank2Summary.avgOutflow) : "-",
    },
    {
      particulars: "Cash Deposit Ratio",
      consolidated: `${cashDepositRatio.toFixed(2)}%`,
      kotak: bank1Summary ? `${bank1Summary.cashDepositRatio.toFixed(2)}%` : "-",
      pnb: bank2Summary ? `${bank2Summary.cashDepositRatio.toFixed(2)}%` : "-",
    },
    {
      particulars: "Bounce Count (I/W + O/W)",
      consolidated: bounces.length.toLocaleString("en-IN"),
      kotak: bank1Summary ? bank1Summary.bounceCount.toLocaleString("en-IN") : "-",
      pnb: bank2Summary ? bank2Summary.bounceCount.toLocaleString("en-IN") : "-",
    },
  ];

  const execSheet: Array<Array<string | number | null>> = [];

  // Top rows: entity + navigation style
  execSheet.push([accountName, null, null, null, "Index"]);
  execSheet.push(["Consolidated", null, null, null, "Go to top"]);
  execSheet.push([]);
  execSheet.push(["Executive Summary"]);

  const bank1Header = bank1 ? `Account Number: ${bank1.account}, ${bank1.name}` : "";
  const bank2Header = bank2 ? `Account Number: ${bank2.account}, ${bank2.name}` : "";
  execSheet.push(["Particulars", "Consolidated", bank1Header || null, bank2Header || null]);

  execSheet.push([
    "Name of the customer",
    "-",
    accountName,
    bank2 ? accountName : null,
  ]);
  execSheet.push([
    "Name of the Bank & Branch (IFSC)",
    "-",
    bank1 ? `${bank1.name} (${bank1.ifsc})` : null,
    bank2 ? `${bank2.name} (${bank2.ifsc})` : null,
  ]);
  execSheet.push([
    "Bank account number",
    "-",
    bank1 ? bank1.account : null,
    bank2 ? bank2.account : null,
  ]);
  execSheet.push([
    "Period of Analysis",
    "-",
    months.length ? `${months[0].month} to ${months[months.length - 1].month}` : "-",
    months.length ? `${months[0].month} to ${months[months.length - 1].month}` : "-",
  ]);

  execSummary.forEach((row) => {
    execSheet.push([
      row.particulars,
      row.consolidated,
      (row as Record<string, string>).kotak ?? null,
      (row as Record<string, string>).pnb ?? null,
    ]);
  });

  const flagsSheet: Array<Array<string | number | null>> = [];
  flagsSheet.push([accountName, null, null, null, "Index"]);
  flagsSheet.push(["Consolidated", null, null, null, "Go to top"]);
  flagsSheet.push([]);
  flagsSheet.push(["SN", "Flag Category", "Flag", "Flag Description", "Flag Colour"]);
  flags.forEach((flag) => {
    flagsSheet.push([
      flag.sn,
      flag.category,
      flag.flag,
      flag.description,
      flag.severity,
    ]);
  });

  const camSheet: Array<Array<string | number | null>> = [];

  camSheet.push([
    null,
    null,
    "Consolidated",
    bank1 ? `${bank1.name}-${bank1.account}` : null,
    bank2 ? `${bank2.name}-${bank2.account}` : null,
  ]);

  camSheet.push([accountName, null, null, null, "Index"]);
  camSheet.push(["Consolidated", null, null, null, "Go to top"]);

  camSheet.push([
    "Month-Year",
    "No. of Net Credits",
    "Net Monthly Credit",
    "No. of Net Debits",
    "Net Monthly Debit",
    "No. of I/W Return",
    "I/W Return",
    "No. of O/W Return",
    "O/W Return",
    "5",
    "10",
    "15",
    "20",
    "25",
    "30",
    "ABB",
    "Utilization %",
    "Interest Servicing in Days",
  ]);

  camAnalysis.forEach((row) => {
    const monthAbb = typeof row.abb === "number" ? row.abb : Number(row.abb) || 0;
    const util = typeof row.utilization === "number" ? row.utilization : Number(row.utilization) || 0;

    camSheet.push([
      row.month as string,
      row.netCreditCount as number,
      row.netCredit as number,
      row.netDebitCount as number,
      row.netDebit as number,
      row.iwReturnCount as number,
      row.iwReturn as number,
      row.owReturnCount as number,
      row.owReturn as number,
      monthAbb,
      monthAbb,
      monthAbb,
      monthAbb,
      monthAbb,
      monthAbb,
      monthAbb,
      util,
      (row.intServiced as number | null) ?? null,
    ]);
  });

  if (camAnalysis.length > 0) {
    const totalNetCreditCount = camAnalysis.reduce((sum, row) => sum + (row.netCreditCount as number), 0);
    const totalNetCredit = camAnalysis.reduce((sum, row) => sum + (row.netCredit as number), 0);
    const totalNetDebitCount = camAnalysis.reduce((sum, row) => sum + (row.netDebitCount as number), 0);
    const totalNetDebit = camAnalysis.reduce((sum, row) => sum + (row.netDebit as number), 0);
    const totalIwCount = camAnalysis.reduce((sum, row) => sum + (row.iwReturnCount as number), 0);
    const totalIw = camAnalysis.reduce((sum, row) => sum + (row.iwReturn as number), 0);
    const totalOwCount = camAnalysis.reduce((sum, row) => sum + (row.owReturnCount as number), 0);
    const totalOw = camAnalysis.reduce((sum, row) => sum + (row.owReturn as number), 0);
    const avgAbb = camAnalysis.reduce((sum, row) => sum + (row.abb as number), 0) / camAnalysis.length;

    camSheet.push([
      "Grand Total",
      totalNetCreditCount,
      totalNetCredit,
      totalNetDebitCount,
      totalNetDebit,
      totalIwCount,
      totalIw,
      totalOwCount,
      totalOw,
      avgAbb,
      avgAbb,
      avgAbb,
      avgAbb,
      avgAbb,
      avgAbb,
      avgAbb,
      null,
      null,
    ]);

    const allAbb = camAnalysis.map((row) => row.abb as number);
    const last3Abb = allAbb.slice(-3);
    const last6Abb = allAbb.slice(-6);

    const avgAllAbb = allAbb.reduce((sum, v) => sum + v, 0) / allAbb.length;
    const avg3Abb = last3Abb.length ? last3Abb.reduce((sum, v) => sum + v, 0) / last3Abb.length : null;
    const avg6Abb = last6Abb.length ? last6Abb.reduce((sum, v) => sum + v, 0) / last6Abb.length : null;

    camSheet.push([
      "Average Balance",
      avgAllAbb,
      "Average Balance(5,10,15,20,25,30)",
      avgAllAbb,
    ]);

    camSheet.push([
      "Average Balance(Last 3 Month)",
      avg3Abb,
      "Average Balance(5,10,15,20,25,30) 3M",
      avg3Abb,
    ]);

    camSheet.push([
      "Average Balance(Last 6 Month)",
      avg6Abb,
      "Average Balance(5,10,15,20,25,30) 6M",
      avg6Abb,
    ]);

    const iwAmountPct = totalNetDebit > 0 ? totalIw / totalNetDebit : 0;
    const iwCountPct = totalNetDebitCount > 0 ? totalIwCount / totalNetDebitCount : 0;
    const owAmountPct = totalNetDebit > 0 ? totalOw / totalNetDebit : 0;
    const owCountPct = totalNetDebitCount > 0 ? totalOwCount / totalNetDebitCount : 0;

    camSheet.push([
      "I/W Return %",
      iwAmountPct,
      "I/W Return (Count) %",
      iwCountPct,
    ]);

    camSheet.push([
      "O/W Return %",
      owAmountPct,
      "O/W Return (Count) %",
      owCountPct,
    ]);
  }

  const moduleSheets = buildAllModuleSheets({
    accountName,
    applicantBanks,
    months,
    monthLabels,
    monthKeys,
    transactions,
    momContextByKey: new Map(
      [...momContextByKey.entries()].map(([key, ctx]) => [
        key,
        {
          monthKey: ctx.monthKey,
          netDebitAmount: ctx.netDebitAmount,
          netDebitCount: ctx.netDebitCount,
          netCreditAmount: ctx.netCreditAmount,
          netCreditCount: ctx.netCreditCount,
          emiAmount: ctx.emiAmount,
          loanDisbAmount: ctx.loanDisbAmount,
          tradeDebitAmount: ctx.tradeDebitAmount,
          tradeCreditAmount: ctx.tradeCreditAmount,
          salaryAmount: ctx.salaryAmount,
        },
      ]),
    ),
    loans,
    bounces,
    circular,
    internalGroup,
    recurringDebitRaw,
    recurringCreditRaw,
  });

  return {
    viewScope: {
      mode: months.length <= 1 ? "monthly" : "yearly",
      statementGranularity: months.length <= 1 ? "monthly" : "yearly",
      monthCount: months.length,
    },
    availableMonths: months.map((m) => m.monthKey),
    accountInfo: {
      accountName,
      accountNumber,
      bank,
    },
    statementPeriod: {
      startDate: statementStart,
      endDate: statementEnd,
    },
    applicant: {
      name: accountName,
      pan: input.pan || "-",
      entityType: input.entityType || "-",
      loanType: input.loanType || "-",
      analysisId: `BSA-${new Date().getUTCFullYear()}-${String(Date.now()).slice(-7)}`,
      period: months.length ? `${months[0].month} to ${months[months.length - 1].month}` : "-",
      banks: applicantBanks,
    },
    riskScore,
    aiRecommendation: {
      verdict: riskScore.decision,
      rationale: flags.slice(0, 3).map((flag) => flag.description).join(" ") || "No material issues detected.",
      conditions: flags
        .filter((flag) => flag.severity === "critical" || flag.severity === "high")
        .slice(0, 3)
        .map((flag) => `Review ${flag.category.toLowerCase()}: ${flag.flag}`),
    },
    flags,
    flagsSheet,
    metrics: months,
    execSummary,
    execSheet,
    camAnalysis,
    camSheet,
    momSummary: months,
    momSheet,
    monthlyCF: months.map((month) => ({
      month: month.month,
      monthKey: month.monthKey,
      opening: month.openingBal,
      operating: month.netFlow,
      investing: 0,
      financing: 0,
      closing: month.closingBal,
    })),
    monthlyCFSheet,
    bounceSheet,
    loansSheet,
    bounces,
    loans,
    emiTracker: loans.flatMap((loan) =>
      months.map((month) => ({
        month: month.month,
        lender: loan.lender,
        type: loan.type,
        emiDue: loan.emi,
        paidOn: "-",
        status: bounces.some((bounce) => bounce.party === loan.lender && bounce.monthKey === month.monthKey) ? "Bounced" : "Paid",
      })),
    ),
    tradeCredits: transactions.filter((txn) => txn.category === "Trade Credit").slice(0, 100).map((txn) => ({
      date: txn.dateText,
      party: txn.party,
      amount: txn.credit,
      mode: txn.mode,
      narration: txn.narration,
    })),
    tradeDebits: transactions.filter((txn) => txn.category === "Trade Debit").slice(0, 100).map((txn) => ({
      date: txn.dateText,
      party: txn.party,
      amount: txn.debit,
      mode: txn.mode,
      narration: txn.narration,
    })),
    highestTns,
    internalGroup,
    circular,
    netTransactions: months.map((month) => ({
      month: month.month,
      credits: month.totalCredits,
      debits: month.totalDebits,
      net: month.netFlow,
    })),
    salary: transactions.filter((txn) => txn.category === "Salary").map((txn) => ({
      month: txn.month,
      monthKey: txn.monthKey,
      date: txn.dateText,
      payer: txn.party,
      amount: txn.credit || txn.debit,
      consistent: true,
    })),
    staffEmoluments: months.map((month) => {
      const salaryRows = transactions.filter((txn) => txn.monthKey === month.monthKey && txn.category === "Salary");
      const total = salaryRows.reduce((sum, txn) => sum + txn.debit + txn.credit, 0);
      return { month: month.month, count: salaryRows.length, total, avg: salaryRows.length ? round(total / salaryRows.length) : 0 };
    }),
    spendAnalysis: spendGroups
      .map((rows, index) => {
        const amount = rows.reduce((sum, txn) => sum + txn.debit, 0);
        return {
          category: rows[0].category,
          amount: round(amount),
          pct: spendTotal ? round((amount / spendTotal) * 100, 1) : 0,
          color: `var(--chart-${(index % 5) + 1})`,
        };
      })
      .sort((a, b) => b.amount - a.amount),
    billPayments: transactions.filter((txn) => txn.debit > 0 && txn.category === "Utilities").map((txn) => ({
      biller: txn.party,
      category: txn.category,
      monthly: txn.debit,
      lastPaid: txn.dateText,
      consistent: true,
    })),
    recurringDebit: recurringDebitRaw.map((row) => ({
      merchant: row.name,
      frequency: row.frequency,
      amount: row.avgAmount,
      occurrences: row.occurrences,
      lastDate: row.lastDate,
    })),
    recurringCredit: recurringCreditRaw.map((row) => ({
      source: row.name,
      frequency: row.frequency,
      avgAmount: row.avgAmount,
      occurrences: row.occurrences,
      lastDate: row.lastDate,
    })),
    ...moduleSheets,
    events,
    patterns: [...recurringDebitRaw, ...recurringCreditRaw],
    transactions,
  };
}
