import { formatINR } from "@/data/reportData";
import type { DailyFlowPoint, MomLike } from "@/lib/dailyMetrics";
import { chartAmountTick, chartTooltipStyle } from "@/lib/dailyMetrics";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  ReferenceLine,
} from "recharts";

type MomRow = MomLike & { month: string };

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function BreakdownTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "positive" | "negative" | "neutral";
}) {
  const tone =
    accent === "positive"
      ? "text-[color:var(--positive)]"
      : accent === "negative"
        ? "text-[color:var(--negative)]"
        : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-display text-lg font-semibold num", tone)}>{value}</div>
    </div>
  );
}

/** Credits vs debits for one month — side-by-side bars (not a line chart). */
export function MonthTotalsChart({ row, monthLabel }: { row: MomRow; monthLabel: string }) {
  const data = [
    { name: "Credits", value: row.totalCredits ?? 0, fill: "var(--chart-3)" },
    { name: "Debits", value: row.totalDebits ?? 0, fill: "var(--chart-1)" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <BreakdownTile label="Opening" value={formatINR(row.openingBal ?? 0)} />
        <BreakdownTile label="Closing" value={formatINR(row.closingBal ?? 0)} />
        <BreakdownTile
          label="Net flow"
          value={formatINR(row.netFlow ?? 0)}
          accent={(row.netFlow ?? 0) >= 0 ? "positive" : "negative"}
        />
        <BreakdownTile label="Cash in" value={formatINR(row.cashDeposits ?? 0)} accent="positive" />
        <BreakdownTile label="Cash out" value={formatINR(row.cashWithdrawals ?? 0)} accent="negative" />
        <BreakdownTile label="Avg balance" value={formatINR(row.abb ?? 0)} />
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={chartAmountTick}
              width={48}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(v: number) => formatINR(v)}
              labelFormatter={() => monthLabel}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={120}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Day-by-day credits & debits within the selected month. */
export function DailyFlowChart({ data, monthLabel }: { data: DailyFlowPoint[]; monthLabel: string }) {
  if (data.length === 0) {
    return <EmptyChart message="No dated transactions found for this month." />;
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            interval={data.length > 20 ? Math.floor(data.length / 12) : 0}
            angle={data.length > 14 ? -35 : 0}
            textAnchor={data.length > 14 ? "end" : "middle"}
            height={data.length > 14 ? 52 : 28}
          />
          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickFormatter={chartAmountTick} width={48} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(v: number, name: string) => [formatINR(v), name]}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as DailyFlowPoint | undefined;
              if (!p) return monthLabel;
              return `${p.label} · ${p.txnCount} txn${p.txnCount === 1 ? "" : "s"}`;
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="totalCredits" name="Credits" fill="var(--chart-3)" radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Bar dataKey="totalDebits" name="Debits" fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Yearly multi-month line chart; monthly uses daily or totals chart. */
export function CreditsDebitsPeriodChart({
  isMonthly,
  monthLabel,
  momRows,
  dailyFlow,
}: {
  isMonthly: boolean;
  monthLabel: string;
  momRows: MomRow[];
  dailyFlow: DailyFlowPoint[];
}) {
  if (isMonthly) {
    const row = momRows[0];
    if (!row) {
      return <EmptyChart message="No data for the selected month." />;
    }
    if (dailyFlow.length >= 2) {
      return (
        <div className="space-y-4">
          <DailyFlowChart data={dailyFlow} monthLabel={monthLabel} />
          <MonthTotalsChart row={row} monthLabel={monthLabel} />
        </div>
      );
    }
    return <MonthTotalsChart row={row} monthLabel={monthLabel} />;
  }

  if (momRows.length === 0) {
    return <EmptyChart message="No monthly data in this statement." />;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={momRows}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} stroke="var(--border)" />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            stroke="var(--border)"
            tickFormatter={chartAmountTick}
            width={48}
          />
          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatINR(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="totalCredits" name="Credits" stroke="var(--chart-3)" strokeWidth={2} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="totalDebits" name="Debits" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NetPositionPeriodChart({
  isMonthly,
  monthLabel,
  momRows,
  dailyFlow,
}: {
  isMonthly: boolean;
  monthLabel: string;
  momRows: MomRow[];
  dailyFlow: DailyFlowPoint[];
}) {
  if (isMonthly) {
    if (dailyFlow.length >= 2) {
      const netDaily = dailyFlow.map((d) => ({ label: d.label, net: d.netFlow }));
      return (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={netDaily}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                interval={netDaily.length > 20 ? Math.floor(netDaily.length / 12) : 0}
                angle={netDaily.length > 14 ? -35 : 0}
                textAnchor={netDaily.length > 14 ? "end" : "middle"}
                height={netDaily.length > 14 ? 52 : 28}
              />
              <YAxis tickFormatter={chartAmountTick} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={48} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatINR(v)} labelFormatter={() => monthLabel} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Bar dataKey="net" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {netDaily.map((d, i) => (
                  <Cell key={i} fill={d.net >= 0 ? "var(--positive)" : "var(--negative)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
    const net = momRows[0]?.netFlow ?? 0;
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-md border border-border bg-muted/10">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Net for {monthLabel}</div>
        <div
          className={cn(
            "font-display text-4xl font-bold num",
            net >= 0 ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
          )}
        >
          {formatINR(net)}
        </div>
      </div>
    );
  }

  const netRows = momRows.map((m) => ({
    month: m.month ?? "",
    net: m.netFlow ?? 0,
    credits: m.totalCredits ?? 0,
    debits: m.totalDebits ?? 0,
  }));

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={netRows}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          <YAxis tickFormatter={chartAmountTick} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={48} />
          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatINR(v)} />
          <ReferenceLine y={0} stroke="var(--border)" />
          <Bar dataKey="net" radius={[4, 4, 0, 0]}>
            {netRows.map((d, i) => (
              <Cell key={i} fill={d.net >= 0 ? "var(--positive)" : "var(--negative)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CashflowPeriodChart({
  isMonthly,
  monthLabel,
  monthlyCF,
  momRow,
}: {
  isMonthly: boolean;
  monthLabel: string;
  monthlyCF: Array<{
    month: string;
    opening: number;
    operating: number;
    investing: number;
    financing: number;
    closing: number;
  }>;
  momRow?: MomRow;
}) {
  if (isMonthly) {
    const cf = monthlyCF[0];
    if (!cf && !momRow) {
      return <EmptyChart message="No cash-flow data for this month." />;
    }
    const opening = cf?.opening ?? momRow?.openingBal ?? 0;
    const closing = cf?.closing ?? momRow?.closingBal ?? 0;
    const operating = cf?.operating ?? momRow?.netFlow ?? 0;
    const investing = cf?.investing ?? 0;
    const financing = cf?.financing ?? 0;

    const waterfall = [
      { name: "Opening", value: opening, fill: "var(--muted-foreground)" },
      { name: "Operating", value: operating, fill: operating >= 0 ? "var(--chart-3)" : "var(--chart-1)" },
      { name: "Investing", value: investing, fill: "var(--chart-4)" },
      { name: "Financing", value: financing, fill: "var(--chart-2)" },
      { name: "Closing", value: closing, fill: "var(--primary)" },
    ];

    return (
      <div className="space-y-4">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfall} layout="vertical" margin={{ left: 72, right: 16 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={chartAmountTick} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={70} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatINR(v)} labelFormatter={() => monthLabel} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {waterfall.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (monthlyCF.length === 0) {
    return <EmptyChart message="No cash-flow data available." />;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={monthlyCF}>
          <defs>
            <linearGradient id="cfCloseGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          <YAxis tickFormatter={chartAmountTick} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={48} />
          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatINR(v)} />
          <Area type="monotone" dataKey="closing" name="Closing balance" stroke="var(--primary)" fill="url(#cfCloseGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CamPeriodChart({
  isMonthly,
  monthLabel,
  camRows,
}: {
  isMonthly: boolean;
  monthLabel: string;
  camRows: Array<{
    month: string;
    netCredit?: number;
    netDebit?: number;
    abb?: number;
    utilization?: number;
    iwReturnCount?: number;
    owReturnCount?: number;
  }>;
}) {
  if (camRows.length === 0) {
    return <EmptyChart message="No CAM data for this period." />;
  }

  if (isMonthly) {
    const c = camRows[0];
    const tiles = [
      { label: "Net credit", value: formatINR(c.netCredit ?? 0), accent: "positive" as const },
      { label: "Net debit", value: formatINR(c.netDebit ?? 0), accent: "negative" as const },
      { label: "ABB", value: formatINR(c.abb ?? 0) },
      { label: "Utilization", value: `${((c.utilization ?? 0) * 100).toFixed(1)}%` },
      { label: "I/W returns", value: String(c.iwReturnCount ?? 0) },
      { label: "O/W returns", value: String(c.owReturnCount ?? 0) },
    ];
    return (
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground">CAM snapshot · {monthLabel}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tiles.map((t) => (
            <BreakdownTile key={t.label} label={t.label} value={t.value} accent={t.accent} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={camRows}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          <YAxis tickFormatter={chartAmountTick} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={48} />
          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatINR(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="netCredit" name="Net credit" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="netDebit" name="Net debit" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
