// The Plan view's editor (admin): periods, renaming, saving, adding and deleting plans.

import {
  DAY_MINUTES,
  MAX_T,
  MIN_T,
  NEW_PERIOD_T,
  OFF_T,
  ON_AGAIN_T,
  PLAN_STEP,
} from '../../domain/constants.js';
import { snap } from '../../domain/dial.js';
import { CardError } from '../../domain/errors.js';
import { checkPeriods, periodTemp, STARTER } from '../../domain/periods.js';
import { createPlan, deletePlan, savePlan } from '../../ha/plans.js';
import { editPlan, planDraft } from '../drafts.js';
import { planName } from '../selectors.js';
import { save } from './messages.js';
import { commitRoom, poke } from './rooms.js';

/**
 * @typedef {{room: import('../../domain/room.js').Room, entity: string}} PlanRef a room's plan
 */

/**
 * Edit a period, or stop editing it.
 * @param {import('../context.js').Context} ctx
 * @param {PlanRef} plan
 * @param {number} index
 */
export function togglePeriod(ctx, { room, entity }, index) {
  ctx.store.update(({ ui }) => {
    const same =
      ui.period?.room === room.id && ui.period.plan === entity && ui.period.index === index;
    ui.period = same ? null : { room: room.id, plan: entity, index };
  });
}

/**
 * Change a period's temperature by some steps.
 * @param {import('../context.js').Context} ctx
 * @param {PlanRef} plan
 * @param {{index: number, steps: number}} change
 */
export function stepPeriod(ctx, plan, { index, steps }) {
  editPlan(ctx, plan, (draft) => {
    const period = draft.periods[index];
    const value = (period.temperature ?? NEW_PERIOD_T) + steps * PLAN_STEP;
    period.temperature = snap(value, { low: MIN_T, high: MAX_T, step: PLAN_STEP });
  });
}

/**
 * Change a period's start.
 * @param {import('../context.js').Context} ctx
 * @param {PlanRef} plan
 * @param {{index: number, start: number}} change minutes since midnight
 */
export function setPeriodStart(ctx, plan, { index, start }) {
  editPlan(ctx, plan, (draft) => (draft.periods[index].start = start));
}

/**
 * Make a period Off, or switch it back on (with a temperature if it has none).
 * @param {import('../context.js').Context} ctx
 * @param {PlanRef} plan
 * @param {{index: number, off: boolean}} change
 */
export function setPeriodOff(ctx, plan, { index, off }) {
  editPlan(ctx, plan, (draft) => {
    const period = draft.periods[index];
    period.off = off;
    if (!off && (period.temperature == null || period.temperature === OFF_T))
      period.temperature = ON_AGAIN_T;
  });
}

/**
 * Add a period an hour after the last (with its temperature), and edit it.
 * @param {import('../context.js').Context} ctx
 * @param {PlanRef} plan
 */
export function addPeriod(ctx, plan) {
  const periods = planDraft(ctx, plan.room, plan.entity).periods;
  const last = periods[periods.length - 1];
  const start = Math.min(DAY_MINUTES - 1, (last ? last.start : 0) + 60);
  if (last && start <= last.start) return;
  const temperature = last && !last.off ? periodTemp(last) : NEW_PERIOD_T;
  editPlan(ctx, plan, (draft) => draft.periods.push({ start, temperature, off: false }));
  ctx.store.update(
    ({ ui }) => (ui.period = { room: plan.room.id, plan: plan.entity, index: periods.length }),
  );
}

/**
 * Delete a period.
 * @param {import('../context.js').Context} ctx
 * @param {PlanRef} plan
 * @param {number} index
 */
export function deletePeriod(ctx, plan, index) {
  editPlan(ctx, plan, (draft) => draft.periods.splice(index, 1));
  ctx.store.update(({ ui }) => (ui.period = null));
}

/**
 * Start renaming a plan, or set its new name.
 * @param {import('../context.js').Context} ctx
 * @param {PlanRef} plan
 * @param {string | null} [name] the new name; none starts renaming
 */
export function renamePlan(ctx, plan, name = null) {
  if (name == null) ctx.store.update(({ ui }) => (ui.renaming = plan.entity));
  else editPlan(ctx, plan, (draft) => (draft.name = name));
}

