import { and, eq, gte, lte, sql } from "drizzle-orm";

export type DateRange = {
  preset: string;
  from: Date;
  to: Date;
};

export function parseDateRange(params: {
  range?: string | null;
  from?: string | null;
  to?: string | null;
}): DateRange {
  const now = new Date();
  const to = params.to ? new Date(params.to) : now;
  const preset = (params.range || "LAST_30_DAYS").toUpperCase();

  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  if (preset === "CUSTOM" && params.from) {
    const from = new Date(params.from);
    return {
      preset: "CUSTOM",
      from: Number.isNaN(from.getTime())
        ? startOfDay(new Date(now.getTime() - 30 * 86400000))
        : startOfDay(from),
      to: Number.isNaN(to.getTime()) ? endOfDay(now) : endOfDay(to),
    };
  }

  let from = startOfDay(now);
  switch (preset) {
    case "TODAY":
      break;
    case "LAST_7_DAYS":
      from = startOfDay(new Date(now.getTime() - 7 * 86400000));
      break;
    case "LAST_90_DAYS":
      from = startOfDay(new Date(now.getTime() - 90 * 86400000));
      break;
    case "THIS_MONTH":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "LAST_MONTH": {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { preset, from, to: last };
    }
    case "THIS_YEAR":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case "LAST_30_DAYS":
    default:
      from = startOfDay(new Date(now.getTime() - 30 * 86400000));
  }

  return { preset, from, to: endOfDay(to) };
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function startOfYear() {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1);
}

const memoryCache = new Map<string, { expiresAt: number; value: unknown }>();

export function getMemoryCache<T>(key: string): T | null {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value as T;
}

export function setMemoryCache(key: string, value: unknown, ttlMs = 60_000) {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function escapeCsv(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(headers: string[], rows: unknown[][]): string {
  return [headers.join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");
}

export const SERVICE_PROVIDER_ROLES = [
  "VENDOR",
  "LABOR_SUPPLIER",
  "LOGISTICS_PROVIDER",
  "INVESTOR",
  "MARKET_LEAD",
  "LEGAL_WRITER",
  "CORPORATE_LAWYER",
  "COMPLIANCE_CONSULTANT",
  "AUDITOR",
  "CHARTERED_ACCOUNTANT",
  "TAX_CONSULTANT",
  "COMPANY_SECRETARY",
  "INTELLECTUAL_PROPERTY_CONSULTANT",
  "LEGAL_AUDITOR",
] as const;

export function isManufacturerRole(role: string | null | undefined) {
  return role === "MANUFACTURER";
}

export function isVisionaryRole(role: string | null | undefined) {
  return role === "VISIONARY";
}

export function isServiceProviderRole(role: string | null | undefined) {
  return !!role && (SERVICE_PROVIDER_ROLES as readonly string[]).includes(role);
}

export { and, eq, gte, lte, sql };
