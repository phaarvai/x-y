# X!Y — The Explorer Factory

## EPIC 8 — Requests, Offers & Booking Workflow

**Tagline:** *Why own it when you can make it.*

**Document Type:** Software Specification · Epic Definition  
**Epic ID:** EPIC-8  
**Version:** 1.0  
**Last Updated:** July 2026  
**Classification:** PRD · SRS · Technical Design Document · Jira / Azure DevOps Backlog · Confluence · Agile Sprint Planning · Developer Documentation  
**Release Mapping:** Release 1 — MVP Marketplace (critical path)  
**Depends On:** EPIC-1 (Auth) · EPIC-2 (Facility) · EPIC-3 (Machinery) · EPIC-4 (Availability & Reservations) · EPIC-5 (Requirements & Attachments ACL) · EPIC-6 (Listing CTAs) · EPIC-7 (Send-to-selected recommendations)  
**Enables:** Confirmed production engagements, reviews epic, Release 2 payments expansion

---

## Epic Summary

**EPIC 8 — Requests, Offers & Booking Workflow** defines the commercial negotiation spine of **X!Y — The Explorer Factory**. Visionaries submit manufacturing requests against listings (optionally linked to project requirements and reserved capacity). Manufacturers review incoming requests, then **Accept**, **Decline**, or **Counter-Offer**. Negotiations continue through structured offers until an accepted offer is confirmed into a **Booking**, which updates availability, creates a booking record and basic transaction stub, notifies both parties, and records a full audit history.

This epic converts discovery and matching intent into **contracted capacity**—the core marketplace transaction loop.

---

## Business Objective

- Enable structured RFQ → negotiation → booking without offline email sprawl  
- Protect capacity integrity via reservation/booking synchronization (EPIC-4)  
- Reduce ambiguity with offer history, statuses, and audit trails  
- Improve manufacturer responsiveness with an actionable inbox  
- Prepare payment integration via booking + transaction stubs  
- Measure funnel health from request to completed engagement  

---

## User Value

| Audience | Value |
|----------|-------|
| Visionaries | Clear path from listing to confirmed production slot |
| Manufacturers | Organized inbox to accept, decline, or counter with control |
| Admins | Oversight of disputes, overrides, and negotiation health |
| Platform | Completable marketplace loop; trust through auditability |

---

## Scope

EPIC 8 covers manufacturing request model and lifecycle, submit flow from listings, manufacturer inbox, accept/decline, counter-offer negotiation, booking confirmation, booking records, availability updates, notifications hooks, offer/request history, audit trails, and basic transaction placeholders for future payments.

---

## In Scope

- Manufacturing request CRUD/submit lifecycle  
- Status machine including Draft → … → Booked → In Production → Completed / Cancelled / Disputed  
- Manufacturer review inbox with filters  
- Accept / Decline (with reason)  
- Multi-round counter-offers with history  
- Booking confirmation creating Booking + Transaction stub  
- Availability reservation convert/release integration with EPIC-4  
- Notifications (in-app/email hooks)  
- Offer history, request status history, booking history  
- Attachments on requests  

---

## Out of Scope

- Full payment gateway capture, escrow, payouts (Release 2; stub only)  
- Binding digital contracts / e-signatures (future)  
- Multi-party vendor/labor/logistics co-booking workflows  
- Production MES / shop-floor tracking beyond status labels  
- AI-assisted negotiation  
- Review submission UI (post-completion hook only)  

---

## Role Prerequisites

| Role | Capability |
|------|------------|
| `VISIONARY` | Submit/negotiate/confirm booking on own requests |
| `MANUFACTURER` | Review/respond on owned facility listings |
| `PLATFORM_ADMIN` | View all, dispute resolve, status override with audit |

---

# Features Included

## Feature F1 — Manufacturing Requests

### Purpose
Create a durable request linking visionary, facility, machinery, optional project requirement, dates, quantity, budget, and notes.

### Business Value
Standardizes inbound commercial intent for manufacturers.

### User Benefits
One structured ask instead of fragmented messages.

### Functional Requirements
1. Persist Request with listed fields and statuses.  
2. Optional link to `project_requirement_id` and EPIC-4 reservation.  
3. Support attachments and contact preference.  

### Validation Rules
See XFY-038/039; dates, quantity > 0, budget ≥ 0.

### Permissions
Visionary create; parties read; manufacturer respond if owner.

### Error Handling
`400` validation; `403` unauthorized listing target.

### Future Enhancements
Multi-machine package requests.

---

## Feature F2 — Request Lifecycle

### Purpose
Enforce ordered status transitions and visibility.

### Business Value
Operational clarity and funnel analytics.

### User Benefits
Both parties know where the deal stands.

### Functional Requirements
Status machine + `RequestStatusHistory` on every change.

### Validation Rules
No illegal skips; terminal states read-only (except dispute/review).

### Permissions
Transitions role-gated.

### Error Handling
`409` illegal transition.

### Future Enhancements
Customer-defined sub-statuses.

---

## Feature F3 — Manufacturer Review

### Purpose
Inbox for evaluating inbound requests with context.

### Business Value
Faster, higher-quality manufacturer responses.

### User Benefits
Filters and full request context at hand.

### Functional Requirements
List/filter/sort/paginate; open detail with attachments.

### Validation Rules
Only owned-facility requests.

