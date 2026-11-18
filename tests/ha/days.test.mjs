// Tests of src/ha/days.js: setting and removing a day's exception (review L1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { setException } from '../../src/ha/days.js';
import { fakeGateway, sent } from './fake-gateway.mjs';

/** The exceptions calendar. */
const CALENDAR = 'calendar.weekheat_ausnahmen';

/**
 * A fake whose exceptions calendar has these events on 2026-12-08.
 * @param {object[]} events
 * @returns {any}
 */
function calendarWith(events) {
  const path = `calendars/${CALENDAR}?start=2026-12-08T00:00:00&end=2026-12-09T00:00:00`;
  return fakeGateway({ rest: { [path]: events } });
}

/**
 * An all-day event.
 * @param {string} summary
 * @param {string} from first day
 * @param {string} until the day after the last
 * @returns {object}
 */
function allDay(summary, from, until) {
  return { uid: summary, summary, start: { date: from }, end: { date: until } };
}

/** Removing the exception of 2026-12-08 ("As decided"). */
const AS_DECIDED = { calendar: CALENDAR, date: '2026-12-08', exception: null, lang: 'de' };

/**
 * The uids of the events a fake was asked to delete.
 * @param {any} gateway
 * @returns {string[]}
 */
function removed(gateway) {
  return sent(gateway, 'calendar/event/delete').map((message) => message.uid);
}

/**
 * The all-day events a fake was asked to create, as [summary, from, until].
 * @param {any} gateway
 * @returns {string[][]}
 */
function created(gateway) {
  const creates = gateway.calls.filter(
    ([kind, name]) => kind === 'service' && name === 'calendar.create_event',
  );
  return creates.map(([, , data]) => [data.summary, data.start_date, data.end_date]);
}

test('setting an exception replaces the one of that day', async () => {
  const gateway = calendarWith([
    allDay('Werktag', '2026-12-08', '2026-12-09'),
    allDay('Geburtstag', '2026-12-08', '2026-12-09'),
  ]);
  const change = { calendar: CALENDAR, date: '2026-12-08', exception: { free: true }, lang: 'de' };
  await setException(gateway, change);
  assert.deepEqual(removed(gateway), ['Werktag']);
  assert.deepEqual(created(gateway), [['Freier Tag', '2026-12-08', '2026-12-09']]);
});

test('"As decided" on one day of a longer exception keeps its other days (L1)', async () => {
  const gateway = calendarWith([allDay('Freier Tag – Ferien', '2026-12-07', '2026-12-11')]);
  await setException(gateway, AS_DECIDED);
  assert.deepEqual(removed(gateway), ['Freier Tag – Ferien']);
  assert.deepEqual(created(gateway), [
    ['Freier Tag – Ferien', '2026-12-07', '2026-12-08'],
    ['Freier Tag – Ferien', '2026-12-09', '2026-12-11'],
  ]);
});

test('an instance of a recurring exception is only deleted', async () => {
  const event = {
    ...allDay('Plan: Homeoffice', '2026-12-08', '2026-12-09'),
    recurrence_id: '20261208',
  };
  const gateway = calendarWith([event]);
  await setException(gateway, AS_DECIDED);
  assert.equal(sent(gateway, 'calendar/event/delete')[0].recurrence_id, '20261208');
  assert.deepEqual(created(gateway), []);
});

test('without an exceptions calendar, setting an exception is refused', async () => {
  const change = { calendar: null, date: '2026-12-08', exception: { free: true }, lang: 'de' };
  await assert.rejects(setException(fakeGateway(), change), { code: 'no_exceptions' });
});
