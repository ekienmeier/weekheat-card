// The day list: setting a day's exception (a working day, a free day, a plan, or as decided).

import { setException } from '../../ha/days.js';
import { loadDayList } from '../loader.js';
import { lang, now } from '../selectors.js';
import { save } from './messages.js';
import { poke } from './rooms.js';

/**
 * The exception form for a day, filled in with its exception if it has one.
 * @param {import('../context.js').Context} ctx
 * @param {string} date
 * @returns {{date: string, pick: string, note: string}}
 */
function dayForm(ctx, date) {
  const day = (ctx.store.data.days || []).find((item) => item.date === date);
  if (day?.kind !== 'exception') return { date, pick: 'auto', note: '' };
  const kind = day.free ? 'free' : 'working';
  return { date, pick: day.plan ? `plan:${day.plan}` : kind, note: day.note || '' };
}

/**
 * Open a day's exception form, or close it.
 * @param {import('../context.js').Context} ctx
 * @param {string} date
 */
export function toggleDay(ctx, date) {
  ctx.store.update(
    ({ ui }) => (ui.dayEdit = ui.dayEdit?.date === date ? null : dayForm(ctx, date)),
  );
}

/**
 * Change the exception form: what the day is ("auto", "working", "free" or "plan:<name>"), or
 * its note.
 * @param {import('../context.js').Context} ctx
 * @param {{pick?: string, note?: string}} change
 */
export function editDay(ctx, change) {
  ctx.store.update(({ ui }) => Object.assign(ui.dayEdit, change));
}

/**
 * Close the exception form.
 * @param {import('../context.js').Context} ctx
 */
export function cancelDay(ctx) {
  ctx.store.update(({ ui }) => (ui.dayEdit = null));
}

/**
 * The exception the form stands for (null: as the rules decide).
 * @param {{pick: string, note: string}} form
 * @returns {import('../../domain/exceptions.js').Exception | null}
 */
function exceptionOf({ pick, note }) {
  const kinds = { working: { free: false }, free: { free: true } };
  const exception = pick.startsWith('plan:') ? { plan: pick.slice(5) } : kinds[pick] || null;
  return exception && note.trim() ? { ...exception, note: note.trim() } : exception;
}

/**
 * Reload the day list, with the exception form closed.
 * @param {import('../context.js').Context} ctx
 * @returns {Promise<void>}
 */
async function reloadDays(ctx) {
  const days = await loadDayList(ctx);
  ctx.store.update(({ ui, data }) => {
    ui.dayEdit = null;
    data.days = days;
  });
}

/**
 * Save the day's exception, reload the day list, and for today let the rooms apply it.
 * @param {import('../context.js').Context} ctx
 * @returns {Promise<boolean>}
 */
export function commitDay(ctx) {
  const form = ctx.store.ui.dayEdit;
  const calendar = ctx.store.data.exceptions;
  const change = { calendar, date: form.date, exception: exceptionOf(form), lang: lang(ctx) };
  return save(ctx, async () => {
    await setException(ctx.gateway, change);
    await reloadDays(ctx);
    if (form.date === now(ctx).date) await poke(ctx);
  });
}
