import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serviceProviderProfilesTable,
  vendorMaterialsTable,
  laborListingsTable,
  logisticsServicesTable,
  marketOpportunitiesTable,
} from "@/lib/schema";
import { and, eq, ilike, or } from "drizzle-orm";
import { serProvider, serMaterial, serLabor, serLog, serOpportunity } from "@/lib/marketplace-owned";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = String(searchParams.get("type") || "all");
    const q = searchParams.get("q") || undefined;
    const location = searchParams.get("location") || undefined;
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));

    const result: Record<string, unknown> = {};

    if (type === "all" || type === "providers") {
      const conditions = [eq(serviceProviderProfilesTable.isPublished, true)];
      if (q) {
        conditions.push(
          or(
            ilike(serviceProviderProfilesTable.displayName, `%${q}%`),
            ilike(serviceProviderProfilesTable.companyName, `%${q}%`),
          )!,
        );
      }
      if (location) {
        conditions.push(
          or(
            ilike(serviceProviderProfilesTable.city, `%${location}%`),
            ilike(serviceProviderProfilesTable.country, `%${location}%`),
          )!,
        );
      }
      result.providers = (
        await db
          .select()
          .from(serviceProviderProfilesTable)
          .where(and(...conditions))
          .limit(limit)
      ).map(serProvider);
    }

    if (type === "all" || type === "materials") {
      const conditions = [eq(vendorMaterialsTable.isPublished, true)];
      if (q) conditions.push(ilike(vendorMaterialsTable.materialName, `%${q}%`));
      if (location) conditions.push(ilike(vendorMaterialsTable.location, `%${location}%`));
      result.materials = (
        await db.select().from(vendorMaterialsTable).where(and(...conditions)).limit(limit)
      ).map(serMaterial);
    }

    if (type === "all" || type === "labor") {
      const conditions = [eq(laborListingsTable.isPublished, true)];
      if (q) conditions.push(ilike(laborListingsTable.skillCategory, `%${q}%`));
      if (location) conditions.push(ilike(laborListingsTable.city, `%${location}%`));
      result.labor = (
        await db.select().from(laborListingsTable).where(and(...conditions)).limit(limit)
      ).map(serLabor);
    }

    if (type === "all" || type === "logistics") {
      const conditions = [eq(logisticsServicesTable.isPublished, true)];
      if (q) conditions.push(ilike(logisticsServicesTable.description, `%${q}%`));
      if (location) conditions.push(ilike(logisticsServicesTable.coverageAreas, `%${location}%`));
      result.logistics = (
        await db.select().from(logisticsServicesTable).where(and(...conditions)).limit(limit)
      ).map(serLog);
    }

    if (type === "all" || type === "opportunities") {
      const conditions = [
        eq(marketOpportunitiesTable.status, "PUBLISHED"),
        eq(marketOpportunitiesTable.moderationStatus, "APPROVED"),
      ];
      if (q) conditions.push(ilike(marketOpportunitiesTable.title, `%${q}%`));
      if (location) conditions.push(ilike(marketOpportunitiesTable.geography, `%${location}%`));
      result.opportunities = (
        await db.select().from(marketOpportunitiesTable).where(and(...conditions)).limit(limit)
      ).map(serOpportunity);
    }

    return NextResponse.json({ query: { type, q, location }, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
