import { Router } from "express";
import { z } from "zod";
import { requireUser, writeAuditLog, clientIp } from "../lib/auth";
import { config } from "../config/env";
import {
  uploadFile,
  getFileForUser,
  deleteFileForUser,
  createDownloadUrl,
  serializeUploadedFile,
} from "../lib/storage/file-service";
import { incrementMetric, startSpan } from "../lib/observability";
import { AppError } from "../middlewares/error-handler";

const router = Router();

const metaSchema = z.object({
  entityType: z.string().max(64).optional(),
  entityId: z.coerce.number().int().positive().optional(),
  isPublic: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === true || v === "true"),
  checksum: z.string().max(128).optional(),
});

function parseMultipart(req: {
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}): { buffer: Buffer; originalName: string; mimeType: string; fields: Record<string, string> } {
  // Prefer pre-parsed multer-like shape if present
  const anyReq = req as {
    file?: { buffer: Buffer; originalname: string; mimetype: string };
    body?: Record<string, string>;
  };
  if (anyReq.file?.buffer) {
    return {
      buffer: anyReq.file.buffer,
      originalName: anyReq.file.originalname,
      mimeType: anyReq.file.mimetype,
      fields: anyReq.body ?? {},
    };
  }

  // Base64 JSON fallback: { fileBase64, fileName, mimeType, ... }
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (typeof body.fileBase64 === "string" && typeof body.fileName === "string") {
    const buffer = Buffer.from(body.fileBase64, "base64");
    return {
      buffer,
      originalName: body.fileName,
      mimeType: typeof body.mimeType === "string" ? body.mimeType : "application/octet-stream",
      fields: {
        entityType: typeof body.entityType === "string" ? body.entityType : "",
        entityId: body.entityId != null ? String(body.entityId) : "",
        isPublic: body.isPublic != null ? String(body.isPublic) : "",
        checksum: typeof body.checksum === "string" ? body.checksum : "",
      },
    };
  }

  throw new AppError(
    400,
    "Expected multipart file or JSON { fileBase64, fileName, mimeType }",
    "INVALID_UPLOAD",
  );
}

async function handleUpload(req: Parameters<typeof requireUser>[0], res: Parameters<typeof requireUser>[1]) {
  if (!config.featureFlags.fileUploads) {
    return res.status(503).json({ error: "File uploads disabled", code: "FEATURE_DISABLED" });
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const span = startSpan("files.upload");
  try {
    const parsed = parseMultipart(req);
    const meta = metaSchema.safeParse({
      entityType: parsed.fields.entityType || undefined,
      entityId: parsed.fields.entityId || undefined,
      isPublic: parsed.fields.isPublic || undefined,
      checksum: parsed.fields.checksum || undefined,
    });
    if (!meta.success) {
      return res.status(400).json({ error: "Invalid metadata", details: meta.error.flatten() });
    }

    const row = await uploadFile({
      owner: user,
      buffer: parsed.buffer,
      originalName: parsed.originalName,
      mimeType: parsed.mimeType,
      entityType: meta.data.entityType,
      entityId: meta.data.entityId,
      isPublic: meta.data.isPublic,
      expectedChecksum: meta.data.checksum,
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "FILE_UPLOAD",
      entityType: "UploadedFile",
      entityId: row.id,
      newValue: { fileName: row.fileName, mimeType: row.mimeType, size: row.size },
      ipAddress: clientIp(req),
      userAgent: req.headers["user-agent"],
    });

    incrementMetric("files.uploaded");
    span.end("ok");
    return res.status(201).json({ file: serializeUploadedFile(row) });
  } catch (err) {
    span.end("error");
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code, details: err.details });
    }
    throw err;
  }
}

router.post("/files/upload", handleUpload);
router.post("/upload", handleUpload); // alias under /api/v1/files/upload when mounted

router.get("/files/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const download = await createDownloadUrl(id, user);
    return res.json({
      file: serializeUploadedFile(download.file),
      downloadUrl: download.url,
      expiresAt: download.expiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

router.get("/files/:id/content", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const row = await getFileForUser(id, user);
    const { getStorageProvider } = await import("../lib/storage/providers");
    const buf = await getStorageProvider().getObject(row.storagePath);
    res.setHeader("Content-Type", row.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${row.originalName.replace(/"/g, "")}"`);
    res.setHeader("Content-Length", String(buf.length));
    return res.send(buf);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

router.delete("/files/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    await deleteFileForUser(id, user);
    await writeAuditLog({
      actorUserId: user.id,
      action: "FILE_DELETE",
      entityType: "UploadedFile",
      entityId: id,
      ipAddress: clientIp(req),
      userAgent: req.headers["user-agent"],
    });
    incrementMetric("files.deleted");
    return res.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    throw err;
  }
});

export default router;
