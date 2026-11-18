// Tests of the card class with a fake Home Assistant: what it reads, writes and publishes.
// Regression tests for the defects fixed in 0.12.1 (docs/review-2026-11-18.md, H3 and H4).
import test from 'node:test';
import assert from 'node:assert/strict';
import { WeekheatCard, BLUEPRINT_VERSION } from '../weekheat-card.js';

/** The path of the room blueprint as `blueprint/list` reports it. */
const ROOM_PATH = 'ekienmeier/weekheat_room.yaml';

/**
 * A state object for an automation made in the UI.
 * @param {string} id the automation's config id
 * @returns {object}
 */
function automation(id) {
  return { entity_id: `automation.${id}`, state: 'on', attributes: { id } };
}

/**
 * An automation configuration made from the room blueprint.
 * @param {string} name the room's name
 * @returns {object}
 */
function roomConfig(name) {
  const input = { room_name: name, thermostats: [`climate.${name}`], plans: [], state: 'input_text.x' };
  return { alias: `Weekheat ${name}`, use_blueprint: { path: ROOM_PATH, input } };
}

/**
 * Answers to the WebSocket commands the card sends while loading.
 * @param {object} msg the command
 * @returns {unknown}
 */
function loadAnswer(msg) {
  const marked = { metadata: { description: `Weekheat ${BLUEPRINT_VERSION}` } };
  const answers = {
    'blueprint/list': { [msg.domain === 'script' ? 'ekienmeier/weekheat_day.yaml' : ROOM_PATH]: marked },
    'frontend/get_system_data': { value: null },
    'schedule/list': [],
    'config/entity_registry/list': [],
    call_service: { response: { days: [] } },
  };
  return answers[msg.type] ?? null;
}

/**
 * A fake `hass` for an administrator. `api` answers callApi (a value, or a function that may throw);
 * `ws` answers callWS before the load answers. Every call is recorded in `calls`.
 * @param {{states?: object, api?: Record<string, unknown>, ws?: (msg: object) => unknown}} setup
 * @returns {object}
 */
function fakeHass({ states = {}, api = {}, ws = () => undefined }) {
  const calls = [];
  const notFound = { error: 'Response error: 404', status_code: 404, body: { message: 'Resource not found' } };
  return {
    calls,
    states,
    user: { is_admin: true },
    config: { time_zone: 'Europe/Vienna' },
    connection: { subscribeMessage: () => Promise.resolve(() => {}) },
    async callApi(method, path, body) {
      calls.push({ api: `${method} ${path}`, body });
      const answer = api[`${method} ${path}`];
      if (answer === undefined) throw notFound;
      return typeof answer === 'function' ? answer() : answer;
    },
    async callWS(msg) {
      calls.push({ ws: msg.type, msg });
      return ws(msg) ?? loadAnswer(msg);
    },
    async callService(domain, service, data) {
      calls.push({ service: `${domain}.${service}`, data });
    },
  };
}

/**
 * A card that renders nothing (there is no DOM in Node), for an administrator.
 * @param {object} hass a fake from fakeHass
 * @returns {WeekheatCard}
 */
function cardWith(hass) {
  const card = new WeekheatCard();
  Object.assign(card, { _hass: hass, _lang: 'en', _admin: true, _render: () => {}, _flash: () => {} });
  card._config = { days: 14, day_script: 'script.weekheat_day' };
  return card;
}

const published = (hass) => hass.calls.filter((c) => c.ws === 'frontend/set_system_data');

test('a room whose configuration cannot be read is not dropped from the directory (H4)', async () => {
  const hass = fakeHass({
    states: { a: automation('weekheat_a'), b: automation('weekheat_b') },
    api: {
      'GET config/automation/config/weekheat_a': roomConfig('a'),
      'GET config/automation/config/weekheat_b': () => {
        throw { error: 'Response error: 500', status_code: 500, body: { message: 'Busy' } };
      },
    },
  });
  const card = cardWith(hass);
  await card._load();
  assert.equal(published(hass).length, 0, 'nothing may be published after a failed read');
  assert.equal(card._error, 'Busy');
});

