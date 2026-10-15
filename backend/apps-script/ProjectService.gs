/**
 * REPORTER AI — Apps Script Backend Foundation
 * File: ProjectService.gs
 * Description: Authoritative server-side project lifecycle and data service for NEWS_PROJECTS.
 * SECURITY & INTEGRITY:
 *   - Backend is authoritative: client-supplied status, stage, timestamps, IDs, and approval flags are NEVER trusted.
 *   - Concurrency is protected via SpreadsheetService's LockService.
 *   - Strict sequential state machine prevents skipping editorial stages.
 */

const ProjectService = {
  /**
   * Canonical sequential stages for NEWS_PROJECTS lifecycle (Stages 01 - 12).
   */
  CANONICAL_STAGES: [
    'FORM',       // 01: Initial reporting form
    'FACTS',      // 02: Fact repository & sources
    'AUDIT',      // 03: Fact audit & conflict resolution
    'VALUE',      // 04: News value evaluation
    'ANGLE',      // 05: Editorial angle selection
    'STRUCTURE',  // 06: Inverted pyramid outline
    'DRAFT',      // 07: Draft V1 synthesis from verified evidence
    'EDIT',       // 08: 7-criteria journalistic check
    'REVISION',   // 09: Draft V2 / human revision
    'SEO',        // 10: SEO metadata & slug configuration
    'PACKAGE',    // 11: Master news package assembly
    'PUBLISH'     // 12: 12-check publication gate
  ],

  /**
   * Aliases mapping variant stage names to canonical identifiers.
   */
  STAGE_ALIASES: {
    'SOURCES': 'FACTS',
    'FACT_AUDIT': 'AUDIT',
    'NEWS_VALUE': 'VALUE',
    'DRAFT_V1': 'DRAFT',
    'EDITORIAL_CHECK': 'EDIT',
    'DRAFT_V2': 'REVISION',
    'MASTER_NEWS_PACKAGE': 'PACKAGE',
    'PUBLICATION': 'PUBLISH',
    'PUBLISHED': 'PUBLISH'
  },

  /**
   * Project status enumeration.
   */
  STATUS: {
    ACTIVE: 'ACTIVE',
    PUBLISHED: 'PUBLISHED',
    ARCHIVED: 'ARCHIVED'
  },

  /**
   * Whitelist of mutable fields allowed in updateProject.
   */
  MUTABLE_FIELDS: [
    'title',
    'slug',
    'story_type',
    'category',
    'event_date',
    'event_time',
    'location',
    'organization',
    'reporter_id',
    'editor_id',
    'notes'
  ],

  /**
   * Protected fields that MUST NOT be arbitrarily modified by client update payloads.
   */
  PROTECTED_FIELDS: [
    'project_id',
    'created_at',
    'updated_at',
    'status',
    'current_stage',
    'selected_angle_id',
    'featured_media_id',
    'final_draft_id'
  ],

  /**
   * Check if a given string is a valid project stage.
   * @param {string} stage
   * @returns {boolean}
   */
  isValidProjectStage(stage) {
    return Boolean(this.normalizeStage(stage));
  },

  /**
   * Normalize input stage string to canonical stage identifier.
   * @param {string} stage
   * @returns {string|null}
   */
  normalizeStage(stage) {
    if (!stage || typeof stage !== 'string') return null;
    const upper = stage.trim().toUpperCase();
    if (this.STAGE_ALIASES[upper]) return this.STAGE_ALIASES[upper];
    if (this.CANONICAL_STAGES.includes(upper)) return upper;
    return null;
  },

  /**
   * Validate whether a project can transition from currentStage to targetStage.
   * @param {string} currentStageRaw
   * @param {string} targetStageRaw
   * @param {Object} [project]
   * @returns {{ allowed: boolean, reason: string|null, normalizedTarget: string|null }}
   */
  canTransitionProjectStage(currentStageRaw, targetStageRaw, project = null) {
    const targetStage = this.normalizeStage(targetStageRaw);
    if (!targetStage) {
      return {
        allowed: false,
        reason: `Unknown or invalid target stage: "${targetStageRaw}". Allowed stages: ${this.CANONICAL_STAGES.join(', ')}`,
        normalizedTarget: null
      };
    }

    if (project && project.status === this.STATUS.ARCHIVED) {
      return {
        allowed: false,
        reason: `Cannot transition stage of archived project "${project.project_id}". Unarchive the project first.`,
        normalizedTarget: targetStage
      };
    }

    const currentStage = this.normalizeStage(currentStageRaw) || 'FORM';
    const currIdx = this.CANONICAL_STAGES.indexOf(currentStage);
    const targetIdx = this.CANONICAL_STAGES.indexOf(targetStage);

    // Same stage is an allowed idempotent operation
    if (currIdx === targetIdx) {
      return { allowed: true, reason: null, normalizedTarget: targetStage };
    }

    // Editorial rollbacks to previous stages are always permitted
    if (targetIdx < currIdx) {
      return { allowed: true, reason: null, normalizedTarget: targetStage };
    }

    // Sequential progression to immediate next stage is permitted
    if (targetIdx === currIdx + 1) {
      return { allowed: true, reason: null, normalizedTarget: targetStage };
    }

    // Skipping stages is strictly rejected to preserve editorial integrity
    return {
      allowed: false,
      reason: `Cannot skip stages in the editorial workflow. Attempted jump from stage "${currentStage}" to "${targetStage}". Next allowed forward stage is "${this.CANONICAL_STAGES[currIdx + 1]}".`,
      normalizedTarget: targetStage
    };
  },

  /**
   * Create a new project in the NEWS_PROJECTS sheet.
   * Server generates authoritative ID, timestamps, initial stage ('FORM'), and status ('ACTIVE').
   * @param {Object} payload Client input
   * @returns {Object} Authoritative created project record
   */
  createProject(payload = {}) {
    // 1. Required field validation
    const rawTitle = payload.title !== undefined ? String(payload.title).trim() : '';
    if (!rawTitle) {
      const err = new Error('Field "title" is required and cannot be empty.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    // 2. Server-generated authoritative attributes
    const projectId = Utils.generateProjectId();
    const now = Utils.nowIso();

    // 3. Derive or sanitize optional fields
    const slug = (payload.slug && typeof payload.slug === 'string' && payload.slug.trim())
      ? payload.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const todayDate = now.split('T')[0];
    const eventDate = payload.event_date && typeof payload.event_date === 'string' && payload.event_date.trim()
      ? payload.event_date.trim()
      : todayDate;

    // 4. Construct complete authoritative record according to CanonicalSchemas.NEWS_PROJECTS
    const record = {
      project_id: projectId,
      created_at: now,
      updated_at: now,
      title: rawTitle,
      slug: slug || 'berita',
      story_type: payload.story_type ? String(payload.story_type).trim().toUpperCase() : 'EVENT',
      category: payload.category ? String(payload.category).trim() : 'Umum',
      event_date: eventDate,
      event_time: payload.event_time ? String(payload.event_time).trim() : '',
      location: payload.location ? String(payload.location).trim() : '',
      organization: payload.organization ? String(payload.organization).trim() : '',
      reporter_id: payload.reporter_id ? String(payload.reporter_id).trim() : 'USR-000001',
      editor_id: payload.editor_id ? String(payload.editor_id).trim() : null,
      status: this.STATUS.ACTIVE,
      current_stage: 'FORM',
      selected_angle_id: null,
      featured_media_id: null,
      final_draft_id: null,
      notes: payload.notes ? String(payload.notes).trim() : ''
    };

    // 5. Authoritative write using SpreadsheetService with concurrency lock
    SpreadsheetService.appendRecord(DatabaseSheets.NEWS_PROJECTS, record);

    this._recordAudit('CREATE_PROJECT', projectId, { title: record.title });

    return record;
  },

  /**
   * Retrieve a project by its authoritative project_id.
   * @param {string} projectId
   * @returns {Object} Authoritative project record
   */
  getProject(projectId) {
    if (!Utils.isNonEmptyString(projectId)) {
      const err = new Error('Field "projectId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(projectId).trim();
    const record = SpreadsheetService.findRecordById(DatabaseSheets.NEWS_PROJECTS, cleanId);

    if (!record) {
      const err = new Error(`Project with ID "${cleanId}" was not found.`);
      err.code = ErrorCodes.NOT_FOUND;
      throw err;
    }

    return record;
  },

  /**
   * List projects with optional filtering by status, stage, or reporter.
   * @param {Object} [filter] Optional filter parameters
   * @returns {{ items: Object[], count: number }}
   */
  listProjects(filter = {}) {
    const allRecords = SpreadsheetService.getAllRecords(DatabaseSheets.NEWS_PROJECTS);

    let items = allRecords;

    if (filter) {
      if (filter.status && typeof filter.status === 'string') {
        const targetStatus = filter.status.trim().toUpperCase();
        items = items.filter(r => r.status === targetStatus);
      }

      if (filter.stage || filter.current_stage) {
        const stageQuery = filter.stage || filter.current_stage;
        const normalized = this.normalizeStage(stageQuery);
        if (normalized) {
          items = items.filter(r => r.current_stage === normalized);
        }
      }

      if (filter.reporter_id && typeof filter.reporter_id === 'string') {
        const reporterId = filter.reporter_id.trim();
        items = items.filter(r => r.reporter_id === reporterId);
      }
    }

    return {
      items: items,
      count: items.length
    };
  },

  /**
   * Update mutable fields of an existing project.
   * Protected fields (project_id, created_at, status, current_stage, etc.) are strictly ignored.
   * @param {string} projectId
   * @param {Object} updates Dictionary of field updates
   * @returns {Object} Authoritative updated record
   */
  updateProject(projectId, updates = {}) {
    if (!Utils.isNonEmptyString(projectId)) {
      const err = new Error('Field "projectId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(projectId).trim();
    const existing = this.getProject(cleanId);

    if (existing.status === this.STATUS.ARCHIVED) {
      const err = new Error(`Cannot update archived project "${cleanId}".`);
      err.code = ErrorCodes.CONFLICT;
      throw err;
    }

    // Whitelist mutable fields only
    const sanitizedUpdates = {};
    for (const field of this.MUTABLE_FIELDS) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    // Always update server timestamp
    sanitizedUpdates.updated_at = Utils.nowIso();

    const updated = SpreadsheetService.updateRecordById(
      DatabaseSheets.NEWS_PROJECTS,
      cleanId,
      sanitizedUpdates
    );

    this._recordAudit('UPDATE_PROJECT', cleanId, { updatedFields: Object.keys(sanitizedUpdates) });

    return updated;
  },

  /**
   * Archive a project (soft delete).
   * Safe and idempotent: if already ARCHIVED, returns record safely.
   * @param {string} projectId
   * @returns {Object} Authoritative updated record
   */
  archiveProject(projectId) {
    if (!Utils.isNonEmptyString(projectId)) {
      const err = new Error('Field "projectId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(projectId).trim();
    const existing = this.getProject(cleanId);

    if (existing.status === this.STATUS.ARCHIVED) {
      return existing;
    }

    const updates = {
      status: this.STATUS.ARCHIVED,
      updated_at: Utils.nowIso()
    };

    const updated = SpreadsheetService.updateRecordById(
      DatabaseSheets.NEWS_PROJECTS,
      cleanId,
      updates
    );

    this._recordAudit('ARCHIVE_PROJECT', cleanId, { status: this.STATUS.ARCHIVED });

    return updated;
  },

  /**
   * Authoritatively change project lifecycle stage with strict transition validation.
   * Ignores client claims of approved, verified, or publicationReady flags.
   * @param {string} projectId
   * @param {string} targetStageRaw
   * @returns {Object} Authoritative updated record
   */
  changeProjectStage(projectId, targetStageRaw) {
    if (!Utils.isNonEmptyString(projectId)) {
      const err = new Error('Field "projectId" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    if (!Utils.isNonEmptyString(targetStageRaw)) {
      const err = new Error('Field "targetStage" is required.');
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const cleanId = String(projectId).trim();
    const existing = this.getProject(cleanId);

    // Evaluate state machine transition
    const check = this.canTransitionProjectStage(existing.current_stage, targetStageRaw, existing);
    if (!check.allowed) {
      const err = new Error(check.reason);
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }

    const updates = {
      current_stage: check.normalizedTarget,
      updated_at: Utils.nowIso()
    };

    // If reaching PUBLISH stage authoritatively, update status
    if (check.normalizedTarget === 'PUBLISH') {
      updates.status = this.STATUS.PUBLISHED;
    }

    const updated = SpreadsheetService.updateRecordById(
      DatabaseSheets.NEWS_PROJECTS,
      cleanId,
      updates
    );

    this._recordAudit('CHANGE_PROJECT_STAGE', cleanId, {
      fromStage: existing.current_stage,
      toStage: check.normalizedTarget
    });

    return updated;
  },

  /**
   * Internal lightweight audit hook preparing for future AuditService.
   * @private
   */
  _recordAudit(action, projectId, metadata = {}) {
    try {
      Utils.logServer(action, 'AUDIT_HOOK', { projectId, ...metadata });
    } catch (e) {
      // Non-blocking logging
    }
  }
};
