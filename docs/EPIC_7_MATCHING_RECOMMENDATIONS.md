# X!Y — The Explorer Factory

## EPIC 7 — Matching & Recommendations

**Tagline:** *Why own it when you can make it.*

**Document Type:** Software Specification · Epic Definition  
**Epic ID:** EPIC-7  
**Version:** 1.0  
**Last Updated:** July 2026  
**Classification:** PRD · SRS · Technical Design Document · Jira / Azure DevOps Backlog · Confluence · Agile Sprint Planning · Developer Documentation  
**Release Mapping:** Release 1 — rule-based MVP; Release 3 — AI/ML extension without API breakage  
**Depends On:** EPIC-1 (Auth) · EPIC-2 (Facility) · EPIC-3 (Machinery) · EPIC-4 (Availability) · EPIC-5 (Requirements + ACL/NDA) · EPIC-6 (Search projections useful as signals)  
**Enables:** Faster RFQ routing, higher booking conversion, feedback loop for future learning systems

---

## Epic Summary

**EPIC 7 — Matching & Recommendations** introduces an intelligent recommendation layer for **X!Y — The Explorer Factory**. After a visionary publishes a project requirement, the platform generates a **ranked list of suitable manufacturers** (and, by extension, service providers) using a **configurable rule-based scoring engine**. Manufacturers see **matched opportunities** on their dashboards and can express interest or decline with feedback.

MVP matching is deterministic and explainable. The system architecture isolates scoring behind stable APIs so Release 3 can swap or hybridize in AI/ML rankers **without changing external contracts**.

---

## Business Objective

- Reduce time from requirement publish to qualified manufacturer outreach  
- Improve match quality vs. manual browsing alone  
- Increase inquiry → negotiation → booking conversion  
- Give manufacturers relevant inbound demand with less noise  
- Make matching transparent via human-readable explanations  
- Let admins tune criteria weights without code deploys  
- Future-proof for AI/ML while shipping business value early  

---

## User Value

| Audience | Value |
|----------|-------|
| Visionaries | Instant shortlist of fit manufacturers with scores and reasons |
| Manufacturers | Curated opportunity feed aligned to capabilities and capacity |
| Service providers (R2+) | Same recommendation patterns for adjacent services |
| Admins | Tunable matching quality; analytics on engagement |
| Platform | Network effects; data for later ML; higher marketplace liquidity |

---

## Scope

EPIC 7 covers rule-based matching engine, score storage, explanations, weight configuration, visionary recommendation UX after publish, manufacturer opportunity recommendations, interest/decline feedback capture, refresh/recalculation triggers, caching, admin tuning/analytics hooks, and AI-ready architecture boundaries.

---

## In Scope

- Rule-based scoring across defined business criteria  
- Ranked manufacturer recommendations for requirements  
- Requirement opportunity recommendations for manufacturers  
- Service-provider recommendation hooks (schema/API ready; full R2 marketplace optional)  
- Match explanations (human-readable)  
- Configurable scoring weights + enable/disable criteria  
- Recommendation refresh on data/requirement changes  
- Feedback capture (interest/decline) for future learning  
- Stable recommendation APIs designed for AI backend swap  

---

## Out of Scope

- Production AI/ML model training and serving (architecture only)  
- Collaborative filtering / vector semantic search as primary MVP ranker  
- Continuous automated weight learning (future)  
- Guaranteed global optimal matching / auction assignment  
- Auto-send requests without visionary multi-select confirmation  
- Replacing EPIC-6 search (recommendations complement search)  

---

## Role Prerequisites

| Role | Capability |
|------|------------|
| `VISIONARY` | View recommendations for own requirements; select & send requests |
| `MANUFACTURER` | View opportunity recommendations; interest/decline |
| `PLATFORM_ADMIN` | Configure weights; analytics; overrides; audits |
| System | Generate/recalculate scores asynchronously |

---

# Features Included

## Feature F1 — Rule-Based Matching Engine

### Purpose
Evaluate requirement ↔ manufacturer/facility/machinery fit using explicit business rules.

### Business Value
Ships explainable matching without ML ops overhead.

### User Benefits
Trustworthy, reproducible shortlists.

### Functional Requirements
1. Score candidates against weighted criteria (industry, machine type, proximity, availability, budget, labor, materials, logistics, certs, SEZ, capacity, serviceable area).  
2. Exclude ineligible listings (unpublished, suspended, ACL-blocked).  
3. Persist scores and rank.  
4. Recalculate on triggers.  

### Validation Rules
Weights sum policy; scores bounded (e.g., 0–100).

### Permissions
Engine runs with service credentials; results gated by ACL.

### Error Handling
Partial criteria failure → score remaining + flag degraded.

### Future Enhancements
Hybrid rule + ML blend.

---

## Feature F2 — Match Scoring

