# X!Y — The Explorer Factory

## EPIC 4 — Availability Calendar & Booking Capacity

**Tagline:** *Why own it when you can make it.*

**Document Type:** Software Specification · Epic Definition  
**Epic ID:** EPIC-4  
**Version:** 1.0  
**Last Updated:** July 2026  
**Classification:** PRD · SRS · Technical Design Document · Jira / Azure DevOps Backlog · Confluence · Agile Sprint Planning · Developer Documentation  
**Release Mapping:** Release 1 — MVP Marketplace  
**Depends On:** EPIC-1 (Auth) · EPIC-2 (Facility) · EPIC-3 (Machinery Inventory)  
**Enables:** Manufacturing Requests, Offers/Counters, Booking Confirmation, Messaging context

---

## Epic Summary

**EPIC 4 — Availability Calendar & Booking Capacity** provides the temporal and capacity backbone of **X!Y — The Explorer Factory**. Manufacturers publish when machinery can run and how much capacity each window holds. Visionaries view calendars on listings, select ranges, receive estimated pricing, and—when submitting a manufacturing request—obtain a **temporary reservation** that prevents double-booking until the manufacturer accepts, declines, counters, or the reservation expires.

This epic turns static machinery listings into **conflict-aware, bookable capacity** with calendar UX for both supply and demand sides.

---

## Business Objective

- Publish production capacity as time-bounded, priced slots  
- Prevent double-bookings and negative capacity through atomic reservations  
- Support recurring schedules, blocked dates, and slot-level price overrides  
- Enable capacity-based booking (shared windows when configured)  
- Provide real-time-enough availability for listing pages and search  
- Create durable booking records and history for ops, disputes, and analytics  

---

## User Value

| Audience | Value |
|----------|-------|
| Manufacturers | Control calendars, capacity, blocks, overrides; see reserved vs booked demand |
| Visionaries | Know what is free, estimate cost, reserve while negotiating |
| Admins | Oversight of conflicts, overrides, disputes, audit trails |
| Platform | Higher booking completion; trust that confirmed slots are exclusive/valid |

---

## Scope

EPIC 4 covers availability data models, manufacturer calendar management, public listing calendar, reservation during request negotiation, booking confirmation status updates, conflict detection, reservation expiry jobs, availability search hooks, dashboards, and admin override/dispute tools at the booking-calendar layer.

Offer/counter commercial negotiation UI may live in a Requests epic; this epic defines **how slots are held and transitioned** when those outcomes occur.

---

## In Scope

- Availability calendar and capacity slots  
- Recurring availability rules  
- Blocked dates / calendar exceptions  
- Price overrides per slot  
- Temporary slot reservation with expiry  
- Convert reservation → booked; release on reject/cancel/timeout  
- Conflict detection and concurrency-safe updates  
- Capacity-based booking rules  
- Availability search filters (date range / capacity)  
- Booking status tracking + history  
- Manufacturer calendar dashboard  
- Visionary booking calendar on listing pages  
- Estimated pricing for selected ranges  

---

## Out of Scope

- Full payment gateway capture / payouts (Release 2; basic booking record only)  
- Multi-party calendars for vendors/labor/logistics (later ecosystem)  
- Google/Outlook calendar sync (future)  
- AI forecasting and dynamic pricing engines (future)  
- IoT-driven live machine state (future)  
- Detailed shop-floor MES scheduling  
- Partial-day complex shift templates beyond recurrence rules (can extend later)  

---

## Role Prerequisites

| Role | Capability |
|------|------------|
| `MANUFACTURER` | CRUD availability on owned machinery; view bookings/reservations |
| `VISIONARY` | View public availability; create reservation via request; track booking status |
| `PLATFORM_ADMIN` | Override/release reservations; dispute tooling; conflict audit |

---

# Features Included

## Feature F1 — Availability Calendar

### Purpose
Present and manage time on a calendar for each machinery inventory item.

### Business Value
Makes capacity tangible and operable; reduces offline spreadsheet scheduling.

### User Benefits
Manufacturers plan visually; visionaries see open windows clearly.

### Functional Requirements
1. Day / Week / Month views.  
2. Color-coded statuses (Available, Reserved, Booked, Blocked).  
3. Real-time refresh after mutations (polling or push later).  
4. Scoped per `inventory_id` (machinery).  

### Validation Rules
Timezone stored consistently (UTC in DB; display in user/facility TZ—MVP document assumption: facility timezone attribute).

### Permissions
Owner manage; public/auth read published availability only.

### Error Handling
Load failures show retry; stale calendar warns on conflict.

### Future Enhancements
Timezone auto-detect; multi-machine overlay calendar.

---

## Feature F2 — Capacity Slots

### Purpose
Model discrete availability intervals with remaining capacity.

### Business Value
Enables exclusive or shared bookings without oversell.

### User Benefits
Precise selection of production windows.

### Functional Requirements
Slots store start/end, `capacity_available`, `capacity_unit`, status, optional price override.

### Validation Rules
`end > start`; capacity ≥ 0; unit required; see XFY-022.

### Permissions
Owner create/edit (when not Booked); system updates on reserve/book.

### Error Handling
Negative capacity attempts rejected atomically.

### Future Enhancements
Partial capacity booking UX; capacity pools across machines.

---

## Feature F3 — Recurring Availability

### Purpose
Define repeating open capacity (e.g., weekdays 09:00–18:00).

### Business Value
Lowers maintenance cost of calendars for stable plants.

### User Benefits
Manufacturers set patterns once; system materializes slots.

### Functional Requirements
Store `RecurringAvailabilityRule` (RRULE-like); expand into concrete slots for a horizon (e.g., 90 days); exceptions allowed.

### Validation Rules
Valid recurrence; horizon cap; no infinite materialization without bounds.

### Permissions
Owner manage rules; system job expands.

### Error Handling
Invalid RRULE → `400`; expansion conflicts flagged.

