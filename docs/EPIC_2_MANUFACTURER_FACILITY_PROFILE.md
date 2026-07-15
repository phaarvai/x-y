# X!Y — The Explorer Factory

## EPIC 2 — Manufacturer Facility Profile

**Tagline:** *Why own it when you can make it.*

**Document Type:** Software Specification · Epic Definition  
**Epic ID:** EPIC-2  
**Version:** 1.0  
**Last Updated:** July 2026  
**Classification:** PRD · SRS · Technical Design Document · Jira Backlog · Confluence · Agile Sprint Planning · Developer Documentation  
**Release Mapping:** Release 1 — MVP Marketplace  
**Depends On:** EPIC-1 — Authentication, Roles & User Onboarding

---

## Epic Summary

**EPIC 2 — Manufacturer Facility Profile** enables **Manufacturers / Factory Owners** to create complete digital facility profiles on **X!Y — The Explorer Factory**. These profiles present company identity, factory location, infrastructure, manufacturing capabilities, certifications, serviceable areas, and FAQs so Visionaries and other buyers can evaluate trust and fit **before** submitting manufacturing requests.

This epic establishes the primary **supply-side discovery entity** for the marketplace. Machinery inventory (subsequent epic) hangs off facilities; search, booking, and public reputation all depend on accurate, structured facility data.

---

## Business Objective

- Digitize manufacturer presence beyond static directories  
- Give buyers enough facility context to shortlist partners with confidence  
- Create structured supply inventory for search, filters, and future AI matching  
- Establish verification and certification workflows that strengthen marketplace trust  
- Support single-facility MVP with a schema ready for multi-facility expansion  

---

## User Value

| Audience | Value |
|----------|-------|
| Manufacturers | Showcase capabilities, location, and credibility to attract qualified demand |
| Visionaries / Ideators | Evaluate factories before initiating requests—location, SEZ, certs, infrastructure |
| Platform Admins | Verify facilities and certifications; moderate public content |
| Marketplace | Higher-quality supply listings → better match rates and booking conversion |

---

## Scope

EPIC 2 covers manufacturer facility data model, onboarding form experience, map/geocoding, certifications with admin verification, FAQ management, public manufacturer profile presentation, and admin facility/certification moderation.

---

## In Scope

- Company and facility profile creation/editing  
- Factory address, map location, GPS coordinates  
- SEZ status and serviceable areas  
- Contact information and about-company content  
- Years in market and infrastructure details  
- Manufacturing capabilities / sector-industry signals  
- Certifications (CRUD + document upload + admin statuses)  
- Facility verification status (admin-driven)  
- FAQ management (CRUD + reorder)  
- Public manufacturer profile page  
- Draft auto-save and onboarding progress for facility form  

---

## Out of Scope

- Machinery inventory CRUD (separate epic; relationship reserved)  
- Manufacturing request / offer / booking workflows  
- Reviews and ratings display (schema hooks / “future” on public profile only)  
- Full KYB government registry auto-verification  
- Virtual tours, 360° media, factory videos (future)  
- Investor/distributor-facing company investment materials  
- Multi-language facility content management  
- Real-time IoT capacity signals  

---

## Role Prerequisites

| Role | Capability |
|------|------------|
| `MANUFACTURER` | Create/edit own facilities, certifications, FAQs |
| `VISIONARY` (and other authenticated buyers) | View **public/approved** facility profiles |
| `PLATFORM_ADMIN` | Verify/reject facilities & certifications; moderate FAQs; audit |
| Public (unauthenticated) | View published public profiles (policy-configurable) |

> Listing publication remains gated by EPIC-1 profile completion (`canPublishListings`) **and** facility minimum required fields defined in this epic.

---

# Features Included

## Feature F1 — Company Profile

### Purpose
Capture the manufacturer’s legal/commercial identity associated with one or more facilities.

### Business Value
Creates the brand entity Visionaries search and trust; anchors all factory assets under a company narrative.

### User Benefits
Manufacturers present a professional company face; buyers understand who they are dealing with.

### Functional Requirements
1. Store company name, owner name, website, sector/industry, contact info.  
2. Support edit after creation with ownership checks.  
3. Surface company fields on public profile.  

### Validation Rules
- `company_name` required, 2–255 chars  
- `owner_name` required, 2–255 chars  
- `website` optional; valid URL if present  
- `sector_industry` required from controlled list or approved free text  

### Permissions
Owner manufacturer: create/update own. Admin: read/update verification-related fields. Public: read published.

### Error Handling
`400` validation; `403` non-owner; `404` missing facility.

### Future Enhancements
Parent organization / group company hierarchy; GST/VAT identifiers with verification.

---

## Feature F2 — Facility Information

### Purpose
Represent a physical manufacturing plant as a first-class marketplace entity.

### Business Value
Facility becomes the unit of discovery capacity before machinery-level detail.

### User Benefits
Clear plant-level context (not just a company brochure).

### Functional Requirements
1. `ManufacturingFacility` owned by `owner_user_id`.  
2. User may own multiple facilities (MVP UI may emphasize one; schema supports many).  
3. Facility status includes draft vs published and verification status.  

### Validation Rules
Minimum required set before publish: company name, address line fields, city, state, country, industry, contact phone/email.

### Permissions
Owner CRUD; admin moderation; public read if published + verified policy.

### Error Handling
Prevent publish when incomplete; return missing-field list.

### Future Enhancements
Facility types (tool room, assembly, fabrication); shift calendars at facility level.

---

## Feature F3 — Factory Address

### Purpose
Store structured postal address for logistics estimation and trust.

### Business Value
Enables geo search and credible location signals.

### User Benefits
Buyers know where production will happen.

### Functional Requirements
Capture `address`, `city`, `state`, `country`, `zip_code` as discrete fields.

### Validation Rules
Country required (ISO-ish code preferred); ZIP format rule per country (soft validation); state from country-specific list where available.

### Permissions
Owner write; public read published.

### Error Handling
Invalid country/state pairs → `400`.

### Future Enhancements
Address validation APIs; deliverability checks.

---

## Feature F4 — Map Location

### Purpose
Visualize factory location on a map for human evaluation.

### Business Value
Increases buyer confidence and enables radius search UX.

### User Benefits
Instant geographic comprehension without parsing addresses.

### Functional Requirements
Display interactive map on edit and public profile; support marker placement.

### Validation Rules
Map requires valid lat/lng; refuse publish without coordinates if policy requires geo.

### Permissions
Owner edit marker; public view-only map.

### Error Handling
Geocoder failure → allow manual pin with warning.

### Future Enhancements
Static map fallbacks; indoor maps; cluster view in search.

---

## Feature F5 — GPS Coordinates

### Purpose
Persist precise `latitude` / `longitude` for search and distance calculations.

### Business Value
Powers “near me” / radius filters critical to manufacturing logistics costs.

### User Benefits
More relevant discovery; travel/logistics planning.

### Functional Requirements
Store decimal coordinates; update on geocode or manual pin move; index for geo queries.

