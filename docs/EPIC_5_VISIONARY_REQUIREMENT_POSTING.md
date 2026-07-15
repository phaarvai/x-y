# X!Y — The Explorer Factory

## EPIC 5 — Visionary Requirement Posting

**Tagline:** *Why own it when you can make it.*

**Document Type:** Software Specification · Epic Definition  
**Epic ID:** EPIC-5  
**Version:** 1.0  
**Last Updated:** July 2026  
**Classification:** PRD · SRS · Technical Design Document · Jira / Azure DevOps Backlog · Confluence · Agile Sprint Planning · Developer Documentation  
**Release Mapping:** Release 1 — MVP Marketplace  
**Depends On:** EPIC-1 (Auth & Roles) · EPIC-3 (Machinery taxonomy compatibility) · EPIC-4 (Reservation linkage on booking path)  
**Enables:** Manufacturer discovery responses, messaging threads, offers/counters, booking conversion, future AI matching

---

## Epic Summary

**EPIC 5 — Visionary Requirement Posting** enables **Visionaries / Ideators / Startups** to create structured manufacturing requirements on **X!Y — The Explorer Factory**. Visionaries describe what they want to manufacture, capture budget/timeline/quantity and service needs, upload supporting documents, optionally mark projects confidential with an NDA gate, publish to eligible manufacturers, and track status through matching, negotiation, booking, and completion.

This epic is the **primary demand object** of the marketplace. Together with manufacturer facilities (EPIC 2), machinery listings (EPIC 3), and availability (EPIC 4), it closes the loop from idea → discoverable need → negotiated production.

---

## Business Objective

- Capture high-quality, structured manufacturing demand  
- Reduce ambiguity in RFQs through specs, documents, and service flags  
- Protect confidential IP via masking + NDA acceptance before file access  
- Route eligible manufacturers to relevant opportunities  
- Maintain a clear requirement lifecycle for ops and analytics  
- Design data shapes compatible with future AI manufacturer matching  

---

## User Value

| Audience | Value |
|----------|-------|
| Visionaries | Express needs once; attract suitable manufacturers; protect confidential IP |
| Manufacturers | See qualified opportunities with clear scope, budget, timeline, and access rules |
| Admins | Moderate demand quality; manage NDA templates and confidentiality policy |
| Platform | Liquid demand inventory; trust-preserving confidential workflows; match-ready data |

---

## Scope

EPIC 5 covers requirement data model, create/edit/publish UX, draft autosave, attachments/documents, confidentiality + NDA workflow, status tracking, manufacturer visibility rules, visionary dashboard surfaces, and hooks for requests/messages/matches/AI features.

Commercial offer negotiation and full messaging UX may reside in adjacent epics; this epic defines the **requirement entity**, **visibility**, **document ACL**, and **lifecycle states** those flows attach to.

---

## In Scope

- Requirement creation, draft save, publish, edit (pre-terminal states)  
- Product specifications and structured need fields  
- Budget, timeline, quantity planning  
- Location preferences  
- Machinery / raw material / labor / logistics / legal support flags & notes  
- Multi-file uploads with confidentiality marks  
- Confidential projects + NDA acceptance workflow  
- Requirement status tracking  
- Manufacturer visibility rules for published requirements  
- Schema/API fields reserved for future AI matching scores  
- Visionary dashboard for requirements  

---

## Out of Scope

- Full AI matching engine (schema compatibility only)  
- Binding e-sign NDA providers (placeholder acceptance + admin template in MVP)  
- CAD/3D interactive viewers  
- Collaborative multi-user editing  
- Automatic translation  
- Payment escrow tied to requirements  
- Vendor/labor/logistics direct RFQ marketplaces (Release 2)  

---

## Role Prerequisites

| Role | Capability |
|------|------------|
| `VISIONARY` | CRUD own requirements; upload docs; mark confidential; track status |
| `MANUFACTURER` | View eligible published requirements; accept NDA; access unlocked files; respond |
| `PLATFORM_ADMIN` | Moderate requirements; manage NDA templates; audit access; configure policies |

---

# Features Included

## Feature F1 — Requirement Creation

### Purpose
Create a new manufacturing requirement (project RFQ) owned by a visionary.

### Business Value
Seeds demand supply of the marketplace.

### User Benefits
Structured place to describe what needs to be manufactured.

### Functional Requirements
1. Create `ProjectRequirement` with core identity fields.  
2. Default status `DRAFT`.  
3. Associate `user_id` as owner visionary.  

### Validation Rules
Title required to create; other fields progressive.

### Permissions
Authenticated `VISIONARY` only.

### Error Handling
`400` validation; `403` wrong role.

### Future Enhancements
Duplicate from past project; import brief from PDF.

---

## Feature F2 — Draft Saving

### Purpose
Persist incomplete requirements safely.

### Business Value
Higher completion rates; less abandoned demand.

### User Benefits
Continue later across sessions.

### Functional Requirements
Debounced autosave; explicit save; resume from dashboard.

### Validation Rules
Minimal fields for draft ID issuance (title).

### Permissions
Owner only; drafts never publicly listed.

### Error Handling
Conflict on concurrent edits (`409`); retry toast.

### Future Enhancements
Draft version history.

---

## Feature F3 — Requirement Publishing

### Purpose
Make requirements visible to eligible manufacturers.

### Business Value
Activates demand → supply matching loop.

### User Benefits
Start receiving manufacturer interest.

### Functional Requirements
Transition `DRAFT` → `POSTED` when publish gates pass; write history event.

### Validation Rules
Required publish fields complete; profile gate from EPIC-1 as policy.

### Permissions
Owner publish; admin force-unpublish.

### Error Handling
`400` with `missingRequiredFields`.

### Future Enhancements
Scheduled publish; audience targeting packs.

---

## Feature F4 — Requirement Editing

### Purpose
Update requirement content after creation.

### Business Value
Keeps RFQs accurate as scope evolves.

