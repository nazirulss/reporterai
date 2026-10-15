/**
 * REPORTER AI — Apps Script Backend Foundation
 * File: Code.gs
 * Description: HTTP Web App entry points (doGet, doPost).
 * ARCHITECTURE: Pure dispatcher layer. Zero business logic inside doGet/doPost.
 */

/**
 * Handle HTTP GET requests
 * Supports query parameters e.g. /exec?action=healthCheck
 * @param {Object} e Event object from Apps Script Web App
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action ? String(params.action).trim() : 'healthCheck';

    // Clone parameters into payload, removing action key
    const payload = Object.assign({}, params);
    delete payload.action;

    const request = {
      action: action,
      payload: payload,
      method: 'GET'
    };

    const responseObj = Router.routeRequest(request);
    return Response.jsonOutput(responseObj);
  } catch (err) {
    console.error('[doGet Fatal Error]:', err);
    const errorObj = Response.errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error while processing GET request.'
    );
    return Response.jsonOutput(errorObj);
  }
}

/**
 * Handle HTTP POST requests
 * Accepts JSON body: { "action": "...", "payload": { ... } }
 * @param {Object} e Event object from Apps Script Web App
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function doPost(e) {
  try {
    let postDataString = '';

    if (e && e.postData && e.postData.contents) {
      postDataString = e.postData.contents;
    }

    if (!postDataString || !postDataString.trim()) {
      const errorObj = Response.errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Empty request body. Expected JSON object with "action" and "payload".'
      );
      return Response.jsonOutput(errorObj);
    }

    const parsedBody = Utils.safeJsonParse(postDataString, null);
    if (!parsedBody || typeof parsedBody !== 'object') {
      const errorObj = Response.errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Malformed JSON payload in request body.'
      );
      return Response.jsonOutput(errorObj);
    }

    const action = parsedBody.action ? String(parsedBody.action).trim() : '';
    const payload = (parsedBody.payload && typeof parsedBody.payload === 'object') ? parsedBody.payload : {};

    const request = {
      action: action,
      payload: payload,
      method: 'POST'
    };

    const responseObj = Router.routeRequest(request);
    return Response.jsonOutput(responseObj);
  } catch (err) {
    console.error('[doPost Fatal Error]:', err);
    const errorObj = Response.errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error while processing POST request.'
    );
    return Response.jsonOutput(errorObj);
  }
}
