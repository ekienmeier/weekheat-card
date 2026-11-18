// Tests of src/ha/plans.js, blueprints.js and controls.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlan, loadPlans } from '../../src/ha/plans.js';
import { blueprintStatus } from '../../src/ha/blueprints.js';
import { triggerRooms } from '../../src/ha/controls.js';
import { BLUEPRINT_VERSION } from '../../src/version.js';
import { fakeGateway, sent } from './fake-gateway.mjs';

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

test('blueprintStatus lists the blueprints older than the card needs', async () => {
  const marked = (version) => ({ metadata: { description: `… Weekheat ${version}` } });
  const lists = {
    automation: { 'ekienmeier/weekheat_room.yaml': marked('0.9.0') },
    script: { 'ekienmeier/weekheat_day.yaml': marked(BLUEPRINT_VERSION) },
  };
  const { old } = await blueprintStatus(fakeGateway({ ws: (message) => lists[message.domain] }));
  const room = {
    domain: 'automation',
    path: 'ekienmeier/weekheat_room.yaml',
    file: 'weekheat_room.yaml',
  };
  assert.deepEqual(old, [{ ...room, installed: '0.9.0' }]);
});

test('triggerRooms runs only the active room automations', async () => {
  const states = { 'automation.a': { state: 'on' }, 'automation.b': { state: 'off' } };
  const gateway = fakeGateway({ states });
  await triggerRooms(gateway, ['automation.a', 'automation.b']);
  assert.deepEqual(gateway.calls[0][2].entity_id, ['automation.a']);
  await triggerRooms(fakeGateway({ states }), ['automation.b']);
});
