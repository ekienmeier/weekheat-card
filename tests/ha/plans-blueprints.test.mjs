// Tests of src/ha/plans.js, blueprints.js and controls.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlan, loadPlans } from '../../src/ha/plans.js';
import { blueprintStatus, updateBlueprints } from '../../src/ha/blueprints.js';
import { triggerRooms } from '../../src/ha/controls.js';
import { BLUEPRINT_VERSION } from '../../src/version.js';
import { fakeGateway, sent, services } from './fake-gateway.mjs';

/** A schedule helper with 20 °C all day, and its registry entry. */
const ITEM = {
  id: 'p1',
  name: 'Bad Werktag',
  monday: [{ from: '00:00:00', to: '24:00:00', data: { temperature: 20 } }],
};

/** See ITEM. */
const ENTRY = { platform: 'schedule', unique_id: 'p1', entity_id: 'schedule.bad_werktag' };

test('loadPlans reads each schedule helper’s periods, by entity id', async () => {
  const ws = (message) => (message.type === 'schedule/list' ? [ITEM] : [ENTRY]);
  const plans = await loadPlans(fakeGateway({ ws }));
  assert.deepEqual(Object.keys(plans), ['schedule.bad_werktag']);
  assert.deepEqual(plans['schedule.bad_werktag'].periods, [
    { start: 0, temperature: 20, off: false },
  ]);
});

test('a plan written by the card to every day is not marked as differing by weekday', async () => {
  const blocks = ITEM.monday;
  const item = { ...ITEM, tuesday: blocks, wednesday: blocks, thursday: blocks, friday: blocks };
  const full = { ...item, saturday: blocks, sunday: blocks };
  const ws = (message) => (message.type === 'schedule/list' ? [full] : [ENTRY]);
  const plan = (await loadPlans(fakeGateway({ ws })))['schedule.bad_werktag'];
  assert.equal(plan.perDay, false);
  assert.deepEqual(plan.days.sun, plan.periods);
});

test('a plan edited per weekday in Home Assistant is marked, and keeps each day', async () => {
  const warm = [{ from: '06:00:00', to: '22:00:00', data: { temperature: 22 } }];
  const days = ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const item = { ...ITEM, ...Object.fromEntries(days.map((day) => [day, ITEM.monday])) };
  const ws = (message) =>
    message.type === 'schedule/list' ? [{ ...item, sunday: warm }] : [ENTRY];
  const plan = (await loadPlans(fakeGateway({ ws })))['schedule.bad_werktag'];
  assert.equal(plan.perDay, true);
  assert.deepEqual(plan.periods, [{ start: 0, temperature: 20, off: false }]);
  assert.deepEqual(
    plan.days.sun.map((period) => period.temperature),
    [null, 22, null],
  );
});

test('createPlan names the entity after room and plan, unless that id is taken', async () => {
  const registry = [{ platform: 'schedule', unique_id: 'p1', entity_id: 'schedule.bad_werktag' }];
  const ws = (message) =>
    message.type === 'schedule/create' ? { id: 'p1', monday: [] } : registry;
  const gateway = fakeGateway({ ws });
  const made = await createPlan(gateway, { room: 'Bad', name: 'Werktag', periods: [] });
  assert.equal(made.entity, 'schedule.weekheat_bad_werktag');
  assert.equal(sent(gateway, 'config/entity_registry/update')[0].new_entity_id, made.entity);
  const taken = fakeGateway({ ws, states: { 'schedule.weekheat_bad_werktag': {} } });
  assert.equal(
    (await createPlan(taken, { room: 'Bad', name: 'Werktag', periods: [] })).entity,
    'schedule.bad_werktag',
  );
});

/**
 * A blueprint as `blueprint/list` lists it, marked with a release.
 * @param {string} version
 * @returns {any}
 */
const marked = (version) => ({ metadata: { description: `… Weekheat ${version}` } });

/** The valve exercise script's state, as a script made from its blueprint has. */
const EXERCISE_STATES = { 'script.weekheat_exercise': { state: 'off' } };

