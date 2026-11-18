// A context for state tests: a store, a fake gateway with a `hass` for the selectors, a config.
import { Store } from '../../src/state/store.js';
import { makeContext } from '../../src/state/context.js';
import { roomFromInput } from '../../src/domain/room.js';
import { fakeGateway } from '../ha/fake-gateway.mjs';

/** The card's options in the tests. */
export const CONFIG = {
  days: 14,
  day_script: 'script.weekheat_day',
  layout: 'dial',
  dial_min: 5,
  dial_max: 30,
};

/** The plans of the bathroom. */
const PLANS = ['schedule.bad_werktag', 'schedule.bad_frei'];

/**
 * A room "Bad" with two plans and one thermostat.
 * @returns {import('../../src/domain/room.js').Room}
 */
export function bathroom() {
  const input = {
    room_name: 'Bad',
    thermostats: ['climate.bad'],
    plans: PLANS,
    free_day: PLANS[1],
  };
  const use = { path: 'ekienmeier/weekheat_room.yaml', input };
  const cfg = { alias: 'Weekheat Bad', use_blueprint: use };
  const automation = { entity: 'automation.weekheat_bad', id: 'weekheat_bad', cfg };
  return { ...automation, ...roomFromInput(input, cfg.alias) };
}

/**
 * The bathroom's plans as loaded: 20 °C all day.
 * @returns {Record<string, import('../../src/ha/plans.js').Plan>}
 */
function bathroomPlans() {
  const periods = [{ start: 0, temperature: 20, off: false }];
  return Object.fromEntries(
    PLANS.map((plan, i) => [plan, { item: { id: `p${i}`, name: `Bad P${i}` }, periods }]),
  );
}

/**
 * A context with the bathroom loaded, for an administrator; `gateway` is a fakeGateway.
 * @param {import('../ha/fake-gateway.mjs').FakeSetup} [setup]
 * @returns {{ctx: import('../../src/state/context.js').Context, gateway: any}}
 */
export function contextWith(setup = {}) {
  const gateway = fakeGateway(setup);
  const config = { time_zone: 'Europe/Vienna' };
  gateway.hass = { states: gateway.states, config, locale: { language: 'de' } };
  const ctx = makeContext({ store: new Store(), gateway, config: CONFIG });
  const room = bathroom();
  Object.assign(ctx.store.data, {
    admin: true,
    rooms: [room],
    allRooms: [room],
    plans: bathroomPlans(),
  });
  return { ctx, gateway };
}
