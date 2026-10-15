/**
 * REPORTER AI — Apps Script Backend Foundation
 * File: Router.gs
 * Description: Centralized action routing and execution engine for all incoming Web App requests.
 * EXPANSION: Registry pattern designed for seamless addition of future service modules.
 */

const Router = {
  /**
   * Action Registry mapping action names to handler functions.
   * In STEP 5.1, only foundational actions are registered.
   */
  _actionRegistry: {
    healthCheck: 'handleHealthCheck',
    createProject: 'handleCreateProject',
    getProject: 'handleGetProject',
    listProjects: 'handleListProjects',
    updateProject: 'handleUpdateProject',
    archiveProject: 'handleArchiveProject',
    changeProjectStage: 'handleChangeProjectStage',

    // Source Actions
    createSource: 'handleCreateSource',
    getSource: 'handleGetSource',
    getSources: 'handleGetSources',
    updateSource: 'handleUpdateSource',
    deleteSource: 'handleDeleteSource',

    // Fact Actions
    createFact: 'handleCreateFact',
    getFact: 'handleGetFact',
    getFacts: 'handleGetFacts',
    updateFact: 'handleUpdateFact',
    verifyFact: 'handleVerifyFact',
    rejectFact: 'handleRejectFact',
    analyzeFacts: 'handleAnalyzeFacts',

    // People Actions
    createPerson: 'handleCreatePerson',
    getPerson: 'handleGetPerson',
    getPeople: 'handleGetPeople',
    updatePerson: 'handleUpdatePerson',
    verifyPerson: 'handleVerifyPerson',

    // Quote Actions
    createQuote: 'handleCreateQuote',
    getQuote: 'handleGetQuote',
    getQuotes: 'handleGetQuotes',
    updateQuote: 'handleUpdateQuote',
    verifyQuote: 'handleVerifyQuote',
    approveQuote: 'handleApproveQuote',
    rejectQuote: 'handleRejectQuote',

    // Event Actions
    createEvent: 'handleCreateEvent',
    getEvent: 'handleGetEvent',
    getEvents: 'handleGetEvents',
    updateEvent: 'handleUpdateEvent',
    reorderEvents: 'handleReorderEvents'
  },

  /**
   * Central entry point to dispatch and route incoming client requests.
   * @param {Object} request { action: string, payload: Object, method: string }
   * @returns {Object} Standardized response envelope from Response layer
   */
  routeRequest(request) {
    const action = request && request.action ? String(request.action).trim() : '';
    const payload = (request && request.payload && typeof request.payload === 'object') ? request.payload : {};
    const method = request && request.method ? String(request.method).toUpperCase() : 'POST';

    Utils.logServer(action, 'REQUEST_RECEIVED', { method });

    // Validate action parameter
    if (!action) {
      Utils.logServer('UNKNOWN', 'VALIDATION_FAILED', { reason: 'Missing action field' });
      return Response.errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid request: "action" property is required.'
      );
    }

    // Check if action exists in registry
    const handlerMethodName = this._actionRegistry[action];
    if (!handlerMethodName || typeof this[handlerMethodName] !== 'function') {
      Utils.logServer(action, 'UNKNOWN_ACTION_REJECTED');
      return Response.errorResponse(
        ErrorCodes.UNKNOWN_ACTION,
        `Unknown action "${action}". Action is not registered in backend action registry.`
      );
    }

    // Execute registered handler safely
    try {
      const result = this[handlerMethodName](payload, request);
      Utils.logServer(action, 'SUCCESS');
      return Response.successResponse(result);
    } catch (err) {
      const code = err.code || ErrorCodes.INTERNAL_ERROR;
      const cleanMessage = Utils.sanitizeErrorMessage(err);
      Utils.logServer(action, 'ERROR', { code, error: cleanMessage });
      return Response.errorResponse(code, cleanMessage);
    }
  },

  /**
   * Handle 'healthCheck' action.
   * Evaluates backend readiness without exposing secrets, credentials, or sensitive IDs.
   * @param {Object} payload 
   * @returns {Object} Health check status report
   */
  handleHealthCheck(payload) {
    const env = Config.getEnvironment();
    const isSpreadsheetConfigured = Config.isConfigured(ConfigKeys.SPREADSHEET_ID);
    const isDriveConfigured = Config.isConfigured(ConfigKeys.DRIVE_ROOT_ID);
    const isGeminiConfigured = Config.isConfigured(ConfigKeys.GEMINI_API_KEY);

    let spreadsheetReachable = false;
    let spreadsheetNote = 'Not configured';

    if (isSpreadsheetConfigured) {
      try {
        const db = SpreadsheetService.getDatabase();
        if (db) {
          spreadsheetReachable = true;
          spreadsheetNote = 'Connected';
        }
      } catch (err) {
        spreadsheetReachable = false;
        spreadsheetNote = 'Configured but inaccessible: ' + Utils.sanitizeErrorMessage(err);
      }
    }

    // Determine overall status
    let status = 'NOT_CONFIGURED';
    if (isSpreadsheetConfigured && spreadsheetReachable) {
      status = 'READY';
    } else if (isSpreadsheetConfigured && !spreadsheetReachable) {
      status = 'DEGRADED';
    }

    return {
      service: 'REPORTER AI Backend',
      version: '1.0.0',
      environment: env,
      status: status,
      checks: {
        config: isSpreadsheetConfigured,
        spreadsheet: spreadsheetReachable,
        router: true,
        drive_configured: isDriveConfigured,
        gemini_configured: isGeminiConfigured
      },
      database: spreadsheetReachable ? 'CONNECTED' : (isSpreadsheetConfigured ? 'ERROR' : 'NOT_CONFIGURED'),
      notes: spreadsheetNote
    };
  },

  /**
   * Handle 'createProject' action.
   * @param {Object} payload
   */
  handleCreateProject(payload) {
    return ProjectService.createProject(payload);
  },

  /**
   * Handle 'getProject' action.
   * @param {Object} payload
   */
  handleGetProject(payload) {
    const projectId = payload ? (payload.projectId || payload.project_id || payload.id) : null;
    return ProjectService.getProject(projectId);
  },

  /**
   * Handle 'listProjects' action.
   * @param {Object} payload
   */
  handleListProjects(payload) {
    return ProjectService.listProjects(payload);
  },

  /**
   * Handle 'updateProject' action.
   * @param {Object} payload
   */
  handleUpdateProject(payload) {
    const projectId = payload ? (payload.projectId || payload.project_id || payload.id) : null;
    const updates = (payload && payload.updates && typeof payload.updates === 'object') ? payload.updates : payload;
    return ProjectService.updateProject(projectId, updates);
  },

  /**
   * Handle 'archiveProject' action.
   * @param {Object} payload
   */
  handleArchiveProject(payload) {
    const projectId = payload ? (payload.projectId || payload.project_id || payload.id) : null;
    return ProjectService.archiveProject(projectId);
  },

  /**
   * Handle 'changeProjectStage' action.
   * @param {Object} payload
   */
  handleChangeProjectStage(payload) {
    const projectId = payload ? (payload.projectId || payload.project_id || payload.id) : null;
    const targetStage = payload ? (payload.targetStage || payload.target_stage || payload.stage) : null;
    return ProjectService.changeProjectStage(projectId, targetStage);
  },

  // =========================================================================
  // SOURCE ACTION HANDLERS
  // =========================================================================

  handleCreateSource(payload) {
    return SourceService.createSource(payload);
  },

  handleGetSource(payload) {
    const sourceId = payload ? (payload.sourceId || payload.source_id || payload.id) : null;
    return SourceService.getSource(sourceId);
  },

  handleGetSources(payload) {
    return SourceService.getSources(payload);
  },

  handleUpdateSource(payload) {
    const sourceId = payload ? (payload.sourceId || payload.source_id || payload.id) : null;
    const updates = (payload && payload.updates && typeof payload.updates === 'object') ? payload.updates : payload;
    return SourceService.updateSource(sourceId, updates);
  },

  handleDeleteSource(payload) {
    const sourceId = payload ? (payload.sourceId || payload.source_id || payload.id) : null;
    return SourceService.deleteSource(sourceId);
  },

  // =========================================================================
  // FACT ACTION HANDLERS
  // =========================================================================

  handleCreateFact(payload) {
    return FactService.createFact(payload);
  },

  handleGetFact(payload) {
    const factId = payload ? (payload.factId || payload.fact_id || payload.id) : null;
    return FactService.getFact(factId);
  },

  handleGetFacts(payload) {
    return FactService.getFacts(payload);
  },

  handleUpdateFact(payload) {
    const factId = payload ? (payload.factId || payload.fact_id || payload.id) : null;
    const updates = (payload && payload.updates && typeof payload.updates === 'object') ? payload.updates : payload;
    return FactService.updateFact(factId, updates);
  },

  handleVerifyFact(payload) {
    const factId = payload ? (payload.factId || payload.fact_id || payload.id) : null;
    const verifiedBy = payload ? (payload.verifiedBy || payload.verified_by) : 'EDITOR_HUMAN';
    return FactService.verifyFact(factId, verifiedBy);
  },

  handleRejectFact(payload) {
    const factId = payload ? (payload.factId || payload.fact_id || payload.id) : null;
    const reason = payload ? (payload.reason || payload.notes) : '';
    return FactService.rejectFact(factId, reason);
  },

  handleAnalyzeFacts(payload) {
    const projectId = payload ? (payload.projectId || payload.project_id || payload.id) : null;
    return FactService.analyzeFacts(projectId);
  },

  // =========================================================================
  // PEOPLE ACTION HANDLERS
  // =========================================================================

  handleCreatePerson(payload) {
    return PeopleService.createPerson(payload);
  },

  handleGetPerson(payload) {
    const personId = payload ? (payload.personId || payload.person_id || payload.id) : null;
    return PeopleService.getPerson(personId);
  },

  handleGetPeople(payload) {
    return PeopleService.getPeople(payload);
  },

  handleUpdatePerson(payload) {
    const personId = payload ? (payload.personId || payload.person_id || payload.id) : null;
    const updates = (payload && payload.updates && typeof payload.updates === 'object') ? payload.updates : payload;
    return PeopleService.updatePerson(personId, updates);
  },

  handleVerifyPerson(payload) {
    const personId = payload ? (payload.personId || payload.person_id || payload.id) : null;
    return PeopleService.verifyPerson(personId);
  },

  // =========================================================================
  // QUOTE ACTION HANDLERS
  // =========================================================================

  handleCreateQuote(payload) {
    return QuoteService.createQuote(payload);
  },

  handleGetQuote(payload) {
    const quoteId = payload ? (payload.quoteId || payload.quote_id || payload.id) : null;
    return QuoteService.getQuote(quoteId);
  },

  handleGetQuotes(payload) {
    return QuoteService.getQuotes(payload);
  },

  handleUpdateQuote(payload) {
    const quoteId = payload ? (payload.quoteId || payload.quote_id || payload.id) : null;
    const updates = (payload && payload.updates && typeof payload.updates === 'object') ? payload.updates : payload;
    return QuoteService.updateQuote(quoteId, updates);
  },

  handleVerifyQuote(payload) {
    const quoteId = payload ? (payload.quoteId || payload.quote_id || payload.id) : null;
    return QuoteService.verifyQuote(quoteId);
  },

  handleApproveQuote(payload) {
    const quoteId = payload ? (payload.quoteId || payload.quote_id || payload.id) : null;
    return QuoteService.approveQuote(quoteId);
  },

  handleRejectQuote(payload) {
    const quoteId = payload ? (payload.quoteId || payload.quote_id || payload.id) : null;
    const reason = payload ? (payload.reason || payload.notes) : '';
    return QuoteService.rejectQuote(quoteId, reason);
  },

  // =========================================================================
  // EVENT ACTION HANDLERS
  // =========================================================================

  handleCreateEvent(payload) {
    return EventService.createEvent(payload);
  },

  handleGetEvent(payload) {
    const eventId = payload ? (payload.eventId || payload.event_id || payload.id) : null;
    return EventService.getEvent(eventId);
  },

  handleGetEvents(payload) {
    return EventService.getEvents(payload);
  },

  handleUpdateEvent(payload) {
    const eventId = payload ? (payload.eventId || payload.event_id || payload.id) : null;
    const updates = (payload && payload.updates && typeof payload.updates === 'object') ? payload.updates : payload;
    return EventService.updateEvent(eventId, updates);
  },

  handleReorderEvents(payload) {
    const projectId = payload ? (payload.projectId || payload.project_id || payload.id) : null;
    const orderedEventIds = payload ? (payload.orderedEventIds || payload.event_ids || payload.ids) : [];
    return EventService.reorderEvents(projectId, orderedEventIds);
  }
};

