// An opened room's Week view: the plan for each weekday on working days, and for free days.
// Everyone sees it; only administrators change it.

import { html, nothing } from 'lit';
import { WEEK } from '../../domain/constants.js';
import { commitWeek, resetWeek, setFreeDay, setWeekDay } from '../../state/actions/week.js';
import { isWeekDirty, weekDraft } from '../../state/drafts.js';
import { planName, texts } from '../../state/selectors.js';
import { options, saveBar } from './parts.js';

/**
 * A select of the room's plans.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {{selected: string, label: string, onChange: (plan: string) => void}} choice
 * @returns {unknown}
 */
function planSelect(ctx, room, { selected, label, onChange }) {
  const list = room.plans.map(
    (plan) => /** @type {[string, string]} */ ([plan, planName(ctx, room, plan)]),
  );
  return html`<select aria-label=${label} ?disabled=${!ctx.store.data.admin}
    @change=${(event) => onChange(event.target.value)}>${options(list, selected)}</select>`;
}

/**
 * One weekday: its short name (Saturday and Sunday marked) and its plan.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {string} day
 * @returns {unknown}
 */
function weekDay(ctx, room, day) {
  const text = texts(ctx);
  const selected = weekDraft(ctx, room).week[day] || room.plans[0];
  const onChange = (plan) => setWeekDay(ctx, room, { day, plan });
  const mark = ['sat', 'sun'].includes(day) ? html`<sup>*</sup>` : nothing;
  return html`<div class="week-day"><span>${text.wd_short[day]}${mark}</span>
    ${planSelect(ctx, room, { selected, label: text.weekdays[day], onChange })}</div>`;
}

/**
 * The Week view.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {unknown}
 */
export function weekView(ctx, room) {
  const text = texts(ctx);
  const free = {
    selected: weekDraft(ctx, room).free_day,
    label: text.free_days,
    onChange: (plan) => setFreeDay(ctx, room, plan),
  };
  const actions = { cancel: () => resetWeek(ctx, room), save: () => commitWeek(ctx, room) };
  const bar = isWeekDirty(ctx, room)
    ? saveBar([text.unsaved, text.cancel, text.save], actions)
    : nothing;
  return html`<div class="week">${WEEK.map((day) => weekDay(ctx, room, day))}</div>
    <div class="week-row free"><span>${text.free_days}</span>${planSelect(ctx, room, free)}</div>
    <div class="dim small">* ${text.only_if_working}. ${text.week_help}</div>${bar}`;
}
