// The days: what the day script decides for the next days, and exceptions in the exceptions
// calendar.

import { CardError } from '../domain/errors.js';
import { exceptionTitle, parseException } from '../domain/exceptions.js';
import { addDays } from '../domain/time.js';

/**
 * @typedef {object} CalendarEvent An event as the calendar REST API returns it.
 * @property {string} uid
 * @property {string} summary
 * @property {{date?: string, dateTime?: string}} start
 * @property {{date?: string, dateTime?: string}} end all-day: the day after the last one
 * @property {string} [recurrence_id] set for an instance of a recurring event
 */

/**
 * The day script's decision for some days, from today.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {{script: string, days: number}} request the script, and how many days
 * @returns {Promise<import('../domain/plans.js').Day[]>}
 */
export async function loadDays(gateway, { script, days }) {
  const response = await gateway.runScript(script, { days });
  return response?.days || [];
}

/**
 * Is an event on a date? An all-day event is on every day it covers; another on the day it starts.
 * @param {CalendarEvent} event
 * @param {string} date ISO date
 * @returns {boolean}
 */
function isOn(event, date) {
  if (!event.start.date) return String(event.start.dateTime || '').slice(0, 10) === date;
  return event.start.date <= date && date < event.end.date;
}

/**
 * Create an all-day event.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {string} calendar
 * @param {{summary: string, from: string, until: string}} event from the first day to the day
 *   after the last
 * @returns {Promise<unknown>}
 */
function createAllDay(gateway, calendar, { summary, from, until }) {
  const data = { entity_id: calendar, summary, start_date: from, end_date: until };
  return gateway.service('calendar', 'create_event', data);
}

/**
 * Make the days of an all-day event before and after a date again, after it was deleted.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {string} calendar
 * @param {{event: CalendarEvent, date: string}} day
 * @returns {Promise<void>}
 */
async function keepOtherDays(gateway, calendar, { event, date }) {
  const next = addDays(date, 1);
  const { summary, start, end } = event;
  if (start.date < date)
    await createAllDay(gateway, calendar, { summary, from: start.date, until: date });
  if (end.date > next)
    await createAllDay(gateway, calendar, { summary, from: next, until: end.date });
}

/**
 * Take one day out of an exception event: delete it, and make its other days again, so that only
 * this day changes (review L1). An instance of a recurring event, or an event with a time, is only
 * deleted.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {string} calendar
 * @param {{event: CalendarEvent, date: string}} day
 * @returns {Promise<void>}
 */
async function removeDay(gateway, calendar, { event, date }) {
  const recurrence = event.recurrence_id ? { recurrence_id: event.recurrence_id } : {};
  const remove = { type: 'calendar/event/delete', entity_id: calendar, uid: event.uid };
  await gateway.ws({ ...remove, ...recurrence });
  if (!event.recurrence_id && event.start.date)
    await keepOtherDays(gateway, calendar, { event, date });
}

/**
 * Set a day's exception, or remove it (exception null: the day is as the rules decide).
 * @param {import('./gateway.js').Gateway} gateway
 * @param {{calendar: string | null, date: string, exception: import('../domain/exceptions.js')
 *   .Exception | null, lang: string}} change
 * @returns {Promise<void>}
 */
export async function setException(gateway, { calendar, date, exception, lang }) {
  if (!calendar) throw new CardError('no_exceptions');
  const range = `start=${date}T00:00:00&end=${addDays(date, 1)}T00:00:00`;
  const events = /** @type {CalendarEvent[]} */ (
    await gateway.get(`calendars/${calendar}?${range}`)
  );
  const exceptions = events.filter((event) => parseException(event.summary) && isOn(event, date));
  for (const event of exceptions) await removeDay(gateway, calendar, { event, date });
  if (!exception) return;
  const summary = exceptionTitle(exception, lang);
  await createAllDay(gateway, calendar, { summary, from: date, until: addDays(date, 1) });
}
