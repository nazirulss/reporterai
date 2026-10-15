# REPORTER AI — Backend Blueprint v0.1

**Status:** Prototype Foundation  
**Version:** v0.1  
**Tanggal:** 28 September 2026  
**Frontend:** `index.html`  
**Backend:** Google Apps Script  
**Database:** Google Spreadsheet  
**Storage:** Google Drive  
**AI Provider Prototype:** Gemini API

---

# 1. Tujuan

Backend REPORTER AI menjadi lapisan orkestrasi antara frontend, database, Google Drive, dan AI.

```text
index.html
    ↓
Apps Script Web App
    ↓
Router
    ↓
Service Layer
    ├── Project Service
    ├── Source Service
    ├── Fact Service
    ├── People Service
    ├── Quote Service
    ├── Event Service
    ├── News Value Service
    ├── Angle Service
    ├── Structure Service
    ├── Draft Service
    ├── Editorial Service
    ├── SEO Service
    ├── Media Service
    └── Publication Service
    ↓
Google Spreadsheet / Google Drive

AI requests:
Service Layer
    ↓
AIService
    ↓
Gemini API
```

Backend harus menjaga prinsip:

- frontend tidak mengakses Spreadsheet secara langsung;
- API key tidak pernah dikirim ke frontend;
- AI tidak menjadi sumber fakta;
- semua data penting melewati validasi backend;
- perubahan penting dicatat di `AUDIT_LOGS`.

---

# 2. Struktur File Apps Script

Prototype menggunakan beberapa file `.gs` agar mudah dirawat.

```text
REPORTER_AI_APPS_SCRIPT/
│
├── Code.gs
├── Config.gs
├── Router.gs
├── Response.gs
├── Utils.gs
│
├── ProjectService.gs
├── SourceService.gs
├── FactService.gs
├── PeopleService.gs
├── QuoteService.gs
├── EventService.gs
├── NewsValueService.gs
├── AngleService.gs
├── StructureService.gs
├── DraftService.gs
├── EditorialService.gs
├── SEOService.gs
├── MediaService.gs
├── PublicationService.gs
│
├── SpreadsheetService.gs
├── DriveService.gs
├── AIService.gs
├── PromptService.gs
└── AuditService.gs
```

Prototype tidak harus menggunakan semua service sejak hari pertama, tetapi struktur ini menjadi target arsitektur.

---

# 3. Code.gs

`Code.gs` menjadi entry point Web App.

Fungsi utama:

```javascript
function doGet(e) {
  return Router.handleGet(e);
}

function doPost(e) {
  return Router.handlePost(e);
}
```

`Code.gs` tidak berisi business logic.

Tujuannya menjaga entry point tetap sederhana.

---

# 4. Router.gs

Router menerima request dari frontend dan menentukan action.

Format request:

```json
{
  "action": "createProject",
  "payload": {}
}
```

Contoh:

```javascript
function handlePost(e) {
  const request = JSON.parse(e.postData.contents || "{}");

  switch (request.action) {
    case "createProject":
      return ProjectService.create(request.payload);

    case "getProject":
      return ProjectService.get(request.payload);

    case "saveFacts":
      return FactService.saveBatch(request.payload);

    case "analyzeFacts":
      return AIService.analyzeFacts(request.payload);

    default:
      return Response.error(
        "UNKNOWN_ACTION",
        "Action tidak dikenali."
      );
  }
}
```

Untuk versi production, router sebaiknya menggunakan action registry agar tidak terlalu panjang.

---

# 5. API Contract

Semua response backend menggunakan format konsisten.

## Success

```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-09-28T09:00:00+07:00"
  }
}
```

## Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "project_id wajib diisi."
  },
  "meta": {
    "timestamp": "2026-09-28T09:00:00+07:00"
  }
}
```

Frontend tidak boleh bergantung pada bentuk response yang berbeda-beda.

---

# 6. Response.gs

Helper:

```javascript
const Response = {
  success(data, meta = {}) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          ...meta
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  },

  error(code, message, details = null) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: {
          code,
          message,
          details
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
};
```

---

# 7. Config.gs

Konfigurasi non-secret:

```javascript
const APP_CONFIG = {
  APP_NAME: "REPORTER AI",
  VERSION: "0.1",
  LANGUAGE: "id-ID",
  DATABASE_SHEET: "REPORTER_AI_DATABASE",
  DRIVE_ROOT_FOLDER: "REPORTER_AI"
};
```

Credential rahasia tidak disimpan di sini.

---

# 8. Apps Script Properties

Secret disimpan menggunakan `PropertiesService`.

Contoh:

```text
GEMINI_API_KEY
DATABASE_SPREADSHEET_ID
DRIVE_ROOT_FOLDER_ID
```

Akses:

```javascript
const props = PropertiesService.getScriptProperties();

const apiKey = props.getProperty("GEMINI_API_KEY");
```

Frontend tidak pernah menerima API key.

---

# 9. SpreadsheetService.gs

Service ini menjadi abstraction layer untuk Spreadsheet.

Fungsi dasar:

```text
getSpreadsheet()
getSheet(sheetName)
getAll(sheetName)
findById(sheetName, idField, id)
insert(sheetName, row)
updateById(sheetName, idField, id, data)
deleteById(sheetName, idField, id)
appendBatch(sheetName, rows)
```

Frontend dan service lain tidak boleh menyebarkan kode:

```javascript
SpreadsheetApp.openById(...)
```

ke seluruh aplikasi.

Semua akses database melewati `SpreadsheetService`.

---

# 10. ID Generator

Prototype membutuhkan ID konsisten.

Contoh:

```javascript
function generateId(prefix) {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}`;
}
```

Untuk entity:

```text
NEWS
SRC
FACT
PERS
QUO
EVT
VAL
ANG
STR
DRF
EDT
SEO
MED
PUB
USR
LOG
```

Production nanti dapat menggunakan UUID.

---

# 11. Utils.gs

Utility minimal:

```text
now()
normalizeText()
sanitizeText()
parseJson()
safeJsonParse()
requireField()
slugify()
isValidEmail()
```

Contoh:

```javascript
function requireField(payload, field) {
  if (
    payload[field] === undefined ||
    payload[field] === null ||
    payload[field] === ""
  ) {
    throw new Error(`${field} wajib diisi.`);
  }
}
```

---

# 12. ProjectService.gs

## createProject

Request:

```json
{
  "title": "Roudlotul Mubarokah Bersholawat",
  "story_type": "EVENT",
  "event_date": "2025-09-28",
  "event_time": "20.00–24.00 WIB",
  "location": "Rimbukidul, Karangawen, Demak",
  "organization": "Pondok Pesantren Roudlotul Mubarokah",
  "reporter_id": "USR-000001"
}
```

Backend:

1. validasi;
2. generate `project_id`;
3. create Drive project folder;
4. save project;
5. create audit log;
6. return project.

Response:

```json
{
  "success": true,
  "data": {
    "project_id": "NEWS-2026-0001",
    "status": "ACTIVE",
    "current_stage": "FORM"
  }
}
```

---

# 13. Project Actions

```text
createProject
getProject
listProjects
updateProject
archiveProject
changeProjectStage
```

---

# 14. SourceService.gs

Actions:

```text
createSource
getSources
updateSource
deleteSource
```

Source harus selalu terkait dengan `project_id`.

Jika source berupa file, backend menggunakan `DriveService`.

---

# 15. FactService.gs

Actions:

```text
createFact
saveFacts
getFacts
updateFact
verifyFact
rejectFact
resolveConflict
```

## verifyFact

Request:

```json
{
  "fact_id": "FACT-000001",
  "verification_status": "VERIFIED",
  "verified_by": "USR-000001"
}
```

Backend:

1. cek fact;
2. ubah status;
3. simpan verifier;
4. timestamp;
5. tulis audit log.

---

# 16. Fact Audit

Action:

```text
analyzeFacts
```

Workflow:

```text
FACTS
  ↓
AIService.analyzeFacts()
  ↓
Audit Result
  ↓
FACT_AUDIT
  ↓
save findings
```

AI tidak langsung mengubah status fakta menjadi `VERIFIED`.

AI hanya memberikan temuan.

Keputusan verifikasi tetap berada pada reporter/editor.

---

# 17. Fact Audit Response

Contoh:

