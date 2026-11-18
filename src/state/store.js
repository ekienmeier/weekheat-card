// The card's state: what was loaded from Home Assistant, what the UI shows, the drafts of the
// editors, and the setpoints being set. Changes go through `update`, which tells the card to
// render again.

/**
 * @typedef {'control' | 'plan' | 'week' | 'setup'} RoomTab the views of an opened room
 */

/**
 * @typedef {object} Data What was loaded from Home Assistant.
 * @property {boolean} admin the user is an administrator
 * @property {import('../domain/room.js').Room[] | null} rooms the rooms shown, in order; null
 *   until the first load
 * @property {import('../domain/room.js').Room[]} allRooms every room, shown or not
 * @property {Record<string, import('../ha/plans.js').Plan>} plans by entity id
 * @property {import('../domain/plans.js').Day[] | null} days the day list; null without the script
 * @property {any} script admin: the day script's configuration (null if it is missing)
 * @property {boolean} hasScript the day script exists
 * @property {string | null} exceptions the exceptions calendar
 * @property {string | null} roomBlueprint admin: the room blueprint's path
 * @property {import('../ha/blueprints.js').OldBlueprint[]} oldBlueprints admin: to update
 * @property {boolean} noDirectory not admin, and no admin has published the rooms yet
 * @property {unknown} error why the last load failed, or null
 * @property {Record<string, import('../ha/notifications.js').Notification>} notes
 */

/**
 * @typedef {object} Picker An open entity search.
 * @property {string} room the room it adds to ('' for a new room)
 * @property {import('../domain/picker.js').PickKind} kind what it adds
 * @property {string} query what was typed
 */

/**
 * @typedef {object} UiState What the card shows.
 * @property {'rooms' | 'days' | 'settings'} view the page
 * @property {string | null} openRoom the opened room's id
 * @property {Record<string, RoomTab>} tab each room's view
 * @property {Record<string, string>} plan the plan shown in each room's Plan view
 * @property {{room: string, plan: string, index: number} | null} period the period being edited
 * @property {string | null} renaming the plan whose name is being edited
 * @property {{room: string, name: string, template: string} | null} addPlan the new-plan form
 * @property {string | null} settingsPart the open part of the settings page
 * @property {{name: string, thermostats: string[]} | null} addRoom the new-room form
 * @property {string | null} setupPart the open section of a room's Setup view
 * @property {Picker | null} picker the open entity search
 * @property {Record<string, string>} thermostat the thermostat chosen above each room's dial
 * @property {{date: string, pick: string, note: string} | null} dayEdit the exception form
 * @property {'dial' | 'compact'} layout how an opened room shows its setpoint
 * @property {{key?: string, error?: unknown, bad: boolean} | null} message a short message
 */

/**
 * @typedef {object} PlanDraft A plan being edited.
 * @property {string} name its name without the room's
 * @property {import('../domain/periods.js').Period[]} periods
 */

/**
 * @typedef {object} WeekDraft A room's week being edited.
 * @property {Record<string, string>} week the plan for each weekday
 * @property {string} free_day the plan for free days
 */

/**
 * @typedef {object} Drafts Unsaved edits, one per editor, kept until saved or cancelled.
 * @property {Record<string, PlanDraft>} plans by plan entity
 * @property {Record<string, WeekDraft>} weeks by room id
 * @property {Record<string, SetupDraft>} setups by room id
 * @property {SettingsDraft | null} settings the day settings
 * @property {{exercise_day: string, exercise_time: string, exercise_wait: number} | null} exercise
 */

/**
 * @typedef {object} SetupDraft A room's Setup view.
 * @property {string} name
 * @property {string[]} thermostats
 * @property {string[]} windows
 * @property {number | string} window_delay seconds, as typed
 * @property {string} room_sensor an entity id, or ''
 * @property {number} room_margin °C
 */

/**
 * @typedef {object} SettingsDraft The day settings (the day script's inputs).
 * @property {string[]} calendars the keyword calendars
 * @property {Array<{keyword: string, plan: string}>} rules plan '' makes the day free
 * @property {string} workday the Workday sensor
 * @property {string} exceptions the exceptions calendar
 * @property {string} holidays the holiday calendar, or ''
 */

/**
 * @typedef {object} Setting A setpoint being set.
 * @property {string} room the room's id
 * @property {string} th the thermostat, or '' for all of the room's
 * @property {number | null} value
 */

/**
 * @typedef {object} Shift "All together": each thermostat moves by the same amount.
 * @property {string} room the room's id
 * @property {Record<string, number | null>} base each thermostat's setpoint when it began
 * @property {number} delta °C added to each
 */

/**
 * @typedef {object} ControlState Setpoints being set, shown before Home Assistant reports them.
 * @property {Setting | null} pending a setpoint written after a short wait
 * @property {Shift | null} shift "All together" being stepped
 * @property {Setting | null} drag the dial or slider being dragged
 */

/** What a card knows before its first load. @type {Data} */
const NO_DATA = {
  admin: false,
  rooms: null,
  allRooms: [],
  plans: {},
  days: null,
  script: null,
  hasScript: false,
  exceptions: null,
  roomBlueprint: null,
  oldBlueprints: [],
  noDirectory: false,
  error: null,
  notes: {},
};

/** What a card shows at first: the list of rooms, none opened. @type {UiState} */
const FIRST_UI = {
  view: 'rooms',
  openRoom: null,
  tab: {},
  plan: {},
  period: null,
  renaming: null,
  addPlan: null,
  settingsPart: null,
  addRoom: null,
  setupPart: null,
  picker: null,
  thermostat: {},
  dayEdit: null,
  layout: 'dial',
  message: null,
};

/** No drafts, and no setpoint being set. @type {{drafts: Drafts, control: ControlState}} */
const NOTHING_EDITED = {
  drafts: { plans: {}, weeks: {}, setups: {}, settings: null, exercise: null },
  control: { pending: null, shift: null, drag: null },
};

/**
 * The state of a card that has loaded nothing yet (a fresh copy each time).
 * @returns {{data: Data, ui: UiState, drafts: Drafts, control: ControlState}}
 */
export function initialState() {
  return structuredClone({ data: NO_DATA, ui: FIRST_UI, ...NOTHING_EDITED });
}

/** The card's state, and who to tell when it changes. */
export class Store {
  /** A store with the initial state. */
  constructor() {
    const state = initialState();
    /** @type {Data} */
    this.data = state.data;
    /** @type {UiState} */
    this.ui = state.ui;
    /** @type {Drafts} */
    this.drafts = state.drafts;
    /** @type {ControlState} */
    this.control = state.control;
    /** @type {Set<() => void>} */
    this.listeners = new Set();
    /** How many loads were started; only the newest one's result is kept. */
    this.loads = 0;
  }

  /**
   * Call back after every change.
   * @param {() => void} listener
   * @returns {() => void} stops calling back
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Change the state, then tell the listeners.
   * @param {(store: Store) => void} change
   */
  update(change) {
    change(this);
    this.listeners.forEach((listener) => listener());
  }
}