### User Benefits
Fix mistakes; refine specs before/during early outreach.

### Functional Requirements
Edit allowed in `DRAFT` and controlled fields in `POSTED`/`MATCHED`/`IN_NEGOTIATION` per policy; terminal states read-only.

### Validation Rules
Business rules for editable fields by status.

### Permissions
Owner; admin moderate.

### Error Handling
`409` read-only status.

### Future Enhancements
Change requests with manufacturer notifications.

---

## Feature F5 — Product Specifications

### Purpose
Capture product description and prototype status.

### Business Value
Improves manufacturer fit assessment.

### User Benefits
Clearer technical communication.

### Functional Requirements
`product_description`, `prototype_status` enum/freeform; structured specs JSON optional.

### Validation Rules
Description length limits; prototype status from allowed set.

### Permissions
Owner write; visibility per confidentiality.

### Error Handling
Oversized text → `400`.

### Future Enhancements
Spec templates by industry; AI summary.

---

## Feature F6 — Budget & Timeline

### Purpose
Capture commercial and schedule intent.

### Business Value
Filters unserious mismatches; improves match quality.

### User Benefits
Set expectations early.

### Functional Requirements
`target_budget`, currency, `target_start_date`, `target_end_date`.

### Validation Rules
End ≥ start; budget ≥ 0; dates not absurdly past for new posts.

### Permissions
Owner write; manufacturers see per visibility rules (may mask on confidential).

### Error Handling
Invalid dates → `400`.

### Future Enhancements
Budget ranges; milestone budgets.

---

## Feature F7 — Quantity Planning

### Purpose
Define volume and units of manufacture.

### Business Value
Aligns capacity expectations with EPIC-3/4 inventory.

### User Benefits
Communicate pilot vs scale runs.

### Functional Requirements
`quantity`, `quantity_unit`.

### Validation Rules
Quantity > 0; unit required when quantity set.

### Permissions
Owner write; visible to eligible manufacturers when unlocked.

### Error Handling
Zero/negative → `400`.

### Future Enhancements
Multi-SKU quantity breakdown.

---

## Feature F8 — Location Preferences

### Purpose
Prefer manufacturing geographies.

### Business Value
Logistics cost realism; FEZ/SEZ alignment.

### User Benefits
Find capable nearby plants.

### Functional Requirements
`preferred_location` (structured country/state/city or multi-select).

### Validation Rules
Valid geo codes where taxonomy exists.

### Permissions
Owner write; filterable in manufacturer browsing.

### Error Handling
Unknown codes → `400`.

### Future Enhancements
Radius preference from visionary address.

---

## Feature F9 — Machinery Requirements

### Purpose
Declare needed machine classes/capabilities.

### Business Value
Compatible with EPIC-3 taxonomy for matching.

### User Benefits
Attract correct machine owners.

### Functional Requirements
`required_machinery` as tags/IDs + notes; AI-ready fields.

### Validation Rules
Known taxonomy IDs preferred; free text allowed with length cap.

### Permissions
Owner write.

### Error Handling
Invalid taxonomy → soft warn or `400` if strict.

### Future Enhancements
Auto-suggest from uploaded drawings.

---

## Feature F10 — Raw Material Requirements

### Purpose
State whether materials must be supplied/sourced.

### Business Value
Clarifies package vs machine-only deals.

### User Benefits
Set material expectations.

### Functional Requirements
`raw_material_needed` boolean/enum + optional detail lines (future table).

### Validation Rules
Consistent with description notes.

### Permissions
Owner write.

### Error Handling
N/A beyond validation.

### Future Enhancements
Link Vendor marketplace RFQs.

---

## Feature F11 — Labor Requirements

### Purpose
Declare staffing needs.

### Business Value
Surfaces manned-cell manufacturers.

### User Benefits
Avoid machine-only mismatches.

### Functional Requirements
`labor_needed` flag + notes/roles optional.

### Validation Rules
Boolean/enum valid.

### Permissions
Owner write.

### Error Handling
Invalid enum → `400`.

### Future Enhancements
Link Labor Supplier marketplace.

---

## Feature F12 — Logistics Requirements

### Purpose
Declare transport/warehousing/packaging needs.

### Business Value
Completeness toward delivery-ready projects.

### User Benefits
Engage manufacturers with logistics support.

### Functional Requirements
`logistics_needed` flag + notes.

### Validation Rules
Boolean/enum valid.

### Permissions
Owner write.

### Error Handling
Invalid enum → `400`.

### Future Enhancements
Lane preferences; Incoterms.

---

## Feature F13 — Legal Support Requirements

### Purpose
Flag need for contracts/compliance help.

### Business Value
Pipelines Legal Writer engagement (Release 2+).

### User Benefits
Early legal path for complex deals.

### Functional Requirements
`legal_support_needed` boolean + notes.

### Validation Rules
Boolean valid.

### Permissions
Owner write.

### Error Handling
N/A.

### Future Enhancements
Auto-attach contract templates.

---

## Feature F14 — File Uploads

### Purpose
Attach product docs securely to requirements.

### Business Value
Rich diligence without email sprawl.

### User Benefits
Share drawings, BOMs, decks with access control.

### Functional Requirements
Multi-file upload; preview; delete/replace; confidential mark; secure storage; virus-scan placeholder.

### Validation Rules
Types/sizes per XFY-028.

### Permissions
Owner manage; others via ACL after NDA when confidential.

### Error Handling
`413`/`415`; scan fail quarantine.

### Future Enhancements
Versioning; watermarking; CAD viewer.

---

## Feature F15 — Confidential Projects

### Purpose
Protect sensitive requirement content and files.

### Business Value
Enables high-value IP projects on-platform.

### User Benefits
Publish signal without exposing secrets prematurely.

### Functional Requirements
`confidentiality_required`; mask fields; confidential badge; ACL for files.

### Validation Rules
When confidential, NDA required before sensitive access.

### Permissions
See permission matrix in XFY-029.

