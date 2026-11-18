// How the user wants numbers and times written: Home Assistant's profile settings (`hass.locale`)
// turned into what Intl needs, the way Home Assistant's own frontend does it. Writing the values
// is format.js's job; this only decides the locale and the clock.

/**
 * @typedef {object} HaLocale The part of Home Assistant's `hass.locale` the card reads.
 * @property {string} [language] e.g. "de", "en-GB"
 * @property {string} [number_format] language, system, comma_decimal, decimal_comma,
 *   space_comma, quote_decimal or none
 * @property {string} [time_format] language, system, "12" or "24"
 */

/**
 * @typedef {object} Formatting How numbers and times are written for a user.
 * @property {string[] | undefined} numbers the locales numbers are written in (the first one
 *   Intl knows wins); undefined is the browser's
 * @property {boolean} grouping whether thousands are grouped (not for the format "none")
 * @property {boolean} hour12 a 12-hour clock ("6:30 AM") rather than a 24-hour one ("06:30")
 * @property {string} language the locale times are written in (Home Assistant uses the
 *   language for them whatever the time format)
 */

/**
 * The locales of Home Assistant's number formats, as its frontend has them
 * (`numberFormatToLocale` in src/common/number/format_number.ts): the first one Intl knows wins.
 * "none" is written like en-US without grouping there too. "system" (the browser's) and
 * "language" (the user's language) are not in the table.
 */
const NUMBER_LOCALES = {
  comma_decimal: ['en-US', 'en'],
  decimal_comma: ['de', 'es', 'it'],
  space_comma: ['fr', 'sv', 'cs'],
  quote_decimal: ['de-CH'],
  none: ['en-US'],
};

/** Whether a locale uses a 12-hour clock, by locale ('' for the browser's): Intl is slow to ask. */
const clocks = new Map();

/**
 * Whether a locale's own clock has 12 hours (Home Assistant's `useAmPm` for the time formats
 * "language" and "system").
 * @param {string | undefined} locale undefined for the browser's
 * @returns {boolean}
 */
function localeHour12(locale) {
  const key = locale || '';
  if (!clocks.has(key)) {
    const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
    clocks.set(key, cycle === 'h11' || cycle === 'h12');
  }
  return clocks.get(key);
}

/**
 * Whether times are written with a 12-hour clock under a time format.
 * @param {string | undefined} timeFormat Home Assistant's time_format
 * @param {string} language
 * @returns {boolean}
 */
function isHour12(timeFormat, language) {
  if (timeFormat === '12') return true;
  if (timeFormat === '24') return false;
  return localeHour12(timeFormat === 'system' ? undefined : language);
}

/**
 * How numbers and times are written for a user's Home Assistant settings.
 * @param {HaLocale | undefined} locale `hass.locale`
 * @param {string} fallback the language when `locale` has none (`hass.language`)
 * @returns {Formatting}
 */
export function formattingOf(locale, fallback) {
  const language = locale?.language || fallback;
  const format = locale?.number_format;
  const numbers = format === 'system' ? undefined : NUMBER_LOCALES[format] || [language];
  const hour12 = isHour12(locale?.time_format, language);
  return { numbers, grouping: format !== 'none', hour12, language };
}
