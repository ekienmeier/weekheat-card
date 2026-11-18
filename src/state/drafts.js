// The editors' drafts: one per plan, per room's week, per room's setup, and one each for the day
// settings and the valve exercise (review M1). A draft is made on the first edit, not while
// rendering (M15); until then, readers get the saved values.

import { LIMITS, WEEK } from '../domain/constants.js';
import { asList } from '../domain/room.js';
import { exerciseSettings, planName } from './selectors.js';

/**
 * A copy of plain data (drafts must never share arrays or objects with what was loaded).
 * @template T
 * @param {T} value
 * @returns {T}
 */
function copy(value) {
  return structuredClone(value);
}

/**
 * A plan as saved, in the form of its draft.
 * @param {import('./context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @param {string} entity the plan
 * @returns {import('./store.js').PlanDraft}
 */
function savedPlan(ctx, room, entity) {
  const periods = ctx.store.data.plans[entity]?.periods || [];
  return { name: planName(ctx, room, entity), periods: copy(periods) };
}

/**
 * A plan as the editor shows it: its draft, else as saved.
 * @param {import('./context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @param {string} entity the plan
 * @returns {import('./store.js').PlanDraft}
 */
export function planDraft(ctx, room, entity) {
  return ctx.store.drafts.plans[entity] || savedPlan(ctx, room, entity);
}

/**
 * Does a plan's draft differ from what is saved?
 * @param {import('./context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @param {string} entity the plan
 * @returns {boolean}
 */
export function isPlanDirty(ctx, room, entity) {
  const draft = ctx.store.drafts.plans[entity];
  if (!draft) return false;
  const saved = savedPlan(ctx, room, entity);
  const shape = (periods) =>
    JSON.stringify(
      periods.map((period) => [period.start, period.off ? 'off' : period.temperature]),
    );
  return draft.name !== saved.name || shape(draft.periods) !== shape(saved.periods);
}

/**
 * Change a plan's draft, making it from the saved plan first.
 * @param {import('./context.js').Context} ctx
 * @param {{room: import('../domain/room.js').Room, entity: string}} plan
 * @param {(draft: import('./store.js').PlanDraft) => void} change
 */
export function editPlan(ctx, { room, entity }, change) {
  ctx.store.update((store) => {
    store.drafts.plans[entity] ||= savedPlan(ctx, room, entity);
    change(store.drafts.plans[entity]);
  });
}

/**
 * A room's week as the editor shows it: its draft, else as saved.
 * @param {import('./context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @returns {import('./store.js').WeekDraft}
 */
export function weekDraft(ctx, room) {
  return ctx.store.drafts.weeks[room.id] || { week: { ...room.week }, free_day: room.free_day };
}

/**
 * Does a room's week draft differ from what is saved? A day without a plan uses the first plan.
 * @param {import('./context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @returns {boolean}
 */
export function isWeekDirty(ctx, room) {
  const draft = ctx.store.drafts.weeks[room.id];
  if (!draft) return false;
  const planOn = (week, day) => week[day] || room.plans[0];
  const changed = WEEK.some((day) => planOn(draft.week, day) !== planOn(room.week, day));
  return changed || draft.free_day !== room.free_day;
}

/**
 * Change a room's week draft.
 * @param {import('./context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @param {(draft: import('./store.js').WeekDraft) => void} change
 */
export function editWeek(ctx, room, change) {
  ctx.store.update((store) => {
    store.drafts.weeks[room.id] ||= copy(weekDraft(ctx, room));
    change(store.drafts.weeks[room.id]);
  });
}

/**
 * A room's setup as the editor shows it: its draft, else as saved.
 * @param {import('./context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @returns {import('./store.js').SetupDraft}
 */
export function setupDraft(ctx, room) {
  const saved = {
    name: room.name,
    thermostats: [...room.thermostats],
    windows: [...(room.windows || [])],
    window_delay: room.window_delay ?? LIMITS.window_delay.initial,
    room_sensor: room.room_sensor || '',
    room_margin: room.room_margin ?? LIMITS.room_margin.initial,
  };
  return ctx.store.drafts.setups[room.id] || saved;
}

/**
 * Change a room's setup draft.
 * @param {import('./context.js').Context} ctx
 * @param {import('../domain/room.js').Room} room
 * @param {(draft: import('./store.js').SetupDraft) => void} change
 */
export function editSetup(ctx, room, change) {
  ctx.store.update((store) => {
    store.drafts.setups[room.id] ||= copy(setupDraft(ctx, room));
    change(store.drafts.setups[room.id]);
  });
}

/**
 * The keyword rules of the day script's inputs, in the form of the editor (a rule may be stored as
 * only its keyword).
 * @param {Array<string | {keyword?: string, plan?: string}>} rules
 * @returns {Array<{keyword: string, plan: string}>}
 */
function editableRules(rules) {
  const rule = (item) => (typeof item === 'string' ? { keyword: item } : item);
  return rules.map(rule).map((item) => ({ keyword: item.keyword || '', plan: item.plan || '' }));
}

/**
 * The day settings as the editor shows them: their draft, else the day script's inputs.
 * @param {import('./context.js').Context} ctx
 * @returns {import('./store.js').SettingsDraft}
 */
export function settingsDraft(ctx) {
  if (ctx.store.drafts.settings) return ctx.store.drafts.settings;
  const input = ctx.store.data.script?.use_blueprint?.input || {};
  return {
    calendars: [...asList(input.calendars)],
    rules: editableRules(input.rules || []),
    workday: input.workday || '',
    exceptions: input.exceptions || '',
    holidays: input.holidays || '',
  };
}

/**
 * Change the day settings' draft.
 * @param {import('./context.js').Context} ctx
 * @param {(draft: import('./store.js').SettingsDraft) => void} change
 */
export function editSettings(ctx, change) {
  ctx.store.update((store) => {
    store.drafts.settings ||= copy(settingsDraft(ctx));
    change(store.drafts.settings);
  });
}

/**
 * @typedef {{exercise_day: string, exercise_time: string, exercise_wait: number}} ExerciseDraft
 */

/**
 * The valve exercise's settings as the editor shows them.
 * @param {import('./context.js').Context} ctx
 * @returns {ExerciseDraft}
 */
export function exerciseDraft(ctx) {
  return ctx.store.drafts.exercise || exerciseSettings(ctx);
}

/**
 * Change the valve exercise's draft.
 * @param {import('./context.js').Context} ctx
 * @param {(draft: ExerciseDraft) => void} change
 */
export function editExercise(ctx, change) {
  ctx.store.update((store) => {
    store.drafts.exercise ||= copy(exerciseDraft(ctx));
    change(store.drafts.exercise);
  });
}
