import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { investorProfilesTable, serviceProviderProfilesTable } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { parsePageLimit } from "@/lib/marketplace-helpers";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = parsePageLimit(searchParams);

    const rows = await db
      .select({
        investor: investorProfilesTable,
        provider: serviceProviderProfilesTable,
      })
      .from(investorProfilesTable)
      .innerJoin(
        serviceProviderProfilesTable,
        eq(investorProfilesTable.providerId, serviceProviderProfilesTable.id),
      )
      .where(eq(serviceProviderProfilesTable.isPublished, true))
      .orderBy(desc(investorProfilesTable.updatedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.investor.id,
        providerId: r.provider.id,
        displayName: r.provider.displayName,
        companyName: r.provider.companyName,
        city: r.provider.city,
        country: r.provider.country,
        verificationStatus: r.provider.verificationStatus,
        rating: r.provider.rating,
        investmentInterests: r.investor.investmentInterests,
        preferredIndustries: r.investor.preferredIndustries,
        ticketSizeMinimum: r.investor.ticketSizeMinimum,
        ticketSizeMaximum: r.investor.ticketSizeMaximum,
        preferredGeographies: r.investor.preferredGeographies,
        investmentStages: r.investor.investmentStages,
        portfolioWebsite: r.investor.portfolioWebsite,
        bio: r.investor.bio,
      })),
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
