// A room's Setup view (admin): its name, thermostats, windows and doors, room sensor, and the
// entity search that adds them. The same search adds thermostats to a new room (room id '').

import { LIMITS } from '../../domain/constants.js';
import { clamp } from '../../domain/dial.js';
import { editSetup, setupDraft } from '../drafts.js';
import { save } from './messages.js';
import { commitRoom, poke } from './rooms.js';

/**
 * Open an entity search, or close it.
 * @param {import('../context.js').Context} ctx
 * @param {{room: string, kind: import('../../domain/picker.js').PickKind}} picker
 */
export function togglePicker(ctx, { room, kind }) {
  ctx.store.update(({ ui }) => {
    const same = ui.picker?.room === room && ui.picker.kind === kind;
    ui.picker = same ? null : { room, kind, query: '' };
  });
}

/**
 * Change what is searched for (opening the search if it is not).
 * @param {import('../context.js').Context} ctx
 * @param {import('../store.js').Picker} picker
 */
export function searchEntities(ctx, picker) {
  ctx.store.update(({ ui }) => (ui.picker = { ...picker }));
}

/**
 * Add an entity a search found, and close the search.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room | null} room null for a new room
 * @param {{kind: import('../../domain/picker.js').PickKind, entity: string}} pick
 */
export function pick(ctx, room, { kind, entity }) {
  if (!room) {
    ctx.store.update(
      ({ ui }) => (ui.addRoom.thermostats = [...new Set([...ui.addRoom.thermostats, entity])]),
    );
  } else {
    editSetup(ctx, room, (draft) => {
      if (kind === 'rs') draft.room_sensor = entity;
      else if (kind === 'th') draft.thermostats = [...new Set([...draft.thermostats, entity])];
      else draft.windows = [...new Set([...draft.windows, entity])];
    });
  }
  ctx.store.update(({ ui }) => (ui.picker = null));
}

/**
 * Remove an entity from a room (or a new room).
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room | null} room null for a new room
 * @param {{kind: import('../../domain/picker.js').PickKind, entity: string}} pick
 */
export function unpick(ctx, room, { kind, entity }) {
  const without = (list) => list.filter((item) => item !== entity);
  if (!room) {
    ctx.store.update(({ ui }) => (ui.addRoom.thermostats = without(ui.addRoom.thermostats)));
    return;
  }
  editSetup(ctx, room, (draft) => {
    if (kind === 'rs') draft.room_sensor = '';
    else if (kind === 'th') draft.thermostats = without(draft.thermostats);
    else draft.windows = without(draft.windows);
  });
}

/**
 * A room margin as typed (perhaps with a decimal comma), as a number within its limits.
 * @param {number | string} value
 * @returns {number}
 */
function marginOf(value) {
  const { min, max, initial } = LIMITS.room_margin;
  const typed = Number(String(value).replace(',', '.')) || initial;
  return clamp(Math.round(typed * 10) / 10, min, max);
}

/**
 * Change the room margin by some steps of 0.1 °C.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {number} steps
 */
export function stepMargin(ctx, room, steps) {
  editSetup(ctx, room, (draft) => {
    draft.room_margin = marginOf(marginOf(draft.room_margin) + steps * LIMITS.room_margin.step);
  });
}

/**
 * Change the name or the window delay as typed.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {{name?: string, window_delay?: string}} change
 */
export function setSetup(ctx, room, change) {
  editSetup(ctx, room, (draft) => Object.assign(draft, change));
}

/**
 * The blueprint inputs a room's setup draft stands for, with numbers within their limits.
 * @param {import('../store.js').SetupDraft} draft
 * @returns {Record<string, unknown>}
 */
function setupInput(draft) {
  const { min, max } = LIMITS.window_delay;
  return {
    room_name: draft.name.trim(),
    thermostats: draft.thermostats,
    windows: draft.windows,
    window_delay: clamp(Math.round(Number(draft.window_delay) || 0), min, max),
    room_sensor: draft.room_sensor || [],
    room_margin: marginOf(draft.room_margin),
  };
}

/**
 * Save a room's setup (it needs a name and a thermostat), then let the room apply it.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {Promise<boolean>}
 */
export function commitSetup(ctx, room) {
  const draft = setupDraft(ctx, room);
  if (!draft.name.trim() || !draft.thermostats.length) return Promise.resolve(false);
  return save(ctx, async () => {
    const saved = await commitRoom(ctx, room, setupInput(draft));
    ctx.store.update((store) => delete store.drafts.setups[room.id]);
    await poke(ctx, [saved]);
  });
}
