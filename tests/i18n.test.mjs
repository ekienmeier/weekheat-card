// Tests of src/i18n: both languages have the same texts, and placeholders are filled.
import test from 'node:test';
import assert from 'node:assert/strict';
import de from '../src/i18n/de.js';
import en from '../src/i18n/en.js';
import { fill, languageOf, textsFor } from '../src/i18n/text.js';

test('German and English have the same keys', () => {
  assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());
});

test('each text has the same placeholders in both languages', () => {
  const placeholders = (text) =>
    JSON.stringify(text)
      .match(/\{\w+\}/g)
      ?.sort() || [];
  for (const key of Object.keys(en))
    assert.deepEqual(placeholders(de[key]), placeholders(en[key]), key);
});

test('fill replaces known placeholders and keeps unknown ones', () => {
  assert.equal(fill('{size} of {max}, {other}', { size: 260, max: 255 }), '260 of 255, {other}');
});

test('the language follows Home Assistant\u2019s; any other than German is English', () => {
  assert.equal(languageOf({ locale: { language: 'de-AT' } }), 'de');
  assert.equal(languageOf({ language: 'fr' }), 'en');
  assert.equal(textsFor('fr'), en);
});
