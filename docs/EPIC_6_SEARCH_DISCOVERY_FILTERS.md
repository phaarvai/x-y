# X!Y — The Explorer Factory

## EPIC 6 — Search, Discovery & Filters

**Tagline:** *Why own it when you can make it.*

**Document Type:** Software Specification · Epic Definition  
**Epic ID:** EPIC-6  
**Version:** 1.0  
**Last Updated:** July 2026  
**Classification:** PRD · SRS · Technical Design Document · Jira / Azure DevOps Backlog · Confluence · Agile Sprint Planning · Developer Documentation  
**Release Mapping:** Release 1 — MVP Marketplace (core discovery); extensible to Release 2 ecosystem entity types  
**Depends On:** EPIC-2 (Facility) · EPIC-3 (Machinery & services) · EPIC-4 (Availability) · EPIC-5 (Requirements visibility rules) · EPIC-1 (Auth)  
**Enables:** Inquiry/booking conversion, saved lists, search analytics, future AI recommendations

---

## Epic Summary

**EPIC 6 — Search, Discovery & Filters** delivers the demand-side and cross-ecosystem **discovery layer** for **X!Y — The Explorer Factory**. Users find manufacturers, machinery, and (by extension) vendors, labor, logistics, and legal providers through global keyword search, auto-complete, advanced filters, geospatial radius search, relevance ranking, sortable results, listing detail pages, and saved/favorite listings.

Search must be **fast, scalable, accurate, and permission-aware**—showing only published, eligible inventory and respecting confidential requirement rules where search intersects demand content.

---

## Business Objective

- Reduce time-to-find for suitable manufacturing capacity and partners  
- Convert browsing into inquiries, reservations, and bookings  
- Improve marketplace liquidity via discoverability of supply  
- Provide filter facets that match real B2B procurement criteria  
- Capture search analytics to improve ranking, taxonomy, and GTM  
- Architect for PostgreSQL FTS now and OpenSearch/Elasticsearch at scale  

---

## User Value

| Audience | Value |
|----------|-------|
| Visionaries | Quickly shortlist machines/factories by capability, price, location, availability |
| Manufacturers | Gain visibility when listings are complete, verified, and well-tagged |
| Ecosystem providers (R2+) | Same discovery patterns for vendor/labor/logistics/legal listings |
| Admins | Insight into demand signals; governance of keywords and rankings |
| Platform | Higher engagement; data for recommendations and monetization (featured) |

---

## Scope

EPIC 6 covers global/keyword/full-text search, suggestions, filters, sorting, results UX, listing detail composition for discovery, favorites/saved listings, pagination, mobile search, search analytics tables/APIs, and conceptual search architecture (indexing, geo, ranking, caching).

---

## In Scope

- Global and entity-scoped search (machinery-first MVP; multi-index ready)  
- Keyword / full-text matching across company, machinery, industry, location, tags, services, certifications  
- Auto-complete suggestions  
- Advanced multi-select filters including geo radius and availability dates  
- Sorting and pagination / infinite scroll  
- Search results card/list views  
- Listing detail page assembly for conversion CTAs  
- Saved listings (favorites)  
- Search analytics events and admin monitoring hooks  
- Mobile-optimized search UX  

---

## Out of Scope

- AI semantic / NL / voice / image search (future)  
- Personalized ranking models beyond simple signals (future)  
- Typo tolerance engines (explicitly future in XFY-030; basic FTS stemming OK)  
- Full saved-search alerts (future; schema-ready via SearchHistory)  
- Payment-gated featured ranking billing UI (Release 2; admin “feature” flag OK)  
- Confidential **requirement** deep search for manufacturers (EPIC-5 ACL; only permitted fields)  

---

## Role Prerequisites

| Role | Capability |
|------|------------|
| Public / Auth users | Search published supply listings per policy |
| `VISIONARY` | Search, save favorites, open detail, inquiry/booking CTAs |
| `MANUFACTURER` | Search peers optional; primarily supply-side visibility |
| `PLATFORM_ADMIN` | Analytics, keyword moderation, featured/ranking controls |

---

# Features Included

## Feature F1 — Global Search

### Purpose
Single entry point to search across marketplace entity types.

### Business Value
Unified discovery reduces product complexity and increases engagement.

### User Benefits
One box to find companies, machines, and later ecosystem services.

### Functional Requirements
1. Accept free-text query + optional `entityTypes[]`.  
2. Route to multi-index or federated query.  
3. Return mixed or typed tabs (MVP: machinery-centric with company fields).  

### Validation Rules
Query length 1–200; empty query allowed with filters-only browse.

### Permissions
Published listings only; RBAC for any restricted entities.

### Error Handling
Timeout → partial results + retry; `400` invalid params.

### Future Enhancements
Cross-entity carousel sections; “jump to requirement match”.

---

## Feature F2 — Keyword Search

### Purpose
Match user terms to tagged and structured fields.

### Business Value
Long-tail discovery via manufacturer keywords and taxonomy.

### User Benefits
Find machines using colloquial or trade terms.

### Functional Requirements
Search machinery keywords, industry, subcategory, types, materials, labor/logistics flags, certifications, location strings, company names.

### Validation Rules
Normalize case; strip control chars.

### Permissions
Approved keywords only in index where moderation applies.

### Error Handling
No matches → empty state with filter tips.

