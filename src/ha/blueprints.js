// The blueprints in Home Assistant: whether they are older than this card needs or missing, and
// updating them to the ones of this card's release (HACS updates only the card). The valve
// exercise blueprint also needs a script made from it, which the room automations call; the card
// creates it. Saving the rooms and the day script is not done here.

import {
  BLUEPRINT_FOLDER,
  BLUEPRINT_REPO,
  DAY_BLUEPRINT,
  EXERCISE_ALIAS,
  EXERCISE_BLUEPRINT,
  EXERCISE_SCRIPT,
  ROOM_BLUEPRINT,
} from '../domain/constants.js';
import { blueprintVersion, olderVersion } from '../domain/versions.js';
import { BLUEPRINT_VERSION } from '../version.js';

/**
 * @typedef {object} OldBlueprint A blueprint to save: older than the card needs, not installed
 *   (the valve exercise), or current but without the script made from it.
 * @property {'automation' | 'script'} domain
 * @property {string} path where Home Assistant has it, or will have it, e.g.
 *   "ekienmeier/weekheat_room.yaml"
 * @property {string} file its file name
 * @property {string | null} installed the release it is marked with, or null (unmarked, missing)
 * @property {boolean} [current] it is current: only its script is missing
 * @property {string} [script] the script to create from it if there is none, e.g.
 *   "script.weekheat_exercise"
 */

/**
 * The installed path of a blueprint, and the release it is marked with.
 * @param {Record<string, any>} list what `blueprint/list` returned for its domain
 * @param {string} file the blueprint's file name
 * @returns {{path: string | undefined, installed: string | null}}
 */
function installedBlueprint(list, file) {
  const path = Object.keys(list).find((key) => key.endsWith(file));
  return { path, installed: path ? blueprintVersion(list[path]?.metadata?.description) : null };
}

/**
 * The blueprint of a domain if it is older than the card needs (a missing one is not the card's
 * to install: the room and day blueprints are imported by hand when Weekheat is set up).
 * @param {'automation' | 'script'} domain
 * @param {Record<string, any>} list what `blueprint/list` returned for the domain
 * @param {string} file the blueprint's file name
 * @returns {OldBlueprint[]} it, or nothing
 */
function outdated(domain, list, file) {
  const { path, installed } = installedBlueprint(list, file);
  if (!path) return [];
  return olderVersion(installed, BLUEPRINT_VERSION) ? [{ domain, path, file, installed }] : [];
}

/**
 * The valve exercise blueprint if it is missing or old, or its script is missing (it came with
 * 0.14; before, the room blueprint did the exercise itself).
 * @param {Record<string, any>} list what `blueprint/list` returned for scripts
 * @param {Record<string, unknown>} states every entity's state
 * @returns {OldBlueprint[]} it, or nothing
 */
function exerciseNeeds(list, states) {
  const { path, installed } = installedBlueprint(list, EXERCISE_BLUEPRINT);
  const current = Boolean(path) && !olderVersion(installed, BLUEPRINT_VERSION);
  if (current && states[EXERCISE_SCRIPT]) return [];
  const where = path || `${BLUEPRINT_FOLDER}/${EXERCISE_BLUEPRINT}`;
  const need = { domain: /** @type {const} */ ('script'), path: where, installed, current };
  return [{ ...need, file: EXERCISE_BLUEPRINT, script: EXERCISE_SCRIPT }];
}

/**
 * Admin: the installed blueprints, and those to save (see OldBlueprint).
 * @param {import('./gateway.js').Gateway} gateway
 * @returns {Promise<{automations: Record<string, any>, old: OldBlueprint[]}>}
 */
export async function blueprintStatus(gateway) {
  const [automations, scripts] = await Promise.all([
    gateway.ws({ type: 'blueprint/list', domain: 'automation' }),
    gateway.ws({ type: 'blueprint/list', domain: 'script' }),
  ]);
  const old = [
    ...outdated('automation', automations, ROOM_BLUEPRINT),
    ...outdated('script', scripts, DAY_BLUEPRINT),
    ...exerciseNeeds(scripts, gateway.states),
  ];
  return { automations, old };
}

/**
 * Admin: replace a blueprint with the one of this card's release (its tag on GitHub), as Home
 * Assistant's "Re-import" does, keeping `main` as its source. A missing one is saved anew.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {OldBlueprint} blueprint
 * @returns {Promise<void>}
 */
async function replaceBlueprint(gateway, blueprint) {
  const file = `blueprints/${blueprint.domain}/${blueprint.file}`;
  const url = `${BLUEPRINT_REPO}v${BLUEPRINT_VERSION}/${file}`;
  const imported = await gateway.ws({ type: 'blueprint/import', url });
  const path = blueprint.path.replace(/\.yaml$/, '');
  const save = { domain: blueprint.domain, path, yaml: imported.raw_data, allow_override: true };
  await gateway.ws({
    type: 'blueprint/save',
    ...save,
    source_url: `${BLUEPRINT_REPO}main/${file}`,
  });
}

/**
 * Admin: create the script a blueprint needs (the valve exercise's), unless it exists. It has no
 * inputs; Home Assistant loads it when it is saved.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {OldBlueprint} blueprint
 * @returns {Promise<void>}
 */
async function createScript(gateway, blueprint) {
  if (!blueprint.script || gateway.states[blueprint.script]) return;
  const id = blueprint.script.replace(/^script\./, '');
  const use = { path: blueprint.path, input: {} };
  await gateway.saveConfig(`script/config/${id}`, { alias: EXERCISE_ALIAS, use_blueprint: use });
}

/**
 * Admin: save the blueprints of this card's release where they are old or missing, reload
 * automations and scripts so that the rooms use them, then create the scripts they need.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {OldBlueprint[]} old
 * @returns {Promise<void>}
 */
export async function updateBlueprints(gateway, old) {
  for (const blueprint of old) if (!blueprint.current) await replaceBlueprint(gateway, blueprint);
  await gateway.service('automation', 'reload');
  await gateway.service('script', 'reload');
  for (const blueprint of old) await createScript(gateway, blueprint);
}
