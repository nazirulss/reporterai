# REPORTER AI — Editorial Engine & State Machine

**Version:** 1.0 (Foundation Milestone)  
**Core Principles:** Fact First • No Fabrication • Quote Integrity • Human in the Loop • Centralized Invalidation  

---

## 1. Editorial State Machine

### 1.1 Fact Lifecycle
```text
UNVERIFIED
    ├─── [verifyFact] ───► VERIFIED (Human verified with source ref)
    ├─── [rejectFact] ───► REJECTED
    └─── [conflict detected] ──► CONFLICT
```
> [!CRITICAL]
> `CONFLICT` is never considered verified and hard-blocks Draft generation. Resolving a conflict requires explicit human selection of the verified value.

### 1.2 Quote Lifecycle
```text
UNVERIFIED
    ├─── [verifyQuote] ───► VERIFIED
    │                           │
    │                           └─── [approveQuote] ───► APPROVED (Eligible for publication)
    └─── [rejectQuote] ───► REJECTED
```
> [!IMPORTANT]
> `verifyQuote !== approveQuote`. Verification confirms fidelity to the recorded source. Approval explicitly authorizes publication. For `DIRECT` quotes, a valid `source_id` is mandatory before approval.

### 1.3 Structure Outline Lifecycle
```text
[generateStructure] ───► GENERATED / UNDER_REVIEW ───► [approveStructure] ───► APPROVED
```
> [!NOTE]
> AI structure generation does not auto-approve. Human review and sign-off is mandatory before drafting.

### 1.4 Draft Lifecycle & Versioning
```text
Draft V1 (Synthesized from verified facts)
    └─── Status: UNDER_REVIEW
             │
             ▼
Editorial Check (Audit against 7 journalistic criteria)
             │
             ▼
Draft V2 (Human revision addressing findings)
    └─── Status: UNDER_REVIEW
             │
             ├─── [approveDraft] ───► APPROVED
             │                           │
             │                           └─── [setFinalDraft] ───► FINAL
```
> [!IMPORTANT]
> `approveDraft !== setFinalDraft`. Approval accepts the content; finalization locks the version as the definitive master record for publication.

### 1.5 SEO Metadata Lifecycle
```text
[generateSEO] ───► GENERATED / UNDER_REVIEW ───► [approveSEO] ───► APPROVED
```

---

## 2. Evidence-Bounded AI (No Fabrication)

REPORTER AI enforces strict mathematical bounds on generative text. The AI draft generator is supplied strictly with:
1. `VERIFIED` facts from the Fact Sheet
2. `APPROVED` quotes with speaker attribution
3. The human-selected angle
4. The human-approved structure outline
5. Verified people and chronology

### Prohibited AI Behavior
- Fabricating locations, dates, timestamps, or attendee numbers.
- Inventing quotations, sentiments, or unattributed reactions.
- Using silent placeholder values (e.g. `"Kabupaten Contoh"`, `"2026-09-20"`). If an essential fact is missing, the engine emits an **Evidence Gap** and stops.

---

## 3. Angle Evidence Gate

Every candidate journalistic angle specifies an array of `supporting_facts`:
```json
{
  "angle_id": "DEMO-ANG-000001",
  "angle_title": "Ruang Baca Baru di Balai Desa",
  "supporting_facts": ["DEMO-FACT-000001", "DEMO-FACT-000004", "DEMO-FACT-000006"]
}
```
Before `generateDraftV1` can execute:
- All fact IDs in `supporting_facts` must exist.
- Each supporting fact must have `verification_status === "VERIFIED"`.
- If any fact is `UNVERIFIED`, `CONFLICT`, `REJECTED`, or `MISSING`, drafting is blocked with an explicit error.

---

## 4. Centralized Editorial Invalidation

An approved editorial review is not permanent. If any material mutation occurs to project facts, quotes, people, events, angle, structure, or draft text, the system invokes:

```javascript
EditorialGuards.invalidateEditorialCheck(reason);
```

This immediately sets `editorialCheck.overall_status = "STALE"` (or `"RECHECK_REQUIRED"`), preventing stale approvals from passing the publication gate.

---

## 5. 12-Check Publication Gate

The publication gate evaluates 12 explicit checks before an article can be marked as published:

| # | Check Key | Description | Criteria |
|---|---|---|---|
| 01 | `FINAL_DRAFT` | Master draft exists and is finalized | `draft.status === "FINAL"` |
| 02 | `EDITORIAL_PASS` | Editorial review is active and passed | `editorialCheck.overall_status === "PASS"` |
| 03 | `SEO_APPROVED` | SEO metadata is approved | `seo.approved === true` |
| 04 | `NO_FACT_CONFLICT` | Fact sheet is free of unresolved conflicts | Zero facts with `CONFLICT` |
| 05 | `NO_CRITICAL_EVIDENCE_GAP` | Core event facts exist and verified | Event name, date, and location verified |
| 06 | `ANGLE_EVIDENCE_VERIFIED` | Supporting facts for chosen angle are verified | All supporting facts `VERIFIED` |
| 07 | `NO_QUOTE_GUARD_VIOLATION` | Quote Guard rules satisfied | No direct quotes without sources |
| 08 | `USED_DIRECT_QUOTES_VERIFIED`| Quotes used in final draft have valid source | Used direct quotes have verified sources |
| 09 | `USED_QUOTES_APPROVED` | Quotes used in final draft are approved | Used quotes have `approved_for_publication` |
| 10 | `EDITORIAL_NOT_STALE` | Editorial check has not been invalidated | Check timestamp >= last mutation |
| 11 | `HUMAN_APPROVALS_COMPLETE` | Human signs-off recorded | Structure, Draft, and SEO approved |
| 12 | `PUBLICATION_STATE_VALID` | Project lifecycle is valid for publishing | Status is `ACTIVE`, not archived |

### Quote Scope Distinction
The publication gate inspects **quotes used in the final draft**, not unused project quotes. An unapproved quote that was discarded during drafting does not block publication of the final article.