### Future Enhancements
Smart skip of holidays; plant calendar templates.

---

## Feature F4 — Blocked Dates

### Purpose
Mark intervals unavailable (maintenance, holidays, shutdowns).

### Business Value
Prevents buyer disappointment and invalid requests.

### User Benefits
Clear downtime communication.

### Functional Requirements
`CalendarException` / Blocked slots override availability; hidden from bookable selection.

### Validation Rules
Blocked cannot be reserved; may supersede recurring opens.

### Permissions
Owner create/remove blocks; admin emergency block.

### Error Handling
Block overlapping reserved/booked → conflict policy (deny or require cancel first).

### Future Enhancements
Automated maintenance blocking from IoT/work orders.

---

## Feature F5 — Price Overrides

### Purpose
Slot-specific pricing differing from machinery base rates.

### Business Value
Yield management for peak/off-peak capacity.

### User Benefits
Transparent surge/discount pricing on selection.

### Functional Requirements
`price_override` on slot; estimate engine prefers override over base EPIC-3 pricing.

### Validation Rules
Override ≥ 0; currency matches listing; applies only to selected slots.

### Permissions
Owner set on Available slots (not Booked).

### Error Handling
Override on Booked forbidden → `409`.

### Future Enhancements
Dynamic pricing rules; occupancy-based suggestions.

---

## Feature F6 — Slot Reservation

### Purpose
Temporarily hold capacity during request negotiation.

### Business Value
Fairness under concurrent demand; reduces race conditions.

### User Benefits
Visionaries get a real hold; manufacturers see serious intent.

### Functional Requirements
Create `BookingReservation` with expiry; decrement/lock capacity; status Reserved.

### Validation Rules
Only Available (or capacity-remaining) slots; expiry required.

### Permissions
Visionary create via request; system expire; manufacturer cannot steal reserved capacity without admin.

### Error Handling
Concurrent reserve → one winner `409` loser.

### Future Enhancements
Waitlist on expiry; soft holds vs hard holds tiers.

---

## Feature F7 — Booking Confirmation

### Purpose
Finalize capacity when manufacturer accepts (or equivalent confirm path).

### Business Value
Creates the commercial capacity commitment.

### User Benefits
Both parties see confirmed schedule.

### Functional Requirements
Transition reservation → `Booking` Booked; update slot status; write history; release conflicting holds if exclusive.

### Validation Rules
Only from active (non-expired) reservation; capacity still sufficient.

### Permissions
Manufacturer accept path; system enqueue updates.

### Error Handling
Expired reservation cannot confirm → `409` with reselect guidance.

### Future Enhancements
E-sign + payment hold before confirm.

---

## Feature F8 — Capacity-based Booking

### Purpose
Allow multiple bookings against one slot when capacity > 1.

### Business Value
Higher utilization for divisible capacity (e.g., hours, units, parallel jobs).

### User Benefits
Manufacturers sell partial capacity; buyers may share windows when policy allows.

### Functional Requirements
Config flag per machinery/slot `allows_shared_capacity`; bookings decrement `capacity_available`; slot Available while capacity > 0 else Booked.

### Validation Rules
Requested capacity ≤ available; cannot go negative.

### Permissions
System enforces; owner configures shared mode.

### Error Handling
Insufficient capacity → `409 CAPACITY_EXCEEDED`.

### Future Enhancements
Priority queues; capacity fragmentation UI.

---

## Feature F9 — Conflict Detection

### Purpose
Prevent overlapping exclusive slots and illegal concurrent holds.

### Business Value
Marketplace integrity; support cost reduction.

### User Benefits
Trust that calendars are truthful.

### Functional Requirements
Exclude overlapping Active Available/Reserved/Booked for exclusive inventory; DB constraints + transactional checks; advisory locks or `SELECT FOR UPDATE`.

### Validation Rules
See Business Rules section.

### Permissions
Enforced server-side always.

### Error Handling
`409 CONFLICT` with conflicting slot IDs.

### Future Enhancements
Admin conflict resolution console with merge tools.

---

## Feature F10 — Reservation Expiry

### Purpose
Auto-release holds that do not convert to bookings.

### Business Value
Recovers liquidity; prevents calendar deadlocks.

### User Benefits
Expired holds free capacity for others.

### Functional Requirements
Configurable TTL; background job; idempotent release; notify parties.

### Validation Rules
TTL default (e.g., 24–72h) configurable per env.

### Permissions
System job; admin forced release.

### Error Handling
Job retries; poison messages quarantined.

### Future Enhancements
Sliding expiry on active negotiation messages.

---

## Feature F11 — Availability Search

### Purpose
Filter machinery by date range and capacity needs.

### Business Value
Demand finds feasible supply faster.

### User Benefits
“Free next week” style discovery.

### Functional Requirements
Search API params: `start`, `end`, `minCapacity`, `inventoryId` optional; return machines with intersecting Available capacity.

### Validation Rules
Valid date range; max window length.

### Permissions
Public/auth as per search policy.

### Error Handling
`400` invalid range.

### Future Enhancements
Rank by cheapest override in window.

---

## Feature F12 — Booking Status Tracking

### Purpose
Expose lifecycle status to both parties.

### Business Value
Operational clarity; fewer “where are we?” messages.

### User Benefits
Track Reserved → Confirmed → In Progress → Completed (extended statuses as needed).

### Functional Requirements
`Booking.status` + `BookingHistory` events; dashboards and listing CTAs reflect state.

### Validation Rules
Legal transitions only.

### Permissions
Parties to the booking; admin all.

### Error Handling
Illegal transition → `409`.

### Future Enhancements
Milestone checklists tied to manufacturing execution.

---

## Feature F13 — Manufacturer Calendar Dashboard

### Purpose
Ops center for capacity, holds, and bookings.

### Business Value
Daily driver for supply-side responsiveness.

### User Benefits
Single place to manage schedule and revenue outlook.