### Permissions
Listing owner manufacturer.

### Error Handling
Empty inbox states.

### Future Enhancements
SLA timers and auto-reminders.

---

## Feature F4 — Accept Requests

### Purpose
Manufacturer accepts terms → path to booking.

### Business Value
Converts demand into reserved commercial agreement.

### User Benefits
Clear yes path with notifications.

### Functional Requirements
Status → Accepted; notify; proceed to booking confirmation gates.

### Validation Rules
Active reservation still valid if used; capacity available.

### Permissions
Manufacturer owner.

### Error Handling
Expired reservation → reselect dates.

### Future Enhancements
Accept with conditions checklist.

---

## Feature F5 — Decline Requests

### Purpose
Manufacturer rejects with reason; release capacity.

### Business Value
Frees inventory; captures learning signals.

### User Benefits
Visionaries get closure and can retarget.

### Functional Requirements
Decline reason; status Declined; release EPIC-4 reservation; history.

### Validation Rules
Reason required.

### Permissions
Manufacturer owner.

### Error Handling
Idempotent decline.

### Future Enhancements
Suggested alternatives on decline.

---

## Feature F6 — Counter-Offer Workflow

### Purpose
Negotiate price, dates, quantity, terms iteratively.

### Business Value
Keeps negotiation on-platform with full history.

### User Benefits
Transparent active offer and timeline.

### Functional Requirements
Create offers; alternate actor turns; accept/reject/counter; history; active flag.

### Validation Rules
Configurable max rounds; one ACTIVE offer.

### Permissions
Parties to the request only.

### Error Handling
Concurrent counters → `409` version conflict.

### Future Enhancements
AI suggested counters.

---

## Feature F7 — Booking Confirmation

### Purpose
Finalize accepted terms into a Booking.

### Business Value
Marketplace transaction completion signal.

### User Benefits
Shared confirmation and booking reference.

### Functional Requirements
Visionary (or policy either-party) confirms; create Booking; update slots Booked; Transaction stub; notify.

### Validation Rules
Must be Accepted or accepted offer; capacity still held/available.

### Permissions
Confirming party per policy (default visionary confirms manufacturer accept).

### Error Handling
Capacity race → `409`.

### Future Enhancements
Escrow payment before confirm.

---

## Feature F8 — Booking Records

### Purpose
Persist confirmed engagements as first-class records.

### Business Value
Ops, finance, disputes, analytics foundation.

### User Benefits
Reference number and detail page for both sides.

### Functional Requirements
Booking entity + history; link request/offer/reservation.

### Validation Rules
1:1 request↔booking for MVP exclusive bookings.

### Permissions
Parties + admin.

### Error Handling
Duplicate booking prevented uniquely.

### Future Enhancements
Milestones and amendments.

---

## Feature F9 — Availability Updates

### Purpose
Keep calendars truthful on reserve/accept/decline/book/cancel.

### Business Value
No double-booking; marketplace trust.

### User Benefits
Dates remain reliable.

### Functional Requirements
Integrate EPIC-4 reserve on submit (optional), convert on book, release on decline/cancel/expire.

### Validation Rules
Atomic with status transitions.

### Permissions
System-enforced.

### Error Handling
Compensating release on failures.

### Future Enhancements
Partial capacity bookings.

---

## Feature F10 — Notifications

### Purpose
Alert parties on submit, accept, decline, counter, booking.

### Business Value
Reduces response latency.

### User Benefits
Don’t miss negotiation turns.

### Functional Requirements
In-app + email hooks; idempotent notification outbox.

### Validation Rules
Template keyed by event.

### Permissions
Recipient scoped.

### Error Handling
Fail-open (workflow continues).

### Future Enhancements
SMS/WhatsApp; digest mode.

---

## Feature F11 — Offer History

### Purpose
Retain all negotiation rounds.

### Business Value
Dispute resolution and learning.

### User Benefits
See how terms evolved.

### Functional Requirements
Immutable offer rows; active pointer on request.

### Validation Rules
Accepted offer immutable.

### Permissions
Parties read.

### Error Handling
N/A.

### Future Enhancements
Diff view UI.

---

## Feature F12 — Audit Trail

### Purpose
Record who changed what and when across request/booking lifecycle.

### Business Value
Compliance, admin overrides, trust.

### User Benefits
Transparency into critical actions.

### Functional Requirements
`RequestStatusHistory`, `OfferHistory`, `BookingHistory` events.

### Validation Rules
Append-only.

### Permissions
Parties limited; admin full.

### Error Handling
Audit write in same transaction as state change when possible.

### Future Enhancements
Exportable compliance packs.

---

# Developer Tickets

---

## Ticket XFY-038

### Ticket ID
`XFY-038`

### Ticket Name
Create Manufacturing Request Model

### Priority
`P0 — Critical`

### Type
`Backend` · `Database` · `Story`

### Story Points
`5`

### Epic
`EPIC-8 — Requests, Offers & Booking Workflow`

### User Story
As a platform engineer, I need a normalized Manufacturing Request model with clear status transitions and relationships so that offers, messages, and bookings can attach cleanly.

### Business Value
Foundational commercial object for the marketplace transaction loop.

### Description
Create/extend Request table with specified fields and statuses. Define relationships to visionary, facility, machinery, project requirement, offers, messages, booking. Deliver schema, constraints, indexes, ER explanation, status transition rules.

