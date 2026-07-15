# X!Y — The Explorer Factory

## EPIC 3 — Machinery Inventory & Service Listings

**Tagline:** *Why own it when you can make it.*

**Document Type:** Software Specification · Epic Definition  
**Epic ID:** EPIC-3  
**Version:** 1.0  
**Last Updated:** July 2026  
**Classification:** PRD · SRS · Technical Design Document · Jira / Azure DevOps Backlog · Confluence · Agile Sprint Planning · Developer Documentation  
**Release Mapping:** Release 1 — MVP Marketplace  
**Depends On:** EPIC-1 (Auth) · EPIC-2 (Manufacturer Facility Profile)

---

## Epic Summary

**EPIC 3 — Machinery Inventory & Service Listings** enables **Manufacturers / Factory Owners** to publish rich, bookable machinery listings attached to verified facilities. Each listing describes the machine and the commercial envelope around it—pricing, availability, raw materials, labor, logistics, infrastructure, insurance, keywords, and media—so **Visionaries / Ideators / Startups** can discover, compare, evaluate, and eventually book manufacturing capacity.

This epic converts facility profiles (EPIC 2) into ** monetizable, searchable capacity inventory**—the core supply SKU of the X!Y marketplace.

---

## Business Objective

- Represent idle and available manufacturing capacity as structured, discoverable listings  
- Enable comparison-grade detail (specs, price, services, risk/insurance) before requests  
- Standardize taxonomy (industry → subcategory → machinery type) for search quality  
- Support draft → publish → unpublish → archive lifecycle with admin moderation  
- Lay foundations for booking, offers, and AI matching in later epics  

---

## User Value

| Audience | Value |
|----------|-------|
| Manufacturers | Monetize spare capacity with multi-attribute listings and service add-ons |
| Visionaries | Evaluate fit on specs, cost model, availability, and support services |
| Admins | Moderate listing quality, keywords, and publish eligibility |
| Platform | Liquid, filterable supply inventory that drives requests and bookings |

---

## Scope

EPIC 3 covers machinery inventory data model, add/edit listing UX, images, taxonomy, pricing & add-on services, raw materials, labor, logistics, infrastructure, insurance, keywords, listing status lifecycle, manufacturer machinery dashboard widgets, public machinery listing page, and admin moderation hooks.

---

## In Scope

- Machinery inventory CRUD attached to facilities  
- Industry / subcategory / machinery type taxonomy (+ custom type requests)  
- Technical specifications, condition, age, capacity  
- Multi-image upload with primary, reorder, thumbs, optimization  
- Availability status and booking duration bounds  
- Pricing by multiple units + additional service costs  
- Raw material, labor, logistics, infrastructure, insurance modules  
- Keyword tagging with suggestions, dedupe, indexing hooks  
- Draft auto-save; Publish / Unpublish / Archive  
- Manufacturer dashboard for machinery management  
- Public machinery listing page composition  
- Admin approve/reject/flag moderation  

---

## Out of Scope

- End-to-end booking payment capture (booking epic; insurance acknowledgement hook reserved)  
- Real-time IoT availability / machine health  
- CAD viewers, video, 360° tours (future)  
- Dynamic pricing algorithms / yield management (future)  
- Featured listing billing (Release 2 monetization)  
- Cross-facility bulk import via ERP (Release 3 integrations)  
- Reviews display (future placeholder on public page)  

---

## Role Prerequisites

| Role | Capability |
|------|------------|
| `MANUFACTURER` | CRUD own machinery under owned facilities |
| `VISIONARY` / buyers | View **published** (and policy-approved) listings |
| `PLATFORM_ADMIN` | Moderate, approve/reject, keyword governance, audit |
| Public | View published listings (policy-configurable) |

> Publish requires: EPIC-1 profile gate + EPIC-2 facility publishability + EPIC-3 listing required fields complete + (optional) admin approval.

---

# Features Included

## Feature F1 — Machinery Inventory

### Purpose
Represent each machine (or machine cell) as a first-class, facility-scoped listing.

### Business Value
Creates the atomic supply unit for search, comparison, requests, and bookings.

### User Benefits
Manufacturers list capacity precisely; buyers filter to usable assets.

### Functional Requirements
1. Each machinery row belongs to exactly one `facility_id`.  
2. Support multiple machines per facility.  
3. Persist commercial and operational attributes listed in XFY-012.  
4. Enforce ownership via facility → owner user.  

### Validation Rules
Facility must exist and be owned by actor; name required; status lifecycle valid.

### Permissions
Owner manufacturer write; public/authenticated read if published.

### Error Handling
`404` facility; `403` non-owner; `400` incomplete publish.

### Future Enhancements
Machine groups/cells; serialized asset IDs; IoT twin IDs.

---

## Feature F2 — Industry Classification

### Purpose
Assign top-level industry taxonomy for discovery.

### Business Value
Primary navigation and search facet; cohort analytics.

### User Benefits
Buyers browse familiar industry buckets.

### Functional Requirements
Controlled industry list; required on listing; filterable in search.

### Validation Rules
Must be platform taxonomy ID/code.

### Permissions
Manufacturer select; admin manage taxonomy (config).

### Error Handling
Unknown industry → `400`.

### Future Enhancements
Multi-industry tags per machine.

---

## Feature F3 — Subcategory Management

### Purpose
Second-level taxonomy under industry.

### Business Value
Improves precision of matching and SEO landing pages.

### User Benefits
Narrower discovery without free-text chaos.

### Functional Requirements
Subcategories dependent on selected industry; cascading dropdowns.

### Validation Rules
Subcategory must belong to selected industry.

### Permissions
Manufacturer select; admin maintain mapping.

### Error Handling
Industry change clears incompatible subcategory.

### Future Enhancements
Suggested subcategory from machinery type ML.

---

## Feature F4 — Machinery Types

### Purpose
Third-level standardized machine type (e.g., CNC Vertical Mill).

### Business Value
Comparable inventory across manufacturers.

### User Benefits
Buyers search by known machine classes.

### Functional Requirements
Type list filtered by subcategory; required unless custom type path used.

### Validation Rules
Type ∈ subcategory catalog.

### Permissions
Manufacturer select; admin catalog CRUD.

### Error Handling
Invalid type → `400`.

### Future Enhancements
Type-specific spec templates.

---

## Feature F5 — Custom Machinery Types

### Purpose
Allow manufacturers to request/submit types not in catalog.

### Business Value
Coverage for niche capacity without blocking listing creation.

### User Benefits
Can still publish unique equipment.

### Functional Requirements
Custom type string + status `PENDING_REVIEW`; admin can promote to catalog.

### Validation Rules
Length limits; duplicate soft-check against catalog.

### Permissions
Manufacturer propose; admin approve into taxonomy.

### Error Handling
Empty custom type when type=CUSTOM → `400`.

### Future Enhancements
Auto-merge similar custom labels.

---

## Feature F6 — Technical Specifications

### Purpose
Structured and/or key-value specs (power, bed size, tolerance, spindle, etc.).

### Business Value
Comparison shopping; future AI matching features.

### User Benefits
Evaluate technical fit before messaging.

### Functional Requirements
Store `technical_specifications` as JSON object; optional typed template by machinery type.

### Validation Rules
Max keys/size; numeric fields typed where template exists; sanitize strings.

### Permissions
Owner write; public read published.

### Error Handling
Oversized JSON → `400`.

### Future Enhancements
Spec comparison table across shortlisted machines.

---

## Feature F7 — Machinery Images

### Purpose
Visual proof and marketing assets for listings.

### Business Value
Higher CTR and trust; reduces low-quality text-only spam.

