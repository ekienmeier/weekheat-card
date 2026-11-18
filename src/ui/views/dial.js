// The dial: a 270° ring with the setpoint's handle, a tick for the room temperature, a dot for the
// plan's setpoint when it differs, and the texts in the middle. Drag the ring, use − and +, or the
// keyboard.

import { html, svg, nothing } from 'lit';
import { OFF_T } from '../../domain/constants.js';
import { DIAL, dialAngle, dialArc, dialPoint } from '../../domain/dial.js';
import { formatNumber, formatTemp } from '../../domain/format.js';
import { canReturnToPlan } from '../../domain/room-status.js';
import { stepTarget } from '../../state/actions/control.js';
import { lang, scale, texts } from '../../state/selectors.js';
import { dialHandlers } from '../pointer.js';
import { controlWord } from '../status.js';

/**
 * @typedef {object} DialShown What a dial shows.
 * @property {import('../../domain/room-status.js').RoomStatus} status the room's or a thermostat's
 * @property {number | null} value the setpoint shown (null: none, or several differing)
 * @property {string} [mixed] the differing setpoints ("18 / 22 °C"), when value is null
 * @property {string} th the thermostat it sets, '' for all of the room's
 */

/**
 * A point of the dial as SVG attribute values.
 * @param {number} angle
 * @param {number} radius
 * @returns {string[]} x and y, with two decimals
 */
function at(angle, radius) {
  return dialPoint(angle, radius).map((value) => value.toFixed(2));
}

/**
 * The angle of a setpoint on this card's scale.
 * @param {import('../../state/context.js').Context} ctx
 * @param {number} value
 * @returns {number}
 */
function angleOf(ctx, value) {
  return dialAngle(value, scale(ctx).low, scale(ctx).high);
}

/**
 * The ring filled up to the setpoint.
 * @param {import('../../state/context.js').Context} ctx
 * @param {number | null} value
 * @returns {unknown}
 */
function filled(ctx, value) {
  const angle = value != null ? angleOf(ctx, value) : null;
  if (angle == null || angle <= DIAL.start + 0.5) return nothing;
  const off = value <= OFF_T ? ' off' : '';
  return svg`<path d=${dialArc(DIAL.start, angle)} class="dial-fill${off}"/>`;
}

/**
 * The handle at the setpoint, drawn last so that it is on top.
 * @param {import('../../state/context.js').Context} ctx
 * @param {number | null} value
 * @returns {unknown}
 */
function handle(ctx, value) {
  if (value == null) return nothing;
  const [x, y] = at(angleOf(ctx, value), DIAL.radius);
  return svg`<circle cx=${x} cy=${y} r="9" class="dial-handle${value <= OFF_T ? ' off' : ''}"/>`;
}

/**
 * The plan's setpoint as a dot inside the ring, while the setpoint was set by hand.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room-status.js').RoomStatus} status
 * @returns {unknown}
 */
function planDot(ctx, status) {
  if (!canReturnToPlan(status) || status.wanted == null) return nothing;
  const [x, y] = at(angleOf(ctx, status.wanted), DIAL.radius - 17);
  const title = `${texts(ctx).plan} ${formatTemp(status.wanted, lang(ctx))}`;
  return svg`<circle cx=${x} cy=${y} r="3" class="dial-plan"><title>${title}</title></circle>`;
}

/**
 * The room temperature as a tick across the ring.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room-status.js').RoomStatus} status
 * @returns {unknown}
 */
function roomTick(ctx, status) {
  if (status.current == null) return nothing;
  const angle = angleOf(ctx, status.current);
  const [[x1, y1], [x2, y2]] = [at(angle, DIAL.radius - 9), at(angle, DIAL.radius + 9)];
  return svg`<line x1=${x1} y1=${y1} x2=${x2} y2=${y2} class="dial-room"/>`;
}

/**
 * The room temperature and (while set by hand) the plan's setpoint, as the small lines say them.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room-status.js').RoomStatus} status
 * @returns {{room: string, plan: string}} '' for what does not show
 */