/**
 * Throw away a plan's draft.
 * @param {import('../context.js').Context} ctx
 * @param {PlanRef} plan
 */
export function resetPlan(ctx, { entity }) {
  ctx.store.update((store) => {
    delete store.drafts.plans[entity];
    Object.assign(store.ui, { period: null, renaming: null });
  });
}

/**
 * Save a plan's draft as its schedule helper: its periods, and its name if it was changed.
 * @param {import('../context.js').Context} ctx
 * @param {PlanRef} plan
 * @returns {Promise<void>}
 */
async function storePlan(ctx, { room, entity }) {
  const draft = planDraft(ctx, room, entity);
  const [problem] = checkPeriods(draft.periods);
  if (problem) throw new CardError(problem, { min: MIN_T, max: MAX_T });
  const item = ctx.store.data.plans[entity].item;
  const renamed = draft.name && draft.name !== planName(ctx, room, entity);
  const name = renamed ? `${room.name} ${draft.name}` : item.name;
  const saved = await savePlan(ctx.gateway, item, { name, periods: draft.periods });
  ctx.store.update((store) => (store.data.plans[entity] = saved));
}

/**
 * Save a plan's draft, then let the room apply it.
 * @param {import('../context.js').Context} ctx
 * @param {PlanRef} plan
 * @returns {Promise<boolean>}
 */
export function commitPlan(ctx, plan) {
  return save(ctx, async () => {
    await storePlan(ctx, plan);
    resetPlan(ctx, plan);
    await poke(ctx, [plan.room]);
  });
}

/**
 * Delete a plan; refused while the week uses it.
 * @param {import('../context.js').Context} ctx
 * @param {PlanRef} plan
 * @returns {Promise<boolean>}
 */
export function removePlan(ctx, { room, entity }) {
  return save(ctx, async () => {
    if (entity === room.free_day || Object.values(room.week || {}).includes(entity))
      throw new CardError('plan_in_use');
    await commitRoom(ctx, room, { plans: room.plans.filter((plan) => plan !== entity) });
    await deletePlan(ctx.gateway, ctx.store.data.plans[entity].item);
    ctx.store.update((store) => delete store.data.plans[entity]);
    resetPlan(ctx, { room, entity });
  });
}

/**
 * Open the new-plan form, or close it.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 */
export function toggleAddPlan(ctx, room) {
  ctx.store.update(({ ui }) => {
    ui.addPlan =
      ui.addPlan?.room === room.id
        ? null
        : { room: room.id, name: '', template: 'starter_weekday' };
  });
}

/**
 * Change a field of the new-plan form.
 * @param {import('../context.js').Context} ctx
 * @param {{name?: string, template?: string}} change
 */
export function setAddPlan(ctx, change) {
  ctx.store.update(({ ui }) => Object.assign(ui.addPlan, change));
}

/**
 * The periods a new plan starts with: a starter plan, or a copy of another plan.
 * @param {import('../context.js').Context} ctx
 * @param {string} template "starter_weekday", "starter_free" or a plan's entity id
 * @returns {import('../../domain/periods.js').Period[]}
 */
function templatePeriods(ctx, template) {
  if (template === 'starter_free') return STARTER.free;
  return ctx.store.data.plans[template]?.periods || STARTER.weekday;
}

/**
 * Create the plan of the new-plan form, add it to the room, and show it.
 * @param {import('../context.js').Context} ctx
 * @param {import('../../domain/room.js').Room} room
 * @returns {Promise<boolean>}
 */
export function addPlan(ctx, room) {
  const { name, template } = ctx.store.ui.addPlan;
  if (!name.trim()) return Promise.resolve(false);
  return save(ctx, async () => {
    const periods = templatePeriods(ctx, template);
    const made = await createPlan(ctx.gateway, { room: room.name, name: name.trim(), periods });
    ctx.store.update((store) => (store.data.plans[made.entity] = made.plan));
    await commitRoom(ctx, room, { plans: [...room.plans, made.entity] });
    ctx.store.update(({ ui }) =>
      Object.assign(ui, { addPlan: null, plan: { ...ui.plan, [room.id]: made.entity } }),
    );
  });
}
