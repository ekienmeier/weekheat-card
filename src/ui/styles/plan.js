// Styles of the Plan and Week views: the day chart, the period list and editor, the week grid.

import { css } from 'lit';

/** The plan and week styles. */
export const plan = css`
  .pinfo { margin: 2px 0 6px; }
  .chart { position: relative; height: 88px; border-radius: 8px; overflow: hidden;
    background: var(--secondary-background-color); }
  .chart-segment { position: absolute; top: 0; bottom: 0; display: flex; align-items: flex-end;
    box-sizing: border-box; border: 0; border-right: 1px solid var(--card-background-color, #fff);
    background: none; padding: 0; }
  button.chart-segment { cursor: pointer; }
  .chart-segment.selected { box-shadow: inset 0 0 0 2px var(--primary-text-color); }
  .chart-bar { width: 100%; display: flex; justify-content: center; align-items: flex-start;
    font-size: 0.72em; color: #fff; padding-top: 3px; box-sizing: border-box; overflow: hidden; }
  .chart-segment.off .chart-bar { background: repeating-linear-gradient(135deg,
    var(--wh-off) 0 4px, color-mix(in srgb, var(--wh-off) 75%, #000) 4px 8px); }
  .chart-now { position: absolute; top: -2px; bottom: -2px; width: 2px;
    background: var(--primary-text-color); }
  .chart-ticks { display: flex; justify-content: space-between; font-size: 0.68em;
    color: var(--secondary-text-color); }
  .period-list { margin-top: 6px; }
  .period-row { display: flex; width: 100%; padding: 9px 4px; border: 0; background: none;
    border-bottom: 1px solid var(--divider-color); text-align: left; }
  button.period-row { cursor: pointer; }
  .period-row.current { font-weight: 500; color: var(--primary-color); }
  .period-edit { display: grid; grid-template-columns: minmax(6.5em, 8em) auto auto 2em; gap: 8px;
    align-items: center; padding: 6px 4px; border-bottom: 1px solid var(--divider-color);
    background: color-mix(in srgb, var(--primary-color) 6%, transparent); }
  .temperature-step { display: flex; align-items: center; gap: 6px; }
  .temperature-step span { min-width: 4em; text-align: center; }
  .week { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 6px 10px;
    margin: 8px 0; }
  .week-day { display: flex; align-items: center; gap: 6px; }
  .week-day span { width: 2.4em; flex: none; }
  .week-day select { flex: 1; }
  .week-row { display: flex; justify-content: space-between; align-items: center; gap: 8px;
    margin: 8px 0 4px; }
  @media (max-width: 420px) {
    .period-edit { grid-template-columns: 1fr auto 2em; }
    .period-edit .check { grid-column: 1; grid-row: 2; }
  }
`;
