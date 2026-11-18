// Styles of the Control view: the thermostat selector, the dial, the slider, the period pill.

import { css } from 'lit';

/** The controls' styles. */
export const controls = css`
  .thermostats { display: flex; gap: 6px; margin: 10px 0 0; }
  .thermostats button { flex: 1; min-width: 0; display: flex; align-items: center;
    justify-content: center;
    gap: 4px; min-height: 40px; border: 1px solid var(--divider-color); background: none;
    border-radius: 20px; font-size: 0.92em; cursor: pointer; padding: 4px 6px; }
  .thermostats button.on { border: 2px solid var(--primary-color); font-weight: 500;
    background: color-mix(in srgb, var(--primary-color) 14%, transparent); }
  .thermostats .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
    }
  .thermostats .name + span { flex: none; }
  .dial-box { position: relative; max-width: 280px; margin: 4px auto 0; }
  .dial-box svg { display: block; width: 100%; height: auto; touch-action: none; cursor: pointer;
    outline: none; user-select: none; -webkit-user-select: none; }
  .dial-box svg:focus-visible .dial-handle { stroke-width: 5; }
  .dial-buttons { position: absolute; left: 0; right: 0; bottom: 2%; display: flex;
    align-items: center; gap: 12px; justify-content: space-between; padding: 0 4%;
    pointer-events: none; }
  .dial-buttons .round { pointer-events: auto; background: var(--card-background-color); }
  .dial-track { fill: none; stroke: var(--secondary-background-color, #e5e5e5); stroke-width: 12;
    stroke-linecap: round; }
  .dial-fill { fill: none; stroke: var(--wh-heat); stroke-width: 12; stroke-linecap: round; }
  .dial-handle { fill: var(--card-background-color, #fff); stroke: var(--wh-heat); stroke-width: 4;
    }
  .dial-fill.off, .dial-handle.off { stroke: var(--wh-off); }
  .dial-room { stroke: var(--primary-text-color); stroke-width: 3; stroke-linecap: round; }
  .dial-plan { fill: var(--wh-manual); }
  .dial-box text { text-anchor: middle; fill: var(--primary-text-color); font-family: inherit; }
  .dial-status { font-size: 11px; }
  .dial-box .dial-status.dim, .dial-box .dial-small { fill: var(--secondary-text-color); }
  .dial-box .dial-status.heat, .dial-box .dial-status .heat { fill: var(--wh-heat); }
  .dial-box .dial-status.manual { fill: var(--wh-manual); }
  .dial-box .dial-status.window { fill: var(--wh-cool); }
  .dial-box .dial-status.ok { fill: var(--wh-free); }
  .dial-value { font-size: 46px; font-weight: 300; }
  .dial-value.off { font-size: 34px; }
  .dial-value.mixed { font-size: 30px; }
  .dial-unit { font-size: 15px; }
  .dial-small { font-size: 10.5px; }
  .slider { margin: 10px 0 4px; outline: none; user-select: none; -webkit-user-select: none; }
  .slider.framed {
    border: 1px solid var(--divider-color); border-radius: 8px; padding: 8px 10px 4px;
    }
  .slider-top { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .slider-value { font-size: 2.1em; font-weight: 300; }
  .slider-status { font-size: 0.9em; color: var(--secondary-text-color); }
  .slider-status.heat, .slider-status .heat { color: var(--wh-heat); }
  .slider-status.manual { color: var(--wh-manual); }
  .slider-status.window { color: var(--wh-cool); }
  .slider-status.ok { color: var(--wh-free); }
  .slider-bar { position: relative; height: 36px; margin: 2px 12px 0; cursor: pointer;
    touch-action: pan-y; }
  .slider-track, .slider-fill { position: absolute; left: 0; top: 14px; height: 8px;
    border-radius: 4px; }
  .slider-track { right: 0; background: var(--secondary-background-color, #e5e5e5); }
  .slider-fill { background: var(--wh-heat); }
  .slider-fill.off { background: var(--wh-off); }
  .slider-room { position: absolute; top: 7px; width: 3px; height: 22px; margin-left: -1.5px;
    border-radius: 2px; background: var(--primary-text-color); }
  .slider-plan { position: absolute; top: 27px; width: 6px; height: 6px; margin-left: -3px;
    border-radius: 50%; background: var(--wh-manual); }
  .slider-knob { position: absolute; top: 6px; width: 24px; height: 24px; margin-left: -12px;
    border-radius: 50%; box-sizing: border-box; background: var(--card-background-color, #fff);
    border: 4px solid var(--wh-heat); }
  .slider-knob.off { border-color: var(--wh-off); }
  .slider:focus-visible .slider-knob {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color) 35%, transparent);
    }
  .slider-scale { display: flex; justify-content: space-between; font-size: 0.72em;
    color: var(--secondary-text-color); }
  .all-row { display: flex; align-items: center; gap: 8px; border: 1px dashed var(--divider-color);
    border-radius: 8px; padding: 8px 10px; margin: 6px 0; }
  .pill { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap;
    border-radius: 10px;
    background: var(--secondary-background-color); padding: 8px 12px; margin: 8px 0;
      font-size: 0.92em; }
  .thermostat { display: flex; justify-content: space-between; gap: 8px; font-size: 0.9em;
    padding: 1px 0; }
  .back-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
  .foot { display: flex; justify-content: flex-end; }
`;
