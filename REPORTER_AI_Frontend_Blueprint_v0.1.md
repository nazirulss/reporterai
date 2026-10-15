# REPORTER AI — Frontend Blueprint v0.1

**Status:** Prototype Foundation  
**Version:** v0.1  
**Tanggal:** 28 September 2026  
**Frontend:** `index.html`  
**Backend:** Google Apps Script Web App  
**Database:** Google Spreadsheet  
**Storage:** Google Drive  
**AI Provider Prototype:** Gemini API

---

# 1. Tujuan

Frontend REPORTER AI adalah **workspace newsroom**, bukan sekadar form input dan bukan sekadar chatbot.

Tujuan utamanya:

> Membantu reporter mengubah bahan liputan menjadi berita melalui workflow editorial yang terstruktur.

Frontend harus membuat reporter selalu mengetahui:

- sedang berada di tahap apa;
- data apa yang sudah tersedia;
- data apa yang belum lengkap;
- fakta mana yang terverifikasi;
- masalah editorial apa yang ditemukan;
- apa tindakan berikutnya.

---

# 2. Prinsip UX

## 2.1 Fact First

Jangan menampilkan tombol `Generate Article` sebagai aksi utama di awal.

Reporter harus melewati pengumpulan dan pemeriksaan fakta.

## 2.2 Progressive Disclosure

Jangan menampilkan seluruh form sekaligus.

Tampilkan informasi sesuai tahap.

## 2.3 Human in the Loop

AI memberikan saran. Reporter/editor tetap memutuskan.

## 2.4 Visual Status

Gunakan status yang mudah dipahami:

```text
✓ VERIFIED
⚠ NEEDS REVIEW
! MISSING
✕ CONFLICT
○ NOT STARTED
● ACTIVE
```

## 2.5 Minimal Cognitive Load

Setiap layar memiliki satu tujuan utama.

---

# 3. Informasi Arsitektur

```text
┌─────────────────────────────────────────────────────────┐
│                    REPORTER AI                          │
│        AI News Production & Editorial System            │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  SIDEBAR     │              WORKSPACE                   │
│              │                                          │
│ Dashboard    │                                          │
│ Projects     │                                          │
│ Drafts       │                                          │
│ Published    │                                          │
│              │                                          │
│              │                                          │
│              │                                          │
├──────────────┴──────────────────────────────────────────┤
│ Backend ● Online   Database ● Online   AI ● Online      │
└─────────────────────────────────────────────────────────┘
```

---

# 4. Global Layout

## Desktop

Lebar minimum yang disarankan:

`1200px`

Layout:

```text
SIDEBAR 240px
+
MAIN CONTENT flex
```

## Tablet

Sidebar dapat menjadi compact navigation.

## Mobile

Sidebar menjadi bottom navigation atau drawer.

Prototype tetap diprioritaskan untuk desktop karena proses editorial membutuhkan area kerja luas.

---

# 5. Design Direction

Karakter visual:

> **Modern Newsroom + Editorial Workspace + AI Assistant**

Bukan:

- dashboard korporat yang kaku;
- chatbot;
- Google Forms;
- CMS tradisional.

## Visual Language

Gunakan:

- whitespace;
- card;
- subtle border;
- rounded corner moderat;
- typography kuat;
- status badge;
- progress indicator;
- split workspace;
- sticky action bar.

---

# 6. Color System

Prototype dapat menggunakan:

```text
Primary:
#0E5B5B

Primary Dark:
#084444

Accent:
#C59A45

Background:
#F7F8F8

Surface:
#FFFFFF

Text:
#172121

Muted:
#667373

Success:
#2E7D32

Warning:
#B7791F

Danger:
#C62828

Info:
#2563EB
```

Warna status harus konsisten.

---

# 7. Typography

Rekomendasi:

```text
Primary:
Inter

Editorial Content:
Georgia / system serif optional
```

Untuk prototype tanpa external dependency, gunakan:

```css
font-family:
Inter, system-ui, -apple-system, BlinkMacSystemFont,
"Segoe UI", sans-serif;
```

---

# 8. Main Navigation

Sidebar:

