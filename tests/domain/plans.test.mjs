// Tests of src/domain/plans.js. The plan-name rule (matchPlan, slugify) is tested with the cases
// shared with the room blueprint, in plan-names.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dayOf, planForDay, planLabel } from '../../src/domain/plans.js';

test('plan labels leave out the room name', () => {
  assert.equal(planLabel('Bad Werktag', 'Bad'), 'Werktag');
  assert.equal(planLabel('Werktag', 'Bad'), 'Werktag');
  assert.equal(planLabel(undefined, 'Bad'), '');
});

/** Plans of a room "Bad", as several tests use them. */
const PLANS = ['schedule.bad_werktag', 'schedule.bad_homeoffice', 'schedule.x'];

/** Their friendly names. */
const FRIENDLY = {
  'schedule.bad_werktag': 'Bad Werktag',
  'schedule.bad_homeoffice': 'Bad Homeoffice',
  'schedule.x': 'Bad Home office',
};

test('planForDay: a named plan, else the free-day plan, else the week', () => {
  const room = { name: 'Bad', plans: PLANS, free_day: 'schedule.x', week: { fri: PLANS[1] } };
  const day = (fields) => ({ date: '2026-11-13', kind: 'plain', ...fields });
  assert.equal(planForDay(room, day({ weekday: 'fri', free: false }), FRIENDLY), PLANS[1]);
  assert.equal(planForDay(room, day({ weekday: 'mon', free: false }), FRIENDLY), PLANS[0]);
  assert.equal(planForDay(room, day({ weekday: 'mon', free: true }), FRIENDLY), 'schedule.x');
  const named = day({ weekday: 'mon', free: false, plan: 'Homeoffice' });
  assert.equal(planForDay(room, named, FRIENDLY), PLANS[1]);
  const unknown = day({ weekday: 'mon', free: false, plan: 'Urlaub' });
  assert.equal(planForDay(room, unknown, FRIENDLY), PLANS[0]);
});

test('dayOf finds today, or makes a plain working day', () => {
  const days = [{ date: '2026-11-14', weekday: 'sat', free: true, kind: 'weekend' }];
  assert.equal(dayOf(days, { date: '2026-11-14', day: 'sat' }), days[0]);
  const plain = { date: '2026-11-13', weekday: 'fri', free: false, kind: 'plain' };
  assert.deepEqual(dayOf(days, { date: '2026-11-13', day: 'fri' }), plain);
  assert.deepEqual(dayOf(null, { date: '2026-11-13', day: 'fri' }), plain);
});
