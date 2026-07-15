import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/lib/analytics-service";
import { parseDateRange } from "@/lib/analytics-utils";
import { requireAdmin, isAdminContext } from "@/lib/admin-rbac";

function rangeFromQuery(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return parseDateRange({
    range: sp.get("range"),
    from: sp.get("from"),
    to: sp.get("to"),
  });
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "dashboard", "read");
    if (!isAdminContext(admin)) return admin;
    const data = await AnalyticsService.getAdminRevenue(rangeFromQuery(req));
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
