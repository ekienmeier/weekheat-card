// An opened room's Control view: the dial (with a thermostat selector when there are several) or
// sliders, the current period, each thermostat's values, and "Back to plan" after a change by hand.

import { html, nothing } from 'lit';
import {
  formatNumber,
  formatPeriod,
  formatTemp,
  formatTime,
  targetsText,
} from '../../domain/format.js';
import { canReturnToPlan } from '../../domain/room-status.js';
import { thermostatStatus } from '../../domain/thermostat-status.js';
import { UNAVAILABLE } from '../../domain/constants.js';
import { backToPlan, shiftAll } from '../../state/actions/control.js';
import { selectThermostat, toggleLayout } from '../../state/actions/navigation.js';
import { formatting, mixed, planName, shownValue, texts } from '../../state/selectors.js';
import { dialView } from './dial.js';
import { sliderView } from './slider.js';

/**
 * @typedef {import('../../domain/room-status.js').RoomStatus} RoomStatus
 */

/**
 * One thermostat's status within its room.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {{status: RoomStatus, th: string}} of the room's status, and the thermostat
 * @returns {RoomStatus}
 */
function statusOfThermostat(ctx, room, { status, th }) {
  return thermostatStatus(room, th, { status, states: ctx.gateway.states });
}

/**
 * The thermostat selector above the dial: All, then each thermostat with its setpoint.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {{status: RoomStatus, selected: string}} shown the room's status; '' is All
 * @returns {unknown}
 */
function selector(ctx, room, { status, selected }) {
  const choice = (th) => {
    const name = th ? statusOfThermostat(ctx, room, { status, th }).label : texts(ctx).all_th;
    const value = th ? choiceValue(ctx, room, { status, th }) : nothing;
    return html`<button class=${th === selected ? 'on' : ''} aria-pressed=${th === selected}
      title=${name} @click=${() => selectThermostat(ctx, room.id, th)}>
      <span class="name">${name}</span>${value}</button>`;
  };
  return html`<div class="thermostats" role="group" aria-label=${texts(ctx).pick_th}>
    ${['', ...room.thermostats].map(choice)}</div>`;
}

/**
 * A thermostat's setpoint in the selector, coloured when it was set by hand.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {{status: RoomStatus, th: string}} of
 * @returns {unknown}
 */
function choiceValue(ctx, room, of) {
  const value = shownValue(ctx, room, of.th);
  if (typeof value !== 'number') return nothing;
  const manual = statusOfThermostat(ctx, room, of).manual;
  const number = formatNumber(value, formatting(ctx));
  return html`<span class=${manual ? 'manual' : 'dim'}>${number}°</span>`;
}

/**
 * The dial layout: the selector (several thermostats) and the dial for the one chosen, or for all.
 * While all differ and none is being set, the dial shows each value ("18 / 22 °C").
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {RoomStatus} status
 * @returns {unknown}
 */
function dialLayout(ctx, room, status) {
  const several = room.thermostats.length > 1;
  const chosen = ctx.store.ui.thermostat[room.id];
  const selected = several && room.thermostats.includes(chosen) ? chosen : '';
  const { pending, drag } = ctx.store.control;
  const setting = [pending, drag].some((item) => item?.room === room.id && item.th === '');
  const values = !selected && !setting ? mixed(ctx, room) : null;
  const shown = {
    status: selected ? statusOfThermostat(ctx, room, { status, th: selected }) : status,
    value: values ? null : shownValue(ctx, room, selected),
    mixed: values ? targetsText(values, formatting(ctx)) : undefined,
  };
  const choices = several ? selector(ctx, room, { status, selected }) : nothing;
  return html`${choices}${dialView(ctx, room, { ...shown, th: selected })}`;
}

/**
 * The compact layout: one slider per thermostat and a row that moves all of them by the same
 * amount, or one slider for a room with one thermostat.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {RoomStatus} status
 * @returns {unknown}
 */
function compactLayout(ctx, room, status) {
  if (room.thermostats.length < 2) {
    return sliderView(ctx, room, { status, value: shownValue(ctx, room, ''), th: '' });
  }
  const slider = (th) => {
    const own = statusOfThermostat(ctx, room, { status, th });
    return sliderView(ctx, room, {
      status: own,
      value: shownValue(ctx, room, th),
      th,
      framed: true,
    });
  };
  return html`${room.thermostats.map(slider)}${allTogether(ctx, room)}`;
}

