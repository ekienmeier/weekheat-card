// The settings page (admin): the day settings (the day script's inputs) and the valve exercise
// (the same inputs in every room).

import { LIMITS } from '../../domain/constants.js';
import { clamp } from '../../domain/dial.js';
import { runExercise } from '../../ha/controls.js';
import { saveDayScript } from '../../ha/settings.js';
import { waitForReload } from '../../ha/wait.js';
import { editExercise, editSettings, exerciseDraft, settingsDraft } from '../drafts.js';
import { loadDayList, publishHome, scriptId } from '../loader.js';
import { attempt, flash, save } from './messages.js';
import { commitRoom, poke } from './rooms.js';

/**
 * Use a calendar for keywords, or not.
 * @param {import('../context.js').Context} ctx
 * @param {{calendar: string, on: boolean}} change
 */
export function setCalendar(ctx, { calendar, on }) {
  editSettings(ctx, (draft) => {
    const others = draft.calendars.filter((item) => item !== calendar);
    draft.calendars = on ? [...others, calendar] : others;
  });
}

/**
 * Change one of the day settings' entities: the Workday sensor, the exceptions or holiday calendar.
 * @param {import('../context.js').Context} ctx
 * @param {{workday?: string, exceptions?: string, holidays?: string}} change
 */
export function setDaySetting(ctx, change) {
  editSettings(ctx, (draft) => Object.assign(draft, change));
}

/**
 * Add an empty keyword rule.
 * @param {import('../context.js').Context} ctx
 */
export function addRule(ctx) {
  editSettings(ctx, (draft) => draft.rules.push({ keyword: '', plan: '' }));
}

/**
 * Change a keyword rule's keyword or plan ('' makes the day free).
 * @param {import('../context.js').Context} ctx
 * @param {number} index
 * @param {{keyword?: string, plan?: string}} change
 */
export function setRule(ctx, index, change) {
  editSettings(ctx, (draft) => Object.assign(draft.rules[index], change));
}

/**
 * Delete a keyword rule.
 * @param {import('../context.js').Context} ctx
 * @param {number} index
 */
export function deleteRule(ctx, index) {
  editSettings(ctx, (draft) => draft.rules.splice(index, 1));
}

/**
 * Move a keyword rule up (rules are tried in order).
 * @param {import('../context.js').Context} ctx
 * @param {number} index
 */
export function moveRuleUp(ctx, index) {
  if (index < 1) return;
  editSettings(ctx, ({ rules }) => rules.splice(index - 1, 2, rules[index], rules[index - 1]));
}

/**
 * Throw away the day settings' draft.
 * @param {import('../context.js').Context} ctx
 */
export function resetSettings(ctx) {
  ctx.store.update((store) => (store.drafts.settings = null));
}

/**
 * The day script's inputs the draft stands for; rules without a keyword are left out.
 * @param {import('../store.js').SettingsDraft} draft
 * @returns {Record<string, unknown>}
 */
function settingsInput(draft) {
  const rules = draft.rules.filter((rule) => rule.keyword.trim());
  const ruleInput = (rule) =>
    rule.plan
      ? { keyword: rule.keyword.trim(), plan: rule.plan }
      : { keyword: rule.keyword.trim() };
  const { calendars, workday, exceptions, holidays } = draft;
  return { calendars, rules: rules.map(ruleInput), workday, exceptions, holidays: holidays || '' };
}

/**
 * Save the day settings' draft as the day script's inputs, and publish the directory again (it
 * names the exceptions calendar).
 * @param {import('../context.js').Context} ctx
 * @returns {Promise<void>}
 */
async function storeSettings(ctx) {
  const input = settingsInput(settingsDraft(ctx));
  const change = { id: scriptId(ctx.config), script: ctx.store.data.script, input };
  const cfg = await saveDayScript(ctx.gateway, change);
  const exceptions = cfg.use_blueprint.input.exceptions || null;
  ctx.store.update((store) => Object.assign(store.data, { script: cfg, exceptions }));
  resetSettings(ctx);
  await publishHome(ctx);
}

/**
 * Save the day settings; once the script has reloaded, reload the day list and let the rooms
 * apply the change.
 * @param {import('../context.js').Context} ctx
 * @returns {Promise<boolean>}
 */
export function commitSettings(ctx) {
  return save(ctx, async () => {
    await storeSettings(ctx);
    await waitForReload(ctx.gateway, ctx.config.day_script);
    const days = await loadDayList(ctx);
    ctx.store.update((store) => (store.data.days = days));
    await poke(ctx);
  });
}

/**
 * Change the valve exercise's day, time or wait as chosen or typed.
 * @param {import('../context.js').Context} ctx
 * @param {{exercise_day?: string, exercise_time?: string, exercise_wait?: any}} change
 */
export function setExercise(ctx, change) {
  editExercise(ctx, (draft) => Object.assign(draft, change));
}

/**
 * Save the valve exercise's settings in every room.
 * @param {import('../context.js').Context} ctx
 * @returns {Promise<boolean>}
 */
export function commitExercise(ctx) {
  const draft = exerciseDraft(ctx);
  const { min, max, initial } = LIMITS.exercise_wait;
  const time = /^\d{1,2}:\d{2}$/.test(draft.exercise_time)
    ? `${draft.exercise_time}:00`
    : draft.exercise_time;
  const wait = clamp(Math.round(Number(draft.exercise_wait) || initial), min, max);
  const input = { exercise_day: draft.exercise_day, exercise_time: time, exercise_wait: wait };
  return save(ctx, async () => {
    for (const room of ctx.store.data.allRooms) await commitRoom(ctx, room, input);
    ctx.store.update((store) => (store.drafts.exercise = null));
  });
}

/**
 * Start the valve exercise in all active rooms now.
 * @param {import('../context.js').Context} ctx
 * @returns {Promise<void>}
 */
export async function exerciseNow(ctx) {
  if (await attempt(ctx, () => runExercise(ctx.gateway)))
    flash(ctx, { key: 'exercise_started', bad: false });
}
