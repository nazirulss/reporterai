# REPORTER AI — Apps Script Backend Foundation (STEP 5.4)

**Version:** 1.3 (People, Quote & Event Service Milestone)  
**System:** AI News Production & Editorial System  
**Platform:** Google Apps Script Web App  
**Authoritative Storage:** Google Spreadsheet (`REPORTER_AI_DATABASE`) & Google Drive  
**Server-Side AI:** Gemini API (Direct backend proxy, never exposed to client)  

---

## 1. Purpose & Architecture

STEP 5.4 establishes the core newsroom human actors, quote integrity, and chronological event sequence layers:
- **PEOPLE = News Actors & Sources:** Authoritative directory of people involved in the news project with human verification.
- **QUOTES = Direct & Indirect Utterances:** Strict Quote Guard enforcing `verifyQuote !== approveQuote`. Direct quotes require explicit source provenance within the same project. Substantive text edits trigger immediate editorial invalidation.
- **EVENTS = Chronological Timeline:** What happened and in what order, deterministically sequenced with server-authoritative reordering.
- **Zero Cross-Project Mutation:** People, Quotes, Events, Sources, and Facts must strictly belong to the same project.
- **No Client State Bypass:** Client flags (`approved: true`, `verified: true`, `status: "APPROVED"`) are rejected server-side.

### Request Flow
```text
index.html (Client)
    ↓
API.request(action, payload) [HTTP POST / GET]
    ↓
Code.gs (doPost / doGet Entry Points)
    ↓
Router.gs (routeRequest & Action Registry: 36 Actions)
    ├── ProjectService.gs (Lifecycle & NEWS_PROJECTS)
    ├── SourceService.gs  (Evidence & SOURCES)
    ├── FactService.gs    (Provenance & FACTS)
    ├── PeopleService.gs  (News Actors & PEOPLE)
    ├── QuoteService.gs   (Quote State Machine & QUOTES)
    └── EventService.gs   (Timeline & EVENTS)
    ↓
SpreadsheetService.gs (Database Abstraction with LockService)
    ↓
Google Spreadsheet (REPORTER_AI_DATABASE)
```

---

## 2. Directory Structure

```text
backend/apps-script/
├── Code.gs                 # HTTP Web App entry points (doGet, doPost)
├── Config.gs               # Centralized configuration via PropertiesService
├── Router.gs               # Action routing & validation engine (36 registered actions)
├── Response.gs             # Standardized API response formatters & ContentService JSON output
├── Utils.gs                # Reusable utilities, domain ID generators, and sanitizers
├── SpreadsheetService.gs   # Database abstraction, canonical schemas, and LockService writes
├── ProjectService.gs       # Authoritative project lifecycle, state machine & NEWS_PROJECTS CRUD
├── SourceService.gs        # Evidence provenance, source types, and SOURCES CRUD
├── FactService.gs          # Structured fact claims, verification guards, and FACTS CRUD
├── PeopleService.gs        # News actors, roles, verification status & PEOPLE CRUD
├── QuoteService.gs         # Strict Quote Guard, direct quote provenance & QUOTES CRUD
├── EventService.gs         # Chronological event sequence, reordering & EVENTS CRUD
└── README.md               # Backend documentation and deployment manual
```

---

## 3. Configuration & Script Properties

All configuration is stored securely on the server using `PropertiesService.getScriptProperties()`. **No API keys, spreadsheet IDs, or folder IDs are ever hardcoded or sent to the frontend.**

### Required Script Properties

| Property Key | Required | Description | Example |
|---|---|---|---|
| `REPORTER_AI_SPREADSHEET_ID` | **YES** | ID of the Google Spreadsheet database | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `REPORTER_AI_DRIVE_ROOT_ID` | **YES** | ID of the Google Drive project root folder | `1xYzAbCdEfGhIjKlMnOpQrStUvWxYz123` |
| `REPORTER_AI_GEMINI_API_KEY` | **YES** | Google AI Studio Gemini API Key | `AIzaSyD...` (Server-side only) |
| `REPORTER_AI_ENVIRONMENT` | NO | Operating environment (`DEMO`, `DEVELOPMENT`, `PRODUCTION`) | Defaults to `DEVELOPMENT` |

---

## 4. Google Apps Script Deployment Instructions

