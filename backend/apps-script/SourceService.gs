/**
 * REPORTER AI — Apps Script Backend Foundation
 * File: SourceService.gs
 * Description: Authoritative server-side management for SOURCES (evidence repository).
 * SECURITY & INTEGRITY:
 *   - Sources represent verifiable evidence (interviews, documents, observation, media).
 *   - AI is NEVER an evidence source of truth.
 *   - Sources must be strictly bound to an existing project (no orphan sources).
 *   - Sources referenced by dependent facts or quotes cannot be deleted (conflict protection).
 */

const SourceService = {
  /**
   * Canonical source types from DATABASE_SCHEMA.md
   */
  SOURCE_TYPES: [
    'OBSERVATION',
    'INTERVIEW',
    'DOCUMENT',
    'PRESS_RELEASE',
    'MEDIA'
  ],

  /**
   * Reliability levels
   */
  RELIABILITY_LEVELS: [
    'HIGH',
    'MEDIUM',
    'LOW'
  ],

  /**
   * Whitelist of mutable fields for updateSource
   */
  MUTABLE_FIELDS: [
    'source_type',
    'title',
    'description',
    'source_person',
    'source_date',
    'file_id',
    'file_url',
    'raw_text',
    'reliability'
  ],

  /**
   * Protected fields that cannot be altered via updateSource
   */
  PROTECTED_FIELDS: [
    'source_id',
    'project_id',
    'created_at'
  ],

  /**
   * Create a new source record in SOURCES sheet.
   * Strictly confirms project existence and generates authoritative server ID and timestamps.
   * @param {Object} payload
   * @returns {Object} Authoritative created source record
   */
  createSource(payload = {}) {
    // 1. Validate project_id and confirm project exists
    const rawProjectId = payload.project_id || payload.projectId;
    if (!Utils.isNonEmptyString(rawProjectId)) {
      const err = new Error('Field "project_id" is required to create a source.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }
    const cleanProjectId = String(rawProjectId).trim();
    ProjectService.getProject(cleanProjectId); // Throws NOT_FOUND if absent

    // 2. Validate required source fields
    const rawTitle = payload.title !== undefined ? String(payload.title).trim() : '';
    if (!rawTitle) {
      const err = new Error('Field "title" is required for a source evidence record.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    // 3. Normalize source_type
    let sourceType = 'OBSERVATION';
    if (payload.source_type && typeof payload.source_type === 'string') {
      const upper = payload.source_type.trim().toUpperCase();
      if (this.SOURCE_TYPES.includes(upper)) {
        sourceType = upper;
      }
    }

    // 4. Normalize reliability
    let reliability = 'MEDIUM';
    if (payload.reliability && typeof payload.reliability === 'string') {
      const upper = payload.reliability.trim().toUpperCase();
      if (this.RELIABILITY_LEVELS.includes(upper)) {
        reliability = upper;
      }
    }

    // 5. Generate authoritative attributes
    const sourceId = Utils.generateId('SRC');
    const now = Utils.nowIso();

    const record = {
      source_id: sourceId,
      project_id: cleanProjectId,
      source_type: sourceType,
      title: rawTitle,
      description: payload.description ? String(payload.description).trim() : '',
      source_person: payload.source_person ? String(payload.source_person).trim() : '',
      source_date: payload.source_date ? String(payload.source_date).trim() : now,
      file_id: payload.file_id ? String(payload.file_id).trim() : null,
      file_url: payload.file_url ? String(payload.file_url).trim() : null,
      raw_text: payload.raw_text ? String(payload.raw_text).trim() : '',
      reliability: reliability,
      created_at: now
    };

    SpreadsheetService.appendRecord(DatabaseSheets.SOURCES, record);
    this._recordAudit('CREATE_SOURCE', sourceId, { project_id: cleanProjectId, title: rawTitle });

    return record;
  },

  /**
   * Retrieve a source record by its unique ID.
   * @param {string} sourceId
   * @returns {Object} Authoritative source record
   */
  getSource(sourceId) {
    if (!Utils.isNonEmptyString(sourceId)) {
      const err = new Error('Field "sourceId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(sourceId).trim();
    const record = SpreadsheetService.findRecordById(DatabaseSheets.SOURCES, cleanId);

    if (!record) {
      const err = new Error(`Source with ID "${cleanId}" was not found.`);
      err.code = ErrorCodes.NOT_FOUND;
      throw err;
    }

    return record;
  },

  /**
   * Retrieve all sources matching optional filter criteria.
   * @param {Object} [filter] Optional filters e.g. { project_id, source_type }
   * @returns {Object[]} List of matching source records
   */
  getSources(filter = {}) {
    let items = SpreadsheetService.getAllRecords(DatabaseSheets.SOURCES);

    if (filter) {
      const filterProjectId = filter.project_id || filter.projectId;
      if (filterProjectId && typeof filterProjectId === 'string') {
        const cleanProjId = filterProjectId.trim();
        items = items.filter(s => s.project_id === cleanProjId);
      }

      if (filter.source_type && typeof filter.source_type === 'string') {
        const targetType = filter.source_type.trim().toUpperCase();
        items = items.filter(s => s.source_type === targetType);
      }

      if (filter.reliability && typeof filter.reliability === 'string') {
        const targetRel = filter.reliability.trim().toUpperCase();
        items = items.filter(s => s.reliability === targetRel);
      }
    }

    return items;
  },

  /**
   * Update mutable fields of an existing source.
   * Protected fields (source_id, project_id, created_at) are strictly ignored.
   * @param {string} sourceId
   * @param {Object} updates
   * @returns {Object} Authoritative updated source record
   */
  updateSource(sourceId, updates = {}) {
    if (!Utils.isNonEmptyString(sourceId)) {
      const err = new Error('Field "sourceId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(sourceId).trim();
    const existing = this.getSource(cleanId); // Asserts existence

    const sanitizedUpdates = {};
    for (const field of this.MUTABLE_FIELDS) {
      if (updates[field] !== undefined) {
        if (field === 'source_type') {
          const upper = String(updates[field]).trim().toUpperCase();
          if (this.SOURCE_TYPES.includes(upper)) {
            sanitizedUpdates[field] = upper;
          }
        } else if (field === 'reliability') {
          const upper = String(updates[field]).trim().toUpperCase();
          if (this.RELIABILITY_LEVELS.includes(upper)) {
            sanitizedUpdates[field] = upper;
          }
        } else {
          sanitizedUpdates[field] = updates[field];
        }
      }
    }

    const updated = SpreadsheetService.updateRecordById(
      DatabaseSheets.SOURCES,
      cleanId,
      sanitizedUpdates
    );

    this._recordAudit('UPDATE_SOURCE', cleanId, { updatedFields: Object.keys(sanitizedUpdates) });

    return updated;
  },

  /**
   * Delete an existing source record safely.
   * Rejects deletion with CONFLICT if facts or quotes still reference this evidence.
   * @param {string} sourceId
   * @returns {Object} Deletion confirmation
   */
  deleteSource(sourceId) {
    if (!Utils.isNonEmptyString(sourceId)) {
      const err = new Error('Field "sourceId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(sourceId).trim();
    const existing = this.getSource(cleanId); // Confirms existence

    // 1. Dependency check in FACTS
    const allFacts = SpreadsheetService.getAllRecords(DatabaseSheets.FACTS);
    const referencingFacts = allFacts.filter(f => String(f.source_id) === cleanId);
    if (referencingFacts.length > 0) {
      const err = new Error(
        `Cannot delete source "${cleanId}" because it is referenced by ${referencingFacts.length} fact(s) (e.g. ${referencingFacts[0].fact_id}). Reassign or delete referencing facts first.`
      );
      err.code = ErrorCodes.CONFLICT;
      throw err;
    }

    // 2. Dependency check in QUOTES
    const allQuotes = SpreadsheetService.getAllRecords(DatabaseSheets.QUOTES);
    const referencingQuotes = allQuotes.filter(q => String(q.source_id) === cleanId);
    if (referencingQuotes.length > 0) {
      const err = new Error(
        `Cannot delete source "${cleanId}" because it is referenced by ${referencingQuotes.length} quote(s) (e.g. ${referencingQuotes[0].quote_id}). Reassign or delete referencing quotes first.`
      );
      err.code = ErrorCodes.CONFLICT;
      throw err;
    }

    SpreadsheetService.deleteRecordById(DatabaseSheets.SOURCES, cleanId);
    this._recordAudit('DELETE_SOURCE', cleanId, { project_id: existing.project_id });

    return {
      success: true,
      deleted_id: cleanId,
      message: `Source "${cleanId}" was deleted successfully.`
    };
  },

  /**
   * Internal lightweight audit hook preparing for future AuditService.
   * @private
   */
  _recordAudit(action, sourceId, metadata = {}) {
    try {
      Utils.logServer(action, 'AUDIT_HOOK', { sourceId, ...metadata });
    } catch (e) {
      // Non-blocking
    }
  }
};
