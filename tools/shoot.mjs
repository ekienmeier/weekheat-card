// Screenshots of a Home Assistant dashboard for development, with Playwright (Chromium).
//
// It is read-only unless WRITE=1: every WebSocket command that could change something (service
// calls other than the day script, create/update/delete/save commands, events, system data) is
// answered with an error instead of being sent, and REST calls other than GET are refused. The
// refused commands are written to OUT/refused.json.
//
// Environment: HA_URL, HA_TOKEN (a long-lived token), OUT (a directory), DARK=1 for the dark
// theme, CARD=<file> to use instead of the installed card, WRITE=1 to allow writes.
// Arguments: the dashboard path, then steps:
//   shot:<name>          screenshot of the first weekheat-card as <name>.png
//   page:<name>          screenshot of the visible page (dialogs included)
//   click:<css>          click an element (CSS pierces shadow DOM)
//   fill:<css>=<value>   fill an input
//   select:<css>=<value> choose a select option
//   key:<key>            press a key (e.g. Escape, ArrowUp)
//   wait:<ms>            wait
//   width:<px>           viewport width;  size:<w>x<h>  viewport size
//   drag:<x>,<y>         drag the first dial's handle to (x, y) in dial coordinates (0..200)
//   slide:<x>            drag the first slider's knob to x (0..1 along the bar)
//   fake:<entity>=<v>    the card sees setpoint <v> for <entity> (nothing is written)
// Example: node tools/shoot.mjs /weekheat-test/w shot:start 'click:.room-head' shot:open
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

/** WebSocket commands that change something: refused unless WRITE=1. */
const WRITES = /\/(create|update|delete|save|import|set_system_data|set_user_data)$/;

/** Other WebSocket commands that change something. */
const WRITE_TYPES = ['fire_event', 'execute_script', 'call_service'];

/** What a refused command is answered with. */
const REFUSAL = {
  code: 'read_only',
  message: 'tools/shoot.mjs is read-only (WRITE=1 allows writes)',
};

/**
 * @typedef {object} Run What a run works with.
 * @property {import('playwright').Page} page
 * @property {import('playwright').Locator} card the first weekheat-card
 * @property {string} out where screenshots go
 */

/**
 * The options from the environment and the arguments.
 * @param {NodeJS.ProcessEnv} env
 * @param {string[]} args
 * @returns {Record<string, any>}
 */
function readOptions(env, args) {
  const [path, ...steps] = args;
  if (!env.HA_URL || !env.HA_TOKEN || !env.OUT || !path) {
    throw new Error('Set HA_URL, HA_TOKEN and OUT, and give a dashboard path (see the header).');
  }
  const { HA_TOKEN: token, OUT: out, CARD: card } = env;
  const flags = { dark: env.DARK === '1', writes: env.WRITE === '1' };
  return { url: env.HA_URL.replace(/\/$/, ''), token, out, card, path, steps, ...flags };
}

/**
 * Does a WebSocket message from the page change something? The day script only reads.
 * @param {Record<string, any>} message
 * @returns {boolean}
 */
function isWrite(message) {
  const { type, domain, service } = message;
  if (type === 'call_service' && domain === 'script' && service === 'weekheat_day') return false;
  return WRITE_TYPES.includes(type) || WRITES.test(String(type));
}

/**
 * Answer write commands over the WebSocket with an error instead of sending them.
 * @param {import('playwright').WebSocketRoute} socket
 * @param {{logs: string[], refused: object[]}} notes where refused commands are noted
 */
function guardSocket(socket, { logs, refused }) {
  const server = socket.connectToServer();
  socket.onMessage((text) => {
    const message = JSON.parse(String(text));
    if (!isWrite(message)) return server.send(text);
    logs.push(`refused (read-only): ${JSON.stringify(message).slice(0, 160)}`);
    refused.push(message);
    socket.send(JSON.stringify({ id: message.id, type: 'result', success: false, error: REFUSAL }));
  });
}

/**
 * Make the page read-only: write commands are refused, over the WebSocket and REST.
 * @param {import('playwright').Page} page
 * @param {{logs: string[], refused: object[]}} notes
 * @returns {Promise<void>}
 */
async function readOnly(page, notes) {
  await page.routeWebSocket(/\/api\/websocket/, (socket) => guardSocket(socket, notes));
  await page.route('**/api/**', (route) => {
    if (route.request().method() === 'GET') return route.continue();
    return route.fulfill({ status: 403, body: 'read-only' });
  });
}

/**
 * Note console errors and warnings, and accept dialogs (confirmations).
 * @param {import('playwright').Page} page
 * @param {string[]} logs
 */
