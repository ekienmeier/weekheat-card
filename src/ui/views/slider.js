// The slider: the setpoint and status above a bar from the scale's lowest to its highest value,
// filled up to the setpoint, with a tick for the room temperature and a dot for the plan's
// setpoint when it differs. Press or drag the bar, or use the keyboard.

import { html, nothing } from 'lit';
import { OFF_T } from '../../domain/constants.js';
import { sliderPercent } from '../../domain/dial.js';
import { formatTemp } from '../../domain/format.js';
import { formatting, scale, texts } from '../../state/selectors.js';
import { sliderHandlers } from '../pointer.js';
import { controlWord } from '../status.js';
import { smallLines, valueText } from './dial.js';

/**
 * @typedef {object} SliderShown What a slider shows.
 * @property {import('../../domain/room-status.js').RoomStatus} status the room's or a thermostat's
 * @property {number | null} value the setpoint shown
 * @property {string} th the thermostat it sets, '' for all of the room's
 * @property {boolean} [framed] one of several thermostats' sliders
 */

/**
 * A mark on the bar at a setpoint.
 * @param {import('../../state/context.js').Context} ctx
 * @param {string} kind its class: slider-fill, slider-plan, slider-room or slider-knob
 * @param {number | null} value none: no mark
 * @returns {unknown}
 */
function mark(ctx, kind, value) {
  if (value == null) return nothing;
  const percent = sliderPercent(value, scale(ctx));
  const off = value <= OFF_T && ['slider-fill', 'slider-knob'].includes(kind) ? ' off' : '';
  const style = kind === 'slider-fill' ? `width:${percent}%` : `left:${percent}%`;
  return html`<div class="${kind}${off}" style=${style}></div>`;
}

/**
 * The line above the bar: the setpoint, the status word, and the room's and plan's temperatures.
 * @param {import('../../state/context.js').Context} ctx
 * @param {SliderShown} shown
 * @returns {unknown}
 */
function sliderTop(ctx, { status, value }) {
  const { word, look, heats } = controlWord(ctx, status, { named: true });
  const heat = heats ? html` <span class="heat">· ${texts(ctx).heating}</span>` : nothing;
  const { room, plan } = smallLines(ctx, status);
  const off = value != null && value <= OFF_T ? 'off' : '';
  return html`<div class="slider-top">
    <span class="slider-value ${off}">${valueText(ctx, { value })}</span>
    <span class="slider-status ${look}">${word}${heat}</span><span class="grow"></span>
    <span class="dim small">${[room, plan].filter(Boolean).join(' · ')}</span>
  </div>`;
}

/**
 * The bar with its marks.
 * @param {import('../../state/context.js').Context} ctx
 * @param {SliderShown} shown
 * @returns {unknown}
 */
function sliderBar(ctx, { status, value }) {
  const plan = smallLines(ctx, status).plan ? status.wanted : null;
  return html`<div class="slider-bar"><div class="slider-track"></div>
    ${mark(ctx, 'slider-fill', value)}${mark(ctx, 'slider-plan', plan)}
    ${mark(ctx, 'slider-room', status.current)}${mark(ctx, 'slider-knob', value)}</div>`;
}

/**
 * A slider for a room (th '') or one of its thermostats.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {SliderShown} shown
 * @returns {unknown}
 */
export function sliderView(ctx, room, shown) {
  const on = sliderHandlers(ctx, room, shown.th);
  const { low, high } = scale(ctx);
  const end = (value) => html`<span>${formatTemp(value, formatting(ctx))}</span>`;
  const label = shown.status.label || texts(ctx).setpoint;
  return html`<div class="slider ${shown.framed ? 'framed' : ''}" tabindex="0" role="slider"
    aria-label=${label} aria-valuemin=${low} aria-valuemax=${high}
    aria-valuenow=${shown.value ?? nothing} aria-valuetext=${valueText(ctx, shown)}
    @pointerdown=${on.down} @pointermove=${on.move} @pointerup=${on.up} @pointercancel=${on.cancel}
    @keydown=${on.key}>${sliderTop(ctx, shown)}${sliderBar(ctx, shown)}
    <div class="slider-scale">${end(low)}${end(high)}</div>
  </div>`;
}
