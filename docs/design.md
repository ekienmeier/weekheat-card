# Weekheat design

Status: draft for review, 2026-11-13. Nothing here is built yet.

## Goal

A heating schedule for heat-only thermostats (radiator valves with one setpoint), native to Home
Assistant, modelled on [Temperate](https://github.com/xman2000/temperate-card):

- Each **room** has two day plans, **weekday** and **weekend**. A plan is a list of periods covering
  00:00–24:00, each with a temperature.
- Each **day** is a weekday or a weekend day, decided for the whole home (see [Day decision](#day-decision)).
- At the start of each period, the room's thermostats are set to that period's temperature. A change
  made by hand (thermostat knob, vendor app, HA dashboard) holds until the next period.
- An "off" period is a low setpoint (default 5 °C), never HVAC off, so frost protection stays.
- Runs entirely inside HA (automations, scripts, helpers). The card only edits and shows; nothing
  depends on a dashboard being open.

Not in scope (for now): heat/cool, external room sensors, open-window handling, presence, more than
two plans per room.

## Parts

| Part | What it is | One per |
|---|---|---|
| `weekheat_day` | **Script blueprint**: decides weekday/weekend for one or more dates and says why | home |
| `weekheat_room` | **Automation blueprint**: applies the room's plan to its thermostats | room |
| `weekheat-card` | Dashboard card (HACS): control, plan editor, day preview and exceptions | dashboard |
| Helpers | Two `schedule` helpers (plans) and one `input_text` (state) per room | room |
| Exceptions calendar | A **Local Calendar** (e.g. "Weekheat exceptions") holding the per-day exceptions | home |

Why a script for the day decision: the automations need it for today, the card needs it for the
14-day preview, and both must agree. A script with a response is callable from both, so the rules
exist exactly once.

## Day decision

`script.weekheat_day` takes `start` (a date, default today) and `days` (default 1) and returns, per date:

```yaml
- date: "2026-12-07"
  type: weekend          # weekday | weekend
  kind: calendar         # plain | holiday | calendar | exception
  reason: "Family: Schulautonomer Tag: schulfrei"
```

The first rule that matches wins (the same order as hue-scp):

1. **Exception**: an all-day event on that date in the exceptions calendar, titled `weekend` or
   `weekday` (German labels `Wochenende` / `Werktag` accepted too), optionally followed by a note.
   Set on the card; see [Exceptions](#exceptions).
2. **Weekend day**: the weekday is not in the Workday sensor's `workdays` attribute (here Sat, Sun).
   The Workday sensor is the single place where the weekend days are set.
3. **Public holiday**: `workday.check_date` says not a workday although the weekday is a workday.
   The reason is "Public holiday". If a Holiday integration calendar is given (optional input), its
   event title gives the name, e.g. "Public holiday: Mariä Empfängnis".
4. **Calendar keyword**: an event in one of the selected calendars, on that date, whose title contains
   one of the keywords (ignoring case), e.g. `schulfrei`. Multi-day events count for each day they
   cover (all-day event ends are exclusive).
5. Otherwise: weekday.

Keywords only ever make a day a weekend day.

Script inputs: Workday binary sensor, keyword calendars (multiple), keywords (list), exceptions
calendar, optional holiday calendar.

Cost: one `calendar.get_events` call over all calendars for the whole range, plus one
`workday.check_date` per date. Both are local reads (CalDAV is fetched by HA in the background).

Verified against HA 2026.11.1: `workday.check_date` returns `{workday: bool}` for any date (e.g.
2026-12-08 false); `calendar.get_events` with `return_response` returns `start`, `end`, `summary`
per event over several calendars at once.

## Plans

Two [schedule](https://www.home-assistant.io/integrations/schedule/) helpers per room:
`schedule.weekheat_<room>_weekday` and `schedule.weekheat_<room>_weekend`.

- Each block carries data `{temperature: 20.5}`, or `{temperature: 5, off: true}` for an off period
  (needs HA 2025.3+ for block data).
- The card writes the same blocks to all seven days of a helper and always covers 00:00–24:00 with
  adjacent blocks, so the helper is always `on` and its attributes always hold the current period.
- A helper made elsewhere can still be picked. Gaps between blocks mean "no change" (nothing is
  written while in a gap).

The plan of a day runs 00:00–24:00 of that day. At midnight the next day's plan takes over.

## Room automation

One automation per room, made from `weekheat_room`. Inputs: thermostats (one or more `climate`
entities), the two plans, the state helper, the day script, a settle time (default 30 s).

### Core rule: write when the scheduled temperature changes

The automation computes the **wanted** temperature: today's type (from the day script) picks the plan,
the plan's current block gives the temperature. It writes to the thermostats **only when the wanted
temperature differs from the last wanted temperature it applied**, which it keeps per thermostat in the
state helper.

Consequences:
- A manual change is never detected or fought; it simply stays until the wanted value changes, i.e.
  until the next period with a different temperature. No manual-override helper is needed.
- Two adjacent periods with the same temperature behave as one (also across midnight: a 21:30 → 5 °C
  period followed by 00:00 → 5 °C does not reset a manual 22 °C at midnight).
- A changed exception, a plan edited on the card, or a day type that changes during the day (a
  calendar event added for today) take effect at once if they change the wanted temperature.
- If the thermostat is in `off` when a write is due, the write switches it to `heat`
  (`climate.set_temperature` with `hvac_mode: heat`).

### Triggers

- State or attribute change of either plan (period boundaries, plan edits).
- Time pattern every 15 minutes: a safety net that also retries failed writes. It writes nothing
  unless the wanted value changed.
- Home Assistant start.
- Manual run (`automation.trigger`), used by the card after an exception for today was changed.

### Writes and failures

Per thermostat: `climate.set_temperature`, then wait up to the settle time for the thermostat to
report the new setpoint. The state helper is updated **only for thermostats that confirmed**, so an
unavailable thermostat is retried at the next trigger. Mode `queued`, so overlapping triggers run in
order.

### State helper

`input_text.weekheat_<room>_state` (max 255 chars), compact JSON:

```json
{"climate.x": [20.5, "2026-11-13T06:00"], "climate.y": [20.5, "2026-11-13T06:00"]}
```

Last applied wanted temperature and when, per thermostat. Enough for 3–4 thermostats per room.

### Home Assistant down

There is no fallback: while HA is down, the thermostats keep their last setpoint. When HA starts, the
start trigger applies the current period at once if the wanted value changed in the meantime. In that
case the automation also creates a **persistent notification** ("Bedroom: 06:00 period (20 °C) applied
late at 06:42, Home Assistant was not running"), and the card shows the same as a banner until it is
dismissed.

## Exceptions

Stored as all-day events in a Local Calendar, so they have no size limit, survive restarts, show in
HA's calendar view and need no extra helper. The card is the UI: in the day preview, tap a day to set
"weekday", "weekend" or "as decided" (removes the exception), with an optional note. Writing uses
`calendar.create_event`; removing uses the `calendar/event/delete` WebSocket command. Past exceptions
are left alone (they're history in the calendar).

Alternative considered: an `input_text` with JSON. Rejected: 255 characters is about a dozen dates.

## Card

`custom:weekheat-card`, one card for the home.

- **Rooms**: from the card config. By default one room per area of the selected thermostats; in the
  editor, thermostats can be grouped into one room regardless of area (e.g. "Living room" = two
  thermostats in two areas). HA areas are never changed.
- **Room view** (collapsible like Temperate's rows): current temperature, target, current period and
  the next one ("20 °C until 21:30, then 5 °C"). +/− sets the thermostat directly; that is a manual
  change, shown as "Manual: 22 °C until 21:30" while the thermostat differs from the wanted value.
- **Plan tab**: two ribbons (weekday, weekend) with draggable boundaries, period list, add/remove
  period, per period a temperature or Off. Saves to the room's schedule helpers.
- **Days**: the next 14 days from the day script: date, weekday/weekend, reason; today and tomorrow
  highlighted. Tap a day to set an exception. Shared by all rooms.
- **Setup**: like Temperate's editor, lists missing helpers per room with a button to create them
  (admin), seeded from the thermostat's current setpoint (one all-day period). The automation itself
  is made from the blueprint by the user (or by a "Create automation" button, admin, later).
- **Language**: German and English, chosen by the HA user's language.
- **Banners**: HA-was-down notice (above); room automation missing or disabled; day script missing;
  exceptions calendar missing.

Helper naming: the room's slug, e.g. room "Living room" → `schedule.weekheat_living_room_weekday`.
Helpers with other names can be picked in the editor.

## Prerequisites in HA

- HA 2025.4 or later (schedule block data, script responses, variable scoping in loops; to be
  confirmed while building).
- Workday integration configured (weekend days, country/region).
- Calendars with the keyword events (e.g. CalDAV).
- A Local Calendar for the exceptions.
- **The thermostats' own schedules switched off**, otherwise they overwrite the plan at their own
  slot times (seen with an Aqara W600: an external 24 °C was replaced by its own 15 °C at 20:30).
- Optional: Holiday integration for holiday names.

## Testing

- Live tests on **one thermostat only** (the bedroom) during development, in its own room, with
  temperatures in the normal range; the setpoint before a test is restored afterwards.
- Day script: dates with known answers (a Saturday, a public holiday, a keyword event, an exception
  set and removed again).
- Automation: a plan with periods a few minutes apart to see writes at boundaries; a manual change in
  between that must hold; equal adjacent periods; an exception for today; an HA restart across a
  boundary; the thermostat unavailable (write retried).
- Card: logic (period at a time, wanted vs. actual, slug and helper lookup, de/en strings) as plain
  JS unit tests; layout with a screenshot harness like Temperate's.

## Open questions

1. **Exceptions calendar**: OK to add a Local Calendar ("Weekheat exceptions") for storage, with the
   card as the only UI you need?
2. **Holiday names**: add the Holiday integration (AT, Upper Austria) so the preview says which
   holiday, or is "Public holiday" enough?
3. **Keywords and calendars**: hue-scp uses one keyword and one calendar today. Same for Weekheat, or
   more calendars (e.g. the school calendar)?
4. **Plan defaults** for a new room: one all-day period at the current setpoint, or a template (e.g.
   weekday 06:00 20 °C / 08:00 17 °C / 17:00 21 °C / 22:00 17 °C)?
