// The room directory: what users without admin rights need to know about the rooms (they cannot
// read automations). An administrator's card publishes it in Home Assistant's frontend system
// data, which every user can read and subscribe to.

import { DIRECTORY_KEY } from '../domain/constants.js';
import { directoryEntry } from '../domain/room.js';

/**
 * @typedef {object} Directory
 * @property {number} v the format's version
 * @property {boolean} script the day script exists
 * @property {string | null} exceptions the exceptions calendar
 * @property {Array<Record<string, unknown>>} rooms see DIRECTORY_FIELDS
 */

/**
 * @typedef {object} Home What the directory is made from.
 * @property {import('../domain/room.js').Room[]} rooms all rooms
 * @property {boolean} script the day script exists
 * @property {string | null} exceptions the exceptions calendar
 */

/**
 * The directory of a home.
 * @param {Home} home
 * @returns {Directory}
 */
export function makeDirectory({ rooms, script, exceptions }) {
  return { v: 1, script, exceptions, rooms: rooms.map(directoryEntry) };
}

/**
 * The published directory, or null if there is none (no admin opened the card yet).
 * @param {import('./gateway.js').Gateway} gateway
 * @returns {Promise<Directory | null>}
 */
export async function readDirectory(gateway) {
  const data = await gateway.ws({ type: 'frontend/get_system_data', key: DIRECTORY_KEY });
  const directory = data?.value;
  return directory && Array.isArray(directory.rooms) ? directory : null;
}

/**
 * Admin: publish the directory, only if it changed.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {Directory} directory
 * @returns {Promise<boolean>} whether it was written
 */
export async function publishDirectory(gateway, directory) {
  const current = await readDirectory(gateway);
  if (JSON.stringify(current) === JSON.stringify(directory)) return false;
  await gateway.ws({ type: 'frontend/set_system_data', key: DIRECTORY_KEY, value: directory });
  return true;
}

/**
 * Call back whenever an administrator's card publishes a new directory (not for the current one,
 * which the subscription sends first).
 * @param {import('./gateway.js').Gateway} gateway
 * @param {() => void} onChange
 * @returns {Promise<() => void>} ends the subscription
 */
export function watchDirectory(gateway, onChange) {
  let first = true;
  const message = { type: 'frontend/subscribe_system_data', key: DIRECTORY_KEY };
  return gateway.subscribe(message, () => {
    if (!first) onChange();
    first = false;
  });
}