### Validation Rules
Latitude ∈ [-90, 90]; longitude ∈ [-180, 180]; precision guidance ~6–8 decimal places.

### Permissions
Owner update; public read published coordinates (or approximate for privacy—configure).

### Error Handling
Out-of-range → `400`; reverse-geocode mismatch warnings non-blocking.

### Future Enhancements
Privacy fuzzing for public display; polygon plant boundaries.

---

## Feature F6 — SEZ Status

### Purpose
Indicate whether the facility operates in a Special Economic Zone (or equivalent).

### Business Value
Tax/compliance positioning relevant to export-oriented and regulated production.

### User Benefits
Buyers screening for SEZ benefits or constraints get an early signal.

### Functional Requirements
Boolean or enum (`NONE`, `SEZ`, `FTWZ`, `OTHER`—configurable); display badge on public profile.

### Validation Rules
Required selection (including explicit “Not SEZ”).

### Permissions
Owner set; admin may flag for review if inconsistent with docs.

### Error Handling
Invalid enum → `400`.

### Future Enhancements
Link SEZ certificate document upload.

---

## Feature F7 — Serviceable Areas

### Purpose
Declare geographic regions the manufacturer can serve.

### Business Value
Improves match quality; reduces non-serviceable inbound requests.

### User Benefits
Manufacturers attract in-region demand; buyers filter realistically.

### Functional Requirements
Store multi-value areas (states/countries/regions); support search filters against buyer location.

### Validation Rules
At least one serviceable area before publish (policy); max N areas.

### Permissions
Owner manage; public read.

### Error Handling
Unknown area codes → `400`.

### Future Enhancements
Serviceable radius polygons; shipping preference tiers.

---

## Feature F8 — Contact Information

### Purpose
Provide reachable commercial contacts for the facility.

### Business Value
Converts profile views into conversations without leaving trust context.

### User Benefits
Buyers contact the right plant/team; manufacturers control displayed contacts.

### Functional Requirements
Structured `contact_info` (email, phone, optional alternate). May mirror user profile but facility-specific overrides allowed.

### Validation Rules
Valid email/phone formats; optional reveal-on-request for phone (future).

### Permissions
Owner write; public may see partially masked contacts until request/booking (policy).

### Error Handling
Invalid contact formats → `400`.

### Future Enhancements
Contact routing, preferred hours, WhatsApp business link.

---

## Feature F9 — About Company

### Purpose
Narrative description of history, strengths, and differentiators.

### Business Value
Supports qualitative evaluation beyond specs.

### User Benefits
Humanizes the manufacturer; improves SEO content for public pages.

### Functional Requirements
Rich text or markdown (sanitized); length limits; public display.

### Validation Rules
Max length (e.g., 5,000 chars); strip unsafe HTML.

### Permissions
Owner edit; admin can moderate.

### Error Handling
Oversized content → `400`.

### Future Enhancements
AI-assisted draft generation; multilingual about sections.

---

## Feature F10 — Years in Market

### Purpose
Signal operating tenure.

### Business Value
Proxy for stability in buyer diligence.

### User Benefits
Quick trust cue on cards and profiles.

### Functional Requirements
Integer or founding year; derive “years in market” for display.

### Validation Rules
Non-negative; founding year not in future; reasonable upper bound.

### Permissions
Owner write; public read.

### Error Handling
Invalid numbers → `400`.

### Future Enhancements
Verified tenure via registration documents.

---

## Feature F11 — Infrastructure Details

### Purpose
Describe plant infrastructure (power, built-up area, sheds, utilities, quality labs, etc.).

### Business Value
Helps match complex production needs to capable plants.

### User Benefits
Buyers assess readiness; manufacturers highlight assets.

### Functional Requirements
Structured JSON and/or free-text sections; display on public profile.

### Validation Rules
Schema validation for known keys; free text length limits.

### Permissions
Owner write; public read published.

### Error Handling
Invalid structure → `400`.

### Future Enhancements
Typed infrastructure attributes with units; photo attachments per asset.

---

## Feature F12 — Manufacturing Capabilities

### Purpose
Express industries, processes, and capability keywords at facility level.

### Business Value
Feeds search/filter and future AI matching.

### User Benefits
Discoverability for the right buyer searches.

### Functional Requirements
`sector_industry` primary + optional capability tags; aligned with platform taxonomy.

### Validation Rules
At least one industry before publish.

### Permissions
Owner write; public read.

### Error Handling
Unknown taxonomy IDs → `400`.

### Future Enhancements
Process capability matrices; tolerance/material families.

---

## Feature F13 — Certifications

### Purpose
Manage multi-certification records with documents and verification states.

### Business Value
Trust differentiation; premium signal for serious manufacturers.

### User Benefits
Buyers filter by ISO/quality/export certs; manufacturers prove compliance.

### Functional Requirements
Multiple certs per facility; statuses Pending/Verified/Rejected; admin workflow; public verified badge.

### Validation Rules
See XFY-010; expiry ≥ issue date; file type/size limits.

### Permissions
Owner CRUD (until locked under review); admin verify/reject; public see verified (and optionally pending as unlabeled).

### Error Handling
Upload failures; invalid dates; unauthorized status changes.

### Future Enhancements
ISO registry API auto-checks; expiry reminder notifications.

---

## Feature F14 — Verification Status

### Purpose
Platform-level trust state for the facility itself.

### Business Value
Reduces fraud and low-quality supply in discovery.

### User Benefits
Buyers prefer verified plants; manufacturers gain badge credibility.

### Functional Requirements
Facility `verification_status`: `UNVERIFIED` | `PENDING` | `VERIFIED` | `REJECTED`; admin transitions with reasons; public badge.

### Validation Rules
Only admins change verification status; owner may submit for review.

### Permissions
Admin write status; owner read + submit; public read badge if verified.

### Error Handling
Illegal transitions → `409`; missing reason on reject → `400`.

### Future Enhancements
Tiered verification (basic vs premium); auto-expiry of verification.

---

## Feature F15 — FAQ Management

### Purpose
Manufacturer-authored Q&A for common buyer questions.

### Business Value
Deflects repetitive messaging; improves conversion.

### User Benefits
Faster diligence; clearer expectations (MOQ, lead time norms, materials, etc.).

### Functional Requirements
Add/edit/delete/reorder FAQs; public list ordered.

### Validation Rules
Question/answer required; max counts; sanitization.

### Permissions
Owner manage; admin moderate/delete; public read.

### Error Handling
Reorder conflicts → `409`; empty FAQ set OK.

### Future Enhancements
Suggested FAQ templates by industry; AI draft answers.

---

## Feature F16 — Public Manufacturer Profile

### Purpose
Read-optimized page for evaluating a manufacturer facility.

### Business Value
Core conversion surface from discovery → request.

### User Benefits
Single place for company, map, certs, FAQs, infrastructure, machinery count.

### Functional Requirements
Compose and display all public-safe fields; respect draft/unpublished; show badges.