### User Benefits
See the actual machine; manufacturers showcase assets.

### Functional Requirements
Multi-image; primary; reorder; delete; optimize; thumbnails; preview before commit.

### Validation Rules
JPG/PNG/WebP; count/size limits; see XFY-014.

### Permissions
Owner manage; public view published images.

### Error Handling
`413`/`415`; rollback failed batches.

### Future Enhancements
Video, 360°, AR previews.

---

## Feature F8 — Availability Status

### Purpose
Signal whether the machine can accept bookings.

### Business Value
Prevents wasted inbound demand on offline assets.

### User Benefits
Buyers filter to bookable capacity.

### Functional Requirements
Enum e.g. `AVAILABLE`, `LIMITED`, `BOOKED`, `MAINTENANCE`, `UNAVAILABLE`; searchable.

### Validation Rules
Required; transitions audited optionally.

### Permissions
Owner update; public read.

### Error Handling
Invalid enum → `400`.

### Future Enhancements
Calendar-synced live availability (booking epic / IoT).

---

## Feature F9 — Pricing & Service Costs

### Purpose
Publish usage pricing and optional add-on services.

### Business Value
Transparency that accelerates offers and bookings.

### User Benefits
Compare cost models; understand total service cost.

### Functional Requirements
Base usage cost + unit; additional services with tax flags; multi-unit support.

### Validation Rules
Amount ≥ 0; unit required; see XFY-019.

### Permissions
Owner write; public read published pricing (or “request quote” mode—config).

### Error Handling
Currency mismatch → `400`.

### Future Enhancements
Dynamic pricing; volume tiers; quote calculator.

---

## Feature F10 — Raw Material Availability

### Purpose
Declare whether materials can be supplied with the machine booking.

### Business Value
Increases deal completeness; reduces multi-vendor friction.

### User Benefits
Buyers know if they must self-source materials.

### Functional Requirements
Tri-state Yes/No/Partial + material line items when Yes/Partial.

### Validation Rules
If Yes/Partial, ≥1 material line (before publish policy).

### Permissions
Owner manage; public read.

### Error Handling
Yes without lines → publish blocked.

### Future Enhancements
Link to Vendor marketplace SKUs (Release 2).

---

## Feature F11 — Labor Availability

### Purpose
Declare included or available workforce with the machine.

### Business Value
Differentiates “machine only” vs “manned cell” offerings.

### User Benefits
Buyers plan staffing needs accurately.

### Functional Requirements
Yes/No/On Request; skilled/unskilled counts; roles; engagement type.

### Validation Rules
Counts ≥ 0; role enums valid.

### Permissions
Owner write; public read.

### Error Handling
Invalid role → `400`.

### Future Enhancements
Link Labor Supplier marketplace (Release 2).

---

## Feature F12 — Logistics & Transportation

### Purpose
Declare shipping/logistics support tied to the listing/facility capacity.

### Business Value
Makes production-to-delivery path clearer; higher conversion.

### User Benefits
Know if local/outstation/international move is supported.

### Functional Requirements
Scope flags + freight partner, modes, warehousing, packaging, ETA.

### Validation Rules
If logistics_available, require ≥1 delivery mode.

### Permissions
Owner write; public read.

### Error Handling
Incomplete logistics block → warn/block publish.

### Future Enhancements
Logistics provider API quotes (Release 3).

---

## Feature F13 — Infrastructure Details

### Purpose
Machine/facility support utilities and handling capabilities relevant to the listing.

### Business Value
Prevents unfit bookings (power, crane, QA, etc.).

### User Benefits
Technical diligence without a site visit.

### Functional Requirements
Structured infrastructure attributes (electricity, water, air, waste, storage, packaging, QA, dock, crane, safety certs).

### Validation Rules
Known keys validated; free-text length limits.

### Permissions
Owner write; public read.

### Error Handling
Invalid structure → `400`.

### Future Enhancements
Inherit defaults from facility infrastructure with overrides.

---

## Feature F14 — Insurance & Liability

### Purpose
Disclose insurance inclusion, coverage, exclusions, and terms.

### Business Value
Risk clarity; fewer disputes; booking acknowledgement hook.

### User Benefits
Understand liability before committing.

### Functional Requirements
Insurance fields + acknowledgement required at booking (consumer epic); display on public page.

### Validation Rules
If insurance_included, coverage amount & basis required.

### Permissions
Owner write; public read summaries; full terms accessible.

### Error Handling
Missing coverage when included → `400`.

### Future Enhancements
Upload insurance PDFs; insurer API verification.

---

## Feature F15 — Keyword Tagging

### Purpose
Free-form + suggested tags for search recall.

### Business Value
Long-tail discovery; SEO; trending insights.

### User Benefits
Find machines via colloquial terms.

### Functional Requirements
Add/remove keywords; dedupe; suggestions; index; admin moderation.

### Validation Rules
Length, count caps, blocked terms list.

### Permissions
Owner tag; admin moderate; public see approved tags.

### Error Handling
Duplicate ignored; banned → `400`.

### Future Enhancements
AI keyword suggestions from specs/images.

---

## Feature F16 — Listing Status Management

### Purpose
Control commercial visibility lifecycle.

### Business Value
Governance and quality of searchable supply.

### User Benefits
Manufacturers stage work; pause listings without delete.

### Functional Requirements
Statuses: `DRAFT`, `PENDING_APPROVAL`, `PUBLISHED`, `UNPUBLISHED`, `REJECTED`, `ARCHIVED`.

### Validation Rules
Legal transitions only; publish requires completeness.

### Permissions
Owner draft/publish(un)/archive; admin approve/reject.

### Error Handling
Illegal transition → `409`.

### Future Enhancements
Scheduled publish; auto-unpublish on expired insurance.

---

## Feature F17 — Draft Save

### Purpose
Persist incomplete listings safely.

### Business Value
Higher completion rates; less data loss.

### User Benefits
Continue later across sessions/devices.

### Functional Requirements
Debounced auto-save; explicit save; resume from dashboard.

### Validation Rules
Minimal fields to create draft (facility + name).

### Permissions
Owner only.

### Error Handling
Conflict/version token; offline retry UX.

### Future Enhancements
Draft sharing within org accounts.

---

## Feature F18 — Publish / Unpublish / Archive

### Purpose
Make listings searchable or withdraw them deliberately.

### Business Value
Marketplace liquidity control with manufacturer agency.

### User Benefits
Go live when ready; pause for maintenance; archive obsolete assets.

### Functional Requirements
Publish validates completeness + gates; Unpublish hides from search; Archive soft-ends listing (read-only).

### Validation Rules
Cannot publish archived without restore policy; cannot archive without confirm.

### Permissions
Owner actions; admin force-unpublish.

### Error Handling
Incomplete → `400` with missing fields.

### Future Enhancements
Bulk actions; archive reasons analytics.

---

# Developer Tickets

---

## Ticket XFY-012

### Ticket ID
`XFY-012`

### Ticket Name
Create Machinery Inventory Database Model

### Priority
`P0 — Critical`

### Type
`Backend` · `Database` · `Story`

### Story Points
`8`

### Epic
`EPIC-3 — Machinery Inventory & Service Listings`

### User Story
As a platform engineer, I need a normalized machinery inventory schema with related service tables so that listings, media, pricing, and support attributes can evolve independently.

### Business Value
Establishes the supply inventory foundation for discovery, comparison, and booking.

### Description
Create `MachineryInventory` and related child entities (images, keywords, pricing, raw materials, labor, logistics, infrastructure, insurance, additional services). Define PKs, FKs, indexes, constraints, and validation rules. Facility has many machinery rows.