### Future Enhancements
Synonym dictionary admin UI.

---

## Feature F3 — Full-text Search

### Purpose
Relevance search across descriptive text (details, about, specs).

### Business Value
Recall beyond exact facet matches.

### User Benefits
Natural phrasing still finds listings.

### Functional Requirements
Tokenize/stem (provider-dependent); rank by weighted fields.

### Validation Rules
Min token length; stopword handling.

### Permissions
Exclude confidential private texts from public indexes.

### Error Handling
Degrade to ILIKE prefix if FTS unavailable (ops mode).

### Future Enhancements
Semantic embeddings hybrid retrieval.

---

## Feature F4 — Auto-complete Suggestions

### Purpose
Guide users to high-yield queries and entities while typing.

### Business Value
Faster conversion; fewer zero-result searches.

### User Benefits
Discover canonical machinery types and companies quickly.

### Functional Requirements
Prefix suggestions for types, companies, industries, locations, popular keywords; debounce client requests.

### Validation Rules
Min 2 chars; max 10 suggestions.

### Permissions
Public suggestions from published corpus only.

### Error Handling
Fail soft (hide dropdown).

### Future Enhancements
Personalized suggestions; trending boost.

---

## Feature F5 — Search by Company

### Purpose
Find manufacturer/facility brand names.

### Business Value
Direct navigation for known suppliers.

### User Benefits
Bypass machinery-level browse.

### Functional Requirements
Company/facility name match; result links to facility or primary listings.

### Validation Rules
Partial/prefix/exact modes.

### Permissions
Published facilities only.

### Error Handling
Ambiguous names → multiple company cards.

### Future Enhancements
Verified-only company filter default.

---

## Feature F6 — Search by Machinery

### Purpose
Find specific machine types and named assets.

### Business Value
Core MVP supply discovery.

### User Benefits
Land on bookable capacity faster.

### Functional Requirements
Type/name/specs keyword match; machine entity as primary result.

### Validation Rules
Respect published + approved status.

### Permissions
Public/auth read published.

### Error Handling
Empty with “broaden type” prompts.

### Future Enhancements
Spec-range search (travel, spindle RPM).

---

## Feature F7 — Search by Industry

### Purpose
Browse/filter by industry classification.

### Business Value
Category landing and taxonomy navigation.

### User Benefits
Explore within known industry silos.

### Functional Requirements
Industry facet + query; subcategory cascade.

### Validation Rules
Known taxonomy IDs.

### Permissions
Public.

### Error Handling
Unknown industry → `400`.

### Future Enhancements
Industry SEO pages.

---

## Feature F8 — Search by Location

### Purpose
Filter/text match on city/state/country/serviceable areas.

### Business Value
Logistics-realistic shortlists.

### User Benefits
Prefer nearby or serviceable plants.

### Functional Requirements
Structured geo fields + serviceable area codes.

### Validation Rules
Valid country/state codes when provided.

### Permissions
Public published.

### Error Handling
Invalid geo → `400`.

### Future Enhancements
Multi-region OR groups.

---

## Feature F9 — Geospatial Search

### Purpose
Radius search from a lat/lng or geocoded point.

### Business Value
Distance-ranked procurement matching.

### User Benefits
“Within 50 km” discovery.

### Functional Requirements
Use facility coordinates; return `distanceKm`; sort by distance.

### Validation Rules
Radius 1–500 km; lat/lng required when radius set.

### Permissions
Public; approximate pin policy from EPIC-2 still applies.

### Error Handling
Missing coords exclude from radius mode.

### Future Enhancements
PostGIS `ST_DWithin`; travel-time isochrones.

---

## Feature F10 — Advanced Filters

### Purpose
Multi-dimensional narrowing of result sets.

### Business Value
B2B buyers need precision, not endless scroll.

### User Benefits
Composable constraints matching real RFQ criteria.

### Functional Requirements
See XFY-031 filter list; AND semantics default; live counts.

### Validation Rules
Numeric ranges coherent; dates valid.

### Permissions
Filter only against visible published inventory.

### Error Handling
No results → keep filters, suggest resets.

### Future Enhancements
OR groups; saved filter presets.

---

## Feature F11 — Sorting

### Purpose
Reorder results by relevance, distance, price, rating, availability, newest.

### Business Value
Supports different buyer intents.

### User Benefits
Control shortlist order.

### Functional Requirements
Stable secondary sort by id for pagination consistency.

### Validation Rules
Enum sort keys only.

### Permissions
Public.

### Error Handling
Unknown sort → default relevance.

### Future Enhancements
“Best value” composite score.

---

## Feature F12 — Search Results

### Purpose
Present matched listings in scannable layouts.

### Business Value
Conversion surface after intent expression.

### User Benefits
Compare options quickly.

### Functional Requirements
Card/list views; required card fields (image, company, machine, location, rating, price, availability, badges, favorite).

### Validation Rules
N/A.

### Permissions
Favorite requires auth.

### Error Handling
Loading/empty/error states mandatory.

### Future Enhancements
Compare checkbox tray.

---

## Feature F13 — Listing Detail Page

### Purpose
Full evaluation page before inquiry/booking.

### Business Value
Highest-intent conversion checkpoint.

### User Benefits
All diligence data in one place.

### Functional Requirements
Compose EPIC-2/3/4 data + CTAs; similar listings; reviews placeholder.

