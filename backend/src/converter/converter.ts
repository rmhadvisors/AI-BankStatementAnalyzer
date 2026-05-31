// @ts-nocheck
const { extractPdf } = require("./pdfExtractor");
const { parseStatement } = require("./parser");
const { buildWorkbookBuffer, writeWorkbookFile } = require("./excelWriter");

async function convertPdfToStatement(filePath, options = {}) {
  const extraction = await extractPdf(filePath, options.password);
  const statement = parseStatement(extraction);

  if (statement.transactions.length === 0) {
    const error = new Error("No transaction rows were detected in this PDF.");
    error.code = "NO_TRANSACTIONS_FOUND";
    throw error;
  }

  return statement;
}

async function convertPdfToExcelBuffer(filePath, options = {}) {
  const statement = await convertPdfToStatement(filePath, options);
  const buffer = await buildWorkbookBuffer(statement);

  return {
    buffer,
    statement,
  };
}

async function convertPdfToExcelFile(filePath, outputPath, options = {}) {
  const statement = await convertPdfToStatement(filePath, options);
  await writeWorkbookFile(statement, outputPath);

  return statement;
}

module.exports = {
  convertPdfToStatement,
  convertPdfToExcelBuffer,
  convertPdfToExcelFile,
};
