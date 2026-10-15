# REPORTER AI — Database Blueprint v0.1

**Status:** Prototype Foundation  
**Version:** v0.1  
**Tanggal:** 28 September 2026  
**Frontend:** `index.html`  
**Backend:** Google Apps Script  
**Database:** Google Spreadsheet  
**Storage:** Google Drive  
**AI Provider Prototype:** Gemini API

---

## 1. Tujuan

Database Blueprint ini menjadi fondasi data untuk **REPORTER AI — News Production System**.

Workflow utama:

```text
NEWS PROJECT
    ↓
REPORTER FORM
    ↓
FACT SHEET
    ↓
FACT AUDIT
    ↓
NEWS VALUE
    ↓
ANGLE
    ↓
STRUCTURE
    ↓
DRAFT V1
    ↓
EDITORIAL CHECK
    ↓
DRAFT V2
    ↓
SEO
    ↓
MASTER NEWS PACKAGE
    ↓
PUBLISHED
```

Prinsip:

1. **Fact First** — AI bekerja berdasarkan fakta yang tersedia.
2. **No Fabrication** — data yang tidak tersedia tidak boleh ditebak.
3. **Quote Integrity** — kutipan langsung harus memiliki sumber.
4. **Human in the Loop** — reporter/editor tetap memegang kontrol.
5. **Auditability** — sumber dan perubahan dapat ditelusuri.
6. **Versioning** — draft tidak ditimpa.

---

## 2. Arsitektur Database

```text
REPORTER AI
│
├── NEWS_PROJECTS
├── SOURCES
├── FACTS
├── PEOPLE
├── QUOTES
├── EVENTS
├── NEWS_VALUES
├── ANGLES
├── STRUCTURES
├── DRAFTS
├── EDITORIAL_CHECKS
├── SEO
├── MEDIA
├── PUBLICATIONS
├── USERS
├── SETTINGS
└── AUDIT_LOGS
```

Google Spreadsheet = structured database.  
Google Drive = file storage.

---

## 3. Naming Convention

### Spreadsheet

`REPORTER_AI_DATABASE`

### Google Drive Root

`REPORTER_AI`

### Project Folder

`NEWS-{YYYY}-{NNNN}`

Contoh:

`NEWS-2026-0001`

### Record IDs

```text
NEWS-2026-0001
FACT-000001
SRC-000001
PERS-000001
QUO-000001
EVT-000001
VAL-000001
ANG-000001
STR-000001
DRF-000001
EDT-000001
SEO-000001
MED-000001
PUB-000001
USR-000001
LOG-000001
```

---

# 4. Sheet: NEWS_PROJECTS

**Tujuan:** identitas utama proyek berita.

| Field | Type | Required | Description |
|---|---|---:|---|
| project_id | TEXT | YES | Primary ID |
| created_at | DATETIME | YES | Waktu dibuat |
| updated_at | DATETIME | YES | Waktu diperbarui |
| title | TEXT | YES | Judul sementara |
| slug | TEXT | NO | Slug |
| story_type | ENUM | YES | Jenis berita |
| category | TEXT | NO | Kategori |
| event_date | DATE | NO | Tanggal peristiwa |
| event_time | TEXT | NO | Waktu peristiwa |
| location | TEXT | NO | Lokasi |
| organization | TEXT | NO | Organisasi |
| reporter_id | TEXT | YES | ID reporter |
| editor_id | TEXT | NO | ID editor |
| status | ENUM | YES | Status proyek |
| current_stage | ENUM | YES | Tahap aktif |
| selected_angle_id | TEXT | NO | Angle terpilih |
| featured_media_id | TEXT | NO | Media utama |
| final_draft_id | TEXT | NO | Draft final |
| notes | LONGTEXT | NO | Catatan |

### Story Type

```text
EVENT
NEWS
FEATURE
INTERVIEW
PROFILE
ANNOUNCEMENT
REPORT
OTHER
```

