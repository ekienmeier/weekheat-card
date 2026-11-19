// The card's plan-name rule (matchPlan, slugify) against the shared cases in
// tests/fixtures/plan-names.json, which tests/blueprints/test_plan_names.py checks against the room
// blueprint in a Home Assistant core: both copies of the rule agree (review M16).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchPlan, slugify } from '../../src/domain/plans.js';

/**
 * @typedef {object} PlanNameCase One case of the shared fixture.
 * @property {string} about what it shows
 * @property {string} room the room's name
 * @property {Array<[string, string | null]>} plans entity id and friendly name, in the room's order
 * @property {string} name the plan name a day carries
 * @property {string | null} match the plan it picks, or null for none
 */

/** The shared fixture: `slugs` (name and Home Assistant's slug) and `cases`. */
const FIXTURE = JSON.parse(
  readFileSync(new URL('../fixtures/plan-names.json', import.meta.url), 'utf8'),
);

test("slugify gives Home Assistant's slugs (L7)", () => {
  for (const [name, slug] of FIXTURE.slugs) assert.equal(slugify(name), slug, name);
});

test('matchPlan picks the plan the shared cases expect (M16, H2)', () => {
  for (const /** @type {PlanNameCase} */ item of FIXTURE.cases) {
    const plans = item.plans.map(([plan]) => plan);
    const named = item.plans.filter(([, friendly]) => friendly !== null);
    const friendly = Object.fromEntries(named);
    const names = { friendly, room: item.room };
    assert.equal(matchPlan(item.name, plans, names), item.match, item.about);
  }
});
