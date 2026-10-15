# REPORTER AI — API Contract Specification

**Version:** 1.0 (Foundation Milestone)  
**Protocol:** HTTP POST (JSON Payload via Google Apps Script Web App)  
**Content-Type:** `text/plain;charset=utf-8` (or `application/json`)  

---

## 1. Request & Response Envelope

### Standard Request Envelope
All API interactions use a single unified action-based dispatch pattern:

```json
{
  "action": "createProject",
  "payload": {
    "title": "Festival Literasi Desa Nusantara",
    "story_type": "EVENT",
    "category": "Masyarakat"
  }
}
```

### Standard Success Response Envelope
```json
{
  "success": true,
  "data": {
    "project_id": "NEWS-2026-0001",
    "title": "Festival Literasi Desa Nusantara"
  },
  "meta": {
    "timestamp": "2026-09-28T14:30:00.000Z",
    "mode": "LIVE"
  }
}
```

### Standard Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "QUOTE_GUARD_VIOLATION",
    "message": "Direct quote requires a valid source_id and verified status before approval."
  },
  "meta": {
    "timestamp": "2026-09-28T14:30:00.000Z"
  }
}
```

---

## 2. Comprehensive Action Registry

### 2.1 Project Actions
- `createProject`: Initialize a new news project with metadata.
- `getProject`: Retrieve full project aggregate (project, sources, facts, people, quotes, drafts, SEO).
- `listProjects`: Retrieve all active and archived projects.
- `updateProject`: Update project title, date, location, category, or notes.
- `archiveProject`: Archive a project.
- `changeProjectStage`: Advance or navigate to a specific pipeline stage (`FORM`, `FACTS`, `AUDIT`, etc.).

### 2.2 Source Actions
- `createSource`: Register a source (Observation, Interview transcript, Official Document, Press Release).
- `getSources`: Retrieve all sources tied to a project.
- `updateSource`: Modify source details or reliability rating.
- `deleteSource`: Remove a source (checks for attached facts/quotes before deletion).

### 2.3 Fact Actions
- `createFact`: Record a factual claim (Event Name, Date, Time, Location, Attendance, Purpose, etc.).
- `saveFacts`: Bulk upsert facts for a project.
- `getFacts`: Retrieve all facts for a project.
- `updateFact`: Edit fact text, value, or confidence level.
- `verifyFact`: Mark a fact as `VERIFIED` with human editor attribution and timestamp.
- `rejectFact`: Mark a fact as `REJECTED`.
- `analyzeFacts`: Trigger server-side AI evaluation of factual consistency, finding contradictions and evidence gaps.

### 2.4 People Actions
- `createPerson`: Register a person/source mentioned in coverage.
- `getPeople`: Retrieve all people tied to a project.
- `updatePerson`: Update person details (role, affiliation, bio).
- `verifyPerson`: Mark person identity as verified.

### 2.5 Quote Actions
- `createQuote`: Record a quote with speaker, type (`DIRECT` or `PARAPHRASE`), and optional source.
- `getQuotes`: Retrieve all quotes for a project.
- `updateQuote`: Update quote text or speaker attribution.
- `verifyQuote`: Mark quote as verified against source records.
- `approveQuote`: Approve quote for publication (strict Quote Guard: DIRECT quotes require valid `source_id` and `VERIFIED` status).
- `rejectQuote`: Reject a quote.

### 2.6 Event Actions (Chronology)
- `createEvent`: Record a chronological agenda event.
- `getEvents`: Retrieve chronology events.
- `saveEvents`: Bulk save chronology list.
- `updateEvent`: Edit time, activity, or description.
- `reorderEvents`: Update sequence order of chronological events.

### 2.7 News Value Actions
- `analyzeNewsValue`: Trigger server-side AI calculation of 7 news value metrics (Magnitude, Proximity, Prominence, Human Interest, Novelty, Continuity, Conflict).
- `getNewsValue`: Retrieve news value matrix and editorial analysis.
- `saveNewsValue`: Save human adjustments to news values.

### 2.8 Angle Actions
- `generateAngles`: AI proposes 2-4 candidate journalistic angles based strictly on verified facts.
- `getAngles`: Retrieve candidate angles.
- `saveAngles`: Save custom or edited angles.
- `selectAngle`: Select the active news angle for drafting (validates that supporting facts are verified).

### 2.9 Structure Actions
- `generateStructure`: AI proposes inverted pyramid outline (Lead, Nut Graph, Body, Closing) for the selected angle (initial status: `UNDER_REVIEW`).
- `getStructure`: Retrieve current structure outline.
- `saveStructure`: Update outline sections.
- `approveStructure`: Human editor approves structure for drafting (`APPROVED`).

### 2.10 Draft Actions
- `generateDraftV1`: AI synthesizes initial draft using exclusively verified facts, approved quotes, selected angle, and approved structure.
- `getDraft`: Retrieve a specific draft by `draft_id`.
- `getDrafts`: Retrieve version history of drafts (`V1`, `V2`, etc.).
- `createDraftV2`: Human editor or AI creates second revision addressing editorial findings (status: `UNDER_REVIEW`).
- `approveDraft`: Human editor approves draft (`APPROVED`).
- `setFinalDraft`: Explicit action marking approved draft as `FINAL` for publication.

### 2.11 Editorial Actions
- `runEditorialCheck`: Server-side audit of draft text against 7 criteria (Accuracy, Structure, Quote Integrity, Unsupported Claims, Redundancy, Language, Promotional Tone).
- `getEditorialCheck`: Retrieve current editorial check results and status (`PASS`, `WARNING`, `BLOCKED`, `STALE`).
- `resolveEditorialIssue`: Resolve a specific flagged editorial issue.
- `approveEditorial`: Editorial sign-off on compliance.

### 2.12 SEO Actions
- `generateSEO`: AI generates SEO title, slug, focus keyword, meta description, and tags based on final draft.
- `getSEO`: Retrieve SEO metadata.
- `updateSEO`: Manually edit SEO fields.
- `approveSEO`: Mark SEO metadata as `APPROVED` for publication.

### 2.13 Media Actions
- `uploadMedia`: Record uploaded photo/audio/video file reference.
- `getMedia`: Retrieve media gallery for project.
- `updateMedia`: Update caption, alt text, or sort order.
- `deleteMedia`: Remove media record.
- `setFeaturedMedia`: Designate primary photo/video for article header.
- `generateCaption`: AI proposes caption based on verified facts and image metadata.

### 2.14 Master Package & Publication Actions
- `getMasterPackage`: Retrieve compiled final package (Final Draft, Approved SEO, Featured Media, Social Broadcast Copies).
- `createPublication`: Record pending publication.
- `getPublication`: Retrieve publication records.
- `markPublished`: Execute 12-check publication gate and record live publication.
- `unpublish`: Revert published status.
- `archivePublication`: Archive publication history.

### 2.15 System Actions
- `getSettings`: Retrieve system settings and newsroom config.
- `healthCheck`: Check status of backend, Google Spreadsheet database, Google Drive, and Gemini API.