### Validation Rules
Only `PUBLISHED` (and policy-verified) profiles publicly routable.

### Permissions
Public/auth read; owner preview draft.

### Error Handling
`404` for unpublished/nonexistent; soft-deleted hidden.

### Future Enhancements
Reviews module; follow/save; share cards; SEO JSON-LD.

---

# Developer Tickets

---

## Ticket XFY-007

### Ticket ID

`XFY-007`

### Ticket Name

Create Manufacturer Facility Database Model

### Priority

`P0 — Critical`

### Type

`Backend` · `Database` · `Story`

### Story Points

`5`

### Epic

`EPIC-2 — Manufacturer Facility Profile`

### User Story

As a platform engineer, I need a durable `ManufacturingFacility` data model with relationships so that manufacturer profiles, certifications, FAQs, and future machinery inventory can be stored consistently.

### Business Value

Creates the foundational supply entity for discovery, trust, and all downstream manufacturing marketplace modules.

### Description

Design and migrate the `ManufacturingFacility` table and related entities needed for EPIC 2 relationships. Document SQL-style schema, constraints, indexes, and ER relationships. Support multi-facility ownership at the schema level.

### Functional Requirements

1. Create `ManufacturingFacility` with all specified fields.  
2. Enforce FK `owner_user_id → User.id`.  
3. Support `User 1—* ManufacturingFacility`.  
4. Reserve relationships: Facility `1—*` MachineryInventory, Certifications, FAQ items.  
5. Add check constraints for coordinates and verification enums.  
6. Provide indexes for owner, geo, city/state/country, verification, and industry search.  

### Acceptance Criteria

- [ ] `ManufacturingFacility` table created with all listed fields  
- [ ] Facility belongs to User (FK enforced)  
- [ ] User can own many Facilities  
- [ ] Relationship hooks documented/created for MachineryInventory, Certifications, FAQs  
- [ ] SQL schema, ER explanation, validation rules, constraints, and indexes documented and applied via migration  

### UI Requirements (if frontend)

N/A (schema ticket). Update internal data dictionary / ER diagram in Confluence.

### Backend Requirements (if backend)

- Migration scripts  
- ORM models / repository stubs  
- Enum types for `sez_status`, `verification_status`, `publication_status` (recommended)  
- Seed script optional for staging  

### API Endpoints

N/A for this ticket (consumed by XFY-008+).

### Request Payload

N/A

### Response Payload

N/A

### Database Tables

`ManufacturingFacility` (+ FK readiness for `FacilityCertification`, `FacilityFAQ`, `MachineryInventory`)

### Database Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `owner_user_id` | FK UUID | NOT NULL |
| `company_name` | varchar(255) | NOT NULL |
| `owner_name` | varchar(255) | NOT NULL |
| `address` | text | NOT NULL for publish |
| `city` | varchar(100) | |
| `state` | varchar(100) | |
| `country` | varchar(100) | |
| `zip_code` | varchar(20) | |
| `latitude` | decimal(10,7) | nullable until geocoded |
| `longitude` | decimal(10,7) | nullable until geocoded |
| `sector_industry` | varchar(100) | |
| `website` | varchar(255) | nullable |
| `contact_info` | jsonb | `{ email, phone, alternatePhone? }` |
| `sez_status` | varchar(32) | enum |
| `serviceable_areas` | jsonb / array | codes/names |
| `about_company` | text | |
| `years_in_market` | int | or `founded_year` |
| `infrastructure_details` | jsonb/text | |
| `verification_status` | varchar(32) | default `UNVERIFIED` |
| `publication_status` | varchar(32) | `DRAFT` / `PUBLISHED` (recommended) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### Validation Rules

- Coordinates both null or both non-null  
- `latitude`/`longitude` range checks  
- `years_in_market` ≥ 0  
- Enum constraints on SEZ and verification  

### Permissions

DB role: app service read/write; migrations by privileged migrator.

### Error Handling

Migration failure rolls back; reject orphan facilities without owner.

### Edge Cases

- Manufacturer with zero facilities (allowed)  
- Soft-delete user with facilities (restrict or cascade policy documented)  

### Security Considerations

- No public DB exposure  
- PII in contact_info encrypted at rest if required by policy  
- Parameterized ORM only  

### Dependencies

- EPIC-1 `User` table  
- Decision on UUID vs serial IDs (prefer UUID for public IDs)  

### Testing Checklist

- [ ] Migration up/down  
- [ ] FK insert/delete behavior  
- [ ] Unique/PK constraints  
- [ ] Index existence  
- [ ] Check constraints reject bad lat/lng  

### Definition of Done

- Migration merged  
- ER diagram published  
- Schema reviewed by tech lead  
- Ready for XFY-008 API build  

### SQL-style Schema (reference)

```sql
CREATE TABLE manufacturing_facility (
  id                UUID PRIMARY KEY,
  owner_user_id     UUID NOT NULL REFERENCES users(id),
  company_name      VARCHAR(255) NOT NULL,
  owner_name       VARCHAR(255) NOT NULL,
  address           TEXT,
  city              VARCHAR(100),
  state             VARCHAR(100),
  country           VARCHAR(100),
  zip_code          VARCHAR(20),
  latitude          DECIMAL(10,7),
  longitude         DECIMAL(10,7),
  sector_industry   VARCHAR(100),
  website           VARCHAR(255),
  contact_info      JSONB,
  sez_status        VARCHAR(32) NOT NULL DEFAULT 'NONE',
  serviceable_areas JSONB NOT NULL DEFAULT '[]',
  about_company     TEXT,
  years_in_market   INTEGER,
  infrastructure_details JSONB,
  verification_status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED',
  publication_status  VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_facility_lat CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT chk_facility_lng CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  CONSTRAINT chk_facility_coords_pair CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL)
  ),
  CONSTRAINT chk_years_in_market CHECK (years_in_market IS NULL OR years_in_market >= 0)
);

CREATE INDEX idx_facility_owner ON manufacturing_facility(owner_user_id);
CREATE INDEX idx_facility_geo ON manufacturing_facility(latitude, longitude);
CREATE INDEX idx_facility_location ON manufacturing_facility(country, state, city);
CREATE INDEX idx_facility_industry ON manufacturing_facility(sector_industry);
CREATE INDEX idx_facility_verification ON manufacturing_facility(verification_status);
CREATE INDEX idx_facility_publication ON manufacturing_facility(publication_status);
```

### Entity Relationship Explanation

- **Facility → User**: many facilities may belong to one manufacturer user (`owner_user_id`).  
- **Facility → MachineryInventory**: one-to-many (future epic); machinery rows reference `facility_id`.  
- **Facility → FacilityCertification**: one-to-many.  
- **Facility → FacilityFAQ**: one-to-many ordered.  
- **Facility → ServiceableArea**: logical many-via-JSON or normalized table (see Database Design).  
- **Facility → FacilityImage**: reserved one-to-many (future).  

### Constraints & Index Recommendations

