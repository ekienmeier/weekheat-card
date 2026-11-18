// An opened room's Plan view: one chip per plan (today's marked, unsaved ones marked), the plan
// chosen as a day chart and a period list, and for administrators the editor and the new-plan form.

import { html, nothing } from 'lit';
import { MAX_T, MIN_T, WEEK } from '../../domain/constants.js';
import { checkPeriods } from '../../domain/periods.js';
import { fill } from '../../i18n/text.js';
import {
  addPeriod,
  addPlan,
  commitPlan,
  removePlan,
  renamePlan,
  resetPlan,
  setAddPlan,
  toggleAddPlan,
} from '../../state/actions/plan-editor.js';
import { confirmed } from '../../state/actions/confirm.js';
import { selectPlan } from '../../state/actions/navigation.js';
import { isPlanDirty, planDraft } from '../../state/drafts.js';
import { now, planName, texts } from '../../state/selectors.js';
import { chartView } from './chart.js';
import { periodList } from './plan-periods.js';
import { actionRow, button, saveBar, selectField, textField } from './parts.js';

/**
 * The plan to show: the one chosen, else today's, else the first.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {import('../../domain/room-status.js').RoomStatus} status
 * @returns {string | undefined}
 */
function shownPlan(ctx, room, status) {
  const plans = room.plans.filter((plan) => ctx.store.data.plans[plan]);
  const chosen = ctx.store.ui.plan[room.id];
  if (plans.includes(chosen)) return chosen;
  return plans.includes(status.plan) ? status.plan : plans[0];
}

/**
 * The plan chips, and for administrators the + that opens the new-plan form.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {{shown: string, today: string}} plans the plan shown, and today's
 * @returns {unknown}
 */
function planChips(ctx, room, { shown, today }) {
  const adding = ctx.store.ui.addPlan?.room === room.id;
  const chip = (plan) => {
    const on = plan === shown && !adding ? 'on' : '';
    const dirty = isPlanDirty(ctx, room, plan) ? 'dirty' : '';
    const name = `${planDraft(ctx, room, plan).name}${plan === today ? ' •' : ''}`;
    return button(name, () => selectPlan(ctx, room.id, plan), { kind: `pick ${on} ${dirty}` });
  };
  const kind = `pick add ${adding ? 'on' : ''}`;
  const add = button('+', () => toggleAddPlan(ctx, room), { kind, aria: texts(ctx).add_plan });
  const plans = room.plans.filter((plan) => ctx.store.data.plans[plan]);
  return html`<div class="picks">${plans.map(chip)}${ctx.store.data.admin ? add : nothing}</div>`;
}

/**
 * The templates a new plan can start from: the starter plans, and every room's plans.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {Array<[string, string]>} value and label
 */
function templates(ctx) {
  const text = texts(ctx);
  const named = (room) => (plan) => [plan, `${room.name}: ${planName(ctx, room, plan)}`];
  const loaded = (room) => room.plans.filter((plan) => ctx.store.data.plans[plan]);
  const copies = ctx.store.data.allRooms.flatMap((room) => loaded(room).map(named(room)));
  return [
    ['starter_weekday', text.starter_weekday],
    ['starter_free', text.starter_free],
    ...copies,
  ];
}

/**
 * The new-plan form: its name and what it starts from.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {unknown}
 */
function addPlanForm(ctx, room) {
  const text = texts(ctx);
  const form = ctx.store.ui.addPlan;
  const onChange = (value) => setAddPlan(ctx, { template: value });
  const cancel = button(text.cancel, () => toggleAddPlan(ctx, room), { kind: 'btn flat small' });
  return html`<div class="panel">
    ${textField(text.name, form.name, (value) => setAddPlan(ctx, { name: value }))}
    ${selectField(text.copy_from, { list: templates(ctx), selected: form.template, onChange })}
    ${actionRow(
      cancel,
      button(text.create, () => addPlan(ctx, room)),
    )}
  </div>`;
}

/**
 * Where a plan is used: its weekdays, and free days.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {string} plan
 * @returns {string}
 */
function usedOn(ctx, room, plan) {
  const text = texts(ctx);
  const days = WEEK.filter((day) => room.week[day] === plan).map((day) => text.wd_short[day]);
  const uses = [
    ...(days.length ? [days.join(' ')] : []),
    ...(plan === room.free_day ? [text.free_days] : []),
  ];
  return uses.length ? `${text.used_on}: ${uses.join(' · ')}` : text.not_used;
}

/**
 * Admin: add a period, rename or delete the plan; its name while renaming; why it cannot be
 * saved; and the save bar while it differs from what is saved.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../state/actions/plan-editor.js').PlanRef} plan
 * @returns {unknown}
 */
