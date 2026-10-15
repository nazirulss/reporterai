/**
 * REPORTER AI — Apps Script Backend Foundation
 * File: QuoteService.gs
 * Description: Authoritative server-side management for QUOTES and Quote Guard integrity.
 * SECURITY & INTEGRITY:
 *   - Quote Guard: Direct quotes REQUIRE valid source_id provenance in the same project.
 *   - Strict State Machine: UNVERIFIED -> VERIFIED -> APPROVED (verifyQuote !== approveQuote).
 *   - Client flags (approved: true, verified: true) are strictly disregarded.
 *   - Substantive edits to verified or approved quotes trigger immediate editorial invalidation.
 *   - REJECTED quotes cannot be verified or approved without explicit restoration.
 */

const QuoteService = {
  /**
   * Quote types defined in DATABASE_SCHEMA.md
   */
  QUOTE_TYPES: [
    'DIRECT',
    'PARAPHRASE'
  ],

  /**
   * Quote verification statuses
   */
  STATUS: {
    UNVERIFIED: 'UNVERIFIED',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED'
  },

  /**
   * Whitelist of mutable fields for updateQuote
   */
  MUTABLE_FIELDS: [
    'quote_text',
    'quote_type',
    'person_id',
    'source_id',
    'notes'
  ],

  /**
   * Protected fields shielded from direct client mutation
   */
  PROTECTED_FIELDS: [
    'quote_id',
    'project_id',
    'created_at',
    'verification_status',
    'approved_for_publication'
  ],

  /**
   * Helper: Check if a quote is verified by human editorial action
   * @param {Object} quote
   * @returns {boolean}
   */
  isQuoteVerified(quote) {
    return Boolean(quote && quote.verification_status === this.STATUS.VERIFIED);
  },

  /**
   * Helper: Check if a quote is approved for publication
   * @param {Object} quote
   * @returns {boolean}
   */
  isQuoteApproved(quote) {
    if (!quote) return false;
    const isVerified = quote.verification_status === this.STATUS.VERIFIED;
    const isApprovedFlag = (quote.approved_for_publication === true || quote.approved_for_publication === 'true');
    return isVerified && isApprovedFlag;
  },

  /**
   * Helper: Check if a quote is usable for editorial draft synthesis
   * @param {Object} quote
   * @returns {boolean}
   */
  isQuoteUsableForDraft(quote) {
    return this.isQuoteApproved(quote);
  },

  /**
   * Create a new quote record in the QUOTES sheet.
   * Direct quotes strictly require valid source_id provenance.
   * Initial state is always UNVERIFIED and approved_for_publication: false.
   * @param {Object} payload
   * @returns {Object} Authoritative created quote record
   */
  createQuote(payload = {}) {
    // 1. Validate project_id
    const rawProjectId = payload.project_id || payload.projectId;
    if (!Utils.isNonEmptyString(rawProjectId)) {
      const err = new Error('Field "project_id" is required to create a quote.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }
    const cleanProjectId = String(rawProjectId).trim();
    ProjectService.getProject(cleanProjectId); // Throws NOT_FOUND if absent

    // 2. Validate quote text
    const rawText = payload.quote_text !== undefined ? String(payload.quote_text).trim() : '';
    if (!rawText) {
      const err = new Error('Field "quote_text" is required and cannot be empty.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    // 3. Normalize quote_type
    let quoteType = 'PARAPHRASE';
    if (payload.quote_type && typeof payload.quote_type === 'string') {
      const upper = payload.quote_type.trim().toUpperCase();
      if (this.QUOTE_TYPES.includes(upper)) {
        quoteType = upper;
      }
    }

    // 4. Source provenance validation
    let cleanSourceId = null;
    const rawSourceId = payload.source_id || payload.sourceId;

    if (quoteType === 'DIRECT') {
      if (!Utils.isNonEmptyString(rawSourceId)) {
        const err = new Error(
          'Quote Guard Violation: Direct quotes strictly require a valid "source_id" evidence reference.'
        );
        err.code = ErrorCodes.VALIDATION_ERROR;
        throw err;
      }
    }

    if (Utils.isNonEmptyString(rawSourceId)) {
      cleanSourceId = String(rawSourceId).trim();
      const source = SourceService.getSource(cleanSourceId);
      if (String(source.project_id) !== cleanProjectId) {
        const err = new Error(
          `Cross-project source reference is forbidden. Source "${cleanSourceId}" belongs to project "${source.project_id}", but quote is declared for project "${cleanProjectId}".`
        );
        err.code = ErrorCodes.VALIDATION_ERROR;
        throw err;
      }
    }

    // 5. Person validation (if specified)
    let cleanPersonId = null;
    const rawPersonId = payload.person_id || payload.personId;
    if (Utils.isNonEmptyString(rawPersonId)) {
      cleanPersonId = String(rawPersonId).trim();
      const person = PeopleService.getPerson(cleanPersonId);
      if (String(person.project_id) !== cleanProjectId) {
        const err = new Error(
          `Cross-project person reference is forbidden. Person "${cleanPersonId}" belongs to project "${person.project_id}", but quote is declared for project "${cleanProjectId}".`
        );
        err.code = ErrorCodes.VALIDATION_ERROR;
        throw err;
      }
    }

    // 6. Generate authoritative attributes
    const quoteId = Utils.generateId('QUOTE');
    const now = Utils.nowIso();

    const record = {
      quote_id: quoteId,
      project_id: cleanProjectId,
      person_id: cleanPersonId,
      source_id: cleanSourceId,
      quote_text: rawText,
      quote_type: quoteType,
      verification_status: this.STATUS.UNVERIFIED, // Server authority: ALWAYS UNVERIFIED
      approved_for_publication: false,             // Server authority: ALWAYS FALSE initially
      notes: payload.notes ? String(payload.notes).trim() : '',
      created_at: now
    };

    SpreadsheetService.appendRecord(DatabaseSheets.QUOTES, record);
    this._recordAudit('CREATE_QUOTE', quoteId, { project_id: cleanProjectId, quote_type: quoteType });

    return record;
  },

  /**
   * Retrieve a quote by quote_id.
   * @param {string} quoteId
   * @returns {Object} Authoritative quote record
   */
  getQuote(quoteId) {
    if (!Utils.isNonEmptyString(quoteId)) {
      const err = new Error('Field "quoteId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(quoteId).trim();
    const record = SpreadsheetService.findRecordById(DatabaseSheets.QUOTES, cleanId);

    if (!record) {
      const err = new Error(`Quote with ID "${cleanId}" was not found.`);
      err.code = ErrorCodes.NOT_FOUND;
      throw err;
    }

    return record;
  },

  /**
   * Retrieve quotes matching optional filter criteria.
   * @param {Object} [filter] e.g. { project_id, person_id, source_id, quote_type, verification_status, approved_for_publication }
   * @returns {Object[]}
   */
  getQuotes(filter = {}) {
    let items = SpreadsheetService.getAllRecords(DatabaseSheets.QUOTES);

    if (filter) {
      const filterProjectId = filter.project_id || filter.projectId;
      if (filterProjectId && typeof filterProjectId === 'string') {
        const cleanProjId = filterProjectId.trim();
        items = items.filter(q => q.project_id === cleanProjId);
      }

      const filterPersonId = filter.person_id || filter.personId;
      if (filterPersonId && typeof filterPersonId === 'string') {
        const cleanPersId = filterPersonId.trim();
        items = items.filter(q => q.person_id === cleanPersId);
      }

      const filterSourceId = filter.source_id || filter.sourceId;
      if (filterSourceId && typeof filterSourceId === 'string') {
        const cleanSrcId = filterSourceId.trim();
        items = items.filter(q => q.source_id === cleanSrcId);
      }

      if (filter.quote_type && typeof filter.quote_type === 'string') {
        const targetType = filter.quote_type.trim().toUpperCase();
        items = items.filter(q => q.quote_type === targetType);
      }

      if (filter.verification_status && typeof filter.verification_status === 'string') {
        const targetStatus = filter.verification_status.trim().toUpperCase();
        items = items.filter(q => q.verification_status === targetStatus);
      }

      if (filter.approved_for_publication !== undefined) {
        const targetBool = (filter.approved_for_publication === true || filter.approved_for_publication === 'true');
        items = items.filter(q => (q.approved_for_publication === true || q.approved_for_publication === 'true') === targetBool);
      }
    }

    return items;
  },

  /**
   * Update mutable fields of an existing quote record.
   * Quote Edit Invalidation: Substantive changes to quote_text, quote_type, person_id, or source_id
   * on a VERIFIED or APPROVED quote automatically reset both verification and publication approval.
   * @param {string} quoteId
   * @param {Object} updates
   * @returns {Object} Authoritative updated quote record
   */
  updateQuote(quoteId, updates = {}) {
    if (!Utils.isNonEmptyString(quoteId)) {
      const err = new Error('Field "quoteId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(quoteId).trim();
    const existing = this.getQuote(cleanId);

    const sanitizedUpdates = {};
    let contentMutated = false;

    // Check quote_type update
    let targetQuoteType = existing.quote_type;
    if (updates.quote_type !== undefined) {
      const upperType = String(updates.quote_type).trim().toUpperCase();
      if (this.QUOTE_TYPES.includes(upperType)) {
        sanitizedUpdates.quote_type = upperType;
        targetQuoteType = upperType;
        if (upperType !== existing.quote_type) contentMutated = true;
      }
    }

    // Check source_id update
    let targetSourceId = existing.source_id;
    if (updates.source_id !== undefined && updates.source_id !== existing.source_id) {
      if (updates.source_id === null || updates.source_id === '') {
        sanitizedUpdates.source_id = null;
        targetSourceId = null;
      } else {
        const newSourceId = String(updates.source_id).trim();
        const newSource = SourceService.getSource(newSourceId);
        if (String(newSource.project_id) !== String(existing.project_id)) {
          const err = new Error(
            `Cross-project source reference is forbidden. Source "${newSourceId}" belongs to project "${newSource.project_id}", but quote belongs to "${existing.project_id}".`
          );
          err.code = ErrorCodes.VALIDATION_ERROR;
          throw err;
        }
        sanitizedUpdates.source_id = newSourceId;
        targetSourceId = newSourceId;
      }
      contentMutated = true;
    }

    // Direct quote rule on update
    if (targetQuoteType === 'DIRECT' && !Utils.isNonEmptyString(targetSourceId)) {
      const err = new Error(
        'Quote Guard Violation: Direct quotes strictly require a valid "source_id" evidence reference.'
      );
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    // Check person_id update
    if (updates.person_id !== undefined && updates.person_id !== existing.person_id) {
      if (updates.person_id === null || updates.person_id === '') {
        sanitizedUpdates.person_id = null;
      } else {
        const newPersonId = String(updates.person_id).trim();
        const newPerson = PeopleService.getPerson(newPersonId);
        if (String(newPerson.project_id) !== String(existing.project_id)) {
          const err = new Error(
            `Cross-project person reference is forbidden. Person "${newPersonId}" belongs to project "${newPerson.project_id}", but quote belongs to "${existing.project_id}".`
          );
          err.code = ErrorCodes.VALIDATION_ERROR;
          throw err;
        }
        sanitizedUpdates.person_id = newPersonId;
      }
      contentMutated = true;
    }

    // Check quote_text update
    if (updates.quote_text !== undefined) {
      const cleanText = String(updates.quote_text).trim();
      if (!cleanText) {
        const err = new Error('Field "quote_text" cannot be empty.');
        err.code = ErrorCodes.VALIDATION_ERROR;
        throw err;
      }
      if (cleanText !== existing.quote_text) {
        sanitizedUpdates.quote_text = cleanText;
        contentMutated = true;
      }
    }

    if (updates.notes !== undefined) {
      sanitizedUpdates.notes = String(updates.notes).trim();
    }

    // Quote Edit Invalidation Principle:
    // If a verified or approved quote's substantive contents or attribution change:
    const isCurrentlyVerifiedOrApproved = (
      existing.verification_status === this.STATUS.VERIFIED ||
      existing.approved_for_publication === true ||
      existing.approved_for_publication === 'true'
    );

    if (isCurrentlyVerifiedOrApproved && contentMutated) {
      sanitizedUpdates.verification_status = this.STATUS.UNVERIFIED;
      sanitizedUpdates.approved_for_publication = false;
      const noteSuffix = '[EDITORIAL INVALIDATION: Teks atau atribusi kutipan diubah, memerlukan verifikasi dan persetujuan ulang.]';
      sanitizedUpdates.notes = existing.notes ? `${existing.notes} ${noteSuffix}` : noteSuffix;
    }

    const updated = SpreadsheetService.updateRecordById(
      DatabaseSheets.QUOTES,
      cleanId,
      sanitizedUpdates
    );

    this._recordAudit('UPDATE_QUOTE', cleanId, { updatedFields: Object.keys(sanitizedUpdates) });

    return updated;
  },

  /**
   * Verify a quote against its recorded evidence source.
   * CRITICAL: verifyQuote verifies fidelity to source, but does NOT approve for publication.
   * (verifyQuote !== approveQuote).
   * @param {string} quoteId
   * @returns {Object} Authoritative updated quote record
   */
  verifyQuote(quoteId) {
    if (!Utils.isNonEmptyString(quoteId)) {
      const err = new Error('Field "quoteId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(quoteId).trim();
    const existing = this.getQuote(cleanId);

    // State machine guard: Cannot verify a rejected quote
    if (existing.verification_status === this.STATUS.REJECTED) {
      const err = new Error(`Cannot verify quote "${cleanId}" because it is currently REJECTED.`);
      err.code = ErrorCodes.CONFLICT;
      throw err;
    }

    // Direct quote provenance check
    if (existing.quote_type === 'DIRECT') {
      if (!Utils.isNonEmptyString(existing.source_id)) {
        const err = new Error(
          `Quote Guard Violation: Direct quote "${cleanId}" cannot be verified without a valid source_id.`
        );
        err.code = ErrorCodes.VALIDATION_ERROR;
        throw err;
      }
      const source = SourceService.getSource(existing.source_id);
      if (String(source.project_id) !== String(existing.project_id)) {
        const err = new Error(
          `Evidence provenance breach: Quote "${cleanId}" belongs to project "${existing.project_id}", but its source belongs to "${source.project_id}".`
        );
        err.code = ErrorCodes.CONFLICT;
        throw err;
      }
    }

    // Person check if attached
    if (Utils.isNonEmptyString(existing.person_id)) {
      const person = PeopleService.getPerson(existing.person_id);
      if (String(person.project_id) !== String(existing.project_id)) {
        const err = new Error(
          `Entity provenance breach: Quote "${cleanId}" belongs to project "${existing.project_id}", but its speaker belongs to "${person.project_id}".`
        );
        err.code = ErrorCodes.CONFLICT;
        throw err;
      }
    }

    const updates = {
      verification_status: this.STATUS.VERIFIED
      // approved_for_publication remains FALSE! (verifyQuote !== approveQuote)
    };

    const updated = SpreadsheetService.updateRecordById(
      DatabaseSheets.QUOTES,
      cleanId,
      updates
    );

    this._recordAudit('VERIFY_QUOTE', cleanId, { verification_status: this.STATUS.VERIFIED });

    return updated;
  },

  /**
   * Authoritatively approve a quote for publication.
   * Strictly enforces: Quote MUST be in VERIFIED status before approval can be granted.
   * @param {string} quoteId
   * @returns {Object} Authoritative updated quote record
   */
  approveQuote(quoteId) {
    if (!Utils.isNonEmptyString(quoteId)) {
      const err = new Error('Field "quoteId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(quoteId).trim();
    const existing = this.getQuote(cleanId);

    // State machine guard: Cannot approve a rejected quote
    if (existing.verification_status === this.STATUS.REJECTED) {
      const err = new Error(`Cannot approve quote "${cleanId}" because it is currently REJECTED.`);
      err.code = ErrorCodes.CONFLICT;
      throw err;
    }

    // STRICT QUOTE GUARD: Must already be VERIFIED
    if (existing.verification_status !== this.STATUS.VERIFIED) {
      const err = new Error(
        `Quote Guard Violation: Quote "${cleanId}" must be in VERIFIED status before it can be APPROVED for publication (verifyQuote !== approveQuote). Current status: "${existing.verification_status}".`
      );
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    // If direct quote, confirm source provenance
    if (existing.quote_type === 'DIRECT') {
      if (!Utils.isNonEmptyString(existing.source_id)) {
        const err = new Error(
          `Quote Guard Violation: Direct quote "${cleanId}" cannot be approved without a valid source_id.`
        );
        err.code = ErrorCodes.VALIDATION_ERROR;
        throw err;
      }
      const source = SourceService.getSource(existing.source_id);
      if (String(source.project_id) !== String(existing.project_id)) {
        const err = new Error(`Source project mismatch on quote "${cleanId}".`);
        err.code = ErrorCodes.CONFLICT;
        throw err;
      }
    }

    const updates = {
      approved_for_publication: true
    };

    const updated = SpreadsheetService.updateRecordById(
      DatabaseSheets.QUOTES,
      cleanId,
      updates
    );

    this._recordAudit('APPROVE_QUOTE', cleanId, { approved_for_publication: true });

    return updated;
  },

  /**
   * Reject a quote with mandatory human reason.
   * Preserves quote in database with audit note.
   * @param {string} quoteId
   * @param {string} reason
   * @returns {Object} Authoritative updated quote record
   */
  rejectQuote(quoteId, reason) {
    if (!Utils.isNonEmptyString(quoteId)) {
      const err = new Error('Field "quoteId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanReason = (reason !== undefined && reason !== null) ? String(reason).trim() : '';
    if (!cleanReason) {
      const err = new Error('Rejection reason is required when rejecting a quote.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(quoteId).trim();
    const existing = this.getQuote(cleanId);

    const rejectionNote = `[REJECTED: ${cleanReason}]`;
    const updatedNotes = existing.notes ? `${existing.notes} ${rejectionNote}` : rejectionNote;

    const updates = {
      verification_status: this.STATUS.REJECTED,
      approved_for_publication: false,
      notes: updatedNotes
    };

    const updated = SpreadsheetService.updateRecordById(
      DatabaseSheets.QUOTES,
      cleanId,
      updates
    );

    this._recordAudit('REJECT_QUOTE', cleanId, { reason: cleanReason });

    return updated;
  },

  /**
   * Internal lightweight audit hook.
   * @private
   */
  _recordAudit(action, quoteId, metadata = {}) {
    try {
      Utils.logServer(action, 'AUDIT_HOOK', { quoteId, ...metadata });
    } catch (e) {
      // Non-blocking
    }
  }
};
