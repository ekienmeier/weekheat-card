// A day plan as a list of periods, and its conversion to and from a schedule helper's blocks.
// A period starts at a minute of the day and runs until the next one starts (the last until 24:00).

import { DAY_MINUTES, MAX_T, MIN_T, OFF_T } from './constants.js';
import { fromMin, toMin } from './time.js';

/**
 * @typedef {object} Period One period of a day plan.
 * @property {number} start minute of the day it starts at
 * @property {number | null} temperature its setpoint in °C; null: a gap, nothing scheduled
 * @property {boolean} off an Off period (its setpoint is OFF_T)
 */

/**
 * @typedef {object} Block One block of a schedule helper's day, as Home Assistant stores it.
 * @property {string} from "HH:MM:SS"
 * @property {string} to "HH:MM:SS", "24:00:00" for the end of the day
 * @property {{temperature?: number, off?: boolean}} [data] what the block carries
 */

/** Starter plans for a new room: a working day and a free day (see docs/design.md). */
export const STARTER = {
  weekday: [
    { start: 0, temperature: OFF_T, off: true },
    { start: 360, temperature: 21, off: false },
    { start: 420, temperature: 17, off: false },
    { start: 1020, temperature: 21, off: false },
    { start: 1260, temperature: 18, off: false },
    { start: 1320, temperature: OFF_T, off: true },
  ],
  free: [
    { start: 0, temperature: OFF_T, off: true },
    { start: 450, temperature: 21, off: false },
    { start: 510, temperature: 19, off: false },
    { start: 1020, temperature: 21, off: false },
    { start: 1290, temperature: 18, off: false },
    { start: 1350, temperature: OFF_T, off: true },
  ],
};

/**
 * A gap: a period in which nothing is scheduled.
 * @param {number} start
 * @returns {Period}
 */
function gap(start) {
  return { start, temperature: null, off: false };
}

/**
 * The period a schedule block stands for.
 * @param {Block} block
 * @returns {Period}
 */
function blockPeriod(block) {
  const temperature = block.data?.temperature;
  return {
    start: toMin(block.from),
    temperature: typeof temperature === 'number' ? temperature : null,
    off: Boolean(block.data?.off),
  };
}

/**
 * One day's schedule blocks as periods from 00:00 to 24:00, sorted; time between blocks is a gap.
 * @param {Block[] | undefined} blocks
 * @returns {Period[]}
 */
export function blocksToPeriods(blocks) {
  const sorted = [...(blocks || [])].sort((a, b) => toMin(a.from) - toMin(b.from));
  const periods = [];
  let end = 0;
  for (const block of sorted) {
    if (toMin(block.from) > end) periods.push(gap(end));
    periods.push(blockPeriod(block));
    end = toMin(block.to);
  }
  if (end < DAY_MINUTES) periods.push(gap(end));
  return periods;
}

/**
 * Periods as schedule blocks that cover the day; gaps are left out.
 * @param {Period[]} periods
 * @returns {Block[]}
 */
export function periodsToBlocks(periods) {
  const sorted = [...periods].sort((a, b) => a.start - b.start);
  return sorted.flatMap((period, i) => {
    const end = i + 1 < sorted.length ? sorted[i + 1].start : DAY_MINUTES;
    if ((period.temperature == null && !period.off) || end <= period.start) return [];
    const data = period.off
      ? { temperature: OFF_T, off: true }
      : { temperature: period.temperature };
    return [{ from: `${fromMin(period.start)}:00`, to: `${fromMin(end)}:00`, data }];
  });
}

/**
 * What stops a period list from being saved: "first" (does not start at 00:00), "order" (starts
 * not increasing), "temp" (a temperature missing or out of range). Empty when it can be saved.
 * @param {Period[]} periods
 * @returns {string[]}
 */
export function checkPeriods(periods) {
  const errors = new Set();
  if (!periods.length || periods[0].start !== 0) errors.add('first');
  if (periods.some((period, i) => i > 0 && period.start <= periods[i - 1].start))
    errors.add('order');
  const badTemp = (period) =>
    typeof period.temperature !== 'number' ||
    period.temperature < MIN_T ||
    period.temperature > MAX_T;
  if (periods.some((period) => !period.off && badTemp(period))) errors.add('temp');
  return [...errors];
}

/**
 * The setpoint a period schedules (an Off period's is OFF_T; a gap's is null).
 * @param {Pick<Period, 'temperature' | 'off'>} period
 * @returns {number | null}
 */
export function periodTemp(period) {
  return period.off ? OFF_T : period.temperature;
}

/**
 * The period at a minute of the day, and the next one that day with another temperature.
 * @param {Period[]} periods sorted, starting at 0
 * @param {number} minute
 * @returns {{index: number, period: Period, next: Period | null}}
 */
export function periodAt(periods, minute) {
  const index = periods.reduce((found, period, i) => (period.start <= minute ? i : found), 0);
  const period = periods[index];
  const later = periods.slice(index + 1);
  const next = later.find((other) => periodTemp(other) !== periodTemp(period)) || null;
  return { index, period, next };
}