function planActions(ctx, plan) {
  const text = texts(ctx);
  const renaming = ctx.store.ui.renaming === plan.entity;
  const rename = button(text.rename, () => renamePlan(ctx, plan), { kind: 'link small' });
  return html`<div class="actions">
      ${button(`+ ${text.add_period}`, () => addPeriod(ctx, plan), { kind: 'btn flat small' })}
      <span class="grow"></span>${renaming ? nothing : rename}${deleteButton(ctx, plan)}</div>
    ${renaming ? nameField(ctx, plan) : nothing}${planSaveBar(ctx, plan)}`;
}

/**
 * Delete, as a two-step button: the first press asks "Really delete?", the second deletes.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../state/actions/plan-editor.js').PlanRef} plan
 * @returns {unknown}
 */
function deleteButton(ctx, plan) {
  const text = texts(ctx);
  const key = `delete:${plan.entity}`;
  const asking = ctx.store.ui.confirming === key;
  const remove = () => confirmed(ctx, key, () => removePlan(ctx, plan));
  const label = asking ? text.really_delete : text.delete;
  return button(label, remove, { kind: `link small ${asking ? 'asking' : ''}` });
}

/**
 * The plan's name while it is being renamed.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../state/actions/plan-editor.js').PlanRef} plan
 * @returns {unknown}
 */
function nameField(ctx, plan) {
  const name = planDraft(ctx, plan.room, plan.entity).name;
  return textField(texts(ctx).name, name, (value) => renamePlan(ctx, plan, value));
}

/**
 * Why the plan cannot be saved, and the save bar while it differs from what is saved.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../state/actions/plan-editor.js').PlanRef} plan
 * @returns {unknown}
 */
function planSaveBar(ctx, plan) {
  const text = texts(ctx);
  const errors = checkPeriods(planDraft(ctx, plan.room, plan.entity).periods);
  const why = errors.map((code) => fill(text[`err_${code}`], { min: MIN_T, max: MAX_T })).join(' ');
  const actions = {
    cancel: () => resetPlan(ctx, plan),
    save: () => commitPlan(ctx, plan),
    disabled: errors.length > 0,
  };
  const dirty = isPlanDirty(ctx, plan.room, plan.entity);
  const bar = dirty ? saveBar([text.unsaved, text.cancel, text.save], actions) : nothing;
  return html`${why ? html`<div class="error">${why}</div>` : nothing}${bar}`;
}

/**
 * The plan shown: where it is used, its chart and periods, and the editor for administrators.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../state/actions/plan-editor.js').PlanRef} plan
 * @param {import('../../domain/room-status.js').RoomStatus} status
 * @returns {unknown}
 */
function planDetail(ctx, plan, status) {
  const periods = planDraft(ctx, plan.room, plan.entity).periods;
  const perDay = isPerDay(ctx, plan);
  const { minute, current } = markedNow(ctx, plan, status);
  const edit = ctx.store.ui.period;
  const editing = edit?.room === plan.room.id && edit.plan === plan.entity ? edit.index : null;
  return html`<div class="pinfo dim small">${usedOn(ctx, plan.room, plan.entity)}</div>
    ${perDay ? html`<div class="banner warn small">${texts(ctx).plan_per_day}</div>` : nothing}
    ${chartView(ctx, { plan, periods, now: minute, selected: editing })}
    ${periodList(ctx, { plan, periods, current, editing })}
    ${ctx.store.data.admin ? planActions(ctx, plan) : nothing}`;
}

/**
 * Was the plan edited per weekday in Home Assistant (so the card shows its Monday)?
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../state/actions/plan-editor.js').PlanRef} plan
 * @returns {boolean}
 */
function isPerDay(ctx, plan) {
  return Boolean(ctx.store.data.plans[plan.entity]?.perDay);
}

/**
 * What the shown plan marks as now: the minute (the chart's line) and the start of the period
 * now. Only on today's plan, and not on one that differs by weekday: it shows Monday, not today.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../state/actions/plan-editor.js').PlanRef} plan
 * @param {import('../../domain/room-status.js').RoomStatus} status
 * @returns {{minute: number | null, current: number | null}}
 */
function markedNow(ctx, plan, status) {
  if (plan.entity !== status.plan || isPerDay(ctx, plan)) return { minute: null, current: null };
  return { minute: now(ctx).min, current: status.at ? status.at.period.start : null };
}

/**
 * The Plan view.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {import('../../domain/room-status.js').RoomStatus} status
 * @returns {unknown}
 */
export function planView(ctx, room, status) {
  const shown = shownPlan(ctx, room, status);
  const chips = planChips(ctx, room, { shown, today: status.plan });
  if (ctx.store.ui.addPlan?.room === room.id) return html`${chips}${addPlanForm(ctx, room)}`;
  if (!shown) return chips;
  return html`${chips}${planDetail(ctx, { room, entity: shown }, status)}`;
}
