import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { requireUser, isAuthUser } from "@/lib/legal-auth";
import { getOwnedFile } from "@/lib/file-storage";

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

  const root = process.env.STORAGE_LOCAL_PATH ?? path.join(process.cwd(), "uploads");
  try {
    const buf = await fs.readFile(path.resolve(root, row.storagePath));
    return new NextResponse(buf, {
      headers: {
        "Content-Type": row.mimeType,
        "Content-Disposition": `inline; filename="${row.originalName.replace(/"/g, "")}"`,
        "Content-Length": String(buf.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }
}
