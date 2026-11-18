// Two-step buttons for actions that cannot be undone (deleting a plan, running the valve exercise
// now): the first press asks ("Really delete?"), the second acts. They replace the browser's
// confirm(), which ignores the Home Assistant theme and blocks the page. The views decide what
// the button reads; this module only keeps which action is being asked about.

/** How long a button keeps asking, in ms, before it reads as before. */
export const CONFIRM_MS = 5000;

/**
 * Press a two-step button: the first press asks (and stops asking after CONFIRM_MS), a second
 * press of the same button while it asks runs the action.
 * @param {import('../context.js').Context} ctx
 * @param {string} key which action, e.g. "delete:schedule.bad_werktag" or "exercise"
 * @param {() => unknown} act what the second press does
 * @returns {unknown} what the action returned (undefined on the first press)
 */
export function confirmed(ctx, key, act) {
  clearTimeout(ctx.timers.confirm);
  if (ctx.store.ui.confirming === key) {
    ctx.store.update(({ ui }) => (ui.confirming = null));
    return act();
  }
  ctx.store.update(({ ui }) => (ui.confirming = key));
  const stop = () => ctx.store.ui.confirming === key && cancelConfirm(ctx);
  ctx.timers.confirm = setTimeout(stop, CONFIRM_MS);
  return undefined;
}

/**
 * Stop asking: the two-step button reads as before.
 * @param {import('../context.js').Context} ctx
 */
export function cancelConfirm(ctx) {
  clearTimeout(ctx.timers.confirm);
  ctx.store.update(({ ui }) => (ui.confirming = null));
}
