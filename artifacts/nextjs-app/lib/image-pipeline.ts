/**
 * Image optimization pipeline (NFR).
 * Optionally uses `sharp` when installed; otherwise registers passthrough metadata.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { fileDerivativesTable, uploadedFilesTable } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { enqueueJob } from "@/lib/jobs";

export async function queueImageProcessing(fileId: number) {
  return enqueueJob("PROCESS_IMAGE", { fileId }, { idempotencyKey: `PROCESS_IMAGE:${fileId}` });
}

export async function processUploadedImage(fileId: number) {
  const [file] = await db.select().from(uploadedFilesTable).where(eq(uploadedFilesTable.id, fileId)).limit(1);
  if (!file || file.deletedAt) return null;
  if (!file.mimeType.startsWith("image/")) return null;

  const [existing] = await db
    .select()
    .from(fileDerivativesTable)
    .where(and(eq(fileDerivativesTable.fileId, fileId), eq(fileDerivativesTable.kind, "THUMBNAIL")))
    .limit(1);
  if (existing) return existing;

  let sharpFn: null | ((input: string) => {
    rotate: () => { resize: (w: number, h: number, o: object) => { webp: (o: object) => { toFile: (p: string) => Promise<{ size: number; width: number; height: number }> } } };
  }) = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharpMod = await (Function('return import("sharp")')() as Promise<{ default: unknown }>);
    sharpFn = sharpMod.default as typeof sharpFn;
  } catch {
    sharpFn = null;
  }

  const thumbName = `thumb_${file.fileName.replace(/\.[^.]+$/, "")}.webp`;
  const dir = path.dirname(file.storagePath);
  const thumbPath = path.join(dir, thumbName);

  if (sharpFn) {
    await fs.mkdir(dir, { recursive: true });
    const result = await sharpFn(file.storagePath)
      .rotate()
      .resize(480, 480, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(thumbPath);
    const [row] = await db
      .insert(fileDerivativesTable)
      .values({
        fileId,
        kind: "THUMBNAIL",
        storageKey: thumbPath,
        mimeType: "image/webp",
        byteSize: result.size,
        width: result.width,
        height: result.height,
      })
      .returning();
    return row;
  }

  const [row] = await db
    .insert(fileDerivativesTable)
    .values({
      fileId,
      kind: "THUMBNAIL",
      storageKey: file.storagePath,
      mimeType: file.mimeType,
      byteSize: file.size,
    })
    .returning();
  return row;
}