### Project Status

```text
DRAFT
ACTIVE
NEEDS_REVIEW
READY
PUBLISHED
ARCHIVED
CANCELLED
```

### Current Stage

```text
FORM
FACTS
FACT_AUDIT
NEWS_VALUE
ANGLE
STRUCTURE
DRAFT_V1
EDITORIAL
DRAFT_V2
SEO
PACKAGE
PUBLISHED
```

---

# 5. Sheet: SOURCES

**Tujuan:** sumber asal informasi.

| Field | Type | Required |
|---|---|---:|
| source_id | TEXT | YES |
| project_id | TEXT | YES |
| source_type | ENUM | YES |
| title | TEXT | NO |
| description | LONGTEXT | NO |
| source_person | TEXT | NO |
| source_date | DATETIME | NO |
| file_id | TEXT | NO |
| file_url | URL | NO |
| raw_text | LONGTEXT | NO |
| reliability | ENUM | YES |
| created_at | DATETIME | YES |

### Source Type

```text
REPORTER_NOTE
INTERVIEW
AUDIO
VIDEO
PHOTO
DOCUMENT
POSTER
PRESS_RELEASE
OBSERVATION
EXTERNAL_SOURCE
OTHER
```

### Reliability

```text
HIGH
MEDIUM
LOW
UNKNOWN
```

---

# 6. Sheet: FACTS

**Tujuan:** pusat fakta terstruktur. Satu fakta = satu record.

| Field | Type | Required |
|---|---|---:|
| fact_id | TEXT | YES |
| project_id | TEXT | YES |
| source_id | TEXT | YES |
| fact_type | ENUM | YES |
| fact_text | LONGTEXT | YES |
| value | TEXT | NO |
| confidence | ENUM | YES |
| verification_status | ENUM | YES |
| verified_by | TEXT | NO |
| verified_at | DATETIME | NO |
| notes | LONGTEXT | NO |
| created_at | DATETIME | YES |
| updated_at | DATETIME | YES |

### Fact Type

```text
EVENT_NAME
DATE
TIME
LOCATION
ORGANIZER
THEME
ATTENDANCE
PERSON
ROLE
ORGANIZATION
SEQUENCE
ACHIEVEMENT
STATISTIC
BACKGROUND
PURPOSE
QUOTE_CONTEXT
HUMAN_INTEREST
VISUAL
OTHER
```

### Confidence

```text
HIGH
MEDIUM
LOW
UNKNOWN
```

### Verification Status

```text
UNVERIFIED
VERIFIED
CONFLICT
REJECTED
NEEDS_SOURCE
```

---

# 7. Sheet: PEOPLE

**Tujuan:** tokoh yang berkaitan dengan berita.

| Field | Type | Required |
|---|---|---:|
| person_id | TEXT | YES |
| project_id | TEXT | YES |
| name | TEXT | YES |
| role | TEXT | NO |
| organization | TEXT | NO |
| location | TEXT | NO |
| bio | LONGTEXT | NO |
| source_id | TEXT | NO |
| verification_status | ENUM | YES |
| notes | LONGTEXT | NO |
| created_at | DATETIME | YES |

---

# 8. Sheet: QUOTES

**Tujuan:** menjaga integritas kutipan.

| Field | Type | Required |
|---|---|---:|
| quote_id | TEXT | YES |
| project_id | TEXT | YES |
| person_id | TEXT | YES |
| source_id | TEXT | YES |
| quote_text | LONGTEXT | YES |
| quote_type | ENUM | YES |
| verification_status | ENUM | YES |
| approved_for_publication | BOOLEAN | YES |
| notes | LONGTEXT | NO |
| created_at | DATETIME | YES |

### Quote Type

```text
DIRECT
PARAPHRASE
EDITORIAL
```

### Quote Guard

