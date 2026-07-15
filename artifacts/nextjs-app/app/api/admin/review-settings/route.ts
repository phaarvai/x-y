import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { platformReviewSettingsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser, isAuthUser, isAdmin } from "@/lib/legal-auth";
import { getReviewSettings } from "@/lib/reviews";

const reviewSettingsBody = z.object({
  moderationEnabled: z.boolean().optional(),
  maxCommentLength: z.number().int().min(100).max(5000).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const settings = await getReviewSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const parsed = reviewSettingsBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const settings = await getReviewSettings();
    const [updated] = await db
      .update(platformReviewSettingsTable)
      .set({
        ...(parsed.data.moderationEnabled != null
          ? { moderationEnabled: parsed.data.moderationEnabled }
          : {}),
        ...(parsed.data.maxCommentLength != null
          ? { maxCommentLength: parsed.data.maxCommentLength }
          : {}),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(platformReviewSettingsTable.id, settings.id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
