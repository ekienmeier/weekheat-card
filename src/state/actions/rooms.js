// Saving a room's inputs and letting rooms apply a change at once, shared by the editors.

import { triggerRooms } from '../../ha/controls.js';
import { saveRoom } from '../../ha/rooms.js';
import { publishHome } from '../loader.js';

/**
 * Admin: save changed inputs of a room, keep the saved room in the store, and publish the room
 * directory again.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {Record<string, unknown>} input the inputs that change
 * @returns {Promise<import('../../domain/room.js').Room>} the room as saved
 */
export async function commitRoom(ctx, room, input) {
  const saved = await saveRoom(ctx.gateway, room, input);
  const replace = (rooms) => rooms?.map((item) => (item.id === room.id ? saved : item));
  ctx.store.update((store) => {
    store.data.rooms = replace(store.data.rooms);
    store.data.allRooms = replace(store.data.allRooms);
  });
  await publishHome(ctx);
  return saved;
}

/**
 * Let rooms apply a change now (only the active ones run).
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room[]} [rooms] all shown rooms by default
 * @returns {Promise<unknown>}
 */
export function poke(ctx, rooms = ctx.store.data.rooms || []) {
  return triggerRooms(
    ctx.gateway,
    rooms.map((room) => room.entity),
  );
}