- `DIRECT` wajib memiliki `source_id`.
- AI tidak boleh mengubah `PARAPHRASE` menjadi `DIRECT`.
- AI tidak boleh membuat kutipan langsung dari tema/ringkasan.
- Quote yang belum terverifikasi tidak boleh dipublikasikan sebagai kutipan langsung.

---

# 9. Sheet: EVENTS

**Tujuan:** kronologi/urutan kegiatan.

| Field | Type | Required |
|---|---|---:|
| event_id | TEXT | YES |
| project_id | TEXT | YES |
| source_id | TEXT | NO |
| sequence | INTEGER | YES |
| event_time | TEXT | NO |
| activity | TEXT | YES |
| description | LONGTEXT | NO |
| verification_status | ENUM | YES |
| created_at | DATETIME | YES |

---

# 10. Sheet: NEWS_VALUES

**Tujuan:** analisis nilai berita internal.

| Field | Type | Required |
|---|---|---:|
| value_id | TEXT | YES |
| project_id | TEXT | YES |
| magnitude | INTEGER | NO |
| proximity | INTEGER | NO |
| prominence | INTEGER | NO |
| human_interest | INTEGER | NO |
| novelty | INTEGER | NO |
| continuity | INTEGER | NO |
| conflict | INTEGER | NO |
| analysis | LONGTEXT | NO |
| generated_at | DATETIME | YES |
| reviewed_by | TEXT | NO |

Skala:

```text
1–5
```

Nilai ini adalah alat analisis editorial, bukan ranking kualitas berita.

---

# 11. Sheet: ANGLES

**Tujuan:** menyimpan alternatif sudut pemberitaan.

| Field | Type | Required |
|---|---|---:|
| angle_id | TEXT | YES |
| project_id | TEXT | YES |
| angle_title | TEXT | YES |
| angle_description | LONGTEXT | YES |
| supporting_facts | JSON | NO |
| risks | LONGTEXT | NO |
| selected | BOOLEAN | YES |
| selected_at | DATETIME | NO |
| created_at | DATETIME | YES |

---

# 12. Sheet: STRUCTURES

**Tujuan:** struktur berita sebelum drafting.

| Field | Type | Required |
|---|---|---:|
| structure_id | TEXT | YES |
| project_id | TEXT | YES |
| angle_id | TEXT | YES |
| lead_plan | LONGTEXT | YES |
| nut_graph | LONGTEXT | NO |
| body_plan | JSON | NO |
| closing_plan | LONGTEXT | NO |
| approved | BOOLEAN | YES |
| created_at | DATETIME | YES |

---

# 13. Sheet: DRAFTS

**Tujuan:** seluruh versi tulisan.

| Field | Type | Required |
|---|---|---:|
| draft_id | TEXT | YES |
| project_id | TEXT | YES |
| version | TEXT | YES |
| title | TEXT | NO |
| content | LONGTEXT | YES |
| source_angle_id | TEXT | NO |
| status | ENUM | YES |
| created_by | TEXT | YES |
| created_at | DATETIME | YES |
| parent_draft_id | TEXT | NO |
| editorial_notes | LONGTEXT | NO |

### Version

```text
V1
V2
FINAL
```

### Status

```text
DRAFT
UNDER_REVIEW
REVISION_REQUIRED
APPROVED
FINAL
```

Draft tidak di-overwrite.

---

# 14. Sheet: EDITORIAL_CHECKS

**Tujuan:** pemeriksaan editorial.

| Field | Type | Required |
|---|---|---:|
| check_id | TEXT | YES |
| project_id | TEXT | YES |
| draft_id | TEXT | YES |
| accuracy_status | ENUM | YES |
| structure_status | ENUM | YES |
| quote_integrity_status | ENUM | YES |
| unsupported_claim_status | ENUM | YES |
| redundancy_status | ENUM | YES |
| language_status | ENUM | YES |
| promotional_tone_status | ENUM | YES |
| issues | JSON | NO |
| recommendations | JSON | NO |
| overall_status | ENUM | YES |
| checked_at | DATETIME | YES |
| reviewed_by | TEXT | NO |

