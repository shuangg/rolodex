import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createApp } from "./app";
import { getDb } from "./db";
import { seedIfEmpty } from "./seed";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "..", "dist");

const app = createApp();

const db = getDb();
const seeded = seedIfEmpty(db);
if (seeded) {
  console.log("Rolodex database seeded with sample data.");
}

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

const port = Number(process.env.PORT || 5173);
app.listen(port, "0.0.0.0", () => {
  console.log(`Rolodex running at http://localhost:${port}`);
});