### Validation Rules
Only published detail routes.

### Permissions
CTAs auth-gated as needed.

### Error Handling
`404` unpublished; partial section failure isolation.

### Future Enhancements
AR/video tabs.

---

## Feature F14 — Favorites / Saved Listings

### Purpose
Let users bookmark listings for later.

### Business Value
Increases return visits and booking conversion.

### User Benefits
Build shortlists without external notes.

### Functional Requirements
Save/remove/list; unique per user+listing; dashboard entry.

### Validation Rules
No duplicates; listing must be published at save time (keep if later unpublished with badge).

### Permissions
Authenticated users.

### Error Handling
`409` duplicate treated as success idempotent.

### Future Enhancements
Folders/collections; share shortlists.

---

## Feature F15 — Search Analytics

### Purpose
Capture queries, clicks, zero-results, conversions.

### Business Value
Improve ranking, taxonomy, sales ops.

### User Benefits
Indirectly better results over time.

### Functional Requirements
Event pipeline for search, suggest, result click, save, inquiry.

### Validation Rules
PII minimization in stored queries optional hashing policy.

### Permissions
Admin read aggregates; user not exposed raw peers’ data.

### Error Handling
Analytics fail-open (never block search).

### Future Enhancements
Funnel dashboards; alert on spike zero-results.

---

## Feature F16 — Pagination

### Purpose
Page or infinite-scroll through large result sets.

### Business Value
Scalable discovery UX.

### User Benefits
Predictable browse performance.

### Functional Requirements
Cursor or offset+limit; consistent ordering.

### Validation Rules
Limit max 50; page bounds.

### Permissions
Public.

### Error Handling
Empty page past end → empty array.

### Future Enhancements
Cursor keys for index stability under writes.

---

## Feature F17 — Mobile Search Experience

### Purpose
First-class search on small screens.

### Business Value
Mobile visionary users convert too.

### User Benefits
Usable filters and results on phone.

### Functional Requirements
Sticky search; sheet for filters; thumb-friendly cards; reduced payload images.

### Validation Rules
N/A.

### Permissions
Same as desktop.

### Error Handling
Offline banner.

### Future Enhancements
Voice input affordance.

---

# Developer Tickets

---

## Ticket XFY-030

### Ticket ID
`XFY-030`

### Ticket Name
Global Keyword Search

### Priority
`P0 — Critical`

### Type
`Backend` · `Search` · `Story`

### Story Points
`13`

### Epic
`EPIC-6 — Search, Discovery & Filters`

### User Story
As a visionary, I want to search by keywords across machinery, companies, industries, locations, and service attributes so that I can quickly find relevant manufacturing capacity.

### Business Value
Primary discovery engine enabling marketplace liquidity and conversion.

### Description
Implement global keyword search with partial, prefix, and exact match modes; relevance ranking; pagination; suggestions integration point; indexing strategy. Typo tolerance and search history explicitly future-ready. Return card fields: title, company, primary image, location, price, availability, rating, tags, distance when applicable.

### Functional Requirements
1. Search fields: machinery type, company name, industry, subcategory, keywords, location, raw materials, labor, logistics, certifications.  
2. Match modes: partial, prefix, exact.  
3. Rank by relevance (+ optional distance boost when geo present).  
4. Pagination.  
5. Suggestions endpoint (shared with UI).  
6. Index only publishable listings.  

### UI Requirements (if frontend)
Global search box in nav; debounce; submit to results route with `q`; show suggestion dropdown (XFY-032 consumes results).

### Backend Requirements (if backend)
Search service; indexer/sync job from machinery/facility tables; ranking weights; query parser; metrics events.

### Acceptance Criteria
- [ ] Keyword search across listed attributes  
- [ ] Partial / prefix / exact behaviors documented and working  
- [ ] Relevance ranking applied  
- [ ] Pagination works  
- [ ] Suggestions available  
- [ ] Result payload includes title, company, primary image, location, price, availability, rating, tags, distance (when applicable)  

### Validation Rules
`q` max 200 chars; `page`/`limit` bounds; sanitize input.