### Purpose
Produce numeric match scores for ranking and UI percentage display.

### Business Value
Comparable signal across recommendations.

### User Benefits
Easy comparison of relative fit.

### Functional Requirements
Per-candidate total score + per-criterion component scores stored.

### Validation Rules
`0 <= score <= 100` (or 0–1 scaled to %).

### Permissions
Visible to visionary (own req); manufacturer sees own opportunity score; admin all.

### Error Handling
Missing data → criterion score 0 or N/A with weight redistribution policy (documented).

### Future Enhancements
Calibrated probability of acceptance.

---

## Feature F3 — Manufacturer Recommendations

### Purpose
Recommend manufacturers/facilities/machines to visionaries for a requirement.

### Business Value
Primary conversion accelerator post-publish.

### User Benefits
Actionable shortlist without exhaustive search.

### Functional Requirements
Top-N ranked list with score, explanation, card fields; multi-select send.

### Validation Rules
N configurable (default 10–20); min score threshold optional.

### Permissions
Requirement owner; confidential ACL applies to detail depth.

### Error Handling
Empty list → guided search CTA (EPIC-6).

### Future Enhancements
Diversify results (avoid one conglomerate dominance).

---

## Feature F4 — Requirement Recommendations

### Purpose
Recommend open requirements to manufacturers as opportunities.

### Business Value
Inbound demand relevance; supply-side engagement.

### User Benefits
See jobs that fit capacity and capabilities.

### Functional Requirements
Dashboard feed with score, summary, budget, timeline, location, machinery; refresh.

### Validation Rules
Only POSTED+ eligible requirements; respect NDA/eligibility (EPIC-5).

### Permissions
Manufacturer sees opportunities for self only.

### Error Handling
Masked confidential fields until NDA.

### Future Enhancements
Push notifications for high-score new matches.

---

## Feature F5 — Service Provider Recommendations

### Purpose
Extend matching to vendors, labor, logistics, legal when ecosystem listings exist.

### Business Value
One recommendation fabric for multi-sided platform.

### User Benefits
Complete project stacks faster.

### Functional Requirements
`entityType` on recommendations; MVP may return empty for unreleased markets.

### Validation Rules
Same score bounds; type-specific criteria subsets.

### Permissions
Per entity ACL.

### Error Handling
Skip types not enabled in config.

### Future Enhancements
Multi-party package recommendations.

---

## Feature F6 — Recommendation Ranking

### Purpose
Order candidates by score with stable tie-breakers.

### Business Value
Consistent UX and reproducible tests.

### User Benefits
Best fits first.

### Functional Requirements
Sort by score DESC, then verified badge, rating, distance, id.

### Validation Rules
Stable ordering for identical inputs.

### Permissions
N/A.

### Error Handling
N/A.

### Future Enhancements
Business-rule re-rankers (diversity, fairness).

---

## Feature F7 — Match Explanation

### Purpose
Explain why a candidate scored well (and key gaps).

### Business Value
Trust, debugging, admin tuning feedback.

### User Benefits
Confidence to contact without opening every profile.

### Functional Requirements
Human-readable summary + structured reason codes.

### Validation Rules
Explanation required for returned recommendations.

### Permissions
Same as recommendation visibility.

### Error Handling
Fallback generic text if template missing.

### Future Enhancements
Explainable AI feature attributions.

---

## Feature F8 — Configurable Scoring Weights

### Purpose
Admin-tune criterion importance without deploys.

### Business Value
Market-specific matching quality control.

### User Benefits
Indirectly better matches per region/vertical.

### Functional Requirements
`MatchingConfiguration` versioned weights; enable/disable criteria; activate config.

### Validation Rules
Enabled weights normalize to 1.0 or 100%.

### Permissions
Admin write; read by engine.

### Error Handling
Invalid config rejected; keep prior ACTIVE.

### Future Enhancements
Per-industry weight profiles.

---

## Feature F9 — Recommendation Refresh

### Purpose
Keep recommendations current as data changes.

### Business Value
Avoid stale shortlists and wasted outreach.

### User Benefits
Edits/requirements/capacity updates reflected.

### Functional Requirements
Refresh API + async recalc on triggers; expire old rows.

### Validation Rules
TTL configurable; idempotent refresh.

### Permissions
Owner can request refresh; system auto.

### Error Handling
In-progress lock; return previous set with `stale=true`.

### Future Enhancements
Real-time streaming updates.

---

## Feature F10 — Feedback-Based Learning (future)

### Purpose
Use interest/decline/booking outcomes to improve future ranking.

### Business Value
Compounding match quality.

### User Benefits
Less irrelevant noise over time.

### Functional Requirements
Capture `RecommendationFeedback` now; learning job later.

### Validation Rules
Decline reasons enumerated.

### Permissions
Actor-scoped feedback writes.

