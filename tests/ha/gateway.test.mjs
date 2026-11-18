// Tests of src/ha/gateway.js: only "not found" counts as no configuration (review H4).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Gateway } from '../../src/ha/gateway.js';

/**
 * A fake `hass` whose callApi answers from a table; a function in it is called (it may throw).
 * @param {Record<string, any>} answers by "METHOD path"
 * @returns {any}
 */
function hassAnswering(answers) {
  return {
    callApi: async (method, path) => {
      const answer = answers[`${method} ${path}`];
      return typeof answer === 'function' ? answer() : answer;
    },
  };
}

test('readConfig: a configuration, null if there is none, rejects on other failures', async () => {
  const fail = (status) => () => {
    throw { error: `Response error: ${status}`, status_code: status };
  };
  const gateway = new Gateway(
    hassAnswering({
      'GET config/automation/config/a': { alias: 'A' },
      'GET config/automation/config/yaml': fail(404),
      'GET config/automation/config/busy': fail(500),
    }),
  );
  assert.deepEqual(await gateway.readConfig('automation/config/a'), { alias: 'A' });
  assert.equal(await gateway.readConfig('automation/config/yaml'), null);
  await assert.rejects(gateway.readConfig('automation/config/busy'));
});
