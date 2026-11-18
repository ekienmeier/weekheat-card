// The Days page: the next days as the day script decides them (working or free, why, and the plan
// each room uses), today and tomorrow named; a day opens its exception form.

import { html, nothing } from 'lit';
import { dateLocale, reasonText } from '../../domain/format.js';
import { planForDay } from '../../domain/plans.js';
import { addDays } from '../../domain/time.js';
import { cancelDay, commitDay, editDay, toggleDay } from '../../state/actions/days.js';
import { allPlanNames, friendlyNames, lang, now, planName, texts } from '../../state/selectors.js';
import { actionRow, button, textField } from './parts.js';

/**
 * A day's name: today, tomorrow, or its weekday; and its date.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/plans.js').Day} day
 * @returns {unknown}
 */
function dayName(ctx, day) {
  const text = texts(ctx);
  const today = now(ctx).date;
  const names = { [today]: text.today, [addDays(today, 1)]: text.tomorrow };
  const format = new Intl.DateTimeFormat(dateLocale(lang(ctx)), {
    day: 'numeric',
    month: 'numeric',
  });
  const date = format.format(new Date(`${day.date}T12:00:00Z`));
  return html`<span class="day-date">${names[day.date] || text.wd_short[day.weekday]}
    <span class="dim">${date}</span></span>`;
}

/**
 * The plan each room uses that day: "Alle Räume: Werktag", or one per room.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/plans.js').Day} day
 * @returns {string}
 */
function plansOfDay(ctx, day) {
  const friendly = friendlyNames(ctx);
  const planOf = (room) => planName(ctx, room, planForDay(room, day, friendly));
  const each = ctx.store.data.rooms.map((room) => [room.name, planOf(room)]);
  const same = each.length > 1 && each.every(([, plan]) => plan === each[0][1]);
  if (same) return `${texts(ctx).all_rooms}: ${each[0][1]}`;
  return each.map(([room, plan]) => `${room}: ${plan}`).join(' · ');
}

/**
 * What a day can be made: as decided, a working day, a free day, or a working day with a plan.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {Array<[string, string]>} value and label
 */
function dayChoices(ctx) {
  const text = texts(ctx);
  const plans = allPlanNames(ctx).map((name) => [`plan:${name}`, `${text.plan}: ${name}`]);
  const fixed = [
    ['auto', text.as_decided],
    ['working', text.working_day],
    ['free', text.free_day],
  ];
  return /** @type {Array<[string, string]>} */ ([...fixed, ...plans]);
}

/**
 * The buttons that choose what a day is.
 * @param {import('../../state/context.js').Context} ctx
 * @param {string} picked the choice made
 * @returns {unknown[]}
 */
function dayButtons(ctx, picked) {
  const kind = (value) => ({ kind: `pick ${picked === value ? 'on' : ''}` });
  const choose = (value) => () => editDay(ctx, { pick: value });
  return dayChoices(ctx).map(([value, label]) => button(label, choose(value), kind(value)));
}

/**
 * The exception form: what the day is, a note, cancel and save.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
function dayForm(ctx) {
  const text = texts(ctx);
  const form = ctx.store.ui.dayEdit;
  const typed = (value) => editDay(ctx, { note: value });
  const note = form.pick === 'auto' ? nothing : textField(text.note, form.note, typed);
  const cancel = button(text.cancel, () => cancelDay(ctx), { kind: 'btn flat small' });
  const save = button(text.save, () => commitDay(ctx));
  const picks = html`<div class="picks">${dayButtons(ctx, form.pick)}</div>`;
  return html`<div class="panel">${picks}${note}${actionRow(cancel, save)}</div>`;
}

/**
 * One day: a button with its name, what it is and why, and the rooms' plans; its form if open.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/plans.js').Day} day
 * @returns {unknown}
 */
function dayView(ctx, day) {
  const text = texts(ctx);
  const reason = reasonText(day, text);
  const kind = `${day.free ? text.free_day : text.working_day}${day.plan ? ` · ${day.plan}` : ''}`;
  const open = ctx.store.ui.dayEdit?.date === day.date;
  const classes = `day ${day.free ? 'free' : ''} ${day.kind === 'exception' ? 'exception' : ''}`;
  return html`<div class=${classes}>
    <button class="day-row" aria-expanded=${open} @click=${() => toggleDay(ctx, day.date)}>
      ${dayName(ctx, day)}<span class="day-kind">${kind}</span>
      ${reason ? html`<span class="day-reason dim">${reason}</span>` : nothing}
      <span class="day-plans dim">${plansOfDay(ctx, day)}</span></button>
    ${open ? dayForm(ctx) : nothing}</div>`;
}

/**
 * The Days page.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
export function daysView(ctx) {
  const days = ctx.store.data.days;
  if (!days) return html`<div class="note">${texts(ctx).no_script}</div>`;
  return days.map((day) => dayView(ctx, day));
}
