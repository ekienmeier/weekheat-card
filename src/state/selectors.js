// Reading the state: values the views and actions need, computed from the store and Home
// Assistant's states. Nothing here changes anything.

import { MAX_T, MIN_T } from '../domain/constants.js';
import { planLabel, dayOf } from '../domain/plans.js';
import { exerciseFromInput } from '../domain/room.js';
import { roomStatus } from '../domain/room-status.js';
import { thermostatStatus, mixedTargets } from '../domain/thermostat-status.js';
import { snap } from '../domain/dial.js';
import { nowIn } from '../domain/time.js';
import { languageOf, textsFor } from '../i18n/text.js';

/**
 * The language the card speaks.
 * @param {import('./context.js').Context} ctx
 * @returns {'de' | 'en'}
 */
export function lang(ctx) {
  return languageOf(ctx.gateway.hass);
}

/**
 * The texts in the card's language.
 * @param {import('./context.js').Context} ctx
 * @returns {import('../i18n/text.js').Texts}
 */
export function texts(ctx) {
  return textsFor(lang(ctx));
}

/**
 * Today's date, weekday and minute in Home Assistant's time zone.
 * @param {import('./context.js').Context} ctx
 * @returns {{date: string, day: string, min: number}}
 */
export function now(ctx) {
  return nowIn(ctx.gateway.hass.config.time_zone);
}

/**
 * Today's day decision.
 * @param {import('./context.js').Context} ctx
 * @returns {import('../domain/plans.js').Day}
 */
export function today(ctx) {
  return dayOf(ctx.store.data.days, now(ctx));
}

/**
 * The plans' friendly names (from their states, else their helpers), by entity id.
 * @param {import('./context.js').Context} ctx
 * @returns {Record<string, string>}
 */
export function friendlyNames(ctx) {
  const { plans } = ctx.store.data;
  const name = (entity) =>
    ctx.gateway.states[entity]?.attributes.friendly_name || plans[entity].item.name;
  return Object.fromEntries(Object.keys(plans).map((entity) => [entity, name(entity)]));
}

/**
 * A plan's name as the card shows it, without the room's name.
 * @param {import('./context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @param {string} entity the plan
 * @returns {string}
 */
export function planName(ctx, room, entity) {
  const friendly = ctx.gateway.states[entity]?.attributes.friendly_name;
  return planLabel(friendly || ctx.store.data.plans[entity]?.item.name || entity, room.name);
}

/**
 * A room by its id, shown or not.
 * @param {import('./context.js').Context} ctx
 * @param {string} id
 * @returns {import('../domain/room.js').Room | undefined}
 */
export function findRoom(ctx, id) {
  const { rooms, allRooms } = ctx.store.data;
  return (rooms || []).find((room) => room.id === id) || allRooms.find((room) => room.id === id);
}

/**
 * What a room is doing now.
 * @param {import('./context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @returns {import('../domain/room-status.js').RoomStatus}
 */
export function statusOf(ctx, room) {
  const input = { states: ctx.gateway.states, plans: ctx.store.data.plans, today: today(ctx) };
  return roomStatus(room, { ...input, minute: now(ctx).min, friendly: friendlyNames(ctx) });
}

/**
 * What a control shows: one thermostat's status, or the room's for '' (all of them).
 * @param {import('./context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @param {string} th a thermostat of the room, or ''
 * @returns {import('../domain/room-status.js').RoomStatus}
 */
export function controlStatus(ctx, room, th) {
  const status = statusOf(ctx, room);
  if (!th || !room.thermostats.includes(th)) return status;
  return thermostatStatus(room, th, { status, states: ctx.gateway.states });
}

/**
 * The setpoints of a room's thermostats when they differ, else null.
 * @param {import('./context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @returns {number[] | null}
 */
export function mixed(ctx, room) {
  return mixedTargets(room, { status: statusOf(ctx, room), states: ctx.gateway.states });
}

/**
 * The setpoint a control shows: one being dragged or set, else (for one thermostat while "All
 * together" is being stepped) its moved value, else (for all while they differ) their average,
 * else the setpoint.
 * @param {import('./context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @param {string} th a thermostat, or '' for all
 * @returns {number | null}
 */
export function shownValue(ctx, room, th) {
  const { drag, pending, shift } = ctx.store.control;
  const setting = [drag, pending].find((item) => item?.room === room.id && item.th === th);
  if (setting) return setting.value;
  const status = controlStatus(ctx, room, th);
  if (shift?.room === room.id && th && typeof shift.base[th] === 'number') {
    return snapT(shift.base[th] + shift.delta, status.step);
  }
  const values = th ? null : mixed(ctx, room);
  if (values)
    return snapT(values.reduce((sum, value) => sum + value, 0) / values.length, status.step);
  return status.target;
}

/**
 * A setpoint rounded to a step and kept within MIN_T and MAX_T.
 * @param {number} value
 * @param {number} step
 * @returns {number}
 */
export function snapT(value, step) {
  return snap(value, { low: MIN_T, high: MAX_T, step });
}

/**
 * The scale of the dial and the slider.
 * @param {import('./context.js').Context} ctx
 * @returns {{low: number, high: number}}
 */
export function scale(ctx) {
  return { low: ctx.config.dial_min, high: ctx.config.dial_max };
}

/**
 * The plan names in use in any room, sorted, each once (ignoring case).
 * @param {import('./context.js').Context} ctx
 * @returns {string[]}
 */
export function allPlanNames(ctx) {
  const names = new Map();
  for (const room of ctx.store.data.allRooms) {
    for (const plan of room.plans)
      names.set(planName(ctx, room, plan).toLowerCase(), planName(ctx, room, plan));
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * The valve exercise's settings: those of the first room (the card writes them to all).
 * @param {import('./context.js').Context} ctx
 * @returns {{exercise_day: string, exercise_time: string, exercise_wait: number}}
 */
export function exerciseSettings(ctx) {
  return exerciseFromInput(ctx.store.data.allRooms[0]?.cfg?.use_blueprint?.input);
}
