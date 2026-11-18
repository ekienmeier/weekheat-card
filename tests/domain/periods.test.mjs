// Tests of src/domain/periods.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blocksToPeriods,
  checkPeriods,
  periodAt,
  periodsToBlocks,
  STARTER,
} from '../../src/domain/periods.js';

test('blocks and periods convert both ways', () => {
  const blocks = periodsToBlocks(STARTER.weekday);
  assert.equal(blocks[0].from, '00:00:00');
  assert.equal(blocks.at(-1).to, '24:00:00');
  assert.deepEqual(blocks[0].data, { temperature: 5, off: true });
  assert.deepEqual(blocks[1], { from: '06:00:00', to: '07:00:00', data: { temperature: 21 } });
  assert.deepEqual(blocksToPeriods(blocks), STARTER.weekday);
});

test('gaps become periods without a temperature, and stay gaps', () => {
  const periods = blocksToPeriods([
    { from: '06:00:00', to: '08:00:00', data: { temperature: 20 } },
  ]);
  assert.deepEqual(periods, [
    { start: 0, temperature: null, off: false },
    { start: 360, temperature: 20, off: false },
    { start: 480, temperature: null, off: false },
  ]);
  const back = periodsToBlocks(periods);
  assert.deepEqual(back, [{ from: '06:00:00', to: '08:00:00', data: { temperature: 20 } }]);
  assert.deepEqual(blocksToPeriods([]), [{ start: 0, temperature: null, off: false }]);
});

test('a gap switched to Off is saved as Off', () => {
  const periods = [{ start: 0, temperature: null, off: true }];
  const blocks = periodsToBlocks(periods);
  assert.deepEqual(blocks, [
    { from: '00:00:00', to: '24:00:00', data: { temperature: 5, off: true } },
  ]);
});

test('checkPeriods names what stops a plan from being saved', () => {
  assert.deepEqual(checkPeriods(STARTER.free), []);
  assert.deepEqual(checkPeriods([{ start: 60, temperature: 20 }]), ['first']);
  const sameStart = [
    { start: 0, temperature: 20 },
    { start: 0, temperature: 21 },
  ];
  assert.deepEqual(checkPeriods(sameStart), ['order']);
  assert.deepEqual(checkPeriods([{ start: 0, temperature: 31 }]), ['temp']);
  assert.deepEqual(checkPeriods([{ start: 0, temperature: null, off: true }]), []);
});

test('periodAt finds the next period with another temperature', () => {
  const periods = [
    { start: 0, temperature: 5, off: true },
    { start: 360, temperature: 21 },
    { start: 420, temperature: 21 },
    { start: 480, temperature: 17 },
  ];
  assert.equal(periodAt(periods, 365).index, 1);
  assert.equal(periodAt(periods, 365).next.start, 480);
  assert.equal(periodAt(periods, 500).next, null);
  assert.equal(periodAt(periods, 0).next.start, 360);
});
