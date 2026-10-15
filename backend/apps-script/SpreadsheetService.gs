/**
 * REPORTER AI — Apps Script Backend Foundation
 * File: SpreadsheetService.gs
 * Description: Authoritative database abstraction layer for Google Spreadsheet.
 * SECURITY & CONCURRENCY: Uses LockService for writes; never scatters raw SpreadsheetApp calls.
 */

const DatabaseSheets = {
  NEWS_PROJECTS: 'NEWS_PROJECTS',
  SOURCES: 'SOURCES',
  FACTS: 'FACTS',
  PEOPLE: 'PEOPLE',
  QUOTES: 'QUOTES',
  EVENTS: 'EVENTS',
  NEWS_VALUES: 'NEWS_VALUES',
  ANGLES: 'ANGLES',
  STRUCTURES: 'STRUCTURES',
  DRAFTS: 'DRAFTS',
  EDITORIAL_CHECKS: 'EDITORIAL_CHECKS',
  SEO: 'SEO',
  MEDIA: 'MEDIA',
  PUBLICATIONS: 'PUBLICATIONS',
  USERS: 'USERS',
  SETTINGS: 'SETTINGS',
  AUDIT_LOGS: 'AUDIT_LOGS'
};

const CanonicalSchemas = {
  NEWS_PROJECTS: [
    'project_id', 'created_at', 'updated_at', 'title', 'slug', 'story_type',
    'category', 'event_date', 'event_time', 'location', 'organization',
    'reporter_id', 'editor_id', 'status', 'current_stage', 'selected_angle_id',
    'featured_media_id', 'final_draft_id', 'notes'
  ],
  SOURCES: [
    'source_id', 'project_id', 'source_type', 'title', 'description',
    'source_person', 'source_date', 'file_id', 'file_url', 'raw_text',
    'reliability', 'created_at'
  ],
  FACTS: [
    'fact_id', 'project_id', 'source_id', 'fact_type', 'fact_text',
    'value', 'confidence', 'verification_status', 'verified_by',
    'verified_at', 'notes', 'created_at', 'updated_at'
  ],
  PEOPLE: [
    'person_id', 'project_id', 'name', 'role', 'organization',
    'location', 'bio', 'source_id', 'verification_status', 'notes', 'created_at'
  ],
  QUOTES: [
    'quote_id', 'project_id', 'person_id', 'source_id', 'quote_text',
    'quote_type', 'verification_status', 'approved_for_publication', 'notes', 'created_at'
  ],
  EVENTS: [
    'event_id', 'project_id', 'source_id', 'sequence', 'event_time',
    'activity', 'description', 'verification_status', 'created_at'
  ],
  NEWS_VALUES: [
    'value_id', 'project_id', 'magnitude', 'proximity', 'prominence',
    'human_interest', 'novelty', 'continuity', 'conflict', 'analysis',
    'generated_at', 'reviewed_by'
  ],
  ANGLES: [
    'angle_id', 'project_id', 'angle_title', 'angle_description',
    'supporting_facts', 'risks', 'selected', 'selected_at', 'created_at'
  ],
  STRUCTURES: [
    'structure_id', 'project_id', 'angle_id', 'lead_plan', 'nut_graph',
    'body_plan', 'closing_plan', 'approved', 'created_at'
  ],
  DRAFTS: [
    'draft_id', 'project_id', 'version', 'title', 'content',
    'source_angle_id', 'status', 'created_by', 'created_at',
    'parent_draft_id', 'editorial_notes'
  ],
  EDITORIAL_CHECKS: [
    'check_id', 'project_id', 'draft_id', 'accuracy_status', 'structure_status',
    'quote_integrity_status', 'unsupported_claim_status', 'redundancy_status',
    'language_status', 'promotional_tone_status', 'issues', 'recommendations',
    'overall_status', 'checked_at', 'reviewed_by'
  ],
  SEO: [
    'seo_id', 'project_id', 'draft_id', 'seo_title', 'slug',
    'focus_keyword', 'secondary_keywords', 'meta_description', 'excerpt',
    'category', 'tags', 'generated_at', 'approved'
  ],
  MEDIA: [
    'media_id', 'project_id', 'source_id', 'file_id', 'file_name',
    'file_url', 'media_type', 'caption', 'alt_text', 'is_featured',
    'sort_order', 'uploaded_at'
  ],
  PUBLICATIONS: [
    'publication_id', 'project_id', 'draft_id', 'published_title',
    'published_url', 'platform', 'published_at', 'published_by',
    'status', 'notes'
  ],
  USERS: [
    'user_id', 'name', 'email', 'role', 'status', 'created_at', 'last_login'
  ],
  SETTINGS: [
    'setting_key', 'setting_value', 'description', 'updated_at'
  ],
  AUDIT_LOGS: [
    'log_id', 'project_id', 'user_id', 'action', 'entity_type',
    'entity_id', 'old_value', 'new_value', 'created_at'
  ]
};

