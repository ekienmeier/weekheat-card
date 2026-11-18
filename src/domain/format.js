// Numbers, temperatures, times and short texts for display. The words come from the caller's texts
// (see src/i18n), and the locale and clock from the user's settings (formatting.js), so that this
// stays free of a language.

import { SAME_SHOWN } from './constants.js';
import { periodTemp } from './periods.js';
import { fromMin } from './time.js';

/** The day chart's colour scale: blue at COLD, orange-red at WARM and above, in °C. */
const COLD = 14;

/** See COLD. */
const WARM = 24;

/** @typedef {import('./formatting.js').Formatting} Formatting */

/** 12-hour time formatters by locale: making one is slow, and times are written on every render. */
const clockFormats = new Map();

/**
 * The locale that dates are written in for the card's language. Dates do not follow Home
 * Assistant's date_format yet.
 * @param {string} lang "de" or "en"
 * @returns {string}
 */
export function dateLocale(lang) {
  return lang === 'de' ? 'de-AT' : 'en-GB';
}

/**
 * A number with at most one decimal (or as many as asked), e.g. "20,5" in German.
 * @param {number} value
 * @param {Formatting} format the user's number format
 * @param {{min?: number, max?: number}} [digits] fraction digits
 * @returns {string}
 */
export function formatNumber(value, format, { min = 0, max = 1 } = {}) {
  const digits = { minimumFractionDigits: min, maximumFractionDigits: max };
  const options = { ...digits, useGrouping: format.grouping };
  return Number(value).toLocaleString(format.numbers, options);
}

/**
 * A temperature: "21 °C", "20,5 °C", or "–" when there is none.
 * @param {number | null | undefined} value
 * @param {Formatting} format
 * @returns {string}
 */
export function formatTemp(value, format) {
  return value == null ? '–' : `${formatNumber(value, format)} °C`;
}

/**
 * The formatter of 12-hour times in a locale, made once per locale. It formats in UTC, so that a
 * minute of the day is that minute whatever the browser's time zone.
 * @param {string} locale
 * @returns {Intl.DateTimeFormat}
 */
function clockFormat(locale) {
  if (!clockFormats.has(locale)) {
    /** @type {Intl.DateTimeFormatOptions} */
    const options = { hour: 'numeric', minute: '2-digit', hourCycle: 'h12', timeZone: 'UTC' };
    clockFormats.set(locale, new Intl.DateTimeFormat(locale, options));
  }
  return clockFormats.get(locale);
}

/**
 * A time of day for display: "06:30" on a 24-hour clock, "6:30 AM" on a 12-hour one. Time inputs
 * do not use this: they keep the browser's format.
 * @param {number} minutes since midnight
 * @param {Formatting} format the user's time format
 * @returns {string}
 */
export function formatTime(minutes, format) {
  if (!format.hour12) return fromMin(minutes);
  return clockFormat(format.language).format(Date.UTC(2000, 0, 1, 0, minutes));
}

/**
 * What a period schedules: its temperature, the word for Off, or "–" for a gap.
 * @param {Pick<import('./periods.js').Period, 'temperature' | 'off'> | null} period
 * @param {Formatting} format
 * @param {{off: string}} text the texts of the language
 * @returns {string}
 */
export function formatPeriod(period, format, text) {
  if (!period) return '–';
  if (period.off) return text.off;
  return formatTemp(periodTemp(period), format);
}

/**
 * The setpoints of a room's thermostats: one value, or each when they differ ("18 / 22 °C").
 * @param {Array<number | null>} targets
 * @param {Formatting} format
 * @returns {string}
 */
export function targetsText(targets, format) {
  const values = targets.filter((value) => typeof value === 'number');
  if (!values.length) return '–';
  if (values.every((value) => Math.abs(value - values[0]) < SAME_SHOWN))
    return formatTemp(values[0], format);
  return `${values.map((value) => formatNumber(value, format)).join(' / ')} °C`;
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