| Constraint / Index | Rationale |
|--------------------|-----------|
| FK `owner_user_id` | Ownership integrity |
| Coord pair check | Prevent half-geocoded rows |
| Lat/lng range checks | Data quality |
| Index owner | Dashboard queries |
| Index geo + location | Radius and location search |
| Index industry + verification + publication | Discovery filters |

---

## Ticket XFY-008

### Ticket ID

`XFY-008`

### Ticket Name

Manufacturer Onboarding Form

### Priority

`P0 — Critical`

### Type

`Full-stack` · `Story`

### Story Points

`8`

### Epic

`EPIC-2 — Manufacturer Facility Profile`

### User Story

As a manufacturer, I want a guided, mobile-friendly onboarding form so that I can create my facility profile accurately and continue later if interrupted.

### Business Value

Accelerates supply onboarding quality and reduces abandoned manufacturer signups.

### Description

Build a responsive multi-section Manufacturer Facility onboarding form with validation, tooltips, industry/state dropdowns, auto-save drafts, continue-later, and a progress indicator. Persist drafts to `ManufacturingFacility` with `publication_status = DRAFT`.

### Functional Requirements

1. Capture: Company Name, Owner Name, Email, Phone, Website, Industry, Factory Address, City, State, Country, ZIP, SEZ Status, Serviceable Areas, About Company, Years in Market.  
2. Responsive, mobile-friendly layout.  
3. Industry and State dropdowns (State dependent on Country).  
4. Required field validation with inline errors.  
5. Helpful descriptions/tooltips per field.  
6. Auto-save draft (debounced).  
7. Continue later (resume draft).  
8. Progress indicator (% or step-based).  
9. Create vs update facility endpoints.  

### Acceptance Criteria

- [ ] Responsive form  
- [ ] Industry dropdown  
- [ ] State dropdown  
- [ ] Required field validation  
- [ ] Helpful descriptions/tooltips  
- [ ] Auto-save draft  
- [ ] Continue later  
- [ ] Progress indicator  
- [ ] Mobile friendly  

### UI Requirements (if frontend)

#### Form Sections

1. **Company Identity** — company name, owner name, website, industry, years in market  
2. **Contact** — email, phone  
3. **Factory Location** — address, city, state, country, ZIP (map deep-link to XFY-009)  
4. **Commercial Reach** — SEZ status, serviceable areas  
5. **Narrative** — about company  
6. **Review & Save** — summary + progress  

#### Field UX

| Field | Control | Tooltip (example) |
|-------|---------|-------------------|
| Company Name | text | Legal / trading name shown to buyers |
| Owner Name | text | Primary accountable contact |
| Industry | select | Primary manufacturing sector |
| SEZ Status | select | Select if plant is in a Special Economic Zone |
| Serviceable Areas | multi-select | Regions you can realistically fulfill |
| About Company | textarea | 2–3 short paragraphs preferred |

#### States

| State | Behavior |
|-------|----------|
| Loading | Skeleton form / spinner while fetching draft |
| Empty | First-time CTA “Create your factory profile” |
| Error | Inline field errors + toast for save failures; retry auto-save |
| Success | “Draft saved” toast; on explicit submit “Profile saved” |
| Offline / save fail | Banner: “Changes not saved—retry” |

#### Progress Indicator

- Show completion % based on required fields filled  
- Optional stepper matching sections  

### Backend Requirements (if backend)

- `POST /facilities` create draft  
- `PATCH /facilities/{id}` update draft/fields  
- `GET /facilities/me` list owner facilities / active draft  
- Debounce-friendly partial updates  
- Enforce ownership on all mutations  
- Compute `completionPercent` server-side for consistency  

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/facilities` | `POST` | Create facility draft |
| `/api/facilities/{id}` | `GET` | Get facility (owner/admin) |
| `/api/facilities/{id}` | `PATCH` | Update facility fields |
| `/api/facilities/me` | `GET` | List my facilities |
| `/api/facilities/{id}/completion` | `GET` | Completion metadata |
| `/api/meta/industries` | `GET` | Industry dropdown options |
| `/api/meta/geo/states` | `GET` | States by country |

### Request Payload

```json
{
  "companyName": "Deshmukh Precision Works",
  "ownerName": "Ravi Deshmukh",
  "contactInfo": {
    "email": "ravi@deshmukh.example",
    "phone": "+919811122233"
  },
  "website": "https://deshmukh.example",
  "sectorIndustry": "Industrial Manufacturing",
  "address": "12 Industrial Estate, Chakan",
  "city": "Pune",
  "state": "Maharashtra",
  "country": "IN",
  "zipCode": "410501",
  "sezStatus": "NONE",
  "serviceableAreas": ["IN-MH", "IN-GJ", "IN-KA"],
  "aboutCompany": "Precision machining and fabrication for OEM partners since 2008.",
  "yearsInMarket": 16
}
```

### Response Payload

```json
{
  "facility": {
    "id": "fac_01HZY...",
    "companyName": "Deshmukh Precision Works",
    "publicationStatus": "DRAFT",
    "verificationStatus": "UNVERIFIED",
    "updatedAt": "2026-07-15T07:00:00.000Z"
  },
  "completion": {
    "percent": 78,
    "missingRequiredFields": ["latitude", "longitude"],
    "canPublish": false
  }
}
```

### Database Tables

`ManufacturingFacility`, `ServiceableArea` (if normalized)

### Database Fields

Uses XFY-007 fields; contact email/phone inside `contact_info`.

### Validation Rules

| Field | Rule |
|-------|------|
| companyName | required, 2–255 |
| ownerName | required, 2–255 |
| contactInfo.email | required, email |
| contactInfo.phone | required, phone |
| website | optional URL |
| sectorIndustry | required |
| address, city, state, country, zipCode | required before publish |
| sezStatus | required enum |
| serviceableAreas | min 1 before publish |
| aboutCompany | max 5000 |
| yearsInMarket | integer ≥ 0 |

### Permissions

`MANUFACTURER` owner only for create/update; must pass EPIC-1 profile publish gate before `PUBLISHED` transition (can still draft).

### Error Handling

`400` validation; `401` unauthenticated; `403` wrong role/owner; `409` conflicting update versions if using `updatedAt` optimistic lock (recommended).

### Edge Cases

- Two tabs auto-saving same draft → last-write-wins or version token  
- Country change clears incompatible state  
- Continue later after logout → resume on next login via `/facilities/me`  
- User with incomplete EPIC-1 profile can draft but not publish  

### Security Considerations

- Sanitize `aboutCompany`  
- Rate-limit PATCH auto-save (e.g., token bucket)  
- Ownership checks on every write  

### Dependencies

- XFY-007 schema  
- EPIC-1 auth + manufacturer role  
- Taxonomy APIs for industry/geo  

### Testing Checklist

- [ ] Create draft  
- [ ] Auto-save persistence  
- [ ] Resume continue-later  
- [ ] Required validation blocks publish path  
- [ ] Mobile layout  
- [ ] Dropdown cascade country→state  
- [ ] Tooltips visible/accessible  

### Definition of Done

- UI accepted by design/PM  
- APIs documented in OpenAPI  
- Draft save reliable under spotty network simulation  
- Accessibility pass on form controls  

---

## Ticket XFY-009

### Ticket ID

`XFY-009`

### Ticket Name

Facility Map Location

### Priority

`P0 — Critical`

### Type

`Full-stack` · `Story`

### Story Points

`8`

### Epic

`EPIC-2 — Manufacturer Facility Profile`

### User Story

As a manufacturer, I want to set my factory map pin accurately so that buyers can understand my location and find me via distance-based search.

### Business Value

Unlocks geographic discovery—one of the highest-intent filters in manufacturing procurement.

### Description

Capture address, geocode to lat/lng, allow manual marker adjustment, persist coordinates, render map on public profile, and enable radius filtering in manufacturer search.

### Functional Requirements

1. Geocode address automatically on blur/save.  
2. Store latitude and longitude.  
3. Allow manual map pin adjustment.  
4. Display map on public profile.  
5. Support distance/radius search against stored coordinates.  
6. Handle geocode failures with manual placement fallback.  

### Acceptance Criteria

- [ ] Accurate geocoding for well-formed addresses  
- [ ] Editable marker  
- [ ] Search supports radius filtering  
- [ ] Public map display  

### UI Requirements (if frontend)

- Embedded map on onboarding location step and public profile  
- “Use address” geocode button + drag pin affordance  
- Show lat/lng read-only readout for transparency  
- Warning if pin far from geocoded address centroid  
- Loading state while geocoding  
- Error state with manual-pin CTA  

### Backend Requirements (if backend)

- Geocoding service adapter (provider-agnostic interface)  
- Endpoint to geocode or accept manual coordinates  
- Persistence of lat/lng on facility  
- Search/filter API supporting `lat`, `lng`, `radiusKm`  
- Optional PostGIS / haversine query strategy documented  

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/facilities/{id}/location` | `PUT` | Set/update coordinates (+ optional address sync) |
| `/api/geo/geocode` | `POST` | Geocode address → candidates |
| `/api/facilities/search` | `GET` | Includes radius filter (may live in search epic; contract defined here) |

