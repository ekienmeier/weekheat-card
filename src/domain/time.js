// Times of day and dates: minutes since midnight, "HH:MM" texts, ISO dates, and "now" in a time
// zone. Pure functions; the current instant is always passed in.

import { DAY_MINUTES } from './constants.js';

/** Date formatters by time zone: making one is slow, and nowIn runs on every render. */
const zoneFormats = new Map();

/**
 * "HH:MM" or "HH:MM:SS" as minutes since midnight ("24:00" is 1440).
 * @param {string} text
 * @returns {number}
 */
export function toMin(text) {
  const [hours, minutes] = String(text).split(':');
  return Number(hours) * 60 + Number(minutes);
}

/**
 * Minutes since midnight as "HH:MM" (1440 is "24:00").
 * @param {number} minutes
 * @returns {string}
 */
export function fromMin(minutes) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/**
 * The formatter for date, weekday and time in a time zone, made once per zone.
 * @param {string} timeZone an IANA time zone, e.g. "Europe/Vienna"
 * @returns {Intl.DateTimeFormat}
 */
function zoneFormat(timeZone) {
  if (!zoneFormats.has(timeZone)) {
    /** @type {Intl.DateTimeFormatOptions} */
    const parts = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
    /** @type {Intl.DateTimeFormatOptions} */
    const options = { ...parts, hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone };
    zoneFormats.set(timeZone, new Intl.DateTimeFormat('en-GB', options));
  }
  return zoneFormats.get(timeZone);
}

/**
 * The date, weekday and minute of the day in a time zone at an instant.
 * @param {string} timeZone Home Assistant's time zone
 * @param {Date} [at] the instant, now by default
 * @returns {{date: string, day: string, min: number}} e.g. "2026-11-13", "fri", 565
 */
export function nowIn(timeZone, at = new Date()) {
  const parts = zoneFormat(timeZone).formatToParts(at);
  const get = (type) => parts.find((part) => part.type === type).value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    day: get('weekday').slice(0, 3).toLowerCase(),
    min: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/**
 * The ISO date some days after another (noon UTC, so that no time zone shifts the day).
 * @param {string} iso a date, "2026-12-31"
 * @param {number} days how many days later (negative: earlier)
 * @returns {string}
 */
export function addDays(iso, days) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Is a minute of the day a valid period start?
 * @param {number} minutes
 * @returns {boolean}
 */
export function isDayMinute(minutes) {
  return Number.isInteger(minutes) && minutes >= 0 && minutes < DAY_MINUTES;
}
