// Numbers, temperatures and short texts for display. The words come from the caller's texts
// (see src/i18n), so that this stays free of a language.

import { SAME_SHOWN } from './constants.js';
import { periodTemp } from './periods.js';

/** The day chart's colour scale: blue at COLD, orange-red at WARM and above, in °C. */
const COLD = 14;

/** See COLD. */
const WARM = 24;

/**
 * The locale that numbers are written in for a language.
 * @param {string} lang "de" or "en"
 * @returns {string}
 */
export function numberLocale(lang) {
  return lang === 'de' ? 'de-AT' : 'en-GB';
}

/**
 * A number with at most one decimal (or as many as asked), e.g. "20,5" in German.
 * @param {number} value
 * @param {string} lang
 * @param {{min?: number, max?: number}} [digits] fraction digits
 * @returns {string}
 */
export function formatNumber(value, lang, { min = 0, max = 1 } = {}) {
  const options = { minimumFractionDigits: min, maximumFractionDigits: max };
  return Number(value).toLocaleString(numberLocale(lang), options);
}

/**
 * A temperature: "21 °C", "20,5 °C", or "–" when there is none.
 * @param {number | null | undefined} value
 * @param {string} lang
 * @returns {string}
 */
export function formatTemp(value, lang) {
  return value == null ? '–' : `${formatNumber(value, lang)} °C`;
}

/**
 * What a period schedules: its temperature, the word for Off, or "–" for a gap.
 * @param {Pick<import('./periods.js').Period, 'temperature' | 'off'> | null} period
 * @param {string} lang
 * @param {{off: string}} text the texts of the language
 * @returns {string}
 */
export function formatPeriod(period, lang, text) {
  if (!period) return '–';
  if (period.off) return text.off;
  return formatTemp(periodTemp(period), lang);
}

/**
 * The setpoints of a room's thermostats: one value, or each when they differ ("18 / 22 °C").
 * @param {Array<number | null>} targets
 * @param {string} lang
 * @returns {string}
 */
export function targetsText(targets, lang) {
  const values = targets.filter((value) => typeof value === 'number');
  if (!values.length) return '–';
  if (values.every((value) => Math.abs(value - values[0]) < SAME_SHOWN))
    return formatTemp(values[0], lang);
  return `${values.map((value) => formatNumber(value, lang)).join(' / ')} °C`;
}

/**
 * A count with the singular or plural word: "1 Regel", "2 Regeln".
 * @param {number} amount
 * @param {string[]} words the singular and the plural
 * @returns {string}
 */
export function count(amount, [one, many]) {
  return `${amount} ${amount === 1 ? one : many}`;
}

/**
 * The colour of a temperature in the day chart: blue at 14 °C to orange-red at 24 °C.
 * @param {number} temperature
 * @returns {string} a CSS colour
 */
export function tempColor(temperature) {
  const x = Math.max(0, Math.min(1, (temperature - COLD) / (WARM - COLD)));
  const hue = 210 - x * 195; // 210 blue … 15 orange-red
  return `hsl(${Math.round(hue)}, 70%, ${Math.round(55 - x * 5)}%)`;
}

/**
 * Why a day (from the day script) is what it is, for the day list.
 * @param {import('./plans.js').Day} day
 * @param {Record<string, any>} text the texts of the language
 * @returns {string} empty for a plain working day
 */
export function reasonText(day, text) {
  if (day.kind === 'weekend') return text.weekdays[day.weekday] || text.reason_weekend;
  if (day.kind === 'holiday') return day.detail ? `${text.holiday}: ${day.detail}` : text.holiday;
  if (day.kind === 'calendar') return `${day.source || text.calendar}: ${day.detail}`;
  if (day.kind === 'exception') return day.note ? `${text.exception}: ${day.note}` : text.exception;
  return '';
}
