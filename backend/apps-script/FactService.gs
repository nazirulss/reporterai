/**
 * REPORTER AI — Apps Script Backend Foundation
 * File: FactService.gs
 * Description: Authoritative server-side management for FACTS and evidence provenance.
 * SECURITY & INTEGRITY:
 *   - Every fact must have valid source provenance within the same project.
 *   - Cross-project source references are strictly blocked.
 *   - AI is NEVER the source of truth; client cannot force VERIFIED.
 *   - State machine: UNVERIFIED -> VERIFIED / REJECTED / CONFLICT.
 *   - CONFLICT or REJECTED facts can NEVER be treated as VERIFIED.
 *   - Centralized Editorial Invalidation: modifying verified text resets verification.
 */

const FactService = {
  /**
   * Canonical fact types from DATABASE_SCHEMA.md
   */
  FACT_TYPES: [
    'EVENT_NAME',
    'DATE',
    'TIME',
    'LOCATION',
    'ORGANIZATION',
    'ATTENDANCE',
    'PURPOSE',
    'QUOTE',
    'CHRONOLOGY',
    'STATISTIC',
    'OTHER'
  ],

  /**
   * Authoritative verification statuses
   */
  STATUS: {
    UNVERIFIED: 'UNVERIFIED',
    VERIFIED: 'VERIFIED',
    CONFLICT: 'CONFLICT',
    REJECTED: 'REJECTED'
  },

  /**
   * Confidence levels
   */
  CONFIDENCE_LEVELS: [
    'HIGH',
    'MEDIUM',
    'LOW'
  ],

  /**
   * Whitelist of mutable fields for updateFact
   */
  MUTABLE_FIELDS: [
    'fact_type',
    'fact_text',
    'value',
    'confidence',
    'source_id',
    'notes'
  ],

  /**
   * Protected fields that cannot be altered via updateFact
   */
  PROTECTED_FIELDS: [
    'fact_id',
    'project_id',
    'created_at',
    'updated_at',
    'verification_status',
    'verified_by',
    'verified_at'
  ],

  /**
   * Helper: Check if a fact record is officially verified
   * @param {Object} fact
   * @returns {boolean}
   */
  isFactVerified(fact) {
    return Boolean(fact && fact.verification_status === this.STATUS.VERIFIED);
  },

  /**
   * Helper: Check if a fact has valid source provenance
   * @param {Object} fact
   * @param {Object} [source] Optional source record if already fetched
   * @returns {boolean}
   */
  hasValidProvenance(fact, source = null) {
    if (!fact || !Utils.isNonEmptyString(fact.source_id)) {
      return false;
    }
    if (source) {
      return String(source.source_id) === String(fact.source_id) &&
             String(source.project_id) === String(fact.project_id);
    }
    return true;
  },

  /**
   * Helper: Check if a fact is strictly usable for drafting (VERIFIED + valid provenance)
   * @param {Object} fact
   * @param {Object} [source]
   * @returns {boolean}
   */
  isFactUsable(fact, source = null) {
    return this.isFactVerified(fact) && this.hasValidProvenance(fact, source);
  },

  /**
   * Create a new structured fact in FACTS sheet.
   * Strictly validates project existence, source existence, and same-project provenance.
   * Client-supplied verification flags are strictly ignored; initial status is always UNVERIFIED.
   * @param {Object} payload
   * @returns {Object} Authoritative created fact record
   */
  createFact(payload = {}) {
    // 1. Validate project_id and confirm project exists
    const rawProjectId = payload.project_id || payload.projectId;
    if (!Utils.isNonEmptyString(rawProjectId)) {
      const err = new Error('Field "project_id" is required to create a fact.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }
    const cleanProjectId = String(rawProjectId).trim();
    ProjectService.getProject(cleanProjectId); // Throws NOT_FOUND if absent

    // 2. Validate source_id and verify same-project provenance
    const rawSourceId = payload.source_id || payload.sourceId;
    if (!Utils.isNonEmptyString(rawSourceId)) {
      const err = new Error('Field "source_id" is required. Every fact must have evidence provenance.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }
    const cleanSourceId = String(rawSourceId).trim();
    const source = SourceService.getSource(cleanSourceId); // Throws NOT_FOUND if absent

    if (String(source.project_id) !== cleanProjectId) {
      const err = new Error(
        `Cross-project source reference is forbidden. Source "${cleanSourceId}" belongs to project "${source.project_id}", but fact is declared for project "${cleanProjectId}".`
      );
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    // 3. Validate factual claim statement
    const rawFactText = payload.fact_text !== undefined ? String(payload.fact_text).trim() : '';
    if (!rawFactText) {
      const err = new Error('Field "fact_text" is required and cannot be empty.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    // 4. Normalize fact_type
    let factType = 'OTHER';
    if (payload.fact_type && typeof payload.fact_type === 'string') {
      const upper = payload.fact_type.trim().toUpperCase();
      if (this.FACT_TYPES.includes(upper)) {
        factType = upper;
      }
    }

    // 5. Normalize confidence
    let confidence = 'MEDIUM';
    if (payload.confidence && typeof payload.confidence === 'string') {
      const upper = payload.confidence.trim().toUpperCase();
      if (this.CONFIDENCE_LEVELS.includes(upper)) {
        confidence = upper;
      }
    }

    // 6. Generate authoritative attributes
    const factId = Utils.generateId('FACT');
    const now = Utils.nowIso();

    const record = {
      fact_id: factId,
      project_id: cleanProjectId,
      source_id: cleanSourceId,
      fact_type: factType,
      fact_text: rawFactText,
      value: payload.value ? String(payload.value).trim() : '',
      confidence: confidence,
      verification_status: this.STATUS.UNVERIFIED, // Server authority: ALWAYS UNVERIFIED initially
      verified_by: null,
      verified_at: null,
      notes: payload.notes ? String(payload.notes).trim() : '',
      created_at: now,
      updated_at: now
    };

    SpreadsheetService.appendRecord(DatabaseSheets.FACTS, record);
    this._recordAudit('CREATE_FACT', factId, { project_id: cleanProjectId, source_id: cleanSourceId });

    return record;
  },

  /**
   * Retrieve a fact record by its unique ID.
   * @param {string} factId
   * @returns {Object} Authoritative fact record
   */
  getFact(factId) {
    if (!Utils.isNonEmptyString(factId)) {
      const err = new Error('Field "factId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(factId).trim();
    const record = SpreadsheetService.findRecordById(DatabaseSheets.FACTS, cleanId);

    if (!record) {
      const err = new Error(`Fact with ID "${cleanId}" was not found.`);
      err.code = ErrorCodes.NOT_FOUND;
      throw err;
    }

    return record;
  },

  /**
   * Retrieve all facts matching optional filter criteria.
   * @param {Object} [filter] Optional filters e.g. { project_id, source_id, verification_status, fact_type }
   * @returns {Object[]} List of matching fact records
   */
  getFacts(filter = {}) {
    let items = SpreadsheetService.getAllRecords(DatabaseSheets.FACTS);

    if (filter) {
      const filterProjectId = filter.project_id || filter.projectId;
      if (filterProjectId && typeof filterProjectId === 'string') {
        const cleanProjId = filterProjectId.trim();
        items = items.filter(f => f.project_id === cleanProjId);
      }

      const filterSourceId = filter.source_id || filter.sourceId;
      if (filterSourceId && typeof filterSourceId === 'string') {
        const cleanSrcId = filterSourceId.trim();
        items = items.filter(f => f.source_id === cleanSrcId);
      }

      if (filter.verification_status && typeof filter.verification_status === 'string') {
        const targetStatus = filter.verification_status.trim().toUpperCase();
        items = items.filter(f => f.verification_status === targetStatus);
      }

      if (filter.fact_type && typeof filter.fact_type === 'string') {
        const targetType = filter.fact_type.trim().toUpperCase();
        items = items.filter(f => f.fact_type === targetType);
      }
    }

    return items;
  },

  /**
   * Update mutable fields of an existing fact.
   * Protected fields (fact_id, project_id, verification_status, etc.) cannot be modified.
   * Centralized Editorial Invalidation: If fact_text, value, or source_id changes on a VERIFIED fact,
   * its verification status is automatically reset to UNVERIFIED.
   * @param {string} factId
   * @param {Object} updates
   * @returns {Object} Authoritative updated fact record
   */
  updateFact(factId, updates = {}) {
    if (!Utils.isNonEmptyString(factId)) {
      const err = new Error('Field "factId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(factId).trim();
    const existing = this.getFact(cleanId); // Asserts existence

    const sanitizedUpdates = {};
    let contentMutated = false;

    // Validate new source_id if updating evidence provenance
    if (updates.source_id !== undefined && updates.source_id !== existing.source_id) {
      const newSourceId = String(updates.source_id).trim();
      const newSource = SourceService.getSource(newSourceId);
      if (String(newSource.project_id) !== String(existing.project_id)) {
        const err = new Error(
          `Cross-project source reference is forbidden. Source "${newSourceId}" belongs to project "${newSource.project_id}", but fact belongs to "${existing.project_id}".`
        );
        err.code = ErrorCodes.VALIDATION_ERROR;
        throw err;
      }
      sanitizedUpdates.source_id = newSourceId;
      contentMutated = true;
    }

    for (const field of this.MUTABLE_FIELDS) {
      if (field === 'source_id') continue; // Handled above
      if (updates[field] !== undefined) {
        if (field === 'fact_type') {
          const upper = String(updates[field]).trim().toUpperCase();
          if (this.FACT_TYPES.includes(upper)) {
            sanitizedUpdates[field] = upper;
          }
        } else if (field === 'confidence') {
          const upper = String(updates[field]).trim().toUpperCase();
          if (this.CONFIDENCE_LEVELS.includes(upper)) {
            sanitizedUpdates[field] = upper;
          }
        } else {
          sanitizedUpdates[field] = updates[field];
          if ((field === 'fact_text' || field === 'value') && updates[field] !== existing[field]) {
            contentMutated = true;
          }
        }
      }
    }

    // Editorial Invalidation Principle:
    // If a verified fact's claim or provenance changes, reset status to UNVERIFIED
    if (existing.verification_status === this.STATUS.VERIFIED && contentMutated) {
      sanitizedUpdates.verification_status = this.STATUS.UNVERIFIED;
      sanitizedUpdates.verified_by = null;
      sanitizedUpdates.verified_at = null;
      const noteSuffix = '[EDITORIAL INVALIDATION: Faktual claim atau sumber diubah, memerlukan verifikasi ulang.]';
      sanitizedUpdates.notes = existing.notes ? `${existing.notes} ${noteSuffix}` : noteSuffix;
    }

    sanitizedUpdates.updated_at = Utils.nowIso();

    const updated = SpreadsheetService.updateRecordById(
      DatabaseSheets.FACTS,
      cleanId,
      sanitizedUpdates
    );

    this._recordAudit('UPDATE_FACT', cleanId, { updatedFields: Object.keys(sanitizedUpdates) });

    return updated;
  },

  /**
   * Authoritatively verify a fact against its source evidence.
   * Fails if fact is REJECTED or in CONFLICT, or if source provenance is invalid.
   * @param {string} factId
   * @param {string} [verifiedBy='EDITOR_HUMAN']
   * @returns {Object} Authoritative updated fact record
   */
  verifyFact(factId, verifiedBy = 'EDITOR_HUMAN') {
    if (!Utils.isNonEmptyString(factId)) {
      const err = new Error('Field "factId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(factId).trim();
    const existing = this.getFact(cleanId);

    // State machine guard: REJECTED cannot be directly verified
    if (existing.verification_status === this.STATUS.REJECTED) {
      const err = new Error(
        `Cannot verify fact "${cleanId}" because it is currently REJECTED. Remove rejection status before verification.`
      );
      err.code = ErrorCodes.CONFLICT;
      throw err;
    }

    // State machine guard: CONFLICT cannot be verified until conflict is resolved
    if (existing.verification_status === this.STATUS.CONFLICT) {
      const err = new Error(
        `Cannot verify fact "${cleanId}" because it is currently in CONFLICT status. Resolve conflict before verification.`
      );
      err.code = ErrorCodes.CONFLICT;
      throw err;
    }

    // Provenance validation: Source must exist and belong to the same project
    if (!Utils.isNonEmptyString(existing.source_id)) {
      const err = new Error(
        `Cannot verify fact "${cleanId}" without evidence provenance (source_id is missing).`
      );
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const source = SourceService.getSource(existing.source_id);
    if (String(source.project_id) !== String(existing.project_id)) {
      const err = new Error(
        `Evidence provenance breach: Fact "${cleanId}" belongs to project "${existing.project_id}", but its source "${existing.source_id}" belongs to "${source.project_id}".`
      );
      err.code = ErrorCodes.CONFLICT;
      throw err;
    }

    const now = Utils.nowIso();
    const updates = {
      verification_status: this.STATUS.VERIFIED,
      verified_by: String(verifiedBy).trim() || 'EDITOR_HUMAN',
      verified_at: now,
      updated_at: now
    };

    const updated = SpreadsheetService.updateRecordById(
      DatabaseSheets.FACTS,
      cleanId,
      updates
    );

    this._recordAudit('VERIFY_FACT', cleanId, { verified_by: updates.verified_by });

    return updated;
  },

  /**
   * Reject a fact with mandatory human reason.
   * Fact is preserved in the database for full audit trail.
   * @param {string} factId
   * @param {string} reason Mandatory rejection justification
   * @returns {Object} Authoritative updated fact record
   */
  rejectFact(factId, reason) {
    if (!Utils.isNonEmptyString(factId)) {
      const err = new Error('Field "factId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanReason = (reason !== undefined && reason !== null) ? String(reason).trim() : '';
    if (!cleanReason) {
      const err = new Error('Rejection reason is required when rejecting a fact.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(factId).trim();
    const existing = this.getFact(cleanId);

    const now = Utils.nowIso();
    const rejectionNote = `[REJECTED: ${cleanReason}]`;
    const updatedNotes = existing.notes ? `${existing.notes} ${rejectionNote}` : rejectionNote;

    const updates = {
      verification_status: this.STATUS.REJECTED,
      verified_by: null,
      verified_at: null,
      notes: updatedNotes,
      updated_at: now
    };

    const updated = SpreadsheetService.updateRecordById(
      DatabaseSheets.FACTS,
      cleanId,
      updates
    );

    this._recordAudit('REJECT_FACT', cleanId, { reason: cleanReason });

    return updated;
  },

  /**
   * Deterministic server-side analysis of a project's fact base.
   * Evaluates essential facts, verification counts, conflict presence, and evidence provenance.
   * (Does NOT call Gemini or synthesize fake analysis).
   * @param {string} projectId
   * @returns {Object} Comprehensive deterministic fact analysis
   */
  analyzeFacts(projectId) {
    if (!Utils.isNonEmptyString(projectId)) {
      const err = new Error('Field "projectId" is required for fact analysis.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanProjId = String(projectId).trim();
    ProjectService.getProject(cleanProjId); // Confirm project exists

    const projectFacts = this.getFacts({ project_id: cleanProjId });
    const projectSources = SourceService.getSources({ project_id: cleanProjId });

    const totalFacts = projectFacts.length;
    const verifiedFacts = projectFacts.filter(f => f.verification_status === this.STATUS.VERIFIED);
    const unverifiedFacts = projectFacts.filter(f => f.verification_status === this.STATUS.UNVERIFIED);
    const conflictFacts = projectFacts.filter(f => f.verification_status === this.STATUS.CONFLICT);
    const rejectedFacts = projectFacts.filter(f => f.verification_status === this.STATUS.REJECTED);

    // Provenance validation checks
    const missingProvenance = projectFacts.filter(f => !Utils.isNonEmptyString(f.source_id));

    // Sources usage analysis
    const usedSourceIds = new Set(projectFacts.map(f => f.source_id).filter(Boolean));
    const sourcesWithoutFacts = projectSources.filter(s => !usedSourceIds.has(s.source_id));

    // Distribution by fact_type
    const byType = {};
    for (const type of this.FACT_TYPES) {
      byType[type] = 0;
    }
    for (const f of projectFacts) {
      byType[f.fact_type] = (byType[f.fact_type] || 0) + 1;
    }

    // Essential journalistic facts check (EVENT_NAME, DATE, LOCATION)
    const hasEventName = verifiedFacts.some(f => f.fact_type === 'EVENT_NAME');
    const hasDate = verifiedFacts.some(f => f.fact_type === 'DATE');
    const hasLocation = verifiedFacts.some(f => f.fact_type === 'LOCATION');
    const essentialFactsMet = hasEventName && hasDate && hasLocation;

    // Determine deterministic readiness code
    let readiness = 'UNVERIFIED';
    if (conflictFacts.length > 0) {
      readiness = 'BLOCKED_BY_CONFLICT';
    } else if (essentialFactsMet && totalFacts > 0) {
      readiness = 'READY';
    } else if (!essentialFactsMet && totalFacts > 0) {
      readiness = 'EVIDENCE_GAP';
    }

    return {
      project_id: cleanProjId,
      total_facts: totalFacts,
      verified_facts: verifiedFacts.length,
      unverified_facts: unverifiedFacts.length,
      conflict_facts: conflictFacts.length,
      rejected_facts: rejectedFacts.length,
      missing_provenance_facts: missingProvenance.length,
      total_sources: projectSources.length,
      sources_without_facts: sourcesWithoutFacts.map(s => s.source_id),
      facts_by_type: byType,
      essential_facts: {
        has_event_name: hasEventName,
        has_date: hasDate,
        has_location: hasLocation,
        all_met: essentialFactsMet
      },
      conflicts: conflictFacts.map(cf => ({
        fact_id: cf.fact_id,
        fact_type: cf.fact_type,
        fact_text: cf.fact_text,
        notes: cf.notes
      })),
      readiness: readiness
    };
  },

  /**
   * Internal lightweight audit hook preparing for future AuditService.
   * @private
   */
  _recordAudit(action, factId, metadata = {}) {
    try {
      Utils.logServer(action, 'AUDIT_HOOK', { factId, ...metadata });
    } catch (e) {
      // Non-blocking
    }
  }
};
