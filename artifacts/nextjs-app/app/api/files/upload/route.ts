import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  isAuthUser,
  writeAuditLog,
  clientIp,
} from "@/lib/legal-auth";
import {
  validateUpload,
  storeLocalFile,
  serializeFile,
} from "@/lib/file-storage";
import { checkRateLimit, RATE_LIMITS, clientIpFromHeaders } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/api-errors";
import { queueImageProcessing } from "@/lib/image-pipeline";

export async function POST(req: NextRequest) {
  if (process.env.FF_FILE_UPLOADS === "false") {
    return NextResponse.json({ error: "File uploads disabled" }, { status: 503 });
  }
  const user = await requireUser(req);
  if (!isAuthUser(user)) return user;

  const ip = clientIpFromHeaders(req.headers);
  const rl = checkRateLimit("fileUpload", `${ip}:${user.id}`, RATE_LIMITS.fileUpload.limit, RATE_LIMITS.fileUpload.windowMs);
  if (!rl.allowed) return rateLimited(rl.resetAt, rl.limit, rl.remaining);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fileBase64 = body.fileBase64;
  const fileName = body.fileName;
  const mimeType = body.mimeType;
  if (typeof fileBase64 !== "string" || typeof fileName !== "string" || typeof mimeType !== "string") {
    return NextResponse.json(
      { error: "Expected { fileBase64, fileName, mimeType }" },
      { status: 400 },
    );
  }

  const isPublic = body.isPublic === true && body.confidential !== true;
  if (body.confidential === true && body.isPublic === true) {
    return NextResponse.json({ error: "Confidential files cannot be public" }, { status: 400 });
  }

  const buffer = Buffer.from(fileBase64, "base64");
  const valid = validateUpload(fileName, mimeType, buffer.length);
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });

  if (typeof body.checksum === "string") {
    const crypto = await import("crypto");
    const actual = crypto.createHash("sha256").update(buffer).digest("hex");
    if (actual !== body.checksum) {
      return NextResponse.json({ error: "Checksum mismatch" }, { status: 400 });
    }
  }

  try {
    const row = await storeLocalFile({
      owner: user,
      buffer,
      originalName: fileName,
      mimeType,
      entityType: typeof body.entityType === "string" ? body.entityType : undefined,
      entityId: typeof body.entityId === "number" ? body.entityId : undefined,
      isPublic,
    });

    if (mimeType.startsWith("image/")) {
      try {
        await queueImageProcessing(row.id);
      } catch { /* non-blocking */ }
    }
    await writeAuditLog({
      actorUserId: user.id,
      action: "FILE_UPLOAD",
      entityType: "UploadedFile",
      entityId: row.id,
      newValue: { fileName: row.fileName, mimeType: row.mimeType, size: row.size },
      ipAddress: clientIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ file: serializeFile(row) }, { status: 201 });
  } catch (err) {
    console.error("file upload", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
