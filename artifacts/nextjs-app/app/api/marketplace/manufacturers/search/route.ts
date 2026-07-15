import { NextRequest, NextResponse } from "next/server";
import { searchManufacturers } from "@/lib/marketplace-service";
import { requireUser, isAuthUser } from "@/lib/legal-auth";
import { checkRateLimit, RATE_LIMITS, clientIpFromHeaders } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/api-errors";

export async function GET(req: NextRequest) {
  try {
    const ip = clientIpFromHeaders(req.headers);
    const rl = checkRateLimit("search", ip, RATE_LIMITS.search.limit, RATE_LIMITS.search.windowMs);
    if (!rl.allowed) return rateLimited(rl.resetAt, rl.limit, rl.remaining);

    const sp = req.nextUrl.searchParams;
    let viewerId: number | undefined;
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const user = await requireUser(req);
      if (isAuthUser(user)) viewerId = user.id;
    }

    const started = Date.now();
    const result = await searchManufacturers(
      {
        q: sp.get("q") ?? undefined,
        machineType: sp.get("machineType") ?? undefined,
        industry: sp.get("industry") ?? undefined,
        city: sp.get("city") ?? undefined,
        country: sp.get("country") ?? undefined,
        minPrice: sp.get("minPrice") ? Number(sp.get("minPrice")) : undefined,
        maxPrice: sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined,
        page: sp.get("page") ? Number(sp.get("page")) : 1,
        pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 20,
      },
      viewerId,
    );
    const durationMs = Date.now() - started;
    return NextResponse.json(result, {
      headers: {
        "X-Response-Time-Ms": String(durationMs),
        "Server-Timing": `search;dur=${durationMs}`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