### Check Status

```text
PASS
WARNING
FAIL
NOT_CHECKED
```

### Overall Status

```text
PASS
NEEDS_REVISION
BLOCKED
```

---

# 15. Sheet: SEO

**Tujuan:** metadata SEO dari berita yang telah disetujui.

| Field | Type | Required |
|---|---|---:|
| seo_id | TEXT | YES |
| project_id | TEXT | YES |
| draft_id | TEXT | YES |
| seo_title | TEXT | YES |
| slug | TEXT | YES |
| focus_keyword | TEXT | YES |
| secondary_keywords | JSON | NO |
| meta_description | TEXT | YES |
| excerpt | LONGTEXT | NO |
| category | TEXT | NO |
| tags | JSON | NO |
| generated_at | DATETIME | YES |
| approved | BOOLEAN | YES |

---

# 16. Sheet: MEDIA

**Tujuan:** menghubungkan file Google Drive dengan proyek.

| Field | Type | Required |
|---|---|---:|
| media_id | TEXT | YES |
| project_id | TEXT | YES |
| source_id | TEXT | NO |
| file_id | TEXT | YES |
| file_name | TEXT | YES |
| file_url | URL | NO |
| media_type | ENUM | YES |
| caption | LONGTEXT | NO |
| alt_text | TEXT | NO |
| is_featured | BOOLEAN | YES |
| sort_order | INTEGER | NO |
| uploaded_at | DATETIME | YES |

### Media Type

```text
PHOTO
AUDIO
VIDEO
DOCUMENT
OTHER
```

---

# 17. Sheet: PUBLICATIONS

**Tujuan:** mencatat publikasi.

| Field | Type | Required |
|---|---|---:|
| publication_id | TEXT | YES |
| project_id | TEXT | YES |
| draft_id | TEXT | YES |
| published_title | TEXT | YES |
| published_url | URL | NO |
| platform | TEXT | YES |
| published_at | DATETIME | NO |
| published_by | TEXT | YES |
| status | ENUM | YES |
| notes | LONGTEXT | NO |

### Status

```text
DRAFT
SCHEDULED
PUBLISHED
UNPUBLISHED
ARCHIVED
```

---

# 18. Sheet: USERS

**Tujuan:** pengguna prototype.

| Field | Type | Required |
|---|---|---:|
| user_id | TEXT | YES |
| name | TEXT | YES |
| email | TEXT | YES |
| role | ENUM | YES |
| status | ENUM | YES |
| created_at | DATETIME | YES |
| last_login | DATETIME | NO |

### Role

```text
ADMIN
REPORTER
EDITOR
CHIEF_EDITOR
```

Prototype boleh dimulai dengan satu user/admin tanpa autentikasi kompleks.

---

# 19. Sheet: SETTINGS

| Field | Type | Required |
|---|---|---:|
| setting_key | TEXT | YES |
| setting_value | LONGTEXT | YES |
| description | TEXT | NO |
| updated_at | DATETIME | YES |

Contoh:

```text
APP_NAME = REPORTER AI
DEFAULT_LANGUAGE = id-ID
DEFAULT_STYLE = Jurnalistik Indonesia
DRIVE_ROOT_FOLDER = REPORTER_AI
```

API key tidak disimpan di sheet ini.

---

# 20. Sheet: AUDIT_LOGS

**Tujuan:** mencatat aktivitas penting.

| Field | Type | Required |
|---|---|---:|
| log_id | TEXT | YES |
| project_id | TEXT | NO |
| user_id | TEXT | NO |
| action | TEXT | YES |
| entity_type | TEXT | YES |
| entity_id | TEXT | NO |
| old_value | JSON | NO |
| new_value | JSON | NO |
| created_at | DATETIME | YES |

Contoh action:

