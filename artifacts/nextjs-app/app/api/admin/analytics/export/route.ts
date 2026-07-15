import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/lib/analytics-service";
import { parseDateRange, rowsToCsv } from "@/lib/analytics-utils";
import { requireAdmin, isAdminContext, logAdminAction } from "@/lib/admin-rbac";

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

    const sp = req.nextUrl.searchParams;
    const report = sp.get("report") || "revenue";
    const format = (sp.get("format") || "csv").toLowerCase();
    const range = rangeFromQuery(req);

    await logAdminAction(admin, "ANALYTICS_EXPORT", "Analytics", null, { report, format }, req);

    let headers: string[] = [];
    let rows: unknown[][] = [];

    if (report === "users") {
      const data = await AnalyticsService.getAdminUsers(range);
      headers = ["Metric", "Value"];
      rows = Object.entries(data).flatMap(([k, v]) => {
        if (typeof v === "object" && v) {
          return Object.entries(v as Record<string, number>).map(([rk, rv]) => [`usersByRole.${rk}`, rv]);
        }
        return [[k, v]];
      });
    } else if (report === "bookings") {
      const data = await AnalyticsService.getAdminBookings(range);
      headers = ["Metric", "Value"];
      rows = [
        ["totalBookings", data.totalBookings],
        ["completedBookings", data.completedBookings],
        ["cancelledBookings", data.cancelledBookings],
        ["activeProductionJobs", data.activeProductionJobs],
        ["requestAcceptanceRate", data.requests.acceptanceRate],
      ];
    } else if (report === "search") {
      const data = await AnalyticsService.getAdminSearch(range);
      headers = ["Keyword", "Count"];
      rows = data.mostSearchedKeywords.map((k) => [k.query, k.count]);
    } else {
      const data = await AnalyticsService.getAdminRevenue(range);
      headers = ["Metric", "Value"];
      rows = Object.entries(data)
        .filter(([k]) => k !== "range")
        .map(([k, v]) => [k, v]);
    }

    if (format === "xlsx" || format === "excel") {
      const csv = "\uFEFF" + rowsToCsv(headers, rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="analytics-${report}.xls"`,
        },
      });
    }

    const csv = rowsToCsv(headers, rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="analytics-${report}.csv"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
