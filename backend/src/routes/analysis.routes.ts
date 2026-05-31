import fs from "node:fs";
import { Router } from "express";
import { analyzeBankStatements, type ExtractedStatement } from "../analysis";
import { listReportMonthKeys, scopeReportByMonth } from "../analysis/scopeReport";
import { createAnalysisRecord, createFailedAnalysisRecord, getAnalysisRecord } from "../storage/analysisStore";
import { statementUpload } from "./convert.routes";
import { excelGenerator } from "../services/excelGenerator";
import { generateMasterSummaryPdf } from "../services/pdfGenerator";
import { buildExcelExportFilename, buildMasterSummaryPdfFilename } from "../utils/exportFilename";

const { convertPdfToStatement } = require("../converter/converter");

export const analysisRouter = Router();

function parsePasswordList(body: Record<string, unknown>): string[] {
  const raw = body.passwords;
  if (Array.isArray(raw)) {
    return raw.map((p) => String(p ?? ""));
  }
  if (typeof raw === "string") {
    return [raw];
  }
  return [];
}

analysisRouter.post("/analysis", statementUpload, async (request, response) => {
  const files = (request.files as Express.Multer.File[] | undefined) || [];
  const passwords = parsePasswordList(request.body as Record<string, unknown>);
  const legacyPassword = typeof request.body?.password === "string" ? request.body.password : "";

  if (files.length === 0) {
    response.status(400).json({
      code: "PDF_REQUIRED",
      message: "Upload one or more PDF files using the form field name 'statement' or 'file'.",
    });
    return;
  }

  try {
    const statements: ExtractedStatement[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const password = passwords[i] ?? legacyPassword ?? "";
      const statement = await convertPdfToStatement(file.path, { password });
      statements.push({
        fileName: file.originalname,
        accountInfo: statement.accountInfo,
        transactions: statement.transactions,
      });
    }

    const report = analyzeBankStatements({
      applicantName:
        typeof request.body?.applicantName === "string" ? request.body.applicantName : undefined,
      entityType: typeof request.body?.entityType === "string" ? request.body.entityType : undefined,
      pan: typeof request.body?.pan === "string" ? request.body.pan : undefined,
      loanType: typeof request.body?.loanType === "string" ? request.body.loanType : undefined,
      statements,
    });
    const record = createAnalysisRecord(report);
    if (report && typeof report === "object" && report.applicant) {
      report.applicant.analysisId = record.id;
    }

    response.status(201).json({
      id: record.id,
      status: record.status,
      report,
    });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    const record = createFailedAnalysisRecord(err.message || "Analysis failed.");
    const status = ["PASSWORD_REQUIRED", "INVALID_PASSWORD", "NO_TRANSACTIONS_FOUND"].includes(err.code || "") ? 400 : 500;

    response.status(status).json({
      id: record.id,
      status: record.status,
      code: err.code || "ANALYSIS_FAILED",
      message: err.message || "Could not analyze this statement.",
    });
  } finally {
    for (const file of files) {
      fs.rm(file.path, { force: true }, () => {});
    }
  }
});

analysisRouter.post("/analysis/from-statements", (request, response) => {
  const statements = request.body?.statements as ExtractedStatement[] | undefined;

  if (!Array.isArray(statements) || statements.length === 0) {
    response.status(400).json({
      code: "STATEMENTS_REQUIRED",
      message: "Provide a non-empty statements array.",
    });
    return;
  }

  const report = analyzeBankStatements({
    applicantName: request.body?.applicantName,
    entityType: request.body?.entityType,
    pan: request.body?.pan,
    loanType: request.body?.loanType,
    statements,
  });
  const record = createAnalysisRecord(report);

  response.status(201).json({
    id: record.id,
    status: record.status,
    report,
  });
});