### Error Handling
Feedback never blocks primary actions.

### Future Enhancements
Online learning / bandit rankers.

---

## Feature F11 — AI/ML Ready Architecture

### Purpose
Allow future model inference behind same APIs.

### Business Value
Avoid rewrite of clients and workflows.

### User Benefits
Seamless quality upgrades.

### Functional Requirements
`MatchingEngine` interface: `score(requirement, candidates) → ScoredCandidate[]`; config chooses `RULES` | `ML` | `HYBRID`.

### Validation Rules
Engine type enum; shadow-mode scoring optional.

### Permissions
Admin switch engines in non-prod first.

### Error Handling
ML failure falls back to rules.

### Future Enhancements
Vector capability search; semantic requirement embeddings.

---

# Developer Tickets

---

## Ticket XFY-035

### Ticket ID
`XFY-035`

### Ticket Name
Rule-Based Matching Engine

### Priority
`P0 — Critical`

### Type
`Backend` · `Platform` · `Story`

### Story Points
`13`

### Epic
`EPIC-7 — Matching & Recommendations`

### User Story
As the platform, I need a configurable rule-based matching engine so that requirements can be scored and ranked against eligible manufacturers with stored scores and explanations.

### Business Value
Core intelligence for demand–supply matching with admin-tunable quality and reproducibility.

### Description
Implement scoring over Industry, Machinery Type, Location Proximity, Availability, Budget Compatibility, Labor, Raw Materials, Logistics, Certifications, SEZ Preference, Capacity Fit, Serviceable Area. Support ranked results, configurable weights, score storage, explanation generation, recalculation on data changes. Admin modifies weights; identical inputs → identical outputs.

### Functional Requirements
1. Evaluate eligible manufacturer/facility/machinery candidates against criteria.  
2. Compute weighted total score.  
3. Persist MatchScore + MatchExplanation.  
4. Rank and return top-N.  
5. Admin configuration model for weights/enablement.  
6. Recalculate on requirement/listing/availability/cert changes.  
7. Deterministic scoring for fixed config version + inputs.  

### UI Requirements (if frontend)
N/A beyond admin config screens (can be thin in this ticket or paired admin UI later).

### Backend Requirements (if backend)
Matching service; candidate retrieval; scorer pipeline; config loader; outbox/triggers; persistence; job for bulk recalc.

### Acceptance Criteria
- [ ] Ranked manufacturer list returned  
- [ ] Match score stored  
- [ ] Human-readable explanation generated  
- [ ] Admin can modify scoring weights  
- [ ] Results reproducible for identical inputs  

### Validation Rules
- Candidate must be published/approved  
- Config weights for enabled criteria normalize to 100  
- Score in [0, 100]  
- Require minimum eligible candidates query guardrails (timeouts)  

### Permissions
Service execution; admin config write; read via recommendation APIs with ACL.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/requirements/{id}/recommendations/generate` | `POST` |
| `/api/admin/matching/configuration` | `GET` `PUT` |
| `/api/admin/matching/configuration/activate` | `POST` |
| `/api/admin/matching/configuration/versions` | `GET` |

### Request Payload
**Generate**
```json
{
  "limit": 20,
  "minScore": 40,
  "forceRefresh": true
}
```

**Config PUT**
```json
{
  "name": "default-v2",
  "engineType": "RULES",
  "criteria": [
    { "key": "INDUSTRY", "enabled": true, "weight": 15 },
    { "key": "MACHINERY_TYPE", "enabled": true, "weight": 20 },
    { "key": "LOCATION_PROXIMITY", "enabled": true, "weight": 12 },
    { "key": "AVAILABILITY", "enabled": true, "weight": 12 },
    { "key": "BUDGET", "enabled": true, "weight": 10 },
    { "key": "LABOR", "enabled": true, "weight": 5 },
    { "key": "RAW_MATERIALS", "enabled": true, "weight": 5 },
    { "key": "LOGISTICS", "enabled": true, "weight": 5 },
    { "key": "CERTIFICATIONS", "enabled": true, "weight": 6 },
    { "key": "SEZ", "enabled": false, "weight": 0 },
    { "key": "CAPACITY", "enabled": true, "weight": 5 },
    { "key": "SERVICEABLE_AREA", "enabled": true, "weight": 5 }
  ]
}
```

### Response Payload
```json
{
  "requirementId": "req_01H...",
  "configVersion": 2,
  "engineType": "RULES",
  "generatedAt": "2026-07-15T08:30:00.000Z",
  "recommendations": [
    {
      "recommendationId": "rec_01H...",
      "manufacturerUserId": "usr_mfg_1",
      "facilityId": "fac_01H...",
      "machineryId": "mch_01H...",
      "score": 86.5,
      "rank": 1,
      "explanation": {
        "summary": "Matched because machine type, location, and availability fit.",
        "reasons": [
          { "code": "MACHINERY_TYPE", "label": "Machine type match", "score": 20 },
          { "code": "LOCATION_PROXIMITY", "label": "Within preferred region", "score": 11 },
          { "code": "AVAILABILITY", "label": "Capacity open in target window", "score": 12 }
        ],
        "gaps": [
          { "code": "CERTIFICATIONS", "label": "Missing preferred ISO label", "score": 2 }
        ]
      }
    }
  ]
}
```

### Database Tables
`MatchingConfiguration`, `MatchScore`, `MatchExplanation`, `Recommendation`, `RecommendationHistory`

### Database Fields
See Database Design.

### Entity Relationships
Requirement 1—* Recommendation; Recommendation 1—1 MatchScore; Score 1—* explanation components; Config versions referenced by score rows.

### Matching Algorithm Specification (conceptual)

#### Pipeline
```
1. Load ACTIVE MatchingConfiguration (version V)
2. Load requirement R (+ ACL context)
3. Retrieve candidate set C (published facilities/machinery)
4. Hard filters (eligibility): status, availability policy, geo/serviceable quick reject, confidential visibility
5. For each candidate c in C:
     For each enabled criterion k:
         s_k = score_k(R, c) ∈ [0, 1]
     total = 100 * Σ (w_k * s_k) / Σ w_k_enabled
     Build explanation from top positive s_k and notable gaps
