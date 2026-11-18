// The texts of the user's language, and filling in their placeholders.

import de from './de.js';
import en from './en.js';

/** The texts by language. */
const TEXTS = { de, en };

/**
 * @typedef {typeof en} Texts The texts of one language, by key.
 */

/**
 * The language the card speaks: German for a user whose Home Assistant language is German, else
 * English.
 * @param {{locale?: {language?: string}, language?: string}} hass
 * @returns {'de' | 'en'}
 */
export function languageOf(hass) {
  const language = String(hass.locale?.language || hass.language || 'en');
  return language.startsWith('de') ? 'de' : 'en';
}

/**
 * The texts of a language (English for any the card does not have).
 * @param {string} lang
 * @returns {Texts}
 */
export function textsFor(lang) {
  return TEXTS[lang] || TEXTS.en;
}

/**
 * A text with its `{name}` placeholders replaced by the matching values; unknown ones stay.
 * @param {string} text a text from the texts
 * @param {Record<string, string | number>} values
 * @returns {string}
 */
export function fill(text, values) {
  return text.replace(/\{(\w+)\}/g, (all, key) => (key in values ? String(values[key]) : all));
}
