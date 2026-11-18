// Tests of src/state/loader.js: what a load shows, and that only the newest load counts (L11).
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, orderRooms } from '../../src/state/loader.js';
import { contextWith } from './fake-context.mjs';

/**
 * The names of the rooms a context shows.
 * @param {any} ctx
 * @returns {string[]}
 */
function shown(ctx) {
  return ctx.store.data.rooms.map((room) => room.name);
}

/**
 * A published directory with one room.
 * @param {string} name the room's
 * @returns {object}
 */
function directoryWith(name) {
  const room = { id: name, name, entity: `automation.${name}`, plans: [] };
  return { v: 1, script: true, exceptions: 'calendar.x', rooms: [room] };
}

/**
 * A context for a user without admin rights; the directory comes from `directory()`.
 * @param {() => any} directory
 * @returns {any}
 */
function userWith(directory) {
  const system = async () => ({ value: await directory() });
  const ws = (message) => (message.type === 'frontend/get_system_data' ? system() : []);
  const { ctx } = contextWith({ ws });
  ctx.gateway.isAdmin = false;
  ctx.gateway.runScript = async () => ({ days: [] });
  return ctx;
}

test('rooms show in the order of the rooms option, else by name', () => {
  const rooms = [
    { name: 'Wohnzimmer', id: 'w', entity: 'automation.w' },
    { name: 'Bad', id: 'b', entity: 'automation.b' },
  ];
  assert.deepEqual(
    orderRooms(rooms, undefined).map((room) => room.id),
    ['b', 'w'],
  );
  assert.deepEqual(
    orderRooms(rooms, ['automation.w', 'b', 'gone']).map((room) => room.id),
    ['w', 'b'],
  );
});

test('without admin rights and without a directory: the note, not an error', async () => {
  const ctx = userWith(() => null);
  await load(ctx);
  assert.equal(ctx.store.data.noDirectory, true);
  assert.equal(ctx.store.data.error, null);
});

test('a user without admin rights gets the rooms from the directory', async () => {
  const ctx = userWith(() => directoryWith('Bad'));
  await load(ctx);
  assert.deepEqual(shown(ctx), ['Bad']);
  assert.equal(ctx.store.data.exceptions, 'calendar.x');
  assert.deepEqual(ctx.store.data.days, []);
});

test('an older load that ends last does not overwrite a newer one (L11)', async () => {
  let release;
  const slow = new Promise((resolve) => (release = resolve));
  let calls = 0;
  const later = () => slow.then(() => directoryWith('old'));
  const ctx = userWith(() => (++calls === 1 ? later() : directoryWith('new')));
  const first = load(ctx);
  await load(ctx);
  release();
  await first;
  assert.deepEqual(shown(ctx), ['new']);
});