/**
 * "All together": − and + that move each thermostat by the same amount.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {unknown}
 */
function allTogether(ctx, room) {
  const text = texts(ctx);
  const button = (
    steps,
    word,
  ) => html`<button class="round" aria-label=${`${text.both_th}: ${word}`}
    @click=${() => shiftAll(ctx, room, steps)}>${steps < 0 ? '−' : '+'}</button>`;
  return html`<div class="all-row">
    <span><span class="block">${text.both_th}</span>
      <span class="block dim small">${text.both_help}</span></span>
    <span class="grow"></span>${button(-1, text.colder)}${button(1, text.warmer)}
  </div>`;
}

/**
 * Today's plan and period: "Werktag: 21 °C bis 17:00", then the next temperature.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {RoomStatus} status
 * @returns {unknown}
 */
function periodPill(ctx, room, status) {
  if (!status.at) return nothing;
  const text = texts(ctx);
  const { period, next } = status.at;
  const show = (item) => formatPeriod(item, formatting(ctx), text);
  const until = next
    ? `${text.until} ${formatTime(next.start, formatting(ctx))}`
    : `${text.until} ${text.tomorrow_l}`;
  const now = `${planName(ctx, room, status.plan)}: ${show(period)} ${until}`;
  const then = next ? html`<span class="dim">${text.then} ${show(next)}</span>` : nothing;
  return html`<div class="pill"><span>${now}</span>${then}</div>`;
}

/**
 * Below the dial of a room with several thermostats: each one's room temperature and setpoint.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {RoomStatus} status
 * @returns {unknown}
 */
function thermostatList(ctx, room, status) {
  const row = (th) => {
    const state = ctx.gateway.states[th];
    if (!state) return html`<div class="thermostat dim">${th}</div>`;
    const each = statusOfThermostat(ctx, room, { status, th });
    const value = setpointText(ctx, state, each);
    const setpoint = html`<span class=${each.manual ? 'manual' : ''}>${value}</span>`;
    const current = formatTemp(state.attributes.current_temperature, formatting(ctx));
    return html`<div class="thermostat"><span>${each.label}</span>
      <span class="dim">${current} → ${setpoint}</span></div>`;
  };
  return room.thermostats.map(row);
}

/**
 * A thermostat's setpoint in the list: its value, or unreachable, or Off.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room-status.js').HassState} state
 * @param {RoomStatus} each the thermostat's status
 * @returns {string}
 */
function setpointText(ctx, state, each) {
  const text = texts(ctx);
  if (UNAVAILABLE.includes(state.state)) return text.unavailable;
  return state.state === 'off' ? text.off : formatTemp(each.target, formatting(ctx));
}

/**
 * "Back to plan", with until when a change by hand holds.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {RoomStatus} status
 * @returns {unknown}
 */
function backRow(ctx, room, status) {
  if (!canReturnToPlan(status) || status.wanted == null) return nothing;
  const text = texts(ctx);
  const next = status.at?.next;
  const holds = next
    ? `${text.manual_until} ${formatTime(next.start, formatting(ctx))}${text.manual_then}`
    : '';
  return html`<div class="back-row"><span class="dim small grow">${holds}</span>
    <button class="btn flat small outline" @click=${() => backToPlan(ctx, room)}>
      ${text.to_plan}</button></div>`;
}

/**
 * The Control view.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @param {RoomStatus} status
 * @returns {unknown}
 */
export function controlView(ctx, room, status) {
  const text = texts(ctx);
  const dial = ctx.store.ui.layout === 'dial';
  const list = dial && room.thermostats.length > 1 ? thermostatList(ctx, room, status) : nothing;
  const layout = dial ? dialLayout(ctx, room, status) : compactLayout(ctx, room, status);
  return html`${layout}${periodPill(ctx, room, status)}${list}${backRow(ctx, room, status)}
    <div class="foot"><button class="link small" @click=${() => toggleLayout(ctx)}>
      ${dial ? text.layout_compact : text.layout_dial}</button></div>`;
}