```json
{
  "conflicts": [
    {
      "field": "event_time",
      "fact_ids": [
        "FACT-000001",
        "FACT-000007"
      ],
      "description": "Terdapat dua informasi waktu yang berbeda."
    }
  ],
  "missing": [
    "Nama ketua panitia belum tersedia."
  ],
  "unsupported": [
    "Klaim 'ribuan jamaah menangis haru' belum memiliki sumber."
  ]
}
```

---

# 18. PeopleService.gs

Actions:

```text
createPerson
getPeople
updatePerson
verifyPerson
```

Person tidak boleh otomatis dianggap verified hanya karena AI mengekstraknya.

---

# 19. QuoteService.gs

Actions:

```text
createQuote
getQuotes
updateQuote
verifyQuote
approveQuote
rejectQuote
```

## Quote Guard

Backend wajib memeriksa:

```text
IF quote_type = DIRECT
AND source_id kosong
THEN reject
```

Dan:

```text
IF verification_status != VERIFIED
THEN approved_for_publication = FALSE
```

---

# 20. EventService.gs

Actions:

```text
createEvent
saveEvents
getEvents
updateEvent
reorderEvents
```

Event dapat disusun berdasarkan `sequence`.

---

# 21. NewsValueService.gs

Action:

```text
analyzeNewsValue
saveNewsValue
getNewsValue
```

AI menghasilkan analisis:

```json
{
  "magnitude": 5,
  "proximity": 5,
  "prominence": 4,
  "human_interest": 5,
  "novelty": 4,
  "continuity": 4,
  "conflict": 1,
  "analysis": "..."
}
```

Nilai hanya membantu analisis editorial.

---

# 22. AngleService.gs

Actions:

```text
generateAngles
saveAngles
getAngles
selectAngle
```

`generateAngles` menggunakan fakta yang sudah disetujui/verified.

Output:

```json
{
  "angles": [
    {
      "angle_id": null,
      "title": "Dari Khatmil Qur'an ke Shalawat",
      "description": "...",
      "supporting_facts": []
    }
  ]
}
```

Backend kemudian menyimpan hasil sebagai records.

---

# 23. StructureService.gs

Actions:

```text
generateStructure
saveStructure
getStructure
approveStructure
```

Structure hanya boleh menggunakan selected angle.

---

# 24. DraftService.gs

Actions:

```text
generateDraftV1
getDraft
getDrafts
saveDraft
approveDraft
createDraftV2
setFinalDraft
```

Workflow:

```text
Approved Facts
      +
Selected Angle
      +
Approved Structure
      ↓
AI Writer
      ↓
Draft V1
```

---

# 25. Draft V1 Rule

AI writer tidak boleh:

- menambah fakta baru;
- membuat angka baru;
- membuat nama baru;
- membuat direct quote;
- mengubah fakta terverifikasi.

Draft hanya boleh berasal dari:

```text
Verified Facts
+
Approved Quotes
+
Selected Angle
+
Approved Structure
```

---

# 26. EditorialService.gs

Action:

```text
runEditorialCheck
getEditorialCheck
resolveEditorialIssue
approveEditorial
```

Check minimal:

```text
accuracy
structure
quote_integrity
unsupported_claim
redundancy
language
promotional_tone
```

AI memberikan rekomendasi.

Editor tetap menentukan final approval.

---

# 27. Draft V2

Workflow:

```text
Draft V1
   ↓
Editorial Check
   ↓
Editor decision
   ↓
Draft V2
```

Draft V2 dibuat sebagai record baru.

`parent_draft_id` menunjuk ke V1.

---

# 28. SEOService.gs

Actions:

```text
generateSEO
getSEO
updateSEO
approveSEO
```

SEO menggunakan final/approved draft.

AI tidak boleh mengubah fakta hanya demi SEO.

---

# 29. MediaService.gs

Actions:

```text
uploadMedia
getMedia
updateMedia
deleteMedia
setFeaturedMedia
generateCaption
```

File disimpan di Google Drive.

Database hanya menyimpan metadata:

```text
media_id
project_id
file_id
file_name
file_url
caption
alt_text
is_featured
```

---

# 30. DriveService.gs

Fungsi:

```text
getRootFolder
createProjectFolder
getProjectFolder
createSubFolders
uploadFile
getFile
moveFile
deleteFile
```

