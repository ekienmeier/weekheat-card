// Setting a room's setpoints: the dial, the slider, − and +, "All together", "Back to plan", the
// heating switch, and pausing a room. A value shows at once and is written after a short wait,
// so that several steps make one write.

import { CardError } from '../../domain/errors.js';
import { createSwitch } from '../../ha/helpers.js';
import { setEach, setRoomActive, setSwitch, setTemperature } from '../../ha/controls.js';
import { waitForReload } from '../../ha/wait.js';
import { controlStatus, findRoom, shownValue, snapT, statusOf, texts } from '../selectors.js';
import { attempt } from './messages.js';
import { commitRoom } from './rooms.js';

/** How long, in ms, to wait for more steps before writing: a drag ends at once, steps come fast. */
export const WRITE_DELAY = { drag: 300, step: 700 };

/** How long, in ms, a written value keeps showing while Home Assistant has not reported it. */
const HOLD_MS = 4000;

/**
 * Keep showing a written value for a while, then the reported one (unless it was replaced).
 * @param {import('../context.js').Context} ctx
 * @param {'pending' | 'shift'} kind
 * @param {object} item the value that was written
 */
function holdShown(ctx, kind, item) {
  const release = () =>
    ctx.store.control[kind] === item && ctx.store.update(({ control }) => (control[kind] = null));
  setTimeout(release, HOLD_MS);
}

/**
 * Write the value waiting in `pending` now.
 * @param {import('../context.js').Context} ctx
 * @returns {Promise<void>}
 */
export async function writePending(ctx) {
  clearTimeout(ctx.timers.pending);
  const pending = ctx.store.control.pending;
  const room = pending && findRoom(ctx, pending.room);
  if (!room) return;
  const thermostats = pending.th ? [pending.th] : room.thermostats;
  await attempt(ctx, () => setTemperature(ctx.gateway, thermostats, pending.value));
  holdShown(ctx, 'pending', pending);
}

/**
 * Show a setpoint at once and write it after a wait; a new value restarts the wait. A value for
 * another control is written first.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {{value: number, th?: string, delay: number}} setting th '' (or none) is all of the
 *   room's thermostats
 */
export function setTarget(ctx, room, { value, th = '', delay }) {
  const target = snapT(value, controlStatus(ctx, room, th).step);
  const pending = ctx.store.control.pending;
  if (pending && (pending.room !== room.id || pending.th !== th)) writePending(ctx);
  ctx.store.update(({ control }) => (control.pending = { room: room.id, th, value: target }));
  clearTimeout(ctx.timers.pending);
  ctx.timers.pending = setTimeout(() => writePending(ctx), delay);
}

/**
 * Move a control's setpoint by some steps (− and +, the arrow keys).
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {{th: string, steps: number}} move
 */
export function stepTarget(ctx, room, { th, steps }) {
  const status = controlStatus(ctx, room, th);
  const base = shownValue(ctx, room, th) ?? status.wanted ?? 20;
  setTarget(ctx, room, { value: base + steps * status.step, th, delay: WRITE_DELAY.step });
}

/**
 * "All together": move each of a room's thermostats by the same steps from its own setpoint, and
 * write them all after a short wait.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {number} steps
 */
export function shiftAll(ctx, room, steps) {
  const status = statusOf(ctx, room);
  ctx.store.update(({ control }) => {
    if (control.shift?.room !== room.id)
      control.shift = { room: room.id, base: baseOf(ctx, room), delta: 0 };
    control.shift.delta = Math.round((control.shift.delta + steps * status.step) * 10) / 10;
  });
  clearTimeout(ctx.timers.shift);
  ctx.timers.shift = setTimeout(() => writeShift(ctx, room), WRITE_DELAY.step);
}

/**
 * Each thermostat's setpoint, for "All together".
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {Record<string, number | null>}
 */
function baseOf(ctx, room) {
  return Object.fromEntries(
    room.thermostats.map((th) => [th, controlStatus(ctx, room, th).target]),
  );
}

/**
 * Write the "All together" values.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {Promise<void>}
 */
async function writeShift(ctx, room) {
  const shift = ctx.store.control.shift;
  const step = statusOf(ctx, room).step;
  const known = Object.entries(shift.base).filter(([, value]) => typeof value === 'number');
  const writes = known.map(
    ([th, value]) => /** @type {[string, number]} */ ([th, snapT(value + shift.delta, step)]),
  );
  await attempt(ctx, () => setEach(ctx.gateway, writes));
  holdShown(ctx, 'shift', shift);
}

/**
 * "Back to plan": set all of a room's thermostats to the period's temperature now.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {Promise<boolean>}
 */
export function backToPlan(ctx, room) {
  const { wanted } = statusOf(ctx, room);
  if (wanted == null) return Promise.resolve(false);
  ctx.store.update(({ control }) => Object.assign(control, { pending: null, shift: null }));
  return attempt(ctx, () => setTemperature(ctx.gateway, room.thermostats, wanted));
}

/**
 * Admin: give a room a heating switch (on first use), switched off.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {Promise<void>}
 */
async function addSwitch(ctx, room) {
  if (!ctx.store.data.admin) throw new CardError('no_switch');
  const made = await createSwitch(ctx.gateway, `Weekheat ${room.name} ${texts(ctx).heating_l}`);
  await commitRoom(ctx, room, { heating_switch: made.entity });
  // The automation reloads with a trigger for the new switch; switching it before would go unseen.
  await waitForReload(ctx.gateway, room.entity);
  await setSwitch(ctx.gateway, made.entity, false);
}

/**
 * Switch a room's heating on or off.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {Promise<boolean>}
 */
export function togglePower(ctx, room) {
  const sw = room.heating_switch && ctx.gateway.states[room.heating_switch];
  if (!sw) return attempt(ctx, () => addSwitch(ctx, room));
  return attempt(ctx, () => setSwitch(ctx.gateway, room.heating_switch, sw.state === 'off'));
}

/**
 * Admin: pause a room, or activate it.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {Promise<boolean>}
 */
export function toggleActive(ctx, room) {
  const active = ctx.gateway.states[room.entity]?.state === 'on';
  return attempt(ctx, () => setRoomActive(ctx.gateway, room.entity, !active));
}

/**
 * Show where the dial or slider is being dragged to (written when it is let go).
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {{th: string, value: number}} drag
 */
export function dragTo(ctx, room, { th, value }) {
  if (ctx.store.control.drag?.value === value) return;
  ctx.store.update(({ control }) => (control.drag = { room: room.id, th, value }));
}

/**
 * Let go of the dial or slider: write where it is (or, cancelled, nothing).
 * @param {import('../context.js').Context} ctx
 * @param {{cancelled: boolean}} end
 */
export function endDrag(ctx, { cancelled }) {
  const drag = ctx.store.control.drag;
  ctx.store.update(({ control }) => (control.drag = null));
  const room = drag && !cancelled && drag.value != null && findRoom(ctx, drag.room);
  if (room) setTarget(ctx, room, { value: drag.value, th: drag.th, delay: WRITE_DELAY.drag });
}