```text
REPORTER AI

⌂ Dashboard

📰 News Projects

✎ Drafts

✓ Editorial

📦 Published

──────────────

⚙ Settings
```

Bagian bawah:

```text
USER
Reporter
```

---

# 9. Dashboard

Route/state:

```text
dashboard
```

## Header

```text
Good morning, Reporter

Kelola liputan dan produksi berita Anda.

[ + Buat Berita Baru ]
```

## KPI

```text
┌────────────┐
│ Active     │
│ 04         │
└────────────┘

┌────────────┐
│ Need Review│
│ 02         │
└────────────┘

┌────────────┐
│ Draft      │
│ 05         │
└────────────┘

┌────────────┐
│ Published  │
│ 18         │
└────────────┘
```

---

# 10. Dashboard — Recent Projects

Card:

```text
Roudlotul Mubarokah Bersholawat

EVENT
28 Sep 2025
Karangawen, Demak

● Editorial

Progress 72%

[Continue]
```

Progress dihitung berdasarkan stage workflow.

---

# 11. Dashboard — Production Pipeline

Tampilkan:

```text
COLLECTING     02
FACT AUDIT     01
WRITING        02
EDITORIAL      01
READY          03
PUBLISHED      18
```

Klik status membuka project terkait.

---

# 12. New Story Screen

Klik:

> `+ Buat Berita Baru`

Muncul form singkat.

```text
BUAT BERITA BARU

Judul sementara
[____________________________]

Jenis berita
[ EVENT ▼ ]

Tanggal
[ 28/09/2025 ]

Lokasi
[____________________________]

[ Batal ]       [ Buat Project ]
```

Setelah create:

```text
→ Story Workspace
```

---

# 13. Story Workspace

Ini adalah halaman utama aplikasi.

```text
┌──────────────────────────────────────────────────────────┐
│ ← Projects                                               │
│                                                          │
│ Roudlotul Mubarokah Bersholawat                          │
│ EVENT · 28 Sep 2025 · Karangawen                         │
│                                                          │
│ [Status: FACT AUDIT]                     [•••]           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 01 FORM → 02 FACTS → 03 AUDIT → 04 VALUE → 05 ANGLE     │
│ → 06 STRUCTURE → 07 DRAFT → 08 EDIT → 09 SEO → 10 PACK  │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                 STAGE CONTENT                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Stage navigation menjadi horizontal progress stepper.

---

# 14. Story Header

Selalu tampil:

```text
Title
Story Type
Date
Location
Project Status
Current Stage
```

Action:

```text
[Save]
[More]
```

---

# 15. Stage 01 — REPORTER FORM

Tujuan:

> Mengumpulkan bahan liputan.

Form dibagi menjadi accordion/section.

## Section A — Identitas

```text
Nama kegiatan
Tema
Tanggal
Waktu
Lokasi
Penyelenggara
```

## Section B — Tokoh

```text
Nama
Jabatan/Peran
Organisasi
```

Button:

`+ Tambah Tokoh`

## Section C — Peserta

```text
Jumlah peserta
Kategori peserta
Asal peserta
```

## Section D — Kronologi

```text
Waktu
Aktivitas
Keterangan
```

## Section E — Kutipan

```text
Narasumber
Kutipan
Jenis:
[Direct / Paraphrase / Editorial]

Sumber:
[________]
```

## Section F — Human Interest

```text
Momen khusus
Observasi lapangan
Detail visual
```

Button:

```text
[ Simpan Bahan ]
[ Analisis Bahan dengan AI ]
```

---

# 16. Stage 02 — FACT SHEET

Tampilan:

```text
FACT SHEET

42 Fakta ditemukan

