/**
 * REPORTER AI — Apps Script Backend Foundation
 * File: Utils.gs
 * Description: Reusable server-side utility helpers, ID generators, and security sanitizers.
 */

const Utils = {
  /**
   * Return current UTC timestamp in ISO 8601 format
   * @returns {string}
   */
  nowIso() {
    return new Date().toISOString();
  },

  /**
   * Generate human-readable, domain-prefixed identifier.
   * NEVER uses spreadsheet row numbers as public record IDs.
   * @param {string} prefix e.g. 'NEWS', 'SRC', 'FACT', 'PERS', 'QUO', 'EVT', 'VAL', 'ANG', 'STR', 'DRF', 'EDT', 'SEO', 'MED', 'PUB', 'USR', 'LOG'
   * @returns {string}
   */
  generateId(prefix = 'REC') {
    const cleanPrefix = String(prefix).toUpperCase().trim();
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomHex = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase();
    return `${cleanPrefix}-${timestamp}-${randomHex}`;
  },

  /**
   * Generate sequential style project ID with year e.g. NEWS-2026-XXXX
   * @returns {string}
   */
  generateProjectId() {
    const year = new Date().getFullYear();
    const randomNum = String(Math.floor(Math.random() * 9000) + 1000);
    return `PROJ-${year}-${randomNum}`;
  },

  /**
   * Parse JSON string safely without throwing unhandled exceptions
   * @param {string} str 
   * @param {*} [fallback=null] 
   * @returns {*}
   */
  safeJsonParse(str, fallback = null) {
    if (typeof str !== 'string' || !str.trim()) {
      return fallback;
    }
    try {
      return JSON.parse(str);
    } catch (e) {
      return fallback;
    }
  },

  /**
   * Assert presence of required field in payload
   * @param {Object} object 
   * @param {string} fieldName 
   * @param {string} [contextMessage] 
   * @returns {*}
   * @throws {Error}
   */
  requireField(object, fieldName, contextMessage) {
    if (!object || object[fieldName] === undefined || object[fieldName] === null || object[fieldName] === '') {
      const msg = contextMessage || `Required field "${fieldName}" is missing or empty.`;
      const err = new Error(msg);
      err.code = ErrorCodes.VALIDATION_ERROR;
      throw err;
    }
    return object[fieldName];
  },

  /**
   * Check if a value is a non-empty string
   * @param {*} val 
   * @returns {boolean}
   */
  isNonEmptyString(val) {
    return typeof val === 'string' && val.trim().length > 0;
  },

  /**
   * Normalize and trim string value safely
   * @param {*} val 
   * @returns {string}
   */
  normalizeString(val) {
    if (val === undefined || val === null) return '';
    return String(val).trim();
  },

  /**
   * Deep clone serializable object
   * @param {*} obj 
   * @returns {*}
   */
  deepClone(obj) {
    if (obj === undefined || obj === null) return obj;
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return Object.assign({}, obj);
    }
  },

  /**
   * Verify HTTP method against allowed list
   * @param {string} method 
   * @param {string[]} allowedMethods 
   * @throws {Error}
   */
  assertAllowedMethod(method, allowedMethods = ['POST']) {
    const upper = String(method || '').toUpperCase();
    if (!allowedMethods.map(m => m.toUpperCase()).includes(upper)) {
      const err = new Error(`HTTP method "${method}" is not allowed. Allowed methods: ${allowedMethods.join(', ')}`);
      err.code = ErrorCodes.METHOD_NOT_ALLOWED;
      throw err;
    }
  },

  /**
   * Sanitize error message to prevent leaking paths, API keys, or internal stack details
   * @param {Error|string} err 
   * @returns {string}
   */
  sanitizeErrorMessage(err) {
    let msg = (err && err.message) ? err.message : String(err || 'Unknown error');
    // Mask potential API keys or IDs
    msg = msg.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
    msg = msg.replace(/1[a-zA-Z0-9_-]{43}/g, '[REDACTED_SPREADSHEET_ID]');
    return msg;
  },

  /**
   * Lightweight server logging without logging sensitive credentials or tokens
   * @param {string} action 
   * @param {string} status 
   * @param {Object} [details] 
   */
  logServer(action, status, details = {}) {
    const env = Config.getEnvironment();
    const entry = {
      timestamp: this.nowIso(),
      action: action || 'UNKNOWN',
      environment: env,
      status: status || 'INFO'
    };

    if (details && typeof details === 'object') {
      const safeDetails = Object.assign({}, details);
      // Remove any potential secrets before logging
      delete safeDetails.apiKey;
      delete safeDetails.token;
      delete safeDetails.password;
      delete safeDetails.secret;
      entry.details = safeDetails;
    }

    try {
      console.log(`[REPORTER_AI_SERVER] ${JSON.stringify(entry)}`);
    } catch (e) {
      // In case console.log fails in certain environments
    }
  }
};
