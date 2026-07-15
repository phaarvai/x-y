import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/lib/analytics-service";
import { requireAdmin, isAdminContext } from "@/lib/admin-rbac";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, "dashboard", "read");
    if (!isAdminContext(admin)) return admin;
    const data = await AnalyticsService.getAdminCategories();
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