✓ 35 Verified
⚠ 04 Need Review
! 03 Need Source
```

Filter:

```text
[ All ] [ Verified ] [ Review ] [ Missing ]
```

---

# 17. Fact Card

Contoh:

```text
┌────────────────────────────────────────────┐
│ EVENT DATE                     ✓ VERIFIED  │
│                                            │
│ 28 September 2025                          │
│                                            │
│ Source: Reporter Observation               │
│ Confidence: HIGH                           │
│                                            │
│ [Edit] [View Source]                       │
└────────────────────────────────────────────┘
```

---

# 18. Fact Conflict Card

```text
┌────────────────────────────────────────────┐
│ ⚠ CONFLICT                                 │
│                                            │
│ Waktu acara memiliki dua informasi:        │
│ 20.00–24.00 dan 20.00–23.00                │
│                                            │
│ [Compare Sources] [Resolve]                │
└────────────────────────────────────────────┘
```

AI tidak boleh otomatis memilih salah satu.

---

# 19. Stage 03 — FACT AUDIT

Header:

```text
FACT AUDIT

AI menemukan:
2 conflicts
3 missing sources
1 unsupported claim
```

Section:

### Conflicts

Daftar konflik.

### Missing Evidence

Daftar data yang belum memiliki sumber.

### Unsupported Claims

Daftar klaim yang belum didukung fakta.

### Recommendation

AI memberikan saran tindakan.

---

# 20. Audit Action

```text
[ Resolve ]
[ Add Source ]
[ Reject Claim ]
[ Mark Verified ]
```

Semua keputusan penting tetap dibuat reporter/editor.

---

# 21. Stage 04 — NEWS VALUE

Tampilkan kartu:

```text
NEWS VALUE

Magnitude          █████ 5
Proximity          █████ 5
Prominence         ████  4
Human Interest     █████ 5
Novelty            ████  4
Continuity         ████  4
Conflict           █     1
```

Di bawahnya:

```text
AI ANALYSIS

Cerita memiliki kekuatan terutama pada...
```

Button:

```text
[ Generate Angles ]
```

---

# 22. Stage 05 — ANGLES

Tampilan tiga atau lima kartu angle.

```text
ANGLE 01
Dari Khatmil Qur'an ke Shalawat

Fokus:
Penutup rangkaian Haflah.

Didukung oleh:
Fact #001
Fact #005
Fact #009

[ Pilih Angle ]
```

Angle yang dipilih mendapat border/accent.

---

# 23. Angle Detail

Saat diklik:

```text
ANGLE DETAIL

Judul
Deskripsi

Kenapa angle ini kuat
...

Fakta pendukung
...

Potensi risiko
...

[ Gunakan Angle Ini ]
```

---

# 24. Stage 06 — NEWS STRUCTURE

Tampilan editorial outline:

```text
NEWS STRUCTURE

1. LEAD
   Ribuan jamaah menghadiri...

2. NUT GRAPH
   Kegiatan menjadi penutup...

3. BODY
   - Rangkaian acara
   - Tokoh
   - Ceramah
   - Human interest

4. CLOSING
   Makna penutupan kegiatan
