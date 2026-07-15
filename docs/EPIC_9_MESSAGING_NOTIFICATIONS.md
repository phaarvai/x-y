# X!Y — The Explorer Factory

## EPIC 9 — Messaging & Notifications

**Tagline:** *Why own it when you can make it.*

**Document Type:** Software Specification · Epic Definition  
**Epic ID:** EPIC-9  
**Version:** 1.0  
**Last Updated:** July 2026  
**Classification:** PRD · SRS · Technical Design Document · Jira / Azure DevOps Backlog · Confluence · Agile Sprint Planning · Developer Documentation  
**Release Mapping:** Release 1 — request-threaded messaging + notification/email MVP; Release 3 — real-time (WebSocket), push, SMS  
**Depends On:** EPIC-1 (Auth) · EPIC-8 (Requests / Offers / Bookings as event sources) · EPIC-5 (attachment security patterns)  
**Enables:** Negotiation velocity, booking awareness, dispute evidence, multi-channel future comms

---

## Epic Summary

**EPIC 9 — Messaging & Notifications** provides the communication backbone for **X!Y — The Explorer Factory**. Every manufacturing request owns a secure conversation thread where participants exchange text and (configurable) file attachments with history, sender identity, timestamps, and read status. In parallel, an event-driven **Notification Service** creates in-app notifications and branded emails for lifecycle events (requests, offers, bookings, messages, payments, reviews), respecting user preferences, with delivery tracking, badges, and audit history.

MVP uses REST polling (or short polling intervals) with a **real-time-ready** architecture so WebSockets, push, and SMS can be added without redesigning domain models or public notification contracts.

---

## Business Objective

- Keep negotiation on-platform (reduce offline email/WhatsApp leakage)  
- Ensure participants never miss critical commercial events  
- Provide auditable communication for disputes and trust  
- Support high-volume, reliable notification delivery with retries  
- Respect preference controls to reduce unsubscribe/spam risk  
- Establish channels extensible to push, SMS, WhatsApp, and AI assists  

---

## User Value

| Audience | Value |
|----------|-------|
| Visionaries & Manufacturers | Contextual chat per request; timely alerts on counters/bookings |
| Ecosystem roles (later) | Same notification fabric for their workflows |
| Admins | Policy-controlled dispute access; delivery ops visibility |
| Platform | Higher response rates; measurable engagement; compliance-ready logs |

---

## Scope

EPIC 9 covers request-based messaging threads, messages, attachments, read status, notification creation/delivery, in-app notification center, email notifications with templates/queues, preferences, badges, histories, admin policy access, and architecture notes for future real-time channels.

---

## In Scope

- One conversation thread per manufacturing request  
- Text messaging + configurable file attachments  
- Message history, sender display, timestamps, read status  
- Event-driven notifications for major platform events  
- In-app notification center (list, read, open deep link)  
- Email notifications with preferences, templates, queue, retries, logs  
- Notification badges and history  
- Admin access to conversations under dispute policy  
- Real-time-ready contracts (events + client sync cursors)  

---

## Out of Scope

- Production WebSocket gateway (design hooks only)  
- Push/SMS/WhatsApp providers live (future)  
- Voice/video calls, reactions, typing indicators (future; read receipts partial MVP)  
- End-to-end encryption (transport + at-rest recommendations only)  
- AI auto-replies / translation (future)  
- Cross-request group chat unrelated to a request (future)  

---

## Role Prerequisites

| Role | Capability |
|------|------------|
| Request participants (`VISIONARY`, `MANUFACTURER`) | Message in thread; receive notifications |
| Authenticated users | Notification center + preferences |
| `PLATFORM_ADMIN` | Dispute-policy conversation access; template/event ops |

---

# Features Included

## Feature F1 — Request-Based Messaging

### Purpose
Bind all negotiation chat to a manufacturing request context.

### Business Value
Keeps evidence and terms collocated with the deal object.

### User Benefits
No hunting across unrelated inboxes.

### Functional Requirements
Auto-create thread when request is submitted; participants = requester + listing owner (expandable).

### Validation Rules
Exactly one thread per request.

### Permissions
Participants only; admin if policy allows.

### Error Handling
Missing thread on read → create lazily if request valid.

### Future Enhancements
Multi-party invite (vendor/legal) into same thread.

---

## Feature F2 — Conversation Threads

### Purpose
Container for ordered messages and metadata (status, archive).

### Business Value
Lifecycle control (active vs archived after completion).

### User Benefits
Clear conversation list entry points from request detail.

### Functional Requirements
Thread list for user; link to request; archive rules.

### Validation Rules
Archive does not delete history.

### Permissions
Participant ACL.

