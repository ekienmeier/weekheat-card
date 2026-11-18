// The entity search: a field, and the entities found, those in the room's area first.

import { html, nothing } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { formatTemp } from '../../domain/format.js';
import { pickCandidates } from '../../domain/picker.js';
import { pick, searchEntities } from '../../state/actions/room-setup.js';
import { areaOf, formatting, texts } from '../../state/selectors.js';

/** How many entities each group shows before it asks for a narrower search. */
const SHOWN = 8;

/** The search fields focused once already, so that a re-render does not take the focus again. */
const focused = new WeakSet();

/**
 * Focus a search field the first time it shows.
 * @param {Element | undefined} field
 */
function focusOnce(field) {
  if (!field || focused.has(field)) return;
  focused.add(field);
  /** @type {HTMLInputElement} */ (field).focus();
}

/**
 * @typedef {object} PickerInput What a picker searches and adds to.
 * @property {import('../../domain/room.js').Room | null} room null for a new room
 * @property {import('../../domain/picker.js').PickKind} kind
 * @property {string[]} exclude what was chosen already
 * @property {string} area the room's area (its first thermostat's), shown first
 */

/**
 * The temperature of an entity found, for room sensors and thermostats.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/picker.js').PickKind} kind
 * @param {import('../../domain/room-status.js').HassState} state
 * @returns {unknown}
 */
function temperatureOf(ctx, kind, state) {
  const value = kind === 'rs' ? Number(state.state) : state.attributes.current_temperature;
  if (kind === 'win' || typeof value !== 'number' || Number.isNaN(value)) return nothing;
  return html` <span class="dim">· ${formatTemp(value, formatting(ctx))}</span>`;
}

/**
 * An entity found: its name, its id and area. A button that adds it.
 * @param {import('../../state/context.js').Context} ctx
 * @param {PickerInput} picker
 * @param {import('../../domain/room-status.js').HassState} state
 * @returns {unknown}
 */
function found(ctx, picker, state) {
  const id = state.entity_id;
  const area = areaOf(ctx, id);
  const choose = () => pick(ctx, picker.room, { kind: picker.kind, entity: id });
  const name = state.attributes.friendly_name || id;
  return html`<button class="picker-item" @click=${choose}>
    <span class="block">${name}${temperatureOf(ctx, picker.kind, state)}</span>
    <span class="block dim small ellipsis">${id}${area ? ` · ${area}` : ''}</span></button>`;
}

/**
 * A group of entities found, with a note when there are more than it shows.
 * @param {import('../../state/context.js').Context} ctx
 * @param {PickerInput} picker
 * @param {{title: string, list: any[]}} group
 * @returns {unknown}
 */
function foundGroup(ctx, picker, { title, list }) {
  if (!list.length) return nothing;
  const rest = list.length - SHOWN;
  const more =
    rest > 0 ? html`<div class="picker-group">${rest} ${texts(ctx).more_matches}</div>` : nothing;
  const items = list.slice(0, SHOWN).map((state) => found(ctx, picker, state));
  return html`<div class="picker-group">${title}</div>${items}${more}`;
}

/**
 * What a search finds, in two groups: in the room's area, and elsewhere.
 * @param {import('../../state/context.js').Context} ctx
 * @param {PickerInput} picker
 * @param {string} query
 * @returns {unknown}
 */
function results(ctx, picker, query) {
  const text = texts(ctx);
  const where = { roomArea: picker.area, areaOf: (entity) => areaOf(ctx, entity) };
  const search = { kind: picker.kind, query, exclude: picker.exclude, ...where };
  const { here, other } = pickCandidates(Object.values(ctx.gateway.states), search);
  if (!here.length && !other.length) return html`<div class="picker-group">${text.no_match}</div>`;
  const local = { title: picker.area ? `${text.in_area} ${picker.area}` : '', list: here };
  const elsewhere = { title: here.length ? text.other_areas : '', list: other };
  return html`${foundGroup(ctx, picker, local)}${foundGroup(ctx, picker, elsewhere)}`;
}

/**
 * The entity search for a room (or a new room).
 * @param {import('../../state/context.js').Context} ctx
 * @param {PickerInput} picker
 * @returns {unknown}
 */
export function pickerView(ctx, picker) {
  const text = texts(ctx);
  const id = picker.room?.id ?? '';
  const open = ctx.store.ui.picker;
  const query = open?.room === id && open.kind === picker.kind ? open.query : '';
  const type = (event) =>
    searchEntities(ctx, { room: id, kind: picker.kind, query: event.target.value });
  return html`<div class="picker"><label class="search"><ha-icon icon="mdi:magnify"></ha-icon>
      <input ${ref(focusOnce)} .value=${query} placeholder=${text.search} aria-label=${text.search}
        autocomplete="off" @input=${type}></label>
    <div class="picker-list">${results(ctx, picker, query)}</div></div>`;
}
