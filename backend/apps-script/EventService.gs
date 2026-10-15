/**
 * REPORTER AI — Apps Script Backend Foundation
 * File: EventService.gs
 * Description: Authoritative server-side management for EVENTS (itinerary and chronological timeline).
 * SECURITY & INTEGRITY:
 *   - Events are strictly project-scoped.
 *   - Deterministic chronological sequence ordering (sequence 1, 2, 3...).
 *   - Explicit reorderEvents action updates sequence indexes authoritatively.
 */

const EventService = {
  /**
   * Verification statuses for events
   */
  STATUS: {
    UNVERIFIED: 'UNVERIFIED',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED'
  },

  /**
   * Whitelist of mutable fields for updateEvent
   */
  MUTABLE_FIELDS: [
    'sequence',
    'event_time',
    'activity',
    'description',
    'source_id',
    'verification_status'
  ],

  /**
   * Protected fields shielded from direct client mutation
   */
  PROTECTED_FIELDS: [
    'event_id',
    'project_id',
    'created_at'
  ],

  /**
   * Create a new event record in the EVENTS sheet.
   * Auto-assigns sequence number based on current count of events for this project.
   * @param {Object} payload
   * @returns {Object} Authoritative created event record
   */
  createEvent(payload = {}) {
    // 1. Validate project_id
    const rawProjectId = payload.project_id || payload.projectId;
    if (!Utils.isNonEmptyString(rawProjectId)) {
      const err = new Error('Field "project_id" is required to create an event.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }
    const cleanProjectId = String(rawProjectId).trim();
    ProjectService.getProject(cleanProjectId); // Throws NOT_FOUND if absent

    // 2. Validate activity description
    const rawActivity = payload.activity !== undefined ? String(payload.activity).trim() : '';
    if (!rawActivity) {
      const err = new Error('Field "activity" is required for an event record.');
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
          `Cross-project source reference is forbidden. Source "${cleanSourceId}" belongs to project "${source.project_id}", but event is declared for project "${cleanProjectId}".`
        );
        err.code = ErrorCodes.VALIDATION_ERROR;
        throw err;
      }
    }

    // 4. Calculate sequence
    const existingEvents = this.getEvents({ project_id: cleanProjectId });
    let sequence = existingEvents.length + 1;
    if (payload.sequence !== undefined && Number.isInteger(Number(payload.sequence)) && Number(payload.sequence) > 0) {
      sequence = Number(payload.sequence);
    }

    // 5. Generate authoritative attributes
    const eventId = Utils.generateId('EVENT');
    const now = Utils.nowIso();

    const record = {
      event_id: eventId,
      project_id: cleanProjectId,
      source_id: cleanSourceId,
      sequence: sequence,
      event_time: payload.event_time ? String(payload.event_time).trim() : '',
      activity: rawActivity,
      description: payload.description ? String(payload.description).trim() : '',
      verification_status: payload.verification_status ? String(payload.verification_status).trim().toUpperCase() : this.STATUS.VERIFIED,
      created_at: now
    };

    SpreadsheetService.appendRecord(DatabaseSheets.EVENTS, record);
    this._recordAudit('CREATE_EVENT', eventId, { project_id: cleanProjectId, activity: rawActivity });

    return record;
  },

  /**
   * Retrieve an event by event_id.
   * @param {string} eventId
   * @returns {Object} Authoritative event record
   */
  getEvent(eventId) {
    if (!Utils.isNonEmptyString(eventId)) {
      const err = new Error('Field "eventId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(eventId).trim();
    const record = SpreadsheetService.findRecordById(DatabaseSheets.EVENTS, cleanId);

    if (!record) {
      const err = new Error(`Event with ID "${cleanId}" was not found.`);
      err.code = ErrorCodes.NOT_FOUND;
      throw err;
    }

    return record;
  },

  /**
   * Retrieve events matching optional filter criteria, deterministically sorted.
   * @param {Object} [filter] e.g. { project_id, source_id, verification_status }
   * @returns {Object[]} Chronologically sorted array of event records
   */
  getEvents(filter = {}) {
    let items = SpreadsheetService.getAllRecords(DatabaseSheets.EVENTS);

    if (filter) {
      const filterProjectId = filter.project_id || filter.projectId;
      if (filterProjectId && typeof filterProjectId === 'string') {
        const cleanProjId = filterProjectId.trim();
        items = items.filter(e => e.project_id === cleanProjId);
      }

      const filterSourceId = filter.source_id || filter.sourceId;
      if (filterSourceId && typeof filterSourceId === 'string') {
        const cleanSrcId = filterSourceId.trim();
        items = items.filter(e => e.source_id === cleanSrcId);
      }

      if (filter.verification_status && typeof filter.verification_status === 'string') {
        const targetStatus = filter.verification_status.trim().toUpperCase();
        items = items.filter(e => e.verification_status === targetStatus);
      }
    }

    // Deterministic sorting: sequence ASC, then event_time ASC, then created_at ASC
    items.sort((a, b) => {
      const seqA = Number(a.sequence) || 0;
      const seqB = Number(b.sequence) || 0;
      if (seqA !== seqB) return seqA - seqB;
      const timeA = String(a.event_time || '');
      const timeB = String(b.event_time || '');
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    });

    return items;
  },

  /**
   * Update mutable fields of an existing event record.
   * @param {string} eventId
   * @param {Object} updates
   * @returns {Object} Authoritative updated event record
   */
  updateEvent(eventId, updates = {}) {
    if (!Utils.isNonEmptyString(eventId)) {
      const err = new Error('Field "eventId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(eventId).trim();
    const existing = this.getEvent(cleanId);

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
            `Cross-project source reference is forbidden. Source "${newSourceId}" belongs to project "${newSource.project_id}", but event belongs to "${existing.project_id}".`
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
        if (field === 'sequence') {
          sanitizedUpdates[field] = Number(updates[field]) || existing.sequence;
        } else {
          sanitizedUpdates[field] = updates[field];
        }
      }
    }

    const updated = SpreadsheetService.updateRecordById(
      DatabaseSheets.EVENTS,
      cleanId,
      sanitizedUpdates
    );

    this._recordAudit('UPDATE_EVENT', cleanId, { updatedFields: Object.keys(sanitizedUpdates) });

    return updated;
  },

  /**
   * Reorder events for a project authoritatively based on an ordered array of event IDs.
   * @param {string} projectId
   * @param {string[]} orderedEventIds Ordered list of event IDs
   * @returns {Object[]} Updated sorted event list
   */
  reorderEvents(projectId, orderedEventIds) {
    if (!Utils.isNonEmptyString(projectId)) {
      const err = new Error('Field "projectId" is required to reorder events.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    if (!Array.isArray(orderedEventIds) || orderedEventIds.length === 0) {
      const err = new Error('Field "orderedEventIds" must be a non-empty array of event IDs.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanProjectId = String(projectId).trim();
    ProjectService.getProject(cleanProjectId); // Asserts project exists

    // Apply sequence index 1..N
    orderedEventIds.forEach((eventId, idx) => {
      const cleanEventId = String(eventId).trim();
      const existing = this.getEvent(cleanEventId);
      if (String(existing.project_id) === cleanProjectId) {
        SpreadsheetService.updateRecordById(DatabaseSheets.EVENTS, cleanEventId, {
          sequence: idx + 1
        });
      }
    });

    this._recordAudit('REORDER_EVENTS', cleanProjectId, { count: orderedEventIds.length });

    return this.getEvents({ project_id: cleanProjectId });
  },

  /**
   * Internal lightweight audit hook.
   * @private
   */
  _recordAudit(action, eventId, metadata = {}) {
    try {
      Utils.logServer(action, 'AUDIT_HOOK', { eventId, ...metadata });
    } catch (e) {
      // Non-blocking
    }
  }
};