### Functional Requirements
1. Create machinery table with all specified core fields.  
2. FK to `manufacturing_facility`.  
3. Support 1—* child tables for images, keywords, pricing, materials, labor, logistics.  
4. Indexes for facility, status, availability, industry/type, and search-oriented columns.  
5. Check constraints for durations, money, enums.  

### UI Requirements (if frontend)
N/A — publish ER diagram to Confluence.

### Backend Requirements (if backend)
Migrations, ORM models, enum types, repository stubs.

### Acceptance Criteria
- [ ] Schema created with all listed fields  
- [ ] Facility → many Machinery relationship enforced  
- [ ] Child relationships reserved/created for Images, Keywords, Pricing, Raw Materials, Labor, Logistics  
- [ ] Indexes, constraints, validation rules documented and migrated  

### Validation Rules
- `facility_id` required  
- `minimum_booking_duration` ≤ `maximum_booking_duration` when both set  
- `usage_cost_per_unit` ≥ 0  
- Coordinate child invariants deferred to feature tickets  

### Permissions
Migrator + app DB roles only.

### REST API Endpoints
N/A (foundation).

### Request Payload
N/A

### Response Payload
N/A

### Database Tables
`MachineryInventory` (+ child tables stubs)

### Database Fields
See Database Design — MachineryInventory.

### Entity Relationships
Facility 1—* Machinery; Machinery 1—* Images/Keywords/Pricing/RawMaterial/Labor/Logistics/etc.

### Error Handling
Migration transactional; reject orphan machinery without facility.

### Security Considerations
No public DB; encrypt sensitive liability notes if required.

### Edge Cases
Facility deleted → cascade or restrict (recommend RESTRICT if published history needed; soft-delete facility preferred).

### Dependencies
EPIC-2 `ManufacturingFacility`.

### Testing Checklist
- [ ] Up/down migration  
- [ ] FK behavior  
- [ ] Check constraints  
- [ ] Index presence  

### Definition of Done
Migration merged; ER reviewed; ready for form APIs.

---

## Ticket XFY-013

### Ticket ID
`XFY-013`

### Ticket Name
Add/Edit Machinery Listing Form

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`13`

### Epic
`EPIC-3 — Machinery Inventory & Service Listings`

### User Story
As a manufacturer, I want a guided add/edit machinery form with drafts and publish controls so that I can create complete, discoverable listings.

### Business Value
Primary supply-creation UX; quality of inventory depends on this form.

### Description
Responsive multi-section listing wizard/form covering taxonomy, description, specs, age/capacity/condition, availability, pricing entry points, insurance summary, and keywords. Auto-save draft; publish/unpublish/archive; tooltips; progress; validation.

### Functional Requirements
1. Create and edit machinery under a selected owned facility.  
2. Fields: Industry, Subcategory, Machinery Type, Custom Machinery, Description, Technical Specs, Age, Capacity, Condition, Availability, Pricing, Insurance, Keywords.  
3. Auto-save draft; Publish; Unpublish; Archive.  
4. Responsive UI; tooltips; progress indicator; required validation.  
5. Deep-link modules for images/materials/labor/logistics (parallel tickets).  

### UI Requirements (if frontend)

#### Sections
1. Taxonomy & Identity  
2. Description & Specs  
3. Condition & Capacity  
4. Availability & Booking Windows  
5. Pricing (summary + link to XFY-019)  
6. Insurance (summary + link to XFY-020)  
7. Keywords  
8. Review & Publish  

#### States
Loading skeleton; empty “Add machinery”; inline errors; save toast; publish success; blocked publish panel listing missing fields; mobile stacked layout.

#### Progress
% based on required fields + module completeness (images min 1, pricing present, etc.).

### Backend Requirements (if backend)
CRUD + status transition endpoints; completion calculator; optimistic concurrency on `updated_at`.

### Acceptance Criteria
- [ ] Auto-save draft  
- [ ] Publish / Unpublish / Archive  
- [ ] Responsive UI  
- [ ] Field tooltips  
- [ ] Progress indicator  
- [ ] Required field validation  

### Validation Rules
| Field | Rule |
|-------|------|
| industry, subcategory | required; cascading validity |
| machinery_type or custom | one required |
| machinery_name | required 2–255 |
| machine_condition | enum |
| availability_status | enum |
| usage pricing | required to publish |
| min/max booking duration | min ≤ max |

### Permissions
Manufacturer owner of parent facility.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/facilities/{facilityId}/machinery` | `POST` |
| `/api/machinery/{id}` | `GET` `PATCH` `DELETE` |
| `/api/machinery/{id}/status` | `POST` |
| `/api/machinery/{id}/completion` | `GET` |
| `/api/meta/industries/{id}/subcategories` | `GET` |
| `/api/meta/subcategories/{id}/machinery-types` | `GET` |

### Request Payload
```json
{
  "facilityId": "fac_01HZY...",
  "industry": "IND_METAL",
  "subcategory": "SUB_CNC",
  "machineryType": "TYPE_VMC",
  "customMachineryType": null,
  "machineryName": "Haas VF-2 CNC Mill",
  "machineryDetails": "High-precision VMC suitable for aluminum and steel prototypes.",
  "technicalSpecifications": {
    "travels": "30x16x20 in",
    "spindle": "8100 RPM",
    "powerKw": 22.4
  },
  "machineAgeYears": 4,
  "machineCapacity": "Medium batch CNC milling",
  "machineCondition": "GOOD",
  "availabilityStatus": "AVAILABLE",
  "usageCostPerUnit": 1800,
  "costUnit": "DAY",
  "minimumBookingDuration": 1,
  "maximumBookingDuration": 30,
  "renewableLeaseAllowed": true,
  "keywords": ["cnc", "vmc", "prototype"]
}
```

### Response Payload
```json
{
  "machinery": {
    "id": "mch_01HZY...",
    "status": "DRAFT",
    "availabilityStatus": "AVAILABLE",
    "updatedAt": "2026-07-15T08:00:00.000Z"
  },
  "completion": {
    "percent": 64,
    "missingRequiredFields": ["images", "insurance"],
    "canPublish": false
  }
}
```

### Database Tables
`MachineryInventory`, taxonomy tables / config, keywords junction.

### Database Fields
Core machinery fields + `status`.

### Entity Relationships
Facility → Machinery; Machinery → modules.

### Error Handling
`400` validation; `403` ownership; `409` illegal status transition.

### Security Considerations
Sanitize details/specs; rate-limit autosave; authz via facility ownership.

### Edge Cases
Facility unpublished → cannot publish machinery; concurrent edits; custom type pending.

### Dependencies
XFY-012; EPIC-2 facility; meta taxonomy APIs.

### Testing Checklist
- [ ] Create/edit draft  
- [ ] Autosave  
- [ ] Publish blockers  
- [ ] Unpublish/archive  
- [ ] Cascading taxonomy  
- [ ] Mobile form  

### Definition of Done
UX accepted; OpenAPI updated; completion rules agreed with search/booking owners.

---

## Ticket XFY-014

### Ticket ID
`XFY-014`

### Ticket Name
Machinery Image Upload

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`8`

### Epic
`EPIC-3 — Machinery Inventory & Service Listings`

### User Story
As a manufacturer, I want to upload, order, and manage multiple optimized images so that buyers can visually evaluate my machinery.

### Business Value
Increases listing engagement and trust; improves marketplace aesthetics.

### Description
Multi-image upload (JPG/PNG/WebP), secure storage, primary image, delete, reorder, optimization, thumbnails, client preview before upload.

### Functional Requirements
1. Multiple images per machinery.  
2. Formats JPG, PNG, WebP.  
3. Secure private/public-CDN storage strategy.  
4. Primary image; delete; reorder.  
5. Server-side optimization + thumbnail generation.  
6. Preview before upload.  

### UI Requirements (if frontend)
Drag-drop multi-select; per-file preview; progress bars; set primary star; drag reorder; delete confirm; error chips for rejected files; empty state illustration.

### Backend Requirements (if backend)
Multipart or signed direct-to-storage upload; image processing pipeline; `MachineryImage` records; reorder API.

### Acceptance Criteria
- [ ] Multiple upload  
- [ ] JPG/PNG/WebP only  
- [ ] Secure storage  
- [ ] Primary image  
- [ ] Delete + reorder  
- [ ] Optimization + thumbnails  
- [ ] Preview before upload  

### Validation Rules
Max images e.g. 12; max 8MB/file; min resolution e.g. 800px on long edge (warn); virus scan.

### Permissions
Owner manage; public read published listing images.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/machinery/{id}/images` | `GET` `POST` |
| `/api/machinery/{id}/images/{imageId}` | `DELETE` |
| `/api/machinery/{id}/images/reorder` | `PUT` |
| `/api/machinery/{id}/images/{imageId}/primary` | `POST` |
| `/api/machinery/{id}/images/upload-url` | `POST` (optional signed URL) |