6. Rank by total DESC + tie-breakers
7. Persist Recommendation + MatchScore + MatchExplanation
8. Return top-N
```

#### Scoring Formula
Let enabled criteria be \(k \in K\), weights \(w_k > 0\), criterion scores \(s_k \in [0,1]\).

\[
\text{MatchScore}(R,c) = 100 \times \frac{\sum_{k \in K} w_k \cdot s_k}{\sum_{k \in K} w_k}
\]

#### Criterion Scoring Guidance (MVP)

| Criterion | \(s_k = 1\) when | Partial | \(0\) when |
|-----------|------------------|---------|------------|
| Industry Match | Exact industry | Related parent/sibling taxonomy | No overlap |
| Machinery Type | Required type present & published | Compatible subcategory | Missing |
| Location Proximity | Same city/state or within soft radius | Same country / nearby state | Far / unknown geo |
| Availability | Open capacity overlaps target dates | Near window / limited | No capacity (if exclusion off, low score) |
| Budget Compatibility | Primary rates within budget envelope | Slightly over | Far over / unknown |
| Labor | Labor need met by listing | On request | Needed but No |
| Raw Materials | Yes/Partial when needed | Partial | Needed but No |
| Logistics | Supports needed scopes | Partial modes | Needed but unavailable |
| Certifications | All preferred certs verified | Some | None |
| SEZ Preference | Pref match | Neutral if SEZ disabled | Conflict |
| Capacity Fit | Quantity/duration within min/max | Stretch | Infeasible |
| Serviceable Area | Preferred location covered | Adjacent | Outside |

Hard exclusions (configurable): unpublished; suspended; zero availability when `excludeUnavailable=true`; manufacturer not eligible for confidential requirement.

### Configuration Model
Versioned `MatchingConfiguration` with `engineType=RULES`; only one ACTIVE; scores store `config_version` for reproducibility audits.

### Error Handling
Timeouts on large candidate sets → sample + mark `degraded`; invalid config → reject activate.

### Security Considerations
Don’t leak confidential requirement fields into manufacturer-facing opportunity payloads; audit config changes; rate-limit generate.

### Edge Cases
No geo on facility; requirement missing optional fields → redistribute weights among scored criteria vs. treat missing as neutral (choose **neutral 0.5** or **skip criterion**—document skip-and-renormalize as default).

### Dependencies
EPIC-2/3/4/5 data; publish events.

### Testing Checklist
- [ ] Golden fixture reproducibility  
- [ ] Weight change changes ranking  
- [ ] Unavailable excluded when configured  
- [ ] Explanation non-empty  
- [ ] Confidential eligibility filters  

### Definition of Done
Algorithm doc published; fixtures in CI; admin can activate config in staging; OpenAPI complete.

---

## Ticket XFY-036

### Ticket ID
`XFY-036`

### Ticket Name
Recommended Manufacturers After Requirement Submission

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`8`

### Epic
`EPIC-7 — Matching & Recommendations`

### User Story
As a visionary, after I publish a requirement I want to see top recommended manufacturers with scores and explanations so that I can select who to contact.

### Business Value
Converts published demand into structured multi-party outreach quickly.

### Description
Post-publish recommendations UI: top manufacturers, match %, explanation, multi-select, send requests to selected, refresh after edits. Responsive comparison-friendly cards integrated with messaging/request workflow.

### Functional Requirements
1. Show recommendations immediately after publish (sync generate or wait on async with loading).  
2. Display score + explanation.  
3. Multi-select manufacturers/listings.  
4. Send request to selected (creates ManufacturingRequest / messages per workflow epic).  
5. Refresh after requirement edits.  
6. Compare-friendly layout.  

### UI Requirements (if frontend)

#### UX Flow
```
Publish requirement (EPIC-5)
    ↓