### Permissions
Public/auth; published only.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/search` | `GET` |
| `/api/search/suggest` | `GET` |

### Request Payload
Query params example:

`GET /api/search?q=cnc%20aluminum&mode=PREFIX&page=1&limit=20&lat=18.52&lng=73.85`

### Response Payload
```json
{
  "query": "cnc aluminum",
  "total": 128,
  "page": 1,
  "limit": 20,
  "results": [
    {
      "listingId": "mch_01H...",
      "entityType": "MACHINERY",
      "title": "Haas VF-2 CNC Mill",
      "company": "Deshmukh Precision Works",
      "primaryImageUrl": "https://cdn.example/m/thumb.webp",
      "location": { "city": "Pune", "state": "MH", "country": "IN" },
      "price": { "amount": 1800, "unit": "DAY", "currency": "INR" },
      "availability": "AVAILABLE",
      "rating": { "average": 4.6, "count": 12 },
      "tags": ["cnc", "vmc", "prototype"],
      "distanceKm": 14.2,
      "badges": ["VERIFIED", "INSURANCE"]
    }
  ]
}
```

### Database Tables
Search index tables / projections: `SearchSuggestion`, `SearchAnalytics`; source: machinery, facility, keywords, certifications.

### Database Fields
Projection fields mirrored in search documents (see architecture).

### Entity Relationships
Search document ← MachineryInventory + Facility + Keywords + Pricing + Availability summary.

### Error Handling
`400` bad query; `429` rate limit; empty `results` not an error.

### Security Considerations
Sanitize query DSL injection if using search engines; rate limit; no confidential requirement bodies in public index.

### Edge Cases
Multi-script text; hyphenated types; zero results; geo without index coords.

### Dependencies
EPIC-2/3/4 published data; optional Redis cache.

### Search Architecture (ticket-level)

| Layer | Responsibility |
|-------|----------------|
| Source of truth | Postgres transactional entities |
| Projection | Denormalized search documents per listing |
| Query | FTS / engine query + filters |
| Rank | Weighted field matches + business signals |
| Serve | API + cache hot queries |

### Indexing Strategy
1. On publish/unpublish/update of machinery or facility → enqueue reindex.  
2. Nightly full reindex reconciliation.  
3. Document includes: names, taxonomy, keywords, location, service booleans, cert names, price primary, availability enum, rating aggregate, lat/lng, badges.  
4. Remove document when archived/suspended.  

### Ranking Logic (MVP weights — tunable)
| Signal | Weight guidance |
|--------|-----------------|
| Exact machinery type / name | Highest |
| Keyword exact | High |
| Company name prefix | High |
| Industry/subcategory | Medium |
| Description FTS | Medium-low |
| Verified facility badge | Boost |
| Rating | Mild boost |
| Completeness (images/price) | Mild boost |
| Distance (if geo) | Sort/boost when user intent is geo |
| Recency published | Mild |

### Performance Considerations
- p95 search < 300ms cached / < 700ms cold (target)  
- Limit FTS OR fanout  
- Cache suggest and top queries  
- Avoid N+1 by denormalizing card fields in index  

### Testing Checklist
- [ ] Exact/prefix/partial cases  
- [ ] Ranking sanity fixtures  
- [ ] Pagination stability  
- [ ] Unpublished excluded  
- [ ] Distance populated when lat/lng passed  

### Definition of Done
Search fixtures in staging; ranking doc published; OpenAPI complete; load smoke test.

---

## Ticket XFY-031

### Ticket ID
`XFY-031`

### Ticket Name
Advanced Search Filters

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`13`

### Epic
`EPIC-6 — Search, Discovery & Filters`

### User Story
As a visionary, I want to apply multiple advanced filters so that I can narrow results to manufacturers and machines that meet my operational constraints.

### Business Value
Precision discovery increases qualified leads and booking fit.

### Description
Implement AND-combined filters for location, radius, industry, machinery type, availability date, cost range, labor/raw/logistics/insurance flags, rating, certifications, SEZ, serviceable area, capacity, condition, years in market. Support reset, live filter counts, responsive filter UI, fast query path.

### Functional Requirements
1. All listed filters.  
2. Multiple filters simultaneously (AND).  
3. Reset all / clear chip.  
4. Live result counts (approximate OK if documented).  
5. Responsive filter panel/sheet.  
6. Fast filtering with indexes / search engine filters.  

### UI Requirements (if frontend)
Desktop: left filter rail; mobile: bottom sheet; selected chips; counts beside facets; skeleton while fetching; “Show N results” sticky CTA on mobile.

### Backend Requirements (if backend)
Filter DTO validation; query planner using index fields; facet count endpoint optional; geo distance predicate.

### Acceptance Criteria
- [ ] Multiple filters simultaneously  
- [ ] Filter reset  
- [ ] Live filter count  
- [ ] Responsive UI  
- [ ] Fast filtering (within NFR latency)  

### Validation Rules
| Filter | Rule |
|--------|------|
| radiusKm | 1–500; requires lat/lng |
| costMin/Max | ≥ 0; min ≤ max |
| availabilityDate | ISO date; maps to slot coverage (EPIC-4) |
| ratingMin | 0–5 |
| yearsInMarketMin | ≥ 0 |

### Permissions
Public/auth; only published inventory.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/search` | `GET` (accepts filter query params) |
| `/api/search/facets` | `GET` optional counts |

### Request Payload
`GET /api/search?q=cnc&industry=IND_METAL&machineryType=TYPE_VMC&lat=18.52&lng=73.85&radiusKm=50&costMin=500&costMax=3000&costUnit=DAY&laborIncluded=true&rawMaterialsAvailable=YES&logisticsAvailable=true&insuranceIncluded=true&ratingMin=4&certifications=ISO9001&sezStatus=NONE&availabilityFrom=2026-08-01&availabilityTo=2026-08-07&machineCondition=GOOD&yearsInMarketMin=5&sort=RELEVANCE&page=1&limit=20`

### Response Payload
Search results + `appliedFilters` + `total` + optional `facets`.

### Database Tables
Uses indexed source tables / search documents; no mandatory new table.

### Database Fields
Filterable projections: lat/lng, industry, type, price, flags, rating, certs, sez, serviceable_areas, condition, years_in_market, availability summary.

### Entity Relationships
Filters constrain Machinery ← Facility attributes.

### Filter Architecture
```
UI selected facets
    ↓
Validated FilterQuery DTO
    ↓
SearchService
    ├─ text query clause (optional)
    ├─ term filters (industry, type, flags, certs, SEZ, condition)
    ├─ range filters (price, rating, years)
    ├─ geo filter (radius)
    └─ availability exists(slot overlap) subquery / denorm flag
    ↓
Rank + paginate
```

