// An opened room's Setup view (admin): its name, then a section each for its thermostats, its
// windows and doors, and its room sensor, each with a summary while closed; pause and save.

import { html, nothing } from 'lit';
import { LIMITS } from '../../domain/constants.js';
import { formatNumber, formatTemp } from '../../domain/format.js';
import { fill } from '../../i18n/text.js';
import { toggleActive } from '../../state/actions/control.js';
import { toggleSetupPart } from '../../state/actions/navigation.js';
import {
  commitSetup,
  setSetup,
  stepMargin,
  togglePicker,
  unpick,
} from '../../state/actions/room-setup.js';
import { setupDraft } from '../../state/drafts.js';
import { areaOf, formatting, texts } from '../../state/selectors.js';
import { button, numberField, textField } from './parts.js';
import { pickerView } from './picker.js';

/**
 * An entity's friendly name, or its id.
 * @param {import('../../state/context.js').Context} ctx
 * @param {string} entity
 * @returns {string}
 */
export function nameOf(ctx, entity) {
  return ctx.gateway.states[entity]?.attributes.friendly_name || entity;
}

/**
 * A collapsible section: its title, a summary while closed, its content while open.
 * @param {import('../../state/context.js').Context} ctx
 * @param {{key: string, title: string, summary: string, body: () => unknown}} section
 * @returns {unknown}
 */
function section(ctx, { key, title, summary, body }) {
  const open = ctx.store.ui.setupPart === key;
  const chevron = open ? 'mdi:chevron-up' : 'mdi:chevron-down';
  const toggle = () => toggleSetupPart(ctx, key);
  const brief = open ? nothing : html`<span class="dim small ellipsis">${summary}</span>`;
  return html`<div class="section ${open ? 'open' : ''}">
    <button class="section-head plain" aria-expanded=${open} @click=${toggle}>
      <span class="section-title">${title}</span><span class="grow"></span>${brief}
      <ha-icon class="chevron" icon=${chevron}></ha-icon></button>
    ${open ? html`<div class="section-body">${body()}</div>` : nothing}</div>`;
}

/**
 * An entity as a chip, with a button that removes it.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room | null} room null for a new room
 * @param {{kind: import('../../domain/picker.js').PickKind, entity: string}} chosen
 * @returns {unknown}
 */
function entityChip(ctx, room, { kind, entity }) {
  const name = nameOf(ctx, entity);
  const remove = () => unpick(ctx, room, { kind, entity });
  return html`<span class="entity-chip">${name}<button class="x"
    aria-label=${`${texts(ctx).remove}: ${name}`} @click=${remove}>✕</button></span>`;
}

/**
 * Entities as chips, a chip that opens the search, and the search.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room | null} room null for a new room
 * @param {{kind: import('../../domain/picker.js').PickKind, list: string[]}} chosen
 * @returns {unknown}
 */
export function entityChips(ctx, room, { kind, list }) {
  const id = room?.id ?? '';
  const picker = ctx.store.ui.picker;
  const area = areaOf(ctx, list[0] || room?.thermostats[0] || '');
  const open = picker?.room === id && picker.kind === kind;
  const search = open ? pickerView(ctx, { room, kind, exclude: list, area }) : nothing;
  const add = () => togglePicker(ctx, { room: id, kind });
  const chips = list.map((entity) => entityChip(ctx, room, { kind, entity }));
  const more = button(`+ ${texts(ctx).add}`, add, { kind: 'add-chip' });
  return html`<div class="chips">${chips}${more}</div>${search}`;
}

/**
 * The windows and doors section: the sensors, the delay, what they do.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {unknown}
 */
function windowsBody(ctx, room) {
  const text = texts(ctx);
  const draft = setupDraft(ctx, room);
  const onInput = (value) => setSetup(ctx, room, { window_delay: value });
  const delay = { ...LIMITS.window_delay, step: 5, onInput };
  return html`${entityChips(ctx, room, { kind: 'win', list: draft.windows })}
    ${numberField(text.delay, draft.window_delay, delay)}
    <div class="dim small">${text.window_help}</div>`;
}

/**
 * The room margin as text: "0,5 °C".
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {string}
 */
function marginText(ctx, room) {
  const typed = String(setupDraft(ctx, room).room_margin).replace(',', '.');
  const margin = Number(typed) || LIMITS.room_margin.initial;
  return `${formatNumber(margin, formatting(ctx), { min: 1, max: 1 })} °C`;
}