### Functional Requirements
1. Persist all listed fields.  
2. Support full status enum.  
3. Enforce FKs and useful indexes.  
4. Document legal transitions.  
5. Optional links: reservation_id, active_offer_id.  

### UI Requirements (if frontend)
N/A — publish state diagram to Confluence.

### Backend Requirements (if backend)
Migration, ORM enums, transition service skeleton, validation helpers.

### Acceptance Criteria
- [ ] Request model with all fields  
- [ ] All statuses available  
- [ ] Relationships documented/implemented  
- [ ] Constraints, indexes, transition rules delivered  

### Validation Rules
- `requested_end_date >= requested_start_date`  
- `quantity > 0` when set  
- `budget >= 0` when set  
- status ∈ enum  

### Permissions
DB migrator / app roles.

### REST API Endpoints
N/A (foundation).

### Request Payload
N/A

### Response Payload
N/A

### Database Tables
`Request` (ManufacturingRequest)

### Database Fields
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| requester_user_id | FK | Visionary |
| facility_id | FK | |
| inventory_id | FK | Machinery |
| project_requirement_id | FK nullable | |
| reservation_id | FK nullable | EPIC-4 |
| active_offer_id | FK nullable | |
| requested_start_date | date/timestamptz | |
| requested_end_date | date/timestamptz | |
| quantity | numeric | |
| quantity_unit | varchar | recommended |
| budget | numeric | |
| currency | varchar(3) | |
| notes | text | |
| contact_preference | varchar | EMAIL/PHONE/IN_APP |
| status | varchar | |
| created_at / updated_at | timestamptz | |

### Entity Relationships
- Visionary 1—* Request  
- Facility 1—* Request  
- MachineryInventory 1—* Request  
- ProjectRequirement 1—* Request  
- Request 1—* Offer  
- Request 1—* Messages  
- Request 0—1 Booking  

### Status Transition Rules (MVP)

| From | To | Actor |
|------|----|-------|
| Draft | Submitted | Visionary |
| Submitted | Manufacturer Review | System/Manufacturer open |
| Manufacturer Review | Accepted | Manufacturer |
| Manufacturer Review | Declined | Manufacturer |
| Manufacturer Review | Counter Offered | Manufacturer |
| Counter Offered | Counter Offered | Either (new offer) |
| Counter Offered | Accepted | Counterparty accepts offer |
| Counter Offered | Declined | Reject terminal negotiation |
| Accepted | Booked | Confirm booking |
| Booked | In Production | Manufacturer/System |
| In Production | Completed | Manufacturer/System |
| *non-terminal* | Cancelled | Party cancel policy |
| *non-terminal / Booked* | Disputed | Party/Admin |
| Disputed | prior/resolved state | Admin resolve |

Illegal skips return `409`.

### Error Handling
Constraint violations mapped at API later.

### Security Considerations
Ownership chain via facility for manufacturer actions.

### Edge Cases
Request without requirement; soft-deleted listing blocked on submit.

### Dependencies
EPIC-2/3/4/5 IDs.

### Testing Checklist
- [ ] Migration  
- [ ] Checks  
- [ ] Transition matrix unit tests  

### Definition of Done
ER + state diagram published; migration merged.

---

## Ticket XFY-039

### Ticket ID
`XFY-039`

### Ticket Name
Submit Manufacturing Request Flow

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`8`

### Epic
`EPIC-8 — Requests, Offers & Booking Workflow`

### User Story
As a visionary, I want to submit a manufacturing request from a listing with dates, quantity, budget, notes, and attachments so that the manufacturer can review my needs.

### Business Value
Creates qualified inbound demand at the point of highest intent.

### Description
Submit flow from listing/detail CTA: requested dates, quantity, budget, product notes, attachments, contact preference. Login required; validate; notify manufacturer; update visionary dashboard; status Submitted; optionally create EPIC-4 reservation.

### Functional Requirements
1. Authenticated submit from listing.  
2. Capture all listed fields + attachments.  
3. Validate before submit.  
4. Notify manufacturer.  
5. Visionary dashboard shows request.  
6. Status = Submitted (then Manufacturer Review).  
7. Optional capacity reserve on submit.  

### UI Requirements (if frontend)

#### UX Flow
```
Listing Detail → Request Booking / Send Inquiry
    ↓
Auth gate if needed
    ↓
Request form (dates, qty, budget, notes, attachments, contact pref)
    ↓
Validate → Submit
    ↓
Success: reference + “Held until …” if reserved
    ↓
Dashboard → My Requests
```

#### States
Loading form; validating; submitting; success; error with field messages; empty attachments OK.

### Backend Requirements (if backend)
POST request; attach files; notification outbox; optional reserve call; status history write.

### Acceptance Criteria
- [ ] Login required  
- [ ] Validation before submission  
- [ ] Manufacturer notified  
- [ ] Visionary dashboard updated  
- [ ] Request status = Submitted  

### Validation Rules
| Field | Rule |
|-------|------|
| dates | required; end ≥ start; within machine min/max duration |
| quantity | required > 0 |
| budget | optional or required by policy; ≥ 0 |
| notes | max length |
| inventoryId/facilityId | published listing owned linkage consistent |