### Request Payload
**Reorder**
```json
{ "orderedImageIds": ["img_2", "img_1", "img_3"] }
```

### Response Payload
```json
{
  "images": [
    {
      "id": "img_1",
      "url": "https://cdn.example/m/img_1.jpg",
      "thumbnailUrl": "https://cdn.example/m/img_1_thumb.webp",
      "sortOrder": 1,
      "isPrimary": true,
      "contentType": "image/jpeg",
      "width": 1600,
      "height": 1200
    }
  ]
}
```

### Database Tables
`MachineryImage`

### Database Fields
`id`, `machinery_id`, `storage_key`, `url`, `thumbnail_url`, `content_type`, `width`, `height`, `size_bytes`, `sort_order`, `is_primary`, `created_at`

### Entity Relationships
Machinery 1—* Images; exactly one primary when ≥1 image (or allow zero until publish).

### Error Handling
`413`/`415`; processing failure marks image `FAILED`; orphan cleanup job.

### Security Considerations
Signed uploads; content-type verification; malware scan; IDOR checks; no executable content.

### Edge Cases
Delete primary → promote next; reorder race; partial batch failure.

### Dependencies
XFY-012/013; object storage + image processor.

### Upload Workflow
```
Client selects files → local preview
     ↓
Request upload session / POST multipart
     ↓
Store original → process optimize + thumbs
     ↓
Persist MachineryImage rows
     ↓
Return CDN URLs
```

### Storage Recommendations
Private originals bucket optional; public/CDN for derivatives; WebP derivatives; immutable object keys; lifecycle policies.

### Testing Checklist
- [ ] Multi-format upload  
- [ ] Primary/reorder/delete  
- [ ] Thumb generation  
- [ ] Reject bad types  
- [ ] Authz  

### Definition of Done
CDN URLs stable; publish requires ≥1 image (policy); security review passed.

---

## Ticket XFY-015

### Ticket ID
`XFY-015`

### Ticket Name
Raw Material Availability

### Priority
`P1 — High`

### Type
`Full-stack` · `Story`

### Story Points
`5`

### Epic
`EPIC-3 — Machinery Inventory & Service Listings`

### User Story
As a manufacturer, I want to declare raw material availability (Yes/No/Partial) with material line items so that buyers know sourcing expectations.

### Business Value
Reduces friction and increases complete-package bookings.

### Description
Tri-state availability on machinery; CRUD material lines when Yes/Partial; expose on public listing and search filters.

### Functional Requirements
1. Support Yes / No / Partial.  
2. If Yes/Partial: Material Name, Category, Quantity, Unit, Price, Lead Time, Supplier Notes.  
3. Search filter by materials available.  
4. Listing display.  
5. CRUD APIs + DB.  

### UI Requirements (if frontend)
Toggle Yes/No/Partial; conditional materials table editor; add row; inline validation; public chips/list.

### Backend Requirements (if backend)
Enum on machinery + `RawMaterial` child table; search filter hook.

### Acceptance Criteria
- [ ] Yes/No/Partial supported  
- [ ] Line items for Yes/Partial  
- [ ] Search filter  
- [ ] Listing display  
- [ ] CRUD APIs  

### Validation Rules
Name required; quantity > 0; unit required; price ≥ 0; lead time ≥ 0 days.

### Permissions
Owner write; public read published.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/machinery/{id}/raw-materials` | `GET` `PUT` (replace set) |
| `/api/machinery/{id}/raw-materials` | `POST` |
| `/api/machinery/{id}/raw-materials/{rmId}` | `PATCH` `DELETE` |
| `/api/machinery/search?rawMaterials=yes` | `GET` (search contract) |

### Request Payload
```json
{
  "rawMaterialsAvailable": "PARTIAL",
  "items": [
    {
      "materialName": "Aluminum 6061",
      "category": "Metals",
      "quantity": 500,
      "unit": "KG",
      "price": 320,
      "leadTimeDays": 7,
      "supplierNotes": "Mill certs available on request"
    }
  ]
}
```

### Response Payload
```json
{
  "rawMaterialsAvailable": "PARTIAL",
  "items": [ { "id": "rm_1", "materialName": "Aluminum 6061", "unit": "KG", "quantity": 500, "price": 320, "leadTimeDays": 7 } ]
}
```

### Database Tables
`MachineryInventory.raw_materials_available`; `RawMaterial`

### Database Fields
See Database Design — RawMaterial.

### Entity Relationships
Machinery 1—* RawMaterial.

### Error Handling
Yes/Partial with zero items → publish `canPublish=false`.

### Security Considerations
Sanitize notes; ownership checks.

### Edge Cases
Switch to No deletes or soft-hides items (confirm UX).

### Dependencies
XFY-012/013.

### Testing Checklist
- [ ] Modes  
- [ ] CRUD  
- [ ] Filter  
- [ ] Public display  

### Definition of Done
Filter documented for search epic consumers.

---

## Ticket XFY-016

### Ticket ID
`XFY-016`

### Ticket Name
Labor Availability

### Priority
`P1 — High`

### Type
`Full-stack` · `Story`

### Story Points
`5`

### Epic
`EPIC-3 — Machinery Inventory & Service Listings`

### User Story
As a manufacturer, I want to specify labor availability, counts, roles, and engagement types so that buyers understand staffing included with the machine.

### Business Value
Clarifies manned vs unmanned offerings; improves match quality.

### Description
Support Yes / No / On Request; store skilled/unskilled counts; roles (Engineer, Operator, Helper, Supervisor, Technician, Packer); availability Temporary / Permanent / Contract. APIs + schema.

### Functional Requirements
1. Tri-state labor flag.  
2. Skilled & unskilled counts.  
3. Role breakdown records.  
4. Engagement type per role or header-level.  
5. Public display + filters.  

### UI Requirements (if frontend)
Toggle; numeric steppers; role multi-select with counts; engagement select; public summary chips.

### Backend Requirements (if backend)
Header fields + `LaborAvailability` / `LaborRole` tables.

### Acceptance Criteria
- [ ] Yes/No/On Request  
- [ ] Skilled/unskilled counts  
- [ ] Roles supported  
- [ ] Temporary/Permanent/Contract  
- [ ] APIs + schema delivered  

### Validation Rules
Counts ≥ 0; role enum; if Yes, at least one role or total count > 0.

### Permissions
Owner write; public read published.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/machinery/{id}/labor` | `GET` `PUT` |

