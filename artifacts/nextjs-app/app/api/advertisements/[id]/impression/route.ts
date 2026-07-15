import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  advertisementAnalyticsTable,
  advertisementEventsTable,
  advertisementsTable,
} from "@/lib/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import crypto from "crypto";
import { clientIp } from "@/lib/legal-auth";

function visitorHash(req: NextRequest, advertisementId: number) {
  const ip = clientIp(req);
  const ua = req.headers.get("user-agent") || "";
  return crypto.createHash("sha256").update(`${advertisementId}:${ip}:${ua}`).digest("hex");
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = parseInt((await ctx.params).id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const [ad] = await db.select().from(advertisementsTable).where(eq(advertisementsTable.id, id)).limit(1);
    if (!ad) return NextResponse.json({ error: "Advertisement not found" }, { status: 404 });
    if (ad.status !== "RUNNING" && ad.status !== "APPROVED") {
      return NextResponse.json({ error: "Advertisement not active" }, { status: 409 });
    }

    const hash = visitorHash(req, id);
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const [recent] = await db
      .select()
      .from(advertisementEventsTable)
      .where(
        and(
          eq(advertisementEventsTable.advertisementId, id),
          eq(advertisementEventsTable.eventType, "IMPRESSION"),
          eq(advertisementEventsTable.visitorHash, hash),
          gte(advertisementEventsTable.createdAt, since),
        ),
      )
      .limit(1);

    if (recent) {
      return NextResponse.json({ counted: false, reason: "dedup" });
    }

    await db.insert(advertisementEventsTable).values({
      advertisementId: id,
      eventType: "IMPRESSION",
      visitorHash: hash,
    });

    await db
      .update(advertisementAnalyticsTable)
      .set({
        impressions: sql`${advertisementAnalyticsTable.impressions} + 1`,
        ctr: sql`CASE WHEN ${advertisementAnalyticsTable.impressions} + 1 > 0
          THEN ROUND((${advertisementAnalyticsTable.clicks}::numeric / (${advertisementAnalyticsTable.impressions} + 1)) * 100, 4)
          ELSE 0 END`,
        lastViewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(advertisementAnalyticsTable.advertisementId, id));

    return NextResponse.json({ counted: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
