import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { laborInquiriesTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  requireUser,
  isAuthUser,
  isAdmin,
  createNotification,
  escapeHtml,
} from "@/lib/legal-auth";
import { getOwnedProvider } from "@/lib/marketplace-owned";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    const { id: idStr } = await ctx.params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const responseMessage = String((body as { responseMessage?: string })?.responseMessage || "").slice(0, 2000);
    if (!responseMessage) return NextResponse.json({ error: "responseMessage required" }, { status: 400 });

    const [inq] = await db.select().from(laborInquiriesTable).where(eq(laborInquiriesTable.id, id)).limit(1);
    if (!inq) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const provider = await getOwnedProvider(user.id, "LABOR_SUPPLIER", isAdmin(user), inq.providerId);
    if (!provider && !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [updated] = await db
      .update(laborInquiriesTable)
      .set({
        status: "RESPONDED",
        responseMessage: escapeHtml(responseMessage),
        updatedAt: new Date(),
      })
      .where(eq(laborInquiriesTable.id, id))
      .returning();

    await createNotification({
      userId: inq.inquirerUserId,
      eventType: "INQUIRY_RESPONDED",
      title: "Labor supplier responded",
      description: responseMessage.slice(0, 120),
      relatedType: "LaborInquiry",
      relatedId: id,
      category: "MARKETPLACE",
    });

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
