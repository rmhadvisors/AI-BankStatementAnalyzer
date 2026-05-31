import fs from "node:fs";
import path from "node:path";
import { analyzeBankStatements } from "../src/analysis/report";
import { excelGenerator } from "../src/services/excelGenerator";

async function main() {
  const inputPath = process.argv[2] || path.resolve(__dirname, "../../data/input.xlsx");
  const pdfPath = process.argv[3] || path.resolve(__dirname, "../../data/ai-bankanlayzer/IDFC BANK FULL YR.pdf");

  let statements;
  if (fs.existsSync(pdfPath)) {
    const { convertPdfToStatement } = require("../src/converter/converter");
    const statement = await convertPdfToStatement(pdfPath, {});
    statements = [{ fileName: path.basename(pdfPath), accountInfo: statement.accountInfo, transactions: statement.transactions }];
    console.log("Loaded PDF:", pdfPath, "txns:", statement.transactions.length);
  } else {
    console.error("No PDF found at", pdfPath);
    process.exit(1);
  }

  const report = analyzeBankStatements({
    applicantName: "XYZ Corporation Pvt Ltd",
    statements,
  });

  console.log("Sheets built:");
  console.log(" execSheet:", report.execSheet?.length);
  console.log(" tradeCreditsSheet:", report.tradeCreditsSheet?.length);
  console.log(" emiTrackerSheet:", report.emiTrackerSheet?.length);
  console.log(" salarySheet:", report.salarySheet?.length);

  const workbook = await excelGenerator.generateMasterReport(report);
  const outPath = path.resolve(__dirname, "../../data/test-output.xlsx");
  await workbook.xlsx.writeFile(outPath);
  console.log("Wrote", outPath);
  console.log("Sheets:", workbook.worksheets.map((w) => `${w.name}(${w.rowCount})`).join(", "));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
