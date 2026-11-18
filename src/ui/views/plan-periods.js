// The period list of the Plan view: one row per period, and for administrators an editor for the
// period chosen (start, temperature, Off, delete).

import { html } from 'lit';
import { formatPeriod } from '../../domain/format.js';
import { fromMin, toMin } from '../../domain/time.js';
import {
  deletePeriod,
  setPeriodOff,
  setPeriodStart,
  stepPeriod,
  togglePeriod,
} from '../../state/actions/plan-editor.js';
import { lang, texts } from '../../state/selectors.js';

/**
 * @typedef {object} PeriodList What the list shows.
 * @property {import('../../state/actions/plan-editor.js').PlanRef} plan
 * @property {import('../../domain/periods.js').Period[]} periods the draft's
 * @property {number | null} current the start of the period now, when the plan is today's
 * @property {number | null} editing the period being edited
 */

/**
 * A period's row: its start and what it schedules. For administrators a button that edits it.
 * @param {import('../../state/context.js').Context} ctx
 * @param {PeriodList} list
 * @param {number} index
 * @returns {unknown}
 */
function periodRow(ctx, list, index) {
  const period = list.periods[index];
  const now = list.current === period.start ? 'current' : '';
  const inside = html`<span>${fromMin(period.start)}</span><span class="grow"></span>
    <span>${formatPeriod(period, lang(ctx), texts(ctx))}</span>`;
  if (!ctx.store.data.admin) return html`<div class="period-row ${now}">${inside}</div>`;
  return html`<button class="period-row ${now}" @click=${() => togglePeriod(ctx, list.plan, index)}>
    ${inside}</button>`;
}

/**
 * The temperature stepper of the period editor (not for Off).
 * @param {import('../../state/context.js').Context} ctx
 * @param {PeriodList} list
 * @param {number} index
 * @returns {unknown}
 */
function temperatureStepper(ctx, list, index) {
  const text = texts(ctx);
  const period = list.periods[index];
  const button = (steps, word) => html`<button class="round small" ?disabled=${period.off}
    aria-label=${word} @click=${() => stepPeriod(ctx, list.plan, { index, steps })}>
    ${steps < 0 ? '−' : '+'}</button>`;
  const value = period.off ? text.off : formatPeriod(period, lang(ctx), text);
  return html`<div class="temperature-step">
    ${button(-1, text.colder)}<span>${value}</span>${button(1, text.warmer)}</div>`;
}

/**
 * The start of a period being edited (the first always starts at 00:00).
 * @param {import('../../state/context.js').Context} ctx
 * @param {PeriodList} list
 * @param {number} index
 * @returns {unknown}
 */
function startField(ctx, list, index) {
  const change = (event) => {
    const start = event.target.value ? toMin(event.target.value) : 0;
    setPeriodStart(ctx, list.plan, { index, start });
  };
  return html`<input type="time" step="60" aria-label=${texts(ctx).from}
    .value=${fromMin(list.periods[index].start)} ?disabled=${index === 0} @change=${change}>`;
}

/**
 * The editor of a period: its start, temperature, Off, and delete (not for the first).
 * @param {import('../../state/context.js').Context} ctx
 * @param {PeriodList} list
 * @param {number} index
 * @returns {unknown}
 */
function periodEditor(ctx, list, index) {
  const text = texts(ctx);
  const off = (event) => setPeriodOff(ctx, list.plan, { index, off: event.target.checked });
  const remove = html`<button class="icon" title=${text.delete} aria-label=${text.delete}
    @click=${() => deletePeriod(ctx, list.plan, index)}>
    <ha-icon icon="mdi:delete-outline"></ha-icon></button>`;
  return html`<div class="period-edit">${startField(ctx, list, index)}
    ${temperatureStepper(ctx, list, index)}
    <label class="check"><input type="checkbox" .checked=${list.periods[index].off}
      @change=${off}> ${text.off}</label>
    ${index === 0 ? html`<span></span>` : remove}</div>`;
}

/**
 * The period list.
 * @param {import('../../state/context.js').Context} ctx
 * @param {PeriodList} list
 * @returns {unknown}
 */
export function periodList(ctx, list) {
  const admin = ctx.store.data.admin;
  const row = (_, i) =>
    admin && list.editing === i ? periodEditor(ctx, list, i) : periodRow(ctx, list, i);
  return html`<div class="period-list">${list.periods.map(row)}</div>`;
}
