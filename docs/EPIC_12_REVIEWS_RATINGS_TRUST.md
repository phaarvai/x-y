# EPIC 12 — Reviews, Ratings, Trust & Safety

**Tickets:** XFY-059 … XFY-062  
**Status:** Implemented

## Scope

| Ticket | Feature |
|--------|---------|
| XFY-059 | Feedback model, rating validation, booking-gated reviews |
| XFY-060 | Review submission UI on completed bookings |
| XFY-061 | Ratings on listings, sort/filter/search, rating summaries |
| XFY-062 | Verified badge system + admin queue + history |

Also includes review moderation, report workflow, rating aggregates, notifications, and audit logs.

## Database

Migration: `lib/db/migrations/0012_epic12_reviews_trust.sql`  
Schema: `lib/db/src/schema/reviews.ts`

- `feedback` (unique booking+reviewer)
- `rating_summaries` (facility/user cache)
- `reported_reviews`
- `platform_review_settings` (moderation toggle)
- `verifications` + immutable `verification_history`

## APIs

- `POST/GET /api/bookings/:bookingId/reviews`
- `GET /api/users/:userId/reviews`, `/api/facilities/:facilityId/reviews`
- `GET /api/facilities/:id/rating-summary`, `/api/users/:id/rating-summary`
- `GET /api/reviews` (sort/filter/search/paginate)
- `POST /api/reviews/:id/report`
- Admin: approve/reject/hide/restore, review-reports, review-settings
- Admin/user verifications CRUD + approve/reject/revoke/renew
- `POST /api/bookings/:id/complete` (unlocks review form)

## Frontend

- Booking detail: Mark completed + star rating form
- `/reviews` marketplace reviews browser
- Manufacturer detail: distribution + review cards + verified badge
- Browse cards: rating badge + verification badge
- `/admin/reviews`, `/admin/verifications`

## Business rules

- Only `COMPLETED` bookings; participants only; no self-review; one review per booking
- Ratings 1–5; comments HTML-escaped; rate-limited submissions
- Moderation optional: pending until admin approve when enabled
- Averages recalculated on publish/hide/restore
- Verified badge only for `VERIFIED` and non-expired records; history never deleted
