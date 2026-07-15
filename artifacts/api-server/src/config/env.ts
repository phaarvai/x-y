/**
 * EPIC 17 — Environment configuration (api-server)
 * Secrets and tunables come exclusively from process.env.
 */

function env(key: string, fallback?: string): string {
  const v = process.env[key];
  if (v !== undefined && v !== "") return v;
  if (fallback !== undefined) return fallback;
  return "";
}

function envBool(key: string, fallback = false): boolean {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function envInt(key: string, fallback: number): number {
  const n = Number(process.env[key]);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  nodeEnv: env("NODE_ENV", "development"),
  isProd: env("NODE_ENV", "development") === "production",
  isStaging: env("APP_ENV", env("NODE_ENV", "development")) === "staging",
  appEnv: env("APP_ENV", env("NODE_ENV", "development")),
  port: envInt("PORT", 8080),
  appUrl: env("APP_URL", "http://localhost:3000"),
  apiPublicUrl: env("API_PUBLIC_URL", ""),
  sessionSecret: env("SESSION_SECRET", ""),
  corsOrigins: env("CORS_ORIGINS", "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  rateLimitWindowMs: envInt("RATE_LIMIT_WINDOW_MS", 60_000),
  rateLimitMax: envInt("RATE_LIMIT_MAX", 120),
  uploadMaxBytes: envInt("UPLOAD_MAX_BYTES", 10 * 1024 * 1024),
  storageProvider: env("STORAGE_PROVIDER", "local") as "local" | "s3" | "azure" | "gcs",
  storageLocalPath: env("STORAGE_LOCAL_PATH", "./uploads"),
  storagePublicBaseUrl: env("STORAGE_PUBLIC_BASE_URL", "/api/files"),
  s3: {
    bucket: env("AWS_S3_BUCKET"),
    region: env("AWS_REGION", "us-east-1"),
    accessKeyId: env("AWS_ACCESS_KEY_ID"),
    secretAccessKey: env("AWS_SECRET_ACCESS_KEY"),
    endpoint: env("AWS_S3_ENDPOINT"),
  },
  azure: {
    connectionString: env("AZURE_STORAGE_CONNECTION_STRING"),
    container: env("AZURE_STORAGE_CONTAINER", "uploads"),
  },
  gcs: {
    bucket: env("GCS_BUCKET"),
    projectId: env("GCS_PROJECT_ID"),
    keyFile: env("GOOGLE_APPLICATION_CREDENTIALS"),
  },
  signedUrlTtlSeconds: envInt("SIGNED_URL_TTL_SECONDS", 900),
  enableSwagger: envBool("ENABLE_SWAGGER", true),
  enableCompression: envBool("ENABLE_COMPRESSION", true),
  featureFlags: {
    fileUploads: envBool("FF_FILE_UPLOADS", true),
    auditApi: envBool("FF_AUDIT_API", true),
  },
  sentryDsn: env("SENTRY_DSN"),
  metricsEnabled: envBool("METRICS_ENABLED", false),
} as const;

export type AppConfig = typeof config;
