/**
 * Client-safe environment configuration.
 * Only NEXT_PUBLIC_* variables are exposed to the browser.
 */

function readPublicEnv(key: string, fallback = ""): string {
  return process.env[key]?.trim() ?? fallback;
}

function parseFeatureFlags(raw: string): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([k, v]) => [k, v === true || v === "true" || v === "1"]),
    );
  } catch {
    return Object.fromEntries(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((flag) => [flag, true]),
    );
  }
}

const basePath = readPublicEnv("NEXT_PUBLIC_BASE_PATH").replace(/\/$/, "");

export const env = {
  basePath,
  apiUrl: readPublicEnv("NEXT_PUBLIC_API_URL") || basePath || "",
  storageUrl: readPublicEnv("NEXT_PUBLIC_STORAGE_URL"),
  analyticsKey: readPublicEnv("NEXT_PUBLIC_ANALYTICS_KEY"),
  featureFlags: parseFeatureFlags(readPublicEnv("NEXT_PUBLIC_FEATURE_FLAGS")),
  isDev: process.env.NODE_ENV === "development",
  isProd: process.env.NODE_ENV === "production",
} as const;

export type Env = typeof env;
