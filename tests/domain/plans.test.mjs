// Tests of src/domain/plans.js. H2 marks the regression tests of review finding H2 (0.12.1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { dayOf, matchPlan, planForDay, planLabel, slugify } from '../../src/domain/plans.js';

test('slugify like Home Assistant for German names', () => {
  assert.equal(slugify('Freier Tag'), 'freier_tag');
  assert.equal(slugify('Küche Straße'), 'kuche_strasse');
  assert.equal(slugify(' Home-Office! '), 'home_office');
});

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

test('a plan name matches by the plan name, ignoring case and spelling of spaces', () => {
  const names = { friendly: FRIENDLY, room: 'Bad' };
  assert.equal(matchPlan('Homeoffice', PLANS, names), 'schedule.bad_homeoffice');
  assert.equal(matchPlan('home office', PLANS, names), 'schedule.x');
  assert.equal(matchPlan('Urlaub', PLANS, names), null);
  assert.equal(matchPlan('', PLANS, names), null);
});

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

test('a plan name picks the plan of exactly that name, not one that ends like it (H2)', () => {
  const plans = ['schedule.weekheat_bad_kurzer_werktag', 'schedule.weekheat_bad_werktag'];
  const friendly = { [plans[0]]: 'Bad Kurzer Werktag', [plans[1]]: 'Bad Werktag' };
  assert.equal(matchPlan('Werktag', plans, { friendly, room: 'Bad' }), plans[1]);
  const office = ['schedule.weekheat_bad_kein_homeoffice', 'schedule.weekheat_bad_homeoffice'];
  assert.equal(matchPlan('Homeoffice', office, { room: 'Bad' }), office[1]);
});

test('a renamed plan is found by its name, then by the entity id the card gave it (H2)', () => {
  const plans = [
    'schedule.weekheat_wohnzimmer_working_day',
    'schedule.weekheat_wohnzimmer_free_day',
  ];
  const friendly = { [plans[0]]: 'Wohnzimmer Werktag', [plans[1]]: 'Wohnzimmer Wochenende' };
  const names = { friendly, room: 'Wohnzimmer' };
  assert.equal(matchPlan('Werktag', plans, names), plans[0]);
  assert.equal(matchPlan('wochenende', plans, names), plans[1]);
  assert.equal(matchPlan('Free day', plans, names), plans[1]);
});

test('a name that only ends like several plans picks none of them (H2)', () => {
  const plans = ['schedule.bad_kurzer_werktag', 'schedule.bad_langer_werktag'];
  assert.equal(matchPlan('Werktag', plans, { room: 'Badezimmer' }), null);
  // ...but one such plan is still found, e.g. after the room was renamed
  const renamed = ['schedule.bad_werktag', 'schedule.bad_frei'];
  assert.equal(matchPlan('Werktag', renamed, { room: 'Badezimmer' }), 'schedule.bad_werktag');
});

test('dayOf finds today, or makes a plain working day', () => {
  const days = [{ date: '2026-11-14', weekday: 'sat', free: true, kind: 'weekend' }];
  assert.equal(dayOf(days, { date: '2026-11-14', day: 'sat' }), days[0]);
  const plain = { date: '2026-11-13', weekday: 'fri', free: false, kind: 'plain' };
  assert.deepEqual(dayOf(days, { date: '2026-11-13', day: 'fri' }), plain);
  assert.deepEqual(dayOf(null, { date: '2026-11-13', day: 'fri' }), plain);
});
