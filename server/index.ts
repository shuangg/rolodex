import fs from "node:fs";
import path from "node:path";
import express from "express";
import { createServer as createViteServer } from "vite";
import { initDb } from "./db.ts";
import { registerRoutes } from "./routes.ts";
import { seedIfEmpty } from "./seed.ts";

const PORT = Number(process.env.PORT || 7610);

async function main() {
  initDb();
  seedIfEmpty();

  const app = express();
  app.use(express.json({ limit: "12mb" }));
  registerRoutes(app);

  const dist = path.resolve("dist");
  const isProd = process.env.NODE_ENV === "production" && fs.existsSync(path.join(dist, "index.html"));

  if (isProd) {
    app.use(express.static(dist));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(dist, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Rolodex is running at http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
