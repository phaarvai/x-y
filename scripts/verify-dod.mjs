#!/usr/bin/env node
/**
 * Definition of Done gate for X!Y.
 *
 * Usage:
 *   node scripts/verify-dod.mjs                 # validate docs/dod-status.md
 *   node scripts/verify-dod.mjs --init --ticket XFY-1 --title "Fix login"
 *   node scripts/verify-dod.mjs --path docs/dod-status.md
 *
 * Exit 0 only when every checklist value is `pass` or `n/a` (no `fail`, no missing keys).
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DEFAULT_STATUS = path.join(ROOT, "docs", "dod-status.md");

const REQUIRED_KEYS = [
  "feature_implementation",
  "code_quality",
  "testing_happy_and_failure",
  "api_contracts_openapi",
  "ui_responsive_a11y",
  "rbac_security",
  "state_handling",
  "validation_fe_be",
  "functional_manual",
  "code_review",
  "staging_verification",
  "backward_compatibility",
  "performance",
  "logging_auditing",
  "documentation",
];

function parseArgs(argv) {
  const out = { init: false, ticket: "TBD", title: "TBD", statusPath: DEFAULT_STATUS };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--init") out.init = true;
    else if (a === "--ticket") out.ticket = argv[++i] ?? out.ticket;
    else if (a === "--title") out.title = argv[++i] ?? out.title;
    else if (a === "--path") out.statusPath = path.resolve(argv[++i] ?? DEFAULT_STATUS);
  }
  return out;
}

function template({ ticket, title }) {
  return `# DoD status — fill before marking Done

> Generated for local/CI gate. Mark each item \`pass\`, \`fail\`, or \`n/a\`.
> Any \`fail\` keeps the ticket **In Progress**.

ticket: ${ticket}
title: ${title}

## checklist

feature_implementation: fail
code_quality: fail
testing_happy_and_failure: fail
api_contracts_openapi: n/a
ui_responsive_a11y: n/a
rbac_security: fail
state_handling: n/a
validation_fe_be: fail
functional_manual: fail
code_review: fail
staging_verification: fail
backward_compatibility: fail
performance: fail
logging_auditing: n/a
documentation: fail

## outstanding

- Complete implementation and re-run \`pnpm run dod:check\`
`;
}

function parseStatus(text) {
  const checklist = {};
  let inChecklist = false;
  const outstanding = [];
  let inOutstanding = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.toLowerCase() === "## checklist") {
      inChecklist = true;
      inOutstanding = false;
      continue;
    }
    if (line.toLowerCase() === "## outstanding") {
      inChecklist = false;
      inOutstanding = true;
      continue;
    }
    if (line.startsWith("## ")) {
      inChecklist = false;
      inOutstanding = false;
      continue;
    }
    if (inChecklist) {
      const m = line.match(/^([a-z0-9_]+)\s*:\s*(pass|fail|n\/a)$/i);
      if (m) checklist[m[1]] = m[2].toLowerCase();
    }
    if (inOutstanding && line.startsWith("- ")) outstanding.push(line.slice(2).trim());
  }
  return { checklist, outstanding };
}

function main() {
  const args = parseArgs(process.argv);

  if (args.init) {
    fs.mkdirSync(path.dirname(args.statusPath), { recursive: true });
    fs.writeFileSync(args.statusPath, template(args), "utf8");
    console.log(`Wrote ${path.relative(ROOT, args.statusPath)}`);
    console.log("Edit statuses to pass|fail|n/a, then run: pnpm run dod:check");
    process.exit(0);
  }

  if (!fs.existsSync(args.statusPath)) {
    console.error(`Missing DoD status file: ${args.statusPath}`);
    console.error("Run: pnpm run dod:init -- --ticket XFY-000 --title \"Your title\"");
    process.exit(1);
  }

  const text = fs.readFileSync(args.statusPath, "utf8");
  const { checklist, outstanding } = parseStatus(text);

  const missing = REQUIRED_KEYS.filter((k) => !(k in checklist));
  const failed = REQUIRED_KEYS.filter((k) => checklist[k] === "fail");
  const invalid = Object.entries(checklist)
    .filter(([, v]) => !["pass", "fail", "n/a"].includes(v))
    .map(([k, v]) => `${k}=${v}`);

  console.log("X!Y Definition of Done gate");
  console.log(`Status file: ${path.relative(ROOT, args.statusPath)}`);
  for (const key of REQUIRED_KEYS) {
    const v = checklist[key] ?? "MISSING";
    const mark = v === "pass" || v === "n/a" ? "✓" : "✗";
    console.log(`  ${mark} ${key}: ${v}`);
  }

  if (missing.length || failed.length || invalid.length) {
    console.error("\nStatus: In Progress — DoD not satisfied");
    if (missing.length) console.error("Missing keys:", missing.join(", "));
    if (failed.length) console.error("Failed items:", failed.join(", "));
    if (invalid.length) console.error("Invalid values:", invalid.join(", "));
    if (outstanding.length) {
      console.error("Outstanding:");
      for (const item of outstanding) console.error(`  - ${item}`);
    } else {
      console.error("Fill ## outstanding with concrete remaining work.");
    }
    process.exit(1);
  }

  console.log("\nStatus: Done — all DoD checklist items are pass or n/a");
  process.exit(0);
}

main();
