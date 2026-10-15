/**
 * REPORTER AI — Apps Script Backend Foundation
 * File: Response.gs
 * Description: Standardized API response formatters and ContentService output helpers.
 */

const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  CONFIG_ERROR: 'CONFIG_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  UNKNOWN_ACTION: 'UNKNOWN_ACTION'
};

const Response = {
  /**
   * Create standard success response envelope
   * @param {Object} data 
   * @param {Object} [meta] 
   * @returns {Object}
   */
  successResponse(data, meta = {}) {
    return {
      success: true,
      data: data !== undefined ? data : {},
      meta: Object.assign({
        timestamp: new Date().toISOString()
      }, meta)
    };
  },

  /**
   * Create standard error response envelope
   * @param {string} code 
   * @param {string} message 
   * @param {Object} [details] 
   * @returns {Object}
   */
  errorResponse(code, message, details) {
    const errorObj = {
      code: code || ErrorCodes.INTERNAL_ERROR,
      message: message || 'An error occurred while processing the request.'
    };

    if (details !== undefined && details !== null) {
      errorObj.details = details;
    }

    return {
      success: false,
      error: errorObj,
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  },

  /**
   * Wrap payload into Google Apps Script JSON ContentService output
   * @param {Object} object 
   * @returns {GoogleAppsScript.Content.TextOutput}
   */
  jsonOutput(object) {
    const jsonString = JSON.stringify(object);
    if (typeof ContentService !== 'undefined' && ContentService.createTextOutput) {
      return ContentService.createTextOutput(jsonString).setMimeType(ContentService.MimeType.JSON);
    }
    // Fallback for non-Apps-Script testing environments
    return jsonString;
  }
};