### Request Payload
```json
{
  "laborIncluded": "YES",
  "skilledCount": 2,
  "unskilledCount": 3,
  "engagementType": "CONTRACT",
  "roles": [
    { "role": "OPERATOR", "count": 2, "engagementType": "CONTRACT" },
    { "role": "SUPERVISOR", "count": 1, "engagementType": "TEMPORARY" },
    { "role": "HELPER", "count": 2, "engagementType": "TEMPORARY" }
  ]
}
```

### Response Payload
Mirror request with persistent IDs and updated timestamps.

### Database Tables
`LaborAvailability`, `LaborRoleAllocation` (or single JSONB + normalized roles—prefer normalized).

### Database Fields
See Database Design.

### Entity Relationships
Machinery 1—1 LaborAvailability header; 1—* role rows.

### Error Handling
Invalid role → `400`; On Request may omit counts.

### Security Considerations
Ownership; sanitize free text notes if any.

### Edge Cases
Yes with zero counts blocked on publish; On Request hides detailed counts publicly optional.

### Dependencies
XFY-012/013.

### Testing Checklist
- [ ] All modes  
- [ ] Role enums  
- [ ] Public summary  
- [ ] PUT replace semantics  

### Definition of Done
Role taxonomy documented; search filter contract published.

---

## Ticket XFY-017

### Ticket ID
`XFY-017`

### Ticket Name
Logistics & Transportation

### Priority
`P1 — High`

### Type
`Full-stack` · `Story`

### Story Points
`5`

### Epic
`EPIC-3 — Machinery Inventory & Service Listings`

### User Story
As a manufacturer, I want to declare logistics coverage and capabilities so that buyers understand how goods can move after production.

### Business Value
Completes the fulfillment story; raises conversion for non-local buyers.

### Description
Support Local / Outstation / International scopes; capture freight partner, delivery modes, warehousing, packaging, estimated delivery time. APIs + schema.

### Functional Requirements
1. Multi-select scopes: Local, Outstation, International.  
2. Freight partner, delivery modes, warehousing, packaging, ETA.  
3. Tie to `logistics_available` flag.  
4. Public listing section + filters.  

### UI Requirements (if frontend)
Checkbox scopes; conditional fields; ETA inputs; public icons by scope.

### Backend Requirements (if backend)
`LogisticsSupport` table 1—1 or 1—* modes.

### Acceptance Criteria
- [ ] Local/Outstation/International  
- [ ] Freight partner, modes, warehousing, packaging, ETA captured  
- [ ] APIs + schema delivered  

### Validation Rules
If logistics available true → ≥1 scope and ≥1 mode; ETA ≥ 0.

### Permissions
Owner write; public read.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/machinery/{id}/logistics` | `GET` `PUT` |

### Request Payload
```json
{
  "logisticsAvailable": true,
  "scopes": ["LOCAL", "OUTSTATION"],
  "freightPartner": "Demo Logistics Co.",
  "deliveryModes": ["ROAD_FTL", "ROAD_LTL"],
  "warehousing": true,
  "packaging": true,
  "estimatedDeliveryTime": { "minDays": 2, "maxDays": 7 }
}
```

### Response Payload
Persisted logistics object with IDs.

### Database Tables
`LogisticsSupport`

### Database Fields
See Database Design.

### Entity Relationships
Machinery 1—1 LogisticsSupport (MVP).

### Error Handling
Incomplete when flag true → publish blocked.

### Security Considerations
Sanitize partner names; ownership.

### Edge Cases
International without docs note — soft warning.

### Dependencies
XFY-012/013.

### Testing Checklist
- [ ] Scopes  
- [ ] PUT validation  
- [ ] Public display  
- [ ] Search filter hook  

### Definition of Done
Contract stable for future logistics marketplace linking.

---

## Ticket XFY-018

### Ticket ID
`XFY-018`

### Ticket Name
Infrastructure Details

### Priority
`P2 — Medium`

### Type
`Full-stack` · `Story`

### Story Points
`5`

### Epic
`EPIC-3 — Machinery Inventory & Service Listings`

### User Story
As a manufacturer, I want to specify infrastructure supporting my machinery so that buyers can assess operational feasibility.

### Business Value
Prevents mismatched bookings; shows plant readiness.

### Description
Capture electricity capacity, water, compressed air, waste disposal, storage, packaging facility, QA, loading dock, crane, safety certifications. APIs + DB—preferably structured JSON with known keys plus optional inheritance from facility.

### Functional Requirements
Support all listed infrastructure attributes; display publicly; validate units where applicable.

### UI Requirements (if frontend)
Checklist + numeric fields + safety cert multi-select; “Copy from facility” action.

### Backend Requirements (if backend)
`Infrastructure` 1—1 table or JSONB column with schema validation.

### Acceptance Criteria
- [ ] All listed attributes supported  
- [ ] APIs + database delivered  
- [ ] Public listing section renders  

### Validation Rules
Electricity capacity ≥ 0; boolean flags coherent; safety cert codes from list.

### Permissions
Owner write; public read published.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/machinery/{id}/infrastructure` | `GET` `PUT` |

### Request Payload
```json
{
  "electricityCapacityKw": 150,
  "waterAvailability": true,
  "compressedAir": true,
  "wasteDisposal": true,
  "storageCapacitySqm": 200,
  "packagingFacility": true,
  "qualityAssurance": true,
  "loadingDock": true,
  "craneAvailability": true,
  "safetyCertifications": ["ISO45001", "FIRE_NOC"]
}
```

### Response Payload
Persisted infrastructure object.

### Database Tables
`Infrastructure` (machinery-scoped)

### Database Fields
See Database Design.

### Entity Relationships
Machinery 1—1 Infrastructure.

### Error Handling
Unknown safety cert → `400`.

### Security Considerations
Sanitize free text; ownership.

### Edge Cases
Partial data allowed in draft; required subset for publish optional by industry.

### Dependencies
XFY-012; optional EPIC-2 facility infrastructure.

### Testing Checklist
- [ ] PUT/GET  
- [ ] Copy-from-facility  
- [ ] Public render  

### Definition of Done
Attribute dictionary documented for clients.

---

## Ticket XFY-019

### Ticket ID
`XFY-019`

### Ticket Name
Pricing & Service Costs

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`8`

### Epic
`EPIC-3 — Machinery Inventory & Service Listings`

### User Story
As a manufacturer, I want to define usage pricing across multiple units and add optional service costs so that buyers understand commercial terms.

### Business Value
Price transparency drives qualified leads and faster offer cycles.

### Description
Support pricing units: Hour, Day, Week, Month, Unit, Batch, Project. Support additional services with type, description, amount, unit, tax applicable. Pricing engine schema + APIs (deterministic quotation helpers optional in MVP).

### Functional Requirements
1. Base usage pricing with `cost_unit`.  
2. Multiple optional rate cards if needed (normalize `Pricing` rows).  
3. Additional service costs child records.  
4. Currency field (default platform currency).  
5. Public pricing display rules.  

### UI Requirements (if frontend)
Pricing unit select; amount input; add-service list editor; tax toggle; preview “from” price on card.

### Backend Requirements (if backend)
`Pricing`, `AdditionalServiceCost` tables; validation; optional `estimate` endpoint.

### Acceptance Criteria
- [ ] Units Hour/Day/Week/Month/Unit/Batch/Project  
- [ ] Additional services with type, description, amount, unit, tax  
- [ ] Schema + APIs delivered  

### Validation Rules
Amounts ≥ 0; unit enums; tax boolean; unique (machinery, unit) for base rates if single-rate-per-unit policy.

