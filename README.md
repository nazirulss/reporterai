# REPORTER AI — AI News Production & Editorial System

**Version:** Foundation v1.0  
**Frontend:** `index.html` (Zero Build, Vanilla HTML5 / CSS3 / JavaScript ES2022)  
**Backend:** Google Apps Script Web App  
**Database:** Google Spreadsheet  
**Storage:** Google Drive  
**AI Engine:** Gemini API (Server-Side Proxy via Google Apps Script)  

---

## 1. Project Concept

REPORTER AI is an institutional-grade, evidence-bounded newsroom workspace engineered to assist reporters, editors, and media organizations in converting raw field materials into verified, balanced, and publishable news.

### Core Principles
1. **FACT FIRST:** AI operates strictly on evidence supplied and verified by humans.
2. **NO FABRICATION:** Missing information triggers an explicit evidence gap; no synthetic fallback values are fabricated.
3. **QUOTE INTEGRITY:** Direct quotations require verified sources and explicit human approval.
4. **HUMAN-IN-THE-LOOP:** AI suggests, humans decide and authorize every milestone.
5. **AUDITABILITY:** Full traceability from fact sheet and audio notes to the published article.
6. **VERSION CONTROL:** Draft versions (V1, V2, Final) are preserved immutably.
7. **EVIDENCE-BOUNDED AI:** Text synthesis is constrained solely to verified facts and approved quotes.
8. **NO SILENT AUTO-APPROVAL:** No automated verification, approval, or publication.

---

## 2. Directory Structure

```text
REPORTER_AI/
│
├── index.html                   # Primary Single-File Frontend Workspace
├── README.md                    # Project Overview and Quickstart
│
├── docs/
│   ├── ARCHITECTURE.md          # End-to-end System Architecture & Data Flow
│   ├── API_CONTRACT.md          # Action-based API Request/Response Specification
│   ├── EDITORIAL_ENGINE.md      # State Machine, Guards, Invalidation, & 12 Publication Checks
│   └── DATABASE_SCHEMA.md       # Google Spreadsheet 17-sheet schema
│
└── backend/
    └── apps-script/
        └── README.md            # Google Apps Script Setup & Deployment Guide
```

---

## 3. Getting Started

### Running the Frontend
`index.html` is 100% self-contained and requires **no build step**, **no Node.js**, and **no framework installation**.
Simply double-click or open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari).

### Operating Modes
- **DEMO MODE (Default):** Runs completely offline using synthetic test data (`Festival Literasi Desa Nusantara`). Perfect for exploring the newsroom pipeline, testing fact verification, simulating conflict resolution, and verifying Quote Guard.
- **LIVE MODE:** Point `CONFIG.API_BASE_URL` in the Settings panel to your deployed Google Apps Script Web App URL to interact with Google Spreadsheets and the server-side Gemini AI.