### Database Query Strategy
| Approach | When |
|----------|------|
| Postgres + indexes | MVP volumes; hybrid FTS `tsvector` + B-tree/GIN + haversine |
| PostGIS | Growth geo precision |
| OpenSearch/Elasticsearch | Large catalogs, heavy facet aggregations, typo tolerance later |

Always filter **document/inventory status=PUBLISHED** first.

### Error Handling
`400` invalid ranges; soft-empty results.

### Security Considerations
Parameterized queries only; rate limit facet endpoints; don’t expose hidden facet values from confidential reqs.

### Edge Cases
Availability window with no slots; radius excludes items missing coords; conflicting filters guaranteed empty.

### Dependencies
XFY-030; EPIC-3/4 fields; EPIC-2 SEZ/serviceable/years.

### Testing Checklist
- [ ] Each filter alone  
- [ ] Combined filters  
- [ ] Reset  
- [ ] Counts move with selections  
- [ ] Latency budget  

### Definition of Done
Filter matrix test pack green; mobile sheet UX accepted; docs for filter param names frozen.

---

## Ticket XFY-032

### Ticket ID
`XFY-032`

### Ticket Name
Search Results Page

### Priority
`P0 — Critical`

### Type
`Frontend` · `Full-stack` · `Story`

### Story Points
`8`

### Epic
`EPIC-6 — Search, Discovery & Filters`

### User Story
As a visionary, I want a clear results page with card/list views and sorting so that I can compare listings and open the best fits.

### Business Value
Turns search intent into engagement and shortlist behavior.

### Description
Build results page with card and list views; each result shows image, company, machinery, location, rating, price, availability, badges, favorite icon. Sorting: relevance, distance, rating, lowest/highest price, availability, newest. Infinite scroll or pagination; empty/loading/error states.

### Functional Requirements
1. Card + list toggles.  
2. Required result fields and favorite affordance.  
3. Sort controls.  
4. Pagination or infinite scroll.  
5. Empty, loading, error states.  
6. Sync URL query params for shareability.  

### UI Requirements (if frontend)

#### UX Flow
```
Land from nav search / filters
 → Loading skeletons
 → Results grid/list
 → Sort / change view
 → Click card → detail
 → Heart → save (auth gate)
```

#### Responsive
- Mobile: 1-col cards; filters sheet; sort select  
- Tablet: 2-col  
- Desktop: 3–4 col + filter rail  

#### States
| State | UX |
|-------|----|
| Loading | Skeleton cards |
| Empty | Illustration + “Clear filters” + popular categories |
| Error | Message + Retry |
| Partial | Banner if geo degraded |

### Backend Requirements (if backend)
Ensure `/api/search` supports `sort`, `view` irrelevant server-side; favorites state via batch ids endpoint optional.

### Acceptance Criteria
- [ ] Card and list views  
- [ ] All listed result fields  
- [ ] All sort options  
- [ ] Infinite scroll or pagination  
- [ ] Empty/loading/error states  

### Validation Rules
Client mirrors API sort enums.

### Permissions
Favorite requires login modal.

### REST API Endpoints
`GET /api/search` (primary); `GET /api/favorites/status?ids=` optional.

### Request Payload
URL state: `q`, filters, `sort`, `page`/`cursor`, `view=CARD|LIST`.

### Response Payload
Per XFY-030 results array.

### Database Tables
N/A beyond search + SavedListing for heart state.

### Database Fields
N/A

### Entity Relationships
Results → listing detail route param.

### Error Handling
Preserve filters on error retry.

### Security Considerations
Don’t leak draft listings via guessable IDs in client state.

### Edge Cases
Distance sort without lat/lng → disable/fallback relevance; rating nulls last.

### Dependencies
XFY-030/031; XFY-034 for favorites; auth modal.

### Testing Checklist
- [ ] View toggle  
- [ ] Each sort  
- [ ] Pagination/scroll  
- [ ] URL share restores state  
- [ ] Mobile layout  

### Definition of Done
Design QA; Lighthouse basics on results; analytics click events wired.

---

## Ticket XFY-033

### Ticket ID
`XFY-033`

### Ticket Name
Listing Detail Page

### Priority
`P0 — Critical`

### Type
`Full-stack` · `Story`

### Story Points
`13`

### Epic
`EPIC-6 — Search, Discovery & Filters`

### User Story
As a visionary, I want a comprehensive listing detail page so that I can evaluate a machine and manufacturer before inquiring or booking.

### Business Value
Conversion hub linking discovery to EPIC-4/5 actions.

### Description
Assemble detail UI/API aggregating manufacturer profile, company details, machinery specs, images, pricing, availability calendar, raw materials, labor, logistics, infrastructure, insurance, certifications, reviews (placeholder), FAQs, similar listings. CTAs: Send Inquiry, Request Booking, Save, Share, Contact Manufacturer. Mobile responsive; optimized images; fast loading; clear CTAs.

### Functional Requirements
1. Display all listed sections when data present; hide empty gracefully.  
2. Actions wired to auth + downstream flows.  
3. Similar listings module.  
4. Performance: prioritize hero + price + CTA; lazy below-fold.  

### UI Requirements (if frontend)

