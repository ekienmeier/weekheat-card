// Screenshots of a Home Assistant dashboard for development, with Playwright (Chromium).
// Env: HA_URL, HA_TOKEN (a long-lived token), OUT (directory), DARK=1 for the dark theme,
// CARD: a card file to use instead of the installed one. Args: dashboard path, then steps:
//   shot:<name>          screenshot of the first weekheat-card as <name>.png
//   click:<css>          click an element (CSS pierces shadow DOM)
//   fill:<css>=<value>   fill an input and fire change
//   select:<css>=<value> choose a select option
//   wait:<ms>            wait
//   width:<px>           viewport width
//   slide:<x>            drag the first slider's knob to x (0..1 along the bar)
//   size:<w>x<h>         viewport size
//   page:<name>          screenshot of the visible page (dialogs included) as <name>.png
//   key:<key>            press a key (e.g. Escape)
//   nowrite              the card writes nothing to HA (its writes are dropped)
//   fake:<entity>=<v>    the card sees setpoint <v> for <entity> (nothing is written)
//   drag:<x>,<y>         drag the first dial's handle to (x, y) in dial coordinates (0..200)
// Example: node shoot.mjs /weekheat-test/w shot:start 'click:[data-a=toggle]' shot:open
import { chromium } from 'playwright';

const [, , path, ...steps] = process.argv;
const url = process.env.HA_URL.replace(/\/$/, '');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 1400 }, deviceScaleFactor: 1.5 });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
page.on('dialog', (d) => d.accept());
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
// Serve the working copy (CARD, a file path) in place of the card installed from the Marketplace.
if (process.env.CARD) {
  const { readFileSync } = await import('node:fs');
  await page.route('**/community/weekheat-card/weekheat-card.js*', (r) => r.fulfill({ contentType: 'text/javascript', body: readFileSync(process.env.CARD, 'utf8') }));
}
await page.goto(`${url}/manifest.json`);
await page.evaluate(({ url, token, dark }) => {
  localStorage.setItem('hassTokens', JSON.stringify({
    hassUrl: url, clientId: `${url}/`, access_token: token, token_type: 'Bearer', refresh_token: 'none',
    expires_in: 1e9, expires: Date.now() + 1e12,
  }));
  localStorage.setItem('selectedLanguage', JSON.stringify('de'));
  if (dark) localStorage.setItem('selectedTheme', JSON.stringify({ theme: 'default', dark: true }));
}, { url, token: process.env.HA_TOKEN, dark: !!process.env.DARK });
await page.goto(`${url}${path}`);
try {
  await page.waitForSelector('weekheat-card', { timeout: 30000 });
} catch (e) {
  await page.screenshot({ path: `${process.env.OUT}/fail.png` });
  console.log('no card; page at', page.url(), '\n' + logs.join('\n'));
  process.exit(1);
}
await page.waitForTimeout(6000);
const card = page.locator(process.env.CARD_SEL || 'weekheat-card').first();
for (const s of steps) {
  const [cmd, ...rest] = s.split(':');
  const arg = rest.join(':');
  if (cmd === 'shot') await card.screenshot({ path: `${process.env.OUT}/${arg}.png` });
  else if (cmd === 'click') { await card.locator(arg).first().click(); await page.waitForTimeout(800); }
  else if (cmd === 'fill') { const k = arg.lastIndexOf('='); const sel = arg.slice(0, k); const v = arg.slice(k + 1); await card.locator(sel).first().fill(v); await card.locator(sel).first().dispatchEvent('change'); await page.waitForTimeout(400); }
  else if (cmd === 'select') { const k = arg.lastIndexOf('='); const sel = arg.slice(0, k); const v = arg.slice(k + 1); await card.locator(sel).first().selectOption(v); await page.waitForTimeout(400); }
  else if (cmd === 'wait') await page.waitForTimeout(+arg);
  else if (cmd === 'drag') {
    const svg = card.locator('svg[data-dial]').first();
    const b = await svg.boundingBox();
    const at = (x, y) => [b.x + (x / 200) * b.width, b.y + (y / 200) * b.height];
    const h = await card.locator('svg[data-dial] .dhandle').first().boundingBox();
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await page.mouse.down();
    const [x, y] = arg.split(',').map(Number);
    for (let i = 1; i <= 10; i++) { const [px, py] = at(100 + ((x - 100) * i) / 10, 100 + ((y - 100) * i) / 10); await page.mouse.move(px, py); }
    const [px, py] = at(x, y);
    await page.mouse.move(px, py);
    await card.screenshot({ path: `${process.env.OUT}/dragging.png` });
    await page.mouse.up();
    await page.waitForTimeout(800);
  }
  else if (cmd === 'slide') {
    const bar = await card.locator('[data-slider] .sbar').first().boundingBox();
    const k = await card.locator('[data-slider] .sknob').first().boundingBox();
    const y = bar.y + bar.height / 2;
    await page.mouse.move(k.x + k.width / 2, y);
    await page.mouse.down();
    const tx = bar.x + +arg * bar.width;
    for (let i = 1; i <= 10; i++) await page.mouse.move(k.x + k.width / 2 + ((tx - k.x - k.width / 2) * i) / 10, y);
    await card.screenshot({ path: `${process.env.OUT}/sliding.png` });
    await page.mouse.up();
    await page.waitForTimeout(800);
  }
  else if (cmd === 'width') await page.setViewportSize({ width: +arg, height: 1400 });
  else if (cmd === 'size') { const [w, h] = arg.split('x').map(Number); await page.setViewportSize({ width: w, height: h }); }
  else if (cmd === 'page') await page.screenshot({ path: `${process.env.OUT}/${arg}.png` });
  else if (cmd === 'key') { await page.keyboard.press(arg); await page.waitForTimeout(500); }
  else if (cmd === 'nowrite' || cmd === 'fake') {
    // nowrite: every service call of the card is dropped (also via its own hass object).
    // fake:<entity>=<setpoint>: the card sees this setpoint instead of the real one.
    const k = arg.lastIndexOf('=');
    const over = cmd === 'fake' ? [arg.slice(0, k), +arg.slice(k + 1)] : null;
    await card.evaluate((el, [nowrite, over]) => {
      if (nowrite) el.__nowrite = true;
      if (over) el.__over = { ...(el.__over || {}), [over[0]]: over[1] };
      if (!el.__wrapped) {
        const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'hass');
        Object.defineProperty(el, 'hass', { configurable: true, get() { return el._hass; }, set(h) {
          el.__raw = h;
          const states = { ...h.states };
          for (const [id, t] of Object.entries(el.__over || {})) if (states[id]) states[id] = { ...states[id], attributes: { ...states[id].attributes, temperature: t } };
          const block = el.__nowrite ? { callService: async (...a) => { console.warn('blocked', JSON.stringify(a)); } } : {};
          desc.set.call(el, { ...h, states, ...block });
        } });
        el.__wrapped = true;
        el.__raw = el._hass;
      }
      el.hass = el.__raw;
    }, [cmd === 'nowrite', over]);
    await page.waitForTimeout(400);
  }
}
console.log(logs.join('\n') || 'no console errors');
await browser.close();