### Request Payload

**Geocode**

```json
{
  "address": "12 Industrial Estate, Chakan",
  "city": "Pune",
  "state": "Maharashtra",
  "country": "IN",
  "zipCode": "410501"
}
```

**Set location**

```json
{
  "latitude": 18.7601,
  "longitude": 73.8636,
  "source": "MANUAL_PIN"
}
```

**Search (query)**

`GET /api/facilities/search?lat=18.52&lng=73.85&radiusKm=50&industry=Industrial%20Manufacturing`

### Response Payload

**Geocode 200**

```json
{
  "candidates": [
    {
      "formattedAddress": "Chakan, Pune, Maharashtra, India",
      "latitude": 18.7601,
      "longitude": 73.8636,
      "confidence": 0.92
    }
  ]
}
```

**Location update 200**

```json
{
  "facilityId": "fac_01HZY...",
  "latitude": 18.7601,
  "longitude": 73.8636,
  "source": "MANUAL_PIN"
}
```

### Database Tables

`ManufacturingFacility` (lat/lng fields)

### Database Fields

`latitude`, `longitude`; optional `geocode_precision`, `location_source` (`AUTO`|`MANUAL`)

### Validation Rules

- Lat/lng ranges  
- Radius 1–500 km (configurable)  
- Reject search radius without lat/lng  

### Permissions

Owner updates location; public maps only for published facilities; search returns published (+ verified policy).

### Error Handling

Geocoder `503`/`502` → manual pin path; invalid coords `400`; no results `404` candidates empty array.

### Edge Cases

- Ambiguous addresses → multiple candidates picker  
- Cross-border ZIP quirks  
- Manufacturer moves pin to ocean/far away → soft warning, hard block optional  
- Privacy: public may show approximate pin (config)  

### Security Considerations

- Rate-limit geocode API (cost + abuse)  
- Do not expose provider API keys to client  
- Server-side geocoding preferred  

### Dependencies

- XFY-007/008 facility exists  
- Map SDK (e.g., Google Maps, Mapbox) license  
- Geocoding provider  

### Map Integration Recommendations

| Concern | Recommendation |
|---------|----------------|
| Edit UX | Mapbox GL or Google Maps JS with Draggable Marker |
| Geocoding | Server-side Google Geocoding / Mapbox Geocoding |
| Public view | Lightweight embed; lazy-load map below fold |
| Search | Haversine for MVP; PostGIS `ST_DWithin` for scale |
| Cost control | Cache geocode results by normalized address hash |
| Fallback | Static map image if interactive map fails |

### Testing Checklist

- [ ] Auto geocode from address  
- [ ] Drag pin persists  
- [ ] Public map renders  
- [ ] Radius filter returns expected facilities  
- [ ] Geocoder failure fallback  
- [ ] Rate limit behavior  

### Definition of Done

- Provider configured in staging  
- Search radius demo verified with fixture data  
- UX reviewed for pin editing clarity  

---

## Ticket XFY-010

### Ticket ID

`XFY-010`

### Ticket Name

Manufacturer Certifications

### Priority

`P1 — High`

### Type

`Full-stack` · `Story`

### Story Points

`13`

### Epic

`EPIC-2 — Manufacturer Facility Profile`

### User Story

As a manufacturer, I want to add multiple certifications with supporting documents so that verified credentials appear on my public profile and improve buyer trust.

### Business Value

Differentiation through verified compliance; reduces fake capability claims.

### Description

Implement certification CRUD, secure file upload, status workflow (`Pending`, `Verified`, `Rejected`), admin approval, public verified badges, and expired-certification highlighting.

### Functional Requirements

1. Multiple certifications per facility.  
2. Fields: name, registration number, issuing authority, issue/expiry dates, description, status, supporting document.  
3. File upload with validation.  
4. Admin approval workflow.  
5. Verified badge on public profile.  
6. Highlight expired certifications.  

### Acceptance Criteria

- [ ] Multiple certifications supported  
- [ ] File upload works with type/size limits  
- [ ] Admin approval workflow  
- [ ] Verified badge shown publicly  
- [ ] Expired certifications highlighted  

### UI Requirements (if frontend)

**Manufacturer**

- Certifications list on facility dashboard  
- Add/Edit modal/form  
- Upload dropzone with progress  
- Status chips: Pending / Verified / Rejected  
- Expiry warning styling when `expiryDate < today`  
- Reject reason display when rejected  

**Admin**

- Queue of pending certifications  
- Preview metadata + secured document link  
- Actions: Verify / Reject (reason required)  

**Public**

- Show Verified certs with badge  
- Optional: show expired as “Expired” muted style; hide Rejected/Pending  

### Backend Requirements (if backend)