function watchPage(page, logs) {
  const shown = ['error', 'warning'];
  const note = (message) =>
    shown.includes(message.type()) && logs.push(`${message.type()}: ${message.text()}`);
  page.on('console', note);
  page.on('pageerror', (error) => logs.push(`pageerror: ${error.message}`));
  page.on('dialog', (dialog) => dialog.accept());
}

/**
 * Open a page with the working copy of the card (if one is given), read-only unless asked.
 * @param {import('playwright').Browser} browser
 * @param {Record<string, any>} options
 * @param {{logs: string[], refused: object[]}} notes
 * @returns {Promise<import('playwright').Page>}
 */
async function openPage(browser, options, notes) {
  const page = await browser.newPage({
    viewport: { width: 480, height: 1400 },
    deviceScaleFactor: 1.5,
  });
  watchPage(page, notes.logs);
  if (!options.writes) await readOnly(page, notes);
  if (options.card) {
    const body = readFileSync(options.card, 'utf8');
    const serve = (route) => route.fulfill({ contentType: 'text/javascript', body });
    await page.route('**/weekheat-card/weekheat-card.js*', serve);
  }
  await logIn(page, options);
  return page;
}

/**
 * Log in with the token (German, dark if asked) and open the dashboard.
 * @param {import('playwright').Page} page
 * @param {Record<string, any>} options
 * @returns {Promise<void>}
 */
async function logIn(page, options) {
  const { url, token, dark } = options;
  const tokens = { hassUrl: url, clientId: `${url}/`, access_token: token, token_type: 'Bearer' };
  const lasting = { refresh_token: 'none', expires_in: 1e9, expires: Date.now() + 1e12 };
  const theme = dark ? { selectedTheme: { theme: 'default', dark: true } } : {};
  const stored = { hassTokens: { ...tokens, ...lasting }, selectedLanguage: 'de', ...theme };
  await page.goto(`${url}/manifest.json`);
  await page.evaluate((items) => {
    for (const [key, value] of Object.entries(items)) {
      globalThis.localStorage.setItem(key, JSON.stringify(value));
    }
  }, stored);
  await page.goto(`${url}${options.path}`);
}

/**
 * Drag the pointer in ten moves from one point to another, pressed.
 * @param {import('playwright').Page} page
 * @param {[number, number]} from
 * @param {[number, number]} to
 * @returns {Promise<void>}
 */
async function dragPointer(page, [fromX, fromY], [toX, toY]) {
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(fromX + ((toX - fromX) * i) / 10, fromY + ((toY - fromY) * i) / 10);
  }
}

/**
 * The centre of an element.
 * @param {import('playwright').Locator} locator
 * @returns {Promise<[number, number]>}
 */
async function centre(locator) {
  const box = await locator.boundingBox();
  return [box.x + box.width / 2, box.y + box.height / 2];
}

/**
 * Once per page: a function in the browser that gives states other setpoints (`fakes`). (It runs
 * in the browser, so it must not use anything outside itself.)
 * @param {import('playwright').Page} page
 * @returns {Promise<void>}
 */
async function installFakes(page) {
  await page.evaluate(() => {
    const attributes = (state, temperature) => ({ ...state.attributes, temperature });
    const fake = (states, fakes) =>
      Object.fromEntries(
        Object.entries(states).map(([id, state]) => [
          id,
          id in fakes ? { ...state, attributes: attributes(state, fakes[id]) } : state,
        ]),
      );
    globalThis.weekheatFakeStates ||= fake;
  });
}

/**
 * Once per card: give its gateway states with the fake setpoints (in `gateway.fakes`).
 * @param {import('playwright').Locator} card
 * @returns {Promise<void>}
 */
async function wrapGateway(card) {
  await card.evaluate((element) => {
    const gateway = element.gateway;
    if (gateway.realUse) return;
    gateway.raw = gateway.hass;
    gateway.realUse = gateway.use.bind(gateway);
    gateway.use = (hass) => {
      gateway.raw = hass;
      gateway.realUse({
        ...hass,
        states: globalThis.weekheatFakeStates(hass.states, gateway.fakes),
      });
    };
  });
}

/**
 * Make the card see a setpoint for a thermostat, without writing it.
 * @param {Run} run
 * @param {string} arg "<entity>=<setpoint>"
 * @returns {Promise<void>}
 */
async function fakeSetpoint({ page, card }, arg) {
  await installFakes(page);
  await wrapGateway(card);
  const [entity, value] = pair(arg);
  await card.evaluate(
    (element, [id, setpoint]) => {
      element.gateway.fakes = { ...element.gateway.fakes, [id]: setpoint };
      element.hass = element.gateway.raw;
    },
    [entity, Number(value)],
  );
}

