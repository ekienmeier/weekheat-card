// Short messages after an action: "Saved", or what went wrong, shown for a few seconds.

/** How long a message shows, in ms: errors longer, to be read. */
const SHOWN_MS = { ok: 2500, bad: 8000 };

/**
 * Show a message for a while.
 * @param {import('../context.js').Context} ctx
 * @param {{key?: string, error?: unknown, bad: boolean}} message a text's key, or an error
 */
export function flash(ctx, message) {
  ctx.store.update((store) => (store.ui.message = message));
  clearTimeout(ctx.timers.message);
  const hide = () => ctx.store.update((store) => (store.ui.message = null));
  ctx.timers.message = setTimeout(hide, message.bad ? SHOWN_MS.bad : SHOWN_MS.ok);
}

/**
 * Run a task; on failure, show its error.
 * @param {import('../context.js').Context} ctx
 * @param {() => Promise<unknown>} task
 * @returns {Promise<boolean>} whether it succeeded
 */
export async function attempt(ctx, task) {
  try {
    await task();
    return true;
  } catch (error) {
    flash(ctx, { error, bad: true });
    return false;
  }
}

/**
 * Run a task that saves something; say "Saved" when it worked, else show its error.
 * @param {import('../context.js').Context} ctx
 * @param {() => Promise<unknown>} task
 * @returns {Promise<boolean>} whether it succeeded
 */
export async function save(ctx, task) {
  const done = await attempt(ctx, task);
  if (done) flash(ctx, { key: 'saved', bad: false });
  return done;
}
