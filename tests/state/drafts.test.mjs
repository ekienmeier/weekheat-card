// Tests of src/state/drafts.js and the editors' actions: drafts are per editor (review M1) and
// made on the first edit only (M15).
import test from 'node:test';
import assert from 'node:assert/strict';
import { isPlanDirty, planDraft } from '../../src/state/drafts.js';
import {
  addPeriod,
  commitPlan,
  setPeriodOff,
  stepPeriod,
} from '../../src/state/actions/plan-editor.js';
import { resetWeek, setWeekDay } from '../../src/state/actions/week.js';
import { contextWith } from './fake-context.mjs';

test('reading a plan makes no draft; editing makes one for that plan only', () => {
  const { ctx } = contextWith();
  const [room] = ctx.store.data.rooms;
  assert.equal(planDraft(ctx, room, room.plans[0]).periods.length, 1);
  assert.deepEqual(ctx.store.drafts.plans, {});
  stepPeriod(ctx, { room, entity: room.plans[0] }, { index: 0, steps: 2 });
  assert.deepEqual(Object.keys(ctx.store.drafts.plans), [room.plans[0]]);
  assert.equal(planDraft(ctx, room, room.plans[0]).periods[0].temperature, 21);
  assert.equal(
    ctx.store.data.plans[room.plans[0]].periods[0].temperature,
    20,
    'the loaded plan is untouched',
  );
  assert.ok(isPlanDirty(ctx, room, room.plans[0]));
});

/**
 * A context whose Home Assistant saves plans, with drafts of both bathroom plans and its week.
 * @returns {{ctx: any, room: any, first: any}}
 */
function editingBathroom() {
  const saved = { id: 'p0', monday: [] };
  const { ctx } = contextWith({
    ws: (message) => (message.type === 'schedule/update' ? saved : null),
  });
  const [room] = ctx.store.data.rooms;
  const [first, second] = room.plans.map((entity) => ({ room, entity }));
  stepPeriod(ctx, first, { index: 0, steps: 1 });
  stepPeriod(ctx, second, { index: 0, steps: -1 });
  setWeekDay(ctx, room, { day: 'mon', plan: room.plans[1] });
  return { ctx, room, first };
}

test('saving one plan keeps the drafts of the other plan and of the week (M1)', async () => {
  const { ctx, room, first } = editingBathroom();
  assert.ok(await commitPlan(ctx, first));
  assert.deepEqual(Object.keys(ctx.store.drafts.plans), [room.plans[1]]);
  assert.ok(ctx.store.drafts.weeks[room.id]);
  resetWeek(ctx, room);
  assert.deepEqual(
    Object.keys(ctx.store.drafts.plans),
    [room.plans[1]],
    'cancelling the week keeps plan drafts',
  );
});

test('a new period starts an hour after the last, with its temperature', () => {
  const { ctx } = contextWith();
  const [room] = ctx.store.data.rooms;
  const plan = { room, entity: room.plans[0] };
  addPeriod(ctx, plan);
  assert.deepEqual(planDraft(ctx, room, plan.entity).periods[1], {
    start: 60,
    temperature: 20,
    off: false,
  });
  assert.deepEqual(ctx.store.ui.period, { room: room.id, plan: plan.entity, index: 1 });
  setPeriodOff(ctx, plan, { index: 1, off: true });
  setPeriodOff(ctx, plan, { index: 1, off: false });
  assert.equal(planDraft(ctx, room, plan.entity).periods[1].temperature, 20);
});
