# Persona Workflows Implementation

End-to-end marketplace workflows for Manufacturer, Visionary, Vendor, Labor, Logistics, Investor, and Market Lead personas (building on MVP + EPIC 17).

## Migration

- `lib/db/migrations/0019_persona_workflows.sql` (+ `.down.sql`)
- Factory enrichments (SEZ, hours, images, service areas)
- Multi-tier machinery pricing
- Availability recurrence fields
- `request_offers` counter-offer table
- Confidential requirements + attachment IDs
- `notifications.read_at`

Apply with the existing migrate runner before using new columns.

## APIs (additive)

| Endpoint | Purpose |
|---|---|
| `POST /api/facilities` | Extended MF-001 factory fields |
| `POST /api/facilities/:id/machinery` | Multi-pricing + slot recurrence |
| `PATCH /api/machinery/:id` | Update pricing / specs |
| `GET/POST /api/availability` | Slot CRUD list/upsert |
| `DELETE /api/availability/:id` | Remove slot |
| `GET/POST /api/requests/:id/offers` | Counter-offers |
| `POST /api/offers/:id/respond` | Accept/reject offer (may create booking) |
| `GET/POST /api/favorites` | Saved listings |
| `DELETE /api/favorites/:id` | Remove favorite |
| `GET/PATCH /api/notifications` | List + mark read |
| `POST /api/requirements` | Confidential + resource fields |

Existing EPIC-13 catalog APIs remain the source for `/vendors`, `/labor`, `/logistics`, `/investors`, `/market-opportunities` UI.

## UI routes

- `/marketplace` — persona hub
- `/vendors`, `/labor`, `/logistics`, `/investors`, `/market-opportunities`
- `/requests` (+ `?inbox=manufacturer`) — inbox list
- `/requests/[id]` — accept/decline + counter-offers + messages
- `/availability` — manufacturer slot manager
- `/favorites`, `/notifications`
- `/provider-setup` — enriched factory + multi-pricing
- `/requirements/new` — confidential + resource needs

Navbar links are role-aware; dashboard quick actions point at these routes.

## Notes

- `marketplace-helpers.ts` restored (serializers + `getOwnedProvider` + pagination) for EPIC-13 routes.
- Counter-offer acceptance on listing requests creates a booking (same pattern as accept).
- Favorites use existing `user_favorites` unique constraint; duplicate saves return the existing row.