### Permissions
Authenticated Visionary; cannot submit as manufacturer role unless also visionary multi-role.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/requests` | `POST` |
| `/api/requests/{id}` | `GET` |
| `/api/requests/me` | `GET` |
| `/api/requests/{id}/attachments` | `POST` |

### Request Payload
```json
{
  "facilityId": "fac_01H...",
  "inventoryId": "mch_01H...",
  "projectRequirementId": "req_01H...",
  "requestedStartDate": "2026-09-01",
  "requestedEndDate": "2026-09-05",
  "quantity": 200,
  "quantityUnit": "UNITS",
  "budget": 450000,
  "currency": "INR",
  "notes": "Pilot enclosure run; anodize required.",
  "contactPreference": "IN_APP",
  "reserveCapacity": true
}
```

### Response Payload
```json
{
  "request": {
    "id": "mreq_01H...",
    "status": "SUBMITTED",
    "reservationId": "rsv_01H...",
    "reservationExpiresAt": "2026-07-16T08:00:00.000Z"
  }
}
```

### Database Tables
`Request`, `RequestAttachment`, `RequestStatusHistory`

### Database Fields
Per model + attachment metadata.

### Entity Relationships
Listing → Request; optional Requirement; optional Reservation.

### Error Handling
`401` unauthenticated; `409` capacity taken; `400` validation.

### Security Considerations
Auth required; attachment ACL; rate-limit submit; IDOR-safe IDs.

### Edge Cases
Submit without requirement; calendar hidden mode inquiry (no reserve); concurrent submit same slot.

### Dependencies
XFY-038; EPIC-4 reservation; EPIC-3 listing; notifications.

### Testing Checklist
- [ ] Auth gate  
- [ ] Validation  
- [ ] Notify  
- [ ] Dashboard list  
- [ ] Status Submitted  
- [ ] Reserve success/fail  

### Definition of Done
UX accepted; OpenAPI published; notification event verified in staging.

---

## Ticket XFY-040

### Ticket ID
`XFY-040`

### Ticket Name
Manufacturer Request Inbox

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`8`

### Epic
`EPIC-8 — Requests, Offers & Booking Workflow`

### User Story
As a manufacturer, I want an inbox of incoming requests with filters so that I can prioritize and respond efficiently.

### Business Value
Improves response time and acceptance quality—key marketplace KPIs.

### Description
Manufacturer dashboard inbox: incoming requests with status/date/machine/urgency filters. Each item shows visionary summary, requirement summary, dates, quantity, budget, attachments, status. Actions: Accept, Decline, Counter, View Details. Sorting, filtering, pagination.

### Functional Requirements
1. List requests for owned facilities.  
2. Filters: status, date range, machine, urgency.  
3. Display required card fields.  
4. Action entry points.  
5. Sort + paginate.  

### UI Requirements (if frontend)

#### Layout
Table/cards + filter bar; detail drawer/page; urgency badge (e.g., reservation expiring soon).

#### Filters
Status multi-select; date requested/created; inventory select; urgency = expiring reservation / high budget / new.

#### Sorting
Newest, oldest, reservation expiry, budget high-low.

#### States
Empty inbox CTA; loading skeletons; error retry.

### Backend Requirements (if backend)
Inbox query with indexes; filter DTO; pagination; urgency computed field.

### Acceptance Criteria
- [ ] Inbox shows inbound requests for owned listings  
- [ ] Status/date/machine/urgency filters work  
- [ ] Card fields complete  
- [ ] Actions navigate/open correctly  
- [ ] Pagination works  

### Validation Rules
Filter enums validated; page/limit bounds.

### Permissions
Manufacturer owner of `facility_id` / inventory owner chain.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/manufacturer/requests` | `GET` |
| `/api/requests/{id}` | `GET` |

### Request Payload
`GET /api/manufacturer/requests?status=SUBMITTED,MANUFACTURER_REVIEW&inventoryId=mch_1&from=2026-07-01&to=2026-07-31&urgency=EXPIRING&sort=CREATED_DESC&page=1&limit=20`

### Response Payload
```json
{
  "total": 42,
  "items": [
    {
      "id": "mreq_01H...",
      "status": "MANUFACTURER_REVIEW",
      "visionary": { "name": "Ananya Mehta", "organization": "Mehta Labs" },
      "requirementSummary": "Aluminum enclosure pilot",
      "inventoryName": "Haas VF-2",
      "requestedStartDate": "2026-09-01",
      "requestedEndDate": "2026-09-05",
      "quantity": 200,
      "budget": 450000,
      "currency": "INR",
      "attachmentCount": 2,
      "urgency": "EXPIRING",
      "reservationExpiresAt": "2026-07-16T08:00:00.000Z"
    }
  ]
}
```

### Database Tables
`Request` + joins to user/requirement/inventory.

### Database Fields
Read model; optional materialized urgency.

### Entity Relationships
Facility-owned requests collection.

### Sorting/Filtering Logic
AND filters; urgency derived: `reservation_expires_at - now() < threshold` OR flagged; indexes on `(facility_id, status, created_at)`.

### Pagination
Page/limit or cursor on `(created_at, id)`.

### Error Handling
Empty arrays; `403` other facilities.

### Security Considerations
Strict facility ownership; mask visionary PII per policy.

### Edge Cases
Multi-facility manufacturers; expired reservation still listed Declined auto-job.

### Dependencies
XFY-038/039; manufacturer dashboard shell.