```text
CREATE_PROJECT
UPDATE_PROJECT
CREATE_FACT
VERIFY_FACT
REJECT_FACT
CREATE_QUOTE
APPROVE_QUOTE
GENERATE_DRAFT
EDITORIAL_CHECK
APPROVE_DRAFT
GENERATE_SEO
UPLOAD_MEDIA
PUBLISH
```

---

# 21. Relational Map

```text
NEWS_PROJECTS
│
├── SOURCES
│     ├── FACTS
│     └── QUOTES
│
├── PEOPLE
│     └── QUOTES
│
├── EVENTS
├── NEWS_VALUES
│
├── ANGLES
│     └── STRUCTURES
│
├── DRAFTS
│     └── EDITORIAL_CHECKS
│
├── SEO
├── MEDIA
└── PUBLICATIONS
```

Relasi utama menggunakan `project_id`.

---

# 22. Google Drive Structure

```text
REPORTER_AI/
│
├── PROJECTS/
│   ├── NEWS-2026-0001/
│   │   ├── SOURCES/
│   │   ├── PHOTOS/
│   │   ├── AUDIO/
│   │   ├── VIDEO/
│   │   ├── DOCUMENTS/
│   │   └── EXPORTS/
│   │
│   └── NEWS-2026-0002/
│       ├── SOURCES/
│       ├── PHOTOS/
│       ├── AUDIO/
│       ├── VIDEO/
│       ├── DOCUMENTS/
│       └── EXPORTS/
│
└── SYSTEM/
    ├── TEMPLATES/
    └── EXPORTS/
```

Apps Script membuat folder proyek secara otomatis saat project dibuat.

---

# 23. Source-of-Truth Rules

- **SOURCES** = bukti/sumber asal.
- **FACTS** = fakta terstruktur.
- **QUOTES** = pernyataan narasumber.
- **DRAFTS** = produk editorial.
- **SEO** = metadata, bukan sumber fakta.
- **AI output** = tidak otomatis terverifikasi.

Alur:

```text
SOURCE
   ↓
FACT
   ↓
VERIFICATION
   ↓
EDITORIAL
   ↓
ARTICLE
```

---

# 24. AI Data Rules

AI hanya boleh menggunakan:

1. fakta berstatus `VERIFIED`;
2. fakta yang diizinkan digunakan;
3. quote dengan `approved_for_publication = TRUE`;
4. angle yang dipilih reporter/editor.

AI tidak boleh:

- mengarang nama;
- mengarang angka;
- mengarang kutipan;
- mengubah tanggal;
- mengubah lokasi;
- membuat atribusi yang tidak tersedia;
- menyatakan asumsi sebagai fakta.

---

# 25. Fact Conflict Rules

Jika ditemukan:

```text
FACT A: Time = 20.00–24.00
FACT B: Time = 20.00–23.00
```

maka:

```text
verification_status = CONFLICT
```

dan proyek:

```text
status = NEEDS_REVIEW
```

AI tidak boleh memilih salah satu secara otomatis.

---

# 26. Missing Data Rules

Jika data penting belum tersedia:

```text
verification_status = NEEDS_SOURCE
```

Output AI:

> Data belum tersedia.

Bukan mengisi berdasarkan tebakan.

---

# 27. Minimum Viable Database

### Phase 1

Wajib aktif:

```text
NEWS_PROJECTS
SOURCES
FACTS
PEOPLE
QUOTES
EVENTS
ANGLES
DRAFTS
EDITORIAL_CHECKS
SEO
MEDIA
SETTINGS
AUDIT_LOGS
```

### Phase 2

Aktifkan:

```text
NEWS_VALUES
STRUCTURES
PUBLICATIONS
USERS
```

Seluruh struktur sebaiknya tetap dibuat sejak awal agar kontrak database stabil.

---

# 28. Sample Project