/** The valve exercise blueprint as blueprintStatus lists it when it is missing. */
const NO_EXERCISE = {
  domain: 'script',
  path: 'ekienmeier/weekheat_exercise.yaml',
  file: 'weekheat_exercise.yaml',
  installed: null,
  current: false,
  script: 'script.weekheat_exercise',
};

/**
 * Home Assistant's blueprint lists, with the exercise blueprint marked with a release or missing.
 * @param {string | null} exercise
 * @returns {Record<string, any>}
 */
function blueprintLists(exercise) {
  const scripts = { 'ekienmeier/weekheat_day.yaml': marked(BLUEPRINT_VERSION) };
  if (exercise) scripts['ekienmeier/weekheat_exercise.yaml'] = marked(exercise);
  return { automation: { 'ekienmeier/weekheat_room.yaml': marked('0.9.0') }, script: scripts };
}

test('blueprintStatus lists the blueprints older than the card needs', async () => {
  const lists = blueprintLists(BLUEPRINT_VERSION);
  const ws = (message) => lists[message.domain];
  const { old } = await blueprintStatus(fakeGateway({ ws, states: EXERCISE_STATES }));
  const room = {
    domain: 'automation',
    path: 'ekienmeier/weekheat_room.yaml',
    file: 'weekheat_room.yaml',
  };
  assert.deepEqual(old, [{ ...room, installed: '0.9.0' }]);
});

test('blueprintStatus lists the exercise blueprint when it or its script is missing', async () => {
  const status = async (lists, states) =>
    (await blueprintStatus(fakeGateway({ ws: (message) => lists[message.domain], states }))).old;
  assert.deepEqual((await status(blueprintLists(null), {}))[1], NO_EXERCISE);
  const current = await status(blueprintLists(BLUEPRINT_VERSION), {});
  assert.deepEqual(current[1], { ...NO_EXERCISE, installed: BLUEPRINT_VERSION, current: true });
  const old = await status(blueprintLists('0.9.0'), EXERCISE_STATES);
  assert.deepEqual(old[1], { ...NO_EXERCISE, installed: '0.9.0' });
});

/**
 * A fake gateway whose blueprint/import answers with a blueprint's text.
 * @param {Record<string, any>} [states]
 * @returns {any}
 */
function importingGateway(states = {}) {
  const ws = (message) => (message.type === 'blueprint/import' ? { raw_data: 'yaml' } : null);
  return fakeGateway({ ws, states });
}

test('updateBlueprints creates the missing exercise script, from a current blueprint', async () => {
  const gateway = importingGateway();
  await updateBlueprints(gateway, [
    { ...NO_EXERCISE, installed: BLUEPRINT_VERSION, current: true },
  ]);
  assert.deepEqual(sent(gateway, 'blueprint/save'), []);
  const saved = gateway.calls.filter(([kind]) => kind === 'save');
  assert.deepEqual(saved[0].slice(1), [
    'script/config/weekheat_exercise',
    {
      alias: 'Weekheat valve exercise',
      use_blueprint: { path: 'ekienmeier/weekheat_exercise.yaml', input: {} },
    },
  ]);
});

test('updateBlueprints saves a missing blueprint, and keeps a script that exists', async () => {
  const gateway = importingGateway(EXERCISE_STATES);
  await updateBlueprints(gateway, [NO_EXERCISE]);
  assert.equal(sent(gateway, 'blueprint/save')[0].path, 'ekienmeier/weekheat_exercise');
  assert.deepEqual(services(gateway), ['automation.reload', 'script.reload']);
  assert.equal(gateway.calls.filter(([kind]) => kind === 'save').length, 0);
});

test('triggerRooms runs only the active room automations', async () => {
  const states = { 'automation.a': { state: 'on' }, 'automation.b': { state: 'off' } };
  const gateway = fakeGateway({ states });
  await triggerRooms(gateway, ['automation.a', 'automation.b']);
  assert.deepEqual(gateway.calls[0][2].entity_id, ['automation.a']);
  await triggerRooms(fakeGateway({ states }), ['automation.b']);
});
