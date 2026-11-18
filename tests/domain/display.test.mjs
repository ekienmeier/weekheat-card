// Tests of src/domain/format.js, dial.js, picker.js and versions.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  count,
  formatPeriod,
  formatTemp,
  reasonText,
  targetsText,
} from '../../src/domain/format.js';
import { DIAL, dialAngle, dialPoint, dialValue, sliderValue } from '../../src/domain/dial.js';
import { pickCandidates, pickKind } from '../../src/domain/picker.js';
import { blueprintVersion, olderVersion } from '../../src/domain/versions.js';
import { formattingOf } from '../../src/domain/formatting.js';
import { textsFor } from '../../src/i18n/text.js';

/** How a German and an English user write numbers, with Home Assistant's default settings. */
const DE = formattingOf({ language: 'de', number_format: 'language' }, 'en');

/** See DE. */
const EN = formattingOf({ language: 'en', number_format: 'language' }, 'en');

test('temperatures, periods and reasons in both languages', () => {
  assert.equal(formatTemp(20.5, DE), '20,5 °C');
  assert.equal(formatTemp(null, DE), '–');
  assert.equal(formatPeriod({ off: true, temperature: 5 }, DE, textsFor('de')), 'Aus');
  const holiday = { kind: 'holiday', detail: 'Mariä Empfängnis' };
  assert.equal(reasonText(holiday, textsFor('de')), 'Feiertag: Mariä Empfängnis');
  assert.equal(reasonText({ kind: 'weekend', weekday: 'sat' }, textsFor('en')), 'Saturday');
  const keyword = { kind: 'calendar', source: 'Familie', detail: 'schulfrei' };
  assert.equal(reasonText(keyword, textsFor('de')), 'Familie: schulfrei');
});

test('targetsText shows one value, or each when they differ; count picks the word', () => {
  assert.equal(targetsText([20, 20], DE), '20 °C');
  assert.equal(targetsText([18, 22.5], DE), '18 / 22,5 °C');
  assert.equal(targetsText([18, null, 22], EN), '18 / 22 °C');
  assert.equal(targetsText([], DE), '–');
  assert.equal(count(1, ['Regel', 'Regeln']), '1 Regel');
  assert.equal(count(0, ['Regel', 'Regeln']), '0 Regeln');
});

/** The default dial and slider scale. */
const SCALE = { low: 5, high: 30, step: 0.5 };

test('dial: angle of a setpoint, and the setpoint at a pointer', () => {
  assert.equal(dialAngle(5, 5, 30), 135);
  assert.equal(dialAngle(30, 5, 30), 405);
  assert.equal(dialAngle(17.5, 5, 30), 270); // top
  assert.equal(dialAngle(2, 5, 30), 135); // clamped
  const back = (value) => dialValue(...dialPoint(dialAngle(value, 5, 30)), SCALE);
  for (const value of [5, 12, 17.5, 21, 24.5, 30]) assert.equal(back(value), value);
});

test('dial: the gap at the bottom goes to the nearer end; the slider clamps', () => {
  assert.equal(dialValue(DIAL.cx - 10, DIAL.cy + 80, SCALE), 5);
  assert.equal(dialValue(DIAL.cx + 10, DIAL.cy + 80, SCALE), 30);
  assert.equal(dialValue(DIAL.cx, DIAL.cy - 80, SCALE), 17.5);
  assert.equal(sliderValue(0.5, SCALE), 17.5);
  assert.equal(sliderValue(1.4, SCALE), 30);
});

/**
 * A state for the picker tests.
 * @param {string} id
 * @param {string} name
 * @param {string} [deviceClass]
 * @returns {object}
 */
function entity(id, name, deviceClass) {
  return { entity_id: id, attributes: { friendly_name: name, device_class: deviceClass } };
}

/** The entities the picker tests choose from. */
const STATES = [
  entity('sensor.t1_bad', 'Badezimmer', 'temperature'),
  entity('sensor.motion_bad', 'Badezimmer Motion Sensor', 'temperature'),
  entity('sensor.t1_kinder', 'Kinderzimmer', 'temperature'),
  entity('sensor.hum_bad', 'Badezimmer Feuchte', 'humidity'),
  entity('binary_sensor.fenster_bad', 'Badezimmer Fenster', 'window'),
  entity('binary_sensor.motion', 'Bewegung', 'motion'),
  entity('climate.bad', 'Badezimmer'),
];

/** Areas of some of them. */
const AREAS = { 'sensor.t1_bad': 'Bad', 'sensor.motion_bad': 'Bad', 'sensor.t1_kinder': 'Kind' };

test('the picker offers entities of its kind, the room\u2019s area first', () => {
  assert.ok(pickKind(STATES[4], 'win') && !pickKind(STATES[5], 'win') && pickKind(STATES[6], 'th'));
  const areaOf = (id) => AREAS[id] || '';
  const all = pickCandidates(STATES, { kind: 'rs', areaOf, roomArea: 'Bad' });
  assert.deepEqual(
    all.here.map((state) => state.entity_id),
    ['sensor.t1_bad', 'sensor.motion_bad'],
  );
  assert.deepEqual(
    all.other.map((state) => state.entity_id),
    ['sensor.t1_kinder'],
  );
});

test('the picker: every word must match; chosen entities are left out', () => {
  const areaOf = (id) => AREAS[id] || '';
  const ids = (options) => pickCandidates(STATES, { kind: 'rs', areaOf, ...options }).other;
  assert.deepEqual(
    ids({ query: 'bad motion' }).map((state) => state.entity_id),
    ['sensor.motion_bad'],
  );
  assert.deepEqual(
    ids({ query: 'kind' }).map((state) => state.entity_id),
    ['sensor.t1_kinder'],
  );
  assert.equal(ids({ exclude: ['sensor.t1_bad'] }).length, 2);
});

test('blueprint versions: read from the description, and compared', () => {
  assert.equal(blueprintVersion('Decides … (custom:weekheat-card). Weekheat 0.12.0'), '0.12.0');
  assert.equal(blueprintVersion('Pairs with the Weekheat card (custom:weekheat-card).'), null);
  assert.ok(olderVersion(null, '0.12.0'));
  assert.ok(olderVersion('0.9.0', '0.12.0'));
  assert.ok(!olderVersion('0.12.0', '0.12.0'));
  assert.ok(!olderVersion('1.0.0', '0.12.0'));
});