/**
 * A step's argument split at its last "=" ("<css>=<value>").
 * @param {string} arg
 * @returns {[string, string]}
 */
function pair(arg) {
  const at = arg.lastIndexOf('=');
  return [arg.slice(0, at), arg.slice(at + 1)];
}

/**
 * Drag the dial's handle to a point of the dial (0..200), with a screenshot while dragging.
 * @param {Run} run
 * @param {string} arg "<x>,<y>"
 * @returns {Promise<void>}
 */
async function dragDial({ page, card, out }, arg) {
  const box = await card.locator('.dial-box svg').first().boundingBox();
  const [x, y] = arg.split(',').map(Number);
  /** @type {[number, number]} */
  const to = [box.x + (x / 200) * box.width, box.y + (y / 200) * box.height];
  await dragPointer(page, await centre(card.locator('.dial-handle').first()), to);
  await card.screenshot({ path: `${out}/dragging.png` });
  await page.mouse.up();
}

/**
 * Drag the slider's knob to a point along the bar (0..1), with a screenshot while dragging.
 * @param {Run} run
 * @param {string} arg
 * @returns {Promise<void>}
 */
async function slide({ page, card, out }, arg) {
  const bar = await card.locator('.slider-bar').first().boundingBox();
  const [knobX, knobY] = await centre(card.locator('.slider-knob').first());
  await dragPointer(page, [knobX, knobY], [bar.x + Number(arg) * bar.width, knobY]);
  await card.screenshot({ path: `${out}/sliding.png` });
  await page.mouse.up();
}

/**
 * Set the viewport's size from "<width>x<height>".
 * @param {Run} run
 * @param {string} arg
 * @returns {Promise<void>}
 */
function resize({ page }, arg) {
  const [width, height] = arg.split('x').map(Number);
  return page.setViewportSize({ width, height });
}

/**
 * The steps, by name: each takes the run and the step's argument.
 * @type {Record<string, (run: Run, arg: string) => Promise<unknown>>}
 */
const STEPS = {
  shot: ({ card, out }, arg) => card.screenshot({ path: `${out}/${arg}.png` }),
  page: ({ page, out }, arg) => page.screenshot({ path: `${out}/${arg}.png` }),
  click: ({ card }, arg) => card.locator(arg).first().click(),
  fill: ({ card }, arg) => card.locator(pair(arg)[0]).first().fill(pair(arg)[1]),
  select: ({ card }, arg) => card.locator(pair(arg)[0]).first().selectOption(pair(arg)[1]),
  key: ({ page }, arg) => page.keyboard.press(arg),
  wait: ({ page }, arg) => page.waitForTimeout(Number(arg)),
  width: ({ page }, arg) => page.setViewportSize({ width: Number(arg), height: 1400 }),
  size: resize,
  fake: fakeSetpoint,
  drag: dragDial,
  slide,
};

/**
 * Run the steps, waiting a little after each for the card to render.
 * @param {Run} run
 * @param {string[]} steps
 * @returns {Promise<void>}
 */
async function runSteps(run, steps) {
  for (const step of steps) {
    const [name, ...rest] = step.split(':');
    if (!STEPS[name]) throw new Error(`unknown step: ${step}`);
    await STEPS[name](run, rest.join(':'));
    await run.page.waitForTimeout(500);
  }
}

/**
 * Say what was logged, and keep the refused commands in OUT/refused.json.
 * @param {{logs: string[], refused: object[]}} notes
 * @param {string} out
 */
function report(notes, out) {
  if (notes.refused.length)
    writeFileSync(`${out}/refused.json`, JSON.stringify(notes.refused, null, 1));
  console.log(notes.logs.join('\n') || 'nothing logged');
}

/**
 * Open the dashboard and wait until the card has loaded.
 * @param {import('playwright').Browser} browser
 * @param {Record<string, any>} options
 * @param {{logs: string[], refused: object[]}} notes
 * @returns {Promise<Run>}
 */
async function openCard(browser, options, notes) {
  const page = await openPage(browser, options, notes);
  await page.waitForSelector('weekheat-card', { timeout: 30000 });
  await page.waitForTimeout(6000);
  return { page, card: page.locator('weekheat-card').first(), out: options.out };
}

/**
 * Open the dashboard, run the steps, then report.
 * @returns {Promise<void>}
 */
async function main() {
  const options = readOptions(process.env, process.argv.slice(2));
  const notes = { logs: [], refused: [] };
  const browser = await chromium.launch();
  try {
    await runSteps(await openCard(browser, options, notes), options.steps);
  } finally {
    report(notes, options.out);
    await browser.close();
  }
}

await main();
