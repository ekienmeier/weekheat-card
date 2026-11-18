// How a room's status shows: its icon, colour and words, in the room list and on the controls.
// One table for both, so that they always agree (review M14).

import { OFF_T } from '../domain/constants.js';
import { formatPeriod, formatTemp, formatTime, targetsText } from '../domain/format.js';
import { roomMode } from '../domain/room-status.js';
import { thermostatStatus } from '../domain/thermostat-status.js';
import { formatting, texts } from '../state/selectors.js';

/**
 * Each mode's icon, its colour class (list and controls), and the text key of its word.
 * @type {Record<import('../domain/room-status.js').RoomMode, {icon: string, list: string,
 *   control: string, word: string}>}
 */
const MODES = {
  paused: { icon: 'mdi:pause', list: 'paused', control: 'dim', word: 'paused' },
  exercise: { icon: 'mdi:pipe-valve', list: 'window', control: 'window', word: 'exercise' },
  'heating-off': { icon: 'mdi:power', list: 'paused', control: 'dim', word: 'heating_off' },
  window: {
    icon: 'mdi:window-open-variant',
    list: 'window',
    control: 'window',
    word: 'window_open',
  },
  'valve-closed': { icon: 'mdi:valve-closed', list: 'ok', control: 'ok', word: 'rc_closed' },
  manual: {
    icon: 'mdi:hand-back-right-outline',
    list: 'manual',
    control: 'manual',
    word: 'manual',
  },
  heating: { icon: 'mdi:fire', list: 'heat', control: 'heat', word: 'heating' },
  scheduled: { icon: 'mdi:check', list: 'ok', control: 'dim', word: 'scheduled' },
};

/**
 * How a status looks: the mode's entry, coloured as manual when valves held closed also differ
 * from the plan.
 * @param {import('../domain/room-status.js').RoomStatus} status
 * @returns {{mode: string, icon: string, list: string, control: string, word: string}}
 */
export function lookOf(status) {
  const mode = roomMode(status);
  const look = { mode, ...MODES[mode] };
  if (mode === 'valve-closed' && status.manual)
    return { ...look, list: 'manual', control: 'manual' };
  return look;
}

/**
 * " until 17:00" when the period changes later today, else ''.
 * @param {import('../state/context.js').Context} ctx
 * @param {import('../domain/room-status.js').RoomStatus} status
 * @returns {string}
 */
export function untilText(ctx, status) {
  const next = status.at?.next;
  return next ? ` ${texts(ctx).until} ${formatTime(next.start, formatting(ctx))}` : '';
}

/**
 * The room's setpoints: one, or each thermostat's when they differ.
 * @param {import('../state/context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @param {import('../domain/room-status.js').RoomStatus} status
 * @returns {string}
 */
function targets(ctx, room, status) {
  if (room.thermostats.length < 2) return formatTemp(status.target, formatting(ctx));
  const each = room.thermostats.map((th) =>
    thermostatStatus(room, th, { status, states: ctx.gateway.states }),
  );
  return targetsText(
    each.map((item) => item.target),
    formatting(ctx),
  );
}

/**
 * The status line of a room in the room list, e.g. "Manuell · 22 °C bis 21:00".
 * @param {import('../state/context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @param {import('../domain/room-status.js').RoomStatus} status
 * @returns {string}
 */
export function statusLine(ctx, room, status) {
  const text = texts(ctx);
  const mode = roomMode(status);
  const temp = (value) => formatTemp(value, formatting(ctx));
  const set = () => `${targets(ctx, room, status)}${untilText(ctx, status)}`;
  const lines = {
    paused: () => (status.target != null ? `${text.paused} · ${temp(status.target)}` : text.paused),
    window: () => `${text.window_open} · ${temp(OFF_T)}`,
    'valve-closed': () => `${text.rc_closed} · ${set()}`,
    manual: () => `${text.manual} · ${set()}`,
    heating: () => `${text.heating} · ${text.to} ${set()}`,
    scheduled: () => scheduledLine(ctx, status),
  };
  return lines[mode] ? lines[mode]() : text[MODES[mode].word];
}

/**
 * The status line of a room on its plan: "21 °C bis 17:00", or "… bis morgen".
 * @param {import('../state/context.js').Context} ctx
 * @param {import('../domain/room-status.js').RoomStatus} status
 * @returns {string}
 */
function scheduledLine(ctx, status) {
  if (!status.at) return '–';
  const text = texts(ctx);
  const until = untilText(ctx, status) || ` ${text.until} ${text.tomorrow_l}`;
  return `${formatPeriod(status.at.period, formatting(ctx), text)}${until}`;
}

/**
 * The status word above a control's setpoint, e.g. "Couch · Manuell" (named) or "Manuell".
 * @param {import('../state/context.js').Context} ctx
 * @param {import('../domain/room-status.js').RoomStatus} status
 * @param {{named: boolean}} options whether a thermostat's name comes first
 * @returns {{word: string, look: string, heats: boolean}} heats: add "heating" after the word
 */
export function controlWord(ctx, status, { named }) {
  const look = lookOf(status);
  const word = texts(ctx)[look.word];
  const shown = status.label && named ? `${status.label} · ${word}` : word;
  return { word: shown, look: look.control, heats: status.heating && look.control !== 'heat' };
}