Recommendations page/section loads
    ↓
Review cards (score, reasons, badges)
    ↓
Multi-select
    ↓
Send Requests → confirmation
    ↓
Negotiation inbox
```

#### Recommendation Card
| Element | Content |
|---------|---------|
| Header | Company, verification badge, location |
| Machine | Primary matched machinery name/type |
| Score | Match percentage ring/bar |
| Explanation | Summary + expandable reasons/gaps |
| Meta | Indicative price, availability hint |
| Actions | Select checkbox, View profile |

#### States
Loading skeleton; empty “No strong matches—browse search”; error retry; sending requests progress; success toast with count.

#### Responsive
Mobile stacked cards; desktop 2-col + sticky “Send to N selected”.

### Backend Requirements (if backend)
GET recommendations; POST generate/refresh; POST send-to-selected integrating request creation; respect ACL masking.

### Acceptance Criteria
- [ ] Recommendations appear immediately (or with explicit pending→ready UX under  few seconds SLA)  
- [ ] User can compare recommended manufacturers  
- [ ] Request submission integrates with messaging/workflow  
- [ ] Responsive UI  
- [ ] Refresh after edits  

### Validation Rules
At least one selection to send; max recipients cap (e.g., 10); minScore soft-hide below threshold with “show more”.

### Permissions
Requirement owner only.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/requirements/{id}/recommendations` | `GET` |
| `/api/requirements/{id}/recommendations/refresh` | `POST` |
| `/api/requirements/{id}/recommendations/send` | `POST` |

### Request Payload
**Send**
```json
{
  "recommendationIds": ["rec_01", "rec_02"],
  "message": "Please review our enclosure pilot RFQ and share capability confirmation."
}
```

### Response Payload
```json
{
  "sent": [
    { "recommendationId": "rec_01", "requestId": "mreq_01", "status": "SENT" }
  ],
  "failed": []
}
```

### Database Tables
`Recommendation`, `RecommendationHistory`; writes requests via existing request tables.

### Database Fields
Selection events optional in history (`SENT`).

### Entity Relationships
Recommendation → manufacturer/machinery; send creates Request rows linked to requirement.

### Error Handling
Partial send failures listed; stale recommendations warn to refresh.

### Security Considerations
Owner-only; don’t expose other visionaries’ shortlists; rate-limit send.

### Edge Cases
Edit requirement mid-selection → force refresh; manufacturer becomes unavailable → remove/disable card; confidential detail depth.

### Dependencies
XFY-035; EPIC-5 publish; messaging/requests epic.

### Testing Checklist
- [ ] Post-publish list  
- [ ] Multi-select send  
- [ ] Refresh after edit  
- [ ] Empty/error states  
- [ ] Mobile layout  

### Definition of Done
UX accepted; send integration contract tested; analytics events for view/select/send.

---

## Ticket XFY-037

### Ticket ID
`XFY-037`

### Ticket Name
Recommended Opportunities for Manufacturers

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`8`

### Epic
`EPIC-7 — Matching & Recommendations`

### User Story
As a manufacturer, I want my dashboard to show matched requirements with scores and summaries so that I can express interest or decline irrelevant opportunities.

### Business Value
Increases supply-side responsiveness and reduces missed qualified demand.

### Description
Manufacturer dashboard opportunity list: matched requirements, score, summary, budget, timeline, location, required machinery. Actions: Express Interest, Decline (with reason), Save for Later optional, View Full Requirement (ACL-aware). Record interest/decline; refresh automatically; store decline reasons for future learning.

### Functional Requirements
1. Dashboard recommendations feed for manufacturer.  
2. Display score + requirement summary fields.  
3. Express Interest / Decline / optional Save / View.  
4. Persist feedback.  
5. Auto-refresh on new matches / interval / event.  

### UI Requirements (if frontend)

#### Dashboard Panel
“Matched Opportunities” with cards/rows sorted by score.

#### Opportunity Card
Score badge; title; industry; budget (masked if needed); timeline; location; machinery tags; NDA lock state; actions.

#### Decline Modal
Reason select: Not a fit / Capacity full / Budget / Location / Machinery gap / Other + notes.

#### States
Empty “We’ll notify you when opportunities match”; loading; error; optimistic interest confirmation.

### Backend Requirements (if backend)
Manufacturer-scoped recommendation query; interest/decline APIs; feedback table; push/poll refresh; history.

### Acceptance Criteria
- [ ] Dashboard updates with relevant opportunities  
- [ ] Decline reason stored  
- [ ] Interest action recorded  
- [ ] Recommendation list refreshes automatically  

