# REPORTER AI — Database Schema Specification

**Version:** 1.0 (Foundation Milestone)  
**Database:** Google Spreadsheet (`REPORTER_AI_DATABASE`)  
**Storage:** Google Drive (`REPORTER_AI/PROJECTS/{project_id}/`)  

---

## 1. Sheet Registry (17 Sheets)

The structured database comprises 17 sheets:

```text
1.  NEWS_PROJECTS       → Master project headers and stage tracking
2.  SOURCES             → Source records, observation logs, and file links
3.  FACTS               → Granular extracted facts and verification statuses
4.  PEOPLE              → Figures, interviewees, and officials
5.  QUOTES              → Direct quotations and paraphrases with Quote Guard flags
6.  EVENTS              → Chronological timeline and itinerary items
7.  NEWS_VALUES         → News value evaluations and editorial matrix
8.  ANGLES              → Candidate and selected journalistic angles
9.  STRUCTURES          → Inverted pyramid outlines and section plans
10. DRAFTS              → Article versions (V1, V2, Final) with full text
11. EDITORIAL_CHECKS    → Journalistic compliance audits and flagged issues
12. SEO                 → Meta titles, slugs, keywords, descriptions, and tags
13. MEDIA               → Photos, audio, and documents stored in Drive
14. PUBLICATIONS        → Distribution platforms, publication URLs, and logs
15. USERS               → Newsroom staff (Reporters, Editors, Admins)
16. SETTINGS            → System configuration, prompts, and defaults
17. AUDIT_LOGS          → Immutable chronological audit trail of all mutations
```

---

## 2. Detailed Table Schemas

### 2.1 `NEWS_PROJECTS`
| Column | Type | Description |
|---|---|---|
| `project_id` | STRING (PK) | e.g. `NEWS-2026-0001` |
| `title` | STRING | Story title / event headline |
| `slug` | STRING | URL slug |
| `story_type` | STRING | `EVENT`, `NEWS`, `FEATURE`, `INVESTIGATION`, `INTERVIEW` |
| `category` | STRING | e.g. `Masyarakat`, `Pendidikan` |
| `event_date` | DATE | Event date (`YYYY-MM-DD`) |
| `event_time` | STRING | e.g. `09.00–12.30 WIB` |
| `location` | STRING | Physical venue and address |
| `organization`| STRING | Host institution / organizer |
| `reporter_id` | STRING (FK) | Reporter user ID |
| `editor_id` | STRING (FK) | Assigned editor user ID |
| `status` | STRING | `ACTIVE`, `PUBLISHED`, `ARCHIVED` |
| `current_stage`| STRING | `FORM`, `FACTS`, `AUDIT`, `VALUE`, `ANGLE`, `STRUCTURE`, `DRAFT`, `EDIT`, `SEO`, `PACKAGE`, `PUBLISHED` |
| `selected_angle_id`| STRING (FK)| ID of selected angle |
| `final_draft_id` | STRING (FK)| ID of final master draft |
| `created_at` | TIMESTAMP | ISO 8601 |
| `updated_at` | TIMESTAMP | ISO 8601 |

### 2.2 `SOURCES`
| Column | Type | Description |
|---|---|---|
| `source_id` | STRING (PK) | e.g. `SRC-000001` |
| `project_id` | STRING (FK) | News project ID |
| `source_type` | STRING | `OBSERVATION`, `INTERVIEW`, `DOCUMENT`, `PRESS_RELEASE`, `MEDIA` |
| `title` | STRING | Short title of source material |
| `description` | TEXT | Description of contents |
| `source_person` | STRING | Name of interviewee or issuer |
| `source_date` | TIMESTAMP | Date of observation / interview |
| `file_id` | STRING | Google Drive file ID |
| `file_url` | STRING | Google Drive preview/download URL |
| `raw_text` | TEXT | Raw notes or interview excerpt |
| `reliability` | STRING | `HIGH`, `MEDIUM`, `LOW` |
| `created_at` | TIMESTAMP | ISO 8601 |

### 2.3 `FACTS`
| Column | Type | Description |
|---|---|---|
| `fact_id` | STRING (PK) | e.g. `FACT-000001` |
| `project_id` | STRING (FK) | News project ID |
| `source_id` | STRING (FK) | Originating source ID |
| `fact_type` | STRING | `EVENT_NAME`, `DATE`, `TIME`, `LOCATION`, `ORGANIZATION`, `ATTENDANCE`, `PURPOSE`, `QUOTE`, `CHRONOLOGY`, `STATISTIC`, `OTHER` |
| `fact_text` | TEXT | Comprehensive statement of fact |
| `value` | STRING | Extracted canonical value |
| `confidence` | STRING | `HIGH`, `MEDIUM`, `LOW` |
| `verification_status`| STRING | `UNVERIFIED`, `VERIFIED`, `CONFLICT`, `REJECTED` |
| `verified_by` | STRING (FK) | User ID who verified |
| `verified_at` | TIMESTAMP | Verification timestamp |
| `notes` | TEXT | Editor comments / conflict notes |

### 2.4 `QUOTES`
| Column | Type | Description |
|---|---|---|
| `quote_id` | STRING (PK) | e.g. `QUO-000001` |
| `project_id` | STRING (FK) | News project ID |
| `person_id` | STRING (FK) | Person ID of speaker |
| `source_id` | STRING (FK) | Mandatory for `DIRECT` quotes |
| `quote_text` | TEXT | Verbatim or paraphrased text |
| `quote_type` | STRING | `DIRECT`, `PARAPHRASE` |
| `verification_status`| STRING | `UNVERIFIED`, `VERIFIED`, `REJECTED` |
| `approved_for_publication`| BOOLEAN| `true` only if verified by human |
| `notes` | TEXT | Quote notes |

### 2.5 `DRAFTS`
| Column | Type | Description |
|---|---|---|
| `draft_id` | STRING (PK) | e.g. `DRF-000001` |
| `project_id` | STRING (FK) | News project ID |
| `version` | STRING | `V1`, `V2`, `V3` |
| `title` | STRING | Article headline |
| `content` | TEXT | Full article body |
| `source_angle_id`| STRING (FK)| Reference angle |
| `status` | STRING | `UNDER_REVIEW`, `APPROVED`, `FINAL` |
| `created_by` | STRING | Generator / editor |
| `parent_draft_id`| STRING (FK)| Preceding draft version |
| `created_at` | TIMESTAMP | Creation timestamp |