Saat project dibuat:

```text
NEWS-2026-0001/
├── SOURCES/
├── PHOTOS/
├── AUDIO/
├── VIDEO/
├── DOCUMENTS/
└── EXPORTS/
```

---

# 31. PublicationService.gs

Actions:

```text
createPublication
getPublication
markPublished
unpublish
archivePublication
```

Prototype tidak harus langsung terhubung ke CMS.

Untuk v0.1 cukup menyimpan:

- platform;
- URL;
- tanggal publikasi;
- user;
- status.

---

# 32. AuditService.gs

Semua action penting dicatat.

Helper:

```javascript
AuditService.log({
  project_id,
  user_id,
  action,
  entity_type,
  entity_id,
  old_value,
  new_value
});
```

Contoh:

```text
VERIFY_FACT
FACT
FACT-000001
```

---

# 33. AIService.gs

AIService menjadi satu-satunya pintu komunikasi dengan Gemini.

```text
AIService
│
├── analyzeFacts()
├── analyzeNewsValue()
├── generateAngles()
├── generateStructure()
├── generateDraft()
├── editorialCheck()
├── generateSEO()
└── generateCaption()
```

Service lain tidak boleh langsung memanggil Gemini API.

---

# 34. PromptService.gs

Prompt dipisahkan dari logic.

```text
getFactAuditPrompt()
getNewsValuePrompt()
getAnglePrompt()
getStructurePrompt()
getDraftPrompt()
getEditorialPrompt()
getSEOPrompt()
getCaptionPrompt()
```

Dengan demikian prompt dapat diperbarui tanpa membongkar service.

---

# 35. AI Request Pipeline

```text
Frontend
   ↓
Apps Script
   ↓
Service
   ↓
Prepare Context
   ↓
PromptService
   ↓
AIService
   ↓
Gemini API
   ↓
Parse JSON
   ↓
Validate Output
   ↓
Save Result
   ↓
Frontend
```

---

# 36. AI Context Rules

AI context tidak dikirim sebagai satu blob besar tanpa struktur.

Contoh:

```json
{
  "project": {},
  "verified_facts": [],
  "approved_quotes": [],
  "people": [],
  "events": [],
  "selected_angle": {},
  "structure": {}
}
```

Setiap agent hanya menerima data yang diperlukan.

---

# 37. AI Output Validation

Backend wajib memvalidasi hasil AI.

Contoh:

```text
AI menghasilkan angle
        ↓
JSON valid?
        ↓
Schema valid?
        ↓
Fact IDs valid?
        ↓
Tidak ada ID fiktif?
        ↓
Save
```

Jika gagal:

```text
AI_OUTPUT_INVALID
```

dan hasil tidak disimpan sebagai data final.

---

# 38. AI JSON Rule

Prototype sebaiknya meminta Gemini mengembalikan JSON terstruktur untuk tugas internal.

Contoh:

```json
{
  "status": "ok",
  "items": []
}
```

Bukan meminta AI mengembalikan campuran Markdown dan data sistem.

---

# 39. Error Codes

Minimal:

```text
UNKNOWN_ACTION
INVALID_JSON
VALIDATION_ERROR
UNAUTHORIZED
PROJECT_NOT_FOUND
SOURCE_NOT_FOUND
FACT_NOT_FOUND
QUOTE_NOT_FOUND
DRAFT_NOT_FOUND
MEDIA_NOT_FOUND
AI_REQUEST_FAILED
AI_OUTPUT_INVALID
AI_TIMEOUT
DRIVE_ERROR
DATABASE_ERROR
CONFLICT_ERROR
MISSING_SOURCE
```

---

# 40. Error Handling

Backend tidak boleh mengirim stack trace internal ke frontend.

Contoh user-facing:

```json
{
  "success": false,
  "error": {
    "code": "AI_REQUEST_FAILED",
    "message": "Analisis AI gagal diproses. Silakan coba lagi."
  }
}
```

Detail teknis masuk ke Apps Script log/audit internal.

---

# 41. Concurrency

Google Spreadsheet rentan terhadap penulisan bersamaan.

Untuk operasi penting gunakan:

```javascript
LockService.getScriptLock()
```