1. Open [Google Drive](https://drive.google.com) and create:
   - A Google Spreadsheet named `REPORTER_AI_DATABASE`. Note its file ID from the URL (`https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`).
   - A Google Drive folder named `REPORTER_AI`. Note its folder ID.
2. In Google Drive, click **New > More > Google Apps Script** (or open the spreadsheet and go to **Extensions > Apps Script**).
3. Name the project `REPORTER_AI_BACKEND`.
4. Create the 6 `.gs` files in the script editor:
   - `Code.gs`
   - `Config.gs`
   - `Router.gs`
   - `Response.gs`
   - `Utils.gs`
   - `SpreadsheetService.gs`
5. Configure Script Properties (**Project Settings ⚙️ > Script Properties > Add script property**):
   - `REPORTER_AI_SPREADSHEET_ID` = `{YOUR_SPREADSHEET_ID}`
   - `REPORTER_AI_DRIVE_ROOT_ID` = `{YOUR_FOLDER_ID}`
   - `REPORTER_AI_GEMINI_API_KEY` = `{YOUR_GEMINI_API_KEY}`
   - `REPORTER_AI_ENVIRONMENT` = `DEVELOPMENT`
6. Click **Deploy > New Deployment**:
   - Select type: **Web App**
   - Description: `REPORTER AI Backend v1.0 Foundation`
   - Execute as: **Me (your account)**
   - Who has access: **Anyone** (or restricted to your domain)
7. Click **Deploy**, authorize access permissions, and copy the **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).
8. Open `index.html` in your browser, go to **Konfigurasi & Koneksi**, paste the Web App URL, and click **Cek Koneksi (healthCheck)**.

---

## 5. API Contract & Health Check

### 5.1 Request Envelope

**HTTP POST:**
```json
{
  "action": "healthCheck",
  "payload": {}
}
```

**HTTP GET:**
```text
GET /exec?action=healthCheck
```

### 5.2 Success Response Envelope
```json
{
  "success": true,
  "data": {
    "service": "REPORTER AI Backend",
    "version": "1.0.0",
    "environment": "DEVELOPMENT",
    "status": "READY",
    "checks": {
      "config": true,
      "spreadsheet": true,
      "router": true,
      "drive_configured": true,
      "gemini_configured": true
    },
    "database": "CONNECTED",
    "notes": "Connected"
  },
  "meta": {
    "timestamp": "2026-09-28T15:30:00.000Z"
  }
}
```

