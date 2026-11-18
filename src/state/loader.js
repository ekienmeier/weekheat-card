// Loading what the card shows from Home Assistant: the rooms (from their automations for an
// administrator, from the room directory for others), the plans and the day list.

import { blueprintStatus } from '../ha/blueprints.js';
import { loadDays } from '../ha/days.js';
import { makeDirectory, publishDirectory, readDirectory } from '../ha/directory.js';
import { loadPlans } from '../ha/plans.js';
import { readRooms, roomBlueprintPaths } from '../ha/rooms.js';

/**
 * The rooms to show: those the `rooms` option names, in its order (entity or automation ids);
 * without it, all, by name.
 * @param {import('../domain/room.js').Room[]} rooms
 * @param {string[] | undefined} order
 * @returns {import('../domain/room.js').Room[]}
 */
export function orderRooms(rooms, order) {
  if (!Array.isArray(order) || !order.length)
    return [...rooms].sort((a, b) => a.name.localeCompare(b.name));
  const named = (key) => rooms.find((room) => room.entity === key || room.id === key);
  return order.map(named).filter(Boolean);
}

/**
 * The day script's id (its entity id without "script.").
 * @param {import('./context.js').CardConfig} config
 * @returns {string}
 */
export function scriptId(config) {
  return config.day_script.replace(/^script\./, '');
}

/**
 * Admin: publish the room directory for other users. An older Home Assistant without frontend
 * system data cannot keep it; then only administrators see rooms, which is no reason to fail.
 * @param {import('./context.js').Context} ctx
 * @returns {Promise<void>}
 */
export async function publishHome(ctx) {
  const { allRooms, script, exceptions } = ctx.store.data;
  const directory = makeDirectory({ rooms: allRooms, script: Boolean(script), exceptions });
  try {
    await publishDirectory(ctx.gateway, directory);
  } catch (error) {
    console.warn('Weekheat: the room directory cannot be published', error);
  }
}

/**
 * Admin: the rooms, the day script and the blueprints. Any failed read rejects (review H4).
 * @param {import('./context.js').Context} ctx
 * @returns {Promise<Partial<import('./store.js').Data>>}
 */
async function homeForAdmin(ctx) {
  const { automations, old } = await blueprintStatus(ctx.gateway);
  const paths = roomBlueprintPaths(automations);
  const allRooms = await readRooms(ctx.gateway, paths);
  const script = await ctx.gateway.readConfig(`script/config/${scriptId(ctx.config)}`);
  const exceptions = script?.use_blueprint?.input?.exceptions || null;
  const home = { admin: true, allRooms, script, hasScript: Boolean(script), exceptions };
  return { ...home, roomBlueprint: paths[0] || null, oldBlueprints: old, noDirectory: false };
}

/**
 * Not admin: the rooms from the directory an administrator's card published.
 * @param {import('./context.js').Context} ctx
 * @returns {Promise<Partial<import('./store.js').Data>>}
 */
async function homeForUser(ctx) {
  const directory = await readDirectory(ctx.gateway);
  const none = { admin: false, script: null, roomBlueprint: null, oldBlueprints: [] };
  if (!directory)
    return { ...none, allRooms: [], hasScript: false, exceptions: null, noDirectory: true };
  const allRooms = /** @type {any[]} */ (directory.rooms.map((room) => ({ ...room })));
  return {
    ...none,
    allRooms,
    hasScript: Boolean(directory.script),
    exceptions: directory.exceptions,
    noDirectory: false,
  };
}

/**
 * The day list, when there is a day script.
 * @param {import('./context.js').Context} ctx
 * @returns {Promise<import('../domain/plans.js').Day[] | null>}
 */
export function loadDayList(ctx) {
  if (!ctx.store.data.hasScript) return Promise.resolve(null);
  return loadDays(ctx.gateway, { script: ctx.config.day_script, days: ctx.config.days });
}

/**
 * Load everything the card shows. Only the newest load's result is kept, so that a slow older one
 * cannot overwrite it (review L11). An administrator's card then publishes the room directory.
 * @param {import('./context.js').Context} ctx
 * @returns {Promise<void>}
 */
export async function load(ctx) {
  const generation = ++ctx.store.loads;
  try {
    const home = ctx.gateway.isAdmin ? await homeForAdmin(ctx) : await homeForUser(ctx);
    const plans = await loadPlans(ctx.gateway);
    const rooms = orderRooms(home.allRooms, ctx.config.rooms);
    if (generation !== ctx.store.loads) return;
    ctx.store.update((store) => Object.assign(store.data, home, { plans, rooms, error: null }));
    const days = await loadDayList(ctx);
    if (generation === ctx.store.loads) ctx.store.update((store) => (store.data.days = days));
    if (home.admin) await publishHome(ctx);
  } catch (error) {
    if (generation === ctx.store.loads) ctx.store.update((store) => (store.data.error = error));
  }
}