### Functional Requirements
See Manufacturer Dashboard section.

### Validation Rules
N/A beyond data freshness SLAs.

### Permissions
Owner facilities/machinery only.

### Error Handling
Partial widget failure isolation.

### Future Enhancements
Revenue forecasting ML; staffing overlay.

---

## Feature F14 — Visionary Booking Calendar

### Purpose
Listing-embedded calendar for selection and inquiry.

### Business Value
Converts listing views into reserved requests.

### User Benefits
Self-serve slot picking with price clarity.

### Functional Requirements
See XFY-024 + Visionary Booking Experience.

### Validation Rules
Cannot select blocked/booked; duration within machine min/max.

### Permissions
Authenticated visionary for reserve; browse may be public.

### Error Handling
Inquiry fallback if exact slots hidden by policy.

### Future Enhancements
Multi-slot cart; compare calendars across machines.

---

# Developer Tickets

---

## Ticket XFY-022

### Ticket ID
`XFY-022`

### Ticket Name
Create Availability Slot Database Model

### Priority
`P0 — Critical`

### Type
`Backend` · `Database` · `Story`

### Story Points
`8`

### Epic
`EPIC-4 — Availability Calendar & Booking Capacity`

### User Story
As a platform engineer, I need a normalized availability slot model with capacity, status, and linkage to bookings/requests so that calendars and reservations can be enforced consistently.

### Business Value
Foundation for conflict-free booking capacity across the marketplace.

### Description
Create `AvailabilitySlot` and supporting tables (`BookingReservation`, `Booking`, `BookingHistory`, `CalendarException`, `RecurringAvailabilityRule`). Define statuses Available / Reserved / Booked / Blocked, constraints, indexes, conflict detection rules, and capacity validation. Document SQL-style schema and ER.

### Functional Requirements
1. `AvailabilitySlot` belongs to `MachineryInventory` (`inventory_id`).  
2. Fields per specification including optional `recurrence_rule` / link to rule table.  
3. Status enum: Available, Reserved, Booked, Blocked.  
4. Link optionally to Booking and ManufacturingRequest (nullable FKs or via reservation).  
5. Constraints preventing invalid capacity and inverted datetimes.  
6. Indexes for calendar queries and conflict checks.  

### UI Requirements (if frontend)
N/A — publish ER to Confluence.

### Backend Requirements (if backend)
Migrations, enums, ORM, repository helpers for overlap queries.

### Acceptance Criteria
- [ ] AvailabilitySlot table with all fields  
- [ ] Statuses Available/Reserved/Booked/Blocked  
- [ ] Relationships to MachineryInventory, Booking, ManufacturingRequest documented/implemented  
- [ ] Constraints, indexes, conflict rules, capacity validation defined  
- [ ] SQL-style schema + ER explanation delivered  

### Validation Rules
- `end_datetime > start_datetime`  
- `capacity_available >= 0`  
- Exclusive mode: no overlapping Active (Available/Reserved/Booked) for same inventory unless shared capacity enabled  
- Blocked may overlap historically only via exceptions table strategy  
- `price_override` null or ≥ 0  

### Permissions
DB migrator; app services read/write under API authz.

### REST API Endpoints
N/A (consumed by later tickets).

### Request Payload
N/A

### Response Payload
N/A

### Database Tables
`AvailabilitySlot`, stubs/links for `Booking`, `BookingReservation`, `ManufacturingRequest`

### Database Fields
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| inventory_id | FK UUID | MachineryInventory |
| start_datetime | timestamptz | NOT NULL |
| end_datetime | timestamptz | NOT NULL |
| capacity_available | numeric/int | NOT NULL |
| capacity_unit | varchar | HOURS/UNITS/JOBS/etc. |
| price_override | numeric | nullable |
| status | varchar | AVAILABLE/RESERVED/BOOKED/BLOCKED |
| recurrence_rule | text | optional denorm; prefer rule FK |
| recurrence_rule_id | FK | optional |
| reservation_expiry_at | timestamptz | nullable; denorm hint |
| booking_id | FK | nullable |
| manufacturing_request_id | FK | nullable |
| created_at / updated_at | timestamptz | |

### Entity Relationships
- MachineryInventory 1—* AvailabilitySlot  
- AvailabilitySlot 0—1 Booking (or 1—* if shared capacity allocations)  
- AvailabilitySlot 0—* BookingReservation (history of holds)  
- AvailabilitySlot 0—1 ManufacturingRequest (active link)  
- RecurringAvailabilityRule 1—* AvailabilitySlot (materialized)  

### Error Handling
Constraint violations surface as `409`/`400` at API layer.

### Security Considerations
No direct table exposure; authorize via inventory→facility→owner chain.

### Edge Cases
Zero-capacity Booked vs Available; overlapping Blocked vs Available precedence (Blocked wins).

### Dependencies
EPIC-3 MachineryInventory; ManufacturingRequest ID space (may be stub FK until Requests epic).

### Conflict Detection Rules
1. For **exclusive** inventory: reject insert/update if exists slot on same `inventory_id` where  
   `status IN ('AVAILABLE','RESERVED','BOOKED')` AND  
   `start_datetime < :end AND end_datetime > :start`.  
2. For **shared capacity**: allow overlap; enforce sum of active reserved/booked allocations ≤ original capacity.  
3. Prefer transactional `SELECT … FOR UPDATE` on inventory calendar range or slot rows.  
4. Optional exclusion constraint using range types (`tstzrange`) + `gist` for exclusive calendars.

### Capacity Validation
- Decrements only inside transactions  
- Never persist `capacity_available < 0`  
- On release/expiry, restore capacity idempotently  

### SQL-style Schema (reference)

