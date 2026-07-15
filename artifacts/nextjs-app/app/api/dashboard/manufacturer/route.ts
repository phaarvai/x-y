import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/lib/analytics-service";
import { isManufacturerRole } from "@/lib/analytics-utils";
import { requireUser, isAuthUser, clientIp } from "@/lib/legal-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!isAuthUser(user)) return user;
    if (!isManufacturerRole(user.primaryRole)) {
      return NextResponse.json({ error: "Manufacturer access only" }, { status: 403 });
    }
    await AnalyticsService.logDashboardAccess(user.id, "manufacturer", clientIp(req));
    const data = await AnalyticsService.getManufacturerDashboard(user.id);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
