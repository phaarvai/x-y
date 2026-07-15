import type { NextFunction, Request, Response } from "express";
import { config } from "../config/env";

/**
 * Security headers (Helmet-like, zero extra dependency).
 * HTTPS-ready: Strict-Transport-Security only when X-Forwarded-Proto is https.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  const proto = req.headers["x-forwarded-proto"];
  if (proto === "https" || config.isProd) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

/** In-memory sliding-window rate limiter (per IP). Production: replace with Redis hook. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip =
    (typeof req.headers["x-forwarded-for"] === "string"
      ? req.headers["x-forwarded-for"].split(",")[0]?.trim()
      : null) ||
    req.socket.remoteAddress ||
    "unknown";
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + config.rateLimitWindowMs };
    buckets.set(ip, bucket);
  }
  bucket.count += 1;
  res.setHeader("X-RateLimit-Limit", String(config.rateLimitMax));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, config.rateLimitMax - bucket.count)));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
  if (bucket.count > config.rateLimitMax) {
    return res.status(429).json({ error: "Too many requests", code: "RATE_LIMITED" });
  }
  next();
}

/** Lightweight compression via Accept-Encoding when ENABLE_COMPRESSION=true (Node zlib). */
import zlib from "node:zlib";

export function compressionMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!config.enableCompression) return next();
  const accept = req.headers["accept-encoding"] ?? "";
  if (!String(accept).includes("gzip")) return next();

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    try {
      const payload = Buffer.from(JSON.stringify(body));
      if (payload.length < 1024) return originalJson(body);
      const compressed = zlib.gzipSync(payload);
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Vary", "Accept-Encoding");
      return res.send(compressed);
    } catch {
      return originalJson(body);
    }
  }) as typeof res.json;

  next();
}
