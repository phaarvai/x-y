/**
 * Consistent API error responses (NFR reliability).
 */

import { NextResponse } from "next/server";

export type ApiErrorBody = {
  error: string;
  code?: string;
  details?: unknown;
};

export function apiError(
  status: number,
  error: string,
  opts?: { code?: string; details?: unknown; headers?: Record<string, string> },
) {
  const body: ApiErrorBody = { error };
  if (opts?.code) body.code = opts.code;
  if (opts?.details !== undefined) body.details = opts.details;
  return NextResponse.json(body, { status, headers: opts?.headers });
}

export function rateLimited(resetAt: number, limit: number, remaining: number) {
  return apiError(429, "Too many requests", {
    code: "RATE_LIMITED",
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      "Retry-After": String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))),
    },
  });
}
