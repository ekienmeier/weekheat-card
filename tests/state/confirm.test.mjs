// Tests of src/state/actions/confirm.js: two-step buttons ask first, act on the second press.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIRM_MS, confirmed } from '../../src/state/actions/confirm.js';
import { selectPlan, showView } from '../../src/state/actions/navigation.js';
import { contextWith } from './fake-context.mjs';

/** The key of the bathroom's first plan's delete button. */
const DELETE = 'delete:schedule.bad_werktag';

test('the first press asks, the second press acts', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const { ctx } = contextWith();
  let done = 0;
  const act = () => (done += 1);
  confirmed(ctx, DELETE, act);
  assert.equal(ctx.store.ui.confirming, DELETE);
  assert.equal(done, 0);
  confirmed(ctx, DELETE, act);
  assert.equal(done, 1);
  assert.equal(ctx.store.ui.confirming, null);
});

test('another two-step button asks in its place, without either acting', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const { ctx } = contextWith();
  let done = 0;
  confirmed(ctx, DELETE, () => (done += 1));
  confirmed(ctx, 'exercise', () => (done += 10));
  assert.equal(ctx.store.ui.confirming, 'exercise');
  assert.equal(done, 0);
});

test('moving elsewhere or waiting stops asking, without acting', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const { ctx } = contextWith();
  const act = () => assert.fail('acted');
  confirmed(ctx, 'exercise', act);
  showView(ctx, 'settings');
  assert.equal(ctx.store.ui.confirming, null);
  confirmed(ctx, DELETE, act);
  selectPlan(ctx, 'weekheat_bad', 'schedule.bad_frei');
  assert.equal(ctx.store.ui.confirming, null);
  confirmed(ctx, DELETE, act);
  context.mock.timers.tick(CONFIRM_MS);
  assert.equal(ctx.store.ui.confirming, null);
});