### Error Handling
Unauthorized access → `403`.

### Future Enhancements
Field-level confidentiality tiers.

---

## Feature F16 — NDA Workflow

### Purpose
Gate confidential access behind logged acceptance.

### Business Value
Trust + auditability for IP-sensitive dealflow.

### User Benefits
Manufacturers gain access after accepting terms; visionaries retain control.

### Functional Requirements
Admin template; accept/log; unlock; revoke on policy change.

### Validation Rules
Cannot access confidential files without ACTIVE acceptance for that requirement.

### Permissions
Manufacturer accept; owner/admin revoke; admin template CRUD.

### Error Handling
Expired/revoked acceptance → `403`.

### Future Enhancements
E-sign providers; countersigned NDAs.

---

## Feature F17 — Requirement Status Tracking

### Purpose
Lifecycle visibility from draft to completion.

### Business Value
Ops clarity; funnel analytics.

### User Benefits
Know where each project stands.

### Functional Requirements
Statuses Draft → Posted → Matched → In Negotiation → Booked → Completed / Cancelled; history ledger.

### Validation Rules
Legal transitions only.

### Permissions
Owner + involved manufacturers (limited); admin all.

### Error Handling
Illegal transition → `409`.

### Future Enhancements
Customer-defined sub-milestones.

---

## Feature F18 — Manufacturer Visibility

### Purpose
Control who can see which requirements.

### Business Value
Relevance + confidentiality compliance.

### User Benefits
Manufacturers see fits; visionaries avoid overexposure.

### Functional Requirements
`RequirementVisibility` rules; eligibility filters (industry, location, verified); confidential masking.

### Validation Rules
Drafts owner-only; published to eligible set.

### Permissions
Enforced server-side.

### Error Handling
Ineligible → `404` (prefer non-enumeration).

### Future Enhancements
Invite-only shortlists; paid lead unlocks.

---

## Feature F19 — Future AI Matching Support

### Purpose
Reserve fields and events for scoring manufacturers.

### Business Value
Avoid rework when AI matching ships (Release 3).

### User Benefits
Eventually better auto-shortlists.

### Functional Requirements
Nullable `match_metadata` JSON; `MatchedManufacturer` entity with `score`; emit domain events on publish.

### Validation Rules
Scores 0–1 or 0–100 when present.

### Permissions
System writes scores; users read.

### Error Handling
Ignore missing scores in MVP UI.

### Future Enhancements
Full ranking UI; explainability snippets.

---

# Developer Tickets

---

## Ticket XFY-026

### Ticket ID
`XFY-026`

### Ticket Name
Create Visionary Project Requirement Database Model

### Priority
`P0 — Critical`

### Type
`Backend` · `Database` · `Story`

### Story Points
`5`

### Epic
`EPIC-5 — Visionary Requirement Posting`

### User Story
As a platform engineer, I need a durable `ProjectRequirement` model with lifecycle statuses and relationship hooks so that drafts, publishes, attachments, requests, and matches can build on a consistent demand entity.

### Business Value
Creates the core demand record for the marketplace funnel.

### Description
Create `ProjectRequirement` with specified fields and statuses. Define relationships to visionary user, attachments, requests, messages, and matched manufacturers. Deliver SQL-style schema, indexes, constraints, validation rules, and ER explanation.

### Functional Requirements
1. Table with all listed fields.  
2. Status enum: Draft, Posted, Matched, In Negotiation, Booked, Completed, Cancelled.  
3. FK `user_id` → visionary owner.  
4. Relationship readiness for attachments, requests, messages, matched manufacturers.  
5. Indexes for owner, status, industry, dates, confidentiality.  

### UI Requirements (if frontend)
N/A — ER published to Confluence.

### Backend Requirements (if backend)
Migration, ORM enums, repository stubs, status transition helper skeleton.

### Acceptance Criteria
- [ ] `ProjectRequirement` created with all fields  
- [ ] All lifecycle statuses supported  
- [ ] Belongs to Visionary  
- [ ] Has-many hooks for Attachments, Requests, Messages, Matched Manufacturers documented/created  
- [ ] Schema, indexes, constraints, validation delivered  

### Validation Rules
- `title` NOT NULL (2–200)  
- `quantity` NULL or > 0  
- `target_end_date` ≥ `target_start_date` when both set  
- `target_budget` NULL or ≥ 0  
- status ∈ allowed enum  

### Permissions
Migrator + app DB roles.

### REST API Endpoints
N/A for this ticket.

### Request Payload
N/A

### Response Payload
N/A

### Database Tables
`ProjectRequirement` (+ FK stubs)

### Database Fields
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| user_id | FK UUID | Visionary owner |
| title | varchar(200) | NOT NULL |
| industry | varchar | INDEX |
| product_description | text | |
| prototype_status | varchar | enum |
| quantity | numeric | |
| quantity_unit | varchar | |
| target_budget | numeric(12,2) | |
| currency | varchar(3) | recommended |
| preferred_location | jsonb/varchar | |
| required_machinery | jsonb | taxonomy IDs + notes |
| raw_material_needed | boolean/varchar | |
| labor_needed | boolean/varchar | |
| logistics_needed | boolean/varchar | |
| legal_support_needed | boolean | |
| confidentiality_required | boolean | DEFAULT false |
| target_start_date | date | |
| target_end_date | date | |
| status | varchar | DEFAULT DRAFT INDEX |
| match_metadata | jsonb | future AI |
| created_at / updated_at | timestamptz | |

### Entity Relationships
- User (Visionary) 1—* ProjectRequirement  
- ProjectRequirement 1—* RequirementAttachment / RequirementDocument  
- ProjectRequirement 1—* ManufacturingRequest (Requests)  
- ProjectRequirement 1—* MessageThread/Messages  
- ProjectRequirement 1—* MatchedManufacturer  

### Error Handling
Constraint failures mapped later at API.

### Security Considerations
Confidential flag respected by all future queries; no public select without visibility service.

