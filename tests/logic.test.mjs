import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toMin, fromMin, nowIn, addDays, blocksToPeriods, periodsToBlocks, checkPeriods, periodAt, slugify,
  planLabel, matchPlan, planForDay, parseException, exceptionTitle, reasonText, fmtTemp, STARTER,
  roomFromInput, DIRECTORY_FIELDS, exerciseFromInput, pickKind, pickCandidates, count, targetsText, clampT, blueprintVersion, olderVersion, BLUEPRINT_VERSION, VERSION,
  stateSize, STATE_MAX, fill, errorText, isNotFound, I18N,
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
  assert.equal(matchPlan('Homeoffice', plans, { friendly: fr, room: 'Bad' }), 'schedule.bad_homeoffice');
  assert.equal(matchPlan('home office', plans, { friendly: fr, room: 'Bad' }), 'schedule.x');
  assert.equal(matchPlan('Urlaub', plans, { friendly: fr, room: 'Bad' }), null);
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
    windows: [], window_delay: 30, heating_switch: 'input_boolean.h', room_sensor: null, room_margin: 0.5 });
  assert.equal(roomFromInput({}, 'Alias').name, 'Alias');
  assert.equal(roomFromInput({}, 'A').heating_switch, null);
  assert.equal(roomFromInput({}, 'A').room_sensor, null);
  assert.equal(roomFromInput({}, 'A').room_margin, 0.5);
  assert.equal(roomFromInput({ room_sensor: 'sensor.t1', room_margin: 0.8 }, 'A').room_sensor, 'sensor.t1');
  for (const k of DIRECTORY_FIELDS.filter((k) => !['entity', 'id'].includes(k))) assert.ok(k in r, k);
});

test('exerciseFromInput fills in the defaults', () => {
  assert.deepEqual(exerciseFromInput(), { exercise_day: 'off', exercise_time: '13:00:00', exercise_wait: 60 });
  assert.deepEqual(exerciseFromInput({ exercise_day: 'sat', exercise_wait: 90 }), { exercise_day: 'sat', exercise_time: '13:00:00', exercise_wait: 90 });
});

test('pickCandidates filters by kind and words, room area first', () => {
  const st = (entity_id, friendly_name, device_class) => ({ entity_id, attributes: { friendly_name, device_class } });
  const states = [
    st('sensor.t1_bad', 'Badezimmer', 'temperature'),
    st('sensor.motion_bad', 'Badezimmer Motion Sensor', 'temperature'),
    st('sensor.t1_kinder', 'Kinderzimmer', 'temperature'),
    st('sensor.hum_bad', 'Badezimmer Feuchte', 'humidity'),
    st('binary_sensor.fenster_bad', 'Badezimmer Fenster', 'window'),
    st('binary_sensor.motion', 'Bewegung', 'motion'),
    st('climate.bad', 'Badezimmer', undefined),
  ];
  const area = { 'sensor.t1_bad': 'Badezimmer', 'sensor.motion_bad': 'Badezimmer', 'sensor.t1_kinder': 'Kinderzimmer' };
  const areaOf = (e) => area[e] || '';
  assert.ok(pickKind(states[4], 'win'));
  assert.ok(!pickKind(states[5], 'win'));
  assert.ok(pickKind(states[6], 'th'));
  const all = pickCandidates(states, { kind: 'rs', areaOf, roomArea: 'Badezimmer' });
  assert.deepEqual(all.here.map((s) => s.entity_id), ['sensor.t1_bad', 'sensor.motion_bad']);
  assert.deepEqual(all.other.map((s) => s.entity_id), ['sensor.t1_kinder']);
  // every word must match somewhere: name, entity id or area
  assert.deepEqual(pickCandidates(states, { kind: 'rs', q: 'bad motion', areaOf }).other.map((s) => s.entity_id), ['sensor.motion_bad']);
  assert.deepEqual(pickCandidates(states, { kind: 'rs', q: 'kinder', areaOf }).other.map((s) => s.entity_id), ['sensor.t1_kinder']);
  // already chosen ones are left out; no room area: all in `other`
  const ex = pickCandidates(states, { kind: 'rs', exclude: ['sensor.t1_bad'], areaOf });
  assert.deepEqual(ex.here, []);
  assert.equal(ex.other.length, 2);
});

test('count picks singular or plural', () => {
  assert.equal(count(1, ['Regel', 'Regeln']), '1 Regel');
  assert.equal(count(0, ['Regel', 'Regeln']), '0 Regeln');
  assert.equal(count(3, ['Kontakt', 'Kontakte']), '3 Kontakte');
});

test('targetsText shows one value or each differing one', () => {
  assert.equal(targetsText([20, 20], 'de'), '20 °C');
  assert.equal(targetsText([18, 22.5], 'de'), '18 / 22,5 °C');
  assert.equal(targetsText([18, null, 22], 'en'), '18 / 22 °C');
  assert.equal(targetsText([], 'de'), '–');
  assert.equal(clampT(31), 30);
  assert.equal(clampT(4), 5);
});

