// Admin: the home's day settings, which are the day script's blueprint inputs.

/**
 * Save changed inputs of the day script.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {{id: string, script: any, input: Record<string, unknown>}} change the script's id, its
 *   configuration as read, and the inputs that change
 * @returns {Promise<any>} the configuration as saved
 */
export async function saveDayScript(gateway, { id, script, input }) {
  const use = script.use_blueprint;
  const cfg = { ...script, use_blueprint: { ...use, input: { ...use.input, ...input } } };
  await gateway.saveConfig(`script/config/${id}`, cfg);
  return cfg;
}
