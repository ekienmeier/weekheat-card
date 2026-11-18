// The banners above the page: a short message, a failed load, a missing day script, outdated
// blueprints, and the notifications the room automations raised.

import { html, nothing } from 'lit';
import { fill } from '../../i18n/text.js';
import { weekheatNotes } from '../../ha/notifications.js';
import { dismiss } from '../../state/actions/navigation.js';
import { updateOldBlueprints } from '../../state/actions/admin.js';
import { texts } from '../../state/selectors.js';
import { BLUEPRINT_VERSION } from '../../version.js';
import { describe } from '../describe.js';

/**
 * The message of the last action: "Saved" or what went wrong.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
function message(ctx) {
  const shown = ctx.store.ui.message;
  if (!shown) return nothing;
  const text = texts(ctx);
  const words = shown.bad ? `${text.error}: ${describe(text, shown.error)}` : text[shown.key];
  return html`<div class="banner ${shown.bad ? 'bad' : 'ok'}" role="status">${words}</div>`;
}

/**
 * Why the card could not load, or that the day script is missing.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
function problems(ctx) {
  const { data } = ctx.store;
  const text = texts(ctx);
  const error = data.error
    ? html`<div class="banner bad">${describe(text, data.error)}</div>`
    : nothing;
  const noScript = data.rooms && data.admin && !data.script;
  return html`${error}${
    noScript ? html`<div class="banner bad">${text.no_script}</div>` : nothing
  }`;
}

/**
 * What the blueprint banner says: that blueprints are older than the card (or missing), or only
 * that the valve exercise script is missing.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {string}
 */
function blueprintWords(ctx) {
  const text = texts(ctx);
  const older = ctx.store.data.oldBlueprints.find((blueprint) => !blueprint.current);
  if (!older) return text.bp_no_exercise;
  const versions = { installed: older.installed || text.bp_none, needed: BLUEPRINT_VERSION };
  return fill(text.bp_old, versions);
}

/**
 * Admin: the blueprints are older than this card (or missing, or a script made from one), with a
 * button to update them.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
function oldBlueprints(ctx) {
  if (!ctx.store.data.admin || !ctx.store.data.oldBlueprints.length) return nothing;
  const text = texts(ctx);
  return html`<div class="banner warn">
    <span>${blueprintWords(ctx)}</span>
    <button class="btn small" @click=${() => updateOldBlueprints(ctx)}>${text.bp_update}</button>
  </div>`;
}

/**
 * The Weekheat notifications, each with a button to dismiss it.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
function notes(ctx) {
  const label = texts(ctx).dismiss;
  return weekheatNotes(ctx.store.data.notes).map(
    (note) =>
      html`<div class="banner warn">
        <span>${note.message}</span>
        <button class="link" @click=${() => dismiss(ctx, note.notification_id)}>${label}</button>
      </div>`,
  );
}

/**
 * All banners, in this order.
 * @param {import('../../state/context.js').Context} ctx
 * @returns {unknown}
 */
export function banners(ctx) {
  return html`${message(ctx)}${problems(ctx)}${oldBlueprints(ctx)}${notes(ctx)}`;
}