function resolveReportView(
  report: NonNullable<ReturnType<typeof getAnalysisRecord>>["report"],
  query: Record<string, unknown>,
) {
  if (!report) return report;

  const period = typeof query.period === "string" ? query.period : undefined;
  const monthKey = typeof query.monthKey === "string" ? query.monthKey : undefined;

  if (period === "monthly" && monthKey) {
    return scopeReportByMonth(report, monthKey);
  }

  return report;
}

analysisRouter.get("/analysis/:id", (request, response) => {
  const record = getAnalysisRecord(request.params.id);

  if (!record) {
    response.status(404).json({
      code: "ANALYSIS_NOT_FOUND",
      message: "No analysis exists for this id.",
    });
    return;
  }

  const fullReport = record.report;
  const report = resolveReportView(fullReport, request.query as Record<string, unknown>);

  response.json({
    ...record,
    report,
    availableMonths: fullReport ? listReportMonthKeys(fullReport) : [],
  });
});

// Master Excel download endpoint
analysisRouter.get("/analysis/:id/excel/master", async (request, response) => {
  try {
    const { id } = request.params;
    const record = getAnalysisRecord(id);

    if (!record || !record.report) {
      response.status(404).json({
        code: "ANALYSIS_NOT_FOUND",
        message: "No analysis exists for this id.",
      });
      return;
    }

    const report =
      resolveReportView(record.report, request.query as Record<string, unknown>) ?? record.report;
    const workbook = await excelGenerator.generateMasterReport(report);
    const filename = buildExcelExportFilename(report as Parameters<typeof buildExcelExportFilename>[0]);

    response.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    await workbook.xlsx.write(response);
    response.end();
  } catch (error) {
    console.error("Master Excel generation error:", error);
    response.status(500).json({
      code: "EXCEL_GENERATION_FAILED",
      message: "Failed to generate Excel file.",
    });
  }
});

analysisRouter.get("/analysis/:id/pdf/master", async (request, response) => {
  try {
    const { id } = request.params;
    const record = getAnalysisRecord(id);

    if (!record || !record.report) {
      response.status(404).json({
        code: "ANALYSIS_NOT_FOUND",
        message: "No analysis exists for this id.",
      });
      return;
    }

    const report =
      resolveReportView(record.report, request.query as Record<string, unknown>) ?? record.report;
    const filename = buildMasterSummaryPdfFilename(
      report as Parameters<typeof buildMasterSummaryPdfFilename>[0],
    );
    const pdf = await generateMasterSummaryPdf({
      analysisId: id,
      filename,
      query: request.query as Record<string, unknown>,
    });

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.send(pdf);
  } catch (error) {
    console.error("Master PDF generation error:", error);
    response.status(500).json({
      code: "PDF_GENERATION_FAILED",
      message:
        "Failed to generate PDF file. Make sure Chrome or Edge is installed, or set CHROME_PATH.",
    });
  }
});

// Excel download endpoint
analysisRouter.get("/analysis/:id/excel/:module", async (request, response) => {
  try {
    const { id, module } = request.params;
    const record = getAnalysisRecord(id);
    
    if (!record || !record.report) {
      response.status(404).json({
        code: "ANALYSIS_NOT_FOUND",
        message: "No analysis exists for this id.",
      });
      return;
    }
    // Optional filters for specific modules
    const party = typeof request.query.party === "string" ? request.query.party : undefined;
    const report =
      resolveReportView(record.report, request.query as Record<string, unknown>) ?? record.report;

    // Generate Excel workbook for the specific module
    const workbook = await excelGenerator.generateModuleExcel(module, report, { party });
    const filename = buildExcelExportFilename(report as Parameters<typeof buildExcelExportFilename>[0], {
      moduleLabel: module,
    });

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    // Write workbook to response
    await workbook.xlsx.write(response);
    response.end();
  } catch (error) {
    console.error('Excel generation error:', error);
    response.status(500).json({
      code: "EXCEL_GENERATION_FAILED",
      message: "Failed to generate Excel file.",
    });
  }
});
