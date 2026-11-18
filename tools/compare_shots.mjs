// Compares two folders of screenshots (from tools/shoot.mjs, e.g. of the released card and of the
// working copy): for each name, how many pixels differ and in which rows, and a picture of the
// second with the differences in red (diff-<name>.png in the second folder).
//
// Usage: node tools/compare_shots.mjs <old folder> <new folder> <name> [<name> …]
// Example: OUT=shots/old CARD=old.js node tools/shoot.mjs /weekheat-test/w shot:list
//          OUT=shots/new CARD=dist/weekheat-card.js node tools/shoot.mjs /weekheat-test/w shot:list
//          node tools/compare_shots.mjs shots/old shots/new list
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

/** How far two pixels' colours may be apart (sum over red, green, blue) and still count as same. */
const TOLERANCE = 40;

/**
 * A PNG file as a data URL.
 * @param {string} path
 * @returns {string}
 */
function dataUrl(path) {
  return `data:image/png;base64,${readFileSync(path).toString('base64')}`;
}

// The functions below run in the browser page (their source is put there by inBrowser), so they
// use only each other and the browser's own objects.
/* global Image, OffscreenCanvas */

/**
 * Load an image.
 * @param {string} src a data URL
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
  return new Promise((done) => {
    const image = new Image();
    image.onload = () => done(image);
    image.src = src;
  });
}

/**
 * An image's pixels, on a canvas of a given size.
 * @param {HTMLImageElement} image
 * @param {{width: number, height: number}} size
 * @returns {Uint8ClampedArray} red, green, blue, alpha of each pixel
 */
function pixelsOf(image, { width, height }) {
  const context = new OffscreenCanvas(width, height).getContext('2d');
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, width, height).data;
}

/**
 * Paint the pixels where two images differ red, and return their rows.
 * @param {[Uint8ClampedArray, Uint8ClampedArray]} pixels
 * @param {{width: number, tolerance: number, out: OffscreenCanvasRenderingContext2D}} paint
 * @returns {number[]} the row of each differing pixel
 */
function markDifferences([first, second], { width, tolerance, out }) {
  const rows = [];
  for (let i = 0; i < first.length; i += 4) {
    const apart = [0, 1, 2].reduce(
      (sum, part) => sum + Math.abs(first[i + part] - second[i + part]),
      0,
    );
    if (apart <= tolerance) continue;
    rows.push(Math.floor(i / 4 / width));
    out.fillRect((i / 4) % width, Math.floor(i / 4 / width), 1, 1);
  }
  return rows;
}

/**
 * A canvas as PNG, base64-encoded.
 * @param {OffscreenCanvas} canvas
 * @returns {Promise<string>}
 */
async function pngOf(canvas) {
  const bytes = new Uint8Array(await (await canvas.convertToBlob()).arrayBuffer());
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
}

/**
 * Compare two images: how many pixels differ, in which rows, and the second with them in red.
 * @param {[string, string, number]} input the two images as data URLs, and the tolerance
 * @returns {Promise<{count: number, top: number, bottom: number, png: string}>}
 */
async function comparePixels([first, second, tolerance]) {
  const [a, b] = await Promise.all([loadImage(first), loadImage(second)]);
  const size = { width: Math.max(a.width, b.width), height: Math.max(a.height, b.height) };
  const out = new OffscreenCanvas(size.width, size.height).getContext('2d');
  out.drawImage(b, 0, 0);
  out.fillStyle = 'rgba(255, 0, 0, 0.6)';
  const pixels = [pixelsOf(a, size), pixelsOf(b, size)];
  const rows = markDifferences(pixels, { width: size.width, tolerance, out });
  const png = await pngOf(out.canvas);
  return { count: rows.length, top: Math.min(...rows), bottom: Math.max(...rows), png };
}

/**
 * Put the comparison's functions into the page.
 * @param {import('playwright').Page} page
 * @returns {Promise<void>}
 */
async function inBrowser(page) {
  const functions = [loadImage, pixelsOf, markDifferences, pngOf, comparePixels];
  await page.addScriptTag({ content: functions.map(String).join('\n') });
}

/**
 * Compare one screenshot of the two folders, write its diff picture and say what differs.
 * @param {import('playwright').Page} page
 * @param {{old: string, new: string, name: string}} shot
 * @returns {Promise<void>}
 */
async function compare(page, shot) {
  const images = [dataUrl(`${shot.old}/${shot.name}.png`), dataUrl(`${shot.new}/${shot.name}.png`)];
  const result = await page.evaluate(
    (input) => globalThis.comparePixels(input),
    [...images, TOLERANCE],
  );
  writeFileSync(`${shot.new}/diff-${shot.name}.png`, Buffer.from(result.png, 'base64'));
  const where = result.count ? `, rows ${result.top}–${result.bottom}` : '';
  console.log(`${shot.name}: ${result.count} pixels differ${where}`);
}

/**
 * Compare the screenshots the command line names.
 * @returns {Promise<void>}
 */
async function main() {
  const [oldFolder, newFolder, ...names] = process.argv.slice(2);
  if (!names.length) throw new Error('Usage: compare_shots.mjs <old folder> <new folder> <name> …');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await inBrowser(page);
  for (const name of names) await compare(page, { old: oldFolder, new: newFolder, name });
  await browser.close();
}

await main();