```text
Project ID:
NEWS-2026-0001

Title:
Roudlotul Mubarokah Bersholawat

Date:
2025-09-28

Time:
20.00–24.00 WIB

Location:
Halaman Pondok Pesantren Roudlotul Mubarokah,
Rimbukidul, Karangawen, Demak

Story Type:
EVENT

Status:
ACTIVE
```

Contoh fakta:

```text
FACT-000001
Event berlangsung 28 September 2025

FACT-000002
Kegiatan berlangsung 20.00–24.00 WIB

FACT-000003
Ribuan jamaah hadir

FACT-000004
KH. Agus Sulthon menjadi penceramah

FACT-000005
Majelis Ashabul Kahfi tampil

FACT-000006
Lampu dipadamkan dan flash telepon jamaah terlihat
```

---

# 29. Data Lifecycle

```text
CREATE
  ↓
SAVE
  ↓
VERIFY
  ↓
APPROVE
  ↓
USE IN DRAFT
  ↓
PUBLISH
  ↓
ARCHIVE
```

Data sumber tidak dihapus hanya karena draft berubah.

---

# 30. Versioning

```text
DRAFT V1
   ↓
EDITORIAL CHECK
   ↓
DRAFT V2
   ↓
FINAL
```

Bukan:

```text
V1 → overwrite → V2
```

Melainkan:

```text
V1
V2
FINAL
```

---

# 31. Prototype Security

1. API key tidak disimpan di frontend.
2. API key disimpan di `PropertiesService`.
3. Frontend tidak menerima credential AI.
4. Google Drive permission dikelola oleh pemilik proyek.
5. File upload tidak membuka akses publik secara otomatis.
6. Action penting dicatat di `AUDIT_LOGS`.

---

# 32. Future Migration

Blueprint sengaja dibuat agar mudah dimigrasikan:

```text
Google Spreadsheet
       ↓
Supabase PostgreSQL
```

Contoh:

```text
NEWS_PROJECTS → news_projects
FACTS         → news_facts
QUOTES        → news_quotes
DRAFTS        → news_drafts
```

ID dan relasi dapat dipertahankan.

---

# 33. Definition of Done

Database Blueprint v0.1 siap digunakan apabila:

- [ ] Spreadsheet `REPORTER_AI_DATABASE` dibuat.
- [ ] Seluruh sheet utama tersedia.
- [ ] Header setiap sheet sesuai blueprint.
- [ ] ID convention diterapkan.
- [ ] Status enum ditetapkan.
- [ ] Google Drive root dibuat.
- [ ] Folder project dapat dibuat otomatis.
- [ ] `project_id` menjadi relasi utama.
- [ ] Quote Guard dapat diterapkan.
- [ ] Fact verification dapat diterapkan.
- [ ] Draft versioning dapat diterapkan.
- [ ] Audit log tersedia.
- [ ] API key tidak berada di frontend.
- [ ] Minimal satu project dapat disimpan end-to-end.

---

# 34. Next Step

Tahap berikut:

## STEP 2 — BACKEND BLUEPRINT

Mencakup:

```text
index.html
     ↓
Apps Script Router
     ↓
Services
     ↓
AI Service
     ↓
Spreadsheet Service
     ↓
Drive Service
```

Dokumen berikutnya akan mendefinisikan:

- `Code.gs`
- `Router.gs`
- `ProjectService.gs`
- `FactService.gs`
- `QuoteService.gs`
- `DraftService.gs`
- `AIService.gs`
- `DriveService.gs`
- seluruh action/API;
- request/response JSON;
- error handling;
- security;
- Apps Script Properties;
- integrasi Gemini API.

---

## Status Dokumen

**REPORTER AI — Database Blueprint v0.1**

> **FOUNDATION READY — Prototype**

Dokumen ini menjadi **kontrak data** antara frontend, backend, AI engine, Google Spreadsheet, dan Google Drive.

Perubahan schema setelah backend mulai dibuat harus melalui versi baru, misalnya `Database Blueprint v0.2`.