Contoh:

```javascript
const lock = LockService.getScriptLock();

lock.waitLock(30000);

try {
  // write database
} finally {
  lock.releaseLock();
}
```

Terutama untuk:

- generate ID;
- append batch;
- update status;
- generate draft;
- audit log.

---

# 42. Caching

Prototype dapat menggunakan:

```javascript
CacheService
```

untuk data yang jarang berubah:

- settings;
- sheet metadata;
- konfigurasi.

Jangan cache data editorial yang membutuhkan konsistensi real-time.

---

# 43. Security Model

Frontend:

```text
NO API KEY
NO SPREADSHEET ID
NO DRIVE CREDENTIAL
```

Backend:

```text
API KEY
DATABASE ID
DRIVE ROOT ID
```

disimpan di Script Properties.

---

# 44. Authentication Prototype

Untuk v0.1 jangan membangun authentication system kompleks.

Pilihan awal:

1. Web App dibatasi akun Google tertentu; atau
2. satu admin/reporter untuk prototype.

User identity dapat diperoleh dari environment Google bila tersedia.

Production nanti:

```text
Google OAuth / Supabase Auth
```

---

# 45. CORS / Web App

Karena frontend prototype akan berkomunikasi dengan Apps Script Web App:

```text
index.html
   ↓
fetch()
   ↓
Apps Script Web App URL
```

Frontend tidak boleh menyimpan secret.

Deployment Web App perlu dikonfigurasi sesuai model akses prototype.

---

# 46. API Action Registry

Daftar action v0.1:

```text
PROJECT
- createProject
- getProject
- listProjects
- updateProject
- archiveProject

SOURCE
- createSource
- getSources
- updateSource
- deleteSource

FACT
- createFact
- saveFacts
- getFacts
- updateFact
- verifyFact
- rejectFact
- analyzeFacts

PEOPLE
- createPerson
- getPeople
- updatePerson
- verifyPerson

QUOTE
- createQuote
- getQuotes
- updateQuote
- verifyQuote
- approveQuote
- rejectQuote

EVENT
- createEvent
- getEvents
- saveEvents
- updateEvent
- reorderEvents

NEWS VALUE
- analyzeNewsValue
- getNewsValue
- saveNewsValue

ANGLE
- generateAngles
- getAngles
- saveAngles
- selectAngle

STRUCTURE
- generateStructure
- getStructure
- saveStructure
- approveStructure

DRAFT
- generateDraftV1
- getDraft
- getDrafts
- createDraftV2
- approveDraft
- setFinalDraft

EDITORIAL
- runEditorialCheck
- getEditorialCheck
- resolveEditorialIssue
- approveEditorial

SEO
- generateSEO
- getSEO
- updateSEO
- approveSEO

MEDIA
- uploadMedia
- getMedia
- updateMedia
- deleteMedia
- setFeaturedMedia
- generateCaption

PUBLICATION
- createPublication
- getPublication
- markPublished
- unpublish
- archivePublication

SYSTEM
- getSettings
- healthCheck
```

---

# 47. Health Check

Action:

```text
healthCheck
```

Response:

```json
{
  "success": true,
  "data": {
    "app": "REPORTER AI",
    "version": "0.1",
    "database": "OK",
    "drive": "OK",
    "ai": "OK"
  }
}
```

Frontend dapat menampilkan:

```text
● Backend Online
● Database Online
● Drive Online
● AI Online
```

---

# 48. End-to-End Workflow

## Create Story

```text
createProject
    ↓
DriveService.createProjectFolder()
    ↓
SpreadsheetService.insert()
    ↓
AuditService.log()
```

## Fact Audit

```text
getFacts
    ↓
AIService.analyzeFacts
    ↓
validateAIOutput
    ↓
save audit findings
```

## Angle

```text
getVerifiedFacts
    ↓
AIService.generateAngles
    ↓
validate
    ↓
save ANGLES
```

## Draft

```text
verified facts
+
approved quotes
+
selected angle
+
approved structure
    ↓
AIService.generateDraft
    ↓
validate
    ↓
DRAFT V1
```

## Editorial

```text
DRAFT V1
+
verified facts
+
approved quotes
    ↓
AIService.editorialCheck
    ↓
EDITORIAL_CHECKS
```

