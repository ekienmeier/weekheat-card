// Weekheat card: heating plans for heat-only thermostats, with working-day / free-day plans.
// Pairs with the Weekheat blueprints (weekheat_day script, weekheat_room automation).
// The first part (exported) is plain logic without DOM, tested in tests/logic.test.mjs.

export const VERSION = '0.1.0';
export const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const SCHEDULE_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const ROOM_BLUEPRINT = 'weekheat_room.yaml';
export const DAY_BLUEPRINT = 'weekheat_day.yaml';
export const MIN_T = 5;
export const MAX_T = 30;
export const OFF_T = 5;

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
    need_admin: 'Weekheat braucht derzeit einen Administrator-Benutzer, um die Räume zu lesen.',
    no_rooms: 'Noch keine Räume. Ein Raum ist eine Automation aus dem Blueprint „Weekheat room“.',
    no_script: 'Das Skript „Weekheat day“ fehlt.', unavailable: 'nicht erreichbar',
    plan_in_use: 'Dieser Plan wird in der Woche verwendet und kann nicht gelöscht werden.',
    confirm_delete_plan: 'Plan löschen?', saved: 'Gespeichert', error: 'Fehler',
    new_room_paused: 'Neue Räume starten pausiert: Pläne prüfen, dann aktivieren.',
    late: 'Verspätet', dismiss: 'Ausblenden', reason_weekend: 'Wochenende',
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
    need_admin: 'Weekheat currently needs an administrator user to read the rooms.',
    no_rooms: 'No rooms yet. A room is an automation made from the "Weekheat room" blueprint.',
    no_script: 'The "Weekheat day" script is missing.', unavailable: 'unavailable',
    plan_in_use: 'This plan is used in the week and cannot be deleted.',
    confirm_delete_plan: 'Delete plan?', saved: 'Saved', error: 'Error',
    new_room_paused: 'New rooms start paused: check the plans, then activate.',
    late: 'Late', dismiss: 'Dismiss', reason_weekend: 'Weekend',
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
    this._config = { days: 14, day_script: 'script.weekheat_day', ...config };
    this._ui = this._ui || { tab: 'rooms', expanded: {}, sub: {}, dayEdit: null, addRoom: null, addPlan: null };
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
  }

  get _t() { return I18N[this._lang] || I18N.en; }

  // ---------- data ----------

  async _load() {
    const h = this._hass;
    if (!h) return;
    this._admin = !!h.user?.is_admin;
    if (!this._admin) { this._rooms = []; this._render(); return; }
    try {
      const autos = Object.values(h.states).filter((s) => s.entity_id.startsWith('automation.') && s.attributes.id);
      const cfgs = await Promise.all(autos.map((a) => h.callApi('GET', `config/automation/config/${a.attributes.id}`)
        .then((c) => ({ entity: a.entity_id, id: a.attributes.id, c })).catch(() => null)));
      let rooms = cfgs.filter((x) => x && x.c.use_blueprint && String(x.c.use_blueprint.path).endsWith(ROOM_BLUEPRINT))
        .map(({ entity, id, c }) => {
          const i = c.use_blueprint.input || {};
          const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
          return { entity, id, cfg: c, name: i.room_name || c.alias, thermostats: list(i.thermostats), plans: list(i.plans),
            week: i.week || {}, free_day: i.free_day, state: i.state };
        });
      const order = this._config.rooms;
      if (Array.isArray(order) && order.length) rooms = order.map((e) => rooms.find((r) => r.entity === e || r.id === e)).filter(Boolean);
      else rooms.sort((a, b) => a.name.localeCompare(b.name));
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

      // day script and its settings
      const scriptId = this._config.day_script.replace(/^script\./, '');
      this._script = await h.callApi('GET', `config/script/config/${scriptId}`).catch(() => null);
      const bps = await h.callWS({ type: 'blueprint/list', domain: 'automation' }).catch(() => ({}));
      this._roomBlueprint = Object.keys(bps).find((p) => p.endsWith(ROOM_BLUEPRINT)) || null;
      await this._loadDays();
      this._error = null;
    } catch (e) {
      this._error = e.message || String(e);
    }
    this._render(true);
  }

  async _loadDays() {
    const h = this._hass;
    if (!this._script) { this._days = null; return; }
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
    for (const r of this._rooms) { ids.add(r.entity); r.thermostats.forEach((t) => ids.add(t)); r.plans.forEach((p) => ids.add(p)); }
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
    const target = avail.map((s) => s.attributes.temperature).find((x) => typeof x === 'number');
    const manual = wanted != null && avail.some((s) => s.state === 'off' || Math.abs((s.attributes.temperature ?? -99) - wanted) >= 0.25);
    return { plan, periods, at, wanted, current: cur.length ? cur.reduce((a, b) => a + b, 0) / cur.length : null, target,
      unavailable: th.length - avail.length, off: avail.some((s) => s.state === 'off'), manual,
      active: h.states[room.entity]?.state === 'on', step: avail[0]?.attributes.target_temp_step || 0.5,
      heating: avail.some((s) => s.attributes.hvac_action === 'heating') };
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
    Object.assign(room, { week: cfg.use_blueprint.input.week || {}, plans: cfg.use_blueprint.input.plans,
      free_day: cfg.use_blueprint.input.free_day, thermostats: cfg.use_blueprint.input.thermostats,
      name: cfg.use_blueprint.input.room_name });
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
    const input = { room_name: name, thermostats, plans: [weekday, free], free_day: free,
      week: Object.fromEntries(WEEK.map((d) => [d, weekday])), state: stateEntity,
      day_script: this._config.day_script, language: this._lang };
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
    const cal = this._script?.use_blueprint?.input?.exceptions;
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
      if (el) this._change(el.dataset.c, el);
    });
    root.addEventListener('focusout', () => { if (this._pending) { this._pending = false; setTimeout(() => this._render(), 0); } });
  }

  _room(el) { return this._rooms.find((r) => r.id === el.closest('[data-room]')?.dataset.room); }

  _draftFor(room) {
    const ui = this._ui;
    if (!ui.draft || ui.draft.room !== room.id) {
      ui.draft = { room: room.id, plans: Object.fromEntries(room.plans.filter((p) => this._plans[p]).map((p) => [p,
        { name: this._planName(room, p), periods: this._plans[p].periods.map((x) => ({ ...x })) }])),
      week: { ...room.week }, free_day: room.free_day, name: room.name, thermostats: [...room.thermostats] };
    }
    return ui.draft;
  }

  _act(a, el, ev) {
    const ui = this._ui;
    const room = el.closest('[data-room]') ? this._room(el) : null;
    const plan = el.closest('[data-plan]')?.dataset.plan;
    const i = el.dataset.i != null ? +el.dataset.i : null;
    switch (a) {
      case 'tab': ui.tab = el.dataset.v; break;
      case 'toggle': ui.expanded[room.id] = !ui.expanded[room.id]; break;
      case 'sub': ui.sub[room.id] = ui.sub[room.id] === el.dataset.v ? null : el.dataset.v; ui.draft = null; ui.addPlan = null; break;
      case 'step': {
        const n = this._roomNow(room);
        const base = this._stepTarget?.room === room.id ? this._stepTarget.value : (n.target ?? n.wanted ?? 20);
        const v = Math.max(MIN_T, Math.min(MAX_T, Math.round((base + (+el.dataset.v) * n.step) / n.step) * n.step));
        this._stepTarget = { room: room.id, value: v };
        clearTimeout(this._stepTimer);
        this._stepTimer = setTimeout(() => {
          this._stepTarget = null;
          this._run(() => this._hass.callService('climate', 'set_temperature', { entity_id: room.thermostats, temperature: v }), false);
        }, 700);
        break;
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
        if (!last || start > last.start) d.periods.push({ start, temperature: last ? periodTemp(last) : 20, off: false });
        break;
      }
      case 'del-period': this._draftFor(room).plans[plan].periods.splice(i, 1); break;
      case 'save-plan': {
        const d = this._draftFor(room).plans[plan];
        this._run(async () => { await this._savePlan(room, plan, d); ui.draft = null; await this._poke([room]); });
        return;
      }
      case 'reset-plan': ui.draft = null; break;
      case 'del-plan':
        if (!confirm(this._t.confirm_delete_plan)) return;
        this._run(async () => { await this._deletePlan(room, plan); ui.draft = null; });
        return;
      case 'add-plan-open': ui.addPlan = { room: room.id, name: '', template: 'starter_weekday' }; break;
      case 'add-plan': {
        const f = ui.addPlan;
        if (!f.name.trim()) return;
        this._run(async () => { await this._addPlan(room, f.name.trim(), f.template); ui.addPlan = null; ui.draft = null; });
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
        this._run(async () => { await this._saveRoomConfig(room, { room_name: d.name.trim(), thermostats: d.thermostats }); ui.draft = null; await this._poke([room]); });
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
      case 'add-room-open': ui.addRoom = { name: '', thermostats: [] }; break;
      case 'add-room-cancel': ui.addRoom = null; break;
      case 'add-room': {
        const f = ui.addRoom;
        if (!f.name.trim() || !f.thermostats.length) return;
        this._run(async () => { await this._addRoom(f.name.trim(), f.thermostats); ui.addRoom = null; }, false);
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
      case 'r-th': { const d = this._draftFor(room); d.thermostats = v ? [...d.thermostats, el.dataset.v] : d.thermostats.filter((t) => t !== el.dataset.v); break; }
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
    if (!this._hass) { this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card></ha-card>`; return; }
    const t = this._t;
    const ui = this._ui;
    let body;
    if (this._admin === false) body = `<div class="note">${esc(t.need_admin)}</div>`;
    else if (!this._rooms) body = '<div class="note">…</div>';
    else if (ui.tab === 'days') body = this._renderDays();
    else if (ui.tab === 'settings') body = this._renderSettings();
    else body = this._renderRooms();
    const tabs = ['rooms', 'days', ...(this._admin ? ['settings'] : [])].map((k) => `<button class="tab ${ui.tab === k ? 'on' : ''}" data-a="tab" data-v="${k}">${esc(k === 'rooms' ? (this._lang === 'de' ? 'Räume' : 'Rooms') : t[k])}</button>`).join('');
    const notes = Object.values(this._notes || {}).filter((n) => String(n.notification_id).startsWith('weekheat_'))
      .map((n) => `<div class="banner warn"><span>${esc(n.message)}</span><button class="link" data-a="dismiss" data-v="${esc(n.notification_id)}">${esc(t.dismiss)}</button></div>`).join('');
    const today = this._days ? this._today() : null;
    const head = today ? `<span class="daytype ${today.free ? 'free' : ''}">${esc(today.free ? t.free_day : t.working_day)}${today.plan ? ` · ${esc(today.plan)}` : ''}</span>` : '';
    const msg = this._msg ? `<div class="banner ${this._msg.bad ? 'bad' : 'ok'}">${esc(this._msg.text)}</div>` : '';
    const err = this._error ? `<div class="banner bad">${esc(this._error)}</div>` : '';
    const noScript = this._rooms && this._admin && !this._script ? `<div class="banner bad">${esc(t.no_script)}</div>` : '';
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card>
      <div class="top">${this._config.title ? `<div class="title">${esc(this._config.title)}</div>` : ''}${head}</div>
      <div class="tabs">${tabs}</div>${msg}${err}${noScript}${notes}<div class="body">${body}</div></ha-card>`;
  }

  _ribbon(periods, nowMin) {
    const segs = periods.map((p, i) => {
      const end = i + 1 < periods.length ? periods[i + 1].start : 1440;
      const w = ((end - p.start) / 1440) * 100;
      const cls = p.temperature == null ? 'gap' : p.off ? 'off' : '';
      const style = `left:${(p.start / 1440) * 100}%;width:${w}%;${cls ? '' : `background:${tempColor(p.temperature)}`}`;
      const label = w > 7 ? `<span>${esc(p.temperature == null ? '' : p.off ? this._t.off : Number(p.temperature).toLocaleString(this._lang))}</span>` : '';
      return `<div class="seg ${cls}" style="${style}" title="${fromMin(p.start)} ${esc(fmtTemp(p, this._lang))}">${label}</div>`;
    }).join('');
    const marker = nowMin != null ? `<div class="now" style="left:${(nowMin / 1440) * 100}%"></div>` : '';
    return `<div class="ribbon">${segs}${marker}</div><div class="ticks"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>`;
  }

  _renderRooms() {
    const t = this._t;
    const ui = this._ui;
    if (!this._rooms.length && !ui.addRoom) {
      return `<div class="note">${esc(t.no_rooms)}</div>${this._admin ? `<button class="btn" data-a="add-room-open">${esc(t.add_room)}</button>` : ''}`;
    }
    const rows = this._rooms.map((r) => this._renderRoom(r)).join('');
    let add = '';
    if (this._admin) {
      if (ui.addRoom) {
        const used = new Set(this._rooms.flatMap((r) => r.thermostats));
        const climates = Object.values(this._hass.states).filter((s) => s.entity_id.startsWith('climate.'));
        add = `<div class="panel"><div class="ptitle">${esc(t.add_room)}</div>
          <label class="field">${esc(t.name)} <input data-c="ar-name" value="${esc(ui.addRoom.name)}"></label>
          <div class="field">${esc(t.thermostats)}</div>
          ${climates.map((s) => `<label class="check"><input type="checkbox" data-c="ar-th" data-v="${s.entity_id}" ${ui.addRoom.thermostats.includes(s.entity_id) ? 'checked' : ''}> ${esc(s.attributes.friendly_name || s.entity_id)}${used.has(s.entity_id) ? ' <span class="dim">(✓)</span>' : ''}</label>`).join('')}
          <div class="dim small">${esc(t.new_room_paused)}</div>
          <div class="actions"><button class="btn" data-a="add-room">${esc(t.create)}</button><button class="btn flat" data-a="add-room-cancel">${esc(t.cancel)}</button></div></div>`;
      } else add = `<button class="btn flat" data-a="add-room-open">+ ${esc(t.add_room)}</button>`;
    }
    return rows + add;
  }

  _renderRoom(room) {
    const t = this._t;
    const n = this._roomNow(room);
    const open = !!this._ui.expanded[room.id];
    const shown = this._stepTarget?.room === room.id ? this._stepTarget.value : n.target;
    const chips = [];
    if (!n.active) chips.push(`<span class="chip paused">${esc(t.paused)}</span>`);
    if (n.unavailable) chips.push(`<span class="chip bad">${esc(t.unavailable)}</span>`);
    if (n.manual && n.active) chips.push(`<span class="chip manual">${esc(t.manual)}</span>`);
    let line = '';
    if (n.at) {
      const until = n.at.next ? `${t.until} ${fromMin(n.at.next.start)}, ${t.then} ${fmtTemp(n.at.next, this._lang)}` : `${t.until} ${t.tomorrow_l}`;
      line = n.manual && n.active
        ? `${t.manual}: ${fmtTemp(n.target, this._lang)} ${n.at.next ? `${t.until} ${fromMin(n.at.next.start)}` : ''} · ${t.plan} ${fmtTemp(n.at.period, this._lang)}`
        : `${fmtTemp(n.at.period, this._lang)} ${until}`;
    }
    const head = `<div class="rhead" data-a="toggle">
      <div class="rname">${esc(room.name)} ${chips.join('')}</div>
      <div class="rtemp">${n.current != null ? fmtTemp(Math.round(n.current * 10) / 10, this._lang) : '–'}${n.heating ? ' <span class="flame">▲</span>' : ''}</div>
      <div class="rline dim">${esc(line)}</div></div>`;
    if (!open) return `<div class="room" data-room="${room.id}">${head}</div>`;
    const now = this._now();
    const sub = this._ui.sub[room.id];
    const subs = ['plans', 'week', ...(this._admin ? ['room'] : [])].map((k) => `<button class="tab small ${sub === k ? 'on' : ''}" data-a="sub" data-v="${k}">${esc(t[k])}</button>`).join('');
    const th = room.thermostats.map((e) => {
      const s = this._hass.states[e];
      if (!s) return `<div class="th dim">${esc(e)}</div>`;
      const st = ['unavailable', 'unknown'].includes(s.state) ? t.unavailable : s.state === 'off' ? t.off : fmtTemp(s.attributes.temperature, this._lang);
      return `<div class="th"><span>${esc(s.attributes.friendly_name || e)}</span><span class="dim">${fmtTemp(s.attributes.current_temperature, this._lang)} → ${esc(st)}</span></div>`;
    }).join('');
    let detail = '';
    if (sub === 'plans') detail = this._renderPlans(room);
    else if (sub === 'week') detail = this._renderWeek(room);
    else if (sub === 'room') detail = this._renderRoomSettings(room);
    return `<div class="room open" data-room="${room.id}">${head}
      <div class="ctrl"><button class="round" data-a="step" data-v="-1">−</button><div class="target">${fmtTemp(shown, this._lang)}</div><button class="round" data-a="step" data-v="1">+</button>
        ${this._admin ? `<button class="btn flat small" data-a="active">${esc(n.active ? t.active : t.paused)} ${n.active ? '●' : '○'}</button>` : ''}</div>
      ${th}
      <div class="today"><span class="dim">${esc(t.today)}: ${esc(this._planName(room, n.plan))}</span>${this._ribbon(n.periods, now.min)}</div>
      <div class="tabs">${subs}</div>${detail}</div>`;
  }

  _renderPlans(room) {
    const t = this._t;
    const d = this._draftFor(room);
    const plans = room.plans.filter((p) => d.plans[p]).map((p) => {
      const dp = d.plans[p];
      const errs = checkPeriods(dp.periods);
      const rows = dp.periods.map((x, i) => `<div class="prow">
        <input type="time" step="60" data-c="p-start" data-i="${i}" value="${fromMin(x.start)}" ${i === 0 ? 'disabled' : ''}>
        <input type="number" inputmode="decimal" min="${MIN_T}" max="${MAX_T}" step="0.5" data-c="p-temp" data-i="${i}" value="${x.off || x.temperature == null ? '' : x.temperature}" ${x.off ? 'disabled' : ''}>
        <label class="check"><input type="checkbox" data-c="p-off" data-i="${i}" ${x.off ? 'checked' : ''}> ${esc(t.off)}</label>
        ${i === 0 ? '<span></span>' : `<button class="icon" data-a="del-period" data-i="${i}" title="${esc(t.delete)}">✕</button>`}</div>`).join('');
      const roles = [];
      if (p === room.free_day) roles.push(t.free_day);
      const days = WEEK.filter((k) => room.week[k] === p).map((k) => t.wd_short[k]);
      if (days.length) roles.push(days.join(' '));
      return `<div class="panel" data-plan="${p}">
        <div class="phead"><input class="pname" data-c="p-name" value="${esc(dp.name)}"><span class="dim small">${esc(roles.join(' · '))}</span></div>
        ${this._ribbon(dp.periods)}
        <div class="prow hdr dim small"><span>${esc(t.from)}</span><span>°C</span><span></span><span></span></div>${rows}
        ${errs.length ? `<div class="err">${errs.map((e) => esc(t[`err_${e}`])).join(' ')}</div>` : ''}
        <div class="actions"><button class="btn flat small" data-a="add-period">+ ${esc(t.add_period)}</button>
          <span class="grow"></span>
          <button class="btn flat small" data-a="del-plan">${esc(t.delete)}</button>
          <button class="btn flat small" data-a="reset-plan">${esc(t.cancel)}</button>
          <button class="btn small" data-a="save-plan" ${errs.length ? 'disabled' : ''}>${esc(t.save)}</button></div></div>`;
    }).join('');
    const ap = this._ui.addPlan?.room === room.id ? this._ui.addPlan : null;
    const templates = [['starter_weekday', t.starter_weekday], ['starter_free', t.starter_free],
      ...this._rooms.flatMap((r) => r.plans.filter((p) => this._plans[p]).map((p) => [p, `${r.name}: ${this._planName(r, p)}`]))];
    const add = ap ? `<div class="panel"><label class="field">${esc(t.name)} <input data-c="ap-name" value="${esc(ap.name)}"></label>
        <label class="field">${esc(t.copy_from)} <select data-c="ap-template">${templates.map(([v, l]) => `<option value="${esc(v)}" ${ap.template === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <div class="actions"><button class="btn small" data-a="add-plan">${esc(t.create)}</button><button class="btn flat small" data-a="add-plan-cancel">${esc(t.cancel)}</button></div></div>`
      : `<button class="btn flat small" data-a="add-plan-open">+ ${esc(t.add_plan)}</button>`;
    return plans + add;
  }

  _planOptions(room, selected) {
    return room.plans.map((p) => `<option value="${esc(p)}" ${p === selected ? 'selected' : ''}>${esc(this._planName(room, p))}</option>`).join('');
  }

  _renderWeek(room) {
    const t = this._t;
    const d = this._draftFor(room);
    const rows = WEEK.map((k) => `<label class="wrow"><span>${esc(t.weekdays[k])}${['sat', 'sun'].includes(k) ? ` <span class="dim small">(${esc(t.only_if_working)})</span>` : ''}</span>
      <select data-c="w-day" data-v="${k}">${this._planOptions(room, d.week[k] || room.plans[0])}</select></label>`).join('');
    return `<div class="panel"><div class="ptitle">${esc(t.working_day_plans)}</div>${rows}
      <label class="wrow"><span><b>${esc(t.free_day_plan)}</b></span><select data-c="w-free">${this._planOptions(room, d.free_day)}</select></label>
      <div class="actions"><span class="grow"></span><button class="btn small" data-a="save-week">${esc(t.save)}</button></div></div>`;
  }

  _renderRoomSettings(room) {
    const t = this._t;
    const d = this._draftFor(room);
    const climates = Object.values(this._hass.states).filter((s) => s.entity_id.startsWith('climate.'));
    return `<div class="panel"><label class="field">${esc(t.name)} <input data-c="r-name" value="${esc(d.name)}"></label>
      <div class="field">${esc(t.thermostats)}</div>
      ${climates.map((s) => `<label class="check"><input type="checkbox" data-c="r-th" data-v="${s.entity_id}" ${d.thermostats.includes(s.entity_id) ? 'checked' : ''}> ${esc(s.attributes.friendly_name || s.entity_id)}</label>`).join('')}
      <div class="actions"><span class="grow"></span><button class="btn small" data-a="save-room">${esc(t.save)}</button></div></div>`;
  }

  _renderDays() {
    const t = this._t;
    if (!this._days) return `<div class="note">${esc(t.no_script)}</div>`;
    const today = this._now().date;
    const fr = this._friendly();
    const fmt = new Intl.DateTimeFormat(this._lang === 'de' ? 'de-AT' : 'en-GB', { day: 'numeric', month: 'numeric' });
    return this._days.map((d) => {
      const label = d.date === today ? t.today : d.date === addDays(today, 1) ? t.tomorrow : t.wd_short[d.weekday];
      const plans = this._rooms.map((r) => `${r.name}: ${this._planName(r, planForDay(r, d, fr))}`).join(' · ');
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

  _renderSettings() {
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
    return `<div class="panel">
      <div class="ptitle">${esc(t.keyword_calendars)}</div>
      ${cals.filter((c) => c.entity_id !== s.exceptions && c.entity_id !== s.holidays).map((c) => `<label class="check"><input type="checkbox" data-c="s-cal" data-v="${c.entity_id}" ${s.calendars.includes(c.entity_id) ? 'checked' : ''}> ${name(c)}</label>`).join('')}
      <div class="ptitle">${esc(t.rules)}</div>${rules}
      <button class="btn flat small" data-a="add-rule">+ ${esc(t.add_rule)}</button>
      <label class="field">${esc(t.workday_sensor)} ${sel('s-workday', s.workday, workdays)}</label>
      <label class="field">${esc(t.exceptions_calendar)} ${sel('s-exc', s.exceptions, cals)}</label>
      <label class="field">${esc(t.holiday_calendar)} ${sel('s-hol', s.holidays, cals, true)}</label>
      <div class="actions"><span class="grow"></span><button class="btn flat small" data-a="reset-settings">${esc(t.cancel)}</button>
        <button class="btn small" data-a="save-settings">${esc(t.save)}</button></div></div>`;
  }
}

const STYLE = `
  :host { --wh-free: var(--success-color, #43a047); --wh-manual: var(--warning-color, #ffa000); --wh-bad: var(--error-color, #db4437); }
  ha-card { padding: 12px 12px 8px; }
  .top { display: flex; align-items: baseline; gap: 8px; justify-content: space-between; }
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
  .rhead { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; cursor: pointer; }
  .rname { font-weight: 500; }
  .rtemp { font-size: 1.15em; text-align: right; }
  .rline { grid-column: 1 / -1; font-size: .9em; }
  .flame { color: var(--state-climate-heat-color, #ff8a50); font-size: .7em; }
  .chip { font-size: .72em; padding: 1px 6px; border-radius: 8px; margin-left: 4px; vertical-align: middle; font-weight: 400; }
  .chip.paused { background: var(--secondary-background-color); color: var(--secondary-text-color); }
  .chip.manual { background: color-mix(in srgb, var(--wh-manual) 25%, transparent); }
  .chip.bad { background: color-mix(in srgb, var(--wh-bad) 25%, transparent); }
  .ctrl { display: flex; align-items: center; gap: 12px; margin: 10px 0 6px; }
  .round { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--divider-color); background: none; color: var(--primary-text-color); font-size: 1.3em; cursor: pointer; }
  .target { font-size: 1.5em; min-width: 4.5em; text-align: center; }
  .th { display: flex; justify-content: space-between; gap: 8px; font-size: .9em; padding: 1px 0; }
  .today { margin: 8px 0 4px; font-size: .9em; }
  .ribbon { position: relative; height: 22px; border-radius: 5px; overflow: hidden; background: var(--secondary-background-color); margin-top: 4px; }
  .seg { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: .72em; color: #fff; overflow: hidden; border-right: 1px solid var(--card-background-color, #fff); box-sizing: border-box; }
  .seg.off { background: repeating-linear-gradient(135deg, #8a9099 0 4px, #6b7078 4px 8px); }
  .seg.gap { background: transparent; }
  .now { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--primary-text-color); }
  .ticks { display: flex; justify-content: space-between; font-size: .68em; color: var(--secondary-text-color); }
  .panel { border: 1px solid var(--divider-color); border-radius: 8px; padding: 8px; margin: 8px 0; }
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
  }
`;

if (typeof customElements !== 'undefined' && !customElements.get('weekheat-card')) {
  customElements.define('weekheat-card', WeekheatCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'weekheat-card', name: 'Weekheat', description: 'Heating plans with working-day and free-day plans for heat-only thermostats.' });
  console.info(`%c WEEKHEAT %c ${VERSION} `, 'background:#ff8a50;color:#fff', '');
}
