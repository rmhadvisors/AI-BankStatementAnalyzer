import cors from "cors";
import express from "express";
import { analysisRouter } from "./routes/analysis.routes";
import { convertRouter } from "./routes/convert.routes";

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors({
  origin: (origin, callback) => {
    const rawOrigin = process.env.FRONTEND_ORIGIN;
    const cleanedFrontendOrigin = rawOrigin ? rawOrigin.trim().replace(/\/$/, "") : "";
    const allowedOrigins = [
      cleanedFrontendOrigin,
      "http://localhost:5173",
      "http://localhost:5174"
    ].filter(Boolean) as string[];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}. Allowed origins: ${allowedOrigins.join(", ")}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
}));
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_request, response) => {
  response.json({ ok: true, service: "ai-bank-statement-analyzer-backend" });
});

app.use("/api", convertRouter);
app.use("/api", analysisRouter);

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  response.status(400).json({
    code: "REQUEST_FAILED",
    message: error.message || "Request failed.",
  });
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