### Validation Rules
Decline requires reason code; interest idempotent; cannot interest after decline without reopen policy.

### Permissions
Manufacturer only own opportunities; view full requirement subject to EPIC-5 ACL/NDA.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/manufacturer/recommendations` | `GET` |
| `/api/manufacturer/recommendations/{id}/interest` | `POST` |
| `/api/manufacturer/recommendations/{id}/decline` | `POST` |
| `/api/manufacturer/recommendations/{id}/save` | `POST` optional |
| `/api/recommendations/{id}/feedback` | `POST` generic |

### Request Payload
**Decline**
```json
{
  "reasonCode": "CAPACITY_FULL",
  "notes": "Booked through September"
}
```

**Interest**
```json
{
  "message": "We can support VMC + anodize in your window."
}
```

### Response Payload
```json
{
  "recommendationId": "rec_01H...",
  "status": "INTERESTED",
  "feedbackId": "fb_01H..."
}
```

### Database Tables
`Recommendation` (manufacturer-facing status), `RecommendationFeedback`, `RecommendationHistory`

### Database Fields
See Database Design — feedback reason, actor, timestamps.

### Entity Relationships
Recommendation ↔ Requirement; Feedback 1 per action event (append-only preferred).

### Feedback Capture Workflow
```
Manufacturer views opportunity
    ↓
Interest → status INTERESTED + notify visionary + history
    OR
Decline → status DECLINED + reason + exclude from active feed (+ learning later)
    OR
Save → status SAVED (optional)
    ↓
RecommendationFeedback stored
    ↓
Analytics counters updated
```

### Error Handling
`409` if already declined terminal; `403` ACL on full view.

### Security Considerations
Mask confidential fields; audit interest/decline; prevent enumeration of other mfg feeds.

### Edge Cases
Requirement cancelled → auto-withdraw opportunities; score refreshed downward; NDA required before full view.

### Dependencies
XFY-035; EPIC-5 visibility; manufacturer dashboard shell.

### Testing Checklist
- [ ] Feed ranking  
- [ ] Interest/decline persistence  
- [ ] Reason required  
- [ ] Auto refresh  
- [ ] Confidential masking  

### Definition of Done
Dashboard UX accepted; feedback schema populated in tests; notification stub documented.

---

# Database Design

## ER Overview (text)

```
ProjectRequirement
  └─1──* Recommendation
         ├─1──1 MatchScore
         │       └─1──* MatchExplanationComponent (or JSON)
         ├─1──* RecommendationFeedback
         └─1──* RecommendationHistory

MatchingConfiguration (versioned)
  └─ referenced by MatchScore.config_version
```

## `MatchScore`

| Column | PK/FK | Notes |
|--------|-------|-------|
| id | PK | |
| recommendation_id | FK UNIQUE | |
| requirement_id | FK | INDEX |
| candidate_facility_id | FK | |
| candidate_machinery_id | FK nullable | |
| total_score | numeric | 0–100 |
| component_scores | jsonb | per criterion |
| config_version | int | |
| engine_type | varchar | RULES/ML/HYBRID |
| algorithm_build | varchar | for reproducibility |
| created_at | | |

## `Recommendation`

| Column | Notes |
|--------|-------|
| id PK | |
| requirement_id FK | INDEX |
| manufacturer_user_id FK | INDEX |
| facility_id FK | |
| machinery_id FK nullable | |
| entity_type | MANUFACTURER/VENDOR/... |
| rank | int |
| score | numeric denorm |
| status | ACTIVE/SENT/INTERESTED/DECLINED/EXPIRED/SAVED |
| expires_at | timestamptz |
| generated_at | |
| refreshed_at | |
| UNIQUE active candidate policy | partial unique where ACTIVE |

## `RecommendationFeedback`

| Column | Notes |
|--------|-------|
| id PK | |
| recommendation_id FK | |
| actor_user_id FK | |
| action | INTEREST / DECLINE / SAVE / CLICK / SEND |
| reason_code | nullable |
| notes | |
| created_at | INDEX |

## `MatchingConfiguration`

| Column | Notes |
|--------|-------|
| id PK | |
| name | |
| version | int |
| status | DRAFT/ACTIVE/RETIRED |
| engine_type | RULES/ML/HYBRID |
| criteria jsonb | weights + enabled |
| exclude_unavailable | boolean |
| min_score | numeric |
| default_limit | int |
| created_by | admin |
| activated_at | |
| created_at / updated_at | |

## `MatchExplanation`

| Column | Notes |
|--------|-------|
| id PK | |
| match_score_id FK | |
| summary | text |
| reasons jsonb | [{code,label,score}] |
| gaps jsonb | |
| created_at | |

## `RecommendationHistory`

| Column | Notes |
|--------|-------|
| id PK | |
| recommendation_id FK | |
| event_type | GENERATED/REFRESHED/SENT/INTERESTED/DECLINED/EXPIRED/OVERRIDE |
| actor_user_id | nullable |
| payload jsonb | |
| created_at | |

## Indexes & Constraints
- `(requirement_id, score DESC)` for visionary fetch  
- `(manufacturer_user_id, status, score DESC)` for dashboard  
- Score bounds check 0–100  
- Feedback action enum check  
- One ACTIVE matching configuration  

---

# REST API Summary

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/requirements/{id}/recommendations/generate` | `POST` | Generate recommendations | Owner/System |
| `/api/requirements/{id}/recommendations` | `GET` | Retrieve recommendations | Owner |
| `/api/requirements/{id}/recommendations/refresh` | `POST` | Refresh recommendations | Owner/System |
| `/api/requirements/{id}/recommendations/send` | `POST` | Send requests to selected | Owner |
| `/api/manufacturer/recommendations` | `GET` | Opportunity feed | Manufacturer |
| `/api/manufacturer/recommendations/{id}/interest` | `POST` | Express interest | Manufacturer |
| `/api/manufacturer/recommendations/{id}/decline` | `POST` | Decline opportunity | Manufacturer |
| `/api/manufacturer/recommendations/{id}/save` | `POST` | Save for later | Manufacturer |
| `/api/recommendations/{id}/feedback` | `POST` | Submit feedback | Auth party |
| `/api/admin/matching/configuration` | `GET` `PUT` | Matching configuration | Admin |
| `/api/admin/matching/configuration/activate` | `POST` | Activate config version | Admin |
| `/api/admin/matching/configuration/versions` | `GET` | Config history | Admin |
| `/api/admin/recommendations/analytics` | `GET` | Recommendation KPIs | Admin |
| `/api/admin/recommendations/{id}/override` | `POST` | Manual override | Admin |

