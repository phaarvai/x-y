import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { AppError } from "./error-handler";

type Source = "body" | "query" | "params";

export function validate(schema: ZodTypeAny, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return next(
        new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.flatten()),
      );
    }
    (req as Request & { validated?: unknown }).validated = parsed.data;
    if (source === "body") req.body = parsed.data;
    next();
  };
}
