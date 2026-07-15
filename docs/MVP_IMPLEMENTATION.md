# X!Y MVP Implementation Guide

## Overview

The MVP delivers the core manufacturer ↔ visionary marketplace loop on top of the existing X!Y platform (EPIC 17 foundation + EPICs 11–16).

## Setup

```bash
pnpm install
cp .env.example .env
# Set DATABASE_URL + SESSION_SECRET

pnpm --filter @workspace/db migrate
pnpm --filter @workspace/db seed
pnpm --filter @workspace/db seed:mvp   # optional demo manufacturer
```

## End-to-end flow

1. **Manufacturer** registers → role `MANUFACTURER` → `/provider-setup` → facility + machinery + publish
2. **Admin** approves listing (`MACHINERY` type) in Admin Console → status `PUBLISHED`
3. **Visionary** registers → `/requirements/new` → publishes requirement
4. **Visionary** searches `/browse` → views `/manufacturer/[facilityId]` → `/booking/[facilityId]/[machineId]`
5. **Visionary** submits request → `/requests/[id]` messaging
6. **Manufacturer** accepts → booking auto-created → notifications sent
7. **Admin** updates payment on `/admin/transactions`
8. **Both parties** leave reviews on `/bookings/[id]`

## New migration

- `0018_mvp_marketplace.sql` — facilities, machinery, availability, request extensions, messages

## Key APIs

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/facilities` | Create/update facility |
| POST | `/api/facilities/:id/machinery` | Add machinery + slots |
| POST | `/api/facilities/:id/publish` | Submit for moderation |
| GET | `/api/marketplace/manufacturers/search` | Keyword search |
| GET | `/api/marketplace/manufacturers/:id` | Listing detail |
| POST | `/api/requirements` | Visionary requirements |
| POST | `/api/requests` | Submit listing request |
| POST | `/api/requests/:id/respond` | Accept/decline |
| GET/POST | `/api/requests/:id/messages` | Request messaging |
| GET | `/api/notifications` | In-app notifications |
| PATCH | `/api/auth/me` | Profile completion |

## Backward compatibility

- Mock manufacturers (`lib/manufacturers.ts`) still power browse/detail when no DB listings exist
- All existing EPIC 10–16 APIs unchanged
- Bookings legal/payments/reviews/admin flows preserved

## Tests

```bash
node --experimental-strip-types artifacts/nextjs-app/lib/mvp-marketplace.test.ts
pnpm run test:unit
```