#### Layout
- Hero gallery + sticky CTA column (price, availability, primary actions)  
- Tabs or stacked sections for specs/services/insurance/certs/FAQs  
- Facility/company strip with verification badge  
- Calendar embed (EPIC-4)  
- Similar listings carousel  
- Reviews placeholder  

#### Actions
| CTA | Behavior |
|-----|----------|
| Send Inquiry | Opens inquiry/request compose |
| Request Booking | Calendar selection → reserve path |
| Save Listing | Favorite toggle |
| Share Listing | Copy link / Web Share API |
| Contact Manufacturer | Message thread / reveal contact policy |

#### States
Loading section skeletons; 404; soft-fail calendar with retry.

### Backend Requirements (if backend)
`GET /api/public/machinery/{id}` aggregate DTO; similar listings query; view event logging (`ListingView`).

### Acceptance Criteria
- [ ] Mobile responsive  
- [ ] Optimized images  
- [ ] Fast loading (hero prioritized)  
- [ ] Clear CTAs  

### Validation Rules
Published only; unpublished → 404.

### Permissions
Public read published; CTAs per auth; contact masking policies.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/public/machinery/{idOrSlug}` | `GET` |
| `/api/public/machinery/{id}/similar` | `GET` |
| `/api/public/machinery/{id}/views` | `POST` analytics |
| `/api/favorites/{listingId}` | `POST` `DELETE` |

### Request Payload
N/A for GET detail.

### Response Payload
Aggregated document including facility, machinery modules, calendar summary, certs, faqs, `ctaCapabilities`.

### Database Tables
Reads EPIC-2/3/4; writes `ListingView`, favorites.

### Database Fields
N/A new required beyond analytics.

### Entity Relationships
Machinery detail composes Facility 1—1 modules.

### Data Loading Strategy
1. SSR/CSR fetch primary aggregate (card-critical fields first if split).  
2. Parallel: similar, reviews placeholder, calendar month.  
3. Images via CDN srcset.  
4. Cache public detail CDN/HTTP cache short TTL; purge on update.  

### Error Handling
Section-level errors don’t blank entire page.

### Security Considerations
No private manufacturer notes; rate-limit contact reveals; share URLs only public IDs.

### Edge Cases
Missing optional modules; timezone on calendar; similar empty.

### Dependencies
EPIC-2/3/4 APIs; XFY-034; messaging/inquiry epic stubs.

### Testing Checklist
- [ ] All sections render with fixtures  
- [ ] CTA auth gates  
- [ ] Mobile sticky CTA  
- [ ] LCP image path  
- [ ] 404 unpublished  

### Definition of Done
Perf budget accepted; CTA analytics events firing; UX sign-off.

---

## Ticket XFY-034

### Ticket ID
`XFY-034`

### Ticket Name
Saved Listings

### Priority
`P1 — High`

### Type
`Full-stack` · `Story`

### Story Points
`5`

### Epic
`EPIC-6 — Search, Discovery & Filters`

### User Story
As a user, I want to save and manage favorite listings so that I can revisit promising manufacturers and machines later.

### Business Value
Increases retention and conversion from shortlists.

### Description
Save/remove/view saved listings; prevent duplicates; dashboard integration; fast retrieval; responsive UI. Folders future.

### Functional Requirements
1. Save listing.  
2. Remove saved listing.  
3. View saved listings.  
4. Unique constraint per user+listing.  
5. Dashboard section.  

### UI Requirements (if frontend)
Heart toggle on cards/detail; Saved page under dashboard; empty state; optimistic toggle with rollback; unpublished badge if listing later removed from search.

### Backend Requirements (if backend)
`SavedListing` CRUD; list with join to card projection; idempotent save.

### Acceptance Criteria
- [ ] Duplicate saves prevented  
- [ ] Dashboard integration  
- [ ] Fast retrieval  
- [ ] Responsive UI  

### Validation Rules
Listing exists; prefer published at save; unique `(user_id, listing_id, listing_type)`.

### Permissions
Authenticated owner of favorites only.

### REST API Endpoints
| Endpoint | Method |
|----------|--------|
| `/api/favorites` | `GET` `POST` |
| `/api/favorites/{listingId}` | `DELETE` |
| `/api/favorites/status` | `GET` |

### Request Payload
```json
{
  "listingId": "mch_01H...",
  "listingType": "MACHINERY"
}
```

### Response Payload
```json
{
  "items": [
    {
      "listingId": "mch_01H...",
      "listingType": "MACHINERY",
      "savedAt": "2026-07-15T08:00:00.000Z",
      "card": { "title": "Haas VF-2", "company": "Deshmukh Precision Works", "primaryImageUrl": "...", "price": { "amount": 1800, "unit": "DAY" } }
    }
  ]
}
```

### Database Tables
`SavedListing`

### Database Fields
See Database Design.

### Entity Relationships
User 1—* SavedListing → Machinery/Facility polymorphic listing ref.

### Error Handling
Idempotent `POST` returns 200 if exists; `404` delete missing.

### Security Considerations
No listing other users’ favorites; IDOR checks.

### Edge Cases
Saved then archived → show unavailable state; rapid double-click.

### Dependencies
Auth; search card projection.

### UX Flow
```
Tap favorite → if anon → login → resume save
 → Saved