```sql
CREATE TABLE availability_slot (
  id UUID PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES machinery_inventory(id),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  capacity_available NUMERIC(12,2) NOT NULL,
  capacity_unit VARCHAR(32) NOT NULL,
  price_override NUMERIC(12,2),
  status VARCHAR(32) NOT NULL,
  recurrence_rule_id UUID NULL,
  reservation_expiry_at TIMESTAMPTZ NULL,
  booking_id UUID NULL,
  manufacturing_request_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_slot_time CHECK (end_datetime > start_datetime),
  CONSTRAINT chk_slot_capacity CHECK (capacity_available >= 0),
  CONSTRAINT chk_slot_price CHECK (price_override IS NULL OR price_override >= 0),
  CONSTRAINT chk_slot_status CHECK (status IN ('AVAILABLE','RESERVED','BOOKED','BLOCKED'))
);

CREATE INDEX idx_slot_inventory_time ON availability_slot (inventory_id, start_datetime, end_datetime);
CREATE INDEX idx_slot_status ON availability_slot (inventory_id, status);
CREATE INDEX idx_slot_reservation_expiry ON availability_slot (reservation_expiry_at)
  WHERE status = 'RESERVED';
```

### Entity Relationship Explanation
Slots are the schedulable atoms attached to machinery. Reservations and bookings reference slots (and optionally requests). Recurrence rules generate many slots; exceptions/blocks punch holes. History tables record status transitions for audit and disputes.

### Testing Checklist
- [ ] Migration up/down  
- [ ] Time/capacity checks  
- [ ] Overlap rejection in exclusive mode  
- [ ] Indexes used by range query plan  

### Definition of Done
Schema merged; conflict/capacity rules reviewed by tech lead; ready for calendar APIs.

---

## Ticket XFY-023

### Ticket ID
`XFY-023`

### Ticket Name
Manufacturer Availability Calendar

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`13`

### Epic
`EPIC-4 — Availability Calendar & Booking Capacity`

### User Story
As a manufacturer, I want an interactive availability calendar so that I can add, edit, block, and price capacity windows and see reserved/booked demand.

### Business Value
Gives manufacturers operational control of supply liquidity.

### Description
Build manufacturer calendar UI + APIs for CRUD availability, blocked dates, recurring schedules, capacity, price overrides, and visibility into reserved/booked slots. Support Day/Week/Month filters, color coding, responsive layout, auto-save, overlap validation. Drag-and-drop editing optional for MVP+.

### Functional Requirements
1. Add / edit / delete availability slots.  
2. Block dates.  
3. Add recurring schedules.  
4. Set capacity and capacity unit.  
5. Override pricing.  
6. View booked and reserved slots.  
7. Filter Day, Week, Month.  
8. Auto-save changes.  
9. Validate overlapping slots.  

### UI Requirements (if frontend)

#### Layout
- Left: machinery selector (facility-scoped)  
- Center: calendar canvas  
- Right/drawer: slot detail editor (capacity, override, recurrence, notes)  

#### Interactions
| Action | Behavior |
|--------|----------|
| Click empty range | Create Available draft slot |
| Click slot | Open editor |
| Drag edge (optional) | Resize with live validation |
| Drag move (optional) | Relocate with conflict check |
| Block tool | Paint Blocked exception |
| Recurrence toggle | Opens rule form; shows “applies next N days” |

#### Color coding
| Status | Color guidance |
|--------|----------------|
| Available | Green |
| Reserved | Amber |
| Booked | Blue |
| Blocked | Gray/red muted |

#### States
- **Loading:** calendar skeleton  
- **Empty:** CTA “Add your first open capacity window”  
- **Error:** banner + retry; keep last good snapshot  
- **Saving:** subtle indicator; conflict toast on `409`  

### Backend Requirements (if backend)
Calendar range query API; CRUD; recurrence expand job/on-save; conflict service; autosave-friendly PATCH.

### Acceptance Criteria
- [ ] Interactive calendar UI  
- [ ] Drag-and-drop optional (document if deferred)  
- [ ] Recurring availability support  
- [ ] Color-coded statuses  
- [ ] Responsive design  
- [ ] Auto-save changes  
- [ ] Validation for overlapping slots  

### Validation Rules
- No overlap in exclusive mode  
- Cannot edit/delete Booked slots (cancel booking flow instead)  
- Cannot convert Booked → Available directly  
- Recurrence horizon ≤ configured max (e.g., 180 days)  
- Capacity > 0 for new Available slots  

### Permissions
Manufacturer owning parent facility/machinery only.

### REST API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/machinery/{inventoryId}/calendar` | `GET` | Slots in range |
| `/api/machinery/{inventoryId}/slots` | `POST` | Create slot |
| `/api/slots/{id}` | `PATCH` | Update slot |
| `/api/slots/{id}` | `DELETE` | Delete if allowed |
| `/api/machinery/{inventoryId}/blocks` | `POST` | Create blocked exception |
| `/api/machinery/{inventoryId}/recurrence-rules` | `POST` `GET` | Recurring rules |
| `/api/recurrence-rules/{id}/expand` | `POST` | Materialize slots |
| `/api/slots/{id}/price-override` | `PUT` | Set/clear override |

### Request Payload
**Create slot**
```json
{
  "startDatetime": "2026-08-01T09:00:00+05:30",
  "endDatetime": "2026-08-01T18:00:00+05:30",
  "capacityAvailable": 1,
  "capacityUnit": "SHIFT",
  "priceOverride": 2000,
  "status": "AVAILABLE"
}
```

**Recurrence rule**
```json
{
  "startDate": "2026-08-01",
  "untilDate": "2026-10-31",
  "timeStart": "09:00",
  "timeEnd": "18:00",
  "daysOfWeek": ["MON", "TUE", "WED", "THU", "FRI"],
  "capacityAvailable": 1,
  "capacityUnit": "SHIFT",
  "timezone": "Asia/Kolkata"
}
```

