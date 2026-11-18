// The Week view's editor (admin): the plan for each weekday and for free days.

import { editWeek, weekDraft } from '../drafts.js';
import { save } from './messages.js';
import { commitRoom, poke } from './rooms.js';

/**
 * Choose the plan of a weekday.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {{day: string, plan: string}} change
 */
export function setWeekDay(ctx, room, { day, plan }) {
  editWeek(ctx, room, (draft) => (draft.week[day] = plan));
}

/**
 * Choose the plan of free days.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {string} plan
 */
export function setFreeDay(ctx, room, plan) {
  editWeek(ctx, room, (draft) => (draft.free_day = plan));
}

/**
 * Throw away the week's draft.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 */
export function resetWeek(ctx, room) {
  ctx.store.update((store) => delete store.drafts.weeks[room.id]);
}

/**
 * Save the week, then let the room apply it.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {Promise<boolean>}
 */
export function commitWeek(ctx, room) {
  const { week, free_day } = weekDraft(ctx, room);
  return save(ctx, async () => {
    const saved = await commitRoom(ctx, room, { week, free_day });
    resetWeek(ctx, room);
    await poke(ctx, [saved]);
  });
}