test('an automation without a configuration of its own is skipped, the rest is published (H4)', async () => {
  const hass = fakeHass({
    states: { a: automation('weekheat_a'), y: automation('from_yaml') },
    api: { 'GET config/automation/config/weekheat_a': roomConfig('a') },
  });
  const card = cardWith(hass);
  await card._load();
  assert.equal(card._error, null);
  const [{ msg }] = published(hass);
  assert.deepEqual(msg.value.rooms.map((r) => r.id), ['weekheat_a']);
  assert.equal(msg.value.script, false);
});

test('a failed read of the day script stops the load instead of publishing "no script" (H4)', async () => {
  const hass = fakeHass({
    api: {
      'GET config/script/config/weekheat_day': () => {
        throw { error: 'Request error', status_code: undefined };
      },
    },
  });
  const card = cardWith(hass);
  await card._load();
  assert.equal(published(hass).length, 0);
  assert.equal(card._error, 'Request error');
});

/**
 * A fake `hass` that lets a room be created: helpers and plans get ids, their entities appear.
 * @param {object} api extra callApi answers
 * @returns {object}
 */
function creatingHass(api = {}) {
  let n = 0;
  const states = {};
  const registry = [];
  const ws = (msg) => {
    if (msg.type === 'schedule/create') {
      const id = `plan${++n}`;
      registry.push({ platform: 'schedule', unique_id: id, entity_id: `schedule.weekheat_bad_${id}` });
      return { id, name: msg.name, monday: msg.monday };
    }
    if (msg.type === 'config/entity_registry/list') return registry;
    if (msg.type === 'input_text/create') return { id: 'weekheat_bad_state' };
    if (msg.type !== 'input_boolean/create') return undefined;
    states['input_boolean.weekheat_bad_heating'] = { state: 'on', attributes: {} };
    return { id: 'weekheat_bad_heating' };
  };
  return fakeHass({ states, api, ws });
}

const madeHelpers = (hass) => hass.calls.filter((c) => /\/create$/.test(c.ws ?? '')).length;

test('Add room refuses the id of a room the card does not show (H3)', async () => {
  const hass = creatingHass();
  const card = cardWith(hass);
  Object.assign(card, { _roomBlueprint: ROOM_PATH, _rooms: [], _allRooms: [{ id: 'weekheat_bad' }] });
  await assert.rejects(card._addRoom('Bad', ['climate.bad']), /automation weekheat_bad/);
  assert.equal(madeHelpers(hass), 0);
  assert.ok(!hass.calls.some((c) => c.api?.startsWith('POST')));
});

test('Add room refuses an id that any automation has, and a name without letters (H3)', async () => {
  const hass = creatingHass({ 'GET config/automation/config/weekheat_bad': { alias: 'Other' } });
  const card = cardWith(hass);
  Object.assign(card, { _roomBlueprint: ROOM_PATH, _rooms: [], _allRooms: [] });
  await assert.rejects(card._addRoom('Bad!', ['climate.bad']), /exists already/);
  await assert.rejects(card._addRoom('!!!', ['climate.bad']), /letter or digit/);
  assert.equal(madeHelpers(hass), 0);
});

test('Add room deletes what it made when saving the automation fails (H3)', async () => {
  const hass = creatingHass({
    'POST config/automation/config/weekheat_bad': () => {
      throw { error: 'Response error: 400', status_code: 400, body: { message: 'Invalid' } };
    },
    'DELETE config/automation/config/weekheat_bad': {},
  });
  const card = cardWith(hass);
  Object.assign(card, { _roomBlueprint: ROOM_PATH, _rooms: [], _allRooms: [], _plans: {} });
  await assert.rejects(card._addRoom('Bad', ['climate.bad']));
  const deleted = hass.calls.filter((c) => /\/delete$/.test(c.ws ?? '')).map((c) => c.ws);
  assert.deepEqual(deleted, ['input_boolean/delete', 'input_text/delete', 'schedule/delete', 'schedule/delete']);
  assert.deepEqual(card._plans, {});
});

test('Add room refuses more thermostats than the state helper can hold (H1)', async () => {
  const hass = creatingHass();
  const card = cardWith(hass);
  Object.assign(card, { _roomBlueprint: ROOM_PATH, _rooms: [], _allRooms: [] });
  const many = Array.from({ length: 6 }, (_, i) => `climate.wohnzimmer_thermostat_nummer_${i}`);
  await assert.rejects(card._addRoom('Bad', many), /Too many thermostats/);
  assert.equal(madeHelpers(hass), 0);
});
