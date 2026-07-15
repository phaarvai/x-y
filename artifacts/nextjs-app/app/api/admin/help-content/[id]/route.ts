import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { helpContentTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction } from "@/lib/admin-rbac";
import { escapeHtml } from "@/lib/legal-auth";
import { serializeHelp } from "@/lib/help-api-utils";

const updateBody = z.object({
  title: z.string().max(255).optional(),
  helpText: z.string().max(10000).optional(),
  tooltipText: z.string().max(500).optional(),
  example: z.string().max(2000).nullable().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req, "content", "write");
    if (!isAdminContext(admin)) return admin;

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = updateBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const patch: Record<string, unknown> = { updatedBy: admin.id, updatedAt: new Date() };
    if (parsed.data.title !== undefined) patch.title = escapeHtml(parsed.data.title);
    if (parsed.data.helpText !== undefined) patch.helpText = escapeHtml(parsed.data.helpText);
    if (parsed.data.tooltipText !== undefined) patch.tooltipText = escapeHtml(parsed.data.tooltipText);
    if (parsed.data.example !== undefined) {
      patch.example = parsed.data.example ? escapeHtml(parsed.data.example) : null;
    }
    if (parsed.data.status) patch.status = parsed.data.status;

    const [row] = await db.update(helpContentTable).set(patch).where(eq(helpContentTable.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await logAdminAction(admin, "HELP_CONTENT_UPDATED", "HelpContent", id, {}, req);
    return NextResponse.json(serializeHelp(row));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