### Permissions
Owner write; public read (or masked “Request quote”).

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/machinery/{id}/pricing` | `GET` `PUT` |
| `/api/machinery/{id}/additional-services` | `GET` `POST` |
| `/api/machinery/{id}/additional-services/{svcId}` | `PATCH` `DELETE` |
| `/api/machinery/{id}/pricing/estimate` | `POST` (optional) |

### Request Payload
```json
{
  "currency": "INR",
  "rates": [
    { "unit": "DAY", "amount": 1800, "isPrimary": true },
    { "unit": "HOUR", "amount": 300, "isPrimary": false }
  ],
  "additionalServices": [
    {
      "serviceType": "SETUP",
      "description": "Fixture setup and first-article support",
      "amount": 2500,
      "unit": "PROJECT",
      "taxApplicable": true
    }
  ]
}
```

### Response Payload
Normalized rates + services with IDs; `displayFromPrice` computed.

### Database Tables
`Pricing`, `AdditionalServiceCost`

### Database Fields
See Database Design.

### Entity Relationships
Machinery 1—* Pricing; 1—* AdditionalServiceCost.

### Error Handling
No primary rate → publish blocked; conflicting duplicate units → `409`.

### Security Considerations
Prevent negative/overflow amounts; ownership.

### Edge Cases
Tax inclusive vs exclusive labeling; multi-currency later.

### Dependencies
XFY-012/013.

### Testing Checklist
- [ ] All units  
- [ ] Services CRUD  
- [ ] Publish requires price  
- [ ] Estimate happy path (if built)  

### Definition of Done
Pricing display contract agreed for public cards + detail page.

---

## Ticket XFY-020

### Ticket ID
`XFY-020`

### Ticket Name
Insurance & Liability

### Priority
`P1 — High`

### Type
`Full-stack` · `Story`

### Story Points
`5`

### Epic
`EPIC-3 — Machinery Inventory & Service Listings`

### User Story
As a manufacturer, I want to disclose insurance and liability terms so that buyers understand risk coverage before booking.

### Business Value
Reduces disputes; supports compliant booking acknowledgements.

### Description
Capture insurance included, coverage amount, coverage basis, exclusions, liability terms, insurance provider. Require customer acknowledgement during booking (hook/API flag for booking epic).

### Functional Requirements
1. Store insurance fields.  
2. Public summary + full terms.  
3. Expose `acknowledgementRequired=true` for booking flows.  
4. Admin visibility for moderation.  

### UI Requirements (if frontend)
Toggle included; conditional fields; exclusions textarea; public “Insurance” section with expand; booking modal checkbox (stub component OK).

### Backend Requirements (if backend)
`InsuranceCoverage` 1—1; booking epic reads acknowledgement flag.

### Acceptance Criteria
- [ ] All capture fields supported  
- [ ] Customer acknowledgement required during booking (contract/flag)  
- [ ] APIs + schema delivered  

### Validation Rules
If included → amount > 0, basis, provider required; exclusions max length.

### Permissions
Owner write; public read summary; booking user must ack.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/machinery/{id}/insurance` | `GET` `PUT` |

### Request Payload
```json
{
  "insuranceIncluded": true,
  "coverageAmount": 5000000,
  "coverageBasis": "PER_INCIDENT",
  "currency": "INR",
  "exclusions": "Consequential business loss; willful misuse; unapproved operators.",
  "liabilityTerms": "Hirers must follow SOP; negligence voids coverage.",
  "insuranceProvider": "Example General Insurance"
}
```

### Response Payload
```json
{
  "insurance": { "...": "..." },
  "bookingAcknowledgementRequired": true
}
```

### Database Tables
`InsuranceCoverage`

### Database Fields
See Database Design.

### Entity Relationships
Machinery 1—1 InsuranceCoverage.

### Error Handling
Included without amount → `400`.

### Security Considerations
Sanitize terms; ownership; version terms for audit when edited post-publish.

### Edge Cases
Edit after bookings exist → version snap for historical bookings (future); MVP warn only.

### Dependencies
XFY-012/013; booking epic consumer.

### Testing Checklist
- [ ] Validation  
- [ ] Public display  
- [ ] Ack flag true when terms present  

### Definition of Done
Booking epic interface note published (`acknowledgementRequired`).

---

## Ticket XFY-021

### Ticket ID
`XFY-021`

### Ticket Name
Keyword Tagging

### Priority
`P1 — High`

### Type
`Full-stack` · `Story`

### Story Points
`5`

### Epic
`EPIC-3 — Machinery Inventory & Service Listings`

### User Story
As a manufacturer, I want to tag machinery with keywords and suggestions so that buyers can discover my listings through search.

### Business Value
Improves recall for long-tail queries; enables trending analytics and admin governance.

### Description
Keyword add/remove; auto suggestions; duplicate prevention; search indexing; admin moderation; trending keywords reporting hooks.

### Functional Requirements
1. Manufacturers add keywords to machinery.  
2. Auto suggestions from taxonomy + popular tags.  
3. Case-insensitive duplicate prevention.  
4. Index keywords for search.  
5. Admin moderation (approve/ban).  
6. Trending keywords metric job/API.  

### UI Requirements (if frontend)
Tag input with typeahead; chip list; max tags indicator; rejected tag messaging.

### Backend Requirements (if backend)
`MachineryKeyword` + global `Keyword` dictionary; indexing pipeline (DB ILIKE MVP / search engine later).

### Acceptance Criteria
- [ ] Add keywords  
- [ ] Auto suggestions  
- [ ] Duplicate prevention  
- [ ] Search indexing  
- [ ] Admin moderation  
- [ ] Trending keywords support  

### Validation Rules
2–40 chars; max 15 tags/listing; slug normalize; blocked list.

### Permissions
Owner tag; admin moderate; public see approved.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/machinery/{id}/keywords` | `GET` `POST` `PUT` |
| `/api/machinery/{id}/keywords/{kw}` | `DELETE` |
| `/api/keywords/suggest` | `GET` |
| `/api/admin/keywords` | `GET` |
| `/api/admin/keywords/{id}/moderate` | `POST` |
| `/api/keywords/trending` | `GET` |

### Request Payload
```json
{ "keywords": ["cnc", "aluminum", "prototype machining"] }
```

### Response Payload
```json
{
  "keywords": [
    { "id": "kw_1", "label": "cnc", "status": "APPROVED" },
    { "id": "kw_2", "label": "aluminum", "status": "APPROVED" }
  ]
}
```

### Database Tables
`Keyword`, `MachineryKeyword`

### Database Fields
See Database Design.

### Entity Relationships
Machinery *—* Keyword via junction.

### Error Handling
Banned keyword → `400`; duplicates collapsed.

### Security Considerations
Injection-safe search; rate-limit suggest; XSS-safe labels.

### Edge Cases
Unicode normalization; spam coinage tags → admin ban.

### Dependencies
XFY-012/013; search indexer.

### Search Indexing Strategy
| Phase | Approach |
|-------|----------|
| MVP | Normalized keyword labels in Postgres; GIN on array/junction; listing search OR against keywords |
| Scale | Sync to OpenSearch/Elasticsearch on publish/update |
| Ranking | Boost exact type > keyword > description text |
| Trending | Daily counts of keyword usage + search query frequency |

### Testing Checklist
- [ ] Suggest  
- [ ] Dedupe  
- [ ] Ban enforcement  
- [ ] Indexed search hit  
- [ ] Trending endpoint  

### Definition of Done
Indexing hook verified on publish; admin moderation UX complete.

---

# Database Design

## ER Overview (text)

```
ManufacturingFacility
  └─1──* MachineryInventory
           ├─1──* MachineryImage
           ├─*──* Keyword (via MachineryKeyword)
           ├─1──* Pricing
           ├─1──* AdditionalServiceCost
           ├─1──* RawMaterial
           ├─1──1 LaborAvailability ──* LaborRoleAllocation
           ├─1──1 LogisticsSupport
           ├─1──1 Infrastructure
           └─1──1 InsuranceCoverage
