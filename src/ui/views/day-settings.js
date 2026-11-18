// The day settings on the settings page (admin): the Workday sensor and the exceptions and holiday
// calendars, the keyword calendars, and the keyword rules. They are the day script's inputs.

import { html } from 'lit';
import { asList } from '../../domain/room.js';
import { count } from '../../domain/format.js';
import {
  addRule,
  commitSettings,
  deleteRule,
  moveRuleUp,
  resetSettings,
  setCalendar,
  setDaySetting,
  setRule,
} from '../../state/actions/settings.js';
import { settingsDraft } from '../../state/drafts.js';
import { allPlanNames, texts } from '../../state/selectors.js';
import { actionRow, button, options, selectField } from './parts.js';

/**
 * Entities of a kind, as select options (with "none" first if asked).
 * @param {import('../../state/context.js').Context} ctx
 * @param {{fits: (state: any) => boolean, none?: boolean}} kind
 * @returns {Array<[string, string]>}
 */
function entityOptions(ctx, { fits, none = false }) {
  const states = Object.values(ctx.gateway.states).filter(fits);
  const list = states.map((state) => [
    state.entity_id,
    state.attributes.friendly_name || state.entity_id,
  ]);
  return /** @type {Array<[string, string]>} */ (none ? [['', texts(ctx).none], ...list] : list);
}

/**
 * Is a state a calendar's?
 * @param {{entity_id: string}} state
 * @returns {boolean}
 */
function isCalendar(state) {
  return state.entity_id.startsWith('calendar.');
}

/**
 * The Workday sensor, the exceptions calendar and the holiday calendar.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
function workdayPart(ctx) {
  const text = texts(ctx);
  const draft = settingsDraft(ctx);
  const field = (label, key, kind) => {
    const onChange = (value) => setDaySetting(ctx, { [key]: value });
    return selectField(label, { list: entityOptions(ctx, kind), selected: draft[key], onChange });
  };
  return html`${field(text.workday_sensor, 'workday', { fits: isWorkday })}
    ${field(text.exceptions_calendar, 'exceptions', { fits: isCalendar })}
    ${field(text.holiday_calendar, 'holidays', { fits: isCalendar, none: true })}`;
}

/**
 * Is a state a Workday sensor's (a binary sensor with a list of workdays)?
 * @param {{entity_id: string, attributes: Record<string, any>}} state
 * @returns {boolean}
 */
function isWorkday(state) {
  return state.entity_id.startsWith('binary_sensor.') && Array.isArray(state.attributes.workdays);
}

/**
 * The keyword calendars: every calendar but the exceptions and holiday calendars.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
function calendarsPart(ctx) {
  const draft = settingsDraft(ctx);
  const own = [draft.exceptions, draft.holidays];
  const box = ([calendar, name]) => {
    const change = (event) => setCalendar(ctx, { calendar, on: event.target.checked });
    return html`<label class="check"><input type="checkbox"
      .checked=${draft.calendars.includes(calendar)} @change=${change}> ${name}</label>`;
  };
  const calendars = entityOptions(ctx, { fits: isCalendar });
  return calendars.filter(([calendar]) => !own.includes(calendar)).map(box);
}

/**
 * A keyword rule: its keyword, what it makes the day, move up, delete.
 * @param {import('../../state/context.js').Context} ctx
 * @param {{rule: {keyword: string, plan: string}, index: number}} row
 * @returns {unknown}
 */
function ruleRow(ctx, { rule, index }) {
  const text = texts(ctx);
  const up = { kind: 'icon', disabled: index === 0, aria: text.move_up };
  const remove = button('✕', () => deleteRule(ctx, index), { kind: 'icon', aria: text.delete });
  const keyword = (event) => setRule(ctx, index, { keyword: event.target.value });
  const plan = (event) => setRule(ctx, index, { plan: event.target.value });
  return html`<div class="rule-row">
    <input .value=${rule.keyword} placeholder=${text.keyword} aria-label=${text.keyword}
      @input=${keyword}>
    <select aria-label=${text.plan} @change=${plan}>
      ${options(ruleChoices(ctx, rule), rule.plan)}</select>
    ${button('↑', () => moveRuleUp(ctx, index), up)}${remove}</div>`;
}

/**
 * What a keyword rule can make a day: free, or a working day with a plan in use (or its own).
 * @param {import('../../state/context.js').Context} ctx
 * @param {{plan: string}} rule
 * @returns {Array<[string, string]>}
 */
function ruleChoices(ctx, rule) {
  const text = texts(ctx);
  const names = [...new Set([...allPlanNames(ctx), ...(rule.plan ? [rule.plan] : [])])];
  const plans = names.map((name) => [name, `→ ${text.plan}: ${name}`]);
  return /** @type {Array<[string, string]>} */ ([['', `→ ${text.rule_free}`], ...plans]);
}

/**
 * The keyword rules, and a button to add one.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
function rulesPart(ctx) {
  const rules = settingsDraft(ctx).rules.map((rule, index) => ruleRow(ctx, { rule, index }));
  const add = button(`+ ${texts(ctx).add_rule}`, () => addRule(ctx), { kind: 'btn flat small' });
  return html`${rules}${add}`;
}

/**
 * The open part of the day settings, with Cancel and Save (or a note without the day script).
 * @param {import('../../state/context.js').Context} ctx
 * @param {string} part
 * @returns {unknown}
 */
export function daySettingsPanel(ctx, part) {
  const text = texts(ctx);
  if (!ctx.store.data.script) return html`<div class="note">${text.no_script}</div>`;
  const bodies = { 'days-wd': workdayPart, 'days-cal': calendarsPart, 'days-rules': rulesPart };
  const cancel = button(text.cancel, () => resetSettings(ctx), { kind: 'btn flat small' });
  return html`<div class="panel">${bodies[part](ctx)}
    ${actionRow(
      cancel,
      button(text.save, () => commitSettings(ctx)),
    )}</div>`;
}

/**
 * The parts of the day settings and their summaries (from what is saved).
 * @param {import('../../state/context.js').Context} ctx
 * @returns {Array<[string, string, string]>} key, title, summary
 */
export function daySettingsParts(ctx) {
  const text = texts(ctx);
  const input = ctx.store.data.script?.use_blueprint?.input || {};
  const workday = ctx.gateway.states[input.workday]?.attributes.friendly_name || input.workday;
  const calendars = count(asList(input.calendars).length, text.calendars_n);
  return [
    ['days-wd', text.day_wd, workday || '–'],
    ['days-cal', text.keyword_calendars, calendars],
    ['days-rules', text.rules, count((input.rules || []).length, text.rules_n)],
  ];
}