- Certification CRUD scoped to facility ownership  
- Upload to secure object storage (private bucket)  
- Signed URL generation for authorized viewers  
- Admin transition endpoints  
- Expiry computation flag `isExpired`  
- Audit log on status change  

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/facilities/{facilityId}/certifications` | `GET` | List certifications |
| `/api/facilities/{facilityId}/certifications` | `POST` | Create certification metadata |
| `/api/facilities/{facilityId}/certifications/{certId}` | `PATCH` | Update (owner, if not locked) |
| `/api/facilities/{facilityId}/certifications/{certId}` | `DELETE` | Delete (policy-based) |
| `/api/facilities/{facilityId}/certifications/{certId}/document` | `POST` | Upload supporting document |
| `/api/admin/certifications/pending` | `GET` | Admin queue |
| `/api/admin/certifications/{certId}/verify` | `POST` | Mark verified |
| `/api/admin/certifications/{certId}/reject` | `POST` | Reject with reason |

### Request Payload

**Create**

```json
{
  "certificationName": "ISO 9001:2015",
  "registrationNumber": "IN-QMS-44521",
  "issuingAuthority": "Bureau Veritas",
  "issueDate": "2024-03-01",
  "expiryDate": "2027-02-28",
  "description": "Quality management system certification for machining operations."
}
```

**Reject**

```json
{
  "reason": "Document unreadable; please re-upload a clear PDF of the certificate."
}
```

### Response Payload

```json
{
  "id": "cert_01HZY...",
  "facilityId": "fac_01HZY...",
  "certificationName": "ISO 9001:2015",
  "registrationNumber": "IN-QMS-44521",
  "issuingAuthority": "Bureau Veritas",
  "issueDate": "2024-03-01",
  "expiryDate": "2027-02-28",
  "description": "Quality management system certification for machining operations.",
  "status": "PENDING",
  "isExpired": false,
  "document": {
    "fileName": "iso9001.pdf",
    "contentType": "application/pdf",
    "sizeBytes": 245678,
    "uploadedAt": "2026-07-15T07:10:00.000Z"
  },
  "review": {
    "reviewedAt": null,
    "reviewedBy": null,
    "rejectionReason": null
  }
}
```

### Database Tables

`FacilityCertification`

### Database Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `facility_id` | FK | |
| `certification_name` | varchar | |
| `registration_number` | varchar | |
| `issuing_authority` | varchar | |
| `issue_date` | date | |
| `expiry_date` | date | nullable |
| `description` | text | |
| `status` | varchar | `PENDING`/`VERIFIED`/`REJECTED` |
| `document_key` | text | storage object key |
| `document_content_type` | varchar | |
| `document_size_bytes` | int | |
| `rejection_reason` | text | |
| `reviewed_by` | UUID | admin user |
| `reviewed_at` | timestamptz | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### Validation Rules

- Name, issuing authority required  
- `expiry_date` ≥ `issue_date` when both present  
- File types: PDF/JPG/PNG; max size e.g. 10MB  
- Owner cannot self-set `VERIFIED`  
- New uploads reset status to `PENDING` if previously verified (policy)  

### Permissions

| Actor | Allowed |
|-------|---------|
| Owner | Create/update/delete (with status rules) |
| Admin | Verify/reject; read documents |
| Public | Read verified (non-sensitive) fields only; no raw document by default |

### Error Handling

`413` file too large; `415` unsupported type; `403` unauthorized status change; `404` cert not found.

### Edge Cases

- Expiry while verified → show expired highlight; auto-status `EXPIRED` optional  
- Multiple certs same name different reg numbers — allowed  
- Delete after verified — soft-delete recommended  
- Admin verifies without document — block  

### Security Considerations

- Private bucket; signed URLs short TTL  
- Malware scanning recommended  
- Virus/content-type sniffing not trust Client `Content-Type` alone  
- Audit every status transition  
- IDOR protection on facility/cert IDs  

### Dependencies

- XFY-007 facility  
- Object storage  
- Admin role from EPIC-1  

### Upload Workflow

```
Owner creates certification metadata (PENDING)
        ↓
Owner uploads supporting document
        ↓
Document stored privately; metadata linked
        ↓
Appears in Admin pending queue
```

### Verification Workflow

```
Admin opens pending item + document
        ↓
Admin Verifies OR Rejects (reason required)
        ↓
If Verified → public badge eligible
If Rejected → owner notified; can edit/reupload → PENDING
```

### Admin Workflow

1. Filter pending certifications  
2. Review facility context + document  
3. Verify / Reject  
4. Action written to audit log  
5. Manufacturer notified (email/in-app—notification epic may stub)  

### Testing Checklist

- [ ] Multi-cert create  
- [ ] Upload constraints  
- [ ] Admin verify/reject  
- [ ] Public shows verified only  
- [ ] Expired highlighting  
- [ ] Signed URL auth  

### Definition of Done

- Admin QA script complete  
- Security review on uploads  
- Public badge UX accepted  

---

## Ticket XFY-011

### Ticket ID

`XFY-011`

### Ticket Name

FAQ & Company Details

### Priority

`P1 — High`

### Type

`Full-stack` · `Story`

### Story Points

`5`

### Epic

`EPIC-2 — Manufacturer Facility Profile`

### User Story

As a manufacturer, I want to add, edit, delete, and reorder FAQs so that common buyer questions are answered on my public profile.

### Business Value

Improves conversion and reduces repetitive inbound questions.

### Description

Implement FAQ CRUD and ordering for a facility; render ordered FAQs on the public manufacturer profile. Support admin moderation (hide/delete). Company details editing overlaps XFY-008; this ticket focuses on FAQ lifecycle and public display hooks for company/FAQ sections.

### Functional Requirements

1. Add FAQ  
2. Edit FAQ  
3. Delete FAQ  
4. Reorder FAQ  
5. Public profile displays FAQs in order  
6. Admin can moderate FAQs  

### Acceptance Criteria

- [ ] Public profile displays FAQs  
- [ ] Owner can add/edit/delete/reorder  
- [ ] Order persists and is respected publicly  

### UI Requirements (if frontend)

- FAQ manager list with drag-and-drop reorder  
- Inline or modal editors for Q&A  
- Empty state: “Add FAQs buyers usually ask (MOQ, lead time, materials…)”  
- Public accordion/list  
- Optimistic reorder with rollback on failure  

### Backend Requirements (if backend)

- CRUD endpoints  
- Reorder endpoint accepting ordered ID list  
- Contiguous `sort_order` maintenance  
- Sanitize HTML/text  
- Max FAQ count per facility (e.g., 20)  

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/facilities/{facilityId}/faqs` | `GET` | List FAQs (owner sees all; public sees visible) |
| `/api/facilities/{facilityId}/faqs` | `POST` | Create FAQ |
| `/api/facilities/{facilityId}/faqs/{faqId}` | `PATCH` | Edit FAQ |
| `/api/facilities/{facilityId}/faqs/{faqId}` | `DELETE` | Delete FAQ |
| `/api/facilities/{facilityId}/faqs/reorder` | `PUT` | Reorder FAQs |
| `/api/admin/faqs/{faqId}/moderate` | `POST` | Hide/remove FAQ |