```

Setiap block dapat diedit.

Button:

```text
[ Generate Structure ]
[ Approve Structure ]
```

---

# 25. Stage 07 — DRAFT V1

Layout split:

```text
┌──────────────────────┬─────────────────────────┐
│ SOURCE FACTS         │ ARTICLE DRAFT           │
│                      │                         │
│ ✓ Fact #001          │ Headline                │
│ ✓ Fact #002          │                         │
│ ✓ Fact #004          │ Lead                    │
│ ✓ Quote #001         │                         │
│                      │ Body                    │
│                      │                         │
└──────────────────────┴─────────────────────────┘
```

---

# 26. Evidence Highlight

Jika memungkinkan, teks artikel dapat memiliki marker:

```text
[Fact #001]
[Fact #005]
[Quote #002]
```

Prototype tidak wajib membuat paragraph-level mapping sempurna, tetapi UI harus disiapkan untuk fitur tersebut.

---

# 27. Draft Toolbar

```text
[ Generate Draft V1 ]

[ Regenerate ]
[ Save ]
[ Copy ]
```

Informasi:

```text
Source:
Verified Facts + Approved Quotes

AI:
Gemini

Version:
V1
```

---

# 28. Stage 08 — EDITORIAL CHECK

Header:

```text
EDITORIAL CHECK

✓ Accuracy
✓ Structure
⚠ Quote Integrity
⚠ Unsupported Claim
✓ Grammar
✓ Redundancy
```

---

# 29. Editorial Issue Card

```text
⚠ QUOTE INTEGRITY

Paragraph 7 menggunakan kalimat
yang menyerupai kutipan langsung,
tetapi source tidak tersedia.

Recommendation:
Ubah menjadi paraphrase atau tambahkan
sumber kutipan.

[ Fix ]
```

---

# 30. Editorial Status

```text
PASS
NEEDS REVISION
BLOCKED
```

Jika `BLOCKED`, tombol:

```text
[ Generate Draft V2 ]
```

harus disabled sampai masalah kritis ditangani.

---

# 31. Stage 09 — DRAFT V2

Tampilkan:

```text
DRAFT V2

Based on:
Draft V1
+
Editorial Corrections
```

Perbandingan opsional:

```text
[ Original ] [ Revised ] [ Compare ]
```

Button:

```text
[ Approve Final ]
```

---

# 32. Stage 10 — SEO

Form:

```text
SEO TITLE
[____________________________]

SLUG
[____________________________]

FOCUS KEYWORD
[____________________________]

META DESCRIPTION
[____________________________]

EXCERPT
[____________________________]

CATEGORY
[____________________________]

TAGS
[____________________________]
```

Button:

```text
[ Generate SEO ]
[ Approve SEO ]
```

---

# 33. Stage 11 — MASTER NEWS PACKAGE

Halaman final.

```text
MASTER NEWS PACKAGE

✓ Final Article
✓ SEO
✓ Featured Image
✓ Photo Captions
✓ Social Media
✓ Keywords
✓ Tags
✓ Category
```

Action:

```text
[ Copy Article ]
[ Export ]
[ Open Publish Package ]
```

---

# 34. Master Package Layout

Tab:

```text
ARTICLE
SEO
MEDIA
SOCIAL
METADATA
SOURCES
```

---

# 35. Article Tab

```text
FINAL HEADLINE

...

FINAL ARTICLE

...

[ Copy ]
```

---

# 36. SEO Tab

```text
SEO TITLE
SLUG
FOCUS KEYWORD
META DESCRIPTION
EXCERPT
CATEGORY
TAGS
```

---

# 37. Media Tab

```text
FEATURED IMAGE

[ image ]

Photo Captions

01 ...
02 ...
03 ...
```

---

# 38. Social Tab

```text
INSTAGRAM

...

FACEBOOK

...

WHATSAPP

...
```

Setiap bagian memiliki:

```text
[ Copy ]
```

---

# 39. Project Completion

Ketika semua requirement terpenuhi:

```text
┌──────────────────────────────────────────┐
│ ✓ READY TO PUBLISH                       │
│                                          │
│ Semua pemeriksaan editorial selesai.     │
│                                          │
│ [ Mark as Ready ]                        │
└──────────────────────────────────────────┘
```

---

# 40. Global Loading State

Semua proses AI harus memiliki loading state.

Contoh:

```text
Analyzing facts...

● Mengidentifikasi fakta
● Memeriksa konflik
○ Menyusun temuan
```

Jangan gunakan spinner tanpa konteks.

---

# 41. AI Processing Modal

Saat proses AI lama:

```text
┌─────────────────────────────────┐
│ ANALYZING FACTS                 │
│                                 │
│ AI sedang memeriksa bahan       │
│ liputan Anda.                   │
│                                 │
│ ✓ Membaca data                  │
│ ✓ Mengidentifikasi fakta       │
│ ● Memeriksa konflik             │
│ ○ Menyusun hasil                │
│                                 │
│ Jangan tutup halaman ini.       │
└─────────────────────────────────┘
```

---

# 42. Empty States

Contoh Fact Sheet kosong:

```text
Belum ada fakta.

Tambahkan bahan liputan terlebih dahulu.

[ Isi Reporter Form ]
```

Angle kosong:

```text
Belum ada angle.

Pastikan Fact Audit sudah selesai.

[ Jalankan Fact Audit ]
```

---

# 43. Error State

Contoh:

```text
Tidak dapat terhubung ke backend.

Periksa koneksi dan coba lagi.

[ Retry ]
```

AI error:

```text
AI belum dapat menyelesaikan permintaan.

Data Anda tetap tersimpan.

[ Coba Lagi ]
```

---

# 44. Save State

Frontend menampilkan:

```text
Saved ✓
```

atau:

```text
Saving...
```

atau:

```text
Unsaved changes
```

Jangan membuat user tidak tahu apakah datanya tersimpan.

---

# 45. Navigation Guard

Jika ada perubahan belum disimpan:

```text
Perubahan belum disimpan.

Tinggalkan halaman?

[ Tetap di sini ]
[ Tinggalkan ]
```

---

# 46. Modal System

Prototype memiliki modal reusable:

```text
ConfirmModal
AlertModal
SourceModal
FactModal
QuoteModal
PersonModal
MediaModal
```

---

# 47. Toast System

Toast ringan:

```text
✓ Project berhasil dibuat
✓ Fakta disimpan
✓ Quote diverifikasi
✓ Draft V1 dibuat
⚠ Ada konflik fakta
✕ Gagal menghubungi AI
```

---

# 48. Frontend State Model

State utama:

```javascript
appState = {
  user: {},
  projects: [],
  currentProject: null,
  currentStage: "FORM",

  facts: [],
  sources: [],
  people: [],
  quotes: [],
  events: [],

  newsValue: null,
  angles: [],
  selectedAngle: null,

  structure: null,

  drafts: [],
  currentDraft: null,

  editorialCheck: null,

  seo: null,
  media: [],
  publications: []
};
```

Frontend tidak boleh menjadi source-of-truth permanen.

Backend tetap source-of-truth.

---

# 49. API Client

`index.html` membutuhkan satu API abstraction:

```javascript
API.request(action, payload)
```

Contoh:

```javascript
API.request("getProject", {
  project_id: "NEWS-2026-0001"
});
```

Tidak boleh tersebar:

```javascript
fetch(...)
```

di seluruh komponen.

---

# 50. Frontend Action Mapping

| UI Action | Backend Action |
|---|---|
| Create Project | `createProject` |
| Save Form | `updateProject` / related create actions |
| Load Facts | `getFacts` |
| Verify Fact | `verifyFact` |
| Run Audit | `analyzeFacts` |
| Generate Value | `analyzeNewsValue` |
| Generate Angles | `generateAngles` |
| Select Angle | `selectAngle` |
| Generate Structure | `generateStructure` |
| Generate Draft | `generateDraftV1` |
| Editorial Check | `runEditorialCheck` |
| Generate V2 | `createDraftV2` |
| Generate SEO | `generateSEO` |
| Upload Media | `uploadMedia` |
| Caption | `generateCaption` |
| Master Package | `getMasterPackage` |

---

# 51. Component Architecture

Prototype vanilla HTML/JS dapat menggunakan konsep component sederhana:

```text
components/
├── Sidebar
├── Header
├── StageStepper
├── ProjectCard
├── FactCard
├── QuoteCard
├── EventTimeline
├── AngleCard
├── StructureBlock
├── DraftEditor
├── EditorialIssue
├── SEOForm
├── MediaGallery
├── PackageTabs
├── Toast
├── Modal
└── LoadingOverlay
```

Jika semua masih berada dalam satu `index.html`, gunakan fungsi render terpisah.

---

# 52. Render Pattern

Contoh:

```javascript
renderDashboard()
renderProject()
renderFormStage()
renderFactStage()
renderAuditStage()
renderNewsValueStage()
renderAngleStage()
renderStructureStage()
renderDraftStage()
renderEditorialStage()
renderSEOStage()
renderPackageStage()
```

---

# 53. Stage Access Rules

User tidak harus dipaksa secara teknis membuka stage secara linear, tetapi sistem memberikan guard.

Contoh:

### Tidak boleh Draft

Jika:

```text
verified facts = 0
```

maka:

```text
Draft generation disabled.
```

### Tidak boleh Final

Jika:

```text
editorial status != PASS
```

maka:

```text
Approve Final disabled.
```

---

# 54. Stage Completion

Setiap stage memiliki completion state.

```text
FORM
✓ Complete

FACTS
✓ Complete

AUDIT
⚠ Needs Review

ANGLE
○ Not Started
```

Progress:

```text
3 / 10 stages completed
```

---

# 55. Responsive Behavior

## Desktop

Split screen dan sidebar penuh.

## Tablet

Sidebar compact.

## Mobile

```text
Top Header
Content
Bottom Navigation
```

Stage stepper menjadi horizontal scroll.

Editor teks tetap usable.

---

# 56. Accessibility

Minimal:

- keyboard navigation;
- visible focus;
- semantic buttons;
- label form;
- sufficient contrast;
- `aria-label` untuk icon-only button;
- jangan menggunakan warna saja untuk status.

Contoh:

```text
✓ VERIFIED
```

bukan hanya warna hijau.

---

# 57. Autosave

Prototype dapat menggunakan explicit save terlebih dahulu.

Future:

```text
Autosave every 30–60 seconds
```

Tetapi setiap autosave tetap melalui backend.

---

# 58. Offline Handling

Prototype tidak perlu offline-first.

Namun frontend harus:

- mempertahankan data form lokal sementara;
- memberi warning jika backend tidak dapat diakses;
- tidak mengklaim data tersimpan jika request gagal.

---

# 59. Frontend Security

Tidak boleh ada:

```text
GEMINI_API_KEY
DATABASE_SPREADSHEET_ID
DRIVE_ROOT_FOLDER_ID
```

di `index.html`.

Frontend hanya mengetahui:

```text
APPS_SCRIPT_WEB_APP_URL
```

Jika URL dianggap sensitif, konfigurasi tetap dapat dipindahkan saat deployment.

---

# 60. Prototype Visual Priority

Urutan prioritas:

1. **Clarity**
2. **Workflow**
3. **Data visibility**
4. **Editorial control**
5. **AI feedback**
6. **Aesthetics**

Jangan mengorbankan workflow demi animasi.

---

# 61. First Prototype Screen

Saat aplikasi dibuka:

```text
REPORTER AI

AI News Production & Editorial System

Ubah bahan liputan menjadi berita
melalui workflow jurnalistik yang terstruktur.

[ + Buat Berita Baru ]

Recent Projects

Roudlotul Mubarokah Bersholawat
FACT AUDIT · 72%

Haflah Khotmil Qur'an ke-22
PUBLISHED
```

---

# 62. Recommended First User Flow

Prototype pertama diuji menggunakan:

### Project

`Roudlotul Mubarokah Bersholawat`

Workflow:

```text
Create Project
      ↓
Reporter Form
      ↓
Save Facts
      ↓
Fact Audit
      ↓
News Value
      ↓
Generate Angles
      ↓
Select Angle
      ↓
Generate Structure
      ↓
Draft V1
      ↓
Editorial Check
      ↓
Draft V2
      ↓
SEO
      ↓
Master News Package
```

---

# 63. UI Acceptance Criteria

Frontend v0.1 dianggap berhasil jika reporter dapat:

- [ ] Membuat project.
- [ ] Melihat workflow.
- [ ] Mengisi bahan liputan.
- [ ] Melihat facts.
- [ ] Melihat status verification.
- [ ] Menangani conflict.
- [ ] Menjalankan Fact Audit.
- [ ] Melihat News Value.
- [ ] Melihat dan memilih angle.
- [ ] Melihat structure.
- [ ] Generate Draft V1.
- [ ] Melihat Editorial Check.
- [ ] Generate Draft V2.
- [ ] Generate SEO.
- [ ] Melihat media.
- [ ] Melihat Master News Package.
- [ ] Copy/export hasil.

---

# 64. Prototype Scope — Jangan Dulu

Untuk v0.1, jangan membangun:

```text
❌ Native Android
❌ Native iOS
❌ Multi-tenant billing
❌ Subscription
❌ Advanced collaboration
❌ Real-time multiplayer editing
❌ CMS integration
❌ Social API publishing
❌ Complex analytics
❌ Vector database UI
❌ Agent marketplace
```

Fokus:

> **Satu reporter → satu project → satu berita → end-to-end.**

---

# 65. Relationship dengan Backend Blueprint

Frontend tidak boleh membuat kontrak baru.

Frontend mengikuti:

```text
Database Blueprint v0.1
+
Backend Blueprint v0.1
```

Contoh:

```text
Frontend
   ↓
generateDraftV1
   ↓
Backend
   ↓
Verified Facts
+
Approved Quotes
+
Selected Angle
+
Approved Structure
   ↓
Gemini
```

---

# 66. Relationship dengan Database Blueprint

Entity UI:

```text
Project
Fact
Source
Person
Quote
Event
News Value
Angle
Structure
Draft
Editorial Check
SEO
Media
Publication
```

harus memiliki pasangan entity backend/database.

Tidak boleh ada entity UI permanen yang tidak memiliki model data jelas.

---

# 67. Future UI Extensions

Setelah prototype terbukti:

```text
INTERVIEW STUDIO
    ↓
Audio Recording
    ↓
Transcription
    ↓
Quote Extraction
```

```text
MEDIA INTELLIGENCE
    ↓
Photo Analysis
    ↓
Caption
    ↓
Alt Text
```

```text
NEWSROOM
    ↓
Assignments
    ↓
Reporter
    ↓
Editor
    ↓
Approval
```

---

# 68. Master Frontend Concept

REPORTER AI bukan:

> “Satu textbox → AI menulis berita.”

Tetapi:

```text
                  REPORTER AI
                       │
                NEWS WORKSPACE
                       │
        ┌──────────────┴──────────────┐
        │                             │
     HUMAN                         AI
        │                             │
   Observe                         Analyze
   Verify                          Suggest
   Decide                          Draft
   Edit                            Check
        │                             │
        └──────────────┬──────────────┘
                       │
                  FINAL NEWS
```

AI bekerja **bersama reporter**, bukan menggantikan reporter.

---

# 69. Definition of Done — Frontend v0.1

- [ ] Dashboard tersedia.
- [ ] New Story tersedia.
- [ ] Story Workspace tersedia.
- [ ] Stage Stepper tersedia.
- [ ] Reporter Form tersedia.
- [ ] Fact Sheet tersedia.
- [ ] Fact Audit tersedia.
- [ ] News Value tersedia.
- [ ] Angle Generator tersedia.
- [ ] Structure Editor tersedia.
- [ ] Draft V1 tersedia.
- [ ] Editorial Check tersedia.
- [ ] Draft V2 tersedia.
- [ ] SEO tersedia.
- [ ] Media tersedia.
- [ ] Master News Package tersedia.
- [ ] Loading state tersedia.
- [ ] Error state tersedia.
- [ ] Empty state tersedia.
- [ ] Toast tersedia.
- [ ] API abstraction tersedia.
- [ ] Tidak ada API key di frontend.
- [ ] Frontend mengikuti API contract Backend Blueprint v0.1.

---

# 70. Next Step

Setelah Frontend Blueprint selesai, tahap implementasi berikut adalah:

## STEP 4 — MASTER PROMPT GEMINI CANVAS

Prompt tersebut akan memerintahkan Gemini Canvas untuk membuat:

```text
index.html
│
├── HTML structure
├── CSS design system
├── JavaScript state management
├── API client
├── Dashboard
├── Story Workspace
├── Stage navigation
├── Reporter Form
├── Fact Sheet
├── Fact Audit
├── News Value
├── Angle Generator
├── Structure
├── Draft Editor
├── Editorial Check
├── SEO
├── Media
├── Master News Package
├── Loading states
├── Error states
└── Responsive UI
```

Prompt akan secara eksplisit merujuk pada:

- **Database Blueprint v0.1**
- **Backend Blueprint v0.1**
- API action registry
- field names
- response contract
- workflow state
- design system

sehingga Gemini Canvas membangun **frontend prototype yang benar-benar memiliki kontrak dengan backend**, bukan sekadar mockup visual.

---

# Status Dokumen

**REPORTER AI — Frontend Blueprint v0.1**

> **READY FOR GEMINI CANVAS PROTOTYPE**

Dokumen ini menjadi kontrak UI/UX antara frontend `index.html` dengan Backend Blueprint v0.1 dan Database Blueprint v0.1.
