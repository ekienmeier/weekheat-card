// The rules that exist both in the card and in a blueprint agree (guidelines 1.4, review M16),
// and the blueprints keep to the guidelines' size rule for templates (2.8).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import {
  EXERCISE_ALIAS,
  EXERCISE_BLUEPRINT,
  EXERCISE_SCRIPT,
  LIMITS,
  OFF_T,
  SAME_SETPOINT,
  SAME_WANTED,
  STATE_MAX,
  WEEK,
} from '../src/domain/constants.js';
import { FREE_WORDS, WORKING_WORDS } from '../src/domain/exceptions.js';
import { EXERCISE_DEFAULTS } from '../src/domain/room.js';

/** The blueprints, by name. */
const FILES = {
  room: 'blueprints/automation/weekheat_room.yaml',
  day: 'blueprints/script/weekheat_day.yaml',
  exercise: 'blueprints/script/weekheat_exercise.yaml',
};

/** YAML with Home Assistant's !input tag (read as the input's name). */
const SCHEMA = yaml.DEFAULT_SCHEMA.extend([
  new yaml.Type('!input', { kind: 'scalar', construct: (name) => ({ input: name }) }),
]);

/**
 * A blueprint's text.
 * @param {string} name "room", "day" or "exercise"
 * @returns {string}
 */
function source(name) {
  return readFileSync(new URL(`../${FILES[name]}`, import.meta.url), 'utf8');
}

/**
 * A blueprint, parsed.
 * @param {string} name "room", "day" or "exercise"
 * @returns {any}
 */
function blueprint(name) {
  return yaml.load(source(name), { schema: SCHEMA });
}

test('the room blueprint uses the card’s Off setpoint and tolerances', () => {
  const { variables } = blueprint('room');
  assert.equal(variables.off_temp, OFF_T);
  assert.equal(variables.same_setpoint, SAME_SETPOINT);
  assert.equal(variables.same_wanted, SAME_WANTED);
  assert.match(variables.state_max, new RegExp(`int\\(${STATE_MAX}\\)`));
});

test('the room blueprint’s fingerprint has at most the 6 digits that stateSize counts (L8)', () => {
  const { variables } = blueprint('room');
  const modulus = Number(variables.th_print.match(/\) % (\d+) -%\}/)[1]);
  assert.ok(modulus <= 10 ** 6, String(modulus));
});

test('the valve exercise script and the room blueprint use the same setpoint tolerance', () => {
  assert.equal(blueprint('exercise').variables.same_setpoint, SAME_SETPOINT);
});

test('the room blueprint calls the card’s valve exercise script by default', () => {
  const { input } = blueprint('room').blueprint;
  assert.equal(input.exercise_script.default, EXERCISE_SCRIPT);
  const { blueprint: meta } = blueprint('exercise');
  assert.equal(meta.name, EXERCISE_ALIAS);
  assert.ok(FILES.exercise.endsWith(EXERCISE_BLUEPRINT));
});

test('the room blueprint’s input limits are the card’s', () => {
  const { input } = blueprint('room').blueprint;
  for (const [key, limit] of Object.entries(LIMITS)) {
    const number = input[key].selector.number;
    assert.equal(number.min, limit.min, `${key} min`);
    assert.equal(number.max, limit.max, `${key} max`);
    assert.equal(input[key].default, limit.initial, `${key} default`);
    if (limit.step) assert.equal(number.step, limit.step, `${key} step`);
  }
});

test('the valve exercise’s defaults are the card’s', () => {
  const { input } = blueprint('room').blueprint;
  for (const [key, value] of Object.entries(EXERCISE_DEFAULTS))
    assert.equal(input[key].default, value, key);
});

test('the day script reads exceptions with the card’s words; both use the same weekdays', () => {
  const day = blueprint('day').variables;
  assert.deepEqual(day.working_words, WORKING_WORDS);
  assert.deepEqual(day.free_words, FREE_WORDS);
  assert.deepEqual(day.weekdays, WEEK);
  assert.deepEqual(blueprint('room').variables.weekdays, WEEK);
});

/**
 * The templates of a blueprint's text that are block scalars (descriptions left out), with their
 * line numbers and lengths in lines.
 * @param {string} text
 * @returns {Array<{line: number, key: string, lines: number}>}
 */
function blockTemplates(text) {
  const lines = text.split('\n');
  const indent = (line) => line.length - line.trimStart().length;
  const blocks = [];
  lines.forEach((line, i) => {
    const key = line.match(/^\s*([\w-]+): [>|]-?$/)?.[1];
    if (!key || key === 'description') return;
    const body = lines.slice(i + 1);
    const end = body.findIndex((next) => next.trim() && indent(next) <= indent(line));
    const count = body.slice(0, end < 0 ? body.length : end).filter((next) => next.trim()).length;
    blocks.push({ line: i + 1, key, lines: count });
  });
  return blocks;
}

test('every template of the blueprints has at most 15 lines', () => {
  for (const name of Object.keys(FILES)) {
    const long = blockTemplates(source(name)).filter((block) => block.lines > 15);
    assert.deepEqual(long, [], `${FILES[name]}: templates over 15 lines`);
  }
});
