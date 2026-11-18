// The day chart of a plan: one bar per period, as wide as it lasts and as high as its
// temperature; Off hatched and low; a line at the time now (on today's plan).

import { html, nothing } from 'lit';
import { DAY_MINUTES } from '../../domain/constants.js';
import { formatNumber, formatPeriod, formatTime, tempColor } from '../../domain/format.js';
import { togglePeriod } from '../../state/actions/plan-editor.js';
import { formatting, texts } from '../../state/selectors.js';

/** The temperatures at the bottom and the top of the chart, in °C. */
const RANGE = { low: 10, high: 26 };

/**
 * @typedef {object} ChartInput
 * @property {import('../../state/actions/plan-editor.js').PlanRef} plan
 * @property {import('../../domain/periods.js').Period[]} periods
 * @property {number | null} now the minute now, when the plan is today's
 * @property {number | null} selected the period being edited
 */

/**
 * A bar's height in percent: none for a gap, low for Off, else by temperature.
 * @param {import('../../domain/periods.js').Period} period
 * @returns {number}
 */
function barHeight(period) {
  if (period.temperature == null && !period.off) return 0;
  if (period.off) return 16;
  const share = (period.temperature - RANGE.low) / (RANGE.high - RANGE.low);
  return 28 + 72 * Math.max(0, Math.min(1, share));
}

/**
 * A period's bar: as high as its temperature, coloured by it, with the temperature when it is
 * wide enough.
 * @param {import('../../state/context.js').Context} ctx
 * @param {import('../../domain/periods.js').Period} period
 * @param {number} width in percent of the day
 * @returns {unknown}
 */
function bar(ctx, period, width) {
  const gap = period.temperature == null && !period.off;
  const value = period.off ? texts(ctx).off : formatNumber(period.temperature, formatting(ctx));
  const color = period.off || gap ? '' : `background:${tempColor(period.temperature)}`;
  const style = `height:${barHeight(period)}%;${color}`;
  return html`<div class="chart-bar" style=${style}>${width > 6 && !gap ? value : ''}</div>`;
}

/**
 * One period's bar in its place. For administrators a button that edits the period.
 * @param {import('../../state/context.js').Context} ctx
 * @param {ChartInput} chart
 * @param {number} index
 * @returns {unknown}
 */
function segment(ctx, chart, index) {
  const period = chart.periods[index];
  const end = chart.periods[index + 1]?.start ?? DAY_MINUTES;
  const width = ((end - period.start) / DAY_MINUTES) * 100;
  const selected = chart.selected === index ? 'selected' : '';
  const classes = `chart-segment ${period.off ? 'off' : ''} ${selected}`;
  const style = `left:${(period.start / DAY_MINUTES) * 100}%;width:${width}%`;
  const inside = bar(ctx, period, width);
  if (!ctx.store.data.admin) return html`<div class=${classes} style=${style}>${inside}</div>`;
  const format = formatting(ctx);
  const name = `${formatTime(period.start, format)} ${formatPeriod(period, format, texts(ctx))}`;
  return html`<button class=${classes} style=${style} aria-label=${name}
    @click=${() => togglePeriod(ctx, chart.plan, index)}>${inside}</button>`;
}

/**
 * The day chart.
 * @param {import('../../state/context.js').Context} ctx
 * @param {ChartInput} chart
 * @returns {unknown}
 */
export function chartView(ctx, chart) {
  const now =
    chart.now != null
      ? html`<div class="chart-now" style="left:${(chart.now / DAY_MINUTES) * 100}%"></div>`
      : nothing;
  const ticks = [0, 6, 12, 18, 24].map((hour) => html`<span>${hour}</span>`);
  return html`<div class="chart">${chart.periods.map((_, i) => segment(ctx, chart, i))}${now}</div>
    <div class="chart-ticks">${ticks}</div>`;
}