### Error Handling
`404` non-participant (prefer over 403 for enumeration control—policy choice: use 403).

### Future Enhancements
Pin threads; mute thread.

---

## Feature F3 — Text Messaging

### Purpose
Send/receive plain/rich-text (sanitized) messages.

### Business Value
Core negotiation channel.

### User Benefits
Fast clarification of specs and terms.

### Functional Requirements
Create message; list with cursor pagination; soft-delete policy optional.

### Validation Rules
1–5000 chars; no empty; sanitize HTML if allowed.

### Permissions
Participants; blocked after hard archive configurable.

### Error Handling
`429` rate limit; `400` empty.

### Future Enhancements
Mentions; snippets from offers.

---

## Feature F4 — File Attachments

### Purpose
Share files inside the thread.

### Business Value
Technical diligence without external drives.

### User Benefits
Drawings/quotes in context.

### Functional Requirements
Upload link to message; type/size limits; secure download.

### Validation Rules
Reuse EPIC-5 patterns; configurable allow-list.

### Permissions
Same as message ACL.

### Error Handling
`413`/`415`; scan pending gate.

### Future Enhancements
Inline image previews; virus scan full.

---

## Feature F5 — Message History

### Purpose
Complete chronological record.

### Business Value
Disputes and continuity.

### User Benefits
Scrollback across devices.

### Functional Requirements
Cursor pagination oldest/newest; immutable body (edits optional later).

### Validation Rules
Page size bounds.

### Permissions
Participants.

### Error Handling
Stale cursor → refresh.

### Future Enhancements
Full-text search in thread.

---

## Feature F6 — Read Status

### Purpose
Track whether recipients have read messages/notifications.

### Business Value
SLA insight; UX badges.

### User Benefits
Know if counterparty has seen latest.

### Functional Requirements
Per-user last_read_at on thread; message-level receipts optional MVP.

### Validation Rules
Monotonic last_read cursor.

### Permissions
Self update; others see aggregate “seen”.

### Error Handling
Ignore regressive timestamps.

### Future Enhancements
Per-message receipts; typing.

---

## Feature F7 — Timestamps

### Purpose
Store/display created times in UTC; render local TZ.

### Business Value
Ordering & audit.

### User Benefits
Understand sequence.

### Functional Requirements
ISO-8601 API timestamps; relative UI optional.

### Validation Rules
Server clock authoritative.

### Permissions
N/A.

### Error Handling
N/A.

### Future Enhancements
Edit timestamps.

---

## Feature F8 — Notification Service

### Purpose
Central event → notification fan-out.

### Business Value
Reliable cross-channel alerting.

### User Benefits
Single source of truth for alerts.

### Functional Requirements
Create notification records; categories; priority; delivery tracking; retries; idempotency by event key.

### Validation Rules
Deduplicate `(event_type, event_id, user_id)`.

### Permissions
System write; user read own.

### Error Handling
Retry with backoff; dead-letter log.

### Future Enhancements
Multi-channel orchestration.

---

## Feature F9 — Email Notifications

### Purpose
Branded email for major events.

### Business Value
Reach users outside active sessions.

### User Benefits
Don’t miss accept/counter/booking.

### Functional Requirements
Template render; queue; prefer respect; retry; EmailLog.

### Validation Rules
Valid email; preference flags; unsubscribe link.

### Permissions
User preference ownership.

### Error Handling
Provider failures logged; no user-facing crash.

### Future Enhancements
Localization; digests.

---

## Feature F10 — In-App Notification Center

### Purpose
In-product inbox of notifications.

### Business Value
Drives return visits and deep links to work items.

### User Benefits
Triage alerts in one place.

### Functional Requirements
List, unread count, mark one/all read, open related entity, optional archive.

### Validation Rules
Pagination; ACL on deep links.

### Permissions
Own notifications only.

### Error Handling
Broken link targets handled gracefully.

### Future Enhancements
Filters by category.

---

## Feature F11 — Notification Preferences

### Purpose
User control over channels/categories.

### Business Value
Compliance (consent) + deliverability.

### User Benefits
Reduce noise.

### Functional Requirements
Per-event and channel toggles; defaults on for critical transactional email.

### Validation Rules
Cannot disable legally required security emails (policy).

### Permissions
Self-service.

### Error Handling
Invalid keys → `400`.

### Future Enhancements
Quiet hours; digest frequency.

---

## Feature F12 — Notification Badges

### Purpose
Surface unread counts in nav/UI.

### Business Value
Increases engagement with pending actions.

### User Benefits
Immediate awareness.

### Functional Requirements
Unread notifications + optional unread messages counts.

### Validation Rules
Non-negative; cached briefly.

### Permissions
Own counts.

### Error Handling
Fail soft to 0.

