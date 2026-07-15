import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  listingModerationsTable,
  vendorMaterialsTable,
  laborListingsTable,
  logisticsServicesTable,
  marketOpportunitiesTable,
  advertisementsTable,
  legalServiceProvidersTable,
  machineryInventoryTable,
  manufacturingFacilitiesTable,
} from "@/lib/schema";
import { requireAdmin, isAdminContext, logAdminAction } from "@/lib/admin-rbac";
import { createNotification, escapeHtml } from "@/lib/legal-auth";

type Ctx = { params: Promise<{ id: string }> };
export type ModerationAction = "approve" | "reject" | "request-changes";

async function syncPublish(listingType: string, listingId: number, status: string) {
  const published = status === "APPROVED";
  try {
    if (listingType === "VENDOR") {
      await db
        .update(vendorMaterialsTable)
        .set({ isPublished: published, updatedAt: new Date() })
        .where(eq(vendorMaterialsTable.id, listingId));
    } else if (listingType === "LABOR") {
      await db
        .update(laborListingsTable)
        .set({ isPublished: published, updatedAt: new Date() })
        .where(eq(laborListingsTable.id, listingId));
    } else if (listingType === "LOGISTICS") {
      await db
        .update(logisticsServicesTable)
        .set({ isPublished: published, updatedAt: new Date() })
        .where(eq(logisticsServicesTable.id, listingId));
    } else if (listingType === "MARKET_OPPORTUNITY") {
      const patch: { moderationStatus: string; status?: string; updatedAt: Date } = {
        moderationStatus: status === "CHANGES_REQUESTED" ? "CHANGES_REQUESTED" : status,
        updatedAt: new Date(),
      };
      if (published) patch.status = "ACTIVE";
      else if (status === "REJECTED" || status === "CHANGES_REQUESTED") patch.status = "DRAFT";
      await db.update(marketOpportunitiesTable).set(patch).where(eq(marketOpportunitiesTable.id, listingId));
    } else if (listingType === "ADVERTISEMENT") {
      await db
        .update(advertisementsTable)
        .set({
          status: published ? "APPROVED" : status === "REJECTED" ? "REJECTED" : "PENDING",
          updatedAt: new Date(),
        })
        .where(eq(advertisementsTable.id, listingId));
    } else if (listingType === "LEGAL_PROVIDER") {
      await db
        .update(legalServiceProvidersTable)
        .set({ isPublished: published, updatedAt: new Date() })
        .where(eq(legalServiceProvidersTable.id, listingId));
    } else if (listingType === "MACHINERY") {
      const now = new Date();
      const patch = published
        ? { status: "PUBLISHED" as const, publishedAt: now, updatedAt: now }
        : { status: status === "REJECTED" ? "REJECTED" : "DRAFT", updatedAt: now };
      const [machine] = await db
        .update(machineryInventoryTable)
        .set(patch)
        .where(eq(machineryInventoryTable.id, listingId))
        .returning();
      if (published && machine?.facilityId) {
        await db
          .update(manufacturingFacilitiesTable)
          .set({ status: "PUBLISHED", publishedAt: now, updatedAt: now })
          .where(eq(manufacturingFacilitiesTable.id, machine.facilityId));
      }
    }
  } catch (err) {
    console.warn("listing sync", err);
  }
}

export async function moderate(req: NextRequest, ctx: Ctx, action: ModerationAction) {
  const status =
    action === "approve" ? "APPROVED" : action === "reject" ? "REJECTED" : "CHANGES_REQUESTED";
  const perm = action === "approve" ? "approve" : "reject";
  const admin = await requireAdmin(req, "listings", perm);
  if (!isAdminContext(admin)) return admin;

  const id = parseInt((await ctx.params).id, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const requireReason = action !== "approve";
  const body = await req.json().catch(() => ({}));
  const parsed = z
    .object({
      reason: requireReason ? z.string().min(3).max(2000) : z.string().max(2000).optional(),
      internalNotes: z.string().max(5000).optional(),
    })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: requireReason ? "Reason required" : "Invalid input" },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select()
    .from(listingModerationsTable)
    .where(eq(listingModerationsTable.id, id))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reason = parsed.data.reason ? escapeHtml(parsed.data.reason) : undefined;
  const [updated] = await db
    .update(listingModerationsTable)
    .set({
      status,
      reviewReason: reason ?? existing.reviewReason,
      internalNotes: parsed.data.internalNotes
        ? escapeHtml(parsed.data.internalNotes)
        : existing.internalNotes,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(listingModerationsTable.id, id))
    .returning();

  await syncPublish(updated.listingType, updated.listingId, status);
  const event =
    status === "APPROVED"
      ? "LISTING_APPROVED"
      : status === "REJECTED"
        ? "LISTING_REJECTED"
        : "LISTING_CHANGES_REQUESTED";
  await logAdminAction(admin, event, "ListingModeration", id, { reason }, req);
  if (updated.ownerUserId) {
    await createNotification({
      userId: updated.ownerUserId,
      eventType: event,
      title:
        status === "APPROVED"
          ? "Listing approved"
          : status === "REJECTED"
            ? "Listing rejected"
            : "Listing changes requested",
      description: reason || `Your listing is now ${status}.`,
      relatedType: "ListingModeration",
      relatedId: id,
      category: "ADMIN",
    });
  }

  return NextResponse.json({
    ...updated,
    reviewedAt: updated.reviewedAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