---

# Matching Engine Architecture

## Components

```
Triggers (publish, edit, listing change, availability, cert verify, schedule)
        ↓
Candidate Retriever (eligible published inventory)
        ↓
MatchingEngine interface
   ├─ RulesEngine (MVP)
   ├─ MlEngine (future)
   └─ HybridEngine (future)
        ↓
Scorer → Explainer → Ranker
        ↓
Persistence (Recommendation, MatchScore, Explanation, History)
        ↓
Cache (per requirement_id / manufacturer_id)
        ↓
API adapters (Visionary / Manufacturer / Admin)
```

## Rule Evaluation Pipeline
Load config → hard filters → per-criterion scoring → normalize weighted sum → attach explanation → rank → persist.

## Scoring Engine
Pure functions over requirement + candidate snapshots; include `config_version` + `algorithm_build` for reproducibility.

## Weight Configuration
Admin edits DRAFT → validate normalize → ACTIVATE → subsequent generates use new version; old scores retain historical version.

## Ranking Process
`score DESC`, then `verified`, `rating`, `distance ASC`, `machineryId`.

## Explanation Generation
Select top 3 positive criterion labels; optionally 1–2 gaps under threshold; template: “Matched because {reasons}.”

## Recommendation Caching
Cache top-N payloads briefly (e.g., 60–300s); invalidate on refresh triggers; serve `stale=true` if recalc in flight.

## Recalculation Triggers
| Event | Action |
|-------|--------|
| Requirement publish/edit | Generate/refresh for requirement |
| Machinery/facility publish/update | Recompute affected opportunities |
| Availability change | Refresh availability-sensitive scores |
| Cert verification | Boost/recompute |
| Config activate | Optional global recompute job |
| TTL expiry | Mark EXPIRED; regenerate on demand |

## AI/ML Extension Without API Changes
- Keep `/recommendations` request/response shapes stable.  
- Add `engineType` in stored metadata and admin config.  
- `MlEngine` consumes same candidate features / embeddings table.  
- Enable **shadow mode**: compute ML scores in parallel, log deltas, still serve RULES.  
- Cut over `engineType=HYBRID` (rules gate + ML rank) then `ML`.  
- On ML errors, automatic failover to RULES.  

Clients never depend on internal scorer implementation.

---

# Recommendation User Journeys

### Visionary

```
Create Requirement
        ↓
Requirement Published
        ↓
Recommendations Generated
        ↓
Review Matches
        ↓
Select Manufacturers
        ↓
Send Requests
        ↓
Negotiation
```

### Manufacturer

```
Dashboard Opens
        ↓
Matched Opportunities Displayed
        ↓
Review Requirement
        ↓
Express Interest / Decline
        ↓
Response Recorded
        ↓
Recommendation Feedback Stored
```

---

# Business Rules