### 5.3 Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "UNKNOWN_ACTION",
    "message": "Unknown action \"invalidAction\". Action is not registered in backend action registry."
  },
  "meta": {
    "timestamp": "2026-09-28T15:30:00.000Z"
  }
}
```

---

## 6. Security & Concurrency Principles

1. **Zero Client Secrets:** No Gemini API keys or spreadsheet IDs are exposed in the client code or returned in API responses.
2. **LockService for Database Writes:** All write operations (`appendRecord`, `updateRecordById`) acquire a script lock (`LockService.getScriptLock()`) with a 10-second timeout to prevent race conditions.
3. **Controlled Error Responses:** Raw internal errors, stack traces, and sensitive paths are sanitized before being returned to the client.
4. **Backend Authority:** Frontend guards are for UX only. The server strictly validates all actions and data integrity independently.

---

---

## 7. Supported Actions in Backend

### 7.1 System Actions (STEP 5.1)
- `healthCheck` — Verifies configuration, spreadsheet connectivity, and router readiness without exposing secrets.

### 7.2 Project Actions (STEP 5.2 — ProjectService)
- `createProject` — Creates an authoritative news project record in `NEWS_PROJECTS`.
  - Server generates `PROJ-YYYY-XXXX` ID.
  - Server sets `status = "ACTIVE"` and `current_stage = "FORM"`.
  - Client timestamps and client IDs are discarded.
- `getProject` — Retrieves authoritative project record by `projectId`.
- `listProjects` — Retrieves list of projects with optional filtering by `status`, `stage`, or `reporter_id`.
- `updateProject` — Updates whitelisted mutable fields. Protected fields cannot be overwritten.
- `archiveProject` — Soft-deletes a project by setting `status = "ARCHIVED"`. Safe and idempotent.
- `changeProjectStage` — Advances or rolls back editorial stage with server-side validation.

### 7.3 Source Actions (STEP 5.3 — SourceService)
- `createSource` — Registers evidence record in `SOURCES`.
  - Server generates `SRC-...` ID.
  - Strictly confirms `project_id` exists in `NEWS_PROJECTS`.
  - Validates `source_type` (`OBSERVATION`, `INTERVIEW`, `DOCUMENT`, `PRESS_RELEASE`, `MEDIA`).
- `getSource` — Retrieves authoritative source record by `sourceId`.
- `getSources` — Lists sources for a given project.
- `updateSource` — Updates mutable fields (`title`, `description`, `source_person`, `source_date`, `raw_text`, `reliability`).
- `deleteSource` — Deletes evidence record safely. Rejects with `CONFLICT` if any facts or quotes reference the source.

### 7.4 Fact Actions (STEP 5.3 — FactService)
- `createFact` — Stores granular factual claim in `FACTS`.
  - Server generates `FACT-...` ID.
  - Strictly enforces same-project source provenance: `source.project_id === fact.project_id`.
  - Discards client verification flags; initial status is always `UNVERIFIED`.
- `getFact` — Retrieves authoritative fact record by `factId`.
- `getFacts` — Lists facts filtered by `project_id`, `source_id`, or `verification_status`.
- `updateFact` — Updates claim statement while enforcing Centralized Editorial Invalidation (modifying verified text resets status to `UNVERIFIED`).
- `verifyFact` — Human-in-the-loop verification. Fails if fact is `REJECTED`, in `CONFLICT`, or has invalid provenance.
- `rejectFact` — Rejects a fact with mandatory human justification. Preserves audit trail in `notes`.
- `analyzeFacts` — Performs deterministic server-side analysis of a project's fact base without AI fabrication.

### 7.5 People Actions (STEP 5.4 — PeopleService)
- `createPerson` — Registers an individual/source actor in `PEOPLE`.
  - Server generates `PERSON-...` ID.
  - Strictly confirms `project_id` exists in `NEWS_PROJECTS`.
  - Discards client verification flags; initial status is always `UNVERIFIED`.
- `getPerson` — Retrieves authoritative person record by `personId`.
- `getPeople` — Lists people associated with a project.
- `updatePerson` — Updates mutable fields (`name`, `role`, `affiliation`, `contact_info`, `notes`).
- `verifyPerson` — Authoritative human verification of identity and credentials. Sets `verification_status = "VERIFIED"`.

### 7.6 Quote Actions (STEP 5.4 — QuoteService)
- `createQuote` — Registers an utterance in `QUOTES`.
  - Server generates `QUOTE-...` ID.
  - Validates `quote_type` (`DIRECT`, `INDIRECT`, `PARAPHRASE`).
  - **Direct Quote Provenance:** For `DIRECT` quotes, `source_id` is mandatory.
  - Validates cross-project integrity for both `source_id` and `person_id`.
  - Initial status is always `UNVERIFIED` and `approved_for_publication = false`.
- `getQuote` — Retrieves authoritative quote record by `quoteId`.
- `getQuotes` — Lists quotes filtered by `project_id`, `person_id`, `source_id`, `verification_status`, or `quote_type`.
- `updateQuote` — Updates mutable quote fields (`quote_text`, `quote_type`, `context`, `notes`).
  - **Editorial Invalidation:** Material changes to `quote_text`, `quote_type`, `source_id`, or `person_id` immediately reset status to `UNVERIFIED` and revoke publication approval.
- `verifyQuote` — Verifies fidelity against source evidence. Sets `verification_status = "VERIFIED"`. Does **NOT** grant publication approval.
- `approveQuote` — Authorizes quote for publication (`approved_for_publication = true`). Strictly requires quote to already be `VERIFIED` and backed by valid evidence.
- `rejectQuote` — Rejects quote with mandatory editorial reason. Preserves record for auditability.

### 7.7 Event Actions (STEP 5.4 — EventService)
- `createEvent` — Adds a chronological event to `EVENTS`.
  - Server generates `EVENT-...` ID.
  - Confirms `project_id` exists in `NEWS_PROJECTS`.
  - Auto-assigns incremental sequence number (`sequence`).
- `getEvent` — Retrieves authoritative event record by `eventId`.
- `getEvents` — Lists project events sorted deterministically: `sequence ASC`, `event_time ASC`, `created_at ASC`.
- `updateEvent` — Updates mutable fields (`event_time`, `activity`, `location`, `actors`, `notes`, `sequence`).
- `reorderEvents` — Atomically updates sequence numbers for an array of event IDs within a project.

---

## 8. Provenance & State Machines

### 8.1 Fact Lifecycle
```text
               ┌─── [verifyFact] ───► VERIFIED (Human signed-off, provenance confirmed)
               │                        │
               │                        └─── [updateFact text] ───► UNVERIFIED (Invalidation)