### Future Enhancements
Per-facility badges for manufacturers.

---

## Feature F13 — Notification History

### Purpose
Retain notification audit beyond read state.

### Business Value
Support/debug delivery.

### User Benefits
Find old alerts.

### Functional Requirements
`NotificationHistory`/immutable rows; UI pagination.

### Validation Rules
Retention policy configurable.

### Permissions
User own; admin broader.

### Error Handling
N/A.

### Future Enhancements
Export.

---

## Feature F14 — Admin Message Access (Policy Controlled)

### Purpose
Allow admins to view threads only when dispute policy permits.

### Business Value
Evidence for resolution without routine surveillance.

### User Benefits
Fair dispute handling.

### Functional Requirements
Flag `dispute_access_enabled`; every admin read audited.

### Validation Rules
Deny by default.

### Permissions
Admin + active dispute case linkage recommended.

### Error Handling
`403` without policy grant.

### Future Enhancements
Redaction tools.

---

## Feature F15 — Future Real-Time Messaging Support

### Purpose
Architect for WebSocket/push without schema churn.

### Business Value
Lower latency roadmap at low redesign cost.

### User Benefits
Live chat later with same threads.

### Functional Requirements
Domain events `message.created`, cursor sync APIs; channel abstraction.

### Validation Rules
N/A MVP.

### Permissions
Same ACL at gateway.

### Error Handling
Realtime fallback to poll.

### Future Enhancements
Socket rooms per threadId.

---

# Developer Tickets

---

## Ticket XFY-044

### Ticket ID
`XFY-044`

### Ticket Name
Request-Based Messaging

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`13`

### Epic
`EPIC-9 — Messaging & Notifications`

### User Story
As a request participant, I want a secure conversation thread on each manufacturing request so that I can exchange messages and files in context.

### Business Value
Keeps negotiation on-platform and creates an auditable communication trail per deal.

### Description
Create one conversation per manufacturing request. Support text send, configurable attachments, chronological history, sender identity, timestamps, replies in-thread. ACL: participants only; admin only under dispute policy. Responsive UI.

### Functional Requirements
1. Auto-create `MessageThread` on request submit (or first message).  
2. Exactly one thread per request.  
3. Send text; optional attachments.  
4. List history chronological with pagination.  
5. Show sender name/role and timestamps.  
6. Enforce participant ACL; policy-controlled admin access.  
7. Update thread `last_message_at` / read cursors.  
8. Emit `message.created` for notification service.  

### UI Requirements (if frontend)

#### Conversation Architecture (UI)
- Entry: Request detail → Messages tab / “Open chat”  
- Layout: message list + composer; attachment chips  
- Bubbles: mine vs theirs; sender label for multi-party future  
- Empty: “Say hello—ask about capacity, materials, or terms.”  
- Loading skeletons; send pending state; failed send retry  
- Mobile full-screen thread  

#### Messaging Workflow (UI)
Open thread → load history → compose → send → optimistic append → reconcile IDs → badge clear on read.

### Backend Requirements (if backend)
Thread service; message service; attachment storage; ACL middleware; event publish; rate limits.

### Acceptance Criteria
- [ ] One conversation per request  
- [ ] Messages displayed chronologically  
- [ ] Attachments supported (when enabled)  
- [ ] Sender identity displayed  
- [ ] Secure access control  
- [ ] Responsive UI  

### Validation Rules
Message body required unless attachment-only allowed by config; max length; attachment type/size; participant must belong to request.

### Permissions
| Actor | Access |
|-------|--------|
| Visionary requester | Read/write |
| Manufacturer owner | Read/write |
| Other users | Deny |
| Admin | Read only if dispute policy grant; audited |

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/requests/{requestId}/thread` | `GET` |
| `/api/threads/{threadId}/messages` | `GET` `POST` |
| `/api/messages/{messageId}/attachments` | `POST` |
| `/api/threads/{threadId}/read` | `POST` |
| `/api/admin/threads/{threadId}` | `GET` (policy) |

### Request Payload
**Send message**
```json
{
  "body": "Can you confirm anodize is available in the proposed window?",
  "clientMessageId": "cmsg_9f3a"
}
```

### Response Payload
```json
{
  "message": {
    "id": "msg_01H...",
    "threadId": "thr_01H...",
    "senderUserId": "usr_vis_1",
    "senderName": "Ananya Mehta",
    "senderRole": "VISIONARY",
    "body": "Can you confirm anodize is available in the proposed window?",
    "createdAt": "2026-07-15T10:00:00.000Z",
    "attachments": []
  }
}
```

**History**
```json
{
  "messages": [ "..." ],
  "nextCursor": "eyJvZmZzZXQiOjIwfQ",
  "participants": [
    { "userId": "usr_vis_1", "name": "Ananya Mehta", "role": "VISIONARY", "lastReadAt": "2026-07-15T10:01:00.000Z" }
  ]
}
```

### Database Tables
`MessageThread`, `Message`, `MessageAttachment`

### Database Fields
See Database Design.

### Entity Relationships
Request 1—1 MessageThread; Thread 1—* Message; Message 1—* Attachment; Thread *—* Participants (or derived from request).

### Conversation Architecture
```
Request
  └─ MessageThread (1:1)
        ├─ participants (derived)
        ├─ messages (time-ordered)
        └─ read cursors per user
