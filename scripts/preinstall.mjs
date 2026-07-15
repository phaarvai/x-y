/**
 * Cross-platform preinstall guard (replaces sh-only hook for Windows dev).
 * - Removes npm/yarn lockfiles if present
 * - Ensures installs run via pnpm
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

for (const file of ["package-lock.json", "yarn.lock"]) {
  const target = path.join(root, file);
  try {
    fs.unlinkSync(target);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code !== "ENOENT") throw err;
  }
}

const agent = process.env.npm_config_user_agent ?? "";
if (!agent.includes("pnpm")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
