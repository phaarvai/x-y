/**
 * EPIC 17 XFY-086 — File storage service
 */

import crypto from "node:crypto";
import path from "node:path";
import { db, uploadedFilesTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { AppError } from "../../middlewares/error-handler";
import { assertOwnership } from "../../middlewares/rbac";
import type { AuthUser } from "../auth";
import { getMalwareScanner, getStorageProvider } from "./providers";
import { validateUploadMeta, checksumBuffer } from "./upload-validation";

export { ALLOWED_MIME_TYPES, validateUploadMeta, checksumBuffer } from "./upload-validation";

function safeFileName(originalName: string): string {
  const ext = path.extname(originalName).slice(0, 16);
  const id = crypto.randomUUID();
  return `${id}${ext}`;
}

export type UploadInput = {
  owner: AuthUser;
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  entityType?: string;
  entityId?: number;
  isPublic?: boolean;
  expectedChecksum?: string;
};

export async function uploadFile(input: UploadInput) {
  validateUploadMeta(input.originalName, input.mimeType, input.buffer.length);
  const checksum = checksumBuffer(input.buffer);
  if (input.expectedChecksum && input.expectedChecksum !== checksum) {
    throw new AppError(400, "Checksum mismatch", "CHECKSUM_MISMATCH");
  }

  const scanner = getMalwareScanner();
  const scan = await scanner.scan(input.buffer, input.originalName, input.mimeType);
  if (scan.status === "INFECTED") {
    throw new AppError(400, "File failed malware scan", "MALWARE_DETECTED", scan);
  }

  const fileName = safeFileName(input.originalName);
  const key = `users/${input.owner.id}/${fileName}`;
  const provider = getStorageProvider();
  const stored = await provider.putObject({
    key,
    body: input.buffer,
    contentType: input.mimeType,
    isPublic: input.isPublic,
  });

  const [row] = await db
    .insert(uploadedFilesTable)
    .values({
      ownerUserId: input.owner.id,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      fileName,
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.buffer.length,
      storageProvider: stored.provider,
      storagePath: stored.storagePath,
      checksum,
      isPublic: !!input.isPublic,
      scanStatus: scan.status === "SKIPPED" ? "SKIPPED" : scan.status,
      scanResult: scan.detail ?? null,
    })
    .returning();

  return row;
}

export async function getFileForUser(fileId: number, user: AuthUser) {
  const [row] = await db
    .select()
    .from(uploadedFilesTable)
    .where(and(eq(uploadedFilesTable.id, fileId), isNull(uploadedFilesTable.deletedAt)))
    .limit(1);
  if (!row) throw new AppError(404, "File not found", "FILE_NOT_FOUND");
  if (!row.isPublic) {
    assertOwnership({ user, ownerUserId: row.ownerUserId, confidential: true, explicitAuthorized: row.ownerUserId === user.id });
  }
  return row;
}

export async function deleteFileForUser(fileId: number, user: AuthUser) {
  const row = await getFileForUser(fileId, user);
  assertOwnership({ user, ownerUserId: row.ownerUserId });
  const provider = getStorageProvider();
  await provider.deleteObject(row.storagePath);
  const [updated] = await db
    .update(uploadedFilesTable)
    .set({ deletedAt: new Date() })
    .where(eq(uploadedFilesTable.id, fileId))
    .returning();
  return updated;
}

export async function createDownloadUrl(fileId: number, user: AuthUser) {
  const row = await getFileForUser(fileId, user);
  const provider = getStorageProvider();
  if (row.isPublic) {
    return {
      url: `${config.storagePublicBaseUrl}/${row.id}`,
      expiresAt: null as Date | null,
      file: row,
    };
  }
  const signed = await provider.getSignedUrl(row.storagePath);
  return { url: signed.url, expiresAt: signed.expiresAt, file: row };
}

export function serializeUploadedFile(row: typeof uploadedFilesTable.$inferSelect) {
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