Dashboard → Saved Listings → open detail / unsave
```

### Testing Checklist
- [ ] Save/unsave  
- [ ] Duplicate  
- [ ] List performance  
- [ ] Dashboard entry  
- [ ] Mobile  

### Definition of Done
Unique constraint verified; analytics `favorite` events; UX accepted.

---

# Database Design

## ER Overview (text)

```
User
 ├─1──* SavedListing
 ├─1──* SearchHistory (future UI)
 └─1──* ListingView (as viewer)

SearchKeyword (dictionary / trending)
SearchSuggestion
SearchAnalytics (events)
```

## `SearchKeyword`

| Column | PK/FK | Notes |
|--------|-------|-------|
| id | PK | |
| label | | |
| normalized_label | UNIQUE | |
| status | APPROVED/BANNED | |
| search_count | bigint | |
| updated_at | | |

## `SavedListing`

| Column | Notes |
|--------|-------|
| id PK | |
| user_id FK | INDEX |
| listing_id | INDEX |
| listing_type | MACHINERY/FACILITY/VENDOR/... |
| created_at | |
| UNIQUE(user_id, listing_id, listing_type) | |

## `SearchHistory`

| Column | Notes |
|--------|-------|
| id PK | |
| user_id FK nullable | anon session id optional |
| query | |
| filters jsonb | |
| result_count | |
| created_at | INDEX |

## `SearchAnalytics`

| Column | Notes |
|--------|-------|
| id PK | |
| event_type | SEARCH/SUGGEST_CLICK/RESULT_CLICK/ZERO_RESULTS/FAVORITE/INQUIRY |
| query | |
| listing_id nullable | |
| user_id nullable | |
| session_id | |
| meta jsonb | latency, page, sort |
| created_at | INDEX |

## `SearchSuggestion`

| Column | Notes |
|--------|-------|
| id PK | |
| suggestion_type | TYPE/COMPANY/INDUSTRY/KEYWORD/LOCATION |
| label | |
| normalized_prefix | INDEX for prefix lookup |
| target_id nullable | |
| weight | popularity |
| is_active | |

## `ListingView`

| Column | Notes |
|--------|-------|
| id PK | |
| listing_id | INDEX |
| listing_type | |
| user_id nullable | |
| session_id | |
| referrer | search/similar/direct |
| created_at | |

## Relationships
- Favorites belong to User and reference listings polymorphically.  
- Analytics/history append-only for insights.  
- Suggestions curated/derived from taxonomy + popularity.  

---

# REST API Summary

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/search` | `GET` | Global search + filters + sort + page | Public/Auth |
| `/api/search/suggest` | `GET` | Auto-complete suggestions | Public/Auth |
| `/api/search/facets` | `GET` | Facet counts for filters | Public/Auth |
| `/api/public/machinery/{idOrSlug}` | `GET` | Listing detail aggregate | Public |
| `/api/public/machinery/{id}/similar` | `GET` | Similar listings | Public |
| `/api/public/machinery/{id}/views` | `POST` | Record listing view | Public/Auth |
| `/api/favorites` | `GET` | List saved listings | Required |
| `/api/favorites` | `POST` | Save listing | Required |
| `/api/favorites/{listingId}` | `DELETE` | Remove saved listing | Required |
| `/api/favorites/status` | `GET` | Batch favorite state | Required |
| `/api/admin/search/analytics` | `GET` | Search analytics aggregates | Admin |
| `/api/admin/search/keywords` | `GET` `PATCH` | Manage keywords | Admin |
| `/api/admin/search/rankings` | `GET` `PATCH` | Featured / boost rules | Admin |
| `/api/admin/search/trending` | `GET` | Trending queries | Admin |

---

# Search Architecture

## Overview

```
Write path: Facility/Machinery/Keywords/Availability changes
        ↓
  Indexer / Outbox projection
        ↓
  Search Documents (Postgres FTS table OR OpenSearch index)
        ↓
Read path: /api/search (+ filters, geo, sort, page)
        ↓
  Ranker + ACL publish filter
        ↓
  Cache (optional) → API → UI
```

## Search Indexing
- Event-driven reindex on publish, update, unpublish, archive, price change, availability summary change, cert verify.  
- Compensating nightly reconcile.  
- Documents are denormalized for card rendering without joins on hot path.  

## Full-text Search
- **MVP:** PostgreSQL `tsvector` / `websearch_to_tsquery` on weighted columns (name A, keywords A, company B, industry B, description C).  
- **Scale:** OpenSearch/Elasticsearch multi-field analyzers, n-grams for partial/prefix, language analyzers later.  

## Geospatial Queries
- Store facility `latitude`/`longitude`.  
- MVP: haversine in SQL or prefilter bbox then haversine.  
- Scale: PostGIS `geography` + `ST_DWithin`, or geo_distance in OpenSearch.  

## Ranking Algorithm
1. Text relevance score from FTS/engine.  
2. Multiply/add business boosts (verified, rating, completeness).  
3. Apply geo boost or switch primary sort to distance when requested.  
4. Stable tie-breaker: `listingId` DESC/ASC for deterministic pagination.  

## Pagination Strategy
- MVP: `page` + `limit` with stable sort.  
- Preferred evolution: **keyset/cursor** pagination on `(sortKey, id)`.  
- Infinite scroll uses cursor tokens opaque to clients.  

## Caching
- Cache suggest prefixes and anonymized top queries in Redis.  
- Short TTL HTTP cache for public detail.  
- Do not cache personalized favorite state in shared CDN.  