### Response Payload
```json
{
  "slots": [
    {
      "id": "slot_01H...",
      "startDatetime": "2026-08-01T03:30:00Z",
      "endDatetime": "2026-08-01T12:30:00Z",
      "capacityAvailable": 1,
      "capacityUnit": "SHIFT",
      "priceOverride": 2000,
      "status": "AVAILABLE"
    }
  ],
  "serverTime": "2026-07-15T06:40:00Z"
}
```

### Database Tables
`AvailabilitySlot`, `RecurringAvailabilityRule`, `CalendarException`

### Database Fields
Per Database Design.

### Entity Relationships
Inventory → rules → slots; exceptions block ranges.

### Error Handling
`409 CONFLICT` with `conflictingSlotIds`; `422` booked immutable.

### Security Considerations
Ownership checks; rate-limit writes; audit price overrides and blocks.

### Edge Cases
DST boundaries; edit while visionary reserving (row lock); recurrence regenerates without duplicating.

### Dependencies
XFY-022; EPIC-3 machinery published ideally.

### Testing Checklist
- [ ] CRUD slot  
- [ ] Overlap rejected  
- [ ] Recurrence expands  
- [ ] Block hides capacity  
- [ ] Booked immutable  
- [ ] Month/week/day fetch performance  
- [ ] Mobile layout  

### Definition of Done
PM/design accept calendar UX; conflict tests green; OpenAPI published.

---

## Ticket XFY-024

### Ticket ID
`XFY-024`

### Ticket Name
Show Availability on Listing Page

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`8`

### Epic
`EPIC-4 — Availability Calendar & Booking Capacity`

### User Story
As a visionary, I want to see availability on a machinery listing, select dates, and view estimated pricing so that I can choose a feasible production window before requesting.

### Business Value
Converts listing traffic into high-intent, schedule-qualified requests.

### Description
Embed a responsive calendar on the public/auth listing page. Disable unavailable dates; support start/end selection; live price estimation; show booking duration; offer inquiry fallback when exact availability is hidden by manufacturer policy.

### Functional Requirements
1. View available production slots.  
2. View/disabled unavailable dates.  
3. Select start/end.  
4. View estimated pricing.  
5. Submit inquiry if exact availability hidden.  
6. View booking duration vs machine min/max.  

### UI Requirements (if frontend)
- Compact calendar under pricing/CTA  
- Selected range highlight  
- Sidebar/summary: duration, estimated cost, capacity needed input  
- Disabled: Blocked/Booked/past/insufficient capacity  
- Reserved by others shown busy  
- “Request exact dates (inquiry)” secondary CTA  
- Loading shimmer; error retry; empty “No open capacity in this month”  

### Backend Requirements (if backend)
Public calendar read API (published machinery only); pricing estimate combining EPIC-3 rates + slot overrides; validation helpers for selectable ranges.

### Acceptance Criteria
- [ ] Calendar embedded on listing page  
- [ ] Unavailable dates disabled  
- [ ] Live price calculation  
- [ ] Responsive calendar  
- [ ] Inquiry fallback option  

### Validation Rules
- Selection must map to Available capacity covering range (or allowable shared capacity)  
- Duration within machinery `minimum_booking_duration` / `maximum_booking_duration`  
- Start not in the past (facility TZ)  

### Permissions
Read: public or auth per policy. Estimate: auth recommended. Inquiry/reserve: authenticated visionary.

### REST API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/public/machinery/{id}/calendar` | `GET` | Public availability in range |
| `/api/machinery/{id}/pricing/estimate-range` | `POST` | Estimate for selection |
| `/api/machinery/{id}/availability/validate` | `POST` | Validate selectable range |
| `/api/machinery/{id}/inquiries` | `POST` | Inquiry fallback (lightweight) |

### Request Payload
**Estimate**
```json
{
  "startDatetime": "2026-08-10T09:00:00+05:30",
  "endDatetime": "2026-08-12T18:00:00+05:30",
  "requestedCapacity": 1
}
```

### Response Payload
```json
{
  "selectable": true,
  "duration": { "value": 3, "unit": "DAY" },
  "withinBookingLimits": true,
  "estimatedTotal": 5400,
  "currency": "INR",
  "breakdown": [
    { "slotId": "slot_a", "priceApplied": 1800, "source": "BASE" },
    { "slotId": "slot_b", "priceApplied": 2000, "source": "OVERRIDE" }
  ],
  "warnings": []
}
```

### Pricing Calculation Logic
1. Resolve covering Available slots for `[start, end)` (policy: require full coverage).  
2. For each billable quantum (hour/day per machine `cost_unit`):  
   - Use `price_override` if slot defines one for that quantum  
   - Else use primary EPIC-3 machinery rate for unit  
3. Sum quanta + optional add-ons if selected (future).  
4. Return breakdown for transparency.  
5. If manufacturer hides exact slots (`availability_visibility=APPROXIMATE`): return busy/free month heatmap only + inquiry CTA (no reserve until revealed).  

### Booking Validation
`validate` ensures capacity, status, duration limits, and not already reserved by others exclusively.

### Database Tables
Reads `AvailabilitySlot`, `Pricing`, machinery duration fields.

### Database Fields
N/A new required beyond flags: optional `MachineryInventory.availability_visibility`.

### Entity Relationships
Listing → inventory → slots.

### Error Handling
`409` if selection became unavailable; refresh calendar.

### Security Considerations
Do not leak other customers’ identities on reserved slots; show busy only.

### Edge Cases
Partial day selections; gaps between slots; hidden availability mode; timezone display mismatch.

### Dependencies
XFY-022/023; EPIC-3 pricing.

### Testing Checklist
- [ ] Disabled dates correct  
- [ ] Estimate matches override rules  
- [ ] Duration limits enforced  
- [ ] Inquiry path  
- [ ] Mobile calendar usable  

### Definition of Done
Listing page QA’d; estimate parity tests vs pricing rules; accessibility of date grid verified.

---

## Ticket XFY-025

### Ticket ID
`XFY-025`

### Ticket Name
Reserve Availability During Request Negotiation