### Edge Cases
Owner role change; soft-delete user with open requirements (restrict).

### Dependencies
EPIC-1 User; optional industry taxonomy.

### SQL-style Schema (reference)

```sql
CREATE TABLE project_requirement (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  industry VARCHAR(100),
  product_description TEXT,
  prototype_status VARCHAR(32),
  quantity NUMERIC(12,2),
  quantity_unit VARCHAR(32),
  target_budget NUMERIC(12,2),
  currency VARCHAR(3) DEFAULT 'INR',
  preferred_location JSONB,
  required_machinery JSONB,
  raw_material_needed BOOLEAN DEFAULT FALSE,
  labor_needed BOOLEAN DEFAULT FALSE,
  logistics_needed BOOLEAN DEFAULT FALSE,
  legal_support_needed BOOLEAN DEFAULT FALSE,
  confidentiality_required BOOLEAN NOT NULL DEFAULT FALSE,
  target_start_date DATE,
  target_end_date DATE,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  match_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_req_qty CHECK (quantity IS NULL OR quantity > 0),
  CONSTRAINT chk_req_budget CHECK (target_budget IS NULL OR target_budget >= 0),
  CONSTRAINT chk_req_dates CHECK (
    target_start_date IS NULL OR target_end_date IS NULL OR target_end_date >= target_start_date
  ),
  CONSTRAINT chk_req_status CHECK (status IN (
    'DRAFT','POSTED','MATCHED','IN_NEGOTIATION','BOOKED','COMPLETED','CANCELLED'
  ))
);

CREATE INDEX idx_req_user ON project_requirement(user_id);
CREATE INDEX idx_req_status ON project_requirement(status);
CREATE INDEX idx_req_industry ON project_requirement(industry);
CREATE INDEX idx_req_confidential ON project_requirement(confidentiality_required);
CREATE INDEX idx_req_dates ON project_requirement(target_start_date, target_end_date);
```

### Entity Relationship Explanation
`ProjectRequirement` is the demand root. Attachments store files; requests/messages hang off a requirement for manufacturer engagement; matched manufacturers store AI/manual shortlist rows. Visibility and NDA tables gate who sees what.

### Testing Checklist
- [ ] Migration up/down  
- [ ] Check constraints  
- [ ] Indexes present  
- [ ] FK to users  

### Definition of Done
Migration merged; ER reviewed; ready for form APIs.

---

## Ticket XFY-027

### Ticket ID
`XFY-027`

### Ticket Name
Visionary Requirement Form

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`13`

### Epic
`EPIC-5 — Visionary Requirement Posting`

### User Story
As a visionary, I want a guided requirement form with drafts and publish so that I can accurately describe my manufacturing need and make it available to suitable manufacturers.

### Business Value
Primary demand-creation UX; quality of inbound RFQs depends on this form.

### Description
Responsive multi-section form capturing project title, industry, description, prototype status, quantity/unit, budget, location, timeline, machinery/material/labor/logistics/legal flags, and confidentiality. Autosave drafts, publish, edit drafts, templates/examples, validation, progress indicator.

### Functional Requirements
1. Capture all listed fields.  
2. Industry dropdown.  
3. Draft autosave + edit existing draft.  
4. Publish action with gate validation.  
5. Templates/examples.  
6. Progress indicator + required validation.  
7. Responsive layout.  

### UI Requirements (if frontend)

#### UX Flow
```
Dashboard CTA “Post a requirement”
    ↓
Create draft (title)
    ↓
Complete sections (autosave)
    ↓
Optional uploads (XFY-028) / Confidential (XFY-029)
    ↓
Review → Publish
    ↓
Success → Requirement detail / find manufacturers
```

#### Form Sections
1. **Basics** — title, industry, prototype status  
2. **Product** — description / specs  
3. **Commercial** — quantity, unit, budget, currency  
4. **Schedule & Location** — start/end, preferred location  
5. **Capabilities Needed** — machinery, materials, labor, logistics, legal toggles + notes  
6. **Confidentiality** — flag + helper text (deep-link NDA info)  
7. **Review & Publish**  

#### Templates / Examples
- Industry-specific starter text snippets  
- Example quantity/budget placeholders  
- “What good looks like” tip panel  

#### States
| State | Behavior |
|-------|----------|
| Loading | Skeleton form |
| Empty | First-time CTA + template picker |
| Saving | Quiet “Draft saved” |
| Error | Inline field errors + save failure banner |
| Success | Publish toast + navigate detail |

### Backend Requirements (if backend)
CRUD draft; publish endpoint; completion calculator; industry meta API; optimistic concurrency.

### Acceptance Criteria
- [ ] Responsive form  
- [ ] Industry dropdown  
- [ ] Draft auto-save  
- [ ] Publish button  
- [ ] Edit existing draft  
- [ ] Templates/examples  
- [ ] Required field validation  
- [ ] Progress indicator  

### Validation Rules
| Field | Publish rule |
|-------|----------------|
| title | required |
| industry | required |
| product_description | required min length |
| quantity + unit | required |
| target_budget | recommended / required by policy |
| timeline | start or end required (policy) |
| preferred_location | recommended |

Draft: title only required.