const SheetIdColumns = {
  NEWS_PROJECTS: 'project_id',
  SOURCES: 'source_id',
  FACTS: 'fact_id',
  PEOPLE: 'person_id',
  QUOTES: 'quote_id',
  EVENTS: 'event_id',
  NEWS_VALUES: 'value_id',
  ANGLES: 'angle_id',
  STRUCTURES: 'structure_id',
  DRAFTS: 'draft_id',
  EDITORIAL_CHECKS: 'check_id',
  SEO: 'seo_id',
  MEDIA: 'media_id',
  PUBLICATIONS: 'publication_id',
  USERS: 'user_id',
  SETTINGS: 'setting_key',
  AUDIT_LOGS: 'log_id'
};

const SpreadsheetService = {
  /**
   * Internal cache for the open Spreadsheet instance
   * @private
   */
  _dbInstance: null,

  /**
   * Open and return the authoritative Google Spreadsheet database.
   * Controlled error thrown if ID is missing or Spreadsheet is inaccessible.
   * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
   */
  getDatabase() {
    if (this._dbInstance) {
      return this._dbInstance;
    }

    const spreadsheetId = Config.getSpreadsheetId();
    if (!spreadsheetId) {
      const err = new Error('Database configuration missing: REPORTER_AI_SPREADSHEET_ID is not configured.');
      err.code = ErrorCodes.CONFIG_ERROR;
      throw err;
    }

    if (typeof SpreadsheetApp === 'undefined') {
      const err = new Error('SpreadsheetApp service is unavailable in this environment.');
      err.code = ErrorCodes.DATABASE_ERROR;
      throw err;
    }

    try {
      this._dbInstance = SpreadsheetApp.openById(spreadsheetId);
      return this._dbInstance;
    } catch (err) {
      const error = new Error(`Failed to access database spreadsheet: ${Utils.sanitizeErrorMessage(err)}`);
      error.code = ErrorCodes.DATABASE_ERROR;
      throw error;
    }
  },

  /**
   * Get a specific sheet by name
   * @param {string} sheetName 
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  getSheet(sheetName) {
    const db = this.getDatabase();
    const sheet = db.getSheetByName(sheetName);
    if (!sheet) {
      const err = new Error(`Database sheet "${sheetName}" was not found.`);
      err.code = ErrorCodes.NOT_FOUND;
      throw err;
    }
    return sheet;
  },

  /**
   * Ensure a sheet exists with specified canonical headers
   * @param {string} sheetName 
   * @param {string[]} [headers] Optional custom headers; falls back to CanonicalSchemas
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  ensureSheet(sheetName, headers = null) {
    const db = this.getDatabase();
    let sheet = db.getSheetByName(sheetName);
    const expectedHeaders = headers || CanonicalSchemas[sheetName];

    if (!sheet) {
      sheet = db.insertSheet(sheetName);
      if (expectedHeaders && expectedHeaders.length > 0) {
        sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
        sheet.setFrozenRows(1);
      }
    } else if (expectedHeaders && expectedHeaders.length > 0 && sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      sheet.setFrozenRows(1);
    }

    return sheet;
  },

  /**
   * Retrieve header names for a sheet
   * @param {string} sheetName 
   * @returns {string[]}
   */
  getHeaders(sheetName) {
    const sheet = this.getSheet(sheetName);
    if (sheet.getLastRow() < 1) {
      return CanonicalSchemas[sheetName] || [];
    }
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    const values = headerRange.getValues();
    return values[0].map(h => String(h).trim());
  },

  /**
   * Retrieve all records from a sheet as mapped objects
   * @param {string} sheetName 
   * @returns {Object[]}
   */
  getAllRecords(sheetName) {
    this.ensureSheet(sheetName);
    const sheet = this.getSheet(sheetName);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow <= 1 || lastCol < 1) {
      return [];
    }

    const headers = this.getHeaders(sheetName);
    const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    const rawRows = dataRange.getValues();

    return rawRows.map(row => {
      const record = {};
      headers.forEach((header, index) => {
        let val = row[index];
        // Parse JSON fields if formatted as serialized JSON strings
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          val = Utils.safeJsonParse(val, val);
        }
        record[header] = val !== undefined ? val : null;
      });
      return record;
    });
  },

  /**
   * Find a record by its unique ID
   * @param {string} sheetName 
   * @param {string} id 
   * @param {string} [idColumnName] 
   * @returns {Object|null}
   */
  findRecordById(sheetName, id, idColumnName = null) {
    const colName = idColumnName || SheetIdColumns[sheetName] || 'id';
    const records = this.getAllRecords(sheetName);
    const match = records.find(r => String(r[colName]) === String(id));
    return match || null;
  },

  /**
   * Append a single record to a sheet using LockService for concurrency control
   * @param {string} sheetName 
   * @param {Object} record 
   * @returns {Object} Appended record
   */
  appendRecord(sheetName, record) {
    const lock = (typeof LockService !== 'undefined' && LockService.getScriptLock) ? LockService.getScriptLock() : null;
    let lockAcquired = false;

    try {
      if (lock) {
        lockAcquired = lock.tryLock(10000); // Wait up to 10 seconds
        if (!lockAcquired) {
          const err = new Error(`Server lock timeout while appending record to ${sheetName}. Please retry.`);
          err.code = ErrorCodes.CONFLICT;
          throw err;
        }
      }

      this.ensureSheet(sheetName);
      const sheet = this.getSheet(sheetName);
      const headers = this.getHeaders(sheetName);

      const rowValues = headers.map(header => {
        let val = record[header];
        if (val === undefined || val === null) {
          return '';
        }
        if (typeof val === 'object') {
          return JSON.stringify(val);
        }
        return val;
      });

      sheet.appendRow(rowValues);
      return record;
    } finally {
      if (lock && lockAcquired) {
        try {
          lock.releaseLock();
        } catch (e) {}
      }
    }
  },

  /**
   * Update an existing record by ID using LockService for concurrency control
   * @param {string} sheetName 
   * @param {string} id 
   * @param {Object} updates 
   * @param {string} [idColumnName] 
   * @returns {Object} Updated record
   */
  updateRecordById(sheetName, id, updates, idColumnName = null) {
    const colName = idColumnName || SheetIdColumns[sheetName] || 'id';
    const lock = (typeof LockService !== 'undefined' && LockService.getScriptLock) ? LockService.getScriptLock() : null;
    let lockAcquired = false;

    try {
      if (lock) {
        lockAcquired = lock.tryLock(10000); // Wait up to 10 seconds
        if (!lockAcquired) {
          const err = new Error(`Server lock timeout while updating record ${id} in ${sheetName}. Please retry.`);
          err.code = ErrorCodes.CONFLICT;
          throw err;
        }
      }

      const sheet = this.getSheet(sheetName);
      const headers = this.getHeaders(sheetName);
      const idColIndex = headers.indexOf(colName);

      if (idColIndex === -1) {
        const err = new Error(`ID column "${colName}" not found in sheet ${sheetName}.`);
        err.code = ErrorCodes.DATABASE_ERROR;
        throw err;
      }

      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        const err = new Error(`Record with ${colName} "${id}" not found in sheet ${sheetName}.`);
        err.code = ErrorCodes.NOT_FOUND;
        throw err;
      }

      // Read ID column values
      const idRange = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1);
      const idValues = idRange.getValues();

      let targetRowIndex = -1;
      for (let i = 0; i < idValues.length; i++) {
        if (String(idValues[i][0]) === String(id)) {
          targetRowIndex = i + 2; // 1-indexed, starting after header row
          break;
        }
      }

      if (targetRowIndex === -1) {
        const err = new Error(`Record with ${colName} "${id}" not found in sheet ${sheetName}.`);
        err.code = ErrorCodes.NOT_FOUND;
        throw err;
      }

      // Read current row
      const rowRange = sheet.getRange(targetRowIndex, 1, 1, headers.length);
      const currentRowValues = rowRange.getValues()[0];
      const mergedRecord = {};

      headers.forEach((h, idx) => {
        mergedRecord[h] = currentRowValues[idx];
      });

      // Apply updates
      Object.keys(updates).forEach(key => {
        if (headers.includes(key)) {
          mergedRecord[key] = updates[key];
        }
      });

      // Write updated row
      const updatedRowValues = headers.map(header => {
        let val = mergedRecord[header];
        if (val === undefined || val === null) {
          return '';
        }
        if (typeof val === 'object') {
          return JSON.stringify(val);
        }
        return val;
      });

      rowRange.setValues([updatedRowValues]);
      return mergedRecord;
    } finally {
      if (lock && lockAcquired) {
        try {
          lock.releaseLock();
        } catch (e) {}
      }
    }
  },

  /**
   * Delete a record by ID using LockService for concurrency control
   * @param {string} sheetName 
   * @param {string} id 
   * @param {string} [idColumnName] 
   * @returns {Object} Deletion confirmation with deletedId
   */
  deleteRecordById(sheetName, id, idColumnName = null) {
    const colName = idColumnName || SheetIdColumns[sheetName] || 'id';
    const lock = (typeof LockService !== 'undefined' && LockService.getScriptLock) ? LockService.getScriptLock() : null;
    let lockAcquired = false;

    try {
      if (lock) {
        lockAcquired = lock.tryLock(10000);
        if (!lockAcquired) {
          const err = new Error(`Server lock timeout while deleting record ${id} from ${sheetName}. Please retry.`);
          err.code = ErrorCodes.CONFLICT;
          throw err;
        }
      }

      this.ensureSheet(sheetName);
      const sheet = this.getSheet(sheetName);
      const headers = this.getHeaders(sheetName);
      const idColIndex = headers.indexOf(colName);

      if (idColIndex === -1) {
        const err = new Error(`ID column "${colName}" not found in sheet ${sheetName}.`);
        err.code = ErrorCodes.DATABASE_ERROR;
        throw err;
      }

      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        const err = new Error(`Record with ${colName} "${id}" not found in sheet ${sheetName}.`);
        err.code = ErrorCodes.NOT_FOUND;
        throw err;
      }

      const idRange = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1);
      const idValues = idRange.getValues();

      let targetRowIndex = -1;
      for (let i = 0; i < idValues.length; i++) {
        if (String(idValues[i][0]) === String(id)) {
          targetRowIndex = i + 2; // 1-indexed (header is row 1)
          break;
        }
      }

      if (targetRowIndex === -1) {
        const err = new Error(`Record with ${colName} "${id}" not found in sheet ${sheetName}.`);
        err.code = ErrorCodes.NOT_FOUND;
        throw err;
      }

      sheet.deleteRow(targetRowIndex);
      return { success: true, deletedId: id, sheetName: sheetName };
    } finally {
      if (lock && lockAcquired) {
        try {
          lock.releaseLock();
        } catch (e) {}
      }
    }
  },

  /**
   * Helper to ensure all 17 canonical sheets exist in the spreadsheet
   */
  initializeAllSheets() {
    Object.keys(CanonicalSchemas).forEach(sheetName => {
      this.ensureSheet(sheetName);
    });
  }
};