### Priority
`P0 — Critical`

### Type
`Backend` · `Full-stack` · `Story`

### Story Points
`13`

### Epic
`EPIC-4 — Availability Calendar & Booking Capacity`

### User Story
As a visionary, when I submit a manufacturing request for selected dates, I want those dates temporarily reserved so that capacity is not double-booked while the manufacturer responds.

### Business Value
Protects conversion under concurrency; makes acceptances operationally real.

### Description
Implement reservation workflow: reserve on request submit; configurable TTL; auto-release job; convert to Booked on accept; release on reject/cancel/expiry; atomic updates; concurrent attempt handling; confirmation workflow hooks.

### Functional Requirements
1. Reserve selected slot(s) when request submitted.  
2. Reservation timeout (`reservation_expiry_at`).  
3. Automatic release after expiry.  
4. Convert reservation to Booked after acceptance.  
5. Release after rejection/cancellation.  
6. Prevent race conditions; handle concurrent attempts.  
7. Booking confirmation updates calendar.  

### UI Requirements (if frontend)
- Request submit shows “Capacity held until {time}”  
- Countdown / expiry banner for both parties  
- Manufacturer request detail shows reserved slot chips  
- On expiry: prompt visionary to reselect  
- Optimistic UI with reconcile on `409`  

### Backend Requirements (if backend)
Reservation service; transactional locking; outbox/ cron expiry; idempotent release; booking confirm service; integrate with request status webhooks/events.

### Acceptance Criteria
- [ ] Temporary reservation created  
- [ ] Configurable expiration period  
- [ ] Automatic cleanup job  
- [ ] Atomic reservation updates  
- [ ] Booking confirmation workflow  

### Validation Rules
- Only Available (sufficient capacity) at reserve time  
- TTL between configured min/max  
- Confirm only if reservation active and unexpired  
- Requested capacity ≤ available  

### Permissions
Visionary creates via own request; manufacturer accept/decline own inbound; system job releases; admin force-release.

### REST API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/requests/{requestId}/reservations` | `POST` | Create reservation for selected slots |
| `/api/reservations/{id}` | `GET` | Reservation detail |
| `/api/reservations/{id}/release` | `POST` | Explicit release/cancel |
| `/api/reservations/{id}/confirm` | `POST` | Convert to booking (accept path) |
| `/api/internal/jobs/expire-reservations` | `POST` | Job trigger (secured) |

### Request Payload
**Create reservation**
```json
{
  "inventoryId": "mch_01H...",
  "slotIds": ["slot_a", "slot_b"],
  "startDatetime": "2026-08-10T09:00:00+05:30",
  "endDatetime": "2026-08-12T18:00:00+05:30",
  "requestedCapacity": 1,
  "manufacturingRequestId": "req_01H..."
}
```

### Response Payload
```json
{
  "reservation": {
    "id": "rsv_01H...",
    "status": "ACTIVE",
    "expiresAt": "2026-07-16T06:40:00Z",
    "slotIds": ["slot_a", "slot_b"],
    "requestedCapacity": 1
  },
  "slots": [
    { "id": "slot_a", "status": "RESERVED", "capacityAvailable": 0 }
  ]
}
```

### Reservation Workflow
```
Visionary submits request with date selection
        ↓
BEGIN TRANSACTION
  Lock target slots / inventory range
  Validate Available + capacity
  Create BookingReservation (ACTIVE, expiresAt)
  Update slots → RESERVED (or decrement capacity)
  Link manufacturing_request_id
COMMIT
        ↓
Manufacturer notified
        ↓
 mon─┬── Accept ──► Confirm: slots BOOKED + Booking row + History
    ├── Decline/Cancel ──► Release reservation + restore capacity
    └── Timeout job ──► Expire + release + notify
```

### Concurrency Handling Strategy
| Technique | Usage |
|-----------|--------|
| `SELECT FOR UPDATE` | Lock candidate slots in stable ID order |
| Compare-and-set status | Update only where `status='AVAILABLE'` |
| Unique active reservation | Partial unique index preventing double active hold per slot when exclusive |
| Idempotency keys | Request submit key avoids duplicate reservations |
| 409 CONFLICT | Loser retries with refreshed calendar |

### Rollback Logic
- On request creation failure after reserve → compensating release  
- Confirm failure after partial writes → transactional all-or-nothing  
- Expiry job uses status conditions `WHERE status='ACTIVE' AND expires_at < now()` once  

### Database Tables
`BookingReservation`, `AvailabilitySlot`, `Booking`, `BookingHistory`

### Database Fields
See Database Design.

### Entity Relationships
Request 1—0..1 active Reservation; Reservation *—* Slots (allocation); Reservation → Booking on confirm.

### Error Handling
`409 CAPACITY_TAKEN`; `409 RESERVATION_EXPIRED`; `404` unknown slots.

### Security Considerations
Ownership of request; manufacturer only confirm own inventory; secure job endpoint; audit all transitions; rate-limit reserve attempts.

### Edge Cases
Partial multi-slot reserve failure; clock skew near expiry; accept at exact expiry instant; shared capacity double decrement; manufacturer blocks overlapping reserved slot (deny).

### Dependencies
XFY-022–024; Manufacturing Request entity/status events; notification stub optional.

### Background Job Requirements
| Job | Cadence | Action |
|-----|---------|--------|
| `expire-reservations` | every 1–5 min | Release ACTIVE past `expires_at` |
| `reconcile-capacity` | hourly | Detect drift / alert |
| metrics | continuous | Counts of expiries, conflicts, confirms |

### Testing Checklist
- [ ] Happy reserve → confirm  
- [ ] Reserve → decline → capacity restored  
- [ ] Expiry job releases  
- [ ] Two concurrent reserves → one success  
- [ ] Confirm after expiry fails  
- [ ] Idempotent re-submit  

### Definition of Done
Load/concurrency test for double-booking scenario passes; runbooks for expiry job; OpenAPI + sequence diagrams published.