test('blueprint versions', () => {
  assert.equal(blueprintVersion('Decides … (custom:weekheat-card). Weekheat 0.12.0'), '0.12.0');
  assert.equal(blueprintVersion('Pairs with the Weekheat card (custom:weekheat-card).'), null);
  assert.ok(olderVersion(null, '0.12.0'));
  assert.ok(olderVersion('0.9.0', '0.12.0'));
  assert.ok(!olderVersion('0.12.0', '0.12.0'));
  assert.ok(!olderVersion('1.0.0', '0.12.0'));
  // the card never expects blueprints newer than itself
  assert.ok(!olderVersion(VERSION, BLUEPRINT_VERSION));
});

test('the blueprints carry the version the card expects', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const f of ['blueprints/automation/weekheat_room.yaml', 'blueprints/script/weekheat_day.yaml']) {
    const y = await readFile(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.equal(blueprintVersion(y.split('\n  domain:')[0]), BLUEPRINT_VERSION, f);
  }
});

// Regression tests for the defects fixed in 0.12.1 (docs/review-2026-11-18.md, H1 and H2).

test('a plan name picks the plan of exactly that name, not one that ends like it (H2)', () => {
  const plans = ['schedule.weekheat_bad_kurzer_werktag', 'schedule.weekheat_bad_werktag'];
  const friendly = { [plans[0]]: 'Bad Kurzer Werktag', [plans[1]]: 'Bad Werktag' };
  assert.equal(matchPlan('Werktag', plans, { friendly, room: 'Bad' }), plans[1]);
  const office = ['schedule.weekheat_bad_kein_homeoffice', 'schedule.weekheat_bad_homeoffice'];
  assert.equal(matchPlan('Homeoffice', office, { room: 'Bad' }), office[1]);
});

test('a renamed plan is found by its name, then by the entity id the card gave it (H2)', () => {
  const plans = ['schedule.weekheat_wohnzimmer_working_day', 'schedule.weekheat_wohnzimmer_free_day'];
  const friendly = { [plans[0]]: 'Wohnzimmer Werktag', [plans[1]]: 'Wohnzimmer Wochenende' };
  const room = 'Wohnzimmer';
  assert.equal(matchPlan('Werktag', plans, { friendly, room }), plans[0]);
  assert.equal(matchPlan('wochenende', plans, { friendly, room }), plans[1]);
  assert.equal(matchPlan('Free day', plans, { friendly, room }), plans[1]);
});

test('a name that only ends like several plans picks none of them (H2)', () => {
  const plans = ['schedule.bad_kurzer_werktag', 'schedule.bad_langer_werktag'];
  assert.equal(matchPlan('Werktag', plans, { room: 'Badezimmer' }), null);
  // ...but one such plan is still found, e.g. after the room was renamed
  assert.equal(matchPlan('Werktag', ['schedule.bad_werktag', 'schedule.bad_frei'], { room: 'Badezimmer' }),
    'schedule.bad_werktag');
});

test('the worst-case state fits four thermostats with long ids, but not six (H1)', () => {
  const ids = (n) => Array.from({ length: n }, (_, i) => `climate.wohnzimmer_thermostat_nummer_${i}`);
  assert.equal(stateSize([]), JSON.stringify({ _open: [], _rc: 1, _rt: 99999999, _ex: 1 }).length);
  assert.ok(stateSize(ids(4)) <= STATE_MAX, String(stateSize(ids(4))));
  assert.ok(stateSize(ids(6)) > STATE_MAX, String(stateSize(ids(6))));
  // as the blueprint writes it: one setpoint per thermostat, no timestamp
  const sample = JSON.stringify({ 'climate.a': [22.5], _open: [22.5], _rc: 1, _rt: 29916300, _ex: 1 });
  assert.equal(stateSize(['climate.a']), sample.length);
});

test('the room blueprint no longer stores a timestamp per thermostat (H1)', async () => {
  const { readFile } = await import('node:fs/promises');
  const y = await readFile(new URL('../blueprints/automation/weekheat_room.yaml', import.meta.url), 'utf8');
  assert.ok(!/\bstamp\b/.test(y), 'the room blueprint still mentions stamp');
});

test('texts: placeholders, error messages, both languages alike', () => {
  assert.equal(fill('{size} of {max}, {other}', { size: 260, max: 255 }), '260 of 255, {other}');
  assert.equal(errorText(new Error('boom')), 'boom');
  assert.equal(errorText({ error: 'Response error: 500', status_code: 500, body: { message: 'x' } }), 'x');
  assert.equal(errorText({ code: 'unknown_error', message: 'ws' }), 'ws');
  assert.ok(isNotFound({ status_code: 404 }));
  assert.ok(!isNotFound({ status_code: 500 }) && !isNotFound(undefined));
  assert.deepEqual(Object.keys(I18N.de).sort(), Object.keys(I18N.en).sort());
});
