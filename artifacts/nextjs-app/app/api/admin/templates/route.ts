import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { listingTemplatesTable } from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction } from "@/lib/admin-rbac";
import { escapeHtml, createNotification } from "@/lib/legal-auth";
import { ensureHelpSeed } from "@/lib/help-seed";
import { serializeTemplate } from "@/lib/help-api-utils";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "content", "read");
    if (!isAdminContext(admin)) return admin;
    await ensureHelpSeed();
    const rows = await db.select().from(listingTemplatesTable).orderBy(desc(listingTemplatesTable.updatedAt));
    return NextResponse.json({ items: rows.map(serializeTemplate) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const createBody = z.object({
  name: z.string().min(2).max(255),
  industry: z.string().max(128).optional(),
  category: z.string().min(2).max(128),
  description: z.string().max(5000).optional(),
  templateData: z.record(z.string(), z.unknown()),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "content", "write");
    if (!isAdminContext(admin)) return admin;

    const parsed = createBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const [row] = await db
      .insert(listingTemplatesTable)
      .values({
        name: escapeHtml(parsed.data.name),
        industry: parsed.data.industry ?? null,
        category: parsed.data.category,
        description: parsed.data.description ? escapeHtml(parsed.data.description) : null,
        templateData: JSON.stringify(parsed.data.templateData),
        status: parsed.data.status ?? "ACTIVE",
        createdBy: admin.id,
        updatedBy: admin.id,
      })
      .returning();
    await logAdminAction(admin, "TEMPLATE_CREATED", "ListingTemplate", row.id, {}, req);
    return NextResponse.json({ ...row, templateData: parsed.data.templateData }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
