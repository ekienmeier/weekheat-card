// Dragging the dial and the slider, and setting them with the keyboard (WAI-ARIA slider pattern:
// arrows one step, Page Up and Page Down four, Home and End the ends of the scale).

import { DIAL, dialValue, sliderValue } from '../domain/dial.js';
import { dragTo, endDrag, setTarget, stepTarget, WRITE_DELAY } from '../state/actions/control.js';
import { controlStatus, scale } from '../state/selectors.js';

/** How far, in dial units, a pointer may be inside or outside the ring to grab it. */
const RING = { inside: 28, outside: 22 };

/** Steps per key. */
const KEY_STEPS = {
  ArrowUp: 1,
  ArrowRight: 1,
  ArrowDown: -1,
  ArrowLeft: -1,
  PageUp: 4,
  PageDown: -4,
};

/**
 * A pointer's position in the dial's coordinates (0–200).
 * @param {PointerEvent} event
 * @param {Element} dial the dial's SVG
 * @returns {[number, number]}
 */
function inDial(event, dial) {
  const box = dial.getBoundingClientRect();
  return [
    ((event.clientX - box.left) / box.width) * 200,
    ((event.clientY - box.top) / box.height) * 200,
  ];
}

/**
 * The scale and step of a control.
 * @param {import('../state/context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @param {string} th
 * @returns {{low: number, high: number, step: number}}
 */
function scaleOf(ctx, room, th) {
  return { ...scale(ctx), step: controlStatus(ctx, room, th).step };
}

/**
 * Is a point of the dial on its ring (where it can be grabbed)?
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function onRing(x, y) {
  const distance = Math.hypot(x - DIAL.cx, y - DIAL.cy);
  return distance >= DIAL.radius - RING.inside && distance <= DIAL.radius + RING.outside;
}

/**
 * The handlers of a dial: grab the ring and drag; the arrow keys and others.
 * @param {import('../state/context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @param {string} th the thermostat it sets, or ''
 * @returns {Record<string, (event: any) => void>}
 */
export function dialHandlers(ctx, room, th) {
  const valueAt = (x, y) => dialValue(x, y, scaleOf(ctx, room, th));
  const move = (event) =>
    ctx.store.control.drag &&
    dragTo(ctx, room, { th, value: valueAt(...inDial(event, event.currentTarget)) });
  const down = (event) => {
    const [x, y] = inDial(event, event.currentTarget);
    if (event.button > 0 || !onRing(x, y)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragTo(ctx, room, { th, value: valueAt(x, y) });
  };
  return { down, move, ...endings(ctx), key: keyHandler(ctx, room, th) };
}

/**
 * The handlers of a slider: press or drag on its bar; the arrow keys and others.
 * @param {import('../state/context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @param {string} th the thermostat it sets, or ''
 * @returns {Record<string, (event: any) => void>}
 */
export function sliderHandlers(ctx, room, th) {
  const valueAt = (event) => {
    const box = event.currentTarget.querySelector('.slider-bar').getBoundingClientRect();
    return sliderValue((event.clientX - box.left) / box.width, scaleOf(ctx, room, th));
  };
  const move = (event) =>
    ctx.store.control.drag && dragTo(ctx, room, { th, value: valueAt(event) });
  const down = (event) => {
    if (event.button > 0 || !event.target.closest('.slider-bar')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragTo(ctx, room, { th, value: valueAt(event) });
  };
  return { down, move, ...endings(ctx), key: keyHandler(ctx, room, th) };
}

/**
 * Letting go writes the value; a cancelled drag (the page scrolled instead) writes nothing.
 * @param {import('../state/context.js').Context} ctx
 * @returns {{up: () => void, cancel: () => void}}
 */
function endings(ctx) {
  return {
    up: () => endDrag(ctx, { cancelled: false }),
    cancel: () => endDrag(ctx, { cancelled: true }),
  };
}

/**
 * The keyboard handler of a dial or slider.
 * @param {import('../state/context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @param {string} th
 * @returns {(event: KeyboardEvent) => void}
 */
function keyHandler(ctx, room, th) {
  return (event) => {
    const ends = { Home: scale(ctx).low, End: scale(ctx).high };
    if (!(event.key in KEY_STEPS) && !(event.key in ends)) return;
    event.preventDefault();
    if (event.key in ends)
      setTarget(ctx, room, { value: ends[event.key], th, delay: WRITE_DELAY.step });
    else stepTarget(ctx, room, { th, steps: KEY_STEPS[event.key] });
  };
}