## Performance Optimization
- Denormalize card fields into search docs.  
- Cap limit ≤ 50.  
- Async analytics.  
- Warm indexes; monitor slow queries.  
- CDN images/thumbs.  

## Technology Recommendation (conceptual)

| Technology | Appropriate when |
|------------|------------------|
| **PostgreSQL Full-Text Search** | Early marketplace; moderate inventory; team wants operational simplicity; strong transactional consistency with one DB |
| **PostgreSQL + PostGIS** | Radius search accuracy becomes critical before moving engines |
| **OpenSearch / Elasticsearch** | Large catalogs; heavy faceting; typo tolerance; multi-entity search; relevance tuning teams |
| **Hybrid** | Postgres SoT + async projection to OpenSearch as volume grows |

**Guidance:** Start with **Postgres FTS + indexed filters + haversine/PostGIS**; introduce **OpenSearch** when facet latency, relevance tuning, or multi-entity search outgrows SQL comfortably—without rewriting product contracts (`/api/search` stable).

---

# Search User Journey

```
Enter keyword
     ↓
Receive suggestions
     ↓
Apply filters
     ↓
View results
     ↓
Sort results
     ↓
Open listing
     ↓
Save listing or submit inquiry
     ↓
Request booking
```

---

# Business Rules

| # | Rule |
|---|------|
| 1 | Only published listings appear in search |
| 2 | Suspended / archived / draft listings are excluded |
| 3 | Distance filtering uses facility coordinates |
| 4 | Search results respect permissions for confidential content (no private requirement IP in public supply search) |
| 5 | Favorites are unique per user and listing |
| 6 | Pagination must produce consistent ordering (stable sort keys) |
| 7 | Radius filter requires a valid origin point |
| 8 | Unpublished after favorite remains in Saved with unavailable state, not in search |
| 9 | Featured/admin boosts must be auditable |
| 10 | Zero-result events must still be recorded for analytics |

---

# Admin Features

| Capability | Description |
|------------|-------------|
| **Monitor search analytics** | Queries, CTR, zero-results, latency |
| **Manage search keywords** | Approve/ban trending tags |
| **Remove inappropriate tags** | Moderation actions |
| **Feature listings** | Manual boost / featured flag |
| **Manage search rankings** | Weight/boost configuration |
| **View trending searches** | Demand signals for GTM |

---

# Security Requirements

| Control | Requirement |
|---------|-------------|
| Input sanitization | Strip control chars; bound lengths |
| Query validation | Enum/sort/filter allowlists |
| Rate limiting | `/search`, `/suggest`, detail views |
| Search abuse prevention | Bot detection; pagination abuse caps |
| Role-based permissions | Admin analytics vs public search |
| Audit logging | Featured ranking changes; keyword bans |

---

# Non-functional Requirements

| Category | Requirement |
|----------|-------------|
| **Search latency** | p95 < 300ms cached suggest; p95 < 700ms search uncached target |
| **Scalability** | Horizontal API; indexed/engine-backed query path |
| **Reliability** | Degrade gracefully if secondary index lags (read Postgres projection) |
| **Security** | No draft leakage; injection-safe queries |
| **Accessibility** | Keyboard suggestions; annular rating text; filter labels |
| **Mobile responsiveness** | Full journey usable on small screens |

---

# Ticket Summary Board

| Ticket | Name | Priority | Points |
|--------|------|----------|--------|
| XFY-030 | Global Keyword Search | P0 | 13 |
| XFY-031 | Advanced Search Filters | P0 | 13 |
| XFY-032 | Search Results Page | P0 | 8 |
| XFY-033 | Listing Detail Page | P0 | 13 |
| XFY-034 | Saved Listings | P1 | 5 |
| | **Total** | | **52** |

**Suggested sequencing:** XFY-030 → XFY-031 → XFY-032 → XFY-033 → XFY-034

---

# Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Index lag shows stale price/availability | Event reindex + TTL short + availability recheck on detail/booking |
| Slow multifaceted SQL | Denorm docs; move to OpenSearch when needed |
| Geo without coords | Exclude + prompt manufacturers to geocode (EPIC-2) |
| Zero-result frustration | Suggestions, broader filters CTA, analytics-driven synonyms |
| Scraping | Rate limits, auth walls for heavy facet use |

---

# Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| AI semantic search | Embedding retrieval hybrid with keyword |
| Natural language search | Parse “CNC in Pune under 2k/day next week” |
| Voice search | Mobile mic input |
| Image-based search | Photo of part → machine capabilities |
| Personalized recommendations | Based on saves/views/requirements |
| Trending searches | Consumer UI surface |
| Search alerts | Notify when new matches appear |
| Saved searches | Persist filter sets |
| Recommendation engine integration | Detail “because you viewed” |
| Multilingual search | Cross-language analyzers |

---

## Traceability

| Artifact | Use |
|----------|-----|
| PRD / SRS | Discovery requirements |
| Tech Design | Indexing, ranking, geo, pagination |
| Jira / Azure DevOps | Import XFY-030–XFY-034 |
| Confluence / Notion | EPIC 6 source of truth |
| Downstream | Inquiry, EPIC-4 booking CTAs from detail |

---

**X!Y — The Explorer Factory**  
*Why own it when you can make it.*
