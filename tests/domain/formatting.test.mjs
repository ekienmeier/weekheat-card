// Tests of src/domain/formatting.js and the number and time writers of format.js (review L5):
// each of Home Assistant's number and time formats, written as its frontend writes them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dateLocale, formatNumber, formatTemp, formatTime } from '../../src/domain/format.js';
import { formattingOf } from '../../src/domain/formatting.js';

/**
 * A number written under a user's settings.
 * @param {number} value
 * @param {import('../../src/domain/formatting.js').HaLocale} locale
 * @returns {string}
 */
function number(value, locale) {
  return formatNumber(value, formattingOf(locale, 'en'), { max: 2 });
}

test("numbers follow Home Assistant's number format", () => {
  assert.equal(number(1234.5, { language: 'de', number_format: 'language' }), '1.234,5');
  assert.equal(number(1234.5, { language: 'en', number_format: 'language' }), '1,234.5');
  assert.equal(number(1234.5, { language: 'de', number_format: 'comma_decimal' }), '1,234.5');
  assert.equal(number(1234.5, { language: 'en', number_format: 'decimal_comma' }), '1.234,5');
  assert.equal(number(1234.5, { language: 'en', number_format: 'space_comma' }), '1 234,5');
  // the apostrophe differs between ICU versions
  const swiss = (1234.5).toLocaleString('de-CH');
  assert.equal(number(1234.5, { language: 'en', number_format: 'quote_decimal' }), swiss);
  assert.equal(number(1234.5, { language: 'de', number_format: 'none' }), '1234.5');
});

test("'system' numbers are the browser's, and a missing locale falls back to the language", () => {
  const system = formattingOf({ language: 'de', number_format: 'system' }, 'en');
  assert.equal(formatNumber(1234.5, system), (1234.5).toLocaleString(undefined));
  assert.equal(formatTemp(20.5, formattingOf(undefined, 'de')), '20,5 °C');
  assert.equal(formatTemp(20.5, formattingOf({}, 'en')), '20.5 °C');
});

test("the owner's settings (German, language) write numbers and times as before", () => {
  const owner = { language: 'de', number_format: 'language', time_format: 'language' };
  const format = formattingOf(owner, 'en');
  assert.equal(formatTemp(20.5, format), '20,5 °C');
  assert.equal(formatNumber(21, format), '21');
  assert.equal(formatTime(390, format), '06:30');
  assert.equal(formatTime(1440, format), '24:00');
  assert.equal(dateLocale('de'), 'de-AT');
});

/**
 * A time written under a user's settings.
 * @param {number} minutes
 * @param {import('../../src/domain/formatting.js').HaLocale} locale
 * @returns {string}
 */
function time(minutes, locale) {
  return formatTime(minutes, formattingOf(locale, 'en'));
}

test("times follow Home Assistant's time format", () => {
  assert.equal(time(390, { language: 'de', time_format: '24' }), '06:30');
  assert.equal(time(1350, { language: 'de', time_format: '12' }), '10:30 PM');
  assert.equal(time(390, { language: 'en', time_format: '12' }), '6:30 AM');
  assert.equal(time(1350, { language: 'en', time_format: '24' }), '22:30');
  assert.equal(time(1350, { language: 'en-GB', time_format: 'language' }), '22:30');
  assert.equal(time(1350, { language: 'en', time_format: 'language' }), '10:30 PM');
  assert.equal(time(0, { language: 'en', time_format: '12' }), '12:00 AM');
});

test("'system' times use the browser's clock", () => {
  const clock = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions();
  const hour12 = clock.hourCycle === 'h11' || clock.hourCycle === 'h12';
  assert.equal(formattingOf({ language: 'de', time_format: 'system' }, 'en').hour12, hour12);
});
