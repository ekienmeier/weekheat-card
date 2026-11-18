// Fixed values that the card's parts share. Values that the room blueprint has as well say so;
// tests/consistency.test.mjs checks that both use the same.

/** The weekday keys, Monday first, as the day script and the room's week use them. */
export const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** The day names of a schedule helper, in the order of WEEK. */
export const SCHEDULE_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/** Minutes in a day: the end of the last period (24:00). */
export const DAY_MINUTES = 1440;

/** The lowest setpoint a plan or the card sets, in °C. */
export const MIN_T = 5;

/** The highest setpoint a plan or the card sets, in °C. */
export const MAX_T = 30;

/**
 * The setpoint of an Off period, in °C. Off is a low setpoint, never HVAC off, so that frost
 * protection stays. The room blueprint writes the same value (`off_temp`).
 */
export const OFF_T = 5;

/**
 * Two setpoints closer than this, in °C, are the same (a thermostat rounds what it is sent).
 * The room blueprint uses the same tolerance (`same_setpoint`).
 */
export const SAME_SETPOINT = 0.25;

/**
 * Two wanted temperatures closer than this, in °C, are unchanged. The room blueprint uses the
 * same tolerance (`same_wanted`).
 */
export const SAME_WANTED = 0.05;

/** Two setpoints closer than this, in °C, are shown as one value. */
export const SAME_SHOWN = 0.05;

/**
 * A valve that reports "heating" while the room is at most this much below its setpoint, in °C,
 * does not count as heating: over HomeKit, Aqara valves report "heating" whenever the mode is heat.
 */
export const HEATING_MARGIN = 0.2;

/** The step of a plan period's temperature, in °C. */
export const PLAN_STEP = 0.5;

/** The setpoint step of a thermostat that does not report its own, in °C. */
export const DEFAULT_STEP = 0.5;

/** The temperature of a new period when there is none to copy, in °C. */
export const NEW_PERIOD_T = 20;

/** The temperature a period gets when it is switched from Off back on, in °C. */
export const ON_AGAIN_T = 18;

/**
 * Limits of room and valve exercise inputs that the card edits. They are the same as the room
 * blueprint's selectors (min, max, default).
 */
export const LIMITS = {
  window_delay: { min: 0, max: 900, initial: 30 },
  room_margin: { min: 0.1, max: 3, initial: 0.5, step: 0.1 },
  exercise_wait: { min: 10, max: 600, initial: 60 },
};

/** The most characters a state helper (an input_text) holds: Home Assistant's limit for a state. */
export const STATE_MAX = 255;

/** The device classes of binary sensors that can be a room's windows and doors. */
export const WINDOW_CLASSES = ['window', 'door', 'opening', 'garage_door'];

/** The file names of the three blueprints, as they end the paths Home Assistant lists. */
export const ROOM_BLUEPRINT = 'weekheat_room.yaml';

/** See ROOM_BLUEPRINT. */
export const DAY_BLUEPRINT = 'weekheat_day.yaml';

/** See ROOM_BLUEPRINT: the valve exercise script, which the room automations call. */
export const EXERCISE_BLUEPRINT = 'weekheat_exercise.yaml';

/**
 * The script the room automations call for the valve exercise: their `exercise_script` input's
 * default in the room blueprint.
 */
export const EXERCISE_SCRIPT = 'script.weekheat_exercise';

/** The name the card gives the valve exercise script when it creates it (as the blueprint's). */
export const EXERCISE_ALIAS = 'Weekheat valve exercise';

/** The folder of Home Assistant's blueprints that importing them from GitHub gives. */
export const BLUEPRINT_FOLDER = 'ekienmeier';

/** Where the blueprints are published; a tag or `main` follows. */
export const BLUEPRINT_REPO = 'https://github.com/ekienmeier/weekheat-card/blob/';

/** The key of the room directory in Home Assistant's frontend system data. */
export const DIRECTORY_KEY = 'weekheat';

/** States that mean an entity cannot be used right now. */
export const UNAVAILABLE = ['unavailable', 'unknown'];