### Request Payload

**Create**

```json
{
  "question": "What is your typical MOQ?",
  "answer": "MOQ depends on process; for CNC machining pilots we often start at 10 units."
}
```

**Reorder**

```json
{
  "orderedFaqIds": ["faq_3", "faq_1", "faq_2"]
}
```

### Response Payload

```json
{
  "faqs": [
    {
      "id": "faq_3",
      "question": "What is your typical MOQ?",
      "answer": "MOQ depends on process; for CNC machining pilots we often start at 10 units.",
      "sortOrder": 1,
      "isVisible": true
    }
  ]
}
```

### Database Tables

`FacilityFAQ`

### Database Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID PK | |
| `facility_id` | FK | |
| `question` | varchar(500) | |
| `answer` | text | |
| `sort_order` | int | |
| `is_visible` | boolean | admin/owner soft hide |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### Validation Rules

- Question 5–500 chars  
- Answer 5–5000 chars  
- Max FAQs per facility  
- Reorder must include all owned visible FAQ IDs (or complete set policy)  

### Permissions

Owner manage own; public read visible on published profiles; admin moderate.

### Error Handling

`400` validation; `403` ownership; `409` reorder set mismatch.

### Edge Cases

- Concurrent reorder  
- Delete while public page cached — cache invalidate  
- Empty FAQ section hidden on public profile  

### Ordering Logic

1. Client sends full ordered ID array.  
2. Server verifies all IDs belong to facility.  
3. Transactionally assign `sort_order = index + 1`.  
4. Return new ordered list.  

Alternative: fractional indexing for frequent inserts—optional later.

### Security Considerations

- Sanitize Q&A (XSS)  
- Rate-limit write APIs  
- Audit admin moderation  

### Dependencies

- XFY-007/008 facility  
- Public profile page composition  

### Testing Checklist

- [ ] CRUD operations  
- [ ] Reorder persistence  
- [ ] Public order matches  
- [ ] Admin hide removes from public  
- [ ] Max count enforcement  

### Definition of Done

- FAQ manager UX accepted  
- Public accordion responsive  
- API tests coverage for reorder race  

---

# Database Design

## Entity Relationship Diagram (text)

```
User
 └─1──* ManufacturingFacility
         ├─1──* FacilityCertification
         ├─1──* FacilityFAQ
         ├─1──* ServiceableArea     (optional normalized)
         ├─1──* FacilityImage       (future)
         └─1──* MachineryInventory  (future epic)
```

## Table: `ManufacturingFacility`

| Column | PK/FK | Type | Constraints |
|--------|-------|------|-------------|
| id | PK | UUID | |
| owner_user_id | FK → users.id | UUID | NOT NULL, INDEX |
| company_name | | varchar(255) | NOT NULL |
| owner_name | | varchar(255) | NOT NULL |
| address | | text | |
| city | | varchar(100) | INDEX(composite) |
| state | | varchar(100) | |
| country | | varchar(100) | |
| zip_code | | varchar(20) | |
| latitude | | decimal(10,7) | range check |
| longitude | | decimal(10,7) | range check |
| sector_industry | | varchar(100) | INDEX |
| website | | varchar(255) | |
| contact_info | | jsonb | |
| sez_status | | varchar(32) | NOT NULL DEFAULT 'NONE' |
| serviceable_areas | | jsonb | DEFAULT [] |
| about_company | | text | |
| years_in_market | | int | ≥ 0 |
| infrastructure_details | | jsonb | |
| verification_status | | varchar(32) | DEFAULT 'UNVERIFIED' INDEX |
| publication_status | | varchar(32) | DEFAULT 'DRAFT' INDEX |
| created_at | | timestamptz | NOT NULL |
| updated_at | | timestamptz | NOT NULL |

## Table: `FacilityCertification`

| Column | PK/FK | Notes |
|--------|-------|-------|
| id | PK | |
| facility_id | FK → manufacturing_facility.id ON DELETE CASCADE | INDEX |
| certification_name | | NOT NULL |
| registration_number | | |
| issuing_authority | | NOT NULL |
| issue_date | | |
| expiry_date | | CHECK expiry ≥ issue |
| description | | |
| status | | PENDING/VERIFIED/REJECTED INDEX |
| document_key | | |
| document_content_type | | |
| document_size_bytes | | |
| rejection_reason | | |
| reviewed_by | FK users | |
| reviewed_at | | |
| created_at / updated_at | | |

## Table: `FacilityFAQ`

| Column | PK/FK | Notes |
|--------|-------|-------|
| id | PK | |
| facility_id | FK CASCADE | INDEX |
| question | | NOT NULL |
| answer | | NOT NULL |
| sort_order | | NOT NULL INDEX (facility_id, sort_order) |
| is_visible | | DEFAULT true |
| created_at / updated_at | | |

## Table: `FacilityImage` (future)

| Column | Notes |
|--------|-------|
| id PK | |
| facility_id FK | |
| storage_key | |
| caption | |
| sort_order | |
| is_primary | |
| created_at | |

## Table: `ServiceableArea` (optional normalized)

Prefer normalized form when filtering intensity grows:

| Column | Notes |
|--------|-------|
| id PK | |
| facility_id FK | |
| area_code | e.g., `IN-MH` |
| area_name | |
| area_type | STATE/COUNTRY/REGION |
| UNIQUE(facility_id, area_code) | |

Until then, `serviceable_areas` JSONB on facility is acceptable for MVP with GIN index if queried.

## Indexes Summary

| Table | Index |
|-------|-------|
| manufacturing_facility | owner_user_id |
| manufacturing_facility | (country, state, city) |
| manufacturing_facility | (latitude, longitude) |
| manufacturing_facility | sector_industry |
| manufacturing_facility | verification_status, publication_status |
| facility_certification | facility_id, status |
| facility_faq | (facility_id, sort_order) |

---

