// Tests of the release numbers: the card and the blueprints it needs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BLUEPRINT_VERSION, VERSION } from '../src/version.js';
import { blueprintVersion, olderVersion } from '../src/domain/versions.js';

test('the card never expects blueprints newer than itself', () => {
  assert.ok(!olderVersion(VERSION, BLUEPRINT_VERSION));
});

test('the blueprints carry the version the card expects', async () => {
  for (const file of [
    'blueprints/automation/weekheat_room.yaml',
    'blueprints/script/weekheat_day.yaml',
    'blueprints/script/weekheat_exercise.yaml',
  ]) {
    const yaml = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.equal(blueprintVersion(yaml.split('\n  domain:')[0]), BLUEPRINT_VERSION, file);
  }
});

test('the room blueprint no longer stores a timestamp per thermostat (review H1)', async () => {
  const url = new URL('../blueprints/automation/weekheat_room.yaml', import.meta.url);
  assert.ok(!/\bstamp\b/.test(await readFile(url, 'utf8')), 'the room blueprint mentions stamp');
});
