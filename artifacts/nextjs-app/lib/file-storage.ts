/**
 * Lightweight file storage for Next.js BFF (local MVP).
 * Matches Express file-service contracts where practical.
 */

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { uploadedFilesTable } from "@/lib/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { AuthUser } from "@/lib/legal-auth";
import { isAdmin } from "@/lib/legal-auth";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
]);

const MAX = Number(process.env.UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);
const ROOT = process.env.STORAGE_LOCAL_PATH ?? path.join(process.cwd(), "uploads");

export function validateUpload(name: string, mime: string, size: number) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["exe", "bat", "cmd", "sh", "ps1", "js", "dll"].includes(ext)) {
    return { ok: false as const, error: "Extension not allowed" };
  }
  if (!ALLOWED.has(mime)) return { ok: false as const, error: "MIME type not allowed" };
  if (size <= 0 || size > MAX) return { ok: false as const, error: "Invalid size" };
  return { ok: true as const };
}

export async function storeLocalFile(opts: {
  owner: AuthUser;
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  entityType?: string;
  entityId?: number;
  isPublic?: boolean;
}) {
  const checksum = crypto.createHash("sha256").update(opts.buffer).digest("hex");
  const fileName = `${crypto.randomUUID()}${path.extname(opts.originalName).slice(0, 16)}`;
  const storagePath = `users/${opts.owner.id}/${fileName}`;
  const full = path.resolve(ROOT, storagePath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, opts.buffer);

  const [row] = await db
    .insert(uploadedFilesTable)
    .values({
      ownerUserId: opts.owner.id,
      entityType: opts.entityType ?? null,
      entityId: opts.entityId ?? null,
      fileName,
      originalName: opts.originalName,
      mimeType: opts.mimeType,
      size: opts.buffer.length,
      storageProvider: "local",
      storagePath,
      checksum,
      isPublic: !!opts.isPublic,
      scanStatus: "SKIPPED",
      scanResult: "No scanner configured",
    })
    .returning();
  return row;
}

export async function getOwnedFile(id: number, user: AuthUser) {
  const [row] = await db
    .select()
    .from(uploadedFilesTable)
    .where(and(eq(uploadedFilesTable.id, id), isNull(uploadedFilesTable.deletedAt)))
    .limit(1);
  if (!row) return null;
  if (!row.isPublic && !isAdmin(user) && row.ownerUserId !== user.id) {
    return "FORBIDDEN" as const;
  }
  return row;
}

export async function softDeleteFile(id: number, user: AuthUser) {
  const row = await getOwnedFile(id, user);
  if (!row || row === "FORBIDDEN") return row;
  if (!isAdmin(user) && row.ownerUserId !== user.id) return "FORBIDDEN" as const;
  try {
    await fs.unlink(path.resolve(ROOT, row.storagePath));
  } catch {
    /* missing file ok */
  }
  const [updated] = await db
    .update(uploadedFilesTable)
    .set({ deletedAt: new Date() })
    .where(eq(uploadedFilesTable.id, id))
    .returning();
  return updated;
}

export function serializeFile(row: typeof uploadedFilesTable.$inferSelect) {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    entityType: row.entityType,
    entityId: row.entityId,
    fileName: row.fileName,
    originalName: row.originalName,
    mimeType: row.mimeType,
    size: row.size,
    storageProvider: row.storageProvider,
    checksum: row.checksum,
    isPublic: row.isPublic,
    scanStatus: row.scanStatus,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}