### Permissions
Owner visionary.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/requirements` | `POST` |
| `/api/requirements/{id}` | `GET` `PATCH` |
| `/api/requirements/{id}/publish` | `POST` |
| `/api/requirements/me` | `GET` |
| `/api/requirements/{id}/completion` | `GET` |
| `/api/meta/industries` | `GET` |
| `/api/meta/requirement-templates` | `GET` |

### Request Payload
```json
{
  "title": "Pilot run: aluminum enclosure CNC + anodize",
  "industry": "Electronics Hardware",
  "productDescription": "CNC-machined aluminum enclosure for IoT gateway, Ra 1.6, anodized.",
  "prototypeStatus": "FUNCTIONAL_PROTOTYPE",
  "quantity": 200,
  "quantityUnit": "UNITS",
  "targetBudget": 450000,
  "currency": "INR",
  "preferredLocation": { "country": "IN", "states": ["MH", "KA"] },
  "requiredMachinery": { "types": ["TYPE_VMC", "TYPE_ANODIZE"], "notes": "3-axis sufficient" },
  "rawMaterialNeeded": true,
  "laborNeeded": true,
  "logisticsNeeded": true,
  "legalSupportNeeded": false,
  "confidentialityRequired": true,
  "targetStartDate": "2026-09-01",
  "targetEndDate": "2026-09-30"
}
```

### Response Payload
```json
{
  "requirement": {
    "id": "req_01H...",
    "status": "DRAFT",
    "confidentialityRequired": true,
    "updatedAt": "2026-07-15T07:00:00.000Z"
  },
  "completion": {
    "percent": 82,
    "missingRequiredFields": ["attachments"],
    "canPublish": false
  }
}
```

### Database Tables
`ProjectRequirement`

### Database Fields
Per XFY-026.

### Entity Relationships
Owner user → requirement.

### Error Handling
`400` validation; `409` concurrency; `409` illegal publish.

### Security Considerations
Sanitize description; rate-limit PATCH autosave; ownership checks.

### Edge Cases
Publish then unpublish policy; template apply overwrites confirm; confidential toggle mid-draft.

### Dependencies
XFY-026; EPIC-1 visionary role; meta industries.

### Testing Checklist
- [ ] Create/edit draft  
- [ ] Autosave  
- [ ] Publish gates  
- [ ] Templates  
- [ ] Mobile form  
- [ ] Progress accuracy  

### Definition of Done
UX accepted; OpenAPI updated; completion rules agreed with matching/search consumers.

---

## Ticket XFY-028

### Ticket ID
`XFY-028`

### Ticket Name
Product Document Upload

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`8`

### Epic
`EPIC-5 — Visionary Requirement Posting`

### User Story
As a visionary, I want to upload and manage product documents on my requirement so that manufacturers can evaluate technical needs—without unauthorized parties accessing confidential files.

### Business Value
Increases RFQ quality and diligence while keeping files inside platform ACLs.

### Description
Support multi-file uploads (PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, JPG, PNG, WebP, optional ZIP), preview, delete, replace, confidential marking, optional versioning, secure storage, size/type validation, virus-scan placeholder, owner delete, authorized access only.

### Functional Requirements
1. Multiple uploads per requirement.  
2. Allowed MIME/extensions as listed.  
3. Preview where feasible (images/PDF).  
4. Delete and replace.  
5. Mark files confidential (inherit project default).  
6. Optional versioning.  
7. Secure private storage + authorized download.  

### UI Requirements (if frontend)
Dropzone; per-file progress; preview modal; confidential toggle; replace control; empty state; error chips; mobile-friendly list.

### Backend Requirements (if backend)
Signed upload or multipart; metadata table; scan hook stub; signed download URLs; ACL service integration with NDA.

### Acceptance Criteria
- [ ] File size/type validation  
- [ ] Virus scan placeholder  
- [ ] Owner can delete files  
- [ ] Confidential files protected  
- [ ] Only authorized users can access files  

### Validation Rules
| Rule | Example |
|------|---------|
| Max file size | 25MB (ZIP 50MB if enabled) |
| Max files | 20 per requirement |
| Types | pdf, doc(x), xls(x), ppt(x), jpg, png, webp, zip optional |
| Zip | optional allowlist; nested exe blocked |

### Permissions
Owner upload/delete/replace; manufacturers download if authorized (non-confidential or NDA accepted); admin audit access.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/requirements/{id}/attachments` | `GET` `POST` |
| `/api/requirements/{id}/attachments/{attId}` | `DELETE` `PATCH` |
| `/api/requirements/{id}/attachments/{attId}/replace` | `POST` |
| `/api/requirements/{id}/attachments/{attId}/download-url` | `POST` |
| `/api/requirements/{id}/attachments/upload-url` | `POST` optional |

### Request Payload
**Metadata after upload / PATCH**
```json
{
  "displayName": "Enclosure v2 drawing",
  "isConfidential": true,
  "documentType": "DRAWING"
}
```

### Response Payload
```json
{
  "attachment": {
    "id": "att_01H...",
    "fileName": "enclosure-v2.pdf",
    "contentType": "application/pdf",
    "sizeBytes": 1048576,
    "isConfidential": true,
    "scanStatus": "PENDING",
    "version": 1,
    "createdAt": "2026-07-15T07:10:00.000Z"
  }
}
```

### Upload Workflow
```
Client selects files → type/size precheck → preview
        ↓
Request upload URL / multipart POST
        ↓
Store in private bucket
        ↓
Create RequirementAttachment (scanStatus=PENDING)
        ↓
Async virus-scan placeholder → CLEAN / INFECTED
        ↓
INFECTED → quarantine + owner notify; not downloadable
```

### File Schema / Database Tables
`RequirementAttachment` (and optionally `RequirementDocument` version table)

### Database Fields
See Database Design.

### Entity Relationships
Requirement 1—* Attachments; optional versions 1—* per logical document.

### Error Handling
`413`/`415`; `403` unauthorized download; `503` storage outage.

### Security Considerations
Private bucket; short-lived signed URLs; no public ACL; antivirus hook; content-type sniffing; IDOR protection; audit downloads of confidential files.

### Storage Recommendations
- Private object storage (per-env buckets)  
- Keys: `requirements/{requirementId}/{attachmentId}/v{n}/{filename}`  
- Separate quarantine prefix  
- CDN only via signed cookies/URLs if needed  
- Encryption at rest  

### Edge Cases
Replace increments version; delete soft-delete for audit; project becomes confidential → upgrade file flags; ZIP bombs rejected by scan.

### Dependencies
XFY-026/027; object storage; NDA ACL (XFY-029) for confidential downloads.

