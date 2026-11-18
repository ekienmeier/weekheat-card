// Tests of src/state/actions/control.js: values show at once and are written once, after a wait.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  endDrag,
  dragTo,
  setTarget,
  stepTarget,
  WRITE_DELAY,
} from '../../src/state/actions/control.js';
import { shownValue } from '../../src/state/selectors.js';
import { contextWith } from './fake-context.mjs';

/**
 * A context whose bathroom thermostat is at 20 °C (step 0.5).
 * @returns {{ctx: any, gateway: any}}
 */
function warmBathroom() {
  const states = {
    'climate.bad': {
      entity_id: 'climate.bad',
      state: 'heat',
      attributes: { temperature: 20, target_temp_step: 0.5 },
    },
  };
  return contextWith({ states });
}

/**
 * The set_temperature calls of a fake, as [thermostats, temperature].
 * @param {any} gateway
 * @returns {Array<[string[], number]>}
 */
function writes(gateway) {
  return gateway.calls
    .filter((call) => call[1] === 'climate.set_temperature')
    .map(([, , data]) => [data.entity_id, data.temperature]);
}

test('steps show at once and make one write after the wait', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const { ctx, gateway } = warmBathroom();
  const [room] = ctx.store.data.rooms;
  stepTarget(ctx, room, { th: '', steps: 1 });
  stepTarget(ctx, room, { th: '', steps: 1 });
  assert.equal(shownValue(ctx, room, ''), 21);
  assert.deepEqual(writes(gateway), []);
  context.mock.timers.tick(WRITE_DELAY.step);
  assert.deepEqual(writes(gateway), [[['climate.bad'], 21]]);
});

test('a value is snapped to the step and kept in range', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const { ctx, gateway } = warmBathroom();
  const [room] = ctx.store.data.rooms;
  setTarget(ctx, room, { value: 40, delay: 10 });
  context.mock.timers.tick(10);
  setTarget(ctx, room, { value: 21.3, delay: 10 });
  context.mock.timers.tick(10);
  assert.deepEqual(
    writes(gateway).map(([, value]) => value),
    [30, 21.5],
  );
});

test('a drag shows where it is and writes when let go; cancelled, nothing', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const { ctx, gateway } = warmBathroom();
  const [room] = ctx.store.data.rooms;
  dragTo(ctx, room, { th: '', value: 23 });
  assert.equal(shownValue(ctx, room, ''), 23);
  endDrag(ctx, { cancelled: true });
  context.mock.timers.tick(WRITE_DELAY.drag);
  assert.deepEqual(writes(gateway), []);
  dragTo(ctx, room, { th: '', value: 22 });
  endDrag(ctx, { cancelled: false });
  context.mock.timers.tick(WRITE_DELAY.drag);
  assert.deepEqual(writes(gateway), [[['climate.bad'], 22]]);
});
