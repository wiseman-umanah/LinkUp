import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { paymentsRouter, publicPaymentsRouter, transactionsRouter } from "./routes/payments.js";
import { walletRouter } from "./routes/wallet.js";
import { logger } from "./lib/logger.js";

export function createApp() {
  const app = express();
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/payments", paymentsRouter);
  app.use("/public/payments", publicPaymentsRouter);
  app.use("/transactions", transactionsRouter);
  app.use("/wallet", walletRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = typeof err.status === "number" ? err.status : 500;
    if (status === 500) {
      logger.error("Unhandled error", err);
    } else {
      logger.warn(`Request failed with status ${status}: ${err.message}`);
    }
    res.status(status).json({ error: err.message ?? "Internal server error" });
  });

  return app;
}
