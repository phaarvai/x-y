#!/usr/bin/env node
/**
 * MVP Acceptance Test harness — X!Y Explorer Factory
 *
 * Modes:
 *   STRUCTURAL (default) — verifies routes/pages/tests exist for each acceptance step
 *   LIVE — when MVP_BASE_URL (or STAGING_BASE_URL) is set, exercises happy/failure API paths
 *
 * Usage:
 *   node scripts/mvp-acceptance.mjs
 *   MVP_BASE_URL=https://staging.example.com node scripts/mvp-acceptance.mjs --live
 *
 * Exit 0 only if overall recommendation would be READY (all mandatory steps PASS).
 * Typically exits 1 with a JSON summary written to docs/mvp-acceptance-results.json
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE =
  process.env.MVP_BASE_URL ||
  process.env.STAGING_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "";
const LIVE = process.argv.includes("--live") && !!BASE;

const RESULTS = [];

function add(step, id, name, status, evidence, defects = []) {
  RESULTS.push({ step, id, name, status, evidence, defects });
}

function exists(...rel) {
  return fs.existsSync(path.join(ROOT, ...rel));
}

function structural() {
  // Step 1 — Admin categories
  add(
    1,
    "ADMIN_CATEGORIES",
    "Admin category management",
    exists("artifacts/nextjs-app/app/api/admin/categories/route.ts") &&
      exists("artifacts/nextjs-app/app/admin/categories")
      ? "PARTIAL"
      : "FAIL",
    "APIs + /admin/categories UI present; MACHINERY type via taxonomy seed; UI/forms not fully wired to all filters",
    [
      {
        severity: "Major",
        title: "Category ↔ listing/search wiring incomplete",
        repro: "Create MACHINERY category in admin → open /provider-setup and /browse filters",
      },
    ],
  );

  // Step 2 — Manufacturer registration
  add(
    2,
    "MFG_REGISTER",
    "Manufacturer registration",
    exists("artifacts/nextjs-app/app/api/auth/register/route.ts") &&
      exists("artifacts/nextjs-app/app/register")
      ? "PARTIAL"
      : "FAIL",
    "Register with primaryRole=MANUFACTURER works; email verify issued but not gated before session",
    [
      {
        severity: "Minor",
        title: "Email verification not enforced before access",
        repro: "Register → access dashboard without verifying email",
      },
    ],
  );

  // Step 3 — Facility profile
  add(
    3,
    "FACILITY_PROFILE",
    "Manufacturer facility profile",
    exists("artifacts/nextjs-app/app/api/facilities/route.ts") &&
      exists("artifacts/nextjs-app/app/provider-setup/page.tsx")
      ? "PASS"
      : "FAIL",
    "POST /api/facilities + provider-setup facility step",
  );

  // Step 4 — Machinery listing
  add(
    4,
    "MACHINERY_LISTING",
    "Machinery listing with pricing/availability",
    exists("artifacts/nextjs-app/app/api/facilities/[id]/machinery/route.ts") &&
      exists("artifacts/nextjs-app/app/api/facilities/[id]/publish/route.ts")
      ? "PARTIAL"
      : "FAIL",
    "Machinery + multi-pricing + slots API; UI partial for images/labor/logistics/materials",
    [
      {
        severity: "Major",
        title: "Listing UI missing image upload and support fields",
        repro: "Complete provider-setup step 2 — no image upload for machinery",
      },
    ],
  );

  // Step 5 — Admin moderation
  add(
    5,
    "ADMIN_APPROVE",
    "Admin listing moderation approve",
    exists("artifacts/nextjs-app/app/api/admin/listings/[id]/approve/route.ts") &&
      exists("artifacts/nextjs-app/app/admin/listings")
      ? "PASS"
      : "FAIL",
    "Approve route + admin listings UI",
  );

  // Step 6 — Visionary registration
  add(
    6,
    "VI_REGISTER",
    "Visionary registration",
    exists("artifacts/nextjs-app/app/api/auth/register/route.ts") &&
      exists("artifacts/nextjs-app/app/dashboard/visionary")
      ? "PARTIAL"
      : "FAIL",
    "Role VISIONARY supported; same verify-gate caveat as manufacturer",
  );

  // Step 7 — Search
  add(
    7,
    "SEARCH",
    "Manufacturer search + filters",
    exists("artifacts/nextjs-app/app/api/marketplace/manufacturers/search/route.ts") &&
      exists("artifacts/nextjs-app/app/browse/page.tsx")
      ? "PARTIAL"
      : "FAIL",
    "Search API + browse UI for q + machineType; price/availability/rating filters incomplete",
    [
      {
        severity: "Major",
        title: "Search filters incomplete vs acceptance criteria",
        repro: "Browse → attempt filter by location, price range, availability, ratings",
      },
    ],
  );

  // Step 8 — View listing
  add(
    8,
    "VIEW_LISTING",
    "View manufacturer listing detail",
    exists("artifacts/nextjs-app/app/manufacturer/[id]/page.tsx")
      ? "PARTIAL"
      : "FAIL",
    "Detail page exists; images/availability/certs display incomplete vs API payload",
  );

  // Step 9 — Submit request
  add(
    9,
    "SUBMIT_REQUEST",
    "Visionary submits manufacturing request",
    exists("artifacts/nextjs-app/app/api/requests/route.ts") &&
      exists("artifacts/nextjs-app/app/booking")
      ? "PARTIAL"
      : "FAIL",
    "Request create + notify; no file attachments on listing requests",
    [
      {
        severity: "Minor",
        title: "No file attachments on listing requests",
        repro: "Booking form → no attach control",
      },
    ],
  );

  // Step 10 — Counter-offer
  add(
    10,
    "COUNTER_OFFER",
    "Manufacturer counter-offer",
    exists("artifacts/nextjs-app/app/api/requests/[id]/offers/route.ts") &&
      exists("artifacts/nextjs-app/app/requests/[id]/page.tsx")
      ? "PASS"
      : "FAIL",
    "Offers API + UI counter-offer form",
  );

  // Step 11 — Accept offer → booking
  add(
    11,
    "ACCEPT_OFFER",
    "Visionary accepts counter-offer → booking",
    exists("artifacts/nextjs-app/app/api/offers/[id]/respond/route.ts")
      ? "PASS"
      : "FAIL",
    "respondToOffer creates booking in transaction path",
  );

  // Step 12 — Booking record
  add(
    12,
    "BOOKING",
    "Booking record completeness",
    exists("artifacts/nextjs-app/app/bookings")
      ? "PARTIAL"
      : "FAIL",
    "Booking created; agreedPrice not populated from counter-offer; no dedicated GET by id API",
    [
      {
        severity: "Major",
        title: "Agreed pricing not copied onto booking from accepted offer",
        repro: "Accept counter-offer → inspect booking fields for agreed price",
      },
    ],
  );

  // Step 13 — Transaction
  add(
    13,
    "TRANSACTION",
    "Transaction created on accept",
    exists("artifacts/nextjs-app/app/api/transactions/route.ts")
      ? "FAIL"
      : "FAIL",
    "Transaction APIs exist but are NOT auto-created on request accept / offer accept",
    [
      {
        severity: "Blocker",
        title: "No automatic transaction record on booking confirmation",
        repro: "Complete steps 9–11 → query transactions for bookingId — expect none",
      },
    ],
  );

  // Step 14 — Messaging
  add(
    14,
    "MESSAGING",
    "Request messaging thread",
    exists("artifacts/nextjs-app/app/api/requests/[id]/messages/route.ts")
      ? "PARTIAL"
      : "FAIL",
    "Text messages + notifications; no attachments",
  );

  // Step 15 — Complete booking
  add(
    15,
    "COMPLETE_BOOKING",
    "Mark booking completed",
    exists("artifacts/nextjs-app/app/api/bookings/[id]/complete/route.ts")
      ? "PASS"
      : "FAIL",
    "POST /api/bookings/[id]/complete + UI affordance",
  );

  // Step 16 — Review
  add(
    16,
    "REVIEW",
    "Visionary submits review",
    exists("artifacts/nextjs-app/app/api/bookings") &&
      (exists("artifacts/nextjs-app/app/api/bookings/[bookingId]/reviews/route.ts") ||
        exists("artifacts/nextjs-app/app/api/reviews/route.ts") ||
        fs.existsSync(path.join(ROOT, "artifacts/nextjs-app/app/api")) &&
          (() => {
            // soft check for reviews under bookings
            const walk = (dir) => {
              if (!fs.existsSync(dir)) return false;
              for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, e.name);
                if (e.isDirectory() && walk(p)) return true;
                if (e.isFile() && /reviews/.test(p) && p.includes("bookings")) return true;
              }
              return false;
            };
            return walk(path.join(ROOT, "artifacts/nextjs-app/app/api/bookings"));
          })())
      ? "PASS"
      : "PARTIAL",
    "Review APIs under bookings path expected; verify route exists below",
  );

  // Step 17 — Admin ops
  add(
    17,
    "ADMIN_OPS",
    "Admin console coverage",
    exists("artifacts/nextjs-app/app/admin")
      ? "PARTIAL"
      : "FAIL",
    "Users/listings/transactions/reviews UI; missing dedicated requests/bookings/notifications/audit UI pages",
    [
      {
        severity: "Major",
        title: "Admin cannot view requests/bookings/audit from dedicated UI",
        repro: "Login as admin → look for Requests, Bookings, Audit Logs pages",
      },
    ],
  );

  // Cross-cutting
  add(
    0,
    "SECURITY",
    "Security NFR gates",
    exists("artifacts/nextjs-app/lib/password.ts") &&
      exists("artifacts/nextjs-app/lib/rate-limit.ts")
      ? "PASS"
      : "FAIL",
    "scrypt hashing, rate limits, file ownership checks present in codebase",
  );

  add(
    0,
    "ENV_STAGING",
    "Staging environment executable",
    BASE ? "PASS" : "FAIL",
    BASE
      ? `BASE configured: ${BASE}`
      : "No MVP_BASE_URL / STAGING_BASE_URL / running local server — live E2E not executed",
    BASE
      ? []
      : [
          {
            severity: "Blocker",
            title: "Staging environment unavailable for acceptance execution",
            repro: "Set MVP_BASE_URL and ensure app+DB migrations applied, then re-run --live",
          },
        ],
  );
}

async function live() {
  const url = (p) => `${BASE.replace(/\/$/, "")}${p}`;
  const json = async (p, init) => {
    const res = await fetch(url(p), {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    return { res, body };
  };

  // Failure path: bad login
  {
    const { res } = await json("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "nobody@example.com", password: "WrongPass1" }),
    });
    add(
      2,
      "LIVE_LOGIN_FAIL",
      "Auth failure path returns 401",
      res.status === 401 ? "PASS" : "FAIL",
      `POST /api/auth/login → ${res.status}`,
    );
  }

  // Health
  {
    const healthPaths = ["/api/livez", "/api/readyz", "/api/healthz", "/livez", "/readyz"];
    let ok = false;
    let evidence = "";
    for (const p of healthPaths) {
      try {
        const res = await fetch(url(p));
        if (res.ok) {
          ok = true;
          evidence = `${p} → ${res.status}`;
          break;
        }
      } catch (e) {
        evidence = String(e);
      }
    }
    add(0, "LIVE_HEALTH", "Health/live endpoints", ok ? "PASS" : "FAIL", evidence);
  }

  // Search empty / rate
  {
    const t0 = Date.now();
    const { res, body } = await json("/api/marketplace/manufacturers/search?q=acceptance-test-empty");
    const ms = Date.now() - t0;
    add(
      7,
      "LIVE_SEARCH",
      "Search responds under 2s",
      res.ok && ms < 2000 ? "PASS" : res.ok ? "PARTIAL" : "FAIL",
      `status=${res.status} ms=${ms} items=${body?.data?.length ?? body?.items?.length ?? "n/a"}`,
    );
  }

  // Unauthenticated admin → 401
  {
    const { res } = await json("/api/admin/categories");
    add(
      1,
      "LIVE_ADMIN_RBAC",
      "Admin categories require auth",
      res.status === 401 || res.status === 403 ? "PASS" : "FAIL",
      `GET /api/admin/categories → ${res.status}`,
    );
  }
}

function summarize() {
  const counts = { PASS: 0, PARTIAL: 0, FAIL: 0 };
  for (const r of RESULTS) counts[r.status] = (counts[r.status] || 0) + 1;
  const blockers = RESULTS.flatMap((r) =>
    (r.defects || []).filter((d) => d.severity === "Blocker").map((d) => ({ step: r.step, ...d })),
  );
  const majors = RESULTS.flatMap((r) =>
    (r.defects || []).filter((d) => d.severity === "Major").map((d) => ({ step: r.step, ...d })),
  );

  const mandatoryFail =
    RESULTS.some((r) => ["TRANSACTION", "ENV_STAGING"].includes(r.id) && r.status === "FAIL") ||
    blockers.length > 0;

  const recommendation = mandatoryFail
    ? "DO_NOT_RELEASE"
    : counts.FAIL > 0 || counts.PARTIAL > 3
      ? "CONDITIONAL_HOLD"
      : "READY_FOR_RELEASE";

  return { counts, blockers, majors, recommendation, executedAt: new Date().toISOString(), mode: LIVE ? "LIVE" : "STRUCTURAL", base: BASE || null };
}

async function main() {
  structural();
  if (LIVE) {
    try {
      await live();
    } catch (err) {
      add(0, "LIVE_ERROR", "Live execution error", "FAIL", String(err), [
        { severity: "Blocker", title: "Live acceptance aborted", repro: String(err) },
      ]);
    }
  }

  // refine review check
  const reviewRoute =
    exists("artifacts/nextjs-app/app/api/bookings/[bookingId]/reviews/route.ts") ||
    exists("artifacts/nextjs-app/app/api/bookings/[id]/reviews/route.ts");
  const rev = RESULTS.find((r) => r.id === "REVIEW");
  if (rev) {
    rev.status = reviewRoute ? "PASS" : "PARTIAL";
    rev.evidence = reviewRoute
      ? "Booking reviews route present"
      : "Reviews may live under alternate path — verify before sign-off";
  }

  const summary = summarize();
  const out = { summary, results: RESULTS };
  const outPath = path.join(ROOT, "docs", "mvp-acceptance-results.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote ${path.relative(ROOT, outPath)}`);
  console.log(`Recommendation: ${summary.recommendation}`);
  process.exit(summary.recommendation === "READY_FOR_RELEASE" ? 0 : 1);
}

main();