### Testing Checklist
- [ ] Allowed/denied types  
- [ ] Owner delete  
- [ ] Confidential download denied pre-NDA  
- [ ] Signed URL expiry  
- [ ] Scan pending/infected paths  

### Definition of Done
Security review on uploads; ACL tests with/without NDA; OpenAPI complete.

---

## Ticket XFY-029

### Ticket ID
`XFY-029`

### Ticket Name
Confidential Project & NDA Workflow

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`13`

### Epic
`EPIC-5 — Visionary Requirement Posting`

### User Story
As a visionary, I want to mark a project confidential and require manufacturers to accept an NDA before seeing sensitive details and files so that my IP stays protected during manufacturer discovery.

### Business Value
Unlocks high-sensitivity deal flow on-platform with auditable consent.

### Description
Confidential flag; mask sensitive fields on public/eligible list cards; NDA placeholder acceptance; log acceptances; admin-configurable NDA template; unlock confidential files for approved manufacturers; revoke access when authorization changes; confidential badge; audit log.

### Functional Requirements
1. Visionary marks `confidentiality_required`.  
2. Public/list views hide sensitive details.  
3. Manufacturer must accept NDA (placeholder) before access.  
4. Log NDA acceptance.  
5. Admin-configurable NDA template.  
6. Approved manufacturers access confidential files.  
7. Access revoked if authorization changes.  

### UI Requirements (if frontend)
- Confidential badge on cards/detail  
- Masked budget/description/files with CTA “Accept NDA to unlock”  
- NDA modal showing admin template version  
- Accept checkbox + confirm  
- Manufacturer “NDA accepted” status chip  
- Visionary view: list of NDA acceptances  

### Backend Requirements (if backend)
Visibility service; NDA template store; acceptance records; ACL checks on detail + download; revocation hooks; audit events.

### Acceptance Criteria
- [ ] Confidential badge displayed  
- [ ] Sensitive fields masked  
- [ ] NDA acceptance required before access  
- [ ] Audit log maintained  
- [ ] Access revoked if authorization changes  

### Validation Rules
- Cannot unlock without ACTIVE acceptance for `(manufacturer_user_id, requirement_id, template_version)`  
- Template must be ACTIVE to accept  
- Revocation sets acceptance `REVOKED`  

### Permissions
See matrix below.

### Permission Matrix

| Resource | Owner Visionary | Manufacturer (no NDA) | Manufacturer (NDA ACTIVE) | Admin |
|----------|-----------------|------------------------|---------------------------|-------|
| Draft requirement | Full | None | None | Full |
| Posted non-confidential summary | Full | Allowed if eligible | Allowed | Full |
| Posted confidential summary (masked) | Full | Masked fields | Unmasked | Full |
| Confidential attachments | Full | Deny | Allow signed download | Allow |
| NDA accept | N/A | Allow | Already accepted | Override |
| NDA template CRUD | No | No | No | Yes |
| Revoke acceptance | Yes (policy) | No | No | Yes |

**Sensitive fields (masked until NDA):** product description (full), attachments list contents, detailed machinery notes, budget (policy), exact quantity (policy), uploaded docs.

**Visible without NDA on confidential posts:** title (optional truncated), industry, location region, timeline month, confidential badge, “NDA required”.

### NDA Workflow
```
Visionary publishes requirement with confidentiality_required=true
        ↓
Eligible manufacturers see masked card
        ↓
Manufacturer opens detail → NDA modal (template vN)
        ↓
Accept → NDAAcceptance(ACTIVE) + audit
        ↓
Unmask fields + allow confidential download URLs
        ↓
If visionary turns off confidentiality OR admin revokes
        ↓
Acceptance → REVOKED; subsequent downloads 403
```

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/admin/nda-templates` | `GET` `POST` |
| `/api/admin/nda-templates/{id}` | `PATCH` |
| `/api/admin/nda-templates/{id}/activate` | `POST` |
| `/api/requirements/{id}/nda` | `GET` |
| `/api/requirements/{id}/nda/accept` | `POST` |
| `/api/requirements/{id}/nda/acceptances` | `GET` owner/admin |
| `/api/requirements/{id}/nda/revoke` | `POST` |
| `/api/requirements/{id}/access` | `GET` effective ACL for caller |

### Request Payload
**Accept**
```json
{
  "templateId": "nda_tmpl_01",
  "templateVersion": 3,
  "accepted": true,
  "typedName": "Ravi Deshmukh"
}
```

### Response Payload
```json
{
  "acceptance": {
    "id": "nda_acc_01",
    "requirementId": "req_01H...",
    "status": "ACTIVE",
    "templateId": "nda_tmpl_01",
    "templateVersion": 3,
    "acceptedAt": "2026-07-15T07:20:00.000Z"
  },
  "access": {
    "canViewSensitive": true,
    "canDownloadConfidentialFiles": true
  }
}
```

### Database Tables
`NDAAcceptance`, NDA template table, `RequirementVisibility`, `RequirementHistory` / audit

### Database Fields
See Database Design.

### Entity Relationships
Requirement 1—* NDAAcceptance; Template 1—* Acceptances; Visibility rules per requirement.

### Error Handling
`403` without acceptance; `409` template version mismatch; `404` for ineligible enumeration protection.

### Security Considerations
- Server-side masking (never rely on UI hide alone)  
- Signed URLs issued only after ACL check  
- Audit every accept/revoke/download  
- Rate-limit accept endpoints  
- Immutable store of accepted template text snapshot  

### Audit Logging
Events: `NDA_TEMPLATE_ACTIVATED`, `NDA_ACCEPTED`, `NDA_REVOKED`, `CONFIDENTIAL_FILE_DOWNLOAD`, `SENSITIVE_VIEW`.

### Edge Cases
Template updated after accept → require re-accept for new version (policy); manufacturer loses eligibility; requirement cancelled → access closed; owner views all without NDA.

### Dependencies
XFY-026–028; manufacturer eligibility rules; admin role.

### Testing Checklist
- [ ] Masked vs unmasked payloads  
- [ ] Accept unlocks files  
- [ ] Revoke blocks downloads  
- [ ] Version mismatch handled  
- [ ] Audit rows written  
- [ ] Badge rendering  

### Definition of Done
Security review sign-off; permission matrix test suite; admin can activate template in staging.

---

# Database Design

## ER Overview (text)

```
User (Visionary)
 └─1──* ProjectRequirement
         ├─1──* RequirementAttachment
         │        └─1──* RequirementDocument (versions, optional)
         ├─1──* NDAAcceptance
         ├─1──* RequirementVisibility
         ├─1──* RequirementHistory
         ├─1──* MatchedManufacturer (future/AI)
         ├─1──* ManufacturingRequest
         └─1──* MessageThread

