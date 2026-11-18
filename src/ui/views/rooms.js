// The room list: one row per room with its status and temperature; an opened room shows its
// views (Control, Plan, Week, and Setup for administrators) and its heating switch.

import { html, nothing } from 'lit';
import { formatNumber } from '../../domain/format.js';
import { showTab, showView, toggleRoom } from '../../state/actions/navigation.js';
import { togglePower } from '../../state/actions/control.js';
import { formatting, statusOf, texts } from '../../state/selectors.js';
import { lookOf, statusLine } from '../status.js';
import { controlView } from './control.js';
import { planView } from './plan.js';
import { roomSetupView } from './room-setup.js';
import { weekView } from './week.js';

/** The views of an opened room, in order; Setup only for administrators. */
const TABS = ['control', 'plan', 'week', 'setup'];

/**
 * The middle of a room's row: its name (marked when a thermostat cannot be reached) and status.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {import('../../domain/room-status.js').RoomStatus} status
 * @returns {unknown}
 */
function roomMain(ctx, room, status) {
  const unreachable = html` <span class="chip bad">${texts(ctx).unavailable}</span>`;
  return html`<span class="room-main">
    <span class="room-name">${room.name}${status.unavailable ? unreachable : nothing}</span>
    <span class="room-line ${lookOf(status).list}">${statusLine(ctx, room, status)}</span>
  </span>`;
}

/**
 * The room's row: status icon, name, status line, temperature. A button that opens the room.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {import('../../domain/room-status.js').RoomStatus} status
 * @returns {unknown}
 */
function roomHead(ctx, room, status) {
  const look = lookOf(status);
  const open = ctx.store.ui.openRoom === room.id;
  const temperature =
    status.current != null ? `${formatNumber(status.current, formatting(ctx))}°` : '–';
  const chevron = open ? 'mdi:chevron-up' : 'mdi:chevron-down';
  const toggle = () => toggleRoom(ctx, room.id);
  return html`<button class="room-head" aria-expanded=${open} @click=${toggle}>
    <span class="room-icon ${look.list}"><ha-icon icon=${look.icon}></ha-icon></span>
    ${roomMain(ctx, room, status)}
    <span class="room-temp">${temperature}</span><ha-icon class="chevron" icon=${chevron}></ha-icon>
  </button>`;
}

/**
 * The buttons that switch between an opened room's views.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {string} tab the view shown
 * @returns {unknown}
 */
function tabs(ctx, room, tab) {
  const text = texts(ctx);
  const shown = TABS.filter((key) => key !== 'setup' || ctx.store.data.admin);
  const button = (key) =>
    html`<button
      class=${tab === key ? 'on' : ''}
      aria-pressed=${tab === key}
      @click=${() => showTab(ctx, room.id, /** @type {any} */ (key))}
    >
      ${text[`v_${key}`]}
    </button>`;
  return html`<div class="tabs" role="group">${shown.map(button)}</div>`;
}

/**
 * The room's heating switch. Without one, only an administrator can use it (it is made then).
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {import('../../domain/room-status.js').RoomStatus} status
 * @returns {unknown}
 */
function heatingSwitch(ctx, room, status) {
  const text = texts(ctx);
  const on = !status.heatingOff;
  const disabled = !room.heating_switch && !ctx.store.data.admin;
  return html`<label class="switch" title=${on ? text.turn_off : text.turn_on}>
    <span>${text.heating_l_cap}</span><button class="toggle ${on ? 'on' : ''}" role="switch"
      aria-checked=${on} ?disabled=${disabled} @click=${() => togglePower(ctx, room)}>
      <i></i></button>
  </label>`;
}

/**
 * An opened room's view.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {{tab: string, status: import('../../domain/room-status.js').RoomStatus}} shown
 * @returns {unknown}
 */
function roomDetail(ctx, room, { tab, status }) {
  if (tab === 'plan') return planView(ctx, room, status);
  if (tab === 'week') return weekView(ctx, room);
  if (tab === 'setup' && ctx.store.data.admin) return roomSetupView(ctx, room, status);
  return controlView(ctx, room, status);
}

/**
 * A room: its row, and if it is open, its views.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {unknown}
 */
function roomView(ctx, room) {
  const status = statusOf(ctx, room);
  const head = roomHead(ctx, room, status);
  if (ctx.store.ui.openRoom !== room.id) return html`<div class="room">${head}</div>`;
  const tab = ctx.store.ui.tab[room.id] || 'control';
  return html`<div class="room open">
    ${head}
    <div class="room-bar">
      ${tabs(ctx, room, tab)}<span class="grow"></span>${heatingSwitch(ctx, room, status)}
    </div>
    ${roomDetail(ctx, room, { tab, status })}
  </div>`;
}

/**
 * The rooms page: every room, or a note (and for administrators, a way to add one).
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
export function roomsView(ctx) {
  const { rooms, admin } = ctx.store.data;
  if (rooms.length) return rooms.map((room) => roomView(ctx, room));
  const text = texts(ctx);
  const add = html`<button class="btn" @click=${() => showView(ctx, 'settings')}>
    ${text.add_room}
  </button>`;
  return html`<div class="note">${text.no_rooms}</div>
    ${admin ? add : nothing}`;
}
