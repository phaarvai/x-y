/**
 * In-memory rate limiter (API server) — mirror of nextjs-app/lib/rate-limit.ts
 */

type Bucket = { count: number; resetAt: number };
const stores = new Map<string, Map<string, Bucket>>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export function checkRateLimit(
  bucketName: string,
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  let store = stores.get(bucketName);
  if (!store) {
    store = new Map();
    stores.set(bucketName, store);
  }
  const now = Date.now();
  let bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  passwordReset: { limit: 5, windowMs: 60 * 60 * 1000 },
  otp: { limit: 5, windowMs: 15 * 60 * 1000 },
  fileUpload: { limit: 30, windowMs: 60 * 60 * 1000 },
  messaging: { limit: 60, windowMs: 60 * 1000 },
  search: { limit: 120, windowMs: 60 * 1000 },
  payment: { limit: 20, windowMs: 60 * 1000 },
} as const;

export function clientIpFromRequest(req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string } }): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() || "unknown";
  return req.socket?.remoteAddress || "unknown";
}

export function __resetRateLimitStores() {
  stores.clear();
}
