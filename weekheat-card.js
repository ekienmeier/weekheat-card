// Weekheat card: heating plans for heat-only thermostats, with working-day / free-day plans.
// Pairs with the Weekheat blueprints (weekheat_day script, weekheat_room automation).
// The first part (exported) is plain logic without DOM, tested in tests/logic.test.mjs.

export const VERSION = '0.12.0';
/** The blueprints that belong to this card: their release, marked at the end of their description. */
export const BLUEPRINT_VERSION = '0.12.0';
export const BLUEPRINT_REPO = 'https://github.com/ekienmeier/weekheat-card/blob/';
export const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const SCHEDULE_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const ROOM_BLUEPRINT = 'weekheat_room.yaml';
/** Key of the room directory in Home Assistant's frontend system data, and the room fields stored there. */
export const DIRECTORY_KEY = 'weekheat';
export const DIRECTORY_FIELDS = ['entity', 'id', 'name', 'thermostats', 'plans', 'week', 'free_day', 'state', 'windows', 'window_delay', 'heating_switch',
  'room_sensor', 'room_margin'];

/** A room from the room automation's blueprint inputs. */
export function roomFromInput(i, alias) {
  const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  return { name: i.room_name || alias, thermostats: list(i.thermostats), plans: list(i.plans), week: i.week || {},
    free_day: i.free_day, state: i.state, windows: list(i.windows), window_delay: i.window_delay ?? 30,
    heating_switch: list(i.heating_switch)[0] || null, room_sensor: list(i.room_sensor)[0] || null,
    room_margin: i.room_margin ?? 0.5 };
}
/** The weekly valve exercise, the same for all rooms (blueprint inputs of each room automation). */
export const EXERCISE_DEFAULTS = { exercise_day: 'off', exercise_time: '13:00:00', exercise_wait: 60 };
export function exerciseFromInput(i = {}) {
  return Object.fromEntries(Object.entries(EXERCISE_DEFAULTS).map(([k, d]) => [k, i[k] ?? d]));
}
export const DAY_BLUEPRINT = 'weekheat_day.yaml';
export const MIN_T = 5;
export const MAX_T = 30;
export const OFF_T = 5;
export const WINDOW_CLASSES = ['window', 'door', 'opening', 'garage_door'];

/** "1 Regel", "2 Regeln": `n` with the singular or plural of `[one, many]`. */
export function count(n, [one, many]) {
  return `${n} ${n === 1 ? one : many}`;
}

/** A setpoint kept within the thermostats' range. */
export function clampT(v) { return Math.max(MIN_T, Math.min(MAX_T, v)); }

/** The status text's setpoints: one value, or each thermostat's when they differ ("18 / 22 °C"). */
export function targetsText(targets, lang) {
  const v = targets.filter((x) => typeof x === 'number');
  if (!v.length) return '–';
  if (v.every((x) => Math.abs(x - v[0]) < 0.05)) return fmtTemp(v[0], lang);
  return `${v.map((x) => Number(x).toLocaleString(lang === 'de' ? 'de-AT' : 'en-GB', { maximumFractionDigits: 1 })).join(' / ')} °C`;
}

/** The Weekheat version marked in a blueprint's description ("… Weekheat 0.12.0"), or null. */
export function blueprintVersion(description) {
  const m = [...String(description || '').matchAll(/\bWeekheat (\d+\.\d+\.\d+)\b/g)].pop();
  return m ? m[1] : null;
}

/** Is version `a` (null: none) older than `b`? */
export function olderVersion(a, b) {
  if (!a) return true;
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] < pb[i];
  return false;
}

// ---------- entity picker ----------

/** Does entity state `s` fit a picker of `kind` (th: thermostats, win: windows and doors, rs: room sensor)? */
export function pickKind(s, kind) {
  const id = s.entity_id;
  if (kind === 'th') return id.startsWith('climate.');
  if (kind === 'win') return id.startsWith('binary_sensor.') && WINDOW_CLASSES.includes(s.attributes?.device_class);
  if (kind === 'rs') return id.startsWith('sensor.') && s.attributes?.device_class === 'temperature';
  return false;
}

/** Picker candidates: entities of `kind` not in `exclude` whose name, entity id or area contain every word
 * of `q`, sorted by name and split into the room's area (`here`) and the rest (`other`). */
