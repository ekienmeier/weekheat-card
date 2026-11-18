// Moving around the card: pages, rooms, a room's views, the plan and thermostat chosen, the open
// sections, the layout.

import { dismissNotification } from '../../ha/notifications.js';
import { attempt } from './messages.js';

/** Where each browser remembers the layout last picked. */
const LAYOUT_KEY = 'weekheat-layout';

/**
 * Close what belongs to one view of a room: the period being edited, the new-plan form, renaming,
 * and a two-step button that asks (see confirm.js).
 * @param {import('../store.js').UiState} ui
 */
function closeEditors(ui) {
  ui.period = null;
  ui.addPlan = null;
  ui.renaming = null;
  ui.confirming = null;
}

/**
 * Show a page; showing the one that is open goes back to the rooms.
 * @param {import('../context.js').Context} ctx
 * @param {'rooms' | 'days' | 'settings'} view
 */
export function showView(ctx, view) {
  ctx.store.update(({ ui }) => {
    ui.view = ui.view === view ? 'rooms' : view;
    ui.dayEdit = null;
    ui.confirming = null;
  });
}

/**
 * Open a room, or close it if it is open.
 * @param {import('../context.js').Context} ctx
 * @param {string} room its id
 */
export function toggleRoom(ctx, room) {
  ctx.store.update(({ ui }) => {
    ui.openRoom = ui.openRoom === room ? null : room;
    closeEditors(ui);
  });
}

/**
 * Show one of a room's views.
 * @param {import('../context.js').Context} ctx
 * @param {string} room its id
 * @param {import('../store.js').RoomTab} tab
 */
export function showTab(ctx, room, tab) {
  ctx.store.update(({ ui }) => {
    ui.tab[room] = tab;
    closeEditors(ui);
  });
}

/**
 * Show a plan in a room's Plan view.
 * @param {import('../context.js').Context} ctx
 * @param {string} room its id
 * @param {string} plan its entity id
 */
export function selectPlan(ctx, room, plan) {
  ctx.store.update(({ ui }) => {
    ui.plan[room] = plan;
    closeEditors(ui);
  });
}

/**
 * Choose the thermostat the dial sets ('' for all of the room's).
 * @param {import('../context.js').Context} ctx
 * @param {string} room its id
 * @param {string} th
 */
export function selectThermostat(ctx, room, th) {
  ctx.store.update(({ ui }) => (ui.thermostat[room] = th));
}

/**
 * Open a part of the settings page, or close it. Opening "add" starts an empty new-room form.
 * @param {import('../context.js').Context} ctx
 * @param {string} part
 */
export function toggleSettingsPart(ctx, part) {
  ctx.store.update(({ ui }) => {
    ui.settingsPart = ui.settingsPart === part ? null : part;
    ui.addRoom = ui.settingsPart === 'add' ? { name: '', thermostats: [] } : null;
    ui.picker = null;
    ui.confirming = null;
  });
}

/**
 * Open a section of a room's Setup view, or close it.
 * @param {import('../context.js').Context} ctx
 * @param {string} part "th", "win" or "rs"
 */
export function toggleSetupPart(ctx, part) {
  ctx.store.update(({ ui }) => {
    ui.setupPart = ui.setupPart === part ? null : part;
    ui.picker = null;
  });
}

/**
 * From the settings page, open a room's Setup view.
 * @param {import('../context.js').Context} ctx
 * @param {string} room its id
 */
export function goToSetup(ctx, room) {
  ctx.store.update(({ ui }) => {
    Object.assign(ui, { view: 'rooms', openRoom: room, setupPart: null, picker: null });
    ui.tab[room] = 'setup';
  });
}

/**
 * The layout this browser picked last, if any.
 * @returns {'dial' | 'compact' | null}
 */
export function rememberedLayout() {
  try {
    const layout = localStorage.getItem(LAYOUT_KEY);
    return layout === 'dial' || layout === 'compact' ? layout : null;
  } catch {
    // No storage (a private window, or blocked): the card's option decides.
    return null;
  }
}

/**
 * Switch between the dial and the slider, and remember it in this browser.
 * @param {import('../context.js').Context} ctx
 */
export function toggleLayout(ctx) {
  ctx.store.update(({ ui }) => (ui.layout = ui.layout === 'dial' ? 'compact' : 'dial'));
  try {
    localStorage.setItem(LAYOUT_KEY, ctx.store.ui.layout);
  } catch {
    // No storage: the layout holds until the page is reloaded.
  }
}

/**
 * Dismiss a Weekheat notification.
 * @param {import('../context.js').Context} ctx
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export function dismiss(ctx, id) {
  return attempt(ctx, () => dismissNotification(ctx.gateway, id));
}
