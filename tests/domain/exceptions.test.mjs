// Tests of src/domain/exceptions.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { exceptionTitle, parseException } from '../../src/domain/exceptions.js';

test('exception titles are read with their note', () => {
  assert.deepEqual(parseException('Freier Tag – Test'), { free: true, plan: null, note: 'Test' });
  assert.deepEqual(parseException('Werktag'), { free: false, plan: null, note: null });
  const office = { free: false, plan: 'Homeoffice', note: 'Büro zu' };
  assert.deepEqual(parseException('Plan: Homeoffice - Büro zu'), office);
  assert.equal(parseException('Geburtstag'), null);
});

test('the titles the card writes are read back the same', () => {
  assert.equal(exceptionTitle({ free: true, note: 'x' }, 'de'), 'Freier Tag – x');
  assert.equal(exceptionTitle({ plan: 'Homeoffice' }, 'en'), 'Plan: Homeoffice');
  for (const lang of ['de', 'en']) {
    for (const exception of [{ free: true }, { free: false }, { plan: 'Homeoffice', note: 'n' }]) {
      const back = parseException(exceptionTitle(exception, lang));
      assert.equal(back.free, Boolean(exception.free) && !exception.plan);
      assert.equal(back.plan, exception.plan || null);
    }
  }
});
