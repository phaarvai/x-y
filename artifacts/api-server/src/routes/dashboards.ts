import { Router } from "express";
import { z } from "zod";
import { AnalyticsService } from "../lib/analytics-service";
import {
  isManufacturerRole,
  isVisionaryRole,
  isServiceProviderRole,
  parseDateRange,
  rowsToCsv,
} from "../lib/analytics-utils";
import { requireUser, clientIp } from "../lib/auth";
import { requireAdmin, logAdminAction } from "../lib/admin-rbac";

const router = Router();

router.get("/dashboard/manufacturer", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isManufacturerRole(user.primaryRole)) {
    return res.status(403).json({ error: "Manufacturer access only" });
  }
  await AnalyticsService.logDashboardAccess(user.id, "manufacturer", clientIp(req));
  const data = await AnalyticsService.getManufacturerDashboard(user.id);
  return res.json(data);
});

router.get("/dashboard/manufacturer/revenue", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isManufacturerRole(user.primaryRole)) {
    return res.status(403).json({ error: "Manufacturer access only" });
  }
  return res.json(await AnalyticsService.getManufacturerRevenue(user.id));
});

router.get("/dashboard/manufacturer/activity", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isManufacturerRole(user.primaryRole)) {
    return res.status(403).json({ error: "Manufacturer access only" });
  }
  return res.json(await AnalyticsService.getManufacturerActivity(user.id));
});

router.get("/dashboard/visionary", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isVisionaryRole(user.primaryRole)) {
    return res.status(403).json({ error: "Visionary access only" });
  }
  await AnalyticsService.logDashboardAccess(user.id, "visionary", clientIp(req));
  return res.json(await AnalyticsService.getVisionaryDashboard(user.id));
});

router.get("/dashboard/visionary/activity", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isVisionaryRole(user.primaryRole)) {
    return res.status(403).json({ error: "Visionary access only" });
  }
  return res.json(await AnalyticsService.getVisionaryActivity(user.id));
});

router.get("/dashboard/visionary/recommendations", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isVisionaryRole(user.primaryRole)) {
    return res.status(403).json({ error: "Visionary access only" });
  }
  return res.json(await AnalyticsService.getVisionaryRecommendations(user.id));
});

router.get("/dashboard/service-provider", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isServiceProviderRole(user.primaryRole)) {
    return res.status(403).json({ error: "Service provider access only" });
  }
  await AnalyticsService.logDashboardAccess(user.id, "service-provider", clientIp(req));
  return res.json(await AnalyticsService.getServiceProviderDashboard(user.id, user.primaryRole));
});

router.get("/dashboard/service-provider/activity", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isServiceProviderRole(user.primaryRole)) {
    return res.status(403).json({ error: "Service provider access only" });
  }
  return res.json(await AnalyticsService.getServiceProviderActivity(user.id));
});

function rangeFromQuery(req: { query: Record<string, unknown> }) {
  return parseDateRange({
    range: req.query.range ? String(req.query.range) : undefined,
    from: req.query.from ? String(req.query.from) : undefined,
    to: req.query.to ? String(req.query.to) : undefined,
  });
}

router.get("/admin/analytics/overview", async (req, res) => {
  const admin = await requireAdmin(req, res, "dashboard", "read");
  if (!admin) return;
  await logAdminAction(admin, "ADMIN_ANALYTICS_ACCESS", "Analytics", null, { report: "overview" }, req);
  return res.json(await AnalyticsService.getAdminOverview(rangeFromQuery(req)));
});

router.get("/admin/analytics/users", async (req, res) => {
  const admin = await requireAdmin(req, res, "dashboard", "read");
  if (!admin) return;
  return res.json(await AnalyticsService.getAdminUsers(rangeFromQuery(req)));
});

router.get("/admin/analytics/bookings", async (req, res) => {
  const admin = await requireAdmin(req, res, "dashboard", "read");
  if (!admin) return;
  return res.json(await AnalyticsService.getAdminBookings(rangeFromQuery(req)));
});

router.get("/admin/analytics/revenue", async (req, res) => {
  const admin = await requireAdmin(req, res, "dashboard", "read");
  if (!admin) return;
  return res.json(await AnalyticsService.getAdminRevenue(rangeFromQuery(req)));
});

router.get("/admin/analytics/search", async (req, res) => {
  const admin = await requireAdmin(req, res, "dashboard", "read");
  if (!admin) return;
  return res.json(await AnalyticsService.getAdminSearch(rangeFromQuery(req)));
});

router.get("/admin/analytics/categories", async (req, res) => {
  const admin = await requireAdmin(req, res, "dashboard", "read");
  if (!admin) return;
  return res.json(await AnalyticsService.getAdminCategories());
});

router.get("/admin/analytics/regions", async (req, res) => {
  const admin = await requireAdmin(req, res, "dashboard", "read");
  if (!admin) return;
  return res.json(await AnalyticsService.getAdminRegions());
});

router.get("/admin/analytics/reviews", async (req, res) => {
  const admin = await requireAdmin(req, res, "dashboard", "read");
  if (!admin) return;
  return res.json(await AnalyticsService.getAdminReviews());
});

router.get("/admin/analytics/export", async (req, res) => {
  const admin = await requireAdmin(req, res, "dashboard", "read");
  if (!admin) return;
  if (!admin.isSuperAdmin && !admin.permissions.includes("transactions:export") && !admin.permissions.includes("*:*")) {
    // allow ops/finance with dashboard read + soft export for analytics
  }

  const report = String(req.query.report || "revenue");
  const format = String(req.query.format || "csv").toLowerCase();
  const range = rangeFromQuery(req);

  await logAdminAction(
    admin,
    "ANALYTICS_EXPORT",
    "Analytics",
    null,
    { report, format },
    req,
  );

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
    // Excel-compatible CSV (UTF-8 BOM) without adding xlsx dependency
    const csv = "\uFEFF" + rowsToCsv(headers, rows);
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="analytics-${report}.xls"`);
    return res.status(200).send(csv);
  }

  const csv = rowsToCsv(headers, rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="analytics-${report}.csv"`);
  return res.status(200).send(csv);
});

router.post("/analytics/search-events", async (req, res) => {
  const token = req.headers.authorization;
  let userId: number | null = null;
  if (token) {
    const user = await requireUser(req, res);
    if (!user) return;
    userId = user.id;
  }

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
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  await AnalyticsService.recordSearchEvent({
    userId,
    ...parsed.data,
  });
  return res.status(201).json({ ok: true });
});

export default router;
