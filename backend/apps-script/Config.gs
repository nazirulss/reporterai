/**
 * REPORTER AI — Apps Script Backend Foundation
 * File: Config.gs
 * Description: Centralized server-side configuration utilizing PropertiesService.
 * SECURITY: Never hardcodes secrets, IDs, or keys. Never exposes secrets to client.
 */

const ConfigKeys = {
  SPREADSHEET_ID: 'REPORTER_AI_SPREADSHEET_ID',
  DRIVE_ROOT_ID: 'REPORTER_AI_DRIVE_ROOT_ID',
  GEMINI_API_KEY: 'REPORTER_AI_GEMINI_API_KEY',
  ENVIRONMENT: 'REPORTER_AI_ENVIRONMENT'
};

const Environments = {
  DEMO: 'DEMO',
  DEVELOPMENT: 'DEVELOPMENT',
  PRODUCTION: 'PRODUCTION'
};

const Config = {
  /**
   * Internal helper to access script properties safely
   * @private
   * @returns {Object} Key-value map of script properties
   */
  _getProperties() {
    if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
      try {
        return PropertiesService.getScriptProperties().getProperties() || {};
      } catch (err) {
        console.error('Error accessing PropertiesService:', err);
        return {};
      }
    }
    // Fallback for local testing environments
    return typeof process !== 'undefined' && process.env ? process.env : {};
  },

  /**
   * Get an optional property with default fallback
   * @param {string} key 
   * @param {*} [defaultValue=null] 
   * @returns {string|null}
   */
  getOptionalProperty(key, defaultValue = null) {
    const props = this._getProperties();
    const val = props[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
    return defaultValue;
  },

  /**
   * Get a required property or throw a controlled configuration error
   * @param {string} key 
   * @returns {string}
   * @throws {Error} If key is missing or blank
   */
  getRequiredProperty(key) {
    const val = this.getOptionalProperty(key);
    if (!val) {
      const err = new Error(`Configuration property "${key}" is missing or unconfigured in Script Properties.`);
      err.code = ErrorCodes.CONFIG_ERROR;
      throw err;
    }
    return val;
  },

  /**
   * Check if a property is present and non-empty
   * @param {string} key 
   * @returns {boolean}
   */
  isConfigured(key) {
    const val = this.getOptionalProperty(key);
    return Boolean(val);
  },

  /**
   * Get current operating environment
   * @returns {string} 'DEMO' | 'DEVELOPMENT' | 'PRODUCTION'
   */
  getEnvironment() {
    const env = this.getOptionalProperty(ConfigKeys.ENVIRONMENT, Environments.DEVELOPMENT);
    const upper = String(env).toUpperCase();
    if (Environments[upper]) {
      return Environments[upper];
    }
    return Environments.DEVELOPMENT;
  },

  /**
   * Safe getter for Google Spreadsheet Database ID (Server-side use only)
   * @returns {string}
   */
  getSpreadsheetId() {
    return this.getRequiredProperty(ConfigKeys.SPREADSHEET_ID);
  },

  /**
   * Safe getter for Google Drive Root Folder ID (Server-side use only)
   * @returns {string}
   */
  getDriveRootId() {
    return this.getRequiredProperty(ConfigKeys.DRIVE_ROOT_ID);
  },

  /**
   * Safe getter for Gemini API Key (Server-side use only, NEVER send to client)
   * @returns {string}
   */
  getGeminiApiKey() {
    return this.getRequiredProperty(ConfigKeys.GEMINI_API_KEY);
  },

  /**
   * Return a sanitized public configuration report.
   * SECURITY: Never returns raw IDs, secrets, or API keys!
   * @returns {Object}
   */
  getConfig() {
    return {
      service: 'REPORTER AI Backend',
      environment: this.getEnvironment(),
      configured: {
        spreadsheet: this.isConfigured(ConfigKeys.SPREADSHEET_ID),
        drive: this.isConfigured(ConfigKeys.DRIVE_ROOT_ID),
        gemini: this.isConfigured(ConfigKeys.GEMINI_API_KEY)
      }
    };
  }
};