```

## `MachineryInventory`

| Column | PK/FK | Type | Constraints |
|--------|-------|------|-------------|
| id | PK | UUID | |
| facility_id | FK | UUID | NOT NULL INDEX |
| industry | | varchar | NOT NULL INDEX |
| subcategory | | varchar | INDEX |
| machinery_type | | varchar | INDEX |
| custom_machinery_type | | varchar | nullable |
| machinery_name | | varchar(255) | NOT NULL |
| machinery_details | | text | |
| technical_specifications | | jsonb | |
| machine_age | | numeric | ≥ 0 |
| machine_capacity | | varchar/text | |
| machine_condition | | varchar | enum |
| availability_status | | varchar | enum INDEX |
| usage_cost_per_unit | | numeric(12,2) | ≥ 0 (denorm primary) |
| cost_unit | | varchar | enum |
| raw_materials_available | | varchar | YES/NO/PARTIAL |
| labor_included | | varchar | YES/NO/ON_REQUEST |
| logistics_available | | boolean | |
| infrastructure_details | | jsonb | optional denorm |
| insurance_included | | boolean | |
| liability_coverage_amount | | numeric | nullable |
| minimum_booking_duration | | int | ≥ 0 |
| maximum_booking_duration | | int | ≥ min |
| renewable_lease_allowed | | boolean | |
| status | | varchar | lifecycle INDEX |
| created_at / updated_at | | timestamptz | |

**Checks:** min duration ≤ max; money ≥ 0.

## `MachineryImage`

| Column | Notes |
|--------|-------|
| id PK | |
| machinery_id FK CASCADE | INDEX |
| storage_key / url / thumbnail_url | |
| content_type, width, height, size_bytes | |
| sort_order | |
| is_primary | partial unique per machinery where true (platform-dependent) |
| created_at | |

## `RawMaterial`

| Column | Notes |
|--------|-------|
| id PK | |
| machinery_id FK | |
| material_name | NOT NULL |
| category | |
| quantity | > 0 |
| unit | NOT NULL |
| price | ≥ 0 |
| lead_time_days | ≥ 0 |
| supplier_notes | |
| created_at / updated_at | |

## `LaborAvailability`

| Column | Notes |
|--------|-------|
| machinery_id PK/FK | |
| labor_included | enum |
| skilled_count | ≥ 0 |
| unskilled_count | ≥ 0 |
| engagement_type | TEMPORARY/PERMANENT/CONTRACT |
| updated_at | |

## `LaborRoleAllocation`

| Column | Notes |
|--------|-------|
| id PK | |
| machinery_id FK | |
| role | ENGINEER/OPERATOR/HELPER/SUPERVISOR/TECHNICIAN/PACKER |
| count | ≥ 0 |
| engagement_type | |
| UNIQUE(machinery_id, role) | |

## `LogisticsSupport`

| Column | Notes |
|--------|-------|
| machinery_id PK/FK | |
| scopes | jsonb array |
| freight_partner | |
| delivery_modes | jsonb array |
| warehousing | boolean |
| packaging | boolean |
| eta_min_days / eta_max_days | |
| updated_at | |

## `Infrastructure`

| Column | Notes |
|--------|-------|
| machinery_id PK/FK | |
| electricity_capacity_kw | |
| water_availability | boolean |
| compressed_air | boolean |
| waste_disposal | boolean |
| storage_capacity_sqm | |
| packaging_facility | boolean |
| quality_assurance | boolean |
| loading_dock | boolean |
| crane_availability | boolean |
| safety_certifications | jsonb |
| updated_at | |

## `Pricing`

| Column | Notes |
|--------|-------|
| id PK | |
| machinery_id FK | INDEX |
| unit | HOUR/DAY/WEEK/MONTH/UNIT/BATCH/PROJECT |
| amount | ≥ 0 |
| currency | |
| is_primary | boolean |
| UNIQUE(machinery_id, unit) | recommended |

## `AdditionalServiceCost`

| Column | Notes |
|--------|-------|
| id PK | |
| machinery_id FK | |
| service_type | |
| description | |
| amount | ≥ 0 |
| unit | |
| tax_applicable | boolean |
| created_at / updated_at | |

## `InsuranceCoverage`

| Column | Notes |
|--------|-------|
| machinery_id PK/FK | |
| insurance_included | boolean |
| coverage_amount | |
| coverage_basis | |
| currency | |
| exclusions | text |
| liability_terms | text |
| insurance_provider | |
| terms_version | int default 1 |
| updated_at | |

## `Keyword` / `MachineryKeyword`

**Keyword:** `id`, `label`, `normalized_label` UNIQUE, `status` (APPROVED/PENDING/BANNED), `usage_count`, timestamps  

**MachineryKeyword:** `machinery_id`, `keyword_id`, PK composite, `created_at`

## Indexes (cross-cutting)

| Purpose | Index |
|---------|-------|
| Owner dashboards | machinery(facility_id), machinery(status) |
| Discovery | industry, subcategory, machinery_type, availability_status |
| Price sort | pricing(amount) via join / denorm |
| Keywords | keyword(normalized_label); junction(machinery_id) |
| Images | (machinery_id, sort_order) |

---

# REST API Summary

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/facilities/{facilityId}/machinery` | `POST` | Create machinery draft | Manufacturer |
| `/api/facilities/{facilityId}/machinery` | `GET` | List facility machinery | Owner/Admin |
| `/api/machinery/{id}` | `GET` | Get machinery | Conditional |
| `/api/machinery/{id}` | `PATCH` | Update machinery | Owner |
| `/api/machinery/{id}` | `DELETE` | Soft-delete machinery | Owner |
| `/api/machinery/{id}/status` | `POST` | Publish/unpublish/archive/submit | Owner/Admin |
| `/api/machinery/{id}/completion` | `GET` | Completion / publish blockers | Owner |
| `/api/machinery/search` | `GET` | Public/authenticated search | Public/Auth |
| `/api/public/machinery/{idOrSlug}` | `GET` | Public listing page payload | Public |
| `/api/machinery/{id}/images` | `GET` `POST` | List/upload images | Owner |
| `/api/machinery/{id}/images/{imageId}` | `DELETE` | Delete image | Owner |
| `/api/machinery/{id}/images/reorder` | `PUT` | Reorder images | Owner |
| `/api/machinery/{id}/images/{imageId}/primary` | `POST` | Set primary | Owner |
| `/api/machinery/{id}/raw-materials` | `GET` `PUT` `POST` | Materials | Owner |
| `/api/machinery/{id}/raw-materials/{rmId}` | `PATCH` `DELETE` | Material item | Owner |
| `/api/machinery/{id}/labor` | `GET` `PUT` | Labor package | Owner |
| `/api/machinery/{id}/logistics` | `GET` `PUT` | Logistics package | Owner |
| `/api/machinery/{id}/infrastructure` | `GET` `PUT` | Infrastructure | Owner |
| `/api/machinery/{id}/pricing` | `GET` `PUT` | Rates | Owner |
| `/api/machinery/{id}/additional-services` | `GET` `POST` | Add-on services | Owner |
| `/api/machinery/{id}/additional-services/{svcId}` | `PATCH` `DELETE` | Service item | Owner |
| `/api/machinery/{id}/pricing/estimate` | `POST` | Optional estimate | Auth |
| `/api/machinery/{id}/insurance` | `GET` `PUT` | Insurance terms | Owner |
| `/api/machinery/{id}/keywords` | `GET` `POST` `PUT` | Keywords | Owner |
| `/api/machinery/{id}/keywords/{kw}` | `DELETE` | Remove keyword | Owner |
| `/api/keywords/suggest` | `GET` | Suggestions | Auth |
| `/api/keywords/trending` | `GET` | Trending tags | Public/Auth |
| `/api/meta/industries` | `GET` | Taxonomy | Public |
| `/api/meta/industries/{id}/subcategories` | `GET` | Subcategories | Public |
| `/api/meta/subcategories/{id}/machinery-types` | `GET` | Types | Public |
| `/api/admin/machinery/pending` | `GET` | Moderation queue | Admin |
| `/api/admin/machinery/{id}/approve` | `POST` | Approve listing | Admin |
| `/api/admin/machinery/{id}/reject` | `POST` | Reject listing | Admin |
| `/api/admin/machinery/{id}/flag` | `POST` | Flag content | Admin |
| `/api/admin/keywords` | `GET` | Keyword governance | Admin |
| `/api/admin/keywords/{id}/moderate` | `POST` | Approve/ban keyword | Admin |
| `/api/manufacturer/dashboard/machinery` | `GET` | Dashboard aggregate | Manufacturer |

