/**
 * REPORTER AI — Apps Script Backend Foundation
 * File: PeopleService.gs
 * Description: Authoritative server-side management for PEOPLE (figures, interviewees, and officials).
 * SECURITY & INTEGRITY:
 *   - Every person must be project-scoped to an existing NEWS_PROJECTS record.
 *   - Cross-project source attachments are strictly forbidden.
 *   - Human-in-the-loop verification (verifyPerson) cannot be bypassed by client flags.
 */

const PeopleService = {
  /**
   * Authoritative verification statuses
   */
  STATUS: {
    UNVERIFIED: 'UNVERIFIED',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED'
  },

  /**
   * Whitelist of mutable fields for updatePerson
   */
  MUTABLE_FIELDS: [
    'name',
    'role',
    'organization',
    'location',
    'bio',
    'source_id',
    'notes'
  ],

  /**
   * Protected fields that cannot be altered via updatePerson
   */
  PROTECTED_FIELDS: [
    'person_id',
    'project_id',
    'created_at',
    'verification_status'
  ],

  /**
   * Create a new person record in the PEOPLE sheet.
   * Strictly verifies project existence and enforces server-generated ID and timestamps.
   * Initial verification status is always UNVERIFIED.
   * @param {Object} payload
   * @returns {Object} Authoritative created person record
   */
  createPerson(payload = {}) {
    // 1. Validate project_id
    const rawProjectId = payload.project_id || payload.projectId;
    if (!Utils.isNonEmptyString(rawProjectId)) {
      const err = new Error('Field "project_id" is required to create a person.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }
    const cleanProjectId = String(rawProjectId).trim();
    ProjectService.getProject(cleanProjectId); // Throws NOT_FOUND if absent

    // 2. Validate person name
    const rawName = payload.name !== undefined ? String(payload.name).trim() : '';
    if (!rawName) {
      const err = new Error('Field "name" is required for a person record.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    // 3. Optional source_id validation (same-project provenance)
    let cleanSourceId = null;
    const rawSourceId = payload.source_id || payload.sourceId;
    if (Utils.isNonEmptyString(rawSourceId)) {
      cleanSourceId = String(rawSourceId).trim();
      const source = SourceService.getSource(cleanSourceId);
      if (String(source.project_id) !== cleanProjectId) {
        const err = new Error(
          `Cross-project source reference is forbidden. Source "${cleanSourceId}" belongs to project "${source.project_id}", but person is declared for project "${cleanProjectId}".`
        );
        err.code = ErrorCodes.VALIDATION_ERROR;
        throw err;
      }
    }

    // 4. Generate authoritative attributes
    const personId = Utils.generateId('PERSON');
    const now = Utils.nowIso();

    const record = {
      person_id: personId,
      project_id: cleanProjectId,
      name: rawName,
      role: payload.role ? String(payload.role).trim() : '',
      organization: payload.organization ? String(payload.organization).trim() : '',
      location: payload.location ? String(payload.location).trim() : '',
      bio: payload.bio ? String(payload.bio).trim() : '',
      source_id: cleanSourceId,
      verification_status: this.STATUS.UNVERIFIED, // Server authority: ALWAYS UNVERIFIED initially
      notes: payload.notes ? String(payload.notes).trim() : '',
      created_at: now
    };

    SpreadsheetService.appendRecord(DatabaseSheets.PEOPLE, record);
    this._recordAudit('CREATE_PERSON', personId, { project_id: cleanProjectId, name: rawName });

    return record;
  },

  /**
   * Retrieve a person by person_id.
   * @param {string} personId
   * @returns {Object} Authoritative person record
   */
  getPerson(personId) {
    if (!Utils.isNonEmptyString(personId)) {
      const err = new Error('Field "personId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(personId).trim();
    const record = SpreadsheetService.findRecordById(DatabaseSheets.PEOPLE, cleanId);

    if (!record) {
      const err = new Error(`Person with ID "${cleanId}" was not found.`);
      err.code = ErrorCodes.NOT_FOUND;
      throw err;
    }

    return record;
  },

  /**
   * Retrieve people matching optional filter criteria.
   * @param {Object} [filter] e.g. { project_id, source_id, verification_status }
   * @returns {Object[]}
   */
  getPeople(filter = {}) {
    let items = SpreadsheetService.getAllRecords(DatabaseSheets.PEOPLE);

    if (filter) {
      const filterProjectId = filter.project_id || filter.projectId;
      if (filterProjectId && typeof filterProjectId === 'string') {
        const cleanProjId = filterProjectId.trim();
        items = items.filter(p => p.project_id === cleanProjId);
      }

      const filterSourceId = filter.source_id || filter.sourceId;
      if (filterSourceId && typeof filterSourceId === 'string') {
        const cleanSrcId = filterSourceId.trim();
        items = items.filter(p => p.source_id === cleanSrcId);
      }

      if (filter.verification_status && typeof filter.verification_status === 'string') {
        const targetStatus = filter.verification_status.trim().toUpperCase();
        items = items.filter(p => p.verification_status === targetStatus);
      }
    }

    return items;
  },

  /**
   * Update mutable fields of an existing person record.
   * Protected fields (person_id, project_id, created_at, verification_status) are shielded.
   * @param {string} personId
   * @param {Object} updates
   * @returns {Object} Authoritative updated person record
   */
  updatePerson(personId, updates = {}) {
    if (!Utils.isNonEmptyString(personId)) {
      const err = new Error('Field "personId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(personId).trim();
    const existing = this.getPerson(cleanId);

    const sanitizedUpdates = {};

    // Validate new source_id if updated
    if (updates.source_id !== undefined && updates.source_id !== existing.source_id) {
      if (updates.source_id === null || updates.source_id === '') {
        sanitizedUpdates.source_id = null;
      } else {
        const newSourceId = String(updates.source_id).trim();
        const newSource = SourceService.getSource(newSourceId);
        if (String(newSource.project_id) !== String(existing.project_id)) {
          const err = new Error(
            `Cross-project source reference is forbidden. Source "${newSourceId}" belongs to project "${newSource.project_id}", but person belongs to "${existing.project_id}".`
          );
          err.code = ErrorCodes.VALIDATION_ERROR;
          throw err;
        }
        sanitizedUpdates.source_id = newSourceId;
      }
    }

    for (const field of this.MUTABLE_FIELDS) {
      if (field === 'source_id') continue;
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    const updated = SpreadsheetService.updateRecordById(
      DatabaseSheets.PEOPLE,
      cleanId,
      sanitizedUpdates
    );

    this._recordAudit('UPDATE_PERSON', cleanId, { updatedFields: Object.keys(sanitizedUpdates) });

    return updated;
  },

  /**
   * Authoritatively verify a person record.
   * @param {string} personId
   * @returns {Object} Authoritative updated person record
   */
  verifyPerson(personId) {
    if (!Utils.isNonEmptyString(personId)) {
      const err = new Error('Field "personId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(personId).trim();
    const existing = this.getPerson(cleanId);

    if (existing.verification_status === this.STATUS.REJECTED) {
      const err = new Error(`Cannot verify person "${cleanId}" because status is REJECTED.`);
      err.code = ErrorCodes.CONFLICT;
      throw err;
    }

    const updates = {
      verification_status: this.STATUS.VERIFIED
    };

    const updated = SpreadsheetService.updateRecordById(
      DatabaseSheets.PEOPLE,
      cleanId,
      updates
    );

    this._recordAudit('VERIFY_PERSON', cleanId, { verification_status: this.STATUS.VERIFIED });

    return updated;
  },

  /**
   * Internal lightweight audit hook.
   * @private
   */
  _recordAudit(action, personId, metadata = {}) {
    try {
      Utils.logServer(action, 'AUDIT_HOOK', { personId, ...metadata });
    } catch (e) {
      // Non-blocking
    }
  }
};