---

# Database Design

## ER Diagram (text)

```
MachineryInventory
  ├─1──* AvailabilitySlot
  ├─1──* RecurringAvailabilityRule
  └─1──* CalendarException

AvailabilitySlot
  ├─*──* BookingReservation (via ReservationSlotAllocation)
  └─0──1 Booking (exclusive) / 1──* BookingAllocation (shared)

BookingReservation
  ├─ request_id → ManufacturingRequest
  ├─ user_id → Visionary
  └─1──* BookingHistory (events)

Booking
  └─1──* BookingHistory
```

## `AvailabilitySlot`

(See XFY-022 field table.)  
**Indexes:** `(inventory_id, start_datetime, end_datetime)`, `(inventory_id, status)`, partial on `reservation_expiry_at`, optional `gist(tstzrange)`.

## `BookingReservation`

| Column | PK/FK | Notes |
|--------|-------|-------|
| id | PK | |
| inventory_id | FK | |
| manufacturing_request_id | FK | |
| visionary_user_id | FK | |
| status | | ACTIVE / EXPIRED / RELEASED / CONVERTED |
| requested_capacity | | > 0 |
| start_datetime / end_datetime | | selected range |
| expires_at | | NOT NULL INDEX |
| created_at / updated_at | | |

## `ReservationSlotAllocation`

| Column | Notes |
|--------|-------|
| reservation_id FK | |
| slot_id FK | |
| capacity_allocated | > 0 |
| PK (reservation_id, slot_id) | |

## `Booking`

| Column | Notes |
|--------|-------|
| id PK | |
| inventory_id FK | |
| manufacturing_request_id FK | |
| reservation_id FK | |
| visionary_user_id FK | |
| manufacturer_user_id FK | |
| status | CONFIRMED / CANCELLED / COMPLETED / … |
| start_datetime / end_datetime | |
| capacity_booked | |
| agreed_price | |
| currency | |
| created_at / updated_at | |

## `BookingHistory`

| Column | Notes |
|--------|-------|
| id PK | |
| booking_id FK nullable | |
| reservation_id FK nullable | |
| event_type | RESERVED / EXPIRED / CONFIRMED / RELEASED / ADMIN_OVERRIDE / … |
| actor_user_id | |
| payload jsonb | before/after snapshot |
| created_at | |

## `CalendarException`

| Column | Notes |
|--------|-------|
| id PK | |
| inventory_id FK | |
| start_datetime / end_datetime | |
| reason | MAINTENANCE / HOLIDAY / OTHER |
| created_by | |
| created_at | |

## `RecurringAvailabilityRule`

| Column | Notes |
|--------|-------|
| id PK | |
| inventory_id FK | |
| timezone | |
| rrule / structured fields | days, timeStart/timeEnd, until |
| capacity_available / capacity_unit | |
| price_override default | nullable |
| is_active | |
| created_at / updated_at | |

## Constraints Summary
- Time ordering checks  
- Capacity ≥ 0  
- Exclusive overlap prevention (app + optional DB exclusion)  
- Active reservation expiry required  
- Booked slots immutable except via cancel flow  

---

# REST API Summary

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/machinery/{inventoryId}/calendar` | `GET` | Owner calendar range | Manufacturer |
| `/api/public/machinery/{id}/calendar` | `GET` | Public availability | Public/Auth |
| `/api/machinery/{inventoryId}/slots` | `POST` | Create availability | Manufacturer |
| `/api/slots/{id}` | `PATCH` | Edit slot | Manufacturer |
| `/api/slots/{id}` | `DELETE` | Delete slot | Manufacturer |
| `/api/slots/{id}/price-override` | `PUT` | Override price | Manufacturer |
| `/api/machinery/{inventoryId}/blocks` | `POST` | Block dates | Manufacturer |
| `/api/machinery/{inventoryId}/blocks/{id}` | `DELETE` | Remove block | Manufacturer |
| `/api/machinery/{inventoryId}/recurrence-rules` | `GET` `POST` | Recurring rules | Manufacturer |
| `/api/recurrence-rules/{id}` | `PATCH` `DELETE` | Manage rule | Manufacturer |
| `/api/recurrence-rules/{id}/expand` | `POST` | Materialize slots | Manufacturer |
| `/api/machinery/{id}/pricing/estimate-range` | `POST` | Estimate selection | Auth |
| `/api/machinery/{id}/availability/validate` | `POST` | Validate selection | Auth |
| `/api/machinery/search` | `GET` | Search incl. availability window | Public/Auth |
| `/api/requests/{requestId}/reservations` | `POST` | Reserve capacity | Visionary |
| `/api/reservations/{id}` | `GET` | Get reservation | Party/Admin |
| `/api/reservations/{id}/release` | `POST` | Release hold | Party/Admin |
| `/api/reservations/{id}/confirm` | `POST` | Confirm booking | Manufacturer/Admin |
| `/api/bookings/{id}` | `GET` | Booking detail | Party/Admin |
| `/api/bookings/{id}/history` | `GET` | Booking/reservation history | Party/Admin |
| `/api/manufacturer/dashboard/calendar` | `GET` | Dashboard aggregate | Manufacturer |
| `/api/admin/bookings` | `GET` | Admin booking list | Admin |
| `/api/admin/reservations/{id}/override-release` | `POST` | Force release | Admin |
| `/api/internal/jobs/expire-reservations` | `POST` | Expiry worker | Service auth |

---

# Manufacturer Dashboard

| Panel | Description |
|-------|-------------|
| **Calendar View** | Day/Week/Month of selected machinery/facility |
| **Upcoming Bookings** | Confirmed jobs with start times and counterparties |
| **Reserved Slots** | Active holds with expiry countdown |
| **Available Capacity** | Open capacity next 7/30 days |
| **Revenue Forecast** | Sum of overrides/base rates for booked + tentative reserved (flagged) |
| **Booking Requests** | Inbound requests linked to holds |
| **Price Overrides** | List of slots with non-base pricing |
| **Blocked Dates** | Maintenance/holiday exceptions |
| **Calendar Filters** | Machinery, status, date range, facility |

---

# Visionary Booking Experience

## End-to-end journey

1. **View Listing** — Open published machinery page.  
2. **Check Availability** — Browse embedded calendar; busy dates disabled.  
3. **Select Dates** — Choose start/end; system validates duration limits.  
4. **View Estimated Cost** — Live breakdown (base + overrides).  
5. **Submit Request** — Attach project details; submit.  
6. **Reservation Created** — Slots held until `expiresAt`; countdown shown.  
7. **Negotiate Offer** — Message / accept-decline-counter (Requests epic).  
8. **Booking Confirmation** — On accept, reservation converts; slots Booked.  
9. **Status Tracking** — Dashboard shows Confirmed and timeline events.  

Inquiry fallback: if availability is approximate-only, submit inquiry without hard reserve; manufacturer responds with proposed slots then reserve.

---

# Booking Workflow

```
Manufacturer publishes availability
            ↓