### Testing Checklist
- [ ] Filters combinations  
- [ ] Pagination stability  
- [ ] Ownership isolation  
- [ ] Urgency badge  
- [ ] Mobile inbox  

### Definition of Done
UX accepted; query performance checked with fixtures; OpenAPI done.

---

## Ticket XFY-041

### Ticket ID
`XFY-041`

### Ticket Name
Accept / Decline Request Actions

### Priority
`P0 — Critical`

### Type
`Backend` · `Full-stack` · `Story`

### Story Points
`5`

### Epic
`EPIC-8 — Requests, Offers & Booking Workflow`

### User Story
As a manufacturer, I want to accept or decline requests with reasons so that capacity and negotiations stay accurate and both parties are notified.

### Business Value
Binary decisioning that drives booking conversion or frees capacity.

### Description
Accept and decline endpoints/UI. Notifications; status updates; accept proceeds toward booking; decline releases reserved slot; audit history recorded.

### Functional Requirements
1. Accept request → Accepted (or directly trigger booking confirm policy).  
2. Decline with reason → Declined.  
3. Notify visionary.  
4. Release reservation on decline.  
5. Write status + audit history.  
6. Ensure capacity still valid on accept.  

### UI Requirements (if frontend)
Accept confirm modal; Decline modal with reason codes + notes; success toasts; disable double-submit.

### Backend Requirements (if backend)
Transition service; EPIC-4 release/confirm hooks; notification events; transactional updates.

### Acceptance Criteria
- [ ] Notifications sent  
- [ ] Request status updated  
- [ ] Accepted request proceeds to booking  
- [ ] Declined request releases reserved slot  
- [ ] Audit history recorded  

### Validation Rules
Decline reason required; accept only from Manufacturer Review (or Submitted); reservation unexpired for accept if reserveCapacity used.

### Permissions
Manufacturer listing owner only.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/requests/{id}/accept` | `POST` |
| `/api/requests/{id}/decline` | `POST` |

### Request Payload
**Decline**
```json
{
  "reasonCode": "CAPACITY_UNAVAILABLE",
  "notes": "Maintenance week overlaps requested dates"
}
```

**Accept**
```json
{
  "message": "We can proceed on the requested dates at the listed rate."
}
```

### Response Payload
```json
{
  "request": { "id": "mreq_01H...", "status": "ACCEPTED" },
  "nextStep": "BOOKING_CONFIRMATION"
}
```

### Status Transitions
Manufacturer Review → Accepted | Declined (see XFY-038 matrix).

### Business Rules
- Accept does not skip booking confirmation unless auto-confirm config enabled.  
- Decline always attempts idempotent reservation release.  
- Cannot accept after cancelled/expired.

### Database Tables
`Request`, `RequestStatusHistory`, `BookingHistory`/reservation updates

### Database Fields
`decline_reason_code`, `decline_notes` optional columns or history payload.

### Entity Relationships
Request status drives booking create eligibility.

### Error Handling
`409` illegal state / expired reservation; `403` non-owner.

### Security Considerations
Ownership; audit actor; rate-limit.

### Edge Cases
Double-click accept; accept when counter already active—policy reject or supersede.

### Dependencies
XFY-038–040; EPIC-4; notifications; XFY-043 for confirm path.

### Testing Checklist
- [ ] Accept happy path  
- [ ] Decline releases slot  
- [ ] Notify  
- [ ] Audit rows  
- [ ] Illegal transitions  

### Definition of Done
Transition tests green; staging notification verified.

---

## Ticket XFY-042

### Ticket ID
`XFY-042`

### Ticket Name
Counter-Offer Workflow

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`13`

### Epic
`EPIC-8 — Requests, Offers & Booking Workflow`

### User Story
As a manufacturer or visionary, I want to exchange counter-offers on price, dates, quantity, and terms so that we can negotiate on-platform with a clear history.

### Business Value
Keeps deals from leaking offline; increases booking conversion through structured negotiation.

### Description
Manufacturer proposes new price/dates/quantity/terms/notes. Visionary accepts, rejects, or counters again. Offer history, active offer indicator, negotiation timeline, audit trail. Configurable max rounds; accepted offer → booking path; rejected retained in history; current offer clearly identified.

### Functional Requirements
1. Create counter-offers with commercial fields.  
2. Alternating accept/reject/counter.  
3. Unlimited rounds configurable.  
4. Single ACTIVE offer; history preserved.  
5. Accept → request Accepted + booking next step.  
6. Timeline UI + audit.  

### UI Requirements (if frontend)

#### Negotiation Panel
Timeline of offers; active banner; form for counter fields; Accept/Reject/Counter CTAs based on whose turn.

#### Offer Card
Price, dates, quantity, terms, notes, actor, timestamp, status ACTIVE/SUPERSEDED/ACCEPTED/REJECTED.

#### States
Waiting on counterparty; your turn highlight; max rounds reached lock; loading.

### Backend Requirements (if backend)
Offer entity; turn validation; concurrency version; history; notify on each offer.

### Acceptance Criteria
- [ ] Unlimited negotiation rounds (configurable)  
- [ ] Accepted offer moves to booking  
- [ ] Rejected offer retained in history  
- [ ] Current offer clearly identified  

### Validation Rules
| Field | Rule |
|-------|------|
| price | ≥ 0 |
| dates | end ≥ start |
| quantity | > 0 |
| round | ≤ max_rounds config |
| turn | only non-creator of ACTIVE offer may accept/counter (policy) |

### Permissions
Request parties only.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/requests/{id}/offers` | `GET` `POST` |
| `/api/offers/{id}/accept` | `POST` |
| `/api/offers/{id}/reject` | `POST` |

