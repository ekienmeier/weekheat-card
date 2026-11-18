// The settings page (admin): the rooms (a tap opens a room's Setup), adding a room, the day
// settings, and the weekly valve exercise.

import { html, nothing } from 'lit';
import { LIMITS, WEEK } from '../../domain/constants.js';
import { count } from '../../domain/format.js';
import { commitNewRoom, setNewRoomName } from '../../state/actions/admin.js';
import { goToSetup, toggleSettingsPart } from '../../state/actions/navigation.js';
import { commitExercise, exerciseNow, setExercise } from '../../state/actions/settings.js';
import { exerciseDraft } from '../../state/drafts.js';
import { exerciseSettings, statusOf, texts } from '../../state/selectors.js';
import { daySettingsPanel, daySettingsParts } from './day-settings.js';
import { actionRow, button, numberField, selectField, textField } from './parts.js';
import { entityChips } from './room-setup.js';

/**
 * A room's summary: thermostats, contacts, room sensor, paused.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {string}
 */
function roomInfo(ctx, room) {
  const text = texts(ctx);
  const parts = [
    count(room.thermostats.length, text.thermostats_short),
    count(room.windows.length, text.windows_short),
    ...(room.room_sensor ? [text.room_sensor_short] : []),
    ...(statusOf(ctx, room).active ? [] : [text.paused]),
  ];
  return parts.join(' · ');
}

/**
 * A room's row: its name and summary; it opens the room's Setup.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {unknown}
 */
function roomRow(ctx, room) {
  const open = () => goToSetup(ctx, room.id);
  const info = html`<span class="block dim small">${roomInfo(ctx, room)}</span>`;
  return html`<div class="settings-row"><button class="settings-head plain" @click=${open}>
    <span class="grow"><span class="block">${room.name}</span>${info}</span>
    <ha-icon class="chevron" icon="mdi:chevron-right"></ha-icon></button></div>`;
}

/**
 * @typedef {object} PartRow A row of the settings page that opens a part.
 * @property {string} key the part
 * @property {unknown} title
 * @property {string} [summary] shown while it is closed
 * @property {() => unknown} body the part
 * @property {boolean} [chevron] show whether it is open (not for "Add room")
 */

/**
 * A row that opens a part of the page: its title, a summary while closed, the part while open.
 * @param {import('../../state/context.js').Context} ctx
 * @param {PartRow} part
 * @returns {unknown}
 */
function partRow(ctx, { key, title, summary = '', body, chevron = true }) {
  const open = ctx.store.ui.settingsPart === key;
  const name = open ? 'mdi:chevron-up' : 'mdi:chevron-down';
  const icon = chevron ? html`<ha-icon class="chevron" icon=${name}></ha-icon>` : nothing;
  const brief =
    open || !summary ? nothing : html`<span class="dim small ellipsis">${summary}</span>`;
  const toggle = () => toggleSettingsPart(ctx, key);
  return html`<div class="settings-row">
    <button class="settings-head plain" aria-expanded=${open} @click=${toggle}>${title}
      <span class="grow"></span>${brief}${icon}</button>
    ${open ? body() : nothing}</div>`;
}

/**
 * The new-room form: its name and thermostats (found with the search); it starts paused.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
function addRoomForm(ctx) {
  const text = texts(ctx);
  const form = ctx.store.ui.addRoom;
  const name = textField(text.name, form.name, (value) => setNewRoomName(ctx, value));
  const chips = entityChips(ctx, null, { kind: 'th', list: form.thermostats });
  const close = () => toggleSettingsPart(ctx, 'add');
  const row = actionRow(
    button(text.cancel, close, { kind: 'btn flat small' }),
    button(text.create, () => commitNewRoom(ctx)),
  );
  return html`<div class="panel">${name}<div class="field">${text.thermostats}</div>${chips}
    <div class="dim small">${text.new_room_paused}</div>${row}</div>`;
}

/**
 * The valve exercise's days: off, or a weekday.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {Array<[string, string]>}
 */
function exerciseDays(ctx) {
  const text = texts(ctx);
  const days = WEEK.map((day) => [day, text.weekdays[day]]);
  return /** @type {Array<[string, string]>} */ ([['off', text.off], ...days]);
}

/**
 * The valve exercise's fields: day, time and wait.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
function exerciseFields(ctx) {
  const text = texts(ctx);
  const draft = exerciseDraft(ctx);
  const day = (value) => setExercise(ctx, { exercise_day: value });
  const time = (event) => setExercise(ctx, { exercise_time: event.target.value });
  const wait = (value) => setExercise(ctx, { exercise_wait: value });
  const days = { list: exerciseDays(ctx), selected: draft.exercise_day, onChange: day };
  const waiting = { ...LIMITS.exercise_wait, step: 5, onInput: wait };
  const clock = String(draft.exercise_time).slice(0, 5);
  return html`${selectField(text.exercise_day, days)}
    <label class="field">${text.exercise_time}
      <input type="time" .value=${clock} @change=${time}></label>
    ${numberField(text.exercise_wait, draft.exercise_wait, waiting)}`;
}

/**
 * The valve exercise: its fields, what it does, run it now, save.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
function exercisePanel(ctx) {
  const text = texts(ctx);
  const run = () => confirm(text.confirm_exercise) && exerciseNow(ctx);
  const now = button(text.exercise_now, run, { kind: 'btn flat small' });
  const save = button(text.save, () => commitExercise(ctx));
  return html`<div class="panel">${exerciseFields(ctx)}
    <div class="dim small">${text.exercise_help}</div>
    <div class="actions">${now}<span class="grow"></span>${save}</div></div>`;
}

/**
 * The valve exercise's summary: off, or its weekday and time.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {string}
 */
function exerciseLine(ctx) {
  const text = texts(ctx);
  const settings = exerciseSettings(ctx);
  if (settings.exercise_day === 'off') return text.off;
  return `${text.wd_short[settings.exercise_day]} ${String(settings.exercise_time).slice(0, 5)}`;
}

/**
 * The rows of the day settings.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown[]}
 */
function dayRows(ctx) {
  const row = ([key, title, summary]) => {
    const body = () => daySettingsPanel(ctx, key);
    return partRow(ctx, { key, title: html`<span>${title}</span>`, summary, body });
  };
  return daySettingsParts(ctx).map(row);
}

/**
 * The settings page.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
export function settingsView(ctx) {
  const text = texts(ctx);
  const addTitle = html`<span class="accent">+ ${text.add_room}</span>`;
  const form = () => addRoomForm(ctx);
  const add = partRow(ctx, { key: 'add', title: addTitle, body: form, chevron: false });
  const exerciseTitle = html`<span>${text.exercise_sub}</span>`;
  const body = () => exercisePanel(ctx);
  const exercise = { key: 'exercise', title: exerciseTitle, summary: exerciseLine(ctx), body };
  const title = (words) => html`<div class="settings-title">${words}</div>`;
  const rooms = ctx.store.data.rooms.map((room) => roomRow(ctx, room));
  return html`${title(text.rooms)}${rooms}${add}${title(text.day_settings)}${dayRows(ctx)}
    ${title(text.exercise)}${partRow(ctx, exercise)}`;
}
