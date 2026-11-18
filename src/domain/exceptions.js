// Exceptions: all-day events in the exceptions calendar that make a day a working day, a free day,
// or name a plan. Their titles are a data format shared with the day script, not display texts.

/**
 * @typedef {object} Exception
 * @property {boolean} [free] a free day (otherwise a working day)
 * @property {string | null} [plan] a plan name: a working day with that plan
 * @property {string | null} [note] free text after " – "
 */

/** Titles that make a day a working day (ignoring case). The day script has the same list. */
export const WORKING_WORDS = ['werktag', 'working day', 'arbeitstag'];

/** Titles that make a day a free day (ignoring case). The day script has the same list. */
export const FREE_WORDS = ['freier tag', 'free day', 'wochenende', 'weekend'];

/** The titles the card writes, by language. Each must be in WORKING_WORDS or FREE_WORDS. */
const TITLES = {
  de: { working: 'Werktag', free: 'Freier Tag' },
  en: { working: 'Working day', free: 'Free day' },
};

/**
 * An event title read as an exception, or null if it is none. The same rule as the day script.
 * @param {string} title e.g. "Freier Tag – Brückentag", "Plan: Homeoffice"
 * @returns {Exception | null}
 */
export function parseException(title) {
  const [, base, rest] = String(title)
    .trim()
    .match(/^(.*?)(?:\s+[–-]\s+(.*))?$/);
  const name = base.trim();
  const note = (rest || '').trim() || null;
  const low = name.toLowerCase();
  if (WORKING_WORDS.includes(low)) return { free: false, plan: null, note };
  if (FREE_WORDS.includes(low)) return { free: true, plan: null, note };
  if (low.startsWith('plan:')) return { free: false, plan: name.slice(5).trim(), note };
  return null;
}

/**
 * The event title for an exception.
 * @param {Exception} exception
 * @param {string} lang "de" or "en"
 * @returns {string}
 */
export function exceptionTitle(exception, lang) {
  const titles = TITLES[lang] || TITLES.en;
  const kind = exception.free ? titles.free : titles.working;
  const base = exception.plan ? `Plan: ${exception.plan}` : kind;
  return exception.note ? `${base} – ${exception.note}` : base;
}
