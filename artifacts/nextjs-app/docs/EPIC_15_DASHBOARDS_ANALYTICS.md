# EPIC 15: Dashboards & Analytics

Role-based user dashboards, admin analytics console, and search event tracking for the X!Y platform.

## Overview

EPIC 15 adds:

- **User dashboards** for manufacturers, visionaries, and service providers
- **Admin analytics** with date-range filtering and CSV/Excel export
- **Search analytics** via `POST /api/analytics/search-events`
- **Two-tier caching** (in-memory + `dashboard_metric_cache` table)

Database changes live in migration `lib/db/migrations/0015_epic15_analytics.sql`.

## Roles & Access

| Role | Dashboard route | API prefix |
|------|-----------------|------------|
| `MANUFACTURER` | `/dashboard/manufacturer` | `/api/dashboard/manufacturer` |
| `VISIONARY` | `/dashboard/visionary` | `/api/dashboard/visionary` |
| Service provider roles* | `/dashboard/provider` | `/api/dashboard/service-provider` |
| Other authenticated users | `/dashboard` → `/dashboard/payments` | — |
| Admin (`dashboard:read`) | `/admin/analytics` | `/api/admin/analytics/*` |

\* Service provider roles: `VENDOR`, `LABOR_SUPPLIER`, `LOGISTICS_PROVIDER`, `INVESTOR`, `MARKET_LEAD`, and legal/finance provider roles (see `SERVICE_PROVIDER_ROLES` in `lib/analytics-utils.ts`).

Role helpers: `isManufacturerRole`, `isVisionaryRole`, `isServiceProviderRole`.

## User Dashboard APIs

All user routes require `Authorization: Bearer <token>` and return `403` if the user's `primaryRole` does not match.

| Method | Path | Service method |
|--------|------|----------------|
| GET | `/api/dashboard/manufacturer` | `getManufacturerDashboard` |
| GET | `/api/dashboard/manufacturer/revenue` | `getManufacturerRevenue` |
| GET | `/api/dashboard/manufacturer/activity` | `getManufacturerActivity` |
| GET | `/api/dashboard/visionary` | `getVisionaryDashboard` |
| GET | `/api/dashboard/visionary/activity` | `getVisionaryActivity` |
| GET | `/api/dashboard/visionary/recommendations` | `getVisionaryRecommendations` |
| GET | `/api/dashboard/service-provider` | `getServiceProviderDashboard` |
| GET | `/api/dashboard/service-provider/activity` | `getServiceProviderActivity` |

Main dashboard loads (`manufacturer`, `visionary`, `service-provider`) call `logDashboardAccess` and write an audit log with action `DASHBOARD_ACCESS`.

## Admin Analytics APIs

Require `requireAdmin(req, "dashboard", "read")`. Date-range query params: `range`, `from`, `to` (see `parseDateRange`).

| Method | Path | Service method |
|--------|------|----------------|
| GET | `/api/admin/analytics/overview` | `getAdminOverview` |
| GET | `/api/admin/analytics/users` | `getAdminUsers` |
| GET | `/api/admin/analytics/bookings` | `getAdminBookings` |
| GET | `/api/admin/analytics/revenue` | `getAdminRevenue` |
| GET | `/api/admin/analytics/search` | `getAdminSearch` |
| GET | `/api/admin/analytics/categories` | `getAdminCategories` |
| GET | `/api/admin/analytics/regions` | `getAdminRegions` |
| GET | `/api/admin/analytics/reviews` | `getAdminReviews` |
| GET | `/api/admin/analytics/export` | CSV/Excel export |

### Export

`GET /api/admin/analytics/export?report=revenue|users|bookings|search&format=csv|excel&range=LAST_30_DAYS`

- Uses `rowsToCsv` from `lib/analytics-utils.ts`
- Excel format is UTF-8 BOM CSV with Excel MIME type (no extra dependency)
- Logs `ANALYTICS_EXPORT` via `logAdminAction`

### Date range presets

`TODAY`, `LAST_7_DAYS`, `LAST_30_DAYS` (default), `LAST_90_DAYS`, `THIS_MONTH`, `LAST_MONTH`, `THIS_YEAR`, `CUSTOM` (with `from` / `to` ISO dates).

## Search Events

`POST /api/analytics/search-events`

Optional auth. Body fields: `query`, `category`, `region`, `city`, `state`, `country`, `resultCount`, `source`. Persists to `search_analytics_events` when `query` or `category` is present.

## Migration 0015

`lib/db/migrations/0015_epic15_analytics.sql` creates:

- `manufacturing_requests` — visionary requirements
- `user_favorites` — saved manufacturers/listings
- `search_analytics_events` — search tracking
- `entity_views` — listing/profile view counts
- `dashboard_metric_cache` — persisted metric cache

Also adds performance indexes on `bookings`, `transactions`, `users`, and `feedback`.

## Caching

`AnalyticsService` uses a 60-second TTL (`CACHE_TTL_MS`):

1. **Memory cache** — `getMemoryCache` / `setMemoryCache` in `lib/analytics-utils.ts`
2. **DB cache** — `dashboard_metric_cache` keyed by scope (`GLOBAL` or per-user)

Cache keys examples:

- `mfg-dash:{userId}`
- `vis-dash:{userId}`
- `sp-dash:{userId}:{role}`
- `admin-overview:{preset}:{from}:{to}`

User-scoped caches include `userId` in the DB row. Expired rows are ignored on read.

## Frontend

### User dashboards

- `/dashboard` — role router
- `/dashboard/manufacturer`, `/dashboard/visionary`, `/dashboard/provider`
- Shared widgets in `components/dashboard/`: `StatCard`, `RevenueCards`, `ActivityTimeline`, `QuickActions`, `DashboardShell`, `DateRangeFilter`

### Admin

- `/admin/analytics` — tabbed analytics (overview, users, revenue, search, regions, reviews)
- Nav link in `AdminShell` gated by `dashboard:read`
- Navbar adds **Dashboard** → `/dashboard` for authenticated users

## Tests

```bash
npx tsx artifacts/nextjs-app/lib/analytics-utils.test.ts
```

Covers `parseDateRange` presets and role helpers.

## Express parity

The Express API server mirrors these routes under `/api/dashboard/*` and `/api/admin/analytics/*` in `artifacts/api-server/src/routes/dashboards.ts`. Next.js routes are thin wrappers around the same `AnalyticsService`.
