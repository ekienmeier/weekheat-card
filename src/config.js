// The card's options (its YAML): defaults, and the check Home Assistant asks cards to make. An
// invalid configuration throws, and Home Assistant shows the message in place of the card.

import { MAX_T, MIN_T } from './domain/constants.js';

/** The options' defaults (see the README's Card options). */
const DEFAULTS = {
  days: 14,
  day_script: 'script.weekheat_day',
  layout: 'dial',
  dial_min: MIN_T,
  dial_max: MAX_T,
};

/** The most days the day script answers for. */
const MAX_DAYS = 62;

/**
 * The checks of the options: each a test and what to say when it fails.
 * @type {Array<[(settings: Record<string, any>) => boolean, string]>}
 */
const CHECKS = [
  [
    (settings) => ['dial', 'compact'].includes(settings.layout),
    'layout must be "dial" or "compact"',
  ],
  [(settings) => isDayCount(settings.days), `days must be a whole number from 1 to ${MAX_DAYS}`],
  [(settings) => String(settings.day_script).startsWith('script.'), 'day_script must be a script'],
  [(settings) => isRange(settings.dial_min, settings.dial_max), 'dial_min must be below dial_max'],
  [
    (settings) => settings.rooms === undefined || Array.isArray(settings.rooms),
    'rooms must be a list',
  ],
];

/**
 * Is a value a number of days the day list can show?
 * @param {unknown} days
 * @returns {boolean}
 */
function isDayCount(days) {
  return Number.isInteger(days) && Number(days) >= 1 && Number(days) <= MAX_DAYS;
}

/**
 * Are two values a scale from low to high?
 * @param {unknown} low
 * @param {unknown} high
 * @returns {boolean}
 */
function isRange(low, high) {
  return typeof low === 'number' && typeof high === 'number' && low < high;
}

/**
 * What is wrong with the options, or '' when nothing is.
 * @param {Record<string, any>} settings with defaults
 * @returns {string}
 */
function problemOf(settings) {
  return CHECKS.find(([check]) => !check(settings))?.[1] || '';
}

/**
 * The card's options with their defaults; throws if they are invalid.
 * @param {Record<string, any>} config the card's YAML
 * @returns {import('./state/context.js').CardConfig}
 */
export function cardConfig(config) {
  const settings = { ...DEFAULTS, ...config };
  const problem = problemOf(settings);
  if (problem) throw new Error(`Weekheat: ${problem}.`);
  return /** @type {any} */ (settings);
}
