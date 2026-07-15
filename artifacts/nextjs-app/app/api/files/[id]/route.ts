import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  isAuthUser,
  writeAuditLog,
  clientIp,
} from "@/lib/legal-auth";
import { getOwnedFile, softDeleteFile, serializeFile } from "@/lib/file-storage";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const user = await requireUser(req);
  if (!isAuthUser(user)) return user;
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const row = await getOwnedFile(id, user);
  if (row === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    file: serializeFile(row),
    downloadUrl: `/api/files/${row.id}/content`,
    expiresAt: null,
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const user = await requireUser(req);
  if (!isAuthUser(user)) return user;
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const result = await softDeleteFile(id, user);
  if (result === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await writeAuditLog({
    actorUserId: user.id,
    action: "FILE_DELETE",
    entityType: "UploadedFile",
    entityId: id,
    ipAddress: clientIp(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
