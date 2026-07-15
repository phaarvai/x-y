# EPIC 14 — Admin Console & Operations

## Overview

Secure administration portal for X!Y (The Explorer Factory) with RBAC across:

| Role | Focus |
|------|--------|
| Super Admin | Full access (`*:*`), role assignment |
| Operations Admin | Users, listings, categories, reviews, verifications |
| Finance Admin | Transactions, CSV export, payment updates |
| Support Admin | Support cases, disputes |

Legacy `primaryRole = PLATFORM_ADMIN` is treated as Super Admin for backward compatibility.

## Database

Migration: `lib/db/migrations/0014_epic14_admin.sql`

Tables:

- `admin_roles`, `admin_permissions`, `admin_role_permissions`
- `user_role_assignments`
- `listing_moderations`
- `categories`
- `support_cases`
- `user_login_history`

Extended `users` columns (additive): `status`, `identity_verification_status`, `industry`, `location`, `suspended_at`, `suspended_reason`

## Key APIs

### Auth & RBAC
- `POST /api/admin/login` — rate-limited (10 / 15min / IP), 8h session
- `POST /api/admin/logout`
- `GET /api/admin/me`
- `GET /api/admin/roles`
- `POST /api/admin/users/:id/roles` — Super Admin only
- `DELETE /api/admin/users/:id/roles/:roleId` — Super Admin only

### Users
- `GET /api/admin/users` — filters: name, email, role, status, industry, location, verification, date range
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id/status`
- `PATCH /api/admin/users/:id/verification`
- `GET /api/admin/users/:id/activity`

### Listings
- `GET /api/admin/listings`
- `GET /api/admin/listings/:id`
- `PATCH /api/admin/listings/:id/approve|reject|request-changes`
- Reject / changes requested require a reason; approvals publish searchable listings

### Categories
- `GET|POST /api/admin/categories`
- `PUT /api/admin/categories/:id`
- `PATCH .../archive|restore`
- Soft delete via archive (history preserved)
- Public `GET /categories` returns ACTIVE only

### Transactions
- Existing admin transaction routes now enforce Finance-scoped permissions via RBAC
- `GET /api/admin/transactions/export` — CSV
- `PATCH /api/admin/transactions/:id` — Finance Admin / Super Admin

### Support & Disputes
- `GET|POST /api/admin/support`
- `GET /api/admin/disputes`, `PATCH .../assign|status|close`
- Dispute resolve/close: Support Admin or Super Admin only

### Dashboard & Search
- `GET /api/admin/dashboard`
- `GET /api/admin/search?q=`

## Frontend

Route base: `/admin`

- `/admin/login` — dedicated login
- `/admin` — dashboard widgets + quick actions
- `/admin/users`, `/admin/users/[id]`
- `/admin/listings`, `/admin/categories`
- `/admin/transactions`, `/admin/support`, `/admin/disputes`
- `/admin/reviews`, `/admin/verifications` (existing, now under AdminShell)
- `/admin/unauthorized`

`AdminShell` provides permission-gated nav, global search, logout, and session idle timeout (30m idle / 8h max).

## Security

- All admin APIs require authenticated admin context
- Module:action permission checks (`users:suspend`, `transactions:export`, etc.)
- Only Super Admin may assign/remove admin roles (prevents privilege escalation)
- Suspended users cannot authenticate
- HTML escaped on admin-entered notes/reasons
- Admin login rate-limited
- Audit log for all admin actions
- Notifications emitted for suspend/activate, verification reset, listing moderation, transaction updates, support/dispute assignment, role assignment

## Indexes

Migration adds indexes on `userId`, `status`, `listingType`, `categoryType`, `assignedAdmin`, `bookingId`, etc. Transaction date indexes already exist from EPIC 11.

## Compatibility

- Non-admin marketplace/legal/payment APIs unchanged
- `PLATFORM_ADMIN` continues to work without `user_role_assignments`
- Additive schema only — no destructive migrations