export function smallLines(ctx, status) {
  const text = texts(ctx);
  const temp = (value) => formatTemp(value, lang(ctx));
  const room =
    status.current != null ? `${text.current} ${temp(Math.round(status.current * 10) / 10)}` : '';
  const differs = canReturnToPlan(status) && status.wanted != null;
  return { room, plan: differs ? `${text.plan} ${temp(status.wanted)}` : '' };
}

/**
 * The texts in the middle: the status word, the setpoint, the room's and plan's temperatures.
 * @param {import('../../state/context.js').Context} ctx
 * @param {DialShown} shown
 * @returns {unknown}
 */
function middle(ctx, shown) {
  const { word, look, heats } = controlWord(ctx, shown.status, { named: false });
  const heat = heats ? svg`<tspan class="heat"> · ${texts(ctx).heating}</tspan>` : nothing;
  const { room, plan } = smallLines(ctx, shown.status);
  const status = svg`<text x="100" y="72" class="dial-status ${look}">${word}${heat}</text>`;
  return svg`${status}${bigValue(ctx, shown)}
    <text x="100" y="140" class="dial-small">${room}</text>
    ${plan ? svg`<text x="100" y="156" class="dial-small">${plan}</text>` : nothing}`;
}

/**
 * The setpoint in big digits, "Aus" for Off, or the differing setpoints.
 * @param {import('../../state/context.js').Context} ctx
 * @param {DialShown} shown
 * @returns {unknown}
 */
function bigValue(ctx, { value, mixed }) {
  if (value == null) {
    const [y, look] = mixed ? [110, 'mixed'] : [116, ''];
    return svg`<text x="100" y=${y} class="dial-value ${look}">${mixed || '–'}</text>`;
  }
  if (value <= OFF_T)
    return svg`<text x="100" y="112" class="dial-value off">${texts(ctx).off}</text>`;
  const unit = svg`<tspan class="dial-unit" dy="-17">°C</tspan>`;
  const number = formatNumber(value, lang(ctx));
  return svg`<text x="100" y="116" class="dial-value">${number}${unit}</text>`;
}

/**
 * The setpoint as screen readers say it: "21 °C", "Off", or the differing ones.
 * @param {import('../../state/context.js').Context} ctx
 * @param {{value: number | null, mixed?: string}} shown
 * @returns {string}
 */
export function valueText(ctx, { value, mixed }) {
  if (value == null) return mixed || '–';
  return value <= OFF_T ? texts(ctx).off : formatTemp(value, lang(ctx));
}

/**
 * The dial's SVG: a slider for the pointer and the keyboard.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {DialShown} shown
 * @returns {unknown}
 */
function dialSvg(ctx, room, shown) {
  const on = dialHandlers(ctx, room, shown.th);
  const label = shown.status.label || texts(ctx).setpoint;
  const ring = svg`<path d=${dialArc(DIAL.start, DIAL.start + DIAL.sweep)} class="dial-track"/>`;
  const { status, value } = shown;
  const marks = svg`${filled(ctx, value)}${planDot(ctx, status)}${roomTick(ctx, status)}
    ${handle(ctx, value)}`;
  return html`<svg viewBox="0 0 200 200" tabindex="0" role="slider" aria-label=${label}
    aria-valuemin=${scale(ctx).low} aria-valuemax=${scale(ctx).high}
    aria-valuenow=${shown.value ?? nothing} aria-valuetext=${valueText(ctx, shown)}
    @pointerdown=${on.down} @pointermove=${on.move} @pointerup=${on.up} @pointercancel=${on.cancel}
    @keydown=${on.key}>${ring}${marks}${middle(ctx, shown)}</svg>`;
}

/**
 * The dial with its − and + buttons.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {DialShown} shown
 * @returns {unknown}
 */
export function dialView(ctx, room, shown) {
  const text = texts(ctx);
  const step = (steps) => () => stepTarget(ctx, room, { th: shown.th, steps });
  return html`<div class="dial-box">${dialSvg(ctx, room, shown)}
    <div class="dial-buttons">
      <button class="round" aria-label=${text.colder} @click=${step(-1)}>−</button>
      <button class="round" aria-label=${text.warmer} @click=${step(1)}>+</button>
    </div>
  </div>`;
}