### Request Payload
**Create counter**
```json
{
  "price": 420000,
  "currency": "INR",
  "startDate": "2026-09-03",
  "endDate": "2026-09-07",
  "quantity": 180,
  "terms": "Tooling amortized over pilot; anodize via partner.",
  "notes": "Shifted window by 2 days for machine availability."
}
```

### Response Payload
```json
{
  "offer": {
    "id": "off_01H...",
    "requestId": "mreq_01H...",
    "round": 2,
    "status": "ACTIVE",
    "price": 420000,
    "startDate": "2026-09-03",
    "endDate": "2026-09-07",
    "quantity": 180,
    "createdByUserId": "usr_mfg_1",
    "createdAt": "2026-07-15T09:00:00.000Z"
  },
  "requestStatus": "COUNTER_OFFERED"
}
```

### Offer Schema / Database Tables
`Offer`, `OfferHistory`; Request.active_offer_id

### Database Fields
See Database Design.

### Negotiation Workflow
```
Manufacturer Review
    ↓
Counter Offer (ACTIVE) — request status COUNTER_OFFERED
    ↓
Visionary: Accept → ACCEPTED → Booking Confirmation
        OR Reject → offer REJECTED; may terminate or wait
        OR Counter → previous SUPERSEDED; new ACTIVE
    ↓
Manufacturer responds similarly
    ↓
Until Accept / Decline terminal / max rounds
```

On new offer: prior ACTIVE → SUPERSEDED; snapshot in OfferHistory; update reservation dates if policy allows (re-validate capacity).

### Entity Relationships
Request 1—* Offer; one ACTIVE.

### Error Handling
`409` not your turn / max rounds / stale offer version.

### Security Considerations
Party ACL; sanitize terms; audit; rate-limit counters.

### Edge Cases
Capacity no longer fits new dates; simultaneous counters; accept expired reservation.

### Dependencies
XFY-038–041; EPIC-4 revalidation; notifications.

### Testing Checklist
- [ ] Multi-round negotiation  
- [ ] Active indicator  
- [ ] History intact  
- [ ] Accept → booking path  
- [ ] Max rounds  

### Definition of Done
UX timeline accepted; concurrency tests pass; OpenAPI complete.

---

## Ticket XFY-043

### Ticket ID
`XFY-043`

### Ticket Name
Booking Confirmation

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`8`

### Epic
`EPIC-8 — Requests, Offers & Booking Workflow`

### User Story
As a visionary, I want to confirm an accepted offer so that a booking is created, capacity is locked, and both parties receive confirmation.

### Business Value
Completes the marketplace commercial loop and creates the system of record for production engagements.

### Description
On confirmation: create Booking; update availability to Booked; create basic Transaction (pending/manual payment); send confirmations; generate booking reference. Visible to both parties.

### Functional Requirements
1. Confirm accepted request/offer.  
2. Persist Booking with reference code.  
3. Mark slots Booked / convert reservation.  
4. Create Transaction stub (PENDING / MANUAL).  
5. Notify both parties.  
6. Show confirmation screens.  

### UI Requirements (if frontend)

#### Confirmation Screen
Summary of terms (price, dates, qty, machine, facility); payment pending notice; booking reference; CTAs to dashboard/messages.

#### Both-party Booking Detail
Shared read-only terms + status Booked.

#### States
Confirming spinner; success; failure with reselect guidance if capacity lost.

### Backend Requirements (if backend)
Transactional confirm service; EPIC-4 convert; booking number generator; transaction stub; notifications; history.

### Acceptance Criteria
- [ ] Booking record persisted  
- [ ] Slot marked Booked  
- [ ] Pending/manual payment supported  
- [ ] Confirmation visible to both parties  

### Validation Rules
Request status Accepted (via accept or accepted offer); reservation active or capacity available; idempotent confirm key.

### Permissions
Default: visionary confirms; config may allow manufacturer confirm after visionary pre-accept.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/requests/{id}/bookings/confirm` | `POST` |
| `/api/bookings/{id}` | `GET` |
| `/api/bookings/me` | `GET` |

### Request Payload
```json
{
  "offerId": "off_01H...",
  "paymentMethod": "MANUAL",
  "acknowledgeInsurance": true
}
```

### Response Payload
```json
{
  "booking": {
    "id": "bkg_01H...",
    "reference": "XY-2026-000184",
    "status": "CONFIRMED",
    "startDate": "2026-09-03",
    "endDate": "2026-09-07",
    "agreedPrice": 420000,
    "currency": "INR"
  },
  "transaction": {
    "id": "txn_01H...",
    "status": "PENDING",
    "amount": 420000,
    "paymentMethod": "MANUAL"
  }
}
```

### Booking Workflow
```
Accepted request/offer
    ↓
Visionary confirms (+ insurance ack if required)
    ↓
BEGIN TX
  Validate capacity / reservation
  Create Booking + reference
  Convert reservation → Booked slots
  Create Transaction PENDING
  Request status → BOOKED
  Write BookingHistory + RequestStatusHistory
