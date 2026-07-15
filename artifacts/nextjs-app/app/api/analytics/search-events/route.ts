import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AnalyticsService } from "@/lib/analytics-service";
import { requireUser, isAuthUser } from "@/lib/legal-auth";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization");
    let userId: number | null = null;
    if (token) {
      const user = await requireUser(req);
      if (!isAuthUser(user)) return user;
      userId = user.id;
    }

    const body = await req.json().catch(() => ({}));
    const parsed = z
      .object({
        query: z.string().max(500).optional(),
        category: z.string().max(128).optional(),
        region: z.string().max(128).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(100).optional(),
        country: z.string().max(100).optional(),
        resultCount: z.number().int().min(0).max(100000).optional(),
        source: z.string().max(64).optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await AnalyticsService.recordSearchEvent({
      userId,
      ...parsed.data,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
