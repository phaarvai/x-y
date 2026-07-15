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
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recent] = await db
      .select()
      .from(advertisementEventsTable)
      .where(
        and(
          eq(advertisementEventsTable.advertisementId, id),
          eq(advertisementEventsTable.eventType, "CLICK"),
          eq(advertisementEventsTable.visitorHash, hash),
          gte(advertisementEventsTable.createdAt, since),
        ),
      )
      .limit(1);

    if (recent) {
      return NextResponse.json({
        counted: false,
        reason: "dedup",
        destinationUrl: ad.destinationUrl,
      });
    }

    await db.insert(advertisementEventsTable).values({
      advertisementId: id,
      eventType: "CLICK",
      visitorHash: hash,
    });

    await db
      .update(advertisementAnalyticsTable)
      .set({
        clicks: sql`${advertisementAnalyticsTable.clicks} + 1`,
        ctr: sql`CASE WHEN ${advertisementAnalyticsTable.impressions} > 0
          THEN ROUND(((${advertisementAnalyticsTable.clicks} + 1)::numeric / ${advertisementAnalyticsTable.impressions}) * 100, 4)
          ELSE 0 END`,
        lastClickedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(advertisementAnalyticsTable.advertisementId, id));

    if (ad.remainingCredits > 0) {
      await db
        .update(advertisementsTable)
        .set({
          remainingCredits: sql`GREATEST(${advertisementsTable.remainingCredits} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(advertisementsTable.id, id));
    }

    return NextResponse.json({
      counted: true,
      destinationUrl: ad.destinationUrl,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