export function pickCandidates(states, { kind, q = '', exclude = [], areaOf = () => '', roomArea = '' }) {
  const words = String(q).toLowerCase().split(/\s+/).filter(Boolean);
  const name = (s) => String(s.attributes?.friendly_name || s.entity_id);
  const list = states.filter((s) => pickKind(s, kind) && !exclude.includes(s.entity_id)).filter((s) => {
    const hay = `${name(s)} ${s.entity_id} ${areaOf(s.entity_id) || ''}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  }).sort((a, b) => name(a).localeCompare(name(b)));
  const here = roomArea ? list.filter((s) => areaOf(s.entity_id) === roomArea) : [];
  return { here, other: list.filter((s) => !here.includes(s)) };
}

// ---------- time ----------

/** "HH:MM" or "HH:MM:SS" -> minutes since midnight ("24:00" -> 1440). */
export function toMin(s) {
  const [h, m] = String(s).split(':');
  return +h * 60 + +m;
}

/** minutes -> "HH:MM" (1440 -> "24:00"). */
export function fromMin(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Today's date, weekday key and minute in the time zone `tz`, at the instant `at` (a Date). */
export function nowIn(tz, at = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    weekday: 'short', hourCycle: 'h23',
  }).formatToParts(at);
  const get = (t) => parts.find((p) => p.type === t).value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    day: get('weekday').slice(0, 3).toLowerCase(),
    min: +get('hour') * 60 + +get('minute'),
  };
}

/** The date `n` days after the ISO date `iso`. */
export function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ---------- plans ----------

/** One day's schedule blocks -> periods [{start (min), temperature, off}], sorted. A gap between
 *  blocks becomes a period with temperature null ("no change"). */
export function blocksToPeriods(blocks) {
  const sorted = [...(blocks || [])].sort((a, b) => toMin(a.from) - toMin(b.from));
  const out = [];
  let end = 0;
  for (const b of sorted) {
    const from = toMin(b.from);
    if (from > end) out.push({ start: end, temperature: null, off: false });
    const t = b.data && typeof b.data.temperature === 'number' ? b.data.temperature : null;
    out.push({ start: from, temperature: t, off: !!(b.data && b.data.off) });
    end = toMin(b.to);
  }
  if (end < 1440) out.push({ start: end, temperature: null, off: false });
  if (!out.length) return [{ start: 0, temperature: null, off: false }];
  if (out[0].start > 0) out.unshift({ start: 0, temperature: null, off: false });
  return out;
}

/** Periods -> schedule blocks covering 00:00–24:00 (periods without a temperature are left as gaps). */
export function periodsToBlocks(periods) {
  const p = [...periods].sort((a, b) => a.start - b.start);
  const blocks = [];
  p.forEach((x, i) => {
    const to = i + 1 < p.length ? p[i + 1].start : 1440;
    if (x.temperature == null || to <= x.start) return;
    const data = { temperature: x.off ? OFF_T : x.temperature };
    if (x.off) data.off = true;
    blocks.push({ from: `${fromMin(x.start)}:00`, to: to === 1440 ? '24:00:00' : `${fromMin(to)}:00`, data });
  });
  return blocks;
}

/** Problems of a period list (for the editor): [] when it can be saved. */
export function checkPeriods(periods) {
  const errors = [];
  if (!periods.length || periods[0].start !== 0) errors.push('first');
  for (let i = 1; i < periods.length; i++) if (periods[i].start <= periods[i - 1].start) errors.push('order');
  for (const p of periods) {
    if (!p.off && (typeof p.temperature !== 'number' || p.temperature < MIN_T || p.temperature > MAX_T)) errors.push('temp');
  }
  return [...new Set(errors)];
}

/** The scheduled temperature of a period (an off period is OFF_T). */
export function periodTemp(p) {
  return p.off ? OFF_T : p.temperature;
}

/** The period at minute `min`, and the next one with a different temperature that day (or null). */
export function periodAt(periods, min) {
  let i = 0;
  for (let k = 0; k < periods.length; k++) if (periods[k].start <= min) i = k;
  const cur = periods[i];
  let next = null;
  for (let k = i + 1; k < periods.length; k++) {
    if (periodTemp(periods[k]) !== periodTemp(cur)) { next = periods[k]; break; }
  }
  return { index: i, period: cur, next };
}

/** Starter plans for a new room. */
export const STARTER = {
  weekday: [
    { start: 0, temperature: OFF_T, off: true }, { start: 360, temperature: 21, off: false },
    { start: 420, temperature: 17, off: false }, { start: 1020, temperature: 21, off: false },
    { start: 1260, temperature: 18, off: false }, { start: 1320, temperature: OFF_T, off: true },
  ],
  free: [
    { start: 0, temperature: OFF_T, off: true }, { start: 450, temperature: 21, off: false },
    { start: 510, temperature: 19, off: false }, { start: 1020, temperature: 21, off: false },
    { start: 1290, temperature: 18, off: false }, { start: 1350, temperature: OFF_T, off: true },
  ],
};

// ---------- names ----------

/** Like Home Assistant's slugify: lower case ASCII, words joined by "_". */
export function slugify(s) {
  return String(s).replace(/ß/g, 'ss').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/** A plan's display name: its friendly name without the room name in front. */
export function planLabel(friendly, room) {
  const f = String(friendly || '');
  return room && f.toLowerCase().startsWith(`${room.toLowerCase()} `) ? f.slice(room.length + 1) : f;
}

/** The plan entity of `plans` that a plan name refers to (same rule as the room blueprint), or null. */
export function matchPlan(name, plans, friendly = {}) {
  if (!name) return null;
  const want = String(name).toLowerCase();
  const slug = slugify(name);
  return plans.find((p) => {
    const fn = String(friendly[p] || '').toLowerCase();
    return p.endsWith(`_${slug}`) || fn === want || fn.endsWith(` ${want}`);
  }) || null;
}

/** The plan entity a room uses on a day (a day as returned by the day script). */
export function planForDay(room, day, friendly = {}) {
  const named = day && day.plan ? matchPlan(day.plan, room.plans, friendly) : null;
  if (named) return named;
  if (day && day.free) return room.free_day;
  return (room.week || {})[day ? day.weekday : 'mon'] || room.plans[0];
}

// ---------- exceptions ----------

const WORKING = ['werktag', 'working day', 'arbeitstag'];
const FREE = ['freier tag', 'free day', 'wochenende', 'weekend'];

/** An exception event title -> {free, plan, note}, or null if it isn't one (same rule as the day script). */
export function parseException(title) {
  const m = String(title).trim().match(/^(.*?)(?:\s+[–-]\s+(.*))?$/);
  const base = m[1].trim();
  const note = (m[2] || '').trim() || null;
  const low = base.toLowerCase();
  if (WORKING.includes(low)) return { free: false, plan: null, note };
  if (FREE.includes(low)) return { free: true, plan: null, note };
  if (low.startsWith('plan:')) return { free: false, plan: base.slice(5).trim(), note };
  return null;
}

/** The event title for an exception: {free} or {plan}, with an optional note. */
export function exceptionTitle(ex, lang) {
  const t = I18N[lang] || I18N.en;
  const base = ex.plan ? `Plan: ${ex.plan}` : (ex.free ? t.free_day : t.working_day);
  return ex.note ? `${base} – ${ex.note}` : base;
}

// ---------- texts ----------

export const I18N = {
  de: {
    working_day: 'Werktag', free_day: 'Freier Tag', today: 'Heute', tomorrow: 'Morgen',
    weekdays: { mon: 'Montag', tue: 'Dienstag', wed: 'Mittwoch', thu: 'Donnerstag', fri: 'Freitag', sat: 'Samstag', sun: 'Sonntag' },
    wd_short: { mon: 'Mo', tue: 'Di', wed: 'Mi', thu: 'Do', fri: 'Fr', sat: 'Sa', sun: 'So' },
    holiday: 'Feiertag', exception: 'Ausnahme', calendar: 'Kalender', plain: '',
    off: 'Aus', until: 'bis', then: 'dann', tomorrow_l: 'morgen', no_change: 'keine Änderung',
    manual: 'Manuell', plan: 'Plan', plans: 'Pläne', week: 'Woche', days: 'Tage', settings: 'Einstellungen',
    room: 'Raum', save: 'Speichern', cancel: 'Abbrechen', delete: 'Löschen', add_period: 'Periode hinzufügen',
    add_plan: 'Plan hinzufügen', copy_from: 'Vorlage', starter_weekday: 'Vorlage Werktag', starter_free: 'Vorlage Freier Tag',
    name: 'Name', from: 'ab', temperature: 'Temperatur', as_decided: 'Wie berechnet', note: 'Notiz',
    free_day_plan: 'Plan für freie Tage', working_day_plans: 'Pläne für Werktage',
    only_if_working: 'nur wenn zum Werktag gemacht', paused: 'Pausiert', active: 'Aktiv',
    add_room: 'Raum hinzufügen', thermostats: 'Thermostate', create: 'Anlegen',
    keyword_calendars: 'Kalender für Stichwörter', rules: 'Stichwort-Regeln', keyword: 'Stichwort',
    rule_free: 'freier Tag', workday_sensor: 'Workday-Sensor', exceptions_calendar: 'Kalender für Ausnahmen',
    holiday_calendar: 'Feiertagskalender', add_rule: 'Regel hinzufügen', none: '—',
    err_first: 'Die erste Periode muss um 00:00 beginnen.', err_order: 'Die Zeiten müssen aufsteigen.',
    err_temp: `Temperaturen zwischen ${MIN_T} und ${MAX_T} °C.`,
    no_directory: 'Die Räume erscheinen hier, sobald ein Administrator die Weekheat-Karte einmal geöffnet hat.',
    no_rooms: 'Noch keine Räume. Ein Raum ist eine Automation aus dem Blueprint „Weekheat room“.',
    no_script: 'Das Skript „Weekheat day“ fehlt.', unavailable: 'nicht erreichbar',
    plan_in_use: 'Dieser Plan wird in der Woche verwendet und kann nicht gelöscht werden.',
    confirm_delete_plan: 'Plan löschen?', saved: 'Gespeichert', error: 'Fehler',
    new_room_paused: 'Neue Räume starten pausiert: Pläne prüfen, dann aktivieren.',
    late: 'Verspätet', dismiss: 'Ausblenden', reason_weekend: 'Wochenende',
    heating: 'Heizt', scheduled: 'Nach Plan', current: 'Raum', layout_dial: 'Drehregler', layout_compact: 'Schieberegler',
    setpoint: 'Solltemperatur', all_rooms: 'Alle Räume', v_control: 'Regler', v_plan: 'Plan', v_week: 'Woche', heating_l_cap: 'Heizung', to: 'auf',
    rename: 'Umbenennen', unsaved: 'Nicht gespeichert', used_on: 'Verwendet', not_used: 'Derzeit in keiner Woche verwendet',
    free_days: 'Freie Tage', week_help: 'Freie Tage sind Wochenenden, Feiertage und Tage aus Kalender oder Ausnahmen.',
    rooms: 'Räume', thermostats_short: ['Thermostat', 'Thermostate'], windows_short: ['Kontakt', 'Kontakte'], day_settings: 'Werktage und freie Tage',
    day_settings_sub: 'Kalender, Stichwörter, Workday', pause_room: 'Raum pausieren', activate_room: 'Raum aktivieren',
    pause_help: 'Pausiert: Weekheat schreibt nichts, die Thermostate behalten ihren Wert. Zum Abschalten den Heizungsschalter des Raums verwenden.', heating_off: 'Aus', heating_l: 'Heizung', turn_on: 'Heizung einschalten', turn_off: 'Heizung ausschalten', window_open: 'Fenster offen', windows: 'Fenster- und Türkontakte',
    window_delay: 'Verzögerung (Sekunden)',
    exercise: 'Ventilpflege', exercise_sub: 'Einmal pro Woche ganz öffnen und schließen', exercise_day: 'Tag', exercise_time: 'Uhrzeit',
    exercise_wait: 'Wartezeit (Sekunden)', exercise_now: 'Jetzt ausführen', exercise_started: 'Ventilpflege läuft',
    exercise_help: 'Alle Thermostate auf 30 °C, warten, auf 5 °C, warten, das Ganze zweimal; danach wieder der Wert von vorher (oder der Plan, falls inzwischen eine neue Periode begann). Dauert etwa viermal die Wartezeit. Pausierte Räume werden ausgelassen.',
    confirm_exercise: 'Ventilpflege jetzt in allen aktiven Räumen ausführen?',
    window_help: 'Ist einer davon so lange offen, werden die Thermostate auf 5 °C gestellt; sind alle wieder zu, gilt wieder der Wert von vorher (oder der Plan, falls inzwischen eine neue Periode begann).',
    room_sensor: 'Raumsensor', room_margin: 'Spielraum', rc_closed: 'Warm genug · Ventil zu',
    v_setup: 'Einrichtung', all_th: 'Alle', both_th: 'Beide', both_help: 'verschiebt alle um gleich viel', to_plan: 'Zurück zum Plan',
    manual_until: 'Manuelle Werte gelten bis', manual_then: ', dann wieder der Plan.', colder: 'Kälter', warmer: 'Wärmer', pick_th: 'Thermostat wählen', search: 'Suchen', add: 'Hinzufügen', remove: 'Entfernen', in_area: 'Im Bereich',
    other_areas: 'Andere Bereiche', no_match: 'Nichts gefunden', more_matches: 'weitere – Suche verfeinern',
    windows_doors: 'Fenster und Türen', delay: 'Verzögerung (Sekunden)', margin_less: 'Spielraum kleiner', margin_more: 'Spielraum größer',
    day_wd: 'Workday und Feiertage', calendars_n: ['Kalender', 'Kalender'], rules_n: ['Regel', 'Regeln'], room_sensor_short: 'Raumsensor',
    room_closed_help: 'Ist der Raum um den Spielraum wärmer als die Solltemperatur, geht das Ventil zu (5 °C). Ist er wieder auf die Solltemperatur abgekühlt, heizt es wieder.',
    rs_workaround: 'Nur nötig für Thermostate, die einen verknüpften Sensor nicht beachten oder überschwingen, z. B. Aqara W600. Thermostate, die gut regeln, brauchen das nicht.',
    bp_old: 'Die Weekheat-Blueprints sind älter als die Karte ({a} → {b}).', bp_none: 'ohne Version', bp_update: 'Jetzt aktualisieren',
    room_help: 'Ist der Raum um den Spielraum wärmer als die Solltemperatur, werden die Thermostate auf 5 °C gestellt; ist er wieder auf die Solltemperatur abgekühlt, bekommen sie sie zurück. Für Thermostate, die überschwingen oder einen verknüpften Sensor nicht beachten.',
  },
  en: {
    working_day: 'Working day', free_day: 'Free day', today: 'Today', tomorrow: 'Tomorrow',
    weekdays: { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' },
    wd_short: { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' },
    holiday: 'Public holiday', exception: 'Exception', calendar: 'Calendar', plain: '',
    off: 'Off', until: 'until', then: 'then', tomorrow_l: 'tomorrow', no_change: 'no change',
    manual: 'Manual', plan: 'Plan', plans: 'Plans', week: 'Week', days: 'Days', settings: 'Settings',
    room: 'Room', save: 'Save', cancel: 'Cancel', delete: 'Delete', add_period: 'Add period',
    add_plan: 'Add plan', copy_from: 'Template', starter_weekday: 'Starter working day', starter_free: 'Starter free day',
    name: 'Name', from: 'from', temperature: 'Temperature', as_decided: 'As decided', note: 'Note',
    free_day_plan: 'Plan for free days', working_day_plans: 'Plans for working days',
    only_if_working: 'only if made a working day', paused: 'Paused', active: 'Active',
    add_room: 'Add room', thermostats: 'Thermostats', create: 'Create',
    keyword_calendars: 'Keyword calendars', rules: 'Keyword rules', keyword: 'Keyword',
    rule_free: 'free day', workday_sensor: 'Workday sensor', exceptions_calendar: 'Exceptions calendar',
    holiday_calendar: 'Holiday calendar', add_rule: 'Add rule', none: '—',
    err_first: 'The first period must start at 00:00.', err_order: 'Times must increase.',
    err_temp: `Temperatures between ${MIN_T} and ${MAX_T} °C.`,
    no_directory: 'The rooms show here once an administrator has opened the Weekheat card.',
    no_rooms: 'No rooms yet. A room is an automation made from the "Weekheat room" blueprint.',
    no_script: 'The "Weekheat day" script is missing.', unavailable: 'unavailable',
    plan_in_use: 'This plan is used in the week and cannot be deleted.',
    confirm_delete_plan: 'Delete plan?', saved: 'Saved', error: 'Error',
    new_room_paused: 'New rooms start paused: check the plans, then activate.',
    late: 'Late', dismiss: 'Dismiss', reason_weekend: 'Weekend',
    heating: 'Heating', scheduled: 'Scheduled', current: 'Room', layout_dial: 'Dial', layout_compact: 'Slider',
    setpoint: 'Setpoint', all_rooms: 'All rooms', v_control: 'Control', v_plan: 'Plan', v_week: 'Week', heating_l_cap: 'Heating', to: 'to',
    rename: 'Rename', unsaved: 'Not saved', used_on: 'Used', not_used: 'Not used in the week at the moment',
    free_days: 'Free days', week_help: 'Free days are weekends, public holidays and days from calendars or exceptions.',
    rooms: 'Rooms', thermostats_short: ['thermostat', 'thermostats'], windows_short: ['contact', 'contacts'], day_settings: 'Working days and free days',
    day_settings_sub: 'Calendars, keywords, Workday', pause_room: 'Pause room', activate_room: 'Activate room',
    pause_help: 'Paused: Weekheat writes nothing and the thermostats keep their value. To turn a room off, use its heating switch.', heating_off: 'Off', heating_l: 'heating', turn_on: 'Turn heating on', turn_off: 'Turn heating off', window_open: 'Window open', windows: 'Window and door sensors',
    window_delay: 'Delay (seconds)',
    exercise: 'Valve exercise', exercise_sub: 'Open and close fully once a week', exercise_day: 'Day', exercise_time: 'Time',
    exercise_wait: 'Wait (seconds)', exercise_now: 'Run now', exercise_started: 'Valve exercise running',
    exercise_help: 'All thermostats to 30 °C, wait, to 5 °C, wait, twice; then the value from before again (or the plan, if a new period began in between). Takes about four times the wait. Paused rooms are left out.',
    confirm_exercise: 'Run the valve exercise now in all active rooms?',
    window_help: 'When one of them has been open this long, the thermostats are set to 5 °C; when all are closed again, the value from before applies again (or the plan, if a new period began in between).',
    room_sensor: 'Room sensor', room_margin: 'Margin', rc_closed: 'Warm enough · valve closed',
    v_setup: 'Setup', all_th: 'All', both_th: 'All together', both_help: 'moves all by the same amount', to_plan: 'Back to plan',
    manual_until: 'Manual values hold until', manual_then: ', then the plan again.', colder: 'Colder', warmer: 'Warmer', pick_th: 'Pick a thermostat', search: 'Search', add: 'Add', remove: 'Remove', in_area: 'In the area',
    other_areas: 'Other areas', no_match: 'No match', more_matches: 'more – refine the search',
    windows_doors: 'Windows and doors', delay: 'Delay (seconds)', margin_less: 'Smaller margin', margin_more: 'Larger margin',
    day_wd: 'Workday and holidays', calendars_n: ['calendar', 'calendars'], rules_n: ['rule', 'rules'], room_sensor_short: 'room sensor',
    room_closed_help: 'When the room is the margin above the setpoint, the valve closes (5 °C). Once it has cooled down to the setpoint, it heats again.',
    rs_workaround: 'Only needed for thermostats that ignore a linked sensor or overshoot, e.g. the Aqara W600. Thermostats that control well do not need it.',
    bp_old: 'The Weekheat blueprints are older than the card ({a} → {b}).', bp_none: 'no version', bp_update: 'Update now',
    room_help: 'When the room is the margin above the setpoint, the thermostats are set to 5 °C; once it has cooled down to the setpoint, they get it back. For thermostats that overshoot or ignore a linked sensor.',
  },
};

/** Why a day (from the day script) is what it is, for the day list. */
export function reasonText(day, lang) {
  const t = I18N[lang] || I18N.en;
  switch (day.kind) {
    case 'weekend': return t.weekdays[day.weekday] || t.reason_weekend;
    case 'holiday': return day.detail ? `${t.holiday}: ${day.detail}` : t.holiday;
    case 'calendar': return `${day.source || t.calendar}: ${day.detail}`;
    case 'exception': return `${t.exception}${day.note ? `: ${day.note}` : ''}`;
    default: return '';
  }
}

/** A temperature for display: "21 °C", "20.5 °C" (or "Off" for an off period). */
export function fmtTemp(p, lang) {
  if (p == null) return '–';
  if (typeof p === 'object') {
    if (p.off) return (I18N[lang] || I18N.en).off;
    if (p.temperature == null) return '–';
    p = p.temperature;
  }
  return `${Number(p).toLocaleString(lang === 'de' ? 'de-AT' : 'en-GB', { maximumFractionDigits: 1 })} °C`;
}

/** Colour of a temperature on the ribbon (off and gaps are drawn separately). */
export function tempColor(t) {
  const x = Math.max(0, Math.min(1, (t - 14) / 10));
  const hue = 210 - x * 195; // 14 °C blue ... 24 °C orange-red
  return `hsl(${Math.round(hue)}, 70%, ${Math.round(55 - x * 5)}%)`;
}

// ---------- dial ----------

/** The dial is a 270° arc in a 200×200 box, from bottom left (135°) clockwise to bottom right. */
export const DIAL = { cx: 100, cy: 100, r: 80, start: 135, sweep: 270 };

/** Angle in degrees (0 = right, clockwise) of temperature `v` on a scale lo..hi. */
export function dialAngle(v, lo, hi) {
  const x = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  return DIAL.start + x * DIAL.sweep;
}

/** Point on the dial circle (radius `r`) at angle `a`. */
export function dialPoint(a, r = DIAL.r) {
  const rad = (a * Math.PI) / 180;
  return [DIAL.cx + r * Math.cos(rad), DIAL.cy + r * Math.sin(rad)];
}

/** SVG arc path from angle a1 to a2 (clockwise). */
export function dialArc(a1, a2, r = DIAL.r) {
  const [x1, y1] = dialPoint(a1, r);
  const [x2, y2] = dialPoint(a2, r);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** Temperature for a pointer at (x, y) in dial coordinates, snapped to `step`. The gap at the bottom
 * goes to the nearer end. */
export function dialValue(x, y, lo, hi, step) {
  const deg = (Math.atan2(y - DIAL.cy, x - DIAL.cx) * 180) / Math.PI;
  let a = (((deg - DIAL.start) % 360) + 360) % 360;
  if (a > DIAL.sweep) a = a > DIAL.sweep + (360 - DIAL.sweep) / 2 ? 0 : DIAL.sweep;
  const v = lo + (a / DIAL.sweep) * (hi - lo);
  return Math.max(lo, Math.min(hi, Math.round(v / step) * step));
}

/** HTML escape. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// =====================================================================================
// The card (DOM). Everything below needs a browser and Home Assistant.
// =====================================================================================

const Base = typeof HTMLElement !== 'undefined' ? HTMLElement : class {};
const RELOAD_MS = 10 * 60 * 1000; // re-read rooms, plans and days this often

class WeekheatCard extends Base {
  setConfig(config) {
    this._config = { days: 14, day_script: 'script.weekheat_day', layout: 'dial', dial_min: MIN_T, dial_max: MAX_T, ...config };
    let saved = null;
    try { saved = localStorage.getItem('weekheat-layout'); } catch (e) { /* no storage */ }
    this._layout = ['dial', 'compact'].includes(saved) ? saved : this._config.layout === 'compact' ? 'compact' : 'dial';
    this._ui = this._ui || { view: 'rooms', open: null, sub: {}, planSel: {}, editPeriod: null, renamePlan: null, setOpen: null,
      dayEdit: null, addRoom: null, addPlan: null };
    this._render();
  }

  static getStubConfig() { return {}; }

  getCardSize() { return 2 + (this._rooms ? this._rooms.length : 1); }

  set hass(h) {
    const first = !this._hass;
    this._hass = h;
    this._lang = String(h.locale?.language || h.language || 'en').startsWith('de') ? 'de' : 'en';
    if (first) { this._subscribe(); this._load(); }
    const sig = this._signature();
    if (sig !== this._sig) { this._sig = sig; this._render(); }
  }

  connectedCallback() {
    this._timer = setInterval(() => this._load(), RELOAD_MS);
    this._minute = setInterval(() => this._render(), 60 * 1000);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
    clearInterval(this._minute);
    if (this._unsub) { this._unsub.then((u) => u()).catch(() => {}); this._unsub = null; }
    if (this._dirUnsub) { this._dirUnsub.then((u) => u()).catch(() => {}); this._dirUnsub = null; }
  }

  get _t() { return I18N[this._lang] || I18N.en; }

  // ---------- data ----------

  async _load() {
    const h = this._hass;
    if (!h) return;
    this._admin = !!h.user?.is_admin;
    try {
      let rooms;
      if (this._admin) {
        const autos = Object.values(h.states).filter((s) => s.entity_id.startsWith('automation.') && s.attributes.id);
        const cfgs = await Promise.all(autos.map((a) => h.callApi('GET', `config/automation/config/${a.attributes.id}`)
          .then((c) => ({ entity: a.entity_id, id: a.attributes.id, c })).catch(() => null)));
        rooms = cfgs.filter((x) => x && x.c.use_blueprint && String(x.c.use_blueprint.path).endsWith(ROOM_BLUEPRINT))
          .map(({ entity, id, c }) => ({ entity, id, cfg: c, ...roomFromInput(c.use_blueprint.input || {}, c.alias) }));
        const scriptId = this._config.day_script.replace(/^script\./, '');
        this._script = await h.callApi('GET', `config/script/config/${scriptId}`).catch(() => null);
        const bps = await h.callWS({ type: 'blueprint/list', domain: 'automation' }).catch(() => ({}));
        const sbps = await h.callWS({ type: 'blueprint/list', domain: 'script' }).catch(() => ({}));
        this._roomBlueprint = Object.keys(bps).find((p) => p.endsWith(ROOM_BLUEPRINT)) || null;
        // Blueprints older than this card: offered for update (see bp-update).
        this._bpOld = [['automation', bps, ROOM_BLUEPRINT], ['script', sbps, DAY_BLUEPRINT]].flatMap(([domain, list, file]) => {
          const path = Object.keys(list).find((p) => p.endsWith(file));
          const installed = path ? blueprintVersion(list[path]?.metadata?.description) : null;
          return path && olderVersion(installed, BLUEPRINT_VERSION) ? [{ domain, path, file, installed }] : [];
        });
        this._exceptions = this._script?.use_blueprint?.input?.exceptions || null;
        await this._publish(rooms);
      } else {
        // Users without admin rights can't read automations; an admin's card publishes the rooms (see _publish).
        const dir = (await h.callWS({ type: 'frontend/get_system_data', key: DIRECTORY_KEY }).catch(() => null))?.value;
        if (!dir || !Array.isArray(dir.rooms)) { this._rooms = null; this._noDirectory = true; this._render(true); return; }
        this._noDirectory = false;
        rooms = dir.rooms.map((r) => ({ ...r }));
        this._script = null;
        this._exceptions = dir.exceptions || null;
        this._hasScript = !!dir.script;
        this._watchDirectory();
      }
      const order = this._config.rooms;
      this._allRooms = rooms;
      if (Array.isArray(order) && order.length) rooms = order.map((e) => rooms.find((r) => r.entity === e || r.id === e)).filter(Boolean);
      else rooms = [...rooms].sort((a, b) => a.name.localeCompare(b.name));
      this._rooms = rooms;

      // plans: schedule items by entity
      const [items, registry] = await Promise.all([h.callWS({ type: 'schedule/list' }),
        h.callWS({ type: 'config/entity_registry/list' })]);
      const byUid = Object.fromEntries(registry.filter((e) => e.platform === 'schedule').map((e) => [e.unique_id, e.entity_id]));
      this._registry = registry;
      this._plans = {};
      for (const it of items) {
        const entity = byUid[it.id];
        if (entity) this._plans[entity] = { item: it, periods: blocksToPeriods(it.monday) };
      }

      await this._loadDays();
      this._error = null;
    } catch (e) {
      this._error = e.message || String(e);
    }
    this._render(true);
  }

  /** Is the day script there? Admins know from its configuration, others from the published directory. */
  get _dayScript() { return this._admin ? !!this._script : !!this._hasScript; }

  /** Admin only: store what other users' cards need to know about the rooms (they can't read automations)
   * in Home Assistant's frontend system data, which every user can read. Written only when it changed. */
  async _publish(rooms) {
    const dir = { v: 1, script: !!this._script, exceptions: this._exceptions,
      rooms: rooms.map((r) => Object.fromEntries(DIRECTORY_FIELDS.map((k) => [k, r[k] ?? null]))) };
    try {
      const h = this._hass;
      const cur = (await h.callWS({ type: 'frontend/get_system_data', key: DIRECTORY_KEY }))?.value;
      if (JSON.stringify(cur) !== JSON.stringify(dir)) await h.callWS({ type: 'frontend/set_system_data', key: DIRECTORY_KEY, value: dir });
    } catch (e) { /* older Home Assistant: no system data, so only admins see rooms */ }
  }

  /** Non-admin: reload when an admin's card publishes a new directory. */
  _watchDirectory() {
    if (this._dirUnsub) return;
    let first = true;
    try {
      this._dirUnsub = this._hass.connection.subscribeMessage(() => {
        if (first) { first = false; return; }
        this._load();
      }, { type: 'frontend/subscribe_system_data', key: DIRECTORY_KEY });
      this._dirUnsub.catch(() => { this._dirUnsub = null; });
    } catch (e) { /* reloads every RELOAD_MS anyway */ }
  }

  async _loadDays() {
    const h = this._hass;
    if (!this._dayScript) { this._days = null; return; }
    const r = await h.callWS({ type: 'call_service', domain: 'script', service: this._config.day_script.replace(/^script\./, ''),
      service_data: { days: this._config.days }, return_response: true });
    this._days = (r.response && r.response.days) || [];
  }

  _subscribe() {
    this._notes = {};
    try {
      this._unsub = this._hass.connection.subscribeMessage((m) => {
        if (m.type === 'removed') for (const id of Object.keys(m.notifications)) delete this._notes[id];
        else Object.assign(this._notes, m.notifications);
        this._render(true);
      }, { type: 'persistent_notification/subscribe' });
    } catch (e) { /* older HA: no banners */ }
  }

  /** What the visible part depends on, so unrelated state changes don't re-render (and steal focus). */
  _signature() {
    const h = this._hass;
    if (!h || !this._rooms) return '';
    const ids = new Set();
    for (const r of this._rooms) { ids.add(r.entity); r.thermostats.forEach((t) => ids.add(t)); r.plans.forEach((p) => ids.add(p)); (r.windows || []).forEach((w) => ids.add(w)); if (r.state) ids.add(r.state); if (r.heating_switch) ids.add(r.heating_switch); if (r.room_sensor) ids.add(r.room_sensor); }
    return [...ids].map((e) => h.states[e]?.last_updated).join('|');
  }

  _friendly() {
    const out = {};
    for (const p of Object.keys(this._plans || {})) out[p] = this._hass.states[p]?.attributes.friendly_name || this._plans[p].item.name;
    return out;
  }

  _planName(room, entity) {
    const p = this._plans?.[entity];
    return planLabel(this._hass.states[entity]?.attributes.friendly_name || p?.item.name || entity, room.name);
  }

  _now() { return nowIn(this._hass.config.time_zone); }

  _today() {
    const now = this._now();
    return (this._days || []).find((d) => d.date === now.date) || { date: now.date, weekday: now.day, free: false, kind: 'plain' };
  }

  /** The room's situation right now: plan, period, next change, wanted and actual setpoints. */
  _roomNow(room) {
    const h = this._hass;
    const now = this._now();
    const plan = planForDay(room, this._today(), this._friendly());
    const periods = this._plans?.[plan]?.periods || [];
    const at = periods.length ? periodAt(periods, now.min) : null;
    const wanted = at && at.period.temperature != null ? periodTemp(at.period) : null;
    const th = room.thermostats.map((e) => h.states[e]).filter(Boolean);
    const avail = th.filter((s) => !['unavailable', 'unknown'].includes(s.state));
    const cur = avail.map((s) => s.attributes.current_temperature).filter((x) => typeof x === 'number');
    let target = avail.map((s) => s.attributes.temperature).find((x) => typeof x === 'number');
    let st = {};
    try { st = JSON.parse(h.states[room.state]?.state || '{}') || {}; } catch (e) { /* not JSON */ }
    const saved = st._open || null;
    const exercise = !!st._ex && h.states[room.entity]?.state === 'on';
    const openWin = (room.windows || []).filter((w) => h.states[w]?.state === 'on');
    const heatingOff = !!room.heating_switch && h.states[room.heating_switch]?.state === 'off';
    const held = !heatingOff && !!saved && h.states[room.entity]?.state === 'on';
    // Held at 5 °C by the room sensor: the room's setpoint is the one to be given back.
    const roomClosed = held && !!st._rc;
    const windowOpen = held && !st._rc;
    const keep = roomClosed ? saved.filter((x) => typeof x === 'number') : [];
    if (keep.length) target = Math.max(...keep);
    const manual = !exercise && !heatingOff && !windowOpen && wanted != null && (roomClosed
      ? target != null && Math.abs(target - wanted) >= 0.25
      : avail.some((s) => s.state === 'off' || Math.abs((s.attributes.temperature ?? -99) - wanted) >= 0.25));
    const rs = room.room_sensor ? h.states[room.room_sensor] : null;
    const roomT = rs && rs.state !== '' && !isNaN(+rs.state) ? +rs.state : null;
    return { exercise, heatingOff, windowOpen, roomClosed, openWin, plan, periods, at, wanted, target, saved,
      current: roomT ?? (cur.length ? cur.reduce((a, b) => a + b, 0) / cur.length : null),
      unavailable: th.length - avail.length, off: avail.some((s) => s.state === 'off'), manual,
      active: h.states[room.entity]?.state === 'on', step: avail[0]?.attributes.target_temp_step || 0.5,
      // hvac_action alone is not enough: over HomeKit the Aqara valves report "heating" whenever the mode is heat.
      heating: !roomClosed && avail.some((s) => s.attributes.hvac_action === 'heating'
        && !(typeof s.attributes.current_temperature === 'number' && typeof s.attributes.temperature === 'number'
          && s.attributes.current_temperature >= s.attributes.temperature - 0.2)) };
  }

  /** The room's situation as seen by one thermostat `e` (its setpoint, temperature, manual and heating flags);
   * `n` is the room's (from _roomNow). While the room sensor holds the valves closed, its saved setpoint counts. */
  _thNow(room, n, e) {
    const s = this._hass.states[e];
    const i = room.thermostats.indexOf(e);
    const ok = s && !['unavailable', 'unknown'].includes(s.state);
    let target = ok ? s.attributes.temperature : null;
    if (n.roomClosed && typeof n.saved?.[i] === 'number') target = n.saved[i];
    const cur = ok ? s.attributes.current_temperature : null;
    const manual = !n.exercise && !n.heatingOff && !n.windowOpen && n.wanted != null && ok
      && (s.state === 'off' || typeof target !== 'number' || Math.abs(target - n.wanted) >= 0.25);
    const heating = !n.roomClosed && ok && s.attributes.hvac_action === 'heating'
      && !(typeof cur === 'number' && typeof target === 'number' && cur >= target - 0.2);
    return { ...n, target, current: typeof cur === 'number' ? cur : n.current, manual, heating, th: e, label: this._thLabel(room, e),
      step: (ok && s.attributes.target_temp_step) || n.step };
  }

  /** A thermostat's short name: its friendly name without the room's name in front ("Couch"). */
  _thLabel(room, e) {
    const f = this._hass.states[e]?.attributes.friendly_name || e;
    return planLabel(f, room.name) || f;
  }

  /** What a control for `th` (a thermostat, or '' for all of the room's) shows. */
  _ctlNow(room, th) {
    const n = this._roomNow(room);
    return th && room.thermostats.includes(th) ? this._thNow(room, n, th) : n;
  }

  /** The value a control for `th` shows now: one being set, else its setpoint (plus a pending "all" step). */
  _shown(room, th, n) {
    const st = this._stepTarget;
    if (st && st.room === room.id && st.th === (th || '')) return st.value;
    const sa = this._stepAll;
    if (sa && sa.room === room.id && th && typeof sa.base[th] === 'number') return clampT(sa.base[th] + sa.delta);
    // "All" while the thermostats differ: start from their average.
    const mixed = !th && this._mixed(room, n);
    if (mixed) return Math.round(mixed.reduce((a, b) => a + b, 0) / mixed.length / n.step) * n.step;
    return n.target;
  }

  /** The room's setpoints when its thermostats differ, else null. */
  _mixed(room, n) {
    if (room.thermostats.length < 2) return null;
    const v = room.thermostats.map((e) => this._thNow(room, n, e).target).filter((x) => typeof x === 'number');
    return v.length > 1 && v.some((x) => Math.abs(x - v[0]) >= 0.05) ? v : null;
  }

  // ---------- actions ----------

  async _run(fn, ok) {
    try {
      await fn();
      if (ok !== false) this._flash(this._t.saved);
    } catch (e) {
      this._flash(`${this._t.error}: ${e.message || e.error || JSON.stringify(e)}`, true);
    }
  }

  _flash(text, bad = false) {
    this._msg = { text, bad };
    this._render(true);
    clearTimeout(this._msgTimer);
    this._msgTimer = setTimeout(() => { this._msg = null; this._render(true); }, bad ? 8000 : 2500);
  }

  async _saveRoomConfig(room, input) {
    const cfg = { ...room.cfg, use_blueprint: { ...room.cfg.use_blueprint, input: { ...room.cfg.use_blueprint.input, ...input } } };
    await this._hass.callApi('POST', `config/automation/config/${room.id}`, cfg);
    room.cfg = cfg;
    Object.assign(room, roomFromInput(cfg.use_blueprint.input, cfg.alias));
    await this._publish(this._allRooms || this._rooms);
  }

  /** Switch the room's heating on or off; creates the switch (an input_boolean) on first use. */
  async _togglePower(room) {
    const h = this._hass;
    let sw = room.heating_switch;
    if (!sw || !h.states[sw]) {
      if (!this._admin) throw new Error('no heating switch');
      sw = await this._createSwitch(room.name);
      await this._saveRoomConfig(room, { heating_switch: sw });
      await new Promise((r) => setTimeout(r, 1500)); // the automation reloads with the new trigger
      await h.callService('input_boolean', 'turn_off', { entity_id: sw });
      return;
    }
    await h.callService('input_boolean', h.states[sw].state === 'off' ? 'turn_on' : 'turn_off', { entity_id: sw });
  }

  async _createSwitch(name) {
    const h = this._hass;
    const it = await h.callWS({ type: 'input_boolean/create', name: `Weekheat ${name} ${this._t.heating_l}`, icon: 'mdi:radiator', initial: true });
    const sw = `input_boolean.${it.id}`;
    for (let i = 0; i < 20 && !h.states[sw]; i++) await new Promise((r) => setTimeout(r, 250));
    if (this._hass.states[sw]?.state !== 'on') await h.callService('input_boolean', 'turn_on', { entity_id: sw });
    return sw;
  }

  async _poke(rooms = this._rooms) {
    // Let the room automations apply a change right away (only active ones).
    const on = rooms.filter((r) => this._hass.states[r.entity]?.state === 'on').map((r) => r.entity);
    if (on.length) await this._hass.callService('automation', 'trigger', { entity_id: on, skip_condition: true });
  }

  async _savePlan(room, entity, draft) {
    const errs = checkPeriods(draft.periods);
    if (errs.length) throw new Error(errs.map((e) => this._t[`err_${e}`]).join(' '));
    const it = this._plans[entity].item;
    const blocks = periodsToBlocks(draft.periods);
    const name = draft.name && draft.name !== this._planName(room, entity) ? `${room.name} ${draft.name}` : it.name;
    const updated = await this._hass.callWS({ type: 'schedule/update', schedule_id: it.id, name, ...(it.icon ? { icon: it.icon } : {}),
      ...Object.fromEntries(SCHEDULE_DAYS.map((d) => [d, blocks])) });
    this._plans[entity] = { item: updated, periods: blocksToPeriods(updated.monday) };
  }

  async _createPlan(roomName, planName, periods) {
    const h = this._hass;
    const blocks = periodsToBlocks(periods);
    const item = await h.callWS({ type: 'schedule/create', name: `${roomName} ${planName}`, icon: 'mdi:calendar-clock',
      ...Object.fromEntries(SCHEDULE_DAYS.map((d) => [d, blocks])) });
    let entity = null;
    for (let i = 0; i < 20 && !entity; i++) {
      const reg = await h.callWS({ type: 'config/entity_registry/list' });
      entity = reg.find((e) => e.platform === 'schedule' && e.unique_id === item.id)?.entity_id;
      if (!entity) await new Promise((r) => setTimeout(r, 250));
    }
    if (!entity) throw new Error('schedule entity not found');
    const wanted = `schedule.weekheat_${slugify(roomName)}_${slugify(planName)}`;
    if (entity !== wanted && !h.states[wanted]) {
      await h.callWS({ type: 'config/entity_registry/update', entity_id: entity, new_entity_id: wanted });
      entity = wanted;
    }
    this._plans[entity] = { item, periods: blocksToPeriods(item.monday) };
    return entity;
  }

  async _addPlan(room, name, template) {
    let periods = STARTER.weekday;
    if (template === 'starter_free') periods = STARTER.free;
    else if (template && this._plans[template]) periods = this._plans[template].periods;
    const entity = await this._createPlan(room.name, name, periods);
    await this._saveRoomConfig(room, { plans: [...room.plans, entity] });
    return entity;
  }

  async _deletePlan(room, entity) {
    const used = entity === room.free_day || Object.values(room.week || {}).includes(entity);
    if (used) throw new Error(this._t.plan_in_use);
    await this._saveRoomConfig(room, { plans: room.plans.filter((p) => p !== entity) });
    const it = this._plans[entity]?.item;
    if (it) await this._hass.callWS({ type: 'schedule/delete', schedule_id: it.id });
    delete this._plans[entity];
  }

  async _addRoom(name, thermostats) {
    const h = this._hass;
    if (!this._roomBlueprint) throw new Error('blueprint weekheat_room not found');
    const slug = slugify(name);
    const id = `weekheat_${slug}`;
    if (this._rooms.some((r) => r.id === id)) throw new Error(`${name}: exists`);
    const t = this._t;
    const weekday = await this._createPlan(name, t.working_day, STARTER.weekday);
    const free = await this._createPlan(name, t.free_day, STARTER.free);
    const st = await h.callWS({ type: 'input_text/create', name: `Weekheat ${name} state`, max: 255, icon: 'mdi:database' });
    const stateEntity = `input_text.${st.id}`;
    const heatingSwitch = await this._createSwitch(name);
    const input = { room_name: name, thermostats, plans: [weekday, free], free_day: free, heating_switch: heatingSwitch,
      week: Object.fromEntries(WEEK.map((d) => [d, weekday])), state: stateEntity,
      day_script: this._config.day_script, language: this._lang,
      ...exerciseFromInput((this._allRooms || this._rooms || [])[0]?.cfg?.use_blueprint?.input) };
    // Created paused: initial_state false first, switched off, then saved again without it.
    const cfg = { alias: `Weekheat ${name}`, description: 'Weekheat', initial_state: false,
      use_blueprint: { path: this._roomBlueprint, input } };
    await h.callApi('POST', `config/automation/config/${id}`, cfg);
    let entity = null;
    for (let i = 0; i < 20 && !entity; i++) {
      entity = Object.values(this._hass.states).find((s) => s.entity_id.startsWith('automation.') && s.attributes.id === id)?.entity_id;
      if (!entity) await new Promise((r) => setTimeout(r, 250));
    }
    if (entity) await h.callService('automation', 'turn_off', { entity_id: entity });
    delete cfg.initial_state;
    await h.callApi('POST', `config/automation/config/${id}`, cfg);
    this._flash(t.new_room_paused);
    await this._load();
  }

  async _setException(date, ex) {
    const h = this._hass;
    const cal = this._exceptions;
    if (!cal) throw new Error('exceptions calendar not set');
    const events = await h.callApi('GET', `calendars/${cal}?start=${date}T00:00:00&end=${addDays(date, 1)}T00:00:00`);
    for (const e of events) {
      const start = (e.start.date || e.start.dateTime || '').slice(0, 10);
      if (start === date && parseException(e.summary)) await h.callWS({ type: 'calendar/event/delete', entity_id: cal, uid: e.uid, ...(e.recurrence_id ? { recurrence_id: e.recurrence_id } : {}) });
    }
    if (ex) {
      await h.callService('calendar', 'create_event', { entity_id: cal, summary: exceptionTitle(ex, this._lang),
        start_date: date, end_date: addDays(date, 1) });
    }
    await this._loadDays();
    if (date === this._now().date) await this._poke();
  }

  async _saveSettings(input) {
    const s = this._script;
    const cfg = { ...s, use_blueprint: { ...s.use_blueprint, input: { ...s.use_blueprint.input, ...input } } };
    await this._hass.callApi('POST', `config/script/config/${this._config.day_script.replace(/^script\./, '')}`, cfg);
    this._script = cfg;
    this._exceptions = cfg.use_blueprint.input.exceptions || null;
    await this._publish(this._allRooms || this._rooms);
    await new Promise((r) => setTimeout(r, 500));
    await this._loadDays();
    await this._poke();
  }

  // ---------- events ----------

  _bind() {
    if (this._bound) return;
    this._bound = true;
    const root = this.shadowRoot;
    root.addEventListener('click', (ev) => {
      const el = ev.target.closest('[data-a]');
      if (el && el.tagName !== 'SELECT' && el.tagName !== 'INPUT') this._act(el.dataset.a, el, ev);
    });
    root.addEventListener('change', (ev) => {
      const el = ev.target.closest('[data-c]');
      if (el && el.dataset.c !== 'pick-q') this._change(el.dataset.c, el);
    });
    // The picker's search filters as you type; the field keeps its focus and caret.
    root.addEventListener('input', (ev) => {
      const el = ev.target.closest('[data-c="pick-q"]');
      if (!el || !this._ui.pick) return;
      this._ui.pick.q = el.value;
      this._ui.pickFocus = el.selectionStart ?? el.value.length;
      this._render(true);
    });
    root.addEventListener('pointerdown', (ev) => {
      const sl = ev.target.closest('[data-slider]');
      if (sl && ev.button <= 0 && ev.target.closest('.sbar')) {
        ev.preventDefault();
        sl.setPointerCapture(ev.pointerId);
        this._drag = { room: this._room(sl), el: sl, slider: true, th: sl.dataset.th || '' };
        this._dragMove(ev);
        return;
      }
      const svg = ev.target.closest('svg[data-dial]');
      if (!svg || ev.button > 0) return;
      const [x, y] = this._dialEvent(ev, svg);
      const d = Math.hypot(x - DIAL.cx, y - DIAL.cy);
      if (d < DIAL.r - 28 || d > DIAL.r + 22) return; // only the ring
      ev.preventDefault();
      svg.setPointerCapture(ev.pointerId);
      this._drag = { room: this._room(svg), svg, th: svg.dataset.th || '' };
      this._dragMove(ev);
    });
    root.addEventListener('pointermove', (ev) => { if (this._drag) this._dragMove(ev); });
    const end = () => {
      if (!this._drag) return;
      const { room, value, th } = this._drag;
      this._drag = null;
      if (value != null) this._setTarget(room, value, 300, th);
    };
    root.addEventListener('pointerup', end);
    // Cancelled (e.g. the page scrolled instead): drop the value, write nothing.
    root.addEventListener('pointercancel', () => { if (this._drag) { this._drag = null; this._render(); } });
    root.addEventListener('keydown', (ev) => {
      const svg = ev.target.closest?.('svg[data-dial], [data-slider]');
      if (!svg) return;
      const k = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[ev.key];
      if (!k) return;
      ev.preventDefault();
      const room = this._room(svg);
      const th = svg.dataset.th || '';
      const n = this._ctlNow(room, th);
      const base = this._shown(room, th, n) ?? n.wanted ?? 20;
      this._setTarget(room, base + k * n.step, 700, th);
      this.shadowRoot.querySelector(`[data-room="${room.id}"] [data-th="${th}"]`)?.focus();
    });
    root.addEventListener('focusout', () => { if (this._pending) { this._pending = false; setTimeout(() => this._render(), 0); } });
  }

  /** Show `v` at once and write it after `delay` ms (repeated calls restart the wait) to thermostat `th`,
   * or to all of the room's thermostats when `th` is empty. */
  _setTarget(room, v, delay, th = '') {
    const n = this._ctlNow(room, th);
    v = clampT(Math.round(v / n.step) * n.step);
    if (this._stepTarget && (this._stepTarget.room !== room.id || this._stepTarget.th !== th)) this._flushStep();
    this._stepTarget = { room: room.id, th, value: v };
    clearTimeout(this._stepTimer);
    this._stepTimer = setTimeout(() => this._flushStep(), delay);
    this._render();
  }

  /** Replace the outdated Weekheat blueprints with the ones of this card's release (the GitHub tag), as HA's
   * "Re-import" does, then reload automations and scripts so the rooms use them. */
  async _updateBlueprints() {
    const h = this._hass;
    for (const b of this._bpOld || []) {
      const dir = b.domain === 'script' ? 'script' : 'automation';
      const rel = `blueprints/${dir}/${b.file}`;
      const r = await h.callWS({ type: 'blueprint/import', url: `${BLUEPRINT_REPO}v${BLUEPRINT_VERSION}/${rel}` });
      await h.callWS({ type: 'blueprint/save', domain: b.domain, path: b.path.replace(/\.yaml$/, ''), yaml: r.raw_data,
        source_url: `${BLUEPRINT_REPO}main/${rel}`, allow_override: true });
    }
    await h.callService('automation', 'reload', {});
    await h.callService('script', 'reload', {});
    await this._load();
  }

  /** Write a pending value of _setTarget now. */
  _flushStep() {
    clearTimeout(this._stepTimer);
    const st = this._stepTarget;
    const room = st && this._rooms.find((r) => r.id === st.room);
    if (!room) return;
    const ids = st.th ? [st.th] : room.thermostats;
    this._run(() => this._hass.callService('climate', 'set_temperature', { entity_id: ids, temperature: st.value }), false)
      .finally(() => { setTimeout(() => { if (this._stepTarget === st) { this._stepTarget = null; this._render(); } }, 4000); });
  }

  /** "All together": shift each of the room's thermostats by `k` steps from its own setpoint, written after a short wait. */
  _stepAllBy(room, k) {
    const n = this._roomNow(room);
    if (!this._stepAll || this._stepAll.room !== room.id) {
      this._stepAll = { room: room.id, delta: 0, base: Object.fromEntries(room.thermostats.map((e) => [e, this._thNow(room, n, e).target])) };
    }
    const sa = this._stepAll;
    sa.delta = Math.round((sa.delta + k * n.step) * 10) / 10;
    clearTimeout(this._stepAllTimer);
    this._stepAllTimer = setTimeout(() => {
      const writes = Object.entries(sa.base).filter(([, b]) => typeof b === 'number');
      this._run(() => Promise.all(writes.map(([e, b]) =>
        this._hass.callService('climate', 'set_temperature', { entity_id: e, temperature: clampT(b + sa.delta) }))), false)
        .finally(() => { setTimeout(() => { if (this._stepAll === sa) { this._stepAll = null; this._render(); } }, 4000); });
    }, 700);
    this._render();
  }

  _dialEvent(ev, svg) {
    const b = svg.getBoundingClientRect();
    return [((ev.clientX - b.left) / b.width) * 200, ((ev.clientY - b.top) / b.height) * 200];
  }

  _dragMove(ev) {
    const { room, svg, th } = this._drag;
    const n = this._ctlNow(room, th);
    if (this._drag.slider) {
      const b = this._drag.el.querySelector('.sbar').getBoundingClientRect();
      const lo = this._config.dial_min;
      const hi = this._config.dial_max;
      const x = Math.max(0, Math.min(1, (ev.clientX - b.left) / b.width));
      const v = Math.max(lo, Math.min(hi, Math.round((lo + x * (hi - lo)) / n.step) * n.step));
      if (v === this._drag.value) return;
      this._drag.value = v;
      this._drag.el.innerHTML = this._sliderHtml(room, n, v);
      this._drag.el.setAttribute('aria-valuenow', v);
      return;
    }
    const [x, y] = this._dialEvent(ev, svg);
    const v = dialValue(x, y, this._config.dial_min, this._config.dial_max, n.step);
    if (v === this._drag.value) return;
    this._drag.value = v;
    svg.innerHTML = this._dialSvg(room, n, v);
  }

  _room(el) { return this._rooms.find((r) => r.id === el.closest('[data-room]')?.dataset.room); }

  _draftFor(room) {
    const ui = this._ui;
    if (!ui.draft || ui.draft.room !== room.id) {
      ui.draft = { room: room.id, plans: Object.fromEntries(room.plans.filter((p) => this._plans[p]).map((p) => [p,
        { name: this._planName(room, p), origName: this._planName(room, p), periods: this._plans[p].periods.map((x) => ({ ...x })) }])),
      week: { ...room.week }, free_day: room.free_day, name: room.name, thermostats: [...room.thermostats],
      windows: [...(room.windows || [])], window_delay: room.window_delay ?? 30,
      room_sensor: room.room_sensor || '', room_margin: room.room_margin ?? 0.5 };
    }
    return ui.draft;
  }

  _act(a, el, ev) {
    const ui = this._ui;
    const room = el.closest('[data-room]') ? this._room(el) : null;
    const plan = el.closest('[data-plan]')?.dataset.plan;
    const i = el.dataset.i != null ? +el.dataset.i : null;
    switch (a) {
      case 'view': ui.view = ui.view === el.dataset.v ? 'rooms' : el.dataset.v; ui.dayEdit = null; break;
      case 'toggle':
        ui.open = ui.open === room.id ? null : room.id;
        ui.editPeriod = null; ui.addPlan = null; ui.renamePlan = null;
        break;
      case 'sub': ui.sub[room.id] = el.dataset.v; ui.editPeriod = null; ui.addPlan = null; ui.renamePlan = null; break;
      case 'plan-sel': ui.planSel[room.id] = el.dataset.v; ui.editPeriod = null; ui.addPlan = null; ui.renamePlan = null; break;
      case 'edit-period': {
        if (!this._admin) return;
        const same = ui.editPeriod && ui.editPeriod.room === room.id && ui.editPeriod.plan === plan && ui.editPeriod.i === i;
        ui.editPeriod = same ? null : { room: room.id, plan, i };
        break;
      }
      case 'p-step': {
        const x = this._draftFor(room).plans[plan].periods[i];
        const v = (x.temperature ?? 20) + (+el.dataset.v) * 0.5;
        x.temperature = Math.max(MIN_T, Math.min(MAX_T, Math.round(v * 2) / 2));
        break;
      }
      case 'rename-plan': ui.renamePlan = plan; break;
      case 'sec': ui.sec = ui.sec === el.dataset.v ? null : el.dataset.v; ui.pick = null; break;
      case 'pick-open': {
        const same = ui.pick?.room === room.id && ui.pick.kind === el.dataset.v;
        ui.pick = same ? null : { room: room.id, kind: el.dataset.v, q: '' };
        if (!same) ui.pickFocus = 0;
        break;
      }
      case 'pick': {
        const d = this._draftFor(room);
        const k = ui.pick?.kind;
        if (k === 'th' && !d.thermostats.includes(el.dataset.v)) d.thermostats = [...d.thermostats, el.dataset.v];
        else if (k === 'win' && !d.windows.includes(el.dataset.v)) d.windows = [...d.windows, el.dataset.v];
        else if (k === 'rs') d.room_sensor = el.dataset.v;
        ui.pick = null;
        break;
      }
      case 'unpick': {
        const d = this._draftFor(room);
        const k = el.dataset.k;
        if (k === 'th') d.thermostats = d.thermostats.filter((x) => x !== el.dataset.v);
        else if (k === 'win') d.windows = d.windows.filter((x) => x !== el.dataset.v);
        else if (k === 'rs') d.room_sensor = '';
        break;
      }
      case 'margin': {
        const d = this._draftFor(room);
        const m = (+String(d.room_margin).replace(',', '.') || 0.5) + (+el.dataset.v) * 0.1;
        d.room_margin = Math.max(0.1, Math.min(3, Math.round(m * 10) / 10));
        break;
      }
      case 'goto-setup': {
        const r = this._rooms.find((x) => x.id === el.dataset.v);
        if (!r) return;
        ui.view = 'rooms'; ui.open = r.id; ui.sub[r.id] = 'setup'; ui.sec = null; ui.pick = null; ui.draft = null;
        break;
      }
      case 'set-open':
        ui.setOpen = ui.setOpen === el.dataset.v ? null : el.dataset.v;
        if (ui.setOpen === 'add') ui.addRoom = { name: '', thermostats: [] };
        ui.draft = null; ui.settings = null; ui.exercise = null;
        break;
      case 'step': {
        const th = el.dataset.th || '';
        const n = this._ctlNow(room, th);
        const base = this._shown(room, th, n) ?? n.wanted ?? 20;
        this._setTarget(room, base + (+el.dataset.v) * n.step, 700, th);
        return;
      }
      case 'step-all': this._stepAllBy(room, +el.dataset.v); return;
      case 'bp-update': this._run(() => this._updateBlueprints()); return;
      case 'th-sel': ui.thSel = { ...(ui.thSel || {}), [room.id]: el.dataset.v }; break;
      case 'to-plan': {
        const n = this._roomNow(room);
        if (n.wanted == null) return;
        this._stepTarget = null; this._stepAll = null;
        this._run(() => this._hass.callService('climate', 'set_temperature', { entity_id: room.thermostats, temperature: n.wanted }), false);
        return;
      }
      case 'layout': {
        this._layout = this._layout === 'dial' ? 'compact' : 'dial';
        try { localStorage.setItem('weekheat-layout', this._layout); } catch (e) { /* no storage */ }
        break;
      }
      case 'power': {
        this._run(() => this._togglePower(room), false);
        return;
      }
      case 'active': {
        const on = this._hass.states[room.entity]?.state === 'on';
        this._run(() => this._hass.callService('automation', on ? 'turn_off' : 'turn_on', { entity_id: room.entity }), false);
        return;
      }
      case 'add-period': {
        const d = this._draftFor(room).plans[plan];
        const last = d.periods[d.periods.length - 1];
        const start = Math.min(1439, (last ? last.start : 0) + 60);
        if (!last || start > last.start) {
          d.periods.push({ start, temperature: last && !last.off ? periodTemp(last) : 20, off: false });
          ui.editPeriod = { room: room.id, plan, i: d.periods.length - 1 };
        }
        break;
      }
      case 'del-period': this._draftFor(room).plans[plan].periods.splice(i, 1); ui.editPeriod = null; break;
      case 'save-plan': {
        const d = this._draftFor(room).plans[plan];
        this._run(async () => { await this._savePlan(room, plan, d); ui.draft = null; ui.editPeriod = null; ui.renamePlan = null; await this._poke([room]); this._render(true); });
        return;
      }
      case 'reset-plan': ui.draft = null; ui.editPeriod = null; ui.renamePlan = null; break;
      case 'del-plan':
        if (!confirm(this._t.confirm_delete_plan)) return;
        this._run(async () => { await this._deletePlan(room, plan); ui.draft = null; });
        return;
      case 'add-plan-open': ui.addPlan = ui.addPlan?.room === room.id ? null : { room: room.id, name: '', template: 'starter_weekday' }; break;
      case 'add-plan': {
        const f = ui.addPlan;
        if (!f.name.trim()) return;
        this._run(async () => { const e = await this._addPlan(room, f.name.trim(), f.template); ui.addPlan = null; ui.draft = null; ui.planSel[room.id] = e; this._render(true); });
        return;
      }
      case 'add-plan-cancel': ui.addPlan = null; break;
      case 'save-week': {
        const d = this._draftFor(room);
        this._run(async () => { await this._saveRoomConfig(room, { week: d.week, free_day: d.free_day }); ui.draft = null; await this._poke([room]); });
        return;
      }
      case 'save-room': {
        const d = this._draftFor(room);
        if (!d.name.trim() || !d.thermostats.length) return;
        const delay = Math.max(0, Math.min(900, Math.round(+d.window_delay || 0)));
        const margin = Math.max(0.1, Math.min(3, Math.round((+String(d.room_margin).replace(',', '.') || 0.5) * 10) / 10));
        this._run(async () => { await this._saveRoomConfig(room, { room_name: d.name.trim(), thermostats: d.thermostats, windows: d.windows, window_delay: delay,
          room_sensor: d.room_sensor || [], room_margin: margin }); ui.draft = null; await this._poke([room]); });
        return;
      }
      case 'day': ui.dayEdit = ui.dayEdit?.date === el.dataset.v ? null : this._dayDraft(el.dataset.v); break;
      case 'day-pick': ui.dayEdit.pick = el.dataset.v; break;
      case 'day-save': {
        const de = ui.dayEdit;
        const ex = de.pick === 'working' ? { free: false } : de.pick === 'free' ? { free: true }
          : de.pick?.startsWith('plan:') ? { plan: de.pick.slice(5) } : null;
        if (ex && de.note.trim()) ex.note = de.note.trim();
        this._run(async () => { await this._setException(de.date, ex); ui.dayEdit = null; });
        return;
      }
      case 'day-cancel': ui.dayEdit = null; break;
      case 'add-rule': this._settingsDraft().rules.push({ keyword: '', plan: '' }); break;
      case 'del-rule': this._settingsDraft().rules.splice(i, 1); break;
      case 'up-rule': { const r = this._settingsDraft().rules; if (i > 0) [r[i - 1], r[i]] = [r[i], r[i - 1]]; break; }
      case 'save-settings': {
        const s = this._settingsDraft();
        const input = { calendars: s.calendars, rules: s.rules.filter((r) => r.keyword.trim()).map((r) => (r.plan ? { keyword: r.keyword.trim(), plan: r.plan } : { keyword: r.keyword.trim() })),
          workday: s.workday, exceptions: s.exceptions, holidays: s.holidays || '' };
        this._run(async () => { await this._saveSettings(input); ui.settings = null; });
        return;
      }
      case 'reset-settings': ui.settings = null; break;
      case 'save-exercise': {
        const x = this._exerciseDraft();
        const input = { exercise_day: x.exercise_day, exercise_time: /^\d{1,2}:\d{2}$/.test(x.exercise_time) ? `${x.exercise_time}:00` : x.exercise_time,
          exercise_wait: Math.max(10, Math.min(600, Math.round(+x.exercise_wait || 60))) };
        this._run(async () => { for (const r of this._allRooms || this._rooms) await this._saveRoomConfig(r, input); ui.exercise = null; });
        return;
      }
      case 'run-exercise':
        if (!confirm(this._t.confirm_exercise)) return;
        this._run(async () => { await this._hass.callWS({ type: 'fire_event', event_type: 'weekheat_exercise' }); this._flash(this._t.exercise_started); }, false);
        return;
      case 'add-room': {
        const f = ui.addRoom;
        if (!f.name.trim() || !f.thermostats.length) return;
        this._run(async () => { await this._addRoom(f.name.trim(), f.thermostats); ui.addRoom = null; ui.setOpen = null; }, false);
        return;
      }
      case 'dismiss': this._hass.callService('persistent_notification', 'dismiss', { notification_id: el.dataset.v }); return;
      default: return;
    }
    this._render(true);
  }

  _change(c, el) {
    const ui = this._ui;
    const room = el.closest('[data-room]') ? this._room(el) : null;
    const plan = el.closest('[data-plan]')?.dataset.plan;
    const i = el.dataset.i != null ? +el.dataset.i : null;
    const v = el.type === 'checkbox' ? el.checked : el.value;
    switch (c) {
      case 'p-start': this._draftFor(room).plans[plan].periods[i].start = v ? toMin(v) : 0; break;
      case 'p-temp': this._draftFor(room).plans[plan].periods[i].temperature = v === '' ? null : +String(v).replace(',', '.'); break;
      case 'p-off': {
        const p = this._draftFor(room).plans[plan].periods[i];
        p.off = v;
        if (!v && (p.temperature == null || p.temperature === OFF_T)) p.temperature = 18;
        break;
      }
      case 'p-name': this._draftFor(room).plans[plan].name = v; break;
      case 'w-day': this._draftFor(room).week[el.dataset.v] = v; break;
      case 'w-free': this._draftFor(room).free_day = v; break;
      case 'r-name': this._draftFor(room).name = v; break;
      case 'r-delay': this._draftFor(room).window_delay = v; return;
      case 'ap-name': ui.addPlan.name = v; return;
      case 'ap-template': ui.addPlan.template = v; return;
      case 'ar-name': ui.addRoom.name = v; return;
      case 'ar-th': ui.addRoom.thermostats = v ? [...ui.addRoom.thermostats, el.dataset.v] : ui.addRoom.thermostats.filter((t) => t !== el.dataset.v); break;
      case 'd-note': ui.dayEdit.note = v; return;
      case 's-cal': { const s = this._settingsDraft(); s.calendars = v ? [...s.calendars, el.dataset.v] : s.calendars.filter((x) => x !== el.dataset.v); break; }
      case 's-kw': this._settingsDraft().rules[i].keyword = v; return;
      case 's-plan': this._settingsDraft().rules[i].plan = v; break;
      case 's-workday': this._settingsDraft().workday = v; break;
      case 's-exc': this._settingsDraft().exceptions = v; break;
      case 's-hol': this._settingsDraft().holidays = v; break;
      case 'x-day': this._exerciseDraft().exercise_day = v; return;
      case 'x-time': this._exerciseDraft().exercise_time = v; return;
      case 'x-wait': this._exerciseDraft().exercise_wait = v; return;
      default: return;
    }
    this._render(true);
  }

  _dayDraft(date) {
    const d = (this._days || []).find((x) => x.date === date);
    let pick = 'auto';
    if (d && d.kind === 'exception') pick = d.plan ? `plan:${d.plan}` : d.free ? 'free' : 'working';
    return { date, pick, note: (d && d.kind === 'exception' && d.note) || '' };
  }

  _settingsDraft() {
    if (!this._ui.settings) {
      const i = this._script?.use_blueprint?.input || {};
      this._ui.settings = { calendars: [...(Array.isArray(i.calendars) ? i.calendars : i.calendars ? [i.calendars] : [])],
        rules: (i.rules || []).map((r) => (typeof r === 'string' ? { keyword: r, plan: '' } : { keyword: r.keyword || '', plan: r.plan || '' })),
        workday: i.workday || '', exceptions: i.exceptions || '', holidays: i.holidays || '' };
    }
    return this._ui.settings;
  }

  /** The valve exercise settings, as stored in the first room automation (the card writes them to all). */
  _exerciseDraft() {
    if (!this._ui.exercise) this._ui.exercise = exerciseFromInput((this._allRooms || this._rooms || [])[0]?.cfg?.use_blueprint?.input);
    return this._ui.exercise;
  }

  _renderExercise() {
    const t = this._t;
    const x = this._exerciseDraft();
    const days = [['off', t.off], ...WEEK.map((d) => [d, t.weekdays[d]])];
    return `<div class="panel">
      <label class="field">${esc(t.exercise_day)} <select data-c="x-day">${days.map(([v, l]) => `<option value="${v}" ${v === x.exercise_day ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      <label class="field">${esc(t.exercise_time)} <input type="time" data-c="x-time" value="${esc(String(x.exercise_time).slice(0, 5))}"></label>
      <label class="field">${esc(t.exercise_wait)} <input type="number" inputmode="numeric" min="10" max="600" step="5" data-c="x-wait" value="${esc(x.exercise_wait)}"></label>
      <div class="dim small">${esc(t.exercise_help)}</div>
      <div class="actions"><button class="btn flat small" data-a="run-exercise">${esc(t.exercise_now)}</button><span class="grow"></span>
        <button class="btn small" data-a="save-exercise">${esc(t.save)}</button></div></div>`;
  }

  _allPlanNames() {
    const names = new Map();
    for (const r of this._rooms || []) for (const p of r.plans) { const n = this._planName(r, p); names.set(n.toLowerCase(), n); }
    return [...names.values()].sort((a, b) => a.localeCompare(b));
  }

  // ---------- render ----------

  _render(force = false) {
    if (!this._config) return;
    if (!this.shadowRoot) { this.attachShadow({ mode: 'open' }); this._bind(); }
    const active = this.shadowRoot.activeElement;
    if (!force && active && ['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName)) { this._pending = true; return; }
    if (this._drag) return;
    this._skeleton();
    if (!this._hass) return;
    const t = this._t;
    const ui = this._ui;
    const view = ui.view === 'settings' && !this._admin ? 'rooms' : ui.view || 'rooms';
    let body;
    if (this._noDirectory && !this._admin) body = `<div class="note">${esc(t.no_directory)}</div>`;
    else if (!this._rooms) body = '<div class="note">…</div>';
    else if (view === 'days') body = this._renderDays();
    else if (view === 'settings') body = this._renderSetup();
    else body = this._renderRooms();
    const notes = Object.values(this._notes || {}).filter((n) => String(n.notification_id).startsWith('weekheat_'))
      .map((n) => `<div class="banner warn"><span>${esc(n.message)}</span><button class="link" data-a="dismiss" data-v="${esc(n.notification_id)}">${esc(t.dismiss)}</button></div>`).join('');
    const today = this._days ? this._today() : null;
    const dayChip = today ? `<button class="daytype ${today.free ? 'free' : ''} ${view === 'days' ? 'on' : ''}" data-a="view" data-v="days" title="${esc(t.days)}">${esc(today.free ? t.free_day : t.working_day)}${today.plan ? ` · ${esc(today.plan)}` : ''}</button>` : '';
    const gear = this._admin ? `<button class="iconbtn ${view === 'settings' ? 'on' : ''}" data-a="view" data-v="settings" title="${esc(t.settings)}"><ha-icon icon="mdi:cog"></ha-icon></button>` : '';
    const title = view === 'rooms'
      ? (this._config.title ? `<div class="title">${esc(this._config.title)}</div>` : '<span></span>')
      : `<button class="back" data-a="view" data-v="rooms"><ha-icon icon="mdi:chevron-left"></ha-icon>${esc(view === 'days' ? t.days : t.settings)}</button>`;
    const msg = this._msg ? `<div class="banner ${this._msg.bad ? 'bad' : 'ok'}">${esc(this._msg.text)}</div>` : '';
    const err = this._error ? `<div class="banner bad">${esc(this._error)}</div>` : '';
    const noScript = this._rooms && this._admin && !this._script ? `<div class="banner bad">${esc(t.no_script)}</div>` : '';
    const bpOld = this._admin && this._bpOld?.length ? `<div class="banner warn"><span>${esc(t.bp_old.replace('{a}', this._bpOld[0].installed || t.bp_none).replace('{b}', BLUEPRINT_VERSION))}</span>
      <button class="btn small" data-a="bp-update">${esc(t.bp_update)}</button></div>` : '';
    this._cardEl.innerHTML = `<div class="top">${title}<span class="grow"></span>${dayChip}${gear}</div>
      ${msg}${err}${noScript}${bpOld}${notes}<div class="body">${body}</div>`;
    if (ui.pickFocus != null) {
      const q = this.shadowRoot.querySelector('[data-c="pick-q"]');
      if (q) { q.focus(); q.setSelectionRange(ui.pickFocus, ui.pickFocus); }
      ui.pickFocus = null;
    }
  }

  /** The shadow DOM's fixed parts: the styles and the card. */
  _skeleton() {
    if (this._cardEl) return;
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card></ha-card>`;
    this._cardEl = this.shadowRoot.querySelector('ha-card');
  }

  /** Day chart: one bar per period, its height by temperature; Off hatched and low. */
  _chart(periods, nowMin, sel) {
    const lo = 10;
    const hi = 26;
    const segs = periods.map((p, i) => {
      const end = i + 1 < periods.length ? periods[i + 1].start : 1440;
      const w = ((end - p.start) / 1440) * 100;
      const gap = p.temperature == null;
      const h = gap ? 0 : p.off ? 16 : 28 + 72 * Math.max(0, Math.min(1, (p.temperature - lo) / (hi - lo)));
      const label = w > 6 && !gap ? `<span>${esc(p.off ? this._t.off : Number(p.temperature).toLocaleString(this._lang === 'de' ? 'de-AT' : 'en-GB'))}</span>` : '';
      return `<div class="cseg ${p.off ? 'off' : ''} ${sel === i ? 'sel' : ''}" data-a="edit-period" data-i="${i}" style="left:${(p.start / 1440) * 100}%;width:${w}%">
        <div class="cbar" style="height:${h}%;${p.off || gap ? '' : `background:${tempColor(p.temperature)}`}">${label}</div></div>`;
    }).join('');
    const marker = nowMin != null ? `<div class="now" style="left:${(nowMin / 1440) * 100}%"></div>` : '';
    return `<div class="chart">${segs}${marker}</div><div class="ticks"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>`;
  }

  /** Icon, colour class and text for a room's status line. */
  _status(room, n) {
    const t = this._t;
    const L = this._lang;
    const until = n.at?.next ? ` ${t.until} ${fromMin(n.at.next.start)}` : '';
    if (!n.active) return { icon: 'mdi:pause', cls: 'paused', text: `${t.paused}${n.target != null ? ` · ${fmtTemp(n.target, L)}` : ''}` };
    if (n.exercise) return { icon: 'mdi:pipe-valve', cls: 'window', text: t.exercise };
    if (n.heatingOff) return { icon: 'mdi:power', cls: 'paused', text: t.heating_off };
    if (n.windowOpen) return { icon: 'mdi:window-open-variant', cls: 'window', text: `${t.window_open} · ${fmtTemp(OFF_T, L)}` };
    const tt = room.thermostats.length > 1 ? targetsText(room.thermostats.map((e) => this._thNow(room, n, e).target), L) : fmtTemp(n.target, L);
    if (n.roomClosed) return { icon: 'mdi:valve-closed', cls: n.manual ? 'manual' : 'ok', text: `${t.rc_closed} · ${tt}${until}` };
    if (n.manual) return { icon: 'mdi:hand-back-right-outline', cls: 'manual', text: `${t.manual} · ${tt}${until}` };
    if (n.heating) return { icon: 'mdi:fire', cls: 'heat', text: `${t.heating} · ${t.to} ${tt}${until}` };
    return { icon: 'mdi:check', cls: 'ok', text: n.at ? `${fmtTemp(n.at.period, L)}${until || ` ${t.until} ${t.tomorrow_l}`}` : '–' };
  }

  _renderRooms() {
    const t = this._t;
    if (!this._rooms.length) {
      return `<div class="note">${esc(t.no_rooms)}</div>${this._admin ? `<button class="btn" data-a="view" data-v="settings">${esc(t.add_room)}</button>` : ''}`;
    }
    return this._rooms.map((r) => this._renderRoom(r)).join('');
  }

  _renderRoom(room) {
    const t = this._t;
    const n = this._roomNow(room);
    const open = this._ui.open === room.id;
    const st = this._status(room, n);
    const head = `<div class="rhead" data-a="toggle">
      <div class="ricon ${st.cls}"><ha-icon icon="${st.icon}"></ha-icon></div>
      <div class="rmain"><div class="rname">${esc(room.name)}${n.unavailable ? ` <span class="chip bad">${esc(t.unavailable)}</span>` : ''}</div>
        <div class="rline ${st.cls}">${esc(st.text)}</div></div>
      <div class="rtemp">${n.current != null ? `${Number(Math.round(n.current * 10) / 10).toLocaleString(this._lang === 'de' ? 'de-AT' : 'en-GB')}°` : '–'}</div>
      <ha-icon class="chev" icon="${open ? 'mdi:chevron-up' : 'mdi:chevron-down'}"></ha-icon></div>`;
    if (!open) return `<div class="room" data-room="${room.id}">${head}</div>`;
    const sub = this._ui.sub[room.id] || 'control';
    const seg = ['control', 'plan', 'week', ...(this._admin ? ['setup'] : [])].map((k) => `<button class="${sub === k ? 'on' : ''}" data-a="sub" data-v="${k}">${esc(t[`v_${k}`])}</button>`).join('');
    const sw = `<label class="switch" title="${esc(n.heatingOff ? t.turn_on : t.turn_off)}"><span>${esc(t.heating_l_cap)}</span>
      <button class="tog ${n.heatingOff ? '' : 'on'}" data-a="power" role="switch" aria-checked="${!n.heatingOff}" ${!room.heating_switch && !this._admin ? 'disabled' : ''}><i></i></button></label>`;
    let detail;
    if (sub === 'plan') detail = this._renderPlan(room, n);
    else if (sub === 'week') detail = this._renderWeek(room);
    else if (sub === 'setup' && this._admin) detail = this._renderRoomSetup(room, n);
    else detail = this._renderControl(room, n);
    return `<div class="room open" data-room="${room.id}">${head}
      <div class="rbar"><div class="segc">${seg}</div><span class="grow"></span>${sw}</div>${detail}</div>`;
  }

  _renderControl(room, n) {
    const t = this._t;
    const L = this._lang;
    const multi = room.thermostats.length > 1;
    const dial = this._layout === 'dial';
    let ctrl;
    if (dial) {
      // Several thermostats: pick one (or all) above the one dial.
      const sel = multi && room.thermostats.includes(this._ui.thSel?.[room.id]) ? this._ui.thSel[room.id] : '';
      const mixed = !sel && this._mixed(room, n);
      const pending = this._stepTarget?.room === room.id && this._stepTarget.th === '';
      const nn = sel ? this._thNow(room, n, sel) : mixed && !pending ? { ...n, mixed: targetsText(mixed, L) } : n;
      const shown = nn.mixed ? null : this._shown(room, sel, nn);
      const pick = multi ? `<div class="thsel" role="group" aria-label="${esc(t.pick_th)}">${['', ...room.thermostats].map((e) => {
        const v = e ? this._shown(room, e, this._thNow(room, n, e)) : null;
        const name = e ? this._thLabel(room, e) : t.all_th;
        return `<button class="${e === sel ? 'on' : ''}" data-a="th-sel" data-v="${esc(e)}" aria-pressed="${e === sel}" title="${esc(name)}"><span class="nm">${esc(name)}</span>${typeof v === 'number' ? `<span class="${this._thNow(room, n, e).manual ? 'manual' : 'dim'}">${esc(Number(v).toLocaleString(L === 'de' ? 'de-AT' : 'en-GB', { maximumFractionDigits: 1 }))}°</span>` : ''}</button>`;
      }).join('')}</div>` : '';
      ctrl = `${pick}<div class="dialbox">
        <svg data-dial data-th="${esc(sel)}" viewBox="0 0 200 200" tabindex="0" role="slider" aria-label="${esc(nn.label || t.setpoint)}" aria-valuemin="${MIN_T}" aria-valuemax="${MAX_T}" aria-valuenow="${shown ?? ''}">${this._dialSvg(room, nn, shown)}</svg>
        <div class="ctrl dialctrl"><button class="round" data-a="step" data-th="${esc(sel)}" data-v="-1" aria-label="${esc(t.colder)}">−</button><button class="round" data-a="step" data-th="${esc(sel)}" data-v="1" aria-label="${esc(t.warmer)}">+</button></div></div>`;
    } else if (multi) {
      // One slider per thermostat, then a row that moves all of them by the same amount.
      ctrl = room.thermostats.map((e) => {
        const nn = this._thNow(room, n, e);
        const shown = this._shown(room, e, nn);
        return `<div class="slider th1" data-slider data-th="${esc(e)}" tabindex="0" role="slider" aria-label="${esc(nn.label)}" aria-valuemin="${this._config.dial_min}" aria-valuemax="${this._config.dial_max}" aria-valuenow="${shown ?? ''}">${this._sliderHtml(room, nn, shown)}</div>`;
      }).join('') + `<div class="allrow"><span><span class="block">${esc(t.both_th)}</span><span class="block dim small">${esc(t.both_help)}</span></span><span class="grow"></span>
        <button class="round" data-a="step-all" data-v="-1" aria-label="${esc(`${t.both_th}: ${t.colder}`)}">−</button><button class="round" data-a="step-all" data-v="1" aria-label="${esc(`${t.both_th}: ${t.warmer}`)}">+</button></div>`;
    } else {
      const shown = this._shown(room, '', n);
      ctrl = `<div class="slider" data-slider data-th="" tabindex="0" role="slider" aria-label="${esc(t.setpoint)}" aria-valuemin="${this._config.dial_min}" aria-valuemax="${this._config.dial_max}" aria-valuenow="${shown ?? ''}">${this._sliderHtml(room, n, shown)}</div>`;
    }
    let next = '';
    if (n.at) {
      const name = this._planName(room, n.plan);
      next = `<div class="pill"><span>${esc(name)}: ${esc(fmtTemp(n.at.period, L))} ${esc(n.at.next ? `${t.until} ${fromMin(n.at.next.start)}` : `${t.until} ${t.tomorrow_l}`)}</span>
        ${n.at.next ? `<span class="dim">${esc(t.then)} ${esc(fmtTemp(n.at.next, L))}</span>` : ''}</div>`;
    }
    const th = multi && dial ? room.thermostats.map((e) => {
      const s = this._hass.states[e];
      if (!s) return `<div class="th dim">${esc(e)}</div>`;
      const nn = this._thNow(room, n, e);
      const v = ['unavailable', 'unknown'].includes(s.state) ? t.unavailable : s.state === 'off' ? t.off : fmtTemp(nn.target, L);
      return `<div class="th"><span>${esc(nn.label)}</span><span class="dim">${fmtTemp(s.attributes.current_temperature, L)} → <span class="${nn.manual ? 'manual' : ''}">${esc(v)}</span></span></div>`;
    }).join('') : '';
    const back = n.manual && n.active && n.wanted != null && !n.windowOpen && !n.heatingOff && !n.exercise
      ? `<div class="backrow"><span class="dim small grow">${esc(n.at?.next ? `${t.manual_until} ${fromMin(n.at.next.start)}${t.manual_then}` : '')}</span>
        <button class="btn flat small outline" data-a="to-plan">${esc(t.to_plan)}</button></div>` : '';
    return `${ctrl}${next}${th}${back}
      <div class="foot"><button class="link small" data-a="layout">${esc(dial ? t.layout_compact : t.layout_dial)}</button></div>`;
  }

  /** Inside of the dial SVG for setpoint `v`: coloured scale, filled up to `v`, the handle, a tick for the
   * room temperature, a dot for the plan's temperature when it differs, and the texts in the middle. */
  _dialSvg(room, n, v) {
    const t = this._t;
    const lo = this._config.dial_min;
    const hi = this._config.dial_max;
    const parts = [];
    const end = DIAL.start + DIAL.sweep;
    const av = v != null ? dialAngle(v, lo, hi) : null;
    parts.push(`<path d="${dialArc(DIAL.start, end)}" class="dtrack"/>`);
    if (av != null && av > DIAL.start + 0.5) parts.push(`<path d="${dialArc(DIAL.start, av)}" class="dfill${v <= OFF_T ? ' off' : ''}"/>`);
    if (n.wanted != null && n.manual && n.active) {
      const [px, py] = dialPoint(dialAngle(n.wanted, lo, hi), DIAL.r - 17);
      parts.push(`<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="3" class="dplan"><title>${esc(t.plan)} ${esc(fmtTemp(n.wanted, this._lang))}</title></circle>`);
    }
    if (n.current != null) {
      const a = dialAngle(n.current, lo, hi);
      const [x1, y1] = dialPoint(a, DIAL.r - 9);
      const [x2, y2] = dialPoint(a, DIAL.r + 9);
      parts.push(`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" class="dcur"/>`);
    }
    if (av != null) {
      const [hx, hy] = dialPoint(av);
      parts.push(`<circle cx="${hx.toFixed(2)}" cy="${hy.toFixed(2)}" r="9" class="dhandle${v <= OFF_T ? ' off' : ''}"/>`);
    }
    const off = v != null && v <= OFF_T;
    const { status, cls } = this._ctlStatus(n, false); // the selector above names the thermostat
    const big = v == null ? (n.mixed || '–') : off ? t.off : Number(v).toLocaleString(this._lang === 'de' ? 'de-AT' : 'en-GB', { maximumFractionDigits: 1 });
    const cur = n.current != null ? `${t.current} ${fmtTemp(Math.round(n.current * 10) / 10, this._lang)}` : '';
    const heat = n.heating && cls !== 'heat' ? `<tspan class="heat"> · ${esc(t.heating)}</tspan>` : '';
    parts.push(`<text x="100" y="72" class="dstatus ${cls}">${esc(status)}${heat}</text>`,
      `<text x="100" y="${off ? 112 : n.mixed && v == null ? 110 : 116}" class="dbig${off ? ' off' : ''}${n.mixed && v == null ? ' mixed' : ''}">${esc(big)}${off || v == null ? '' : '<tspan class="dunit" dy="-17">°C</tspan>'}</text>`,
      `<text x="100" y="140" class="dsmall">${esc(cur)}</text>`);
    if (n.manual && n.active && n.wanted != null) parts.push(`<text x="100" y="156" class="dsmall">${esc(t.plan)} ${esc(fmtTemp(n.wanted, this._lang))}</text>`);
    return parts.join('');
  }

  /** Status word and colour class above the setpoint (dial and slider). */
  _ctlStatus(n, named = true) {
    const t = this._t;
    const word = !n.active ? t.paused : n.exercise ? t.exercise : n.heatingOff ? t.heating_off : n.windowOpen ? t.window_open : n.roomClosed ? t.rc_closed : n.manual ? t.manual : n.heating ? t.heating : t.scheduled;
    const status = n.label && named ? `${n.label} · ${word}` : word;
    const cls = !n.active ? 'dim' : n.exercise ? 'window' : n.heatingOff ? 'dim' : n.windowOpen ? 'window' : n.manual ? 'manual' : n.heating ? 'heat' : 'dim';
    return { status, cls };
  }

  /** Inside of the slider for setpoint `v`: the value and status, then a bar from dial_min to dial_max filled
   * up to `v`, a tick for the room temperature, a dot under the bar for the plan's value when it differs, and the knob. */
  _sliderHtml(room, n, v) {
    const t = this._t;
    const L = this._lang;
    const lo = this._config.dial_min;
    const hi = this._config.dial_max;
    const pct = (x) => Math.max(0, Math.min(100, ((x - lo) / (hi - lo)) * 100)).toFixed(2);
    const off = v != null && v <= OFF_T;
    const { status, cls } = this._ctlStatus(n);
    const heat = n.heating && cls !== 'heat' ? ` <span class="heat">· ${esc(t.heating)}</span>` : '';
    const sub = [n.current != null ? `${t.current} ${fmtTemp(Math.round(n.current * 10) / 10, L)}` : '',
      n.manual && n.active && n.wanted != null ? `${t.plan} ${fmtTemp(n.wanted, L)}` : ''].filter(Boolean).join(' · ');
    return `<div class="stop"><span class="sbig ${off ? 'off' : ''}">${esc(v == null ? '–' : off ? t.off : fmtTemp(v, L))}</span>
        <span class="sstat ${cls}">${esc(status)}${heat}</span><span class="grow"></span><span class="dim small">${esc(sub)}</span></div>
      <div class="sbar"><div class="strack"></div>
        ${v != null ? `<div class="sfill ${off ? 'off' : ''}" style="width:${pct(v)}%"></div>` : ''}
        ${n.wanted != null && n.manual && n.active ? `<div class="splan" style="left:${pct(n.wanted)}%"></div>` : ''}
        ${n.current != null ? `<div class="scur" style="left:${pct(n.current)}%"></div>` : ''}
        ${v != null ? `<div class="sknob ${off ? 'off' : ''}" style="left:${pct(v)}%"></div>` : ''}</div>
      <div class="sscale"><span>${esc(fmtTemp(lo, L))}</span><span>${esc(fmtTemp(hi, L))}</span></div>`;
  }

  /** Is the plan's draft different from what is saved? */
  _planDirty(entity, dp) {
    const orig = this._plans[entity];
    const norm = (ps) => JSON.stringify(ps.map((x) => [x.start, x.off ? 'off' : x.temperature]));
    return !orig || norm(orig.periods) !== norm(dp.periods) || dp.name !== dp.origName;
  }

  _renderPlan(room, n) {
    const t = this._t;
    const ui = this._ui;
    const d = this._draftFor(room);
    const plans = room.plans.filter((p) => d.plans[p]);
    const ap = ui.addPlan?.room === room.id ? ui.addPlan : null;
    let selPlan = ui.planSel[room.id];
    if (!plans.includes(selPlan)) selPlan = plans.includes(n.plan) ? n.plan : plans[0];
    const chips = plans.map((p) => `<button class="pick ${p === selPlan && !ap ? 'on' : ''} ${this._planDirty(p, d.plans[p]) ? 'dirty' : ''}" data-a="plan-sel" data-v="${esc(p)}">${esc(d.plans[p].name)}${p === n.plan ? ' •' : ''}</button>`).join('')
      + (this._admin ? `<button class="pick add ${ap ? 'on' : ''}" data-a="add-plan-open" title="${esc(t.add_plan)}">+</button>` : '');
    if (ap) {
      const templates = [['starter_weekday', t.starter_weekday], ['starter_free', t.starter_free],
        ...this._rooms.flatMap((r) => r.plans.filter((p) => this._plans[p]).map((p) => [p, `${r.name}: ${this._planName(r, p)}`]))];
      return `<div class="picks">${chips}</div><div class="panel"><label class="field">${esc(t.name)} <input data-c="ap-name" value="${esc(ap.name)}"></label>
        <label class="field">${esc(t.copy_from)} <select data-c="ap-template">${templates.map(([v, l]) => `<option value="${esc(v)}" ${ap.template === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <div class="actions"><span class="grow"></span><button class="btn flat small" data-a="add-plan-cancel">${esc(t.cancel)}</button><button class="btn small" data-a="add-plan">${esc(t.create)}</button></div></div>`;
    }
    if (!selPlan) return `<div class="picks">${chips}</div>`;
    const dp = d.plans[selPlan];
    const isToday = selPlan === n.plan;
    const ed = ui.editPeriod?.room === room.id && ui.editPeriod.plan === selPlan ? ui.editPeriod.i : null;
    const roles = [];
    const days = WEEK.filter((k) => room.week[k] === selPlan).map((k) => t.wd_short[k]);
    if (days.length) roles.push(days.join(' '));
    if (selPlan === room.free_day) roles.push(t.free_days);
    const errs = checkPeriods(dp.periods);
    const rows = dp.periods.map((x, i) => {
      if (i !== ed || !this._admin) {
        const cur = isToday && n.at && n.at.period.start === x.start;
        return `<div class="prow2 ${cur ? 'cur' : ''}" data-a="edit-period" data-i="${i}"><span>${fromMin(x.start)}</span><span class="grow"></span><span>${esc(fmtTemp(x, this._lang))}</span></div>`;
      }
      return `<div class="pedit">
        <input type="time" step="60" data-c="p-start" data-i="${i}" value="${fromMin(x.start)}" ${i === 0 ? 'disabled' : ''}>
        <div class="tstep"><button class="round sm" data-a="p-step" data-i="${i}" data-v="-1" ${x.off ? 'disabled' : ''}>−</button>
          <span>${esc(x.off ? t.off : fmtTemp(x, this._lang))}</span>
          <button class="round sm" data-a="p-step" data-i="${i}" data-v="1" ${x.off ? 'disabled' : ''}>+</button></div>
        <label class="check"><input type="checkbox" data-c="p-off" data-i="${i}" ${x.off ? 'checked' : ''}> ${esc(t.off)}</label>
        ${i === 0 ? '<span></span>' : `<button class="icon" data-a="del-period" data-i="${i}" title="${esc(t.delete)}"><ha-icon icon="mdi:delete-outline"></ha-icon></button>`}</div>`;
    }).join('');
    const dirty = this._planDirty(selPlan, dp);
    const admin = this._admin ? `<div class="actions">
        <button class="btn flat small" data-a="add-period">+ ${esc(t.add_period)}</button><span class="grow"></span>
        ${ui.renamePlan === selPlan ? '' : `<button class="link small" data-a="rename-plan">${esc(t.rename)}</button>`}
        <button class="link small" data-a="del-plan">${esc(t.delete)}</button></div>
      ${ui.renamePlan === selPlan ? `<label class="field">${esc(t.name)} <input data-c="p-name" value="${esc(dp.name)}"></label>` : ''}
      ${errs.length ? `<div class="err">${errs.map((e) => esc(t[`err_${e}`])).join(' ')}</div>` : ''}
      ${dirty ? `<div class="savebar"><span>${esc(t.unsaved)}</span><span class="grow"></span><button class="btn flat small" data-a="reset-plan">${esc(t.cancel)}</button>
        <button class="btn small" data-a="save-plan" ${errs.length ? 'disabled' : ''}>${esc(t.save)}</button></div>` : ''}` : '';
    return `<div class="picks">${chips}</div>
      <div data-plan="${esc(selPlan)}">
        <div class="pinfo dim small">${esc(roles.length ? `${t.used_on}: ${roles.join(' · ')}` : t.not_used)}</div>
        ${this._chart(dp.periods, isToday ? this._now().min : null, ed)}
        <div class="plist">${rows}</div>${admin}</div>`;
  }

  _planOptions(room, selected) {
    return room.plans.map((p) => `<option value="${esc(p)}" ${p === selected ? 'selected' : ''}>${esc(this._planName(room, p))}</option>`).join('');
  }

  _renderWeek(room) {
    const t = this._t;
    const d = this._draftFor(room);
    const dis = this._admin ? '' : 'disabled';
    const rows = WEEK.map((k) => `<label class="wcell"><span>${esc(t.wd_short[k])}${['sat', 'sun'].includes(k) ? '<sup>*</sup>' : ''}</span>
      <select data-c="w-day" data-v="${k}" ${dis}>${this._planOptions(room, d.week[k] || room.plans[0])}</select></label>`).join('');
    const dirty = WEEK.some((k) => (d.week[k] || room.plans[0]) !== (room.week[k] || room.plans[0])) || d.free_day !== room.free_day;
    return `<div class="wgrid">${rows}</div>
      <label class="wrow free"><span>${esc(t.free_days)}</span><select data-c="w-free" ${dis}>${this._planOptions(room, d.free_day)}</select></label>
      <div class="dim small">* ${esc(t.only_if_working)}. ${esc(t.week_help)}</div>
      ${dirty ? `<div class="savebar"><span>${esc(t.unsaved)}</span><span class="grow"></span><button class="btn flat small" data-a="reset-plan">${esc(t.cancel)}</button>
        <button class="btn small" data-a="save-week">${esc(t.save)}</button></div>` : ''}`;
  }

  /** Setup (admin): rooms (name, thermostats, windows, pause), add room, and the day settings. */
  _renderSetup() {
    const t = this._t;
    const ui = this._ui;
    const so = ui.setOpen;
    const rooms = this._rooms.map((r) => {
      const n = this._roomNow(r);
      const info = [count(r.thermostats.length, t.thermostats_short), count((r.windows || []).length, t.windows_short),
        ...(r.room_sensor ? [t.room_sensor_short] : []), ...(n.active ? [] : [t.paused])].join(' · ');
      return `<div class="srow"><button class="shead plain" data-a="goto-setup" data-v="${r.id}"><span class="grow"><span class="block">${esc(r.name)}</span>
        <span class="block dim small">${esc(info)}</span></span><ha-icon class="chev" icon="mdi:chevron-right"></ha-icon></button></div>`;
    }).join('');
    let add = '';
    if (so === 'add') {
      const used = new Set(this._rooms.flatMap((r) => r.thermostats));
      const climates = Object.values(this._hass.states).filter((s) => s.entity_id.startsWith('climate.'));
      add = `<div class="panel"><label class="field">${esc(t.name)} <input data-c="ar-name" value="${esc(ui.addRoom?.name || '')}"></label>
        <div class="field">${esc(t.thermostats)}</div>
        ${climates.map((s) => `<label class="check"><input type="checkbox" data-c="ar-th" data-v="${s.entity_id}" ${ui.addRoom?.thermostats.includes(s.entity_id) ? 'checked' : ''}> ${esc(s.attributes.friendly_name || s.entity_id)}${used.has(s.entity_id) ? ' <span class="dim">(✓)</span>' : ''}</label>`).join('')}
        <div class="dim small">${esc(t.new_room_paused)}</div>
        <div class="actions"><span class="grow"></span><button class="btn flat small" data-a="set-open" data-v="add">${esc(t.cancel)}</button><button class="btn small" data-a="add-room">${esc(t.create)}</button></div></div>`;
    }
    return `<div class="stitle">${esc(t.rooms)}</div>${rooms}
      <div class="srow"><div class="shead" data-a="set-open" data-v="add"><span class="accent">+ ${esc(t.add_room)}</span></div>${add}</div>
      <div class="stitle">${esc(t.day_settings)}</div>
      ${this._daySections(so)}
      <div class="stitle">${esc(t.exercise)}</div>
      <div class="srow"><div class="shead" data-a="set-open" data-v="exercise"><span>${esc(t.exercise_sub)}</span><span class="grow"></span>
        <span class="dim small">${esc(this._exerciseLine())}</span>
        <ha-icon class="chev" icon="${so === 'exercise' ? 'mdi:chevron-up' : 'mdi:chevron-down'}"></ha-icon></div>${so === 'exercise' ? this._renderExercise() : ''}</div>`;
  }

  _exerciseLine() {
    const x = exerciseFromInput((this._allRooms || this._rooms || [])[0]?.cfg?.use_blueprint?.input);
    return x.exercise_day === 'off' ? this._t.off : `${this._t.wd_short[x.exercise_day]} ${String(x.exercise_time).slice(0, 5)}`;
  }

  /** The room's Setup tab (admins): name, then collapsible sections with a summary each. */
  _renderRoomSetup(room, n) {
    const t = this._t;
    const L = this._lang;
    const ui = this._ui;
    const d = this._draftFor(room);
    const nm = (e) => this._hass.states[e]?.attributes.friendly_name || e;
    const delay = Math.round(+d.window_delay || 0);
    const margin = +String(d.room_margin).replace(',', '.') || 0.5;
    const fmtM = `${margin.toLocaleString(L === 'de' ? 'de-AT' : 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} °C`;
    const sec = (key, title, summary, body) => {
      const open = ui.sec === key;
      return `<div class="sec ${open ? 'open' : ''}"><button class="shead plain" data-a="sec" data-v="${key}" aria-expanded="${open}">
        <span class="stitle2">${esc(title)}</span><span class="grow"></span>${open ? '' : `<span class="dim small ell">${esc(summary)}</span>`}
        <ha-icon class="chev" icon="${open ? 'mdi:chevron-up' : 'mdi:chevron-down'}"></ha-icon></button>${open ? `<div class="secbody">${body}</div>` : ''}</div>`;
    };
    const chips = (kind, list) => `<div class="chips">${list.map((e) => `<span class="echip">${esc(nm(e))}<button class="x" data-a="unpick" data-k="${kind}" data-v="${esc(e)}" aria-label="${esc(`${t.remove}: ${nm(e)}`)}">✕</button></span>`).join('')}
      <button class="addchip" data-a="pick-open" data-v="${kind}">+ ${esc(t.add)}</button></div>${ui.pick?.room === room.id && ui.pick.kind === kind ? this._picker(room, kind, list) : ''}`;
    const th = chips('th', d.thermostats);
    const win = `${chips('win', d.windows)}
      <label class="field">${esc(t.delay)} <input type="number" inputmode="numeric" min="0" max="900" step="5" data-c="r-delay" value="${esc(d.window_delay)}"></label>
      <div class="dim small">${esc(t.window_help)}</div>`;
    const rsState = d.room_sensor ? this._hass.states[d.room_sensor] : null;
    const rs = d.room_sensor
      ? `<div class="entry"><ha-icon icon="mdi:thermometer"></ha-icon><span class="grow ell"><span class="block">${esc(nm(d.room_sensor))}${rsState && !isNaN(+rsState.state) ? ` <span class="dim">· ${esc(fmtTemp(+rsState.state, L))}</span>` : ''}</span>
          <span class="block dim small ell">${esc(d.room_sensor)}</span></span>
          <button class="x" data-a="unpick" data-k="rs" data-v="${esc(d.room_sensor)}" aria-label="${esc(`${t.remove}: ${nm(d.room_sensor)}`)}">✕</button></div>
        <div class="stepper"><span class="grow">${esc(t.room_margin)}</span><button class="round" data-a="margin" data-v="-1" aria-label="${esc(t.margin_less)}">−</button>
          <span class="sval">${esc(fmtM)}</span><button class="round" data-a="margin" data-v="1" aria-label="${esc(t.margin_more)}">+</button></div>
        <div class="dim small">${esc(t.room_closed_help.replace('den Spielraum', fmtM).replace('the margin', fmtM))}</div>
        <div class="dim small">${esc(t.rs_workaround)}</div>`
      : `${this._picker(room, 'rs', [])}<div class="dim small">${esc(t.room_help)}</div><div class="dim small">${esc(t.rs_workaround)}</div>`;
    return `<div class="setup">
      <label class="field">${esc(t.name)} <input data-c="r-name" value="${esc(d.name)}"></label>
      ${sec('th', t.thermostats, d.thermostats.map(nm).join(', ') || '–', th)}
      ${sec('win', t.windows_doors, d.windows.length ? `${d.windows.map(nm).join(', ')} · ${delay} s` : '–', win)}
      ${sec('rs', t.room_sensor, d.room_sensor ? `${nm(d.room_sensor)} · ${fmtM}` : '–', rs)}
      <div class="actions"><button class="btn flat small" data-a="active">${esc(n.active ? t.pause_room : t.activate_room)}</button>
        <span class="grow"></span><button class="btn small" data-a="save-room">${esc(t.save)}</button></div>
      <div class="dim small">${esc(t.pause_help)}</div></div>`;
  }

  /** The area name of an entity (its own area, else its device's), from the registries HA hands the card. */
  _areaOf(e) {
    const h = this._hass;
    const ent = h.entities?.[e];
    const aid = ent?.area_id || (ent?.device_id && h.devices?.[ent.device_id]?.area_id);
    return (aid && h.areas?.[aid]?.name) || '';
  }

  /** Search field and results for adding an entity of `kind`; the room's area (its first thermostat's) first. */
  _picker(room, kind, exclude) {
    const t = this._t;
    const L = this._lang;
    const ui = this._ui;
    const q = ui.pick?.room === room.id && ui.pick.kind === kind ? ui.pick.q : '';
    const roomArea = this._areaOf(room.thermostats[0]) || '';
    const { here, other } = pickCandidates(Object.values(this._hass.states), { kind, q, exclude, areaOf: (e) => this._areaOf(e), roomArea });
    const MAX = 8;
    const item = (s) => {
      const v = kind === 'rs' ? (isNaN(+s.state) ? null : +s.state) : kind === 'th' ? s.attributes.current_temperature : null;
      const area = this._areaOf(s.entity_id);
      return `<button class="pitem" data-a="pick" data-v="${esc(s.entity_id)}"><span class="block">${esc(s.attributes.friendly_name || s.entity_id)}${typeof v === 'number' ? ` <span class="dim">· ${esc(fmtTemp(v, L))}</span>` : ''}</span>
        <span class="block dim small ell">${esc(s.entity_id)}${area ? ` · ${esc(area)}` : ''}</span></button>`;
    };
    const group = (title, list) => (list.length ? `<div class="pgroup">${esc(title)}</div>${list.slice(0, MAX).map(item).join('')}${list.length > MAX ? `<div class="pgroup">${list.length - MAX} ${esc(t.more_matches)}</div>` : ''}` : '');
    const res = here.length || other.length
      ? `${group(roomArea ? `${t.in_area} ${roomArea}` : '', here)}${group(here.length ? t.other_areas : '', other)}`
      : `<div class="pgroup">${esc(t.no_match)}</div>`;
    if (kind === 'rs' && ui.pick?.room !== room.id) ui.pick = { room: room.id, kind: 'rs', q: '' };
    return `<div class="picker"><label class="search"><ha-icon icon="mdi:magnify"></ha-icon>
      <input data-c="pick-q" value="${esc(q)}" placeholder="${esc(t.search)}" aria-label="${esc(t.search)}" autocomplete="off"></label>
      <div class="plist">${res}</div></div>`;
  }

  /** The day settings in three sections (Workday and calendars, keyword calendars, keyword rules), one draft. */
  _daySections(so) {
    const t = this._t;
    const i = this._script?.use_blueprint?.input || {};
    const nm = (e) => this._hass.states[e]?.attributes.friendly_name || e || '–';
    const cals = Array.isArray(i.calendars) ? i.calendars : i.calendars ? [i.calendars] : [];
    const parts = [
      ['days-wd', t.day_wd, nm(i.workday)],
      ['days-cal', t.keyword_calendars, count(cals.length, t.calendars_n)],
      ['days-rules', t.rules, count((i.rules || []).length, t.rules_n)],
    ];
    return parts.map(([k, title, sum]) => `<div class="srow"><button class="shead plain" data-a="set-open" data-v="${k}" aria-expanded="${so === k}"><span>${esc(title)}</span><span class="grow"></span>
      ${so === k ? '' : `<span class="dim small ell">${esc(sum)}</span>`}<ha-icon class="chev" icon="${so === k ? 'mdi:chevron-up' : 'mdi:chevron-down'}"></ha-icon></button>${so === k ? this._renderSettings(k) : ''}</div>`).join('');
  }

  _renderDays() {
    const t = this._t;
    if (!this._days) return `<div class="note">${esc(t.no_script)}</div>`;
    const today = this._now().date;
    const fr = this._friendly();
    const fmt = new Intl.DateTimeFormat(this._lang === 'de' ? 'de-AT' : 'en-GB', { day: 'numeric', month: 'numeric' });
    return this._days.map((d) => {
      const label = d.date === today ? t.today : d.date === addDays(today, 1) ? t.tomorrow : t.wd_short[d.weekday];
      const per = this._rooms.map((r) => [r.name, this._planName(r, planForDay(r, d, fr))]);
      const plans = per.length > 1 && per.every(([, p]) => p === per[0][1]) ? `${t.all_rooms}: ${per[0][1]}` : per.map(([r, p]) => `${r}: ${p}`).join(' · ');
      const edit = this._ui.dayEdit?.date === d.date ? this._renderDayEdit(d) : '';
      return `<div class="day ${d.free ? 'free' : ''} ${d.kind === 'exception' ? 'exc' : ''}">
        <div class="drow" data-a="day" data-v="${d.date}">
          <span class="ddate">${esc(label)} <span class="dim">${esc(fmt.format(new Date(`${d.date}T12:00:00Z`)))}</span></span>
          <span class="dtype">${esc(d.free ? t.free_day : t.working_day)}${d.plan ? ` · ${esc(d.plan)}` : ''}</span>
          ${reasonText(d, this._lang) ? `<span class="dreason dim">${esc(reasonText(d, this._lang))}</span>` : ''}
          <span class="dplans dim">${esc(plans)}</span></div>${edit}</div>`;
    }).join('');
  }

  _renderDayEdit(d) {
    const t = this._t;
    const de = this._ui.dayEdit;
    const opts = [['auto', t.as_decided], ['working', t.working_day], ['free', t.free_day],
      ...this._allPlanNames().map((n) => [`plan:${n}`, `${t.plan}: ${n}`])];
    return `<div class="panel">
      <div class="picks">${opts.map(([v, l]) => `<button class="pick ${de.pick === v ? 'on' : ''}" data-a="day-pick" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>
      ${de.pick !== 'auto' ? `<label class="field">${esc(t.note)} <input data-c="d-note" value="${esc(de.note)}"></label>` : ''}
      <div class="actions"><span class="grow"></span><button class="btn flat small" data-a="day-cancel">${esc(t.cancel)}</button>
        <button class="btn small" data-a="day-save">${esc(t.save)}</button></div></div>`;
  }

  _renderSettings(part) {
    const t = this._t;
    if (!this._script) return `<div class="note">${esc(t.no_script)}</div>`;
    const s = this._settingsDraft();
    const states = Object.values(this._hass.states);
    const cals = states.filter((x) => x.entity_id.startsWith('calendar.'));
    const name = (x) => esc(x.attributes.friendly_name || x.entity_id);
    const sel = (c, val, list, empty) => `<select data-c="${c}">${empty ? `<option value="">${esc(t.none)}</option>` : ''}${list.map((x) => `<option value="${x.entity_id}" ${x.entity_id === val ? 'selected' : ''}>${name(x)}</option>`).join('')}</select>`;
    const workdays = states.filter((x) => x.entity_id.startsWith('binary_sensor.') && Array.isArray(x.attributes.workdays));
    const planNames = this._allPlanNames();
    const rules = s.rules.map((r, i) => `<div class="rrow">
      <input data-c="s-kw" data-i="${i}" value="${esc(r.keyword)}" placeholder="${esc(t.keyword)}">
      <select data-c="s-plan" data-i="${i}"><option value="">→ ${esc(t.rule_free)}</option>${[...new Set([...planNames, ...(r.plan ? [r.plan] : [])])].map((n) => `<option value="${esc(n)}" ${n === r.plan ? 'selected' : ''}>→ ${esc(t.plan)}: ${esc(n)}</option>`).join('')}</select>
      <button class="icon" data-a="up-rule" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button class="icon" data-a="del-rule" data-i="${i}">✕</button></div>`).join('');
    const body = part === 'days-cal'
      ? cals.filter((c) => c.entity_id !== s.exceptions && c.entity_id !== s.holidays).map((c) => `<label class="check"><input type="checkbox" data-c="s-cal" data-v="${c.entity_id}" ${s.calendars.includes(c.entity_id) ? 'checked' : ''}> ${name(c)}</label>`).join('')
      : part === 'days-rules'
        ? `${rules}<button class="btn flat small" data-a="add-rule">+ ${esc(t.add_rule)}</button>`
        : `<label class="field">${esc(t.workday_sensor)} ${sel('s-workday', s.workday, workdays)}</label>
      <label class="field">${esc(t.exceptions_calendar)} ${sel('s-exc', s.exceptions, cals)}</label>
      <label class="field">${esc(t.holiday_calendar)} ${sel('s-hol', s.holidays, cals, true)}</label>`;
    return `<div class="panel">${body}
      <div class="actions"><span class="grow"></span><button class="btn flat small" data-a="reset-settings">${esc(t.cancel)}</button>
        <button class="btn small" data-a="save-settings">${esc(t.save)}</button></div></div>`;
  }
}

const STYLE = `
  :host { --wh-free: var(--success-color, #43a047); --wh-manual: var(--warning-color, #ffa000); --wh-bad: var(--error-color, #db4437); }
  ha-card { padding: 12px 12px 8px; }
  .title { font-size: 1.2em; font-weight: 500; }
  .daytype { font-size: .85em; padding: 2px 8px; border-radius: 10px; background: var(--secondary-background-color); }
  .daytype.free { color: var(--wh-free); }
  .tabs { display: flex; gap: 4px; margin: 8px 0; flex-wrap: wrap; }
  .tab { border: 0; background: none; color: var(--secondary-text-color); padding: 6px 10px; border-radius: 16px; cursor: pointer; font: inherit; }
  .tab.on { background: var(--primary-color); color: var(--text-primary-color, #fff); }
  .tab.small { padding: 3px 9px; font-size: .9em; }
  .banner { padding: 8px 10px; border-radius: 8px; margin: 6px 0; display: flex; gap: 8px; justify-content: space-between; align-items: center; font-size: .92em; }
  .banner.ok { background: color-mix(in srgb, var(--wh-free) 18%, transparent); }
  .banner.bad { background: color-mix(in srgb, var(--wh-bad) 18%, transparent); }
  .banner.warn { background: color-mix(in srgb, var(--wh-manual) 20%, transparent); }
  .note { padding: 12px 4px; color: var(--secondary-text-color); }
  .room { border-top: 1px solid var(--divider-color); padding: 8px 2px; }
  .room:first-child { border-top: 0; }
  .rname { font-weight: 500; }
  .power { border: 1px solid var(--divider-color); background: none; color: var(--secondary-text-color); width: 28px; height: 28px; border-radius: 50%; margin-right: 10px; cursor: pointer; font-size: .85em; vertical-align: middle; padding: 0; }
  .power.on { color: var(--state-climate-heat-color, #ff8a50); border-color: color-mix(in srgb, var(--state-climate-heat-color, #ff8a50) 50%, transparent); }
  .power[disabled] { opacity: .4; cursor: default; }
  .flame { color: var(--state-climate-heat-color, #ff8a50); font-size: .7em; }
  .chip { font-size: .72em; padding: 1px 6px; border-radius: 8px; margin-left: 4px; vertical-align: middle; font-weight: 400; }
  .chip.paused { background: var(--secondary-background-color); color: var(--secondary-text-color); }
  .chip.manual { background: color-mix(in srgb, var(--wh-manual) 25%, transparent); }
  .chip.window { background: color-mix(in srgb, var(--state-climate-cool-color, #2b9af9) 22%, transparent); }
  .dstatus.window { fill: var(--state-climate-cool-color, #2b9af9) !important; }
  .chip.bad { background: color-mix(in srgb, var(--wh-bad) 25%, transparent); }
  .ctrl { display: flex; align-items: center; gap: 12px; margin: 10px 0 6px; }
  .round { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--divider-color); background: none; color: var(--primary-text-color); font-size: 1.3em; cursor: pointer; }
  .target { font-size: 1.5em; min-width: 4.5em; text-align: center; }
  .dialbox { position: relative; max-width: 280px; margin: 4px auto 0; }
  .dialbox svg { display: block; width: 100%; height: auto; touch-action: none; cursor: pointer; outline: none; user-select: none; -webkit-user-select: none; }
  .dialbox svg:focus-visible .dhandle { stroke-width: 5; }
  .dialctrl { position: absolute; left: 0; right: 0; bottom: 2%; justify-content: space-between; margin: 0; padding: 0 4%; pointer-events: none; }
  .dialctrl .round { pointer-events: auto; background: var(--card-background-color); }
  .dtrack { fill: none; stroke: var(--secondary-background-color, #e5e5e5); stroke-width: 12; stroke-linecap: round; }
  .dfill { fill: none; stroke: var(--state-climate-heat-color, #ff8a50); stroke-width: 12; stroke-linecap: round; }
  .dhandle { fill: var(--card-background-color, #fff); stroke: var(--state-climate-heat-color, #ff8a50); stroke-width: 4; }
  .dfill.off, .dhandle.off { stroke: var(--state-climate-off-color, #8a9099); }
  .dcur { stroke: var(--primary-text-color); stroke-width: 3; stroke-linecap: round; }
  .dplan { fill: var(--wh-manual); }
  .dialbox text { text-anchor: middle; fill: var(--primary-text-color); font-family: inherit; }
  .dstatus { font-size: 11px; }
  .dstatus.dim, .dsmall { fill: var(--secondary-text-color) !important; }
  .dstatus.heat, .dstatus .heat { fill: var(--state-climate-heat-color, #ff8a50) !important; }
  .dstatus.manual { fill: var(--wh-manual) !important; }
  .dbig { font-size: 46px; font-weight: 300; }
  .dbig.off { font-size: 34px; }
  .dbig.mixed { font-size: 30px; }
  .dunit { font-size: 15px; }
  .dsmall { font-size: 10.5px; }
  .ctrlbar { margin-top: 2px; }
  .slider { margin: 10px 0 4px; outline: none; user-select: none; -webkit-user-select: none; }
  .stop { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .sbig { font-size: 2.1em; font-weight: 300; }
  .sstat { font-size: .9em; color: var(--secondary-text-color); }
  .sstat.heat, .sstat .heat { color: var(--state-climate-heat-color, #ff8a50); }
  .sstat.manual { color: var(--wh-manual); }
  .sstat.window { color: var(--state-climate-cool-color, #2b9af9); }
  .sbar { position: relative; height: 36px; margin: 2px 12px 0; cursor: pointer; touch-action: pan-y; }
  .strack, .sfill { position: absolute; left: 0; top: 14px; height: 8px; border-radius: 4px; }
  .strack { right: 0; background: var(--secondary-background-color, #e5e5e5); }
  .sfill { background: var(--state-climate-heat-color, #ff8a50); }
  .sfill.off { background: var(--state-climate-off-color, #8a9099); }
  .scur { position: absolute; top: 7px; width: 3px; height: 22px; margin-left: -1.5px; border-radius: 2px; background: var(--primary-text-color); }
  .splan { position: absolute; top: 27px; width: 6px; height: 6px; margin-left: -3px; border-radius: 50%; background: var(--wh-manual); }
  .sknob { position: absolute; top: 6px; width: 24px; height: 24px; margin-left: -12px; border-radius: 50%; box-sizing: border-box;
    background: var(--card-background-color, #fff); border: 4px solid var(--state-climate-heat-color, #ff8a50); }
  .sknob.off { border-color: var(--state-climate-off-color, #8a9099); }
  .slider:focus-visible .sknob { box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color) 35%, transparent); }
  .sscale { display: flex; justify-content: space-between; font-size: .72em; color: var(--secondary-text-color); }
  .grow { flex: 1; }
  .top { display: flex; align-items: center; gap: 6px; min-height: 36px; }
  button.daytype { border: 0; cursor: pointer; font: inherit; font-size: .85em; color: var(--primary-text-color); }
  button.daytype.on { outline: 2px solid var(--primary-color); }
  .iconbtn { border: 0; background: none; color: var(--secondary-text-color); cursor: pointer; padding: 4px; border-radius: 50%; display: inline-flex; }
  .iconbtn.on { color: var(--primary-color); }
  .back { border: 0; background: none; color: var(--primary-text-color); font: inherit; font-size: 1.1em; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; padding: 0; }
  .rhead { display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 4px 0; }
  .ricon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex: none;
    background: color-mix(in srgb, var(--c) 18%, transparent); color: var(--c); --c: var(--secondary-text-color); }
  .ricon.heat, .rline.heat { --c: var(--state-climate-heat-color, #ff8a50); }
  .ricon.ok, .rline.ok { --c: var(--wh-free); }
  .ricon.manual, .rline.manual { --c: var(--wh-manual); }
  .ricon.window, .rline.window { --c: var(--state-climate-cool-color, #2b9af9); }
  .ricon.paused, .rline.paused { --c: var(--secondary-text-color); }
  .rmain { flex: 1; min-width: 0; }
  .rline { color: var(--c); font-size: .9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rtemp { font-size: 1.9em; font-weight: 300; text-align: right; }
  .chev { color: var(--secondary-text-color); flex: none; }
  .rbar { display: flex; align-items: center; gap: 8px; margin: 10px 0 4px; }
  .segc { display: inline-flex; background: var(--secondary-background-color); border-radius: 18px; padding: 3px; }
  .segc button { border: 0; background: none; color: var(--secondary-text-color); font: inherit; font-size: .92em; padding: 5px 12px; border-radius: 15px; cursor: pointer; }
  .segc button.on { background: var(--card-background-color); color: var(--primary-text-color); box-shadow: 0 1px 2px rgba(0,0,0,.2); }
  .switch { display: inline-flex; align-items: center; gap: 8px; font-size: .9em; color: var(--secondary-text-color); }
  .tog { width: 40px; height: 22px; border-radius: 11px; border: 0; background: var(--disabled-color, #bdbdbd); position: relative; cursor: pointer; padding: 0; }
  .tog i { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: left .15s; }
  .tog.on { background: var(--state-climate-heat-color, #ff8a50); }
  .tog.on i { left: 21px; }
  .tog[disabled] { opacity: .4; cursor: default; }
  .pill { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; background: var(--secondary-background-color); border-radius: 10px; padding: 8px 12px; margin: 8px 0; font-size: .92em; }
  .foot { display: flex; justify-content: flex-end; }
  .picks { margin: 8px 0; }
  .pick.dirty::after { content: ' ✎'; color: var(--wh-manual); }
  .pick.add { min-width: 2.2em; }
  .pinfo { margin: 2px 0 6px; }
  .chart { position: relative; height: 88px; border-radius: 8px; overflow: hidden; background: var(--secondary-background-color); }
  .cseg { position: absolute; top: 0; bottom: 0; display: flex; align-items: flex-end; cursor: pointer; box-sizing: border-box; border-right: 1px solid var(--card-background-color, #fff); }
  .cseg.sel { box-shadow: inset 0 0 0 2px var(--primary-text-color); }
  .cbar { width: 100%; display: flex; justify-content: center; align-items: flex-start; font-size: .72em; color: #fff; padding-top: 3px; box-sizing: border-box; overflow: hidden; }
  .cseg.off .cbar { background: repeating-linear-gradient(135deg, #8a9099 0 4px, #6b7078 4px 8px); }
  .plist { margin-top: 6px; }
  .prow2 { display: flex; padding: 9px 4px; border-bottom: 1px solid var(--divider-color); cursor: pointer; }
  .prow2.cur { font-weight: 500; color: var(--primary-color); }
  .pedit { display: grid; grid-template-columns: minmax(6.5em, 8em) auto auto 2em; gap: 8px; align-items: center; padding: 6px 4px; border-bottom: 1px solid var(--divider-color); background: color-mix(in srgb, var(--primary-color) 6%, transparent); }
  .tstep { display: flex; align-items: center; gap: 6px; }
  .tstep span { min-width: 4em; text-align: center; }
  .round.sm { width: 30px; height: 30px; font-size: 1.1em; }
  .round[disabled] { opacity: .35; }
  .savebar { display: flex; align-items: center; gap: 6px; margin-top: 8px; padding: 6px 8px; border-radius: 10px; background: color-mix(in srgb, var(--wh-manual) 14%, transparent); font-size: .9em; }
  .wgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 6px 10px; margin: 8px 0; }
  .wcell { display: flex; align-items: center; gap: 6px; }
  .wcell span { width: 2.4em; flex: none; }
  .wcell select { flex: 1; }
  .wrow.free { margin: 8px 0 4px; }
  .stitle { font-size: .8em; text-transform: uppercase; letter-spacing: .04em; color: var(--secondary-text-color); margin: 14px 0 4px; }
  .srow { border-top: 1px solid var(--divider-color); }
  .shead { display: flex; align-items: center; gap: 8px; padding: 10px 2px; cursor: pointer; }
  .accent { color: var(--primary-color); }
  .th { display: flex; justify-content: space-between; gap: 8px; font-size: .9em; padding: 1px 0; }
  .today { margin: 8px 0 4px; font-size: .9em; }
  .now { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--primary-text-color); }
  .ticks { display: flex; justify-content: space-between; font-size: .68em; color: var(--secondary-text-color); }
  .panel { border: 1px solid var(--divider-color); border-radius: 8px; padding: 8px; margin: 8px 0; }
  button.plain { border: 0; background: none; font: inherit; color: inherit; text-align: left; width: 100%; min-height: 44px; }
  .block { display: block; }
  .ell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .setup { margin: 8px 0; }
  .sec { border: 1px solid var(--divider-color); border-radius: 8px; margin: 6px 0; }
  .sec .shead { padding: 8px 10px; }
  .sec.open { background: color-mix(in srgb, var(--primary-text-color) 3%, transparent); }
  .stitle2 { font-weight: 500; flex: none; }
  .secbody { padding: 0 10px 10px; display: flex; flex-direction: column; gap: 8px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .echip { display: inline-flex; align-items: center; gap: 2px; background: var(--secondary-background-color); border-radius: 16px; padding: 2px 2px 2px 12px; font-size: .92em; }
  .x { border: 0; background: none; color: var(--secondary-text-color); width: 32px; height: 32px; border-radius: 16px; cursor: pointer; font: inherit; flex: none; }
  .addchip { border: 1px dashed var(--divider-color); background: none; color: var(--primary-color); border-radius: 16px; padding: 6px 12px; font: inherit; font-size: .92em; cursor: pointer; }
  .picker { border: 1px solid var(--divider-color); border-radius: 8px; background: var(--card-background-color); overflow: hidden; }
  .search { display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-bottom: 1px solid var(--divider-color); color: var(--secondary-text-color); }
  .search input { flex: 1; border: 0; padding: 8px 2px; outline: none; background: none; }
  .plist { max-height: 320px; overflow-y: auto; }
  .pgroup { font-size: .8em; color: var(--secondary-text-color); padding: 8px 10px 2px; }
  .pgroup:empty { display: none; }
  .pitem { display: block; width: 100%; border: 0; background: none; font: inherit; color: var(--primary-text-color); text-align: left; padding: 6px 10px; cursor: pointer; }
  .pitem:hover, .pitem:focus-visible { background: color-mix(in srgb, var(--primary-color) 12%, transparent); }
  .entry { display: flex; align-items: center; gap: 8px; border: 1px solid var(--divider-color); border-radius: 8px; padding: 6px 4px 6px 10px; background: var(--card-background-color); }
  .entry ha-icon { color: var(--state-climate-heat-color, #ff8a50); flex: none; }
  .stepper { display: flex; align-items: center; gap: 8px; }
  .thsel { display: flex; gap: 6px; margin: 10px 0 0; }
  .thsel button { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 4px; min-height: 40px; border: 1px solid var(--divider-color); background: none; color: var(--primary-text-color); border-radius: 20px; font: inherit; font-size: .92em; cursor: pointer; padding: 4px 6px; }
  .thsel button.on { border: 2px solid var(--primary-color); background: color-mix(in srgb, var(--primary-color) 14%, transparent); font-weight: 500; }
  .thsel .manual, .th .manual { color: var(--wh-manual); }
  .thsel .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .thsel .nm + span { flex: none; }
  .slider.th1 { border: 1px solid var(--divider-color); border-radius: 8px; padding: 8px 10px 4px; }
  .allrow { display: flex; align-items: center; gap: 8px; border: 1px dashed var(--divider-color); border-radius: 8px; padding: 8px 10px; margin: 6px 0; }
  .backrow { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
  .btn.outline { border: 1px solid var(--primary-color); }
  .sval { min-width: 64px; text-align: center; font-weight: 500; }
  .ptitle { font-weight: 500; margin: 6px 0 4px; }
  .phead { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .pname { font-weight: 500; flex: 1; min-width: 0; }
  .prow { display: grid; grid-template-columns: minmax(7.5em, 9em) 5em auto 2em; gap: 6px; align-items: center; margin: 3px 0; }
  .prow.hdr { margin-top: 6px; }
  .rrow { display: grid; grid-template-columns: 1fr 1fr 2em 2em; gap: 6px; margin: 3px 0; }
  .wrow { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin: 4px 0; }
  .field { display: flex; flex-direction: column; gap: 2px; margin: 6px 0; font-size: .9em; color: var(--secondary-text-color); }
  .check { display: flex; align-items: center; gap: 6px; font-size: .92em; margin: 2px 0; }
  input, select { font: inherit; color: var(--primary-text-color); background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 6px; padding: 4px 6px; min-width: 0; box-sizing: border-box; }
  input[type=checkbox] { width: auto; }
  .actions { display: flex; gap: 6px; align-items: center; margin-top: 8px; flex-wrap: wrap; }
  .grow { flex: 1; }
  .btn { border: 0; background: var(--primary-color); color: var(--text-primary-color, #fff); padding: 6px 12px; border-radius: 16px; cursor: pointer; font: inherit; }
  .btn.flat { background: none; color: var(--primary-color); }
  .btn.small { padding: 4px 10px; font-size: .9em; }
  .btn[disabled] { opacity: .5; cursor: default; }
  .icon { border: 0; background: none; color: var(--secondary-text-color); cursor: pointer; font: inherit; }
  .link { border: 0; background: none; color: var(--primary-color); cursor: pointer; font: inherit; white-space: nowrap; }
  .err { color: var(--wh-bad); font-size: .88em; margin-top: 4px; }
  .dim { color: var(--secondary-text-color); }
  .small { font-size: .85em; }
  .day { border-top: 1px solid var(--divider-color); padding: 6px 2px; }
  .day:first-child { border-top: 0; }
  .drow { display: grid; grid-template-columns: 7.5em 1fr; gap: 0 8px; cursor: pointer; }
  .dtype { font-weight: 500; }
  .day.free .dtype { color: var(--wh-free); }
  .day.exc .dtype::after { content: ' ✎'; color: var(--wh-manual); }
  .dreason { grid-column: 2; font-size: .88em; }
  .dplans { grid-column: 2; font-size: .85em; }
  .picks { display: flex; flex-wrap: wrap; gap: 6px; }
  .pick { border: 1px solid var(--divider-color); background: none; color: var(--primary-text-color); border-radius: 14px; padding: 4px 10px; cursor: pointer; font: inherit; font-size: .9em; }
  .pick.on { border-color: var(--primary-color); background: color-mix(in srgb, var(--primary-color) 15%, transparent); }
  @media (max-width: 420px) {
    .prow { grid-template-columns: minmax(7em, 8.5em) 4.5em auto 1.6em; gap: 4px; }
    .drow { grid-template-columns: 6.2em 1fr; }
    .pedit { grid-template-columns: 1fr auto 2em; }
    .pedit .check { grid-column: 1; grid-row: 2; }
  }
`;

if (typeof customElements !== 'undefined' && !customElements.get('weekheat-card')) {
  customElements.define('weekheat-card', WeekheatCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'weekheat-card', name: 'Weekheat', description: 'Heating plans with working-day and free-day plans for heat-only thermostats.' });
  console.info(`%c WEEKHEAT %c ${VERSION} `, 'background:#ff8a50;color:#fff', '');
}
