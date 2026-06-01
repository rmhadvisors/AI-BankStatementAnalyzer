import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { buildStatementExcelFilename } from "../utils/exportFilename";

const { convertPdfToExcelBuffer } = require("../converter/converter");

const uploadDir = path.join(process.cwd(), "src", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (file.mimetype === "application/pdf" || /\.pdf$/i.test(file.originalname)) {
      callback(null, true);
      return;
    }

    callback(new Error("Only PDF files are supported."));
  },
});

export const convertRouter = Router();
export const statementUpload = upload.any();

convertRouter.post("/convert", statementUpload, async (request, response) => {
  const file = (request.files as Express.Multer.File[] | undefined)?.[0];
  const password = request.body?.password || "";

  if (!file) {
    response.status(400).json({
      code: "PDF_REQUIRED",
      message: "Upload a PDF file using the form field name 'statement' or 'file'.",
    });
    return;
  }

  try {
    const result = await convertPdfToExcelBuffer(file.path, { password });
    const outputName = buildStatementExcelFilename(
      { accountInfo: result.statement.accountInfo, fileName: file.originalname },
    );

    response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader("Content-Disposition", `attachment; filename="${outputName.replace(/"/g, "")}"`);
    response.setHeader("X-Transaction-Count", String(result.statement.transactions.length));
    response.send(Buffer.from(result.buffer));
  } catch (error) {
    const err = error as { code?: string; message?: string };
    const status = ["PASSWORD_REQUIRED", "INVALID_PASSWORD", "NO_TRANSACTIONS_FOUND"].includes(err.code || "") ? 400 : 500;

    response.status(status).json({
      code: err.code || "CONVERSION_FAILED",
      message: err.message || "Could not convert this statement.",
    });
  } finally {
    fs.rm(file.path, { force: true }, () => {});
  }
});