Events: message.created → Notification Service
Future: WebSocket room = threadId
```

### Error Handling
`403` non-participant; `404` unknown thread; `429` spam; attach failures don’t orphan message if transactional policy says all-or-nothing.

### Security Considerations
Sanitize body; signed attachment URLs; rate limit; IDOR protection; audit admin reads; encrypt at rest for attachments.

### Edge Cases
Request cancelled → read-only thread; duplicate `clientMessageId` idempotent; large history pagination; concurrent sends.

### Dependencies
EPIC-8 Request; object storage; auth.

### Testing Checklist
- [ ] Thread auto-create  
- [ ] ACL deny outsider  
- [ ] Chronological order  
- [ ] Attachment upload/download  
- [ ] Idempotent clientMessageId  
- [ ] Mobile composer  

### Definition of Done
UX accepted; ACL tests in CI; events reach notification consumer in staging.

---

## Ticket XFY-045

### Ticket ID
`XFY-045`

### Ticket Name
Notification Service

### Priority
`P0 — Critical`

### Type
`Backend` · `Platform` · `Story`

### Story Points
`13`

### Epic
`EPIC-9 — Messaging & Notifications`

### User Story
As a platform user, I want automatic notifications for important marketplace events so that I can act quickly on requests, offers, bookings, and messages.

### Business Value
Reduces missed negotiations and increases booking conversion through timely awareness.

### Description
Build event-driven notification service creating in-app (and channel fan-out) notifications for: New Request, Accepted, Declined, Counter Offer, Booking Confirmed, New Message, Payment Status Changed, Review Received, Booking Cancelled, Availability Updated. Support creation, delivery tracking, read status, categories, priority, retries, audit history, idempotency.

### Functional Requirements
1. Subscribe to domain events from Requests/Offers/Bookings/Messages/Payments/Reviews/Availability.  
2. Create Notification rows with category/priority.  
3. Deduplicate by event key.  
4. Track delivery state per channel.  
5. Retry transient failures.  
6. Maintain NotificationHistory / audit.  
7. Expose APIs for list/read used by XFY-047.  

### UI Requirements (if frontend)
N/A (consumed by notification center). Admin ops dashboards optional later.

### Backend Requirements (if backend)
Event bus/outbox consumer; notification writer; channel dispatcher interface (IN_APP, EMAIL); retry worker; metrics.

### Acceptance Criteria
- [ ] Notifications created automatically for listed events  
- [ ] Event-driven architecture  
- [ ] Reliable delivery (at-least-once with idempotent handling)  
- [ ] Audit history maintained  

### Validation Rules
Known event types only; recipient must be valid user; deep link target authorized for recipient.

### Permissions
System create; users read own; admin monitor.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/notifications` | `GET` |
| `/api/notifications/{id}` | `GET` |
| `/api/notifications/{id}/read` | `POST` |
| `/api/notifications/read-all` | `POST` |
| `/api/internal/notifications/dispatch` | `POST` secured worker |
| `/api/admin/notifications/delivery` | `GET` |

### Request Payload
Internal event example:
```json
{
  "eventType": "COUNTER_OFFER_RECEIVED",
  "eventId": "off_01H...",
  "occurredAt": "2026-07-15T10:05:00.000Z",
  "actorUserId": "usr_mfg_1",
  "recipientUserIds": ["usr_vis_1"],
  "payload": {
    "requestId": "mreq_01H...",
    "offerId": "off_01H...",
    "title": "New counter-offer",
    "body": "Manufacturer proposed updated dates and price."
  }
}
```

### Response Payload
User list:
```json
{
  "unreadCount": 3,
  "items": [
    {
      "id": "ntf_01H...",
      "category": "NEGOTIATION",
      "priority": "HIGH",
      "title": "New counter-offer",
      "description": "Manufacturer proposed updated dates and price.",
      "status": "UNREAD",
      "createdAt": "2026-07-15T10:05:00.000Z",
      "related": { "type": "REQUEST", "id": "mreq_01H..." }
    }
  ]
}
```