COMMIT
    ↓
Notify both parties
    ↓
Confirmation UI
```

### Database Tables
`Booking`, `BookingHistory`, `Transaction`

### Database Fields
See Database Design.

### Entity Relationships
Request 1—1 Booking; Booking 1—1 Transaction (MVP); Booking ↔ Offer, Reservation.

### Error Handling
`409` capacity/state; idempotent replay returns existing booking.

### Security Considerations
Party-only confirm; insurance acknowledgement logged; audit; concurrency locks on slots.

### Edge Cases
Double confirm; offer superseded after accept UI open; payment method future swap.

### Dependencies
XFY-041/042; EPIC-4; notifications; insurance ack from EPIC-3.

### Testing Checklist
- [ ] Confirm persists booking  
- [ ] Slots booked  
- [ ] Transaction PENDING  
- [ ] Dual visibility  
- [ ] Idempotency  

### Definition of Done
E2E request→book demo in staging; runbooks for failed convert; OpenAPI complete.

---

# Database Design

## ER Overview (text)

```
User (Visionary)
 └─1──* Request
         ├─ facility / inventory / requirement / reservation
         ├─1──* RequestAttachment
         ├─1──* RequestStatusHistory
         ├─1──* Offer ──* OfferHistory
         ├─1──* Messages (other epic)
         └─0──1 Booking ──1──* BookingHistory
                          └─0──1 Transaction
```

## `Request`

See XFY-038 fields + `decline_reason_code`, `active_offer_id`, `reservation_id`.

**Indexes:** `(requester_user_id, status)`, `(facility_id, status, created_at)`, `(inventory_id, status)`, `(project_requirement_id)`.

## `Offer`

| Column | Notes |
|--------|-------|
| id PK | |
| request_id FK | INDEX |
| round | int ≥ 1 |
| status | ACTIVE/SUPERSEDED/ACCEPTED/REJECTED |
| price | numeric |
| currency | |
| start_date / end_date | |
| quantity | |
| quantity_unit | |
| terms | text |
| notes | text |
| created_by_user_id FK | |
| created_at | |
| UNIQUE partial one ACTIVE per request | |

## `OfferHistory`

| Column | Notes |
|--------|-------|
| id PK | |
| offer_id FK | |
| event_type | CREATED/ACCEPTED/REJECTED/SUPERSEDED |
| actor_user_id | |
| payload jsonb | |
| created_at | |

## `Booking`

| Column | Notes |
|--------|-------|
| id PK | |
| reference | UNIQUE business key |
| request_id FK UNIQUE | |
| offer_id FK nullable | |
| reservation_id FK nullable | |
| visionary_user_id / manufacturer_user_id | |
| facility_id / inventory_id | |
| start_datetime / end_datetime | |
| quantity | |
| agreed_price / currency | |
| status | CONFIRMED/CANCELLED/IN_PRODUCTION/COMPLETED/DISPUTED |
| insurance_acknowledged_at | |
| created_at / updated_at | |

## `BookingHistory`

| Column | Notes |
|--------|-------|
| id PK | |
| booking_id FK | |
| event_type | |
| actor_user_id | |
| payload jsonb | |
| created_at | |

## `RequestAttachment`

| Column | Notes |
|--------|-------|
| id PK | |
| request_id FK | |
| storage_key / file_name / content_type / size | |
| created_at | |

## `RequestStatusHistory`

| Column | Notes |
|--------|-------|
| id PK | |
| request_id FK | |
| from_status / to_status | |
| actor_user_id | |
| reason_code / notes | |
| created_at | |

## `Transaction` (basic)

| Column | Notes |
|--------|-------|
| id PK | |
| booking_id FK UNIQUE | |
| amount / currency | |
| status | PENDING/PAID/FAILED/CANCELLED/REFUNDED |
| payment_method | MANUAL/GATEWAY_FUTURE |
| provider_ref | nullable |
| created_at / updated_at | |

## Constraints Summary
- Date ordering on request/offer/booking  
- Money ≥ 0  
- One booking per request (MVP)  
- One ACTIVE offer per request  
- Status enums checked  

---

# REST API Summary

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/requests` | `POST` | Submit/create request | Visionary |
| `/api/requests/me` | `GET` | Visionary requests | Visionary |
| `/api/requests/{id}` | `GET` | Request detail | Party/Admin |
| `/api/requests/{id}/attachments` | `POST` `GET` | Request files | Party |
| `/api/manufacturer/requests` | `GET` | Manufacturer inbox | Manufacturer |
| `/api/requests/{id}/accept` | `POST` | Accept request | Manufacturer |
| `/api/requests/{id}/decline` | `POST` | Decline request | Manufacturer |
| `/api/requests/{id}/offers` | `GET` `POST` | List/create offers | Party |
| `/api/offers/{id}/accept` | `POST` | Accept offer | Counterparty |
| `/api/offers/{id}/reject` | `POST` | Reject offer | Counterparty |
| `/api/requests/{id}/bookings/confirm` | `POST` | Confirm booking | Visionary (default) |
| `/api/bookings/{id}` | `GET` | Booking detail | Party/Admin |
| `/api/bookings/me` | `GET` | My bookings | Auth |
| `/api/requests/{id}/history` | `GET` | Status + offer timeline | Party/Admin |
| `/api/admin/requests` | `GET` | All requests | Admin |
| `/api/admin/requests/{id}/override-status` | `POST` | Override with audit | Admin |
| `/api/admin/disputes/{id}/resolve` | `POST` | Resolve dispute | Admin |

