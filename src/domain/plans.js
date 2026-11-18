// Plan names and which plan a room uses on a day. A plan is a schedule helper; its friendly name
// is "<room> <plan>", and the card shows only the plan part.

/**
 * @typedef {object} Day A day as the day script returns it.
 * @property {string} date ISO date
 * @property {string} weekday "mon" … "sun"
 * @property {boolean} free a free day (weekend, holiday, keyword, exception)
 * @property {string} kind "plain" | "weekend" | "holiday" | "calendar" | "exception"
 * @property {string | null} [plan] a plan name, from an exception or a keyword rule
 * @property {string | null} [detail] the holiday's or event's name
 * @property {string | null} [note] an exception's note
 * @property {string} [source] the calendar a keyword was found in
 */

/**
 * Lower-case ASCII words joined by "_", like Home Assistant's slugify for Latin letters with
 * accents and ß. (Home Assistant also transliterates letters such as ø and ł; this does not.)
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  return String(text)
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * A plan's (or a thermostat's) name as the card shows it: its friendly name without the room's
 * name in front.
 * @param {string | undefined} friendly e.g. "Bad Werktag"
 * @param {string} room the room's name, e.g. "Bad"
 * @returns {string} e.g. "Werktag"
 */
export function planLabel(friendly, room) {
  const name = String(friendly || '');
  const prefixed = room && name.toLowerCase().startsWith(`${room.toLowerCase()} `);
  return prefixed ? name.slice(room.length + 1) : name;
}

/**
 * @typedef {object} PlanNames What a plan name is matched against.
 * @property {Record<string, string>} [friendly] the plans' friendly names, by entity id
 * @property {string} [room] the room's name
 */

/**
 * The plans whose name is a plan name exactly: those whose name without the room name has the
 * same slug, then the plan with the entity id the card gives a plan of that name.
 * @param {string} want the plan name's slug
 * @param {string[]} plans plan entity ids
 * @param {PlanNames} names
 * @returns {string[]}
 */
function exactPlans(want, plans, { friendly = {}, room = '' }) {
  const own = `schedule.weekheat_${slugify(room)}_${want}`;
  const named = plans.filter((plan) => slugify(planLabel(friendly[plan], room)) === want);
  return [...named, ...plans.filter((plan) => plan === own)];
}

/**
 * The plan of a room that a plan name (from an exception or a keyword rule) refers to, or null.
 * An exact match first (exactPlans). Only then a plan whose entity id or name ends with the name,
 * and only if exactly one does ("Werktag" must not pick "Kurzer Werktag").
 * The same rule is `plan_hits` and `named_plan` in the room blueprint; keep both alike.
 * @param {string} name the plan name
 * @param {string[]} plans the room's plan entity ids, in the room's order
 * @param {PlanNames} [names]
 * @returns {string | null} a plan entity id
 */
export function matchPlan(name, plans, names = {}) {
  const want = slugify(name || '');
  if (!want) return null;
  const exact = exactPlans(want, plans, names);
  if (exact.length) return exact[0];
  const tail = ` ${String(name).toLowerCase()}`;
  const friendly = (plan) => String(names.friendly?.[plan] || '').toLowerCase();
  const ends = plans.filter((plan) => plan.endsWith(`_${want}`) || friendly(plan).endsWith(tail));
  return ends.length === 1 ? ends[0] : null;
}

/**
 * The plan a room uses on a day: a plan the day names (if the room has it), else the free-day plan
 * on a free day, else the week's plan for the weekday (or the room's first plan).
 * @param {{name?: string, plans: string[], week?: Record<string, string>, free_day?: string}} room
 * @param {Day} day
 * @param {Record<string, string>} [friendly] the plans' friendly names
 * @returns {string | undefined} a plan entity id
 */
export function planForDay(room, day, friendly = {}) {
  const named = day.plan ? matchPlan(day.plan, room.plans, { friendly, room: room.name }) : null;
  if (named) return named;
  if (day.free) return room.free_day;
  return (room.week || {})[day.weekday] || room.plans[0];
}

/**
 * The day in a list of days with a date, or a plain working day if the list does not have it.
 * @param {Day[] | null} days the days from the day script
 * @param {{date: string, day: string}} now today's date and weekday
 * @returns {Day}
 */
export function dayOf(days, now) {
  const found = (days || []).find((day) => day.date === now.date);
  return found || { date: now.date, weekday: now.day, free: false, kind: 'plain' };
}
