/** Pure upload validation — safe to import without DATABASE_URL */

import { AppError } from "../../middlewares/error-handler";
import { config } from "../../config/env";
import crypto from "node:crypto";

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/zip",
  "application/x-zip-compressed",
]);

const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "js",
  "jar",
  "sh",
  "ps1",
  "dll",
  "vbs",
]);

export function validateUploadMeta(originalName: string, mimeType: string, size: number) {
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "";
  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new AppError(400, `File extension .${ext} is not allowed`, "INVALID_EXTENSION");
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new AppError(400, `MIME type ${mimeType} is not allowed`, "INVALID_MIME");
  }
  if (size <= 0 || size > config.uploadMaxBytes) {
    throw new AppError(
      400,
      `File size must be between 1 and ${config.uploadMaxBytes} bytes`,
      "INVALID_SIZE",
    );
  }
}

export function checksumBuffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
