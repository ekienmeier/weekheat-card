// The one place that talks to Home Assistant: WebSocket commands, REST calls, services and
// subscriptions. It always uses the newest `hass` object the card was given.

import { isNotFound } from '../domain/errors.js';

/** Calls to Home Assistant, through the current `hass` object. */
export class Gateway {
  /**
   * @param {any} [hass] Home Assistant's object for the card
   */
  constructor(hass = null) {
    this.hass = hass;
  }

  /**
   * Use a newer `hass` object: Home Assistant gives the card a new one on every state change.
   * @param {any} hass
   */
  use(hass) {
    this.hass = hass;
  }

  /**
   * Every entity's state.
   * @returns {Record<string, import('../domain/room-status.js').HassState>}
   */
  get states() {
    return this.hass.states;
  }

  /**
   * Is the user an administrator? Only they may read and change configurations.
   * @returns {boolean}
   */
  get isAdmin() {
    return Boolean(this.hass.user?.is_admin);
  }

  /**
   * Send a WebSocket command.
   * @param {Record<string, unknown>} message
   * @returns {Promise<any>} its result
   */
  ws(message) {
    return this.hass.callWS(message);
  }

  /**
   * A configuration from the config API, or null if there is none (404); other failures reject.
   * @param {string} path the part after `config/`, e.g. "script/config/weekheat_day"
   * @returns {Promise<any>}
   */
  async readConfig(path) {
    try {
      return await this.hass.callApi('GET', `config/${path}`);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  /**
   * Save a configuration with the config API.
   * @param {string} path see readConfig
   * @param {object} config
   * @returns {Promise<unknown>}
   */
  saveConfig(path, config) {
    return this.hass.callApi('POST', `config/${path}`, config);
  }

  /**
   * Delete a configuration with the config API.
   * @param {string} path see readConfig
   * @returns {Promise<unknown>}
   */
  deleteConfig(path) {
    return this.hass.callApi('DELETE', `config/${path}`);
  }

  /**
   * Read a REST endpoint, e.g. a calendar's events.
   * @param {string} path the part after `/api/`
   * @returns {Promise<any>}
   */
  get(path) {
    return this.hass.callApi('GET', path);
  }

  /**
   * Call a service.
   * @param {string} domain
   * @param {string} service
   * @param {Record<string, unknown>} [data]
   * @returns {Promise<unknown>}
   */
  service(domain, service, data = {}) {
    return this.hass.callService(domain, service, data);
  }

  /**
   * Run a script and return its response.
   * @param {string} entity the script, e.g. "script.weekheat_day"
   * @param {Record<string, unknown>} data its fields
   * @returns {Promise<any>}
   */
  async runScript(entity, data) {
    const service = entity.replace(/^script\./, '');
    const call = { domain: 'script', service, service_data: data, return_response: true };
    const answer = await this.ws({ type: 'call_service', ...call });
    return answer.response;
  }

  /**
   * Subscribe to messages of a WebSocket command.
   * @param {Record<string, unknown>} message the subscription command
   * @param {(message: any) => void} callback gets every message
   * @returns {Promise<() => void>} resolves with the function that ends the subscription
   */
  subscribe(message, callback) {
    return this.hass.connection.subscribeMessage(callback, message);
  }
}
