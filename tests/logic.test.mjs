import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toMin, fromMin, nowIn, addDays, blocksToPeriods, periodsToBlocks, checkPeriods, periodAt, slugify,
  planLabel, matchPlan, planForDay, parseException, exceptionTitle, reasonText, fmtTemp, STARTER,
  roomFromInput, DIRECTORY_FIELDS, exerciseFromInput,
} from '../weekheat-card.js';

test('time', () => {
  assert.equal(toMin('06:30:00'), 390);
  assert.equal(toMin('24:00:00'), 1440);
  assert.equal(fromMin(390), '06:30');
  assert.equal(fromMin(1440), '24:00');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-29', 1), '2026-03-30');
  // 2026-11-13 08:25 UTC is 09:25 in Vienna, a Friday
  assert.deepEqual(nowIn('Europe/Vienna', new Date('2026-11-13T08:25:00Z')), { date: '2026-11-13', day: 'fri', min: 565 });
  assert.deepEqual(nowIn('Europe/Vienna', new Date('2026-11-13T23:30:00Z')), { date: '2026-11-14', day: 'sat', min: 30 });
});

test('blocks <-> periods round trip', () => {
  const blocks = periodsToBlocks(STARTER.weekday);
  assert.equal(blocks[0].from, '00:00:00');
  assert.equal(blocks.at(-1).to, '24:00:00');
  assert.deepEqual(blocks[0].data, { temperature: 5, off: true });
  assert.deepEqual(blocks[1], { from: '06:00:00', to: '07:00:00', data: { temperature: 21 } });
  assert.deepEqual(blocksToPeriods(blocks), STARTER.weekday);
});

test('gaps become null periods and stay gaps', () => {
  const p = blocksToPeriods([{ from: '06:00:00', to: '08:00:00', data: { temperature: 20 } }]);
  assert.deepEqual(p, [
    { start: 0, temperature: null, off: false }, { start: 360, temperature: 20, off: false },
    { start: 480, temperature: null, off: false }]);
  assert.deepEqual(periodsToBlocks(p), [{ from: '06:00:00', to: '08:00:00', data: { temperature: 20 } }]);
  assert.deepEqual(blocksToPeriods([]), [{ start: 0, temperature: null, off: false }]);
});

test('checkPeriods', () => {
  assert.deepEqual(checkPeriods(STARTER.free), []);
  assert.deepEqual(checkPeriods([{ start: 60, temperature: 20 }]), ['first']);
  assert.deepEqual(checkPeriods([{ start: 0, temperature: 20 }, { start: 0, temperature: 21 }]), ['order']);
  assert.deepEqual(checkPeriods([{ start: 0, temperature: 31 }]), ['temp']);
  assert.deepEqual(checkPeriods([{ start: 0, temperature: null, off: true }]), []);
});

test('periodAt finds the next different temperature', () => {
  const p = [{ start: 0, temperature: 5, off: true }, { start: 360, temperature: 21 }, { start: 420, temperature: 21 },
    { start: 480, temperature: 17 }];
  assert.equal(periodAt(p, 365).index, 1);
  assert.equal(periodAt(p, 365).next.start, 480);
  assert.equal(periodAt(p, 500).next, null);
  assert.equal(periodAt(p, 0).next.start, 360);
});

test('slugify like HA', () => {
  assert.equal(slugify('Freier Tag'), 'freier_tag');
  assert.equal(slugify('Küche Straße'), 'kuche_strasse');
  assert.equal(slugify(' Home-Office! '), 'home_office');
});

test('plan names and matching', () => {
  const plans = ['schedule.bad_werktag', 'schedule.bad_homeoffice', 'schedule.x'];
  const fr = { 'schedule.bad_werktag': 'Bad Werktag', 'schedule.bad_homeoffice': 'Bad Homeoffice', 'schedule.x': 'Bad Home office' };
  assert.equal(planLabel('Bad Werktag', 'Bad'), 'Werktag');
  assert.equal(planLabel('Werktag', 'Bad'), 'Werktag');
  assert.equal(matchPlan('Homeoffice', plans, fr), 'schedule.bad_homeoffice');
  assert.equal(matchPlan('home office', plans, fr), 'schedule.x');
  assert.equal(matchPlan('Urlaub', plans, fr), null);
  const room = { plans, free_day: 'schedule.x', week: { fri: 'schedule.bad_homeoffice' } };
  assert.equal(planForDay(room, { weekday: 'fri', free: false }, fr), 'schedule.bad_homeoffice');
  assert.equal(planForDay(room, { weekday: 'mon', free: false }, fr), 'schedule.bad_werktag');
  assert.equal(planForDay(room, { weekday: 'mon', free: true }, fr), 'schedule.x');
  assert.equal(planForDay(room, { weekday: 'mon', free: false, plan: 'Homeoffice' }, fr), 'schedule.bad_homeoffice');
  assert.equal(planForDay(room, { weekday: 'mon', free: false, plan: 'Urlaub' }, fr), 'schedule.bad_werktag');
});

