// Styles of the setup forms, the entity search, the Days page and the settings page.

import { css } from 'lit';

/** The forms' styles. */
export const forms = css`
  .setup { margin: 8px 0; }
  .section { border: 1px solid var(--divider-color); border-radius: 8px; margin: 6px 0; }
  .section.open { background: color-mix(in srgb, var(--primary-text-color) 3%, transparent); }
  .section-head { display: flex; align-items: center; gap: 8px; padding: 8px 10px; }
  .section-title { font-weight: 500; flex: none; }
  .section-body { padding: 0 10px 10px; display: flex; flex-direction: column; gap: 8px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .entity-chip { display: inline-flex; align-items: center; gap: 2px; border-radius: 16px;
    background: var(--secondary-background-color); padding: 2px 2px 2px 12px; font-size: 0.92em; }
  .x { border: 0; background: none; color: var(--secondary-text-color); width: 32px; height: 32px;
    border-radius: 16px; cursor: pointer; flex: none; }
  .add-chip { border: 1px dashed var(--divider-color); background: none;
    color: var(--primary-color);
    border-radius: 16px; padding: 6px 12px; font-size: 0.92em; cursor: pointer; }
  .entry { display: flex; align-items: center; gap: 8px; border: 1px solid var(--divider-color);
    border-radius: 8px; padding: 6px 4px 6px 10px; background: var(--card-background-color); }
  .entry ha-icon { color: var(--wh-heat); flex: none; }
  .stepper { display: flex; align-items: center; gap: 8px; }
  .stepper .value { min-width: 64px; text-align: center; font-weight: 500; }
  .picker { border: 1px solid var(--divider-color); border-radius: 8px; overflow: hidden;
    background: var(--card-background-color); }
  .search { display: flex; align-items: center; gap: 6px; padding: 4px 8px;
    border-bottom: 1px solid var(--divider-color); color: var(--secondary-text-color); }
  .search input { flex: 1; border: 0; padding: 8px 2px; outline: none; background: none; }
  .picker-list { max-height: 320px; overflow-y: auto; margin-top: 6px; }
  .picker-group { font-size: 0.8em; color: var(--secondary-text-color); padding: 8px 10px 2px; }
  .picker-group:empty { display: none; }
  .picker-item { display: block; width: 100%; border: 0; background: none; text-align: left;
    color: var(--primary-text-color); padding: 6px 10px; cursor: pointer; }
  .picker-item:hover, .picker-item:focus-visible {
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    }
  .day { border-top: 1px solid var(--divider-color); padding: 6px 2px; }
  .day:first-child { border-top: 0; }
  .day-row { display: grid; grid-template-columns: 7.5em 1fr; gap: 0 8px; cursor: pointer;
    width: 100%;
    border: 0; background: none; text-align: left; padding: 0; }
  .day-kind { font-weight: 500; }
  .day.free .day-kind { color: var(--wh-free); }
  .day.exception .day-kind::after { content: ' ✎'; color: var(--wh-manual); }
  .day-reason { grid-column: 2; font-size: 0.88em; }
  .day-plans { grid-column: 2; font-size: 0.85em; display: flex; flex-direction: column; }
  .settings-title { font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.04em;
    margin: 14px 0 4px;
    color: var(--secondary-text-color); }
  .settings-row { border-top: 1px solid var(--divider-color); }
  .settings-head { display: flex; align-items: center; gap: 8px; padding: 10px 2px; }
  .rule-row { display: grid; grid-template-columns: 1fr 1fr 2.2em 2.2em; gap: 6px; margin: 3px 0; }
  @media (max-width: 420px) { .day-row { grid-template-columns: 6.2em 1fr; } }
`;
