# Weekheat design

Status: draft for review, 2026-11-13 (second round). Nothing here is built yet.

## Goal

A heating schedule for heat-only thermostats (radiator valves with one setpoint), native to Home
Assistant, modelled on [Temperate](https://github.com/xman2000/temperate-card):

- Each **room** has any number of named **day plans** (e.g. Weekday, Home office, Free day). A plan is
  a list of periods covering 00:00–24:00, each with a temperature or Off.
- A room's **week** says which plan a working day uses on each weekday (e.g. Mon–Fri Weekday, Wed Home
  office). Every **free day** (weekend day, public holiday, keyword day, exception) uses the room's
  free-day plan.
- Whether a day is a working day or a free day is decided once for the whole home (see
  [Day decision](#day-decision)).
- At the start of each period, the room's thermostats are set to its temperature. A change made by
  hand (thermostat knob, vendor app, HA dashboard) holds until the next period.
- An Off period is a low setpoint (default 5 °C), never HVAC off, so frost protection stays.
- Runs entirely inside HA (a script, automations, helpers). The card edits and shows; nothing depends
  on a dashboard being open.

Not in scope for now: heat/cool, external room sensors, open-window handling, presence.

## Parts

| Part | What it is | One per |
|---|---|---|
| `weekheat_day` | **Script blueprint**: decides working day / free day for one or more dates, and why | home |
| `weekheat_room` | **Automation blueprint**: a room. Its inputs are the room's whole configuration | room |
| `weekheat-card` | Dashboard card (HACS): rooms, plan editor, week, day preview, exceptions, settings | dashboard |
| Plans | One `schedule` helper per named plan | plan |
| State | One `input_text` per room: what was last applied (runtime only) | room |
| Exceptions | A **Local Calendar** holding per-day exceptions | home |
| Holidays | The **Holiday** integration's calendar, for holiday names | home |

**Single sources of truth:**
- The day rules (calendars, keywords, the Workday sensor) are the **inputs of the day script**.
- A room (its name, thermostats, plans, week, free-day plan) is the **inputs of its automation**.
- The card reads and writes these configurations through HA's config API. It stores nothing of its
  own; its YAML only says which rooms to show (default: all automations made from `weekheat_room`).

Why a script for the day decision: the automations need it for today and the card for the 14-day
preview, and both must agree. A script with a response is callable from both, so the rules exist once.

## Day decision

`script.weekheat_day` takes `start` (a date, default today) and `days` (default 1) and returns, per date:

```yaml
- date: "2026-12-07"
  free: true
  kind: calendar         # plain | holiday | calendar | exception
  reason: "Family: Schulautonomer Tag: schulfrei"
  plan: null             # a plan name, only for an exception that names one (see Exceptions)
```

The first rule that matches wins (the same order as hue-scp):

1. **Exception**: an all-day event on that date in the exceptions calendar; see [Exceptions](#exceptions).
2. **Weekend day**: the weekday is not in the Workday sensor's `workdays` attribute (here Sat, Sun).
   The Workday sensor is the one place where the weekend days are set.
3. **Public holiday**: `workday.check_date` says not a workday although the weekday is a workday. The
   name comes from the holiday calendar's event that day, e.g. "Public holiday: Mariä Empfängnis".
4. **Calendar keyword**: an event in one of the selected calendars, on that date, whose title contains
   one of the keywords (ignoring case), e.g. `schulfrei`. Multi-day events count for each day they
   cover (all-day event ends are exclusive).
5. Otherwise: a working day.

Keywords only ever make a day a free day.

**Script inputs**, edited on the card's settings panel (or in HA's script editor):

| Input | Example |
|---|---|
| Workday sensor | `binary_sensor.workday_sensor_…` |
| Keyword calendars (any number) | the family calendar, the school calendar |
| Keywords (any number) | `schulfrei` |
| Exceptions calendar | `calendar.weekheat_ausnahmen` |
| Holiday calendar (optional) | `calendar.osterreich_4` |

Cost: one `calendar.get_events` call over all calendars for the whole range, plus one
`workday.check_date` per date. Both are local reads (HA fetches CalDAV in the background).

Verified on HA 2026.11.1: `workday.check_date` returns `{workday: bool}` for any date (2026-12-08
false); `calendar.get_events` with `return_response` returns `start`, `end`, `summary` per event for
several calendars at once; the Holiday calendar names the next holiday ("Mariä Empfängnis").

## Plans and week

**A plan** is a [schedule](https://www.home-assistant.io/integrations/schedule/) helper,
`schedule.weekheat_<room>_<plan>`, named "<Room> <Plan>" (e.g. "Bathroom Weekday"; the card shows only
the plan part).
- Any number of periods; start times to the minute; temperature 5–30 °C in the thermostat's step
  (0.5), or Off. Each block carries data `{temperature: 21}` or `{temperature: 5, off: true}` (block
  data needs HA 2025.3+).
- The card writes the same blocks to all seven days of the helper and always covers 00:00–24:00 with
  adjacent blocks, so the helper is always `on` and its attributes hold the current period.
- A plan is used on whatever days the week assigns it to; the seven days inside the helper carry no
  meaning of their own.

**The week** is an automation input: one plan per weekday for working days, and one free-day plan:

```yaml
week: {mon: weekday, tue: weekday, wed: home_office, thu: weekday, fri: weekday,
       sat: weekday, sun: weekday}
free_day: free_day
```

Which plan a room uses on a date:
- free day → the free-day plan;
- working day → `week[weekday]`. Sat and Sun only matter when an exception makes them a working day;
- an exception that names a plan → that plan, if the room has a plan of that name; otherwise the rule
  above with the exception's free/working value.

A plan's day runs 00:00–24:00. At midnight the next day's plan takes over.

**Starter plans** for a new room (modelled on a bathroom: one hour of heating in the morning, lower
during the day, heating in the evening, a cooldown):

| Weekday | | Free day | |
|---|---|---|---|
| 00:00 | Off | 00:00 | Off |
| 06:00 | 21 °C | 07:30 | 21 °C |
| 07:00 | 17 °C | 08:30 | 19 °C |
| 17:00 | 21 °C | 17:00 | 21 °C |
| 21:00 | 18 °C | 21:30 | 18 °C |
| 22:00 | Off | 22:30 | Off |

The week starts as Mon–Sun Weekday, free day Free day. German names: Werktag, Freier Tag.

Further plans are added on the card (empty, or as a copy of another plan, also from another room).

## Room automation

One automation per room, made from `weekheat_room`.

| Input | |
|---|---|
| Room name | shown on the card |
| Thermostats | one or more `climate` entities, from any areas (areas are never changed) |
| Plans | the room's schedule helpers |
| Week, free-day plan | see above (plans referred to by their slug) |
| State helper | `input_text.weekheat_<room>_state` |
| Day script | `script.weekheat_day` |
| Settle time | default 30 s |

### Core rule: write when the scheduled temperature changes

The automation computes the **wanted** temperature: the day script and the week pick the plan, the
plan's current block gives the temperature. It writes to the thermostats **only when the wanted
temperature differs from the last wanted temperature it applied**, kept per thermostat in the state
helper.

Consequences:
- A manual change is never detected or fought; it stays until the wanted value changes, i.e. until
  the next period with a different temperature. No manual-override helper, no "Back to auto".
- Adjacent periods with the same temperature behave as one, also across midnight (a 22:00 Off followed
  by 00:00 Off does not reset a manual 22 °C at midnight).
- A changed exception, an edited plan or week, or a day that turns free during the day (an event
  added for today) take effect at once if they change the wanted temperature.
- If a thermostat is `off` when a write is due, the write switches it to `heat`
  (`climate.set_temperature` with `hvac_mode: heat`).

### Triggers

- State or attribute change of any of the room's plans (period boundaries, plan edits).
- Time pattern every 15 minutes: safety net, also retries failed writes. Writes nothing unless the
  wanted value changed.
- Midnight (00:00:05), so a new day's plan choice is applied even where no block boundary falls there.
- Home Assistant start.
- Manual run (`automation.trigger`), used by the card after an exception for today or the week changed.

### Writes and failures

Per thermostat: `climate.set_temperature`, then wait up to the settle time for the thermostat to
report the new setpoint. The state helper is updated **only for thermostats that confirmed**, so an
unavailable thermostat is retried at the next trigger. Mode `queued`.

### State helper

`input_text.weekheat_<room>_state` (max 255 characters), compact JSON, per thermostat the last applied
wanted temperature and when:

```json
{"climate.x": [21, "2026-11-13T06:00"], "climate.y": [21, "2026-11-13T06:00"]}
```

Enough for 3–4 thermostats per room.

### Home Assistant down

No fallback: while HA is down, the thermostats keep their last setpoint. When HA starts, the current
period is applied at once if the wanted value changed in the meantime, and a **persistent
notification** says so ("Bedroom: 06:00 period (21 °C) applied late at 06:42, Home Assistant was not
running"). The card shows the same as a banner until it is dismissed.

## Exceptions

All-day events in the Local Calendar (`calendar.weekheat_ausnahmen`). They have no size limit, survive
restarts and also give an overview in HA's calendar view. The card is the UI: in the day preview, tap a
day and pick:

- **Working day** / **Free day**, or a **plan name** (e.g. Home office: rooms with that plan use it,
  the others treat the day as a working day);
- **As decided** removes the exception;
- an optional note.

Event title format: `Werktag`, `Freier Tag` or `Plan: Homeoffice`, optionally `– <note>`. English
titles (`Working day`, `Free day`) are read too. Writing uses `calendar.create_event`, removing the
`calendar/event/delete` WebSocket command. Past exceptions stay in the calendar as history.

## Card

`custom:weekheat-card`, one card for the home.

- **Rooms**: by default every automation made from `weekheat_room`, in the order given in the card
  YAML (optional). Collapsible rows like Temperate's.
- **Room view**: current temperature, target, the current period and the next one ("21 °C until 07:00,
  then 17 °C"), today's plan. +/− sets the thermostat directly; that is a manual change, shown as
  "Manual: 22 °C until 21:00" while the thermostat differs from the wanted value.
- **Plans tab**: one ribbon per plan with draggable boundaries; period list; add or remove periods; a
  temperature or Off per period; add, rename, copy and delete plans.
- **Week tab**: Mon–Sun with a plan picker each (Sat/Sun marked "only if made a working day"), and
  the free-day plan.
- **Days**: the next 14 days from the day script: date, working/free, reason, the plan each room will
  use; today and tomorrow highlighted. Tap a day to set an exception. Shared by all rooms.
- **Settings** (home): keyword calendars (picked from the calendar entities), keywords (chips), the
  Workday sensor, the exceptions and holiday calendars. Saved as the day script's inputs.
- **Setup**: "Add room" asks for a name and thermostats, then creates the starter plans, the state
  helper and the automation. Missing pieces are listed per room with a button to create them.
- **Language**: German and English, by the HA user's language.
- **Banners**: HA was down (above); room automation disabled; day script or a calendar missing.

**Admin rights:** creating and editing helpers, scripts and automations is admin-only in HA. So
editing plans, the week, settings and rooms needs an admin user; other users see everything and can
change thermostats and exceptions. (To be confirmed for `schedule/update` while building.)

## Prerequisites in HA

- HA 2025.4 or later (schedule block data, script responses, variable scoping in loops; to be
  confirmed while building).
- Workday integration (weekend days, country/region), Holiday integration (holiday names).
- Calendars with the keyword events (e.g. CalDAV), and a Local Calendar for the exceptions.
- **The thermostats' own schedules switched off**, otherwise they overwrite the plan at their own
  slot times (seen with an Aqara W600: an external 24 °C was replaced by its own 15 °C at 20:30).

## Testing

- Live tests on **one thermostat only** (the bedroom) during development, in its own room, with
  temperatures in the normal range; the setpoint before a test is restored afterwards.
- Day script: dates with known answers (a Saturday, a public holiday with its name, a keyword event,
  an exception set and removed again, an exception naming a plan).
- Automation: periods a few minutes apart to see writes at boundaries; a manual change in between that
  must hold; equal adjacent periods; midnight; a week change; an exception for today; an HA restart
  across a boundary; the thermostat unavailable (write retried).
- Card: logic (period at a time, plan for a date, wanted vs. actual, slugs, de/en strings) as plain JS
  unit tests; layout with a screenshot harness like Temperate's.

## Decisions (2026-11-13)

- Exceptions in a Local Calendar; Holiday integration for names (both set up).
- Keyword calendars and keywords configurable on the card, stored in the day script.
- Named plans per room plus a week; free days use the free-day plan.
- Starter plans as above.

## Open questions

1. **Exceptions naming a plan** (e.g. "Home office on 20 Nov"): wanted, or are working/free enough?
2. **Admin only** for editing plans and the week: OK for your household?