/**
 * The room sensor chosen: its name and temperature, its id, and a button to remove it.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {string} sensor
 * @returns {unknown}
 */
function sensorEntry(ctx, room, sensor) {
  const name = nameOf(ctx, sensor);
  const value = Number(ctx.gateway.states[sensor]?.state);
  const shown = formatTemp(value, formatting(ctx));
  const temperature = Number.isNaN(value) ? nothing : html` <span class="dim">· ${shown}</span>`;
  const remove = () => unpick(ctx, room, { kind: 'rs', entity: sensor });
  return html`<div class="entry"><ha-icon icon="mdi:thermometer"></ha-icon>
    <span class="grow ellipsis"><span class="block">${name}${temperature}</span>
      <span class="block dim small ellipsis">${sensor}</span></span>
    <button class="x" aria-label=${`${texts(ctx).remove}: ${name}`} @click=${remove}>✕</button>
  </div>`;
}

/**
 * The margin stepper of the room sensor section.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {unknown}
 */
function marginStepper(ctx, room) {
  const text = texts(ctx);
  const step = (steps, word) => {
    const label = steps < 0 ? '−' : '+';
    return button(label, () => stepMargin(ctx, room, steps), { kind: 'round', aria: word });
  };
  return html`<div class="stepper"><span class="grow">${text.room_margin}</span>
    ${step(-1, text.margin_less)}<span class="value">${marginText(ctx, room)}</span>
    ${step(1, text.margin_more)}</div>`;
}

/**
 * The room sensor section: the sensor (or the search for one), the margin, what it does.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {unknown}
 */
function sensorBody(ctx, room) {
  const text = texts(ctx);
  const sensor = setupDraft(ctx, room).room_sensor;
  const note = html`<div class="dim small">${text.rs_workaround}</div>`;
  if (!sensor) {
    const area = areaOf(ctx, room.thermostats[0] || '');
    const search = pickerView(ctx, { room, kind: 'rs', exclude: [], area });
    return html`${search}<div class="dim small">${text.room_help}</div>${note}`;
  }
  const help = fill(text.room_closed_help, { margin: marginText(ctx, room) });
  return html`${sensorEntry(ctx, room, sensor)}${marginStepper(ctx, room)}
    <div class="dim small">${help}</div>${note}`;
}

/**
 * The summaries of the three sections, shown while they are closed.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {{th: string, win: string, rs: string}}
 */
function summaries(ctx, room) {
  const draft = setupDraft(ctx, room);
  const names = (list) => list.map((entity) => nameOf(ctx, entity)).join(', ');
  const delay = Math.round(Number(draft.window_delay) || 0);
  const sensor =
    draft.room_sensor && `${nameOf(ctx, draft.room_sensor)} · ${marginText(ctx, room)}`;
  const windows = draft.windows.length && `${names(draft.windows)} · ${delay} s`;
  return { th: names(draft.thermostats) || '–', win: windows || '–', rs: sensor || '–' };
}

/**
 * The three sections.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {unknown}
 */
function sections(ctx, room) {
  const text = texts(ctx);
  const summary = summaries(ctx, room);
  const list = setupDraft(ctx, room).thermostats;
  const bodies = {
    th: () => entityChips(ctx, room, { kind: 'th', list }),
    win: () => windowsBody(ctx, room),
    rs: () => sensorBody(ctx, room),
  };
  const titles = { th: text.thermostats, win: text.windows_doors, rs: text.room_sensor };
  const part = (key) => ({ key, title: titles[key], summary: summary[key], body: bodies[key] });
  return ['th', 'win', 'rs'].map((key) => section(ctx, part(key)));
}

/**
 * The Setup view.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {import('../../domain/room-status.js').RoomStatus} status
 * @returns {unknown}
 */
export function roomSetupView(ctx, room, status) {
  const text = texts(ctx);
  const draft = setupDraft(ctx, room);
  const word = status.active ? text.pause_room : text.activate_room;
  const pause = button(word, () => toggleActive(ctx, room), { kind: 'btn flat small' });
  const save = button(text.save, () => commitSetup(ctx, room));
  return html`<div class="setup">
    ${textField(text.name, draft.name, (name) => setSetup(ctx, room, { name }))}
    ${sections(ctx, room)}
    <div class="actions">${pause}<span class="grow"></span>${save}</div>
    <div class="dim small">${text.pause_help}</div></div>`;
}