### Database Tables
`Notification`, `NotificationHistory`, delivery fields or `NotificationDelivery`

### Database Fields
See Database Design.

### Entity Relationships
User 1—* Notification; Notification ← event reference; History append-only.

### Notification Architecture
```
Domain service commits business change + outbox event
        ↓
Notification Consumer
        ↓
Idempotency check (eventType+eventId+userId)
        ↓
Create Notification (IN_APP stored)
        ↓
Dispatch channels (EMAIL if prefs) via queue
        ↓
Update delivery status / retry / DLQ
        ↓
History + metrics
```

### Event Flow (examples)
| Event | Recipients |
|-------|------------|
| New Request | Manufacturer |
| Accepted / Declined | Visionary |
| Counter Offer | Counterparty |
| Booking Confirmed | Both |
| New Message | Other participant(s) |
| Payment Status | Both |
| Review Received | Reviewee |
| Booking Cancelled | Both |
| Availability Updated | Optional watchers / requester if active hold |

### Error Handling
Poison events → DLQ; partial channel failure doesn’t delete in-app notification.

### Security Considerations
Prefer deep links to IDs with ACL at destination; no sensitive payloads in email plain text beyond need; secure worker endpoints.

### Edge Cases
Burst message fan-out; user deleted; preference muted category; duplicate event replays.

### Dependencies
EPIC-8 events; identity service; email queue (XFY-046); outbox infra.

### Testing Checklist
- [ ] Each event type creates notification  
- [ ] Idempotent replay  
- [ ] Retry behavior  
- [ ] History written  
- [ ] Wrong recipient never receives  

### Definition of Done
Consumer running in staging; runbook for DLQ; OpenAPI for user APIs; metrics dashboard basic.

---

## Ticket XFY-046

### Ticket ID
`XFY-046`

### Ticket Name
Email Notifications

### Priority
`P1 — High`

### Type
`Backend` · `Full-stack` (prefs UI) · `Story`

### Story Points
`8`

### Epic
`EPIC-9 — Messaging & Notifications`

### User Story
As a user, I want branded emails for major platform events according to my preferences so that I stay informed even when I am not in the app.

### Business Value
Extends engagement beyond session; supports conversion on time-sensitive counters and bookings.

### Description
Send branded emails: Welcome, New Request, Accepted, Declined, Counter Offer, Booking Confirmation, New Message, Payment Updates, Review Received. Features: preferences, HTML templates, retries, failed logging, queue-based sending.

### Functional Requirements
1. Template registry per email type.  
2. Enqueue EmailQueue jobs from notification dispatcher.  
3. Render HTML (+ text fallback).  
4. Respect NotificationPreference email flags.  
5. Retry with backoff; log failures in EmailLog.  
6. Preferences API + settings UI.  

### UI Requirements (if frontend)
Settings → Notifications: toggles per category/channel; critical transactional emails marked required.

### Backend Requirements (if backend)
Mail provider adapter; template engine; queue worker; preference service; bounce handling hook stub.

### Acceptance Criteria
- [ ] Emails sent successfully for major events  
- [ ] Preferences respected  
- [ ] Failures logged  
- [ ] Templates reusable  

### Validation Rules
Email format; unsubscribe token; template variables allow-list.

### Permissions
User edits own prefs; system send; admin template manage.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/users/me/notification-preferences` | `GET` `PUT` |
| `/api/admin/email/templates` | `GET` `PUT` |
| `/api/admin/email/logs` | `GET` |
| `/api/internal/email/send` | `POST` worker |

### Request Payload
**Preferences**
```json
{
  "email": {
    "NEW_REQUEST": true,
    "COUNTER_OFFER": true,
    "NEW_MESSAGE": false,
    "MARKETING": false
  },
  "inApp": {
    "NEW_MESSAGE": true
  }
}
```

### Response Payload
```json
{
  "preferences": { "...": "..." },
  "updatedAt": "2026-07-15T10:10:00.000Z"
}
```

### Email Workflow
```
Notification dispatch EMAIL channel
    ↓
Check preferences (skip if disabled & not mandatory)
    ↓
Enqueue EmailQueue (templateId, to, vars, idempotencyKey)
    ↓
Worker renders template → provider send
    ↓
