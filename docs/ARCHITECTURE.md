# REPORTER AI — Architecture Blueprint

**Version:** 1.0 (Foundation Milestone)  
**System:** AI News Production & Editorial System  
**Environment:** Antigravity / Vanilla HTML5, CSS3, JavaScript (ES2022) / Google Apps Script Backend  

---

## 1. Executive Summary

REPORTER AI is an institutional-grade, evidence-bounded newsroom production workspace designed to transform raw field coverage into verified, publication-grade journalistic articles. 

Unlike generic "AI article writers" or chatbot wrappers, REPORTER AI enforces rigorous journalistic gates:
- **Fact First:** AI operates strictly on evidence supplied and verified by human reporters and editors.
- **No Silent Auto-Approval:** Every critical transition (fact verification, quote authorization, outline structure, draft finalization, SEO metadata) requires explicit human action.
- **Quote Integrity:** Direct quotations must be tied to verified sources and human-authorized before being allowed into publication.
- **Auditability & Versioning:** All iterations (Draft V1, Draft V2, Final) are stored as distinct immutable records without overwriting.

---

## 2. High-Level System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          BROWSER CLIENT (index.html)                    │
│                                                                         │
│  ┌──────────────┐  ┌─────────────────────────────────────────────────┐  │
│  │ Newsroom Nav │  │ 12-Stage Editorial Pipeline                     │  │
│  │ & Dashboard  │  │ Form → Facts → Audit → Value → Angle →          │  │
│  │              │  │ Structure → Draft V1 → Editorial → Draft V2/     │  │
│  │              │  │ Final → SEO → Master Package → Publication      │  │
│  └──────────────┘  └─────────────────────────────────────────────────┘  │
│                                      │                                  │
│             ┌────────────────────────┴────────────────────────┐         │
│             │   Editorial Engine & Guards (Client-Side)       │         │
│             │   - Fact Verification & Conflict Blocker        │         │
│             │   - Quote Guard (Direct vs Paraphrase)          │         │
│             │   - Angle Evidence Gate                         │         │
│             │   - Centralized Editorial Invalidation          │         │
│             │   - 12-Check Explicit Publication Gate          │         │
│             └────────────────────────┬────────────────────────┘         │
│                                      │                                  │
│             ┌────────────────────────┴────────────────────────┐         │
│             │   API Client Abstraction Layer                  │         │
│             │   - Unified action-based request dispatcher     │         │
│             └───────────┬───────────────────────────┬─────────┘         │
└─────────────────────────┼───────────────────────────┼───────────────────┘
                          │ (Demo Mode)               │ (Live API Mode)
                          ▼                           ▼
              ┌───────────────────────┐   ┌───────────────────────────────┐
              │ DemoService (Mock)    │   │ Google Apps Script Web App    │
              │ - Synthetic Datasets  │   │ (Backend Orchestrator)        │
              │ - Simulated Latency   │   └───────────────┬───────────────┘
              │ - Full Guard Parity   │                   │
              └───────────────────────┘                   ▼
                                          ┌───────────────────────────────┐
                                          │ Google Spreadsheet (Database) │
                                          │ Google Drive (Media/Files)    │
                                          │ Gemini API (Server-Side Only) │
                                          └───────────────────────────────┘
```

---

## 3. Frontend Architecture (Inside `index.html`)

The frontend is strictly maintained as a zero-build, dependency-free single file (`index.html`) utilizing standard web technologies with logical separation of concerns within `<script>`:

```text
1. CONFIG                 → Configuration constants, Demo flag, endpoints, timeouts
2. APP STATE              → Reactive central state store (current project, stage, entities)
3. DATA TYPES & SHAPES    → Canonical data schemas and type contracts
4. DEMO DATA              → Synthetic fixtures ("Festival Literasi Desa Nusantara")
5. API SERVICE            → Transparent action-based HTTP client to Apps Script
6. DEMO SERVICE           → Offline simulation engine with exact backend guard parity
7. VALIDATORS             → Input shape, regex, and integrity validation functions
8. EDITORIAL GUARDS       → Domain integrity engines (Fact, Quote, Conflict, Invalidation)
9. BUSINESS LOGIC         → Evidence-bounded draft synthesizer, coverage calculator, etc.
10. UI COMPONENTS         → Modals, Toast notifications, AI overlays, status badges
11. SCREEN RENDERERS      → Screen renderers (Dashboard, Projects, Workspace Stages 01-12)
12. ROUTER                → Client-side hash router with stage authorization
13. EVENT HANDLERS        → Form submissions, user actions, modal triggers
14. BOOTSTRAP             → Synthetic initialization, DOM event listeners, startup routine
```

---

## 4. Key Design Patterns & Guarantees

### 4.1 Zero API Credentials in Client
No Gemini API key, Google Service Account, or database secrets are ever present in `index.html`. All AI prompts and database mutations run server-side within Google Apps Script.

### 4.2 Evidence-Bounded AI (No Fabrication)
The drafting engine synthesizes content strictly from:
- `VERIFIED` facts
- `APPROVED` quotes
- Selected news angle
- Approved structure outline
- `VERIFIED` people and chronological events

If any mandatory factual element is missing, an explicit **Evidence Gap** is triggered and downstream generation is blocked. No synthetic fallback values (e.g. dummy city or date) are ever injected silently.

### 4.3 Centralized Editorial Invalidation
When an article passes Editorial Check (`overall_status === "PASS"`), any subsequent modification to facts, quotes, people, events, angle, structure, or draft immediately triggers:
```javascript
EditorialGuards.invalidateEditorialCheck("Material mutation of verified facts");
```
This resets the editorial check status to `STALE` / `RECHECK_REQUIRED`, preventing stale approvals from passing the publication gate.

### 4.4 12-Check Publication Gate
Publishing an article requires passing all 12 explicit checks in `EditorialGuards.checkPublicationGate()`:
1. `FINAL_DRAFT`: Draft must be explicitly marked as FINAL.
2. `EDITORIAL_PASS`: Editorial check must be current and PASS.
3. `SEO_APPROVED`: SEO metadata must be reviewed and approved.
4. `NO_FACT_CONFLICT`: No unresolved fact conflicts in the project.
5. `NO_CRITICAL_EVIDENCE_GAP`: All required event fields (name, date, location) verified.
6. `ANGLE_EVIDENCE_VERIFIED`: All supporting facts for the chosen angle are VERIFIED.
7. `NO_QUOTE_GUARD_VIOLATION`: No unverified direct quotes used.
8. `USED_DIRECT_QUOTES_VERIFIED`: Direct quotes actually in the final draft have valid source IDs.
9. `USED_QUOTES_APPROVED`: Direct quotes in the draft have explicit human approval.
10. `EDITORIAL_NOT_STALE`: Editorial review has not been invalidated by subsequent edits.
11. `HUMAN_APPROVALS_COMPLETE`: Structure, draft, and SEO approved by human editor.
12. `PUBLICATION_STATE_VALID`: Project is in an active, publishable state.