test('exception titles', () => {
  assert.deepEqual(parseException('Freier Tag – Test'), { free: true, plan: null, note: 'Test' });
  assert.deepEqual(parseException('Werktag'), { free: false, plan: null, note: null });
  assert.deepEqual(parseException('Plan: Homeoffice - Büro zu'), { free: false, plan: 'Homeoffice', note: 'Büro zu' });
  assert.equal(parseException('Geburtstag'), null);
  assert.equal(exceptionTitle({ free: true, note: 'x' }, 'de'), 'Freier Tag – x');
  assert.equal(exceptionTitle({ plan: 'Homeoffice' }, 'en'), 'Plan: Homeoffice');
  for (const ex of [{ free: true }, { free: false }, { plan: 'Homeoffice', note: 'n' }]) {
    const back = parseException(exceptionTitle(ex, 'de'));
    assert.equal(back.free, !!ex.free && !ex.plan);
    assert.equal(back.plan, ex.plan || null);
  }
});

test('texts', () => {
  assert.equal(reasonText({ kind: 'holiday', detail: 'Mariä Empfängnis' }, 'de'), 'Feiertag: Mariä Empfängnis');
  assert.equal(reasonText({ kind: 'weekend', weekday: 'sat' }, 'en'), 'Saturday');
  assert.equal(reasonText({ kind: 'calendar', source: 'Familie', detail: 'schulfrei' }, 'de'), 'Familie: schulfrei');
  assert.equal(fmtTemp(20.5, 'de'), '20,5 °C');
  assert.equal(fmtTemp({ off: true, temperature: 5 }, 'de'), 'Aus');
});

test('dial: angle and pointer value', async () => {
  const { dialAngle, dialValue, dialPoint, DIAL } = await import('../weekheat-card.js');
  assert.equal(dialAngle(5, 5, 30), 135);
  assert.equal(dialAngle(30, 5, 30), 405);
  assert.equal(dialAngle(17.5, 5, 30), 270); // top
  assert.equal(dialAngle(2, 5, 30), 135); // clamped
  const at = (v) => { const [x, y] = dialPoint(dialAngle(v, 5, 30)); return dialValue(x, y, 5, 30, 0.5); };
  for (const v of [5, 12, 17.5, 21, 24.5, 30]) assert.equal(at(v), v);
  // bottom gap: left of centre goes to the low end, right to the high end
  assert.equal(dialValue(DIAL.cx - 10, DIAL.cy + 80, 5, 30, 0.5), 5);
  assert.equal(dialValue(DIAL.cx + 10, DIAL.cy + 80, 5, 30, 0.5), 30);
  assert.equal(dialValue(DIAL.cx, DIAL.cy - 80, 5, 30, 0.5), 17.5);
});

test('roomFromInput reads blueprint inputs with defaults', () => {
  const r = roomFromInput({ room_name: 'Bad', thermostats: 'climate.a', plans: ['schedule.x'], heating_switch: ['input_boolean.h'] }, 'Weekheat Bad');
  assert.deepEqual(r, { name: 'Bad', thermostats: ['climate.a'], plans: ['schedule.x'], week: {}, free_day: undefined, state: undefined,
    windows: [], window_delay: 30, heating_switch: 'input_boolean.h' });
  assert.equal(roomFromInput({}, 'Alias').name, 'Alias');
  assert.equal(roomFromInput({}, 'A').heating_switch, null);
  for (const k of DIRECTORY_FIELDS.filter((k) => !['entity', 'id'].includes(k))) assert.ok(k in r, k);
});

test('exerciseFromInput fills in the defaults', () => {
  assert.deepEqual(exerciseFromInput(), { exercise_day: 'off', exercise_time: '13:00:00', exercise_wait: 60 });
  assert.deepEqual(exerciseFromInput({ exercise_day: 'sat', exercise_wait: 90 }), { exercise_day: 'sat', exercise_time: '13:00:00', exercise_wait: 90 });
});