Admin
 └─1──* NdaTemplate
         └─1──* NDAAcceptance
```

## `ProjectRequirement`
See XFY-026.

## `RequirementAttachment`

| Column | PK/FK | Notes |
|--------|-------|-------|
| id | PK | |
| requirement_id | FK CASCADE | INDEX |
| file_name | | |
| storage_key | | |
| content_type | | |
| size_bytes | | |
| is_confidential | boolean | DEFAULT inherit |
| document_type | varchar | DRAWING/BOM/DECK/OTHER |
| scan_status | varchar | PENDING/CLEAN/INFECTED |
| version | int | DEFAULT 1 |
| uploaded_by | FK user | |
| created_at / deleted_at | | soft delete |

## `RequirementDocument` (optional versioning)

| Column | Notes |
|--------|-------|
| id PK | |
| attachment_group_id | logical doc id |
| requirement_id FK | |
| version int | |
| storage_key | |
| created_at | |
| UNIQUE(attachment_group_id, version) | |

## `NdaTemplate`

| Column | Notes |
|--------|-------|
| id PK | |
| name | |
| body_text | NOT NULL |
| version int | |
| status | DRAFT/ACTIVE/RETIRED |
| activated_at | |
| created_by | admin user |
| created_at / updated_at | |

## `NDAAcceptance`

| Column | Notes |
|--------|-------|
| id PK | |
| requirement_id FK | |
| manufacturer_user_id FK | |
| template_id FK | |
| template_version int | |
| accepted_text_snapshot | text | |
| typed_name | |
| status | ACTIVE/REVOKED |
| accepted_at | |
| revoked_at | |
| revoked_by | |
| UNIQUE active pair policy | partial unique where ACTIVE |

## `RequirementVisibility`

| Column | Notes |
|--------|-------|
| id PK | |
| requirement_id FK UNIQUE | |
| visibility_mode | ALL_ELIGIBLE / INVITE_ONLY / INDUSTRY_GEO |
| rules jsonb | filters |
| hide_budget_until_nda | boolean |
| updated_at | |

## `RequirementHistory`

| Column | Notes |
|--------|-------|
| id PK | |
| requirement_id FK | INDEX |
| event_type | CREATED/PUBLISHED/STATUS_CHANGED/NDA_*/FILE_* |
| actor_user_id | |
| payload jsonb | |
| created_at | |

## `MatchedManufacturer` (AI-ready)

| Column | Notes |
|--------|-------|
| id PK | |
| requirement_id FK | |
| manufacturer_user_id / facility_id | |
| score | numeric |
| score_reason jsonb | |
| created_at | |

## Indexes & Constraints
- Owner + status indexes on requirements  
- Attachment `(requirement_id, deleted_at)`  
- NDA `(requirement_id, manufacturer_user_id)`  
- Partial unique ACTIVE acceptance per pair  
- Date/budget check constraints on requirement  

---

# REST API Summary

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/requirements` | `POST` | Create draft requirement | Visionary |
| `/api/requirements/me` | `GET` | List my requirements | Visionary |
| `/api/requirements/{id}` | `GET` | Get requirement (ACL-aware) | Auth |
| `/api/requirements/{id}` | `PATCH` | Update draft/editable fields | Owner |
| `/api/requirements/{id}/publish` | `POST` | Publish requirement | Owner |
| `/api/requirements/{id}/cancel` | `POST` | Cancel requirement | Owner |
| `/api/requirements/{id}/completion` | `GET` | Completion / publish gates | Owner |
| `/api/requirements/feed` | `GET` | Manufacturer opportunity feed | Manufacturer |
| `/api/requirements/{id}/attachments` | `GET` `POST` | List/upload attachments | Owner / ACL |
| `/api/requirements/{id}/attachments/{attId}` | `PATCH` `DELETE` | Metadata/delete | Owner |
| `/api/requirements/{id}/attachments/{attId}/replace` | `POST` | Replace file | Owner |
| `/api/requirements/{id}/attachments/{attId}/download-url` | `POST` | Signed download | ACL |
| `/api/requirements/{id}/nda` | `GET` | NDA status + template | Manufacturer/Owner |
| `/api/requirements/{id}/nda/accept` | `POST` | Accept NDA | Manufacturer |
| `/api/requirements/{id}/nda/revoke` | `POST` | Revoke access | Owner/Admin |
| `/api/requirements/{id}/nda/acceptances` | `GET` | List acceptances | Owner/Admin |
| `/api/requirements/{id}/access` | `GET` | Effective ACL for caller | Auth |
| `/api/admin/nda-templates` | `GET` `POST` | Manage templates | Admin |
| `/api/admin/nda-templates/{id}` | `PATCH` | Update template | Admin |
| `/api/admin/nda-templates/{id}/activate` | `POST` | Activate template version | Admin |
| `/api/admin/requirements/{id}/moderate` | `POST` | Moderate/takedown | Admin |
| `/api/meta/industries` | `GET` | Industry dropdown | Public/Auth |
| `/api/meta/requirement-templates` | `GET` | Form examples | Auth |

---

# Visionary Dashboard