---

# Workflow Diagrams

### Visionary

```
Find Listing
    ↓
Submit Request
    ↓
Manufacturer Reviews
    ↓
Negotiation
    ↓
Booking Confirmation
    ↓
Production
    ↓
Completion
    ↓
Review
```

### Manufacturer

```
Receive Request
    ↓
Review Details
    ↓
Accept / Decline / Counter
    ↓
Negotiate
    ↓
Booking Confirmed
    ↓
Production Begins
    ↓
Project Completed
```

---

# Business Rules

| # | Rule |
|---|------|
| 1 | Only authenticated users can submit requests |
| 2 | Only listing owners can respond (accept/decline/counter) |
| 3 | Requests cannot skip lifecycle states |
| 4 | Accepted requests reserve/book availability (via EPIC-4 integration) |
| 5 | Declined requests release reserved capacity |
| 6 | Counter-offers replace the active offer but preserve history |
| 7 | Completed requests become read-only except for reviews |
| 8 | Disputed requests cannot be closed until resolved |
| 9 | One ACTIVE offer per request |
| 10 | Booking confirmation is idempotent |
| 11 | Insurance acknowledgement required when listing requires it |
| 12 | Admin status overrides must write audit reasons |

---

# Admin Features

| Capability | Description |
|------------|-------------|
| **View all requests** | Cross-tenant list and detail |
| **Monitor negotiations** | Active counters, aging SLAs |
| **Resolve disputes** | Move out of Disputed with notes |
| **Override request status** | Break-glass with mandatory reason |
| **View booking history** | Full event timeline |
| **Export reports** | Request/booking funnels for ops/finance |

---

# Security Requirements

| Control | Requirement |
|---------|-------------|
| Role-based permissions | Visionary / Manufacturer / Admin |
| Ownership validation | Facility ownership for responses |
| Secure attachment access | Signed URLs; party ACL |
| Input validation | Dates, money, enums, lengths |
| Audit logging | All status/offer/booking transitions |
| Rate limiting | Submit, counter, confirm |
| Concurrency protection | Slot locks; offer version checks; idempotency keys |

---

# Non-functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Inbox p95 < 400ms; confirm p95 < 1s excl. notify |
| **Scalability** | Indexed inboxes; async notifications |
| **Reliability** | Confirm transactional with compensating release |
| **Security** | No cross-party leakage; IDOR-safe |
| **Accessibility** | Keyboard modals; status text not color-only |
| **Mobile responsiveness** | Submit, inbox, negotiate, confirm on mobile |

---

# Success Metrics

| KPI | Definition |
|-----|------------|
| **Requests submitted** | Count of Submitted+ requests |
| **Manufacturer response time** | Median time to first accept/decline/counter |
| **Acceptance rate** | Accepted / (Accepted+Declined) |
| **Counter-offer rate** | Requests with ≥1 counter / Submitted |
| **Booking conversion rate** | Bookings / Submitted requests |
| **Time to booking** | Submit → Booked median |
| **Project completion rate** | Completed / Booked |
| **User satisfaction** | Post-booking CSAT/NPS |

---

# Ticket Summary Board

| Ticket | Name | Priority | Points |
|--------|------|----------|--------|
| XFY-038 | Create Manufacturing Request Model | P0 | 5 |
| XFY-039 | Submit Manufacturing Request Flow | P0 | 8 |
| XFY-040 | Manufacturer Request Inbox | P0 | 8 |
| XFY-041 | Accept / Decline Request Actions | P0 | 5 |
| XFY-042 | Counter-Offer Workflow | P0 | 13 |
| XFY-043 | Booking Confirmation | P0 | 8 |
| | **Total** | | **47** |

**Suggested sequencing:** XFY-038 → XFY-039 → XFY-040 → XFY-041 → XFY-042 → XFY-043

---

# Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Double booking on confirm | EPIC-4 locks + idempotent confirm tests |
| Negotiation deadlocks | Max rounds + expiry jobs + admin resolve |
| Offline leakage | Fast UX + notifications + templates |
| Partial failures after accept | Transactional confirm; compensating workflows |
| Ambiguous terms | Structured offer fields required for accept |

---

# Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| Digital contracts | Generated agreements from accepted offers |
| E-signatures | Binding acceptances |
| Milestone-based bookings | Phased capacity & payments |
| Escrow payments | Fund hold until milestones |
| AI-assisted negotiation | Suggested counters |
| Smart pricing recommendations | From comps and utilization |
| Automated reminders | SLA nudges |
| Calendar synchronization | Google/Outlook |
| Production tracking integration | Status from shop floor |
| Multi-party approvals | Org workflows |

---

## Traceability

| Artifact | Use |
|----------|-----|
| PRD / SRS | Request–offer–booking requirements |
| Tech Design | State machine, offers, booking confirm |
| Jira / Azure DevOps | Import XFY-038–XFY-043 |
| Confluence / Notion | EPIC 8 source of truth |
| Downstream | Reviews, payments, dispute ops |

---

**X!Y — The Explorer Factory**  
*Why own it when you can make it.*
