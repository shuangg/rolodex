import express from "express";
import { api } from "./routes";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));
  app.use("/api", api);
  app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(err.status ?? 500).json({ error: err.message ?? "Internal error" });
  });
  return app;
}