Success → EmailLog SENT
Failure → retry / EmailLog FAILED
```

### Template Architecture
| Template Key | Variables (examples) |
|--------------|----------------------|
| WELCOME | name, ctaUrl |
| NEW_REQUEST | manufacturerName, requestUrl, dates |
| REQUEST_ACCEPTED | visionaryName, requestUrl |
| REQUEST_DECLINED | reason summary, requestUrl |
| COUNTER_OFFER | price, dates, offerUrl |
| BOOKING_CONFIRMATION | reference, termsUrl |
| NEW_MESSAGE | preview, threadUrl |
| PAYMENT_UPDATE | status, amount, bookingUrl |
| REVIEW_RECEIVED | rating, listingUrl |

Shared layout: brand header, footer legal, unsubscribe for non-mandatory.

### Queue Design
- Durable queue (DB outbox / Redis / SQS-style)  
- Fields: id, template, payload, attempts, next_attempt_at, status  
- Visibility timeout; max attempts; DLQ table/status  

### Logging Strategy
Every attempt → EmailLog with provider message id, error, latency; correlate `notification_id` + `idempotency_key`; PII minimization in logs.

### Database Tables
`EmailQueue`, `EmailLog`, `NotificationPreference`

### Database Fields
See Database Design.

### Entity Relationships
Notification 0—*{EmailQueue}; User 1—1 prefs.

### Error Handling
Provider 5xx retry; 4xx bad address mark FAILED no retry; never block domain transaction.

### Security Considerations
Signed unsubscribe; template injection prevention; secret API keys; suppress listing of emails in admin without auth.

### Edge Cases
User changes email mid-queue; preference flip before send; bounce storms.

### Dependencies
XFY-045; email provider credentials; prefs UI.

### Testing Checklist
- [ ] Template renders  
- [ ] Pref off skips  
- [ ] Retry then fail log  
- [ ] Idempotent send  
- [ ] Welcome on register hook  

### Definition of Done
Staging emails received; admin can view failed logs; templates documented.

---

## Ticket XFY-047

### Ticket ID
`XFY-047`

### Ticket Name
In-App Notification Center

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`8`

### Epic
`EPIC-9 — Messaging & Notifications`

### User Story
As a user, I want an in-app notification center with unread badges so that I can review alerts and jump to the related request, booking, or message.

### Business Value
Increases action completion on time-sensitive marketplace events.

### Description
Notification center UI/API: view list, unread count, mark one/all read, open related page, optional delete/archive. Display icon, title, description, timestamp, status, related object. Badge updates, pagination, responsive, fast loading. Dashboard/nav integration.

### Functional Requirements
1. List notifications newest first.  
2. Unread badge count in nav.  
3. Mark one read / mark all read.  
4. Deep link to related entity with ACL.  
5. Optional archive/delete.  
6. Pagination.  
7. Polling interval MVP (realtime later).  

### UI Requirements (if frontend)

#### UX Flow
```
See badge → open notification center panel/page
    ↓
Scan items → click item
    ↓
Mark read + navigate related
    ↓
Badge decrements
```

#### Display Row
Icon by category; title; description (2 lines); relative time; unread dot; related chip.

#### States
Loading; empty “You’re all caught up”; error retry; mark-all busy.

#### Dashboard Integration
Bell in global nav; manufacturer/visionary dashboards show same feed; optional “Needs attention” filtered high priority.

#### Responsive
Desktop dropdown panel; mobile full page.

### Backend Requirements (if backend)
Efficient unread count query; mark read endpoints; ensure deep link authorization.

### Acceptance Criteria
- [ ] Notification badge updates  
- [ ] Pagination  
- [ ] Responsive UI  
- [ ] Fast loading  

### Validation Rules
Page size ≤ 50; archive only own.

### Permissions
Own notifications only.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/notifications` | `GET` |
| `/api/notifications/unread-count` | `GET` |
| `/api/notifications/{id}/read` | `POST` |
| `/api/notifications/read-all` | `POST` |
| `/api/notifications/{id}/archive` | `POST` optional |

### Request Payload
Mark all: `{}`

### Response Payload
Unread count: `{ "unreadCount": 3 }`  
List per XFY-045.

### Database Tables
`Notification`

### Database Fields
`read_at`, `archived_at`, indexes on `(user_id, read_at, created_at)`.

### Entity Relationships
User → notifications.

### Error Handling
Related object missing → show notice, still markable read.

### Security Considerations
Deep link must not escalate privileges; IDOR on notification ids.

### Edge Cases
Burst mark-all; badge cache staleness; concurrent new notification while open.

### Dependencies
XFY-045; nav shell; router maps for request/booking/thread.

### Testing Checklist
- [ ] Badge increments on event  
- [ ] Mark read / all  
- [ ] Navigation ACL  
- [ ] Pagination  
- [ ] Mobile panel  

### Definition of Done
UX accepted; p95 list < 300ms with fixtures; analytics clicks tracked.

---

# Database Design

## ER Overview (text)

```
Request 1──1 MessageThread 1──* Message 1──* MessageAttachment
User 1──* Notification
User 1──1 NotificationPreference
Notification 1──* EmailQueue 1──* EmailLog
Notification 1──* NotificationHistory
```

