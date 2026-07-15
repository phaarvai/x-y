/**
 * Run: npx tsx artifacts/nextjs-app/lib/analytics-utils.test.ts
 * Or: node --import tsx artifacts/nextjs-app/lib/analytics-utils.test.ts
 */

import {
  parseDateRange,
  isManufacturerRole,
  isVisionaryRole,
  isServiceProviderRole,
} from "./analytics-utils";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

// parseDateRange — default LAST_30_DAYS
const defaultRange = parseDateRange({});
assert(defaultRange.preset === "LAST_30_DAYS", "default preset is LAST_30_DAYS");
assert(defaultRange.from < defaultRange.to, "from before to");

// TODAY preset
const today = parseDateRange({ range: "TODAY" });
assert(today.preset === "TODAY", "TODAY preset");
assert(today.from.getHours() === 0, "TODAY starts at midnight");

// CUSTOM with from/to
const custom = parseDateRange({
  range: "CUSTOM",
  from: "2026-01-01",
  to: "2026-01-31",
});
assert(custom.preset === "CUSTOM", "CUSTOM preset");
assert(custom.from.getFullYear() === 2026, "CUSTOM from year");
assert(custom.from.getMonth() === 0, "CUSTOM from month");

// LAST_MONTH returns previous calendar month
const lastMonth = parseDateRange({ range: "LAST_MONTH" });
assert(lastMonth.preset === "LAST_MONTH", "LAST_MONTH preset");
assert(lastMonth.to.getDate() >= 28, "LAST_MONTH to is end of month");

// Invalid CUSTOM from falls back
const badCustom = parseDateRange({ range: "CUSTOM", from: "not-a-date" });
assert(badCustom.preset === "CUSTOM", "bad CUSTOM still CUSTOM preset");
assert(!Number.isNaN(badCustom.from.getTime()), "bad CUSTOM from is valid date");

// isManufacturerRole
assert(isManufacturerRole("MANUFACTURER"), "MANUFACTURER is manufacturer");
assert(!isManufacturerRole("VISIONARY"), "VISIONARY is not manufacturer");
assert(!isManufacturerRole(null), "null is not manufacturer");
assert(!isManufacturerRole(undefined), "undefined is not manufacturer");

// isVisionaryRole
assert(isVisionaryRole("VISIONARY"), "VISIONARY role");
assert(!isVisionaryRole("MANUFACTURER"), "MANUFACTURER is not visionary");

// isServiceProviderRole
assert(isServiceProviderRole("VENDOR"), "VENDOR is service provider");
assert(isServiceProviderRole("LEGAL_WRITER"), "LEGAL_WRITER is service provider");
assert(!isServiceProviderRole("MANUFACTURER"), "MANUFACTURER is not service provider");

console.log("analytics-utils tests: all passed");
