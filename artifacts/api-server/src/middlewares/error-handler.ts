import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import { logger } from "../lib/logger";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Attach request id for tracing hooks */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers["x-request-id"];
  const id = typeof incoming === "string" && incoming.length > 0 ? incoming : crypto.randomUUID();
  (req as Request & { requestId?: string }).requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
}

export function globalErrorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as Request & { requestId?: string }).requestId;
  if (err instanceof AppError) {
    logger.warn(
      { err, requestId, statusCode: err.statusCode, code: err.code },
      err.message,
    );
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code ?? "APP_ERROR",
      details: err.details,
      requestId,
    });
  }

  logger.error({ err, requestId }, "Unhandled error");
  const message =
    process.env.NODE_ENV === "production" ? "Internal server error" : err instanceof Error ? err.message : "Error";
  return res.status(500).json({
    error: message,
    code: "INTERNAL_ERROR",
    requestId,
  });
}