Visionary views listing
            ↓
Visionary selects slot / date range
            ↓
Reservation created (capacity locked)
            ↓
Manufacturer reviews request
            ↓
Accept / Decline / Counter-offer
            ↓
Booking confirmed (on accept)
            ↓
Slot status updated → BOOKED
            ↓
Manufacturing begins
```

**Decline / Cancel / Expiry branch:** release reservation → capacity restored → visionary notified to reselect.

---

# Business Rules

| # | Rule |
|---|------|
| 1 | No overlapping exclusive active slots (Available/Reserved/Booked) unless shared capacity mode is enabled |
| 2 | Reservations expire automatically at `expires_at` |
| 3 | Booked slots cannot be edited or deleted; cancellation flow required |
| 4 | Blocked slots are not bookable and are disabled in visionary calendars |
| 5 | Price overrides apply only to the selected overlapping slots/quanta |
| 6 | Capacity cannot become negative under any concurrency scenario |
| 7 | Booking conflicts must be prevented via transactional checks |
| 8 | Confirmations require an unexpired ACTIVE reservation |
| 9 | Duration must respect machinery min/max booking duration |
| 10 | Past-dated availability cannot be newly reserved |
| 11 | Releasing is idempotent; confirming is single-use |
| 12 | Admin overrides are audited |

---

# Admin Features

| Capability | Description |
|------------|-------------|
| **View bookings** | Cross-tenant booking list with filters |
| **Override reservations** | Force-release ACTIVE holds |
| **Resolve booking disputes** | Inspect history; annotate outcomes |
| **Audit booking history** | Immutable event stream |
| **Monitor calendar conflicts** | Alerts for constraint violations / drift |

---

# Security Requirements

| Control | Requirement |
|---------|-------------|
| Ownership validation | Calendar writes via machinery→facility→user |
| Role-based permissions | Manufacturer / Visionary / Admin separation |
| Concurrency protection | Row locks, CAS updates, idempotency keys |
| Audit logging | Reserve/expire/confirm/release/admin override |
| Input validation | Datetime bounds, capacity, TTL ranges |
| Secure APIs | AuthN/Z on all mutating endpoints |
| Rate limiting | Reserve attempts, calendar writes, job triggers |
| Data minimization | Public calendar shows busy/free without peer PII |

---

# Non-functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Calendar range fetch p95 < 300ms for 31-day exclusive slots set (~thousands rows indexed) |
| **Scalability** | Per-inventory partitioning of queries; job horizontal scale |
| **Reliability** | Expiry job at-least-once with idempotent handlers |
| **Availability** | Degraded mode: read-only calendars if write path hot |
| **Security** | OWASP-aligned; no TOCTOU double-book in tests |
| **Accessibility** | Keyboard-accessible date selection; status not color-only |
| **Mobile responsiveness** | Manufacturer and visionary calendars usable on small screens |

---

# Ticket Summary Board

| Ticket | Name | Priority | Points |
|--------|------|----------|--------|
| XFY-022 | Create Availability Slot Database Model | P0 | 8 |
| XFY-023 | Manufacturer Availability Calendar | P0 | 13 |
| XFY-024 | Show Availability on Listing Page | P0 | 8 |
| XFY-025 | Reserve Availability During Request Negotiation | P0 | 13 |
| | **Total** | | **42** |

**Suggested sequencing:** XFY-022 → XFY-023 → XFY-024 → XFY-025

---

# Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Double-booking under load | Transactional locks + concurrency tests |
| Stuck reservations | Expiry job + admin override + metrics |
| Timezone confusion | Store UTC; display facility TZ; document assumption |
| Complex recurrence bugs | Bound horizons; expansion previews; exception overlays |
| Hidden availability hurts conversion | Inquiry fallback + clear UX copy |

---

# Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| AI capacity forecasting | Predict fill and recommend opens |
| Smart scheduling | Auto-propose slots for requests |
| Dynamic pricing | Occupancy-based overrides |
| Calendar sync | Google / Outlook |
| Time zone support | Per-user display densification |
| Partial capacity booking | First-class shared capacity UX |
| Predictive demand planning | Seasonal capacity guidance |
| ERP integration | Push confirmed bookings outbound |
| IoT machine availability | Auto status from machine telemetry |
| Automated maintenance blocking | From CMMS / work orders |

---

## Traceability

| Artifact | Use |
|----------|-----|
| PRD / SRS | Availability & booking capacity requirements |
| Tech Design | Slot model, locking, expiry jobs |
| Jira / Azure DevOps | Import XFY-022–XFY-025 |
| Confluence / Notion | EPIC 4 source of truth |
| Downstream | Requests/Offers consume confirm/release contracts |

---

**X!Y — The Explorer Factory**  
*Why own it when you can make it.*