---

# Manufacturer Dashboard

## Machinery Management Views

| Widget / Panel | Description |
|----------------|-------------|
| **Listing Statistics** | Totals: draft, published, unpublished, archived, pending approval |
| **Draft Listings** | Resume incomplete machinery with completion % |
| **Published Listings** | Live inventory with quick unpublish |
| **Availability Status** | Breakdown Available / Limited / Maintenance / Unavailable |
| **Pricing Overview** | Primary rate per listing; missing-price alerts |
| **Image Management** | Listings missing images or primary image |
| **Pending Approvals** | Submitted listings awaiting admin |
| **Search Performance** | Impressions, CTR (when analytics available) |
| **Views** | Detail page views over time |
| **Leads** | Requests/messages attributed to each listing |

## UX Requirements
- Filters by facility, status, availability, industry  
- Bulk unpublish/archive (phase later; single-row MVP)  
- Empty states with CTA “Add machinery”  
- Mobile-friendly cards with swipe actions optional  

---

# Public Machinery Listing Page

## Route
`/machinery/{idOrSlug}`

## Visitor Sees

| Section | Content |
|---------|---------|
| **Gallery** | Primary + thumbnails; lightbox |
| **Header** | Name, type, facility/company, location, availability badge |
| **Technical Specs** | Key-value / template specs |
| **Pricing** | Primary and alternate units; additional services |
| **Availability** | Status + min/max booking duration + renewable flag |
| **Infrastructure** | Utilities, dock, crane, QA, safety certs |
| **Labor** | Included mode, counts, roles, engagement |
| **Logistics** | Scopes, modes, warehousing, packaging, ETA |
| **Raw Materials** | Yes/No/Partial + item table |
| **Insurance** | Included flag, coverage summary, exclusions link |
| **Facility Certifications** | Pulled from EPIC-2 facility (verified) |
| **Keywords** | Approved tags |
| **Related Machinery** | Same facility / similar type |
| **Reviews (future)** | Hidden until reviews epic |
| **CTA** | Request manufacturing / Book / Message |

## Visibility
Only `PUBLISHED` (+ approved if moderation required); others `404`.

---

# Admin Features

| Capability | Description |
|------------|-------------|
| **Moderate Listings** | Review content quality, images, claims |
| **Approve Listings** | Move `PENDING_APPROVAL` → `PUBLISHED` |
| **Reject Listings** | Reject with reason; return to draft/rejected |
| **Manage Keywords** | Approve pending, ban spam, merge duplicates |
| **Audit Changes** | Status transitions, price edits, insurance edits |
| **Flag Content** | Mark suspicious listings for escalation |

All admin actions require `PLATFORM_ADMIN`, are rate-limited, and write audit logs.

---

# Security Requirements

| Control | Requirement |
|---------|-------------|
| Ownership validation | Mutations only via facility ownership chain |
| Secure file uploads | Type/size/malware checks; signed uploads |
| Role-based permissions | Manufacturer / Admin / Public separation |
| Input sanitization | Specs, details, keywords, terms XSS-safe |
| Rate limiting | Autosave, uploads, suggest, admin actions |
| Audit logging | Status, pricing, insurance, moderation |
| Secure storage | Private originals; CDN derivatives; cert docs pattern reuse |

---

# Non-functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Public listing p95 < 400ms server; image thumbs CDN-cached |
| **Scalability** | Indexed taxonomy + keyword search; ready for search engine sync |
| **Reliability** | Draft autosave durable; image processing retries; no partial publish without completeness |
| **Security** | OWASP-aligned uploads and IDOR protections |
| **Accessibility** | WCAG 2.1 AA forms, galleries with alt text, keyboard reorder alternatives |
| **Mobile Responsiveness** | Full listing create/edit and public detail usable on mobile |

---

# Ticket Summary Board

| Ticket | Name | Priority | Points |
|--------|------|----------|--------|
| XFY-012 | Create Machinery Inventory Database Model | P0 | 8 |
| XFY-013 | Add/Edit Machinery Listing Form | P0 | 13 |
| XFY-014 | Machinery Image Upload | P0 | 8 |
| XFY-015 | Raw Material Availability | P1 | 5 |
| XFY-016 | Labor Availability | P1 | 5 |
| XFY-017 | Logistics & Transportation | P1 | 5 |
| XFY-018 | Infrastructure Details | P2 | 5 |
| XFY-019 | Pricing & Service Costs | P0 | 8 |
| XFY-020 | Insurance & Liability | P1 | 5 |
| XFY-021 | Keyword Tagging | P1 | 5 |
| | **Total** | | **67** |

**Suggested sequencing**

1. XFY-012 → XFY-013 → XFY-019 → XFY-014 (MVP publishable listing)  
2. XFY-020, XFY-015, XFY-016, XFY-017, XFY-021 in parallel streams  
3. XFY-018 as capacity allows  

---

# Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Overly complex form abandonment | Draft autosave, progress, sectional wizard |
| Inconsistent taxonomy | Controlled lists + custom type approval path |
| Image cost/abuse | Quotas, optimization, rate limits |
| Misleading pricing | Primary rate required; admin spot checks |
| Scope creep into booking | Keep booking ack as interface only in XFY-020 |

---

# Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| AI-generated machinery descriptions | Draft details from specs/images |
| AI keyword suggestions | From specs + industry norms |
| Video uploads | Short machine demos |
| 360° machinery tours | Immersive inspection |
| CAD file attachments | Buyer diligence packages |
| IoT machine health monitoring | Live condition signals |
| Live machine availability | Calendar/IoT sync |
| Dynamic pricing | Demand-based rates |
| Smart recommendations | Match visionaries to machines |
| Subscription featured listings | Paid visibility (Release 2) |
| Sponsored advertisements | Promoted placements (Release 2) |

---

## Traceability

| Artifact | Use |
|----------|-----|
| PRD / SRS | Machinery inventory requirements |
| Tech Design | Normalized schema + API map |
| Jira / Azure DevOps | Import XFY-012–XFY-021 |
| Confluence / Notion | EPIC 3 source of truth |
| Release 1 Roadmap | Core supply listings before request/booking |
| Downstream epics | Search, messaging, offers, booking consume these contracts |

---

**X!Y — The Explorer Factory**  
*Why own it when you can make it.*
