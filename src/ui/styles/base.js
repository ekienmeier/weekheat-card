// The card's base styles: colours (from Home Assistant's theme), the top bar, banners, buttons,
// fields and the small helper classes the views share.

import { css } from 'lit';

/** The base styles. */
export const base = css`
  :host {
    --wh-free: var(--success-color, #43a047);
    --wh-manual: var(--warning-color, #ffa000);
    --wh-bad: var(--error-color, #db4437);
    --wh-heat: var(--state-climate-heat-color, #ff8a50);
    --wh-cool: var(--state-climate-cool-color, #2b9af9);
    --wh-off: var(--state-climate-off-color, #8a9099);
  }
  ha-card { padding: 12px 12px 8px; }
  /* Buttons use the card's font; the round ± buttons and the toggle keep the browser's. */
  :where(button:not(.round, .toggle)) { font: inherit; color: inherit; }
  :where(button, [tabindex]):focus-visible { outline: 2px solid var(--primary-color); }
  .top { display: flex; align-items: center; gap: 6px; min-height: 36px; }
  .title { font-size: 1.2em; font-weight: 500; }
  .back { border: 0; background: none; color: var(--primary-text-color); font-size: 1.1em;
    font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; padding: 0; }
  .day-chip { border: 0; cursor: pointer; font-size: 0.85em; padding: 2px 8px; border-radius: 10px;
    background: var(--secondary-background-color); color: var(--primary-text-color); }
  .day-chip.free { color: var(--wh-free); }
  .day-chip.on { outline: 2px solid var(--primary-color); }
  .icon-button { border: 0; background: none; color: var(--secondary-text-color); cursor: pointer;
    padding: 4px; border-radius: 50%; display: inline-flex; }
  .icon-button.on { color: var(--primary-color); }
  .banner { padding: 8px 10px; border-radius: 8px; margin: 6px 0; display: flex; gap: 8px;
    justify-content: space-between; align-items: center; font-size: 0.92em; }
  .banner.ok { background: color-mix(in srgb, var(--wh-free) 18%, transparent); }
  .banner.bad { background: color-mix(in srgb, var(--wh-bad) 18%, transparent); }
  .banner.warn { background: color-mix(in srgb, var(--wh-manual) 20%, transparent); }
  .note { padding: 12px 4px; color: var(--secondary-text-color); }
  .btn { border: 0; background: var(--primary-color); color: var(--text-primary-color, #fff);
    padding: 6px 12px; border-radius: 16px; cursor: pointer; }
  .btn.flat { background: none; color: var(--primary-color); }
  .btn.small { padding: 4px 10px; font-size: 0.9em; }
  .btn.outline { border: 1px solid var(--primary-color); }
  .btn[disabled] { opacity: 0.5; cursor: default; }
  .link { border: 0; background: none; color: var(--primary-color); cursor: pointer;
    white-space: nowrap; }
  .icon { border: 0; background: none; color: var(--secondary-text-color); cursor: pointer;
    min-width: 32px; min-height: 32px; }
  .icon[disabled] { opacity: 0.35; cursor: default; }
  .round { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--divider-color);
    background: none; color: var(--primary-text-color); font-size: 1.3em; cursor: pointer; }
  .round.small { width: 30px; height: 30px; font-size: 1.1em; }
  .round[disabled] { opacity: 0.35; cursor: default; }
  .chip { font-size: 0.72em; padding: 1px 6px; border-radius: 8px; margin-left: 4px;
    vertical-align: middle; font-weight: 400; }
  .chip.bad { background: color-mix(in srgb, var(--wh-bad) 25%, transparent); }
  button.plain { border: 0; background: none; text-align: left; width: 100%; min-height: 44px;
    cursor: pointer; }
  .panel { border: 1px solid var(--divider-color); border-radius: 8px; padding: 8px; margin: 8px 0;
    }
  .actions { display: flex; gap: 6px; align-items: center; margin-top: 8px; flex-wrap: wrap; }
  .field { display: flex; flex-direction: column; gap: 2px; margin: 6px 0; font-size: 0.9em;
    color: var(--secondary-text-color); }
  .check { display: flex; align-items: center; gap: 6px; font-size: 0.92em; margin: 2px 0; }
  input, select { font: inherit; color: var(--primary-text-color);
    background: var(--card-background-color);
    border: 1px solid var(--divider-color); border-radius: 6px; padding: 4px 6px; min-width: 0;
    box-sizing: border-box; }
  input[type='checkbox'] { width: auto; }
  .error { color: var(--wh-bad); font-size: 0.88em; margin-top: 4px; }
  .save-bar { display: flex; align-items: center; gap: 6px; margin-top: 8px; padding: 6px 8px;
    border-radius: 10px; background: color-mix(in srgb, var(--wh-manual) 14%, transparent);
      font-size: 0.9em; }
  .grow { flex: 1; }
  .block { display: block; }
  .dim { color: var(--secondary-text-color); }
  .small { font-size: 0.85em; }
  .manual { color: var(--wh-manual); }
  .accent { color: var(--primary-color); }
  .ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .picks { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .pick { border: 1px solid var(--divider-color); background: none;
    color: var(--primary-text-color);
    border-radius: 14px; padding: 4px 10px; cursor: pointer; font-size: 0.9em; }
  .pick.on { border-color: var(--primary-color);
    background: color-mix(in srgb, var(--primary-color) 15%, transparent); }
  .pick.dirty::after { content: ' ✎'; color: var(--wh-manual); }
  .pick.add { min-width: 2.2em; }
`;
