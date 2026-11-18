// The blueprints in Home Assistant: whether they are older than this card needs, and updating
// them to the ones of this card's release (HACS updates only the card).

import { BLUEPRINT_REPO, DAY_BLUEPRINT, ROOM_BLUEPRINT } from '../domain/constants.js';
import { blueprintVersion, olderVersion } from '../domain/versions.js';
import { BLUEPRINT_VERSION } from '../version.js';

/**
 * @typedef {object} OldBlueprint A blueprint older than the card needs.
 * @property {'automation' | 'script'} domain
 * @property {string} path where Home Assistant has it, e.g. "ekienmeier/weekheat_room.yaml"
 * @property {string} file its file name
 * @property {string | null} installed the release it is marked with, or null
 */

/**
 * The blueprint of a domain if it is older than the card needs.
 * @param {'automation' | 'script'} domain
 * @param {Record<string, any>} list what `blueprint/list` returned for the domain
 * @param {string} file the blueprint's file name
 * @returns {OldBlueprint[]} it, or nothing
 */
function outdated(domain, list, file) {
  const path = Object.keys(list).find((key) => key.endsWith(file));
  if (!path) return [];
  const installed = blueprintVersion(list[path]?.metadata?.description);
  return olderVersion(installed, BLUEPRINT_VERSION) ? [{ domain, path, file, installed }] : [];
}

/**
 * Admin: the installed blueprints, and those older than this card needs.
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
  ];
  return { automations, old };
}

/**
 * Admin: replace a blueprint with the one of this card's release (its tag on GitHub), as Home
 * Assistant's "Re-import" does, keeping `main` as its source.
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
 * Admin: replace old blueprints with those of this card's release, then reload automations and
 * scripts so that the rooms use them.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {OldBlueprint[]} old
 * @returns {Promise<void>}
 */
export async function updateBlueprints(gateway, old) {
  for (const blueprint of old) await replaceBlueprint(gateway, blueprint);
  await gateway.service('automation', 'reload');
  await gateway.service('script', 'reload');
}
