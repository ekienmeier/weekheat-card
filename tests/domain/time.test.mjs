// Tests of src/domain/time.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, fromMin, isDayMinute, nowIn, toMin } from '../../src/domain/time.js';

test('minutes and "HH:MM" convert both ways, 24:00 included', () => {
  assert.equal(toMin('06:30:00'), 390);
  assert.equal(toMin('24:00:00'), 1440);
  assert.equal(fromMin(390), '06:30');
  assert.equal(fromMin(1440), '24:00');
  assert.ok(isDayMinute(0) && isDayMinute(1439));
  assert.ok(!isDayMinute(1440) && !isDayMinute(-1) && !isDayMinute(1.5));
});

test('addDays crosses the year and the switch to summer time', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-29', 1), '2026-03-30');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('nowIn gives date, weekday and minute in the time zone', () => {
  // 2026-11-13 08:25 UTC is 09:25 in Vienna, a Friday
  const morning = nowIn('Europe/Vienna', new Date('2026-11-13T08:25:00Z'));
  assert.deepEqual(morning, { date: '2026-11-13', day: 'fri', min: 565 });
  const night = nowIn('Europe/Vienna', new Date('2026-11-13T23:30:00Z'));
  assert.deepEqual(night, { date: '2026-11-14', day: 'sat', min: 30 });
});
