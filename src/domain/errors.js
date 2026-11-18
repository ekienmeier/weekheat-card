// Errors from Home Assistant: a readable message, and telling "not found" from a real failure.

/**
 * A readable message for an error: `callApi` rejects with `{error, status_code, body}`, `callWS`
 * with `{code, message}`, other code with an Error.
 * @param {any} error
 * @returns {string}
 */
export function errorText(error) {
  if (!error || typeof error !== 'object') return String(error);
  return error.message || error.body?.message || error.error || JSON.stringify(error);
}

/**
 * Did a `callApi` request fail because what it asked for does not exist (HTTP 404)?
 * @param {any} error the rejection of `hass.callApi`
 * @returns {boolean}
 */
export function isNotFound(error) {
  return error?.status_code === 404;
}

/**
 * An error the card explains to the user in their language: its code names the text `err_<code>`,
 * and its values fill that text's placeholders.
 */
export class CardError extends Error {
  /**
   * @param {string} code e.g. "state_size"
   * @param {Record<string, string | number>} [values] e.g. {size: 260, max: 255}
   */
  constructor(code, values = {}) {
    super(code);
    this.code = code;
    this.values = values;
  }
}
