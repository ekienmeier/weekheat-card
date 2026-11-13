// Screenshots of a Home Assistant dashboard for development, with Playwright (Chromium).
// Env: HA_URL, HA_TOKEN (a long-lived token), OUT (directory). Args: dashboard path, then steps:
//   shot:<name>          screenshot of the first weekheat-card as <name>.png
//   click:<css>          click an element (CSS pierces shadow DOM)
//   fill:<css>=<value>   fill an input and fire change
//   select:<css>=<value> choose a select option
//   wait:<ms>            wait
//   width:<px>           viewport width
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
await page.goto(`${url}/manifest.json`);
await page.evaluate(({ url, token }) => {
  localStorage.setItem('hassTokens', JSON.stringify({
    hassUrl: url, clientId: `${url}/`, access_token: token, token_type: 'Bearer', refresh_token: 'none',
    expires_in: 1e9, expires: Date.now() + 1e12,
  }));
  localStorage.setItem('selectedLanguage', JSON.stringify('de'));
}, { url, token: process.env.HA_TOKEN });
await page.goto(`${url}${path}`);
try {
  await page.waitForSelector('weekheat-card', { timeout: 30000 });
} catch (e) {
  await page.screenshot({ path: `${process.env.OUT}/fail.png` });
  console.log('no card; page at', page.url(), '\n' + logs.join('\n'));
  process.exit(1);
}
await page.waitForTimeout(6000);
const card = page.locator('weekheat-card').first();
for (const s of steps) {
  const [cmd, ...rest] = s.split(':');
  const arg = rest.join(':');
  if (cmd === 'shot') await card.screenshot({ path: `${process.env.OUT}/${arg}.png` });
  else if (cmd === 'click') { await card.locator(arg).first().click(); await page.waitForTimeout(800); }
  else if (cmd === 'fill') { const k = arg.lastIndexOf('='); const sel = arg.slice(0, k); const v = arg.slice(k + 1); await card.locator(sel).first().fill(v); await card.locator(sel).first().dispatchEvent('change'); await page.waitForTimeout(400); }
  else if (cmd === 'select') { const k = arg.lastIndexOf('='); const sel = arg.slice(0, k); const v = arg.slice(k + 1); await card.locator(sel).first().selectOption(v); await page.waitForTimeout(400); }
  else if (cmd === 'wait') await page.waitForTimeout(+arg);
  else if (cmd === 'width') await page.setViewportSize({ width: +arg, height: 1400 });
}
console.log(logs.join('\n') || 'no console errors');
await browser.close();
