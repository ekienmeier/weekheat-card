// What the user reads about an error: a CardError's text in their language, else the message
// Home Assistant gave.

import { CardError, errorText } from '../domain/errors.js';
import { fill } from '../i18n/text.js';

/**
 * An error as a sentence for the user.
 * @param {import('../i18n/text.js').Texts} text the texts of their language
 * @param {unknown} error
 * @returns {string}
 */
export function describe(text, error) {
  if (error instanceof CardError && text[`err_${error.code}`]) {
    return fill(text[`err_${error.code}`], error.values);
  }
  return errorText(error);
}