| Panel | Description |
|-------|-------------|
| **Draft Requirements** | Incomplete projects with completion % and continue CTA |
| **Published Requirements** | Live posts with view/response counts |
| **Matched Manufacturers** | Shortlist (manual now; scores later) |
| **Negotiations** | Requirements in `IN_NEGOTIATION` with open requests |
| **Booking Status** | `BOOKED` / linked EPIC-4 bookings |
| **Recent Messages** | Latest threads on requirements |
| **Uploaded Files** | Attachments across projects + scan states |
| **Project Timeline** | Start/end vs today; upcoming milestones |
| **Analytics** | Views, NDA accepts, responses, conversion to booked |

---

# Manufacturer View

## Opportunity card / detail (eligible)

| Element | Behavior |
|---------|----------|
| **Requirement Summary** | Title, industry, masked/unmasked description |
| **Budget** | Shown or masked if confidential policy |
| **Timeline** | Target window |
| **Required Machinery** | Types/notes when unlocked |
| **Location** | Preferred geography |
| **Matching Score (future)** | Placeholder slot |
| **File Access Status** | Locked / Unlocked |
| **NDA Status** | Required / Accepted / Revoked |
| **Respond Button** | Starts request/response flow (adjacent epic) |
| **Confidential Badge** | Visible when `confidentiality_required` |

Ineligible manufacturers receive `404` or empty feed exclusion (non-enumeration).

---

# Requirement Lifecycle

```
Draft
  ↓
Published (Posted)
  ↓
Matched
  ↓
Manufacturer Response
  ↓
Negotiation (In Negotiation)
  ↓
Booking (Booked)  ← integrates EPIC-4 reservation confirm
  ↓
Manufacturing
  ↓
Completed
  ↓
Review (future ratings epic)

Cancel branch: from Draft/Posted/Matched/In Negotiation → Cancelled (read-only)
```

---

# Business Rules

| # | Rule |
|---|------|
| 1 | Drafts are visible only to the owner |
| 2 | Published requirements are visible only to eligible manufacturers |
| 3 | Confidential details remain hidden until NDA acceptance |
| 4 | Only owners can edit unpublished drafts (and limited fields later per status policy) |
| 5 | Completed or cancelled requirements become read-only |
| 6 | Uploaded files inherit the project’s confidentiality settings unless explicitly changed |
| 7 | Publish requires completion gates |
| 8 | Status transitions must be legal and historically audited |
| 9 | Confidential downloads always check live ACL (not cached forever) |
| 10 | NDA acceptance snapshots the template text/version at accept time |
| 11 | Revocation immediately blocks new signed URLs |
| 12 | Manufacturers cannot see other manufacturers’ NDA status beyond aggregate counts (privacy) |

---

# Admin Features

| Capability | Description |
|------------|-------------|
| **Manage NDA templates** | Create, version, activate, retire |
| **Moderate requirements** | Unpublish/takedown inappropriate RFQs |
| **Remove inappropriate content** | Strip files or redact fields |
| **View audit logs** | NDA, downloads, status changes |
| **Configure confidentiality policies** | Default masking rules, re-accept on template change |

---

# Security Requirements

| Control | Requirement |
|---------|-------------|
| Ownership validation | Mutations only by owner (or admin) |
| Role-based permissions | Visionary / Manufacturer / Admin matrix enforced |
| Secure file storage | Private buckets; encryption at rest |
| Signed URL strategy | Short TTL; ACL check at issue time |
| Input sanitization | XSS-safe descriptions and notes |
| Audit logging | Publish, NDA, file access, moderation |
| Rate limiting | Autosave, uploads, NDA accept, feed scraping protections |
| Confidential access control | Server-side masking + download gates |

---

# Non-functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Requirement detail p95 < 300ms excl. downloads; feed p95 < 500ms |
| **Scalability** | Indexed feed filters; object storage for blobs |
| **Reliability** | Autosave durable; upload retry; scan async resilience |
| **Security** | IDOR-safe IDs; ACL tests mandatory in CI |
| **Accessibility** | WCAG 2.1 AA form & NDA modal |
| **Mobile responsiveness** | Create/publish/upload flows usable on mobile |

---

# Ticket Summary Board

| Ticket | Name | Priority | Points |
|--------|------|----------|--------|
| XFY-026 | Create Visionary Project Requirement Database Model | P0 | 5 |
| XFY-027 | Visionary Requirement Form | P0 | 13 |
| XFY-028 | Product Document Upload | P0 | 8 |
| XFY-029 | Confidential Project & NDA Workflow | P0 | 13 |
| | **Total** | | **39** |

**Suggested sequencing:** XFY-026 → XFY-027 → XFY-028 → XFY-029

---

# Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| IP leakage via list payloads | Server-side field redaction service |
| NDA placeholder legally weak | Label as platform Terms/NDA placeholder; roadmap e-sign |
| Feed scraping of opportunities | Auth, rate limits, eligibility, 404 masking |
| Incomplete RFQs spam manufacturers | Publish gates + admin moderation |
| File malware | Scan placeholder + quarantine; block download until CLEAN |

---

# Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| AI-generated requirement summaries | Shorten long briefs for cards |
| AI manufacturer matching | Score facilities/machines to requirements |
| Requirement templates by industry | Richer starter kits |
| CAD/3D model viewer | In-browser diligence |
| Digital watermarking | Trace leaked docs |
| E-signature integration | Binding NDAs |
| Version history | Spec change timeline |
| Collaborative editing | Team co-authoring |
| Automatic requirement translation | Cross-language posts |
| Multi-language support | Localized forms and NDA templates |

---

## Traceability

| Artifact | Use |
|----------|-----|
| PRD / SRS | Demand-side requirement posting |
| Tech Design | Schema, ACL, NDA, uploads |
| Jira / Azure DevOps | Import XFY-026–XFY-029 |
| Confluence / Notion | EPIC 5 source of truth |
| Downstream | Messaging, offers, EPIC-4 booking attach to `ProjectRequirement` |

---

**X!Y — The Explorer Factory**  
*Why own it when you can make it.*
