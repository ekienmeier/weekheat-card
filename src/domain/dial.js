// Geometry of the dial (a 270° arc) and of the slider: from a setpoint to a position and back.

/**
 * The dial: a 270° arc in a 200 × 200 box, from bottom left (135°, 0 is right, clockwise) to
 * bottom right.
 */
export const DIAL = { cx: 100, cy: 100, radius: 80, start: 135, sweep: 270 };

/**
 * A number kept between two others.
 * @param {number} value
 * @param {number} low
 * @param {number} high
 * @returns {number}
 */
export function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

/**
 * A setpoint rounded to a step and kept within a scale.
 * @param {number} value
 * @param {{low: number, high: number, step: number}} scale
 * @returns {number}
 */
export function snap(value, { low, high, step }) {
  return clamp(Math.round(value / step) * step, low, high);
}

/**
 * The angle of a setpoint on the dial, in degrees.
 * @param {number} value
 * @param {number} low the scale's lowest setpoint
 * @param {number} high its highest
 * @returns {number}
 */
export function dialAngle(value, low, high) {
  return DIAL.start + clamp((value - low) / (high - low), 0, 1) * DIAL.sweep;
}

/**
 * The point on the dial's circle (or another radius) at an angle.
 * @param {number} angle degrees
 * @param {number} [radius]
 * @returns {[number, number]}
 */
export function dialPoint(angle, radius = DIAL.radius) {
  const rad = (angle * Math.PI) / 180;
  return [DIAL.cx + radius * Math.cos(rad), DIAL.cy + radius * Math.sin(rad)];
}

/**
 * An SVG path of the arc from one angle to another, clockwise.
 * @param {number} from degrees
 * @param {number} to degrees
 * @param {number} [radius]
 * @returns {string}
 */
export function dialArc(from, to, radius = DIAL.radius) {
  const [x1, y1] = dialPoint(from, radius).map((value) => value.toFixed(2));
  const [x2, y2] = dialPoint(to, radius).map((value) => value.toFixed(2));
  const large = to - from > 180 ? 1 : 0;
  return `M${x1} ${y1}A${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
}

/**
 * The setpoint for a pointer at a point of the dial, rounded to the step. A point in the gap at the
 * bottom goes to the nearer end of the scale.
 * @param {number} x in dial coordinates (0–200)
 * @param {number} y in dial coordinates
 * @param {{low: number, high: number, step: number}} scale
 * @returns {number}
 */
export function dialValue(x, y, scale) {
  const degrees = (Math.atan2(y - DIAL.cy, x - DIAL.cx) * 180) / Math.PI;
  let along = (((degrees - DIAL.start) % 360) + 360) % 360;
  if (along > DIAL.sweep) along = along > DIAL.sweep + (360 - DIAL.sweep) / 2 ? 0 : DIAL.sweep;
  return snap(scale.low + (along / DIAL.sweep) * (scale.high - scale.low), scale);
}

/**
 * The setpoint at a fraction of the slider's bar (0 left end, 1 right end), rounded to the step.
 * @param {number} fraction
 * @param {{low: number, high: number, step: number}} scale
 * @returns {number}
 */
export function sliderValue(fraction, scale) {
  return snap(scale.low + clamp(fraction, 0, 1) * (scale.high - scale.low), scale);
}

/**
 * The position of a setpoint on the slider's bar, in percent.
 * @param {number} value
 * @param {{low: number, high: number}} scale
 * @returns {string} with two decimals, e.g. "48.00"
 */
export function sliderPercent(value, { low, high }) {
  return clamp(((value - low) / (high - low)) * 100, 0, 100).toFixed(2);
}
