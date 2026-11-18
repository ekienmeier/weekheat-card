// Admin actions of the whole home: adding a room, and updating the blueprints.

import { updateBlueprints } from '../../ha/blueprints.js';
import { addRoom } from '../../ha/rooms-admin.js';
import { load } from '../loader.js';
import { exerciseSettings, lang, texts } from '../selectors.js';
import { flash, save } from './messages.js';

/**
 * Change the new room's name as typed.
 * @param {import('../context.js').Context} ctx
 * @param {string} name
 */
export function setNewRoomName(ctx, name) {
  ctx.store.update(({ ui }) => (ui.addRoom.name = name));
}

/**
 * What a new room is made from: the form, the texts for its plans and switch, and the inputs
 * every room gets.
 * @param {import('../context.js').Context} ctx
 * @returns {import('../../ha/rooms-admin.js').NewRoom}
 */
function newRoom(ctx) {
  const text = texts(ctx);
  const { name, thermostats } = ctx.store.ui.addRoom;
  const defaults = {
    day_script: ctx.config.day_script,
    language: lang(ctx),
    ...exerciseSettings(ctx),
  };
  const planNames = { working: text.working_day, free: text.free_day };
  const { allRooms: rooms, roomBlueprint: blueprint } = ctx.store.data;
  const base = { name: name.trim(), thermostats, planNames, rooms, blueprint, defaults };
  return { ...base, switchName: `Weekheat ${name.trim()} ${text.heating_l}` };
}

/**
 * Add the room of the new-room form (it needs a name and a thermostat); it starts paused.
 * @param {import('../context.js').Context} ctx
 * @returns {Promise<boolean>}
 */
export async function commitNewRoom(ctx) {
  const form = ctx.store.ui.addRoom;
  if (!form.name.trim() || !form.thermostats.length) return false;
  const done = await save(ctx, () => addRoom(ctx.gateway, newRoom(ctx)));
  if (!done) return false;
  ctx.store.update(({ ui }) => Object.assign(ui, { addRoom: null, settingsPart: null }));
  flash(ctx, { key: 'new_room_paused', bad: false });
  await load(ctx);
  return true;
}

/**
 * Update the old blueprints to this card's release, then reload.
 * @param {import('../context.js').Context} ctx
 * @returns {Promise<boolean>}
 */
export async function updateOldBlueprints(ctx) {
  const done = await save(ctx, () => updateBlueprints(ctx.gateway, ctx.store.data.oldBlueprints));
  if (done) await load(ctx);
  return done;
}
