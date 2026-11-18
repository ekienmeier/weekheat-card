// Styles of the room list and an opened room's bar (views, heating switch).

import { css } from 'lit';

/** The room list's styles. */
export const rooms = css`
  .room { border-top: 1px solid var(--divider-color); padding: 8px 2px; }
  .room:first-child { border-top: 0; }
  .room-head { display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 4px 0;
    width: 100%; border: 0; background: none; text-align: left; }
  .room-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center;
    justify-content: center; flex: none; --c: var(--secondary-text-color);
    background: color-mix(in srgb, var(--c) 18%, transparent); color: var(--c); }
  .room-icon.heat, .room-line.heat { --c: var(--wh-heat); }
  .room-icon.ok, .room-line.ok { --c: var(--wh-free); }
  .room-icon.manual, .room-line.manual { --c: var(--wh-manual); }
  .room-icon.window, .room-line.window { --c: var(--wh-cool); }
  .room-icon.paused, .room-line.paused { --c: var(--secondary-text-color); }
  .room-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .room-name { font-weight: 500; }
  .room-line { color: var(--c); font-size: 0.9em; white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis; }
  .room-temp { font-size: 1.9em; font-weight: 300; text-align: right; }
  .chevron { color: var(--secondary-text-color); flex: none; }
  /* On a narrow card the heating switch goes to its own line, and the tabs scroll if needed. */
  .room-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 10px 0 4px; }
  .tabs { display: inline-flex; background: var(--secondary-background-color); border-radius: 18px;
    padding: 3px; max-width: 100%; box-sizing: border-box; overflow-x: auto;
    scrollbar-width: none; }
  .tabs button { flex: none; white-space: nowrap; border: 0; background: none; color: var(--secondary-text-color); font-size: 0.92em;
    padding: 5px 12px; border-radius: 15px; cursor: pointer; }
  .tabs button.on { background: var(--card-background-color); color: var(--primary-text-color);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); }
  .switch { display: inline-flex; align-items: center; gap: 8px; font-size: 0.9em; margin-left: auto;
    color: var(--secondary-text-color); }
  .toggle { width: 40px; height: 22px; border-radius: 11px; border: 0; position: relative;
    background: var(--disabled-color, #bdbdbd); cursor: pointer; padding: 0; }
  .toggle i { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px;
    border-radius: 50%;
    background: #fff; transition: left 0.15s; }
  .toggle.on { background: var(--wh-heat); }
  .toggle.on i { left: 21px; }
  .toggle[disabled] { opacity: 0.4; cursor: default; }
  @media (prefers-reduced-motion: reduce) { .toggle i { transition: none; } }
`;
