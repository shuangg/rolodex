import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distIndex = path.join(root, "dist", "index.html");

if (!fs.existsSync(distIndex)) {
  console.log("First run detected — building the app…");
  execSync("npm run build", { cwd: root, stdio: "inherit" });
}

console.log("Starting Rolodex…");
execSync("npx tsx server/index.ts", { cwd: root, stdio: "inherit" });