## `MessageThread`

| Column | PK/FK | Notes |
|--------|-------|-------|
| id | PK | |
| request_id | FK UNIQUE | one thread per request |
| status | ACTIVE/ARCHIVED | |
| last_message_at | timestamptz | INDEX |
| created_at | | |

## `Message`

| Column | Notes |
|--------|-------|
| id PK | |
| thread_id FK | INDEX (thread_id, created_at) |
| sender_user_id FK | |
| body | text |
| client_message_id | nullable UNIQUE(thread_id, client_message_id) |
| created_at | |
| deleted_at | soft optional |

## `MessageAttachment`

| Column | Notes |
|--------|-------|
| id PK | |
| message_id FK | |
| storage_key / file_name / content_type / size_bytes | |
| scan_status | |
| created_at | |

## `Notification`

| Column | Notes |
|--------|-------|
| id PK | |
| user_id FK | INDEX |
| category | REQUEST/NEGOTIATION/BOOKING/MESSAGE/PAYMENT/REVIEW/SYSTEM |
| priority | LOW/NORMAL/HIGH |
| event_type | |
| event_id | |
| title / description | |
| related_type / related_id | |
| status | UNREAD/READ/ARCHIVED |
| read_at / archived_at | |
| created_at | |
| UNIQUE(user_id, event_type, event_id) | idempotency |

## `NotificationPreference`

| Column | Notes |
|--------|-------|
| user_id PK/FK | |
| preferences jsonb | channel × event toggles |
| updated_at | |

## `EmailQueue`

| Column | Notes |
|--------|-------|
| id PK | |
| notification_id FK nullable | |
| to_email | |
| template_key | |
| payload jsonb | |
| idempotency_key UNIQUE | |
| status | PENDING/PROCESSING/SENT/FAILED/DEAD |
| attempts | |
| next_attempt_at | INDEX |
| created_at / updated_at | |

## `EmailLog`

| Column | Notes |
|--------|-------|
| id PK | |
| email_queue_id FK | |
| provider_message_id | |
| status | |
| error | |
| latency_ms | |
| created_at | |

## `NotificationHistory`

| Column | Notes |
|--------|-------|
| id PK | |
| notification_id FK | |
| event | CREATED/DISPATCHED/READ/ARCHIVED/FAILED_CHANNEL |
| payload jsonb | |
| created_at | |

## Optional: `ThreadReadState`

| Column | Notes |
|--------|-------|
| thread_id + user_id PK | |
| last_read_at | |
| last_read_message_id | |

## Indexes & Constraints
- Messages by thread time  
- Notifications unread partial index `(user_id) WHERE read_at IS NULL`  
- Email queue due pointer  
- Unique idempotency keys  

---

# REST API Summary

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/requests/{requestId}/thread` | `GET` | Get/create thread for request | Participant |
| `/api/threads` | `GET` | List my threads | Auth |
| `/api/threads/{threadId}/messages` | `GET` | Message history | Participant |
| `/api/threads/{threadId}/messages` | `POST` | Send message | Participant |
| `/api/messages/{messageId}/attachments` | `POST` | Attach file | Participant |
| `/api/threads/{threadId}/read` | `POST` | Update read cursor | Participant |
| `/api/notifications` | `GET` | Notification center list | Auth |
| `/api/notifications/unread-count` | `GET` | Badge count | Auth |
| `/api/notifications/{id}/read` | `POST` | Mark one read | Owner |
| `/api/notifications/read-all` | `POST` | Mark all read | Auth |
| `/api/notifications/{id}/archive` | `POST` | Archive | Owner |
| `/api/users/me/notification-preferences` | `GET` `PUT` | In-app/email prefs | Auth |
| `/api/admin/threads/{threadId}` | `GET` | Dispute policy access | Admin |
| `/api/admin/email/templates` | `GET` `PUT` | Manage templates | Admin |
| `/api/admin/email/logs` | `GET` | Failed/sent logs | Admin |
| `/api/admin/notifications/delivery` | `GET` | Delivery monitoring | Admin |
| `/api/internal/notifications/dispatch` | `POST` | Worker dispatch | Service |
| `/api/internal/email/send` | `POST` | Email worker | Service |

---

# Messaging Workflow

```
Manufacturing Request Created
        ↓
Conversation Thread Created
        ↓
Participants Exchange Messages
        ↓
Attachments Uploaded
        ↓
Notifications Generated
        ↓
Email Sent (if enabled)
        ↓
Conversation Archived After Completion
```

---

# Notification Workflow

```
Platform Event
        ↓
Notification Event Generated
        ↓
Notification Stored
        ↓
In-App Notification Delivered
        ↓
