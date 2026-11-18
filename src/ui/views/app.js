// The card as a whole: the top bar (title or back, the day chip, the settings gear), the banners,
// and the page that is open.

import { html, nothing } from 'lit';
import { showView } from '../../state/actions/navigation.js';
import { texts, today } from '../../state/selectors.js';
import { banners } from './banners.js';
import { daysView } from './days.js';
import { roomsView } from './rooms.js';
import { settingsView } from './settings.js';

/**
 * The page to show: the settings only for administrators.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {'rooms' | 'days' | 'settings'}
 */
function pageOf(ctx) {
  const { view } = ctx.store.ui;
  return view === 'settings' && !ctx.store.data.admin ? 'rooms' : view;
}

/**
 * The left of the top bar: the card's title on the rooms page, else a way back.
 * @param {import('../../state/context.js').Context} ctx
 * @param {string} page
 * @returns {unknown}
 */
function titleOf(ctx, page) {
  const text = texts(ctx);
  if (page === 'rooms')
    return ctx.config.title
      ? html`<div class="title">${ctx.config.title}</div>`
      : html`<span></span>`;
  return html`<button class="back" @click=${() => showView(ctx, 'rooms')}>
    <ha-icon icon="mdi:chevron-left"></ha-icon>${page === 'days' ? text.days : text.settings}
  </button>`;
}

/**
 * The day chip: what today is; it opens the day list.
 * @param {import('../../state/context.js').Context} ctx
 * @param {string} page
 * @returns {unknown}
 */
function dayChip(ctx, page) {
  if (!ctx.store.data.days) return nothing;
  const text = texts(ctx);
  const day = today(ctx);
  const classes = `day-chip ${day.free ? 'free' : ''} ${page === 'days' ? 'on' : ''}`;
  return html`<button class=${classes} title=${text.days} @click=${() => showView(ctx, 'days')}>
    ${day.free ? text.free_day : text.working_day}${day.plan ? ` · ${day.plan}` : ''}
  </button>`;
}

/**
 * The settings gear, for administrators.
 * @param {import('../../state/context.js').Context} ctx
 * @param {string} page
 * @returns {unknown}
 */
function gear(ctx, page) {
  if (!ctx.store.data.admin) return nothing;
  const label = texts(ctx).settings;
  return html`<button
    class="icon-button ${page === 'settings' ? 'on' : ''}"
    title=${label}
    aria-label=${label}
    @click=${() => showView(ctx, 'settings')}
  >
    <ha-icon icon="mdi:cog"></ha-icon>
  </button>`;
}

/**
 * The open page, or a note while there is nothing to show.
 * @param {import('../../state/context.js').Context} ctx
 * @param {string} page
 * @returns {unknown}
 */
function pageView(ctx, page) {
  const { data } = ctx.store;
  if (data.noDirectory && !data.admin)
    return html`<div class="note">${texts(ctx).no_directory}</div>`;
  if (!data.rooms) return html`<div class="note">…</div>`;
  if (page === 'days') return daysView(ctx);
  if (page === 'settings') return settingsView(ctx);
  return roomsView(ctx);
}

/**
 * The card.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
export function cardView(ctx) {
  const page = pageOf(ctx);
  return html`<ha-card>
    <div class="top">
      ${titleOf(ctx, page)}<span class="grow"></span>${dayChip(ctx, page)}${gear(ctx, page)}
    </div>
    ${banners(ctx)}
    <div class="body">${pageView(ctx, page)}</div>
  </ha-card>`;
}