UNVERIFIED ────┼─── [conflict found] ─► CONFLICT (Hard-blocks verification & drafting)
               │
               └─── [rejectFact] ────► REJECTED (Preserved in audit trail with reason)
```

### 8.2 Quote State Machine & Quote Guard
```text
                             ┌─── [approveQuote] ───► APPROVED (Eligible for draft & publication)
                             │                          │
              ┌─── [verify] ─┴──► VERIFIED              └─── [substantive edit] ──┐
              │                     │                                             │
UNVERIFIED ───┼─────────────────────┼─────────────────────────────────────────────┴──► UNVERIFIED
              │                     │
              └─── [rejectQuote] ───┴──► REJECTED (Terminal state, preserved for audit)
```

#### Quote Guard Rules:
1. **Separation of Concerns:** `verifyQuote !== approveQuote`. Verification confirms the source recording is genuine and accurate. Approval authorizes its journalistic inclusion.
2. **Direct Quote Provenance:** Every `DIRECT` quote requires an authoritative `source_id` in the same project.
3. **Approval Gate:** Quotes cannot be approved unless already `VERIFIED` and never `REJECTED`.
4. **Substantive Edit Invalidation:** Any mutation to `quote_text`, `quote_type`, `source_id`, or `person_id` resets `verification_status = "UNVERIFIED"` and `approved_for_publication = false`.
5. **No Client Bypass:** Attempts by clients to pass `approved: true` or `status: "APPROVED"` directly in payload are discarded server-side.

### 8.3 Event Chronology & Ordering
1. **Deterministic Ordering:** Events are ordered by `sequence ASC`, then `event_time ASC`, then `created_at ASC`.
2. **Deterministic Sequence:** Events receive sequential order (1, 2, 3...) upon creation.
3. **Reordering Support:** `reorderEvents` allows editors to adjust the narrative flow deterministically without modifying database row order.

---

## 9. Project Lifecycle & Sequential State Machine

REPORTER AI enforces a strict 12-stage sequential state machine. Stage transitions are validated server-side to guarantee that editorial gates cannot be skipped or bypassed.

### 9.1 Canonical Stages
```text
Stage 01: FORM        → Reporting intake form & initial metadata
Stage 02: FACTS       → Granular fact repository & evidence records (Alias: SOURCES)
Stage 03: AUDIT       → Fact audit, verification & conflict resolution (Alias: FACT_AUDIT)
Stage 04: VALUE       → News value matrix evaluation (Alias: NEWS_VALUE)
Stage 05: ANGLE       → Journalistic angle candidate & selection
Stage 06: STRUCTURE   → Inverted pyramid outline & lead planning
Stage 07: DRAFT       → Draft V1 evidence-bounded synthesis (Alias: DRAFT_V1)
Stage 08: EDIT        → 7-criteria journalistic audit (Alias: EDITORIAL_CHECK)
Stage 09: REVISION    → Draft V2 revision addressing editorial findings (Alias: DRAFT_V2)
Stage 10: SEO         → Meta titles, slugs, and keywords
Stage 11: PACKAGE     → Master package assembly (Alias: MASTER_NEWS_PACKAGE)
Stage 12: PUBLISH     → 12-check publication gate (Alias: PUBLICATION)
```

---

## 10. Roadmap & Intentionally Deferred Services

The following domain business services will be implemented in subsequent development steps:
- **NewsValueService:** `analyzeNewsValue`, `getNewsValue`, `saveNewsValue`
- **AngleService:** `generateAngles`, `getAngles`, `saveAngles`, `selectAngle`
- **StructureService:** `generateStructure`, `getStructure`, `saveStructure`, `approveStructure`
- **DraftService:** `generateDraftV1`, `getDraft`, `getDrafts`, `createDraftV2`, `approveDraft`, `setFinalDraft`
- **EditorialService:** `runEditorialCheck`, `getEditorialCheck`, `resolveEditorialIssue`, `approveEditorial`
- **SEOService:** `generateSEO`, `getSEO`, `updateSEO`, `approveSEO`
- **MediaService:** `uploadMedia`, `getMedia`, `updateMedia`, `deleteMedia`, `setFeaturedMedia`, `generateCaption`
- **PublicationService:** `createPublication`, `getPublication`, `markPublished`, `unpublish`, `archivePublication`
- **AIService & DriveService:** Server-side Gemini prompting and Google Drive storage integration