# REST API Summary

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/facilities` | `POST` | Create facility draft | Manufacturer |
| `/api/facilities/me` | `GET` | List own facilities | Manufacturer |
| `/api/facilities/{id}` | `GET` | Get facility (owner/admin; public variant separate) | Conditional |
| `/api/facilities/{id}` | `PATCH` | Update facility | Owner |
| `/api/facilities/{id}/publish` | `POST` | Publish if complete | Owner |
| `/api/facilities/{id}/completion` | `GET` | Completion metadata | Owner |
| `/api/facilities/{id}/location` | `PUT` | Update map coordinates | Owner |
| `/api/geo/geocode` | `POST` | Geocode address | Authenticated |
| `/api/facilities/search` | `GET` | Search incl. radius filter | Public/Auth |
| `/api/public/facilities/{idOrSlug}` | `GET` | Public manufacturer profile | Public |
| `/api/facilities/{id}/certifications` | `GET` | List certifications | Owner/Admin; public filtered |
| `/api/facilities/{id}/certifications` | `POST` | Create certification | Owner |
| `/api/facilities/{id}/certifications/{certId}` | `PATCH` | Update certification | Owner |
| `/api/facilities/{id}/certifications/{certId}` | `DELETE` | Delete certification | Owner |
| `/api/facilities/{id}/certifications/{certId}/document` | `POST` | Upload document | Owner |
| `/api/admin/certifications/pending` | `GET` | Pending cert queue | Admin |
| `/api/admin/certifications/{certId}/verify` | `POST` | Verify certification | Admin |
| `/api/admin/certifications/{certId}/reject` | `POST` | Reject certification | Admin |
| `/api/admin/facilities/{id}/verify` | `POST` | Verify facility | Admin |
| `/api/admin/facilities/{id}/reject` | `POST` | Reject facility | Admin |
| `/api/facilities/{id}/faqs` | `GET` | List FAQs | Conditional |
| `/api/facilities/{id}/faqs` | `POST` | Create FAQ | Owner |
| `/api/facilities/{id}/faqs/{faqId}` | `PATCH` | Edit FAQ | Owner |
| `/api/facilities/{id}/faqs/{faqId}` | `DELETE` | Delete FAQ | Owner |
| `/api/facilities/{id}/faqs/reorder` | `PUT` | Reorder FAQs | Owner |
| `/api/admin/faqs/{faqId}/moderate` | `POST` | Moderate FAQ | Admin |
| `/api/meta/industries` | `GET` | Industry options | Public/Auth |
| `/api/meta/geo/states` | `GET` | States by country | Public/Auth |

---

# Public Manufacturer Profile

## Route

`/manufacturers/{idOrSlug}` (public)

## Displays

| Section | Content |
|---------|---------|
| **Header** | Company name, industry, city/state/country, verification badge |
| **Company Overview** | Snapshot chips: years in market, SEZ status, machinery count, serviceable regions |
| **About Company** | Long-form about text |
| **Contact Details** | Public-safe email/phone (masking policy applies) |
| **Factory Address** | Structured address |
| **Google Map / Map Embed** | Interactive or static map from stored coordinates |
| **Manufacturing Industries** | Primary sector + capability tags |
| **Infrastructure** | Infrastructure details blocks |
| **Years in Market** | Numeric/tenure display |
| **Certifications** | Verified list + badges; expired highlighted |
| **FAQs** | Ordered accordion |
| **Machinery Count** | Aggregate from MachineryInventory (0 until machinery epic) |
| **Verification Badge** | Facility-level verified indicator |
| **Reviews (future)** | Placeholder section hidden until reviews epic |

## Visibility Rules

- Only `PUBLISHED` facilities  
- Prefer `VERIFIED` facilities in search ranking (policy)  
- Draft/rejected not publicly routable (`404`)  
- Owner may use preview token/route for drafts  

## Primary CTAs

- “Send Manufacturing Request” (Visionary; later epic)  
- “Message Manufacturer” (messaging epic)  
- “View Machinery” (machinery epic)  

---

# Admin Features

| Capability | Description |
|------------|-------------|
| **Verify Facility** | Set `verification_status = VERIFIED`; optional notes |
| **Reject Facility** | Set `REJECTED` with mandatory reason; unpublish if needed |
| **Verify Certifications** | Approve pending certs; badge eligibility |
| **Reject Certifications** | Reject with reason; notify owner |
| **Moderate FAQs** | Hide/remove inappropriate Q&A |
| **Audit Logs** | Record actor, action, entity, before/after, timestamp, IP |

### Admin API notes

All admin actions require `PLATFORM_ADMIN`, are rate-limited, and emit audit events.

---

# Security Requirements

| Control | Requirement |
|---------|-------------|
| Role-based permissions | Manufacturer vs Admin vs Public clearly enforced |
| Ownership validation | Every mutation checks `owner_user_id` |
| File upload validation | Type, size, malware scan; private storage |
| Input sanitization | XSS-safe about text and FAQs |
| Audit logging | Verification, rejection, moderation, ownership transfers |
| Secure document storage | Private bucket + short-lived signed URLs |
| Rate limiting | Geocode, auto-save PATCH, uploads, admin actions |
| IDOR protection | Guessable IDs mitigated via UUID + authz checks |
| Least privilege signed URLs | Cert documents not publicly cacheable |

---

# Non-functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Public profile p95 < 400ms server time excluding map tiles; geocode p95 depends on provider |
| **Scalability** | Indexed geo/location/industry queries; CDN for public profile assets |
| **Reliability** | Draft auto-save durable; upload retries; geocode fallback path |
| **Security** | OWASP-aligned file and access controls |
| **Accessibility** | WCAG 2.1 AA for forms, FAQ accordion, map alternatives (address text always present) |
| **Mobile responsiveness** | Onboarding + public profile usable on small screens; map pinch/drag supported |

---

# Ticket Summary Board

| Ticket | Name | Priority | Points | Focus |
|--------|------|----------|--------|-------|
| XFY-007 | Create Manufacturer Facility Database Model | P0 | 5 | Schema / ER |
| XFY-008 | Manufacturer Onboarding Form | P0 | 8 | Draft UX + APIs |
| XFY-009 | Facility Map Location | P0 | 8 | Geo + search radius |
| XFY-010 | Manufacturer Certifications | P1 | 13 | Docs + admin verify |
| XFY-011 | FAQ & Company Details | P1 | 5 | FAQ CRUD + public |
| | **Total** | | **39** | |

**Suggested sequencing:** XFY-007 → XFY-008 → XFY-009 → (XFY-011 ∥ XFY-010)

---

# Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Low-quality incomplete facilities | Draft + publish gates; completion % |
| Fake certifications | Admin verify + private docs + audit |
| Geocoding cost/abuse | Server-side + cache + rate limits |
| Map privacy concerns | Optional coordinate fuzzing for public |
| Multi-facility UX complexity early | Schema multi; MVP onboarding can emphasize primary facility |

---

# Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| Multiple factory locations | First-class multi-plant UX and search |
| Virtual factory tours | Guided media walkthroughs |
| Factory videos | Hosted/streamed facility videos |
| 360° images | Immersive plant imagery |
| ISO verification APIs | Automated certificate validation |
| Government registration verification | Corporate registry KYB checks |
| Capacity analytics | Utilization insights per facility |
| ESG / Sustainability profile | Emissions, certifications, green power |
| Factory awards | Recognitions and badges |
| AI-generated company descriptions | Draft “About” from structured inputs |
| FacilityImage gallery | Photo management with primary image |
| Reviews on public profile | Close trust loop with Visionary ratings |

---

## Traceability

| Artifact | Use |
|----------|-----|
| PRD | Facility/profile requirements |
| SRS | Functional + data + API contracts |
| Tech Design | Schema, geo strategy, upload security |
| Jira / Azure DevOps | Import XFY-007–XFY-011 |
| Confluence / Notion | Single source for EPIC 2 |
| Release 1 Roadmap | Prerequisite to machinery listings & discovery |

---

**X!Y — The Explorer Factory**  
*Why own it when you can make it.*