| # | Rule |
|---|------|
| 1 | Only approved and published manufacturer listings are eligible |
| 2 | Manufacturers without available capacity are excluded when configured |
| 3 | Confidential requirements respect visibility/NDA permissions |
| 4 | Match scores are recalculated after relevant data changes |
| 5 | Decline feedback influences future recommendations (future enhancement; capture now) |
| 6 | Recommendations expire after a configurable period |
| 7 | Identical inputs + config version yield identical scores |
| 8 | Visionary send requires explicit multi-select confirmation |
| 9 | Declined opportunities leave active manufacturer feed |
| 10 | Admin overrides are audited and do not silently alter historical scores without history rows |

---

# Admin Features

| Capability | Description |
|------------|-------------|
| **Configure matching weights** | Edit and activate criteria weights |
| **Enable/disable criteria** | Turn signals on/off per config |
| **View recommendation analytics** | CTR, interest, decline, booking conversion |
| **Override recommendations** | Pin/boost/hide candidates for a requirement |
| **Monitor recommendation quality** | Score distributions; zero-match rates |
| **Audit recommendation history** | Config changes, generates, feedback, overrides |

---

# Security Requirements

| Control | Requirement |
|---------|-------------|
| Role-based permissions | Visionary/Manufacturer/Admin separation |
| Confidential requirement ACL | Masking + NDA before deep opportunity detail |
| Secure recommendation APIs | AuthZ on all retrieve/generate/send/feedback |
| Audit logging | Config activate, override, interest/decline, generate |
| Input validation | Limits, reason enums, weight bounds |
| Rate limiting | Generate/refresh/send abuse protections |

---

# Non-functional Requirements

| Category | Requirement |
|----------|-------------|
| **Recommendation response time** | Cache hit p95 < 300ms; generate p95 < 3s for ≤5k candidates (async beyond) |
| **Scalability** | Async generation for large catalogs; bounded candidate prefilters |
| **Reliability** | Fail open to search CTA if generate fails; retries idempotent |
| **Accuracy** | Fixture-based regression on ranking; admin-tunable |
| **Security** | No cross-tenant leakage of shortlists |
| **Accessibility** | Score not color-only; keyboard select |
| **Mobile responsiveness** | Post-publish recommendations + mfg feed usable on mobile |

---

# Success Metrics

| KPI | Definition |
|-----|------------|
| **Recommendation click-through rate** | Detail opens / recommendations shown |
| **Match acceptance rate** | Interests or sends / recommendations shown |
| **Booking conversion rate** | Bookings originating from recommended outreach / sends |
| **Average match score** | Mean score of shown / accepted matches |
| **Recommendation response time** | Generate and retrieve latency percentiles |
| **Manufacturer engagement** | Interest+decline actions / opportunities shown |
| **Visionary satisfaction** | Survey/NPS on match quality |
| **Recommendation accuracy** | Accepted interests weighted vs declines; later ML precision@K |

---

# Ticket Summary Board

| Ticket | Name | Priority | Points |
|--------|------|----------|--------|
| XFY-035 | Rule-Based Matching Engine | P0 | 13 |
| XFY-036 | Recommended Manufacturers After Requirement Submission | P0 | 8 |
| XFY-037 | Recommended Opportunities for Manufacturers | P0 | 8 |
| | **Total** | | **29** |

**Suggested sequencing:** XFY-035 → (XFY-036 ∥ XFY-037)

---

# Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Cold-start empty recommendations | Loosen minScore; fallback EPIC-6 search CTA |
| Over-matching popular factories | Diversity re-rank; capacity pressure signal |
| Stale availability scores | Trigger on slot changes; soft-revalidate on send |
| Gaming via keyword spam | Prefer structured taxonomy; cert verification boosts |
| Config mistakes tank quality | Versioning + activate confirmation + fixtures |

---

# Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| AI/ML recommendation engine | Learned ranker on outcomes |
| Collaborative filtering | “Manufacturers contacted for similar RFQs” |
| Semantic requirement matching | Embeddings for free-text specs |
| Vector search for capabilities | Capability graph / ANN retrieval |
| Personalized recommendations | Per-user affinity |
| Continuous learning from actions | Feedback → training sets |
| Predictive capacity matching | Forecast free capacity |
| Demand forecasting | Opportunity volume predictions |
| Explainable AI recommendations | Feature attributions |
| Real-time recommendation updates | Streaming recalculation |

---

## Traceability

| Artifact | Use |
|----------|-----|
| PRD / SRS | Matching & recommendation requirements |
| Tech Design | Rules engine, config, AI-ready ports |
| Jira / Azure DevOps | Import XFY-035–XFY-037 |
| Confluence / Notion | EPIC 7 source of truth |
| Release 3 Roadmap | ML engine behind same APIs |
| Downstream | Requests/messaging/booking conversion analytics |

---

**X!Y — The Explorer Factory**  
*Why own it when you can make it.*