## Draft V2

```text
V1
+
approved editorial changes
    ↓
AIService.generateDraft
    ↓
V2
```

## SEO

```text
FINAL DRAFT
    ↓
AIService.generateSEO
    ↓
SEO
```

---

# 49. Master News Package API

Action:

```text
getMasterPackage
```

Response:

```json
{
  "success": true,
  "data": {
    "project": {},
    "article": {},
    "seo": {},
    "featured_media": {},
    "photo_captions": [],
    "social_posts": [],
    "keywords": [],
    "tags": [],
    "category": {}
  }
}
```

Ini menjadi endpoint utama untuk halaman final.

---

# 50. Prototype Priority

Tidak semua service harus dibuat sekaligus.

## Sprint Backend 1

Wajib:

```text
Code.gs
Config.gs
Router.gs
Response.gs
Utils.gs
SpreadsheetService.gs
DriveService.gs
ProjectService.gs
FactService.gs
AuditService.gs
```

Target:

> Create project → Spreadsheet + Drive.

## Sprint Backend 2

```text
SourceService
PeopleService
QuoteService
EventService
AIService
PromptService
```

Target:

> Fact collection + AI Fact Audit.

## Sprint Backend 3

```text
AngleService
StructureService
DraftService
EditorialService
```

Target:

> Produksi Draft V1 → Editorial → V2.

## Sprint Backend 4

```text
SEOService
MediaService
PublicationService
```

Target:

> Master News Package.

---

# 51. Definition of Done — Backend v0.1

- [ ] Apps Script project dibuat.
- [ ] Spreadsheet ID tersimpan di Script Properties.
- [ ] Drive root ID tersimpan di Script Properties.
- [ ] Gemini API key tersimpan di Script Properties.
- [ ] `doGet()` berjalan.
- [ ] `doPost()` berjalan.
- [ ] Router berjalan.
- [ ] Response format konsisten.
- [ ] Project CRUD berjalan.
- [ ] Drive project folder otomatis dibuat.
- [ ] Facts dapat disimpan.
- [ ] Fact Audit dapat dipanggil.
- [ ] Quote Guard aktif.
- [ ] AI tidak dapat mengubah verification status secara otomatis.
- [ ] Draft V1 dapat dibuat.
- [ ] Editorial Check dapat dibuat.
- [ ] Draft V2 dapat dibuat.
- [ ] SEO dapat dibuat.
- [ ] Audit log berjalan.
- [ ] Health check berjalan.

---

# 52. Prinsip Arsitektur yang Tidak Boleh Dilanggar

### 1. Frontend bukan database.

### 2. Frontend tidak menyimpan API key.

### 3. AI bukan sumber kebenaran.

### 4. AI tidak melakukan verification final.

### 5. Direct quote harus memiliki source.

### 6. Draft selalu versioned.

### 7. Konflik fakta tidak diselesaikan dengan tebakan.

### 8. Semua operasi penting dapat diaudit.

### 9. Service layer menjadi perantara database/AI/Drive.

### 10. Prototype harus mudah dimigrasikan ke Supabase.

---

# 53. Future Migration

Arsitektur backend sengaja menggunakan abstraction:

```text
SpreadsheetService
DriveService
AIService
```

Pada production:

```text
SpreadsheetService
       ↓
SupabaseService

DriveService
       ↓
Supabase Storage / Cloud Storage

AIService
       ↓
AI Provider Layer
```

Frontend tidak perlu mengetahui perubahan tersebut.

---

# 54. Status Dokumen

**REPORTER AI — Backend Blueprint v0.1**

> **READY FOR PROTOTYPE IMPLEMENTATION**

Backend Blueprint ini menjadi kontrak teknis antara:

```text
Frontend
   ↕
Apps Script API
   ↕
Service Layer
   ↕
Spreadsheet
   ↕
Google Drive

AIService
   ↕
Gemini API
```

Tahap berikutnya:

**STEP 3 — FRONTEND BLUEPRINT v0.1**

Dokumen tersebut akan mendefinisikan seluruh halaman, layout, navigation, component, state, form, modal, table, workflow screen, loading state, error state, dan kontrak data yang harus digunakan oleh `index.html`.