Email Sent (if enabled)
        ↓
User Opens Notification
        ↓
Marked as Read
```

---

# Business Rules

| # | Rule |
|---|------|
| 1 | Every request has exactly one conversation thread |
| 2 | Only participants can send and read messages |
| 3 | Deleted/cancelled requests retain message history for auditing (configurable) |
| 4 | Notifications are immutable except for read/archive state |
| 5 | Email delivery respects user notification preferences |
| 6 | Duplicate notifications for the same event should be prevented |
| 7 | Notification links must point to authorized resources only |
| 8 | Admin conversation access is denied by default and audited when granted |
| 9 | Critical transactional emails may be non-disableable (security/booking) |
| 10 | Message send is idempotent when `clientMessageId` is reused |

---

# Admin Features

| Capability | Description |
|------------|-------------|
| **View conversations** | Policy-controlled dispute access with audit |
| **Monitor notification delivery** | Success/failure rates, lag |
| **Manage email templates** | Edit branded HTML templates |
| **Configure notification events** | Enable/disable event→channel mappings |
| **View failed email logs** | Diagnose provider issues |
| **Audit communication history** | Message/notification admin trails |

---

# Security Requirements

| Control | Requirement |
|---------|-------------|
| Role-based permissions | Participant vs admin policy |
| Ownership validation | Request membership for threads |
| Secure file attachments | Private storage; signed URLs; scan gate |
| Attachment size/type validation | Allow-list + limits |
| Input sanitization | XSS-safe message bodies |
| Audit logging | Admin reads; preference changes; delivery failures |
| Rate limiting | Message send; notification list scraping |
| Spam prevention | Burst caps; block links malware heuristics optional |
| Encryption recommendations | TLS in transit; DB/object encryption at rest; secrets in vault |

---

# Non-functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Message send p95 < 300ms; notification list p95 < 300ms |
| **Scalability** | Queue-based email; cursor pagination; partition-friendly IDs |
| **Reliability** | At-least-once events with idempotency; email retries |
| **Security** | ACL on every read path |
| **Accessibility** | Live regions for new messages optional; readable timestamps |
| **Mobile responsiveness** | Full thread + notification center on mobile |
| **High-volume notifications** | Worker concurrency; backoff; DLQ; batch preference |

---

# Success Metrics

| KPI | Definition |
|-----|------------|
| **Average message response time** | Median time between inbound and reply in-thread |
| **Notification delivery success rate** | Successful channel deliveries / attempts |
| **Email open rate** | Opens / delivered (provider) |
| **Notification click-through rate** | Opens of related entity / notifications shown |
| **Conversation completion rate** | Threads with ≥1 bilateral exchange / requests |
| **User engagement** | DAU with messaging or notification opens |
| **Message latency** | Client send → persisted visible |
| **Support resolution time** | Disputes with message evidence cycle time |

---

# Ticket Summary Board

| Ticket | Name | Priority | Points |
|--------|------|----------|--------|
| XFY-044 | Request-Based Messaging | P0 | 13 |
| XFY-045 | Notification Service | P0 | 13 |
| XFY-046 | Email Notifications | P1 | 8 |
| XFY-047 | In-App Notification Center | P0 | 8 |
| | **Total** | | **42** |

**Suggested sequencing:** XFY-044 → XFY-045 → XFY-047 → XFY-046

---

# Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Notification storms from chatty messages | Debounce “New Message” emails; batch; in-app only for high frequency |
| Offline leakage still attractive | Superior UX + attachments + speed |
| Email deliverability | Preferential critical mail; preferences; bounce handling |
| Admin overreach | Default deny + dispute linkage + audit |
| Realtime delay on MVP poll | Short poll on open thread; document upgrade path |

---

# Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| WebSocket real-time messaging | Live thread updates |
| Push notifications | Mobile/web push |
| SMS notifications | Critical booking alerts |
| WhatsApp integration | Regional channel preference |
| Voice messages | Async audio notes |
| Message reactions | Quick acknowledgements |
| Typing indicators | Presence UX |
| Read receipts | Per-message |
| AI-generated replies | Draft responses |
| Automatic message translation | Cross-language negotiation |
| Voice/video calls | Complex diligence |
| End-to-end encryption | Heightened confidentiality mode |

---

## Traceability

| Artifact | Use |
|----------|-----|
| PRD / SRS | Messaging & notification requirements |
| Tech Design | Threads, events, queues, realtime readiness |
| Jira / Azure DevOps | Import XFY-044–XFY-047 |
| Confluence / Notion | EPIC 9 source of truth |
| Downstream | EPIC-8 event producers; dispute ops |

---

**X!Y — The Explorer Factory**  
*Why own it when you can make it.*
