import "./polyfills";
import cors from "cors";
import express from "express";
import { isAllowedFrontendOrigin, listConfiguredOrigins } from "./corsOrigins";
import { analysisRouter } from "./routes/analysis.routes";
import { convertRouter } from "./routes/convert.routes";

const app = express();
const port = Number(process.env.PORT || 3000);
const configuredOrigins = listConfiguredOrigins();

app.use(cors({
  origin: (origin, callback) => {
    // Same-origin or non-browser clients (curl, server-to-server)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (isAllowedFrontendOrigin(origin, configuredOrigins)) {
      callback(null, true);
      return;
    }

    console.warn(
      `CORS blocked for origin: ${origin}. Configured: ${configuredOrigins.join(", ") || "(none)"}; also allows bank-statement-analyzer-frontend-*.vercel.app`,
    );
    // false (not Error) avoids a 400 without CORS headers that browsers report as generic CORS failure
    callback(null, false);
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
