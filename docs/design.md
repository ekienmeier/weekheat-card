# Weekheat design

Status: built and in use (0.13). This document says how Weekheat works and why; it is kept up to date
with each release. The rules for the code are in [coding-guidelines.md](coding-guidelines.md).

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
- Runs entirely inside HA (scripts, automations, helpers). The card edits and shows; nothing depends
  on a dashboard being open.

Not in scope for now: heat/cool, presence. Open windows: see *Windows and doors*; a room sensor: see
*Room sensor*.

## Parts

| Part | What it is | One per |
|---|---|---|
| `weekheat_day` | **Script blueprint**: decides working day / free day for one or more dates, and why | home |
| `weekheat_room` | **Automation blueprint**: a room. Its inputs are the room's whole configuration | room |
| `weekheat_exercise` | **Script blueprint**: the valve exercise of some thermostats, called by the rooms | home |
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
  plan: null             # a plan name, from an exception or a keyword rule that names one
```

The first rule that matches wins (the same order as hue-scp):

1. **Exception**: an all-day event on that date in the exceptions calendar; see [Exceptions](#exceptions).
2. **Weekend day**: the weekday is not in the Workday sensor's `workdays` attribute (here Sat, Sun).
   The Workday sensor is the one place where the weekend days are set.
3. **Public holiday**: `workday.check_date` says not a workday although the weekday is a workday. The
   name comes from the holiday calendar's event that day, e.g. "Public holiday: Mariä Empfängnis".
4. **Calendar keyword**: an event in one of the selected calendars, on that date, whose title contains
   the keyword of a **keyword rule** (ignoring case). Multi-day events count for each day they cover
   (all-day event ends are exclusive). A rule either makes the day a **free day** (e.g. `schulfrei`)
   or keeps it a working day with a **named plan** (e.g. `Homeoffice` → plan Home office). If several
   rules match, the first in the list wins.
5. Otherwise: a working day.

Since weekend days and holidays come first, keyword rules only act on working days: a "Homeoffice"
event on a Saturday or a holiday changes nothing.

**Script inputs**, edited on the card's settings panel (or in HA's script editor):

| Input | Example |
|---|---|
| Workday sensor | `binary_sensor.workday_sensor_…` |
| Keyword calendars (any number) | the family calendar, the school calendar |
| Keyword rules (ordered) | `schulfrei` → free day; `Homeoffice` → plan Home office |
| Exceptions calendar | `calendar.weekheat_ausnahmen` |
| Holiday calendar (optional) | `calendar.osterreich_4` |

Cost: one `calendar.get_events` call over all calendars for the whole range, plus one
`workday.check_date` per date. Both are local reads (HA fetches CalDAV in the background).

**When a source fails** (since 0.13): calendars without a state are left out of the call; if reading
the events fails anyway, the days are decided without calendars; if `workday.check_date` fails, the
weekday decides (the Workday sensor's workdays, else Monday to Friday). The script answers in any
case, so the rooms keep working. In the room automation, a failing day script makes today a working
day by its weekday (Saturday and Sunday free), so that windows, the heating switch and the room
sensor still work.

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
- A plan edited per weekday in Home Assistant's schedule editor still works: the room automation
  follows the schedule's state, i.e. today's blocks, and so does the room's status on the card. The
  Plan view shows and edits Monday's blocks, with a note that the plan differs by weekday and that
  saving it from the card makes every day like it; it then marks no period as now.

**The week** is an automation input: one plan per weekday for working days, and one free-day plan:

```yaml
week: {mon: weekday, tue: weekday, wed: home_office, thu: weekday, fri: weekday,
       sat: weekday, sun: weekday}
free_day: free_day
```

Which plan a room uses on a date:
- free day → the free-day plan;
- working day → `week[weekday]`. Sat and Sun only matter when an exception makes them a working day;
- a day with a plan name (from an exception or a keyword rule) → that plan, if the room has a plan of
  that name; otherwise `week[weekday]`. So a "Homeoffice" event switches only the rooms that have a
  Home office plan. A plan has that name when (first match wins): its name without the room name has
  the same slug (so case, accents and "-" vs " " don't matter); or its entity id is the one the card
  gives a plan of that name (`schedule.weekheat_<room>_<slug>`, which still holds after a rename); or,
  only if exactly one plan does, its entity id or name ends with it (e.g. after the room was
  renamed). So "Werktag" never picks "Kurzer Werktag" (fixed in 0.12.1). The card (`matchPlan`) and
  the room blueprint (`plan_hits`, `named_plan`) have the same rule. The slug is Home Assistant's
  `slugify` (the card's copy spells ß, ø, æ, œ, ł, đ, þ the same way; only letters of other scripts,
  such as Greek or Cyrillic, differ).

Example, home office mostly on Fridays: either the week assigns Fri → Home office and an office Friday
gets an exception naming the Weekday plan, or the week keeps Fri → Weekday and a (recurring)
"Homeoffice" calendar event marks the home-office days. Both work; the second keeps the calendar as
the one place to look.

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
| Valve exercise script | `script.weekheat_exercise` |
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
- If a thermostat is `off` when a write is due, the write switches it to `heat` first
  (`climate.set_hvac_mode`, then `climate.set_temperature`; HomeKit Controller ignores the
  `hvac_mode` of `set_temperature`).

### Triggers

- State or attribute change of any of the room's plans (period boundaries, plan edits).
- Time pattern every 15 minutes: safety net, also retries failed writes. Writes nothing unless the
  wanted value changed.
- Midnight (00:00:05), so a new day's plan choice is applied even where no block boundary falls there.
- Home Assistant start.
- A window or door sensor open for the window delay, or closed again.
- Manual run (`automation.trigger`), used by the card after an exception for today or the week changed.

### Run modes

Each run, after the valve exercise, decides one mode; the first that applies wins. Before that,
setpoints saved for another list of thermostats (see *State helper*, `_th`) are dropped together with
the last applied values, so that the room returns to its plan:

| Mode | When | What it does |
|---|---|---|
| off | the heating switch is off | forgets a held window or valve state, writes `off_temp` like a plan value |
| open | a window has been open for the delay, nothing saved yet | saves the setpoints in `_open` (the plan's temperature if the saved ones were dropped), writes `off_temp` |
| hold | a window is still open | writes nothing; a new period's temperature replaces the saved value |
| rc | setpoints are saved and the room sensor has a value | valves held closed (`_rc`): released when the room is down to the highest saved setpoint (gives them back), else kept at `off_temp`; a new period or a setpoint by hand (`by_hand_from` or more) replaces the saved value |
| restore | setpoints are saved, all windows closed, no room sensor value | writes the saved setpoints back |
| plan | otherwise | writes the plan's temperature where it changed; then, with a room sensor, *close*: if the room is the margin above the highest setpoint, saves them in `_open` with `_rc` and writes `off_temp` |

The thresholds are named variables at the top of the blueprint (`off_temp`, `same_setpoint`,
`same_wanted`, `by_hand_from`, …); the card has the same constants, and a test checks that they match.

### Writes and failures

Per thermostat: `climate.set_temperature`, then wait up to the settle time for the thermostat to
report the new setpoint. The state helper is updated **only for thermostats that confirmed**, so an
unavailable thermostat is retried at the next trigger. Mode `queued`.

### State helper

`input_text.weekheat_<room>_state` (max 255 characters), compact JSON, per thermostat the last applied
wanted temperature:

```json
{"climate.x": [21.0], "climate.y": [21.0]}
```

While a window is open it also holds `"_open"`: the setpoints to restore, as a list in thermostat order
(a list rather than a map to stay within 255 characters). While the room sensor holds the valves closed,
`"_open"` is there too, plus `"_rc": 1`; `"_rt"` is the time of the room sensor's last switch (minutes
since the epoch). During the valve exercise, `"_ex": 1`.

**Thermostats changed while held** (review L8, after 0.13.0). With `"_open"` the state also holds
`"_th"`, a fingerprint of the thermostat list in its order (`th_print`: a polynomial hash of the entity
ids' characters, below 999983, so at most 6 digits). A run whose list has another fingerprint (a
thermostat added, removed, replaced or moved while a window was open or the valves were held) does not
give the saved setpoints back to the wrong thermostats: it drops `_open`, `_rc` and the per-thermostat
values (only `_rt` stays), and the room returns to its plan:

| When the fingerprint differs | The run |
|---|---|
| windows closed, no room sensor | *plan*: writes the plan's temperature to every thermostat |
| a window still open | *open*: saves the **plan's temperature** for every thermostat (not the 5 °C they have), writes 5 °C; closing gives the plan's temperature back |
| room sensor, room still warm | *plan*, then *close* (once the hold time has passed): saves the plan's temperature, writes 5 °C |
| heating switch off | *off*: writes 5 °C, as always |

A state saved before `_th` existed counts as saved for the current list, so an update does not drop a
held room's setpoints. Until the next run (the card runs the room after saving its thermostats; a
change in HA's automation editor waits for the next trigger, at most 15 minutes), the card shows the
saved setpoints by position. Changes made by hand before the window opened are lost in this case.

**Size.** Home Assistant drops a value longer than the helper's maximum with only a warning in the log.
The room would then rewrite its setpoints on every run (a change by hand no longer holds), and after a
window closes it would have nothing to restore. Since 0.12.1:
- Each thermostat takes about 10 characters plus its entity id. Before 0.12.1 each entry also had a
  timestamp that nothing read (`[21, "2026-11-13T06:00"]`, 20 characters more); the automation drops it
  when it reads the state, so an old state gets shorter on its next save.
- The card refuses a room whose worst case (`stateSize`: every thermostat, all markers set) exceeds
  255 characters, when adding a room or saving its thermostats. Entity ids (with `climate.`) may then
  be up to 85 characters long for two thermostats, 51 for three, 35 for four, 25 for five (since `_th`;
  before, 91, 56, 38 and 27).
- The automation checks the length before saving. A state that does not fit is not saved, and a
  persistent notification `weekheat_<room>_state` says so (the card shows it as a banner). The valve
  exercise's `_ex` marker is left out if it would not fit.

### Windows and doors

Replaces the Aqara hub's "window open → thermostat off" linkage, which is gone with the on-device
schedules. Per room: any number of window/door sensors (`binary_sensor` with device class window,
door, opening or garage door; `input_boolean` for tests) and a delay (default 30 s, 0–900).

Each run is in one of four modes:

| Mode | When | What it does |
|---|---|---|
| open | a sensor has been open for the delay, nothing saved yet | saves each thermostat's setpoint in `_open`, sets 5 °C |
| hold | still open | writes nothing; a period with a different temperature replaces the saved value (and `applied`), so closing restores the new period |
| restore | all closed, `_open` saved | writes the saved values back, removes `_open` |
| plan | otherwise | the normal rule |

So a manual setpoint from before the window opened comes back when it closes, unless a new period
began meanwhile. A thermostat that was off when the window opened stays off. One that was unavailable
is turned down when it comes back while the window is still open. Opening shorter than the delay does
nothing. A paused room does not react to windows. Changes made by hand while the window is open are
overwritten when it closes.

Tested 2026-11-13 on a copy of the blueprint with the bedroom thermostat and an `input_boolean` as the
window: opening and closing, the delay, a manual value restored, a new period while open, a short
opening ignored (16 checks).

### Room sensor

Added 2026-11-17 (0.9) after an Aqara W600 in the bathroom kept heating at 20 °C with its linked T1 at
22.6 °C: the W600 shows the external sensor's value but controls its valve on the internal sensor (an
open firmware bug, reported on the Aqara forum since October 2026). The thermostat's temperature
compensation shifts only the internal sensor, by one fixed value, and its error depends on how hot the
radiator is.

Per room an optional temperature sensor (`room_sensor`), a margin (`room_margin`, default 0.5 °C) and a
hold time (`room_hold`, default 10 min). The setpoint is still the thermostat's: the plan's value, or one
set by hand. Two states:

| State | Thermostats have | Switches when |
|---|---|---|
| normal | the setpoint | room ≥ highest setpoint + margin → closed: the setpoints are saved in `_open` with `_rc`, 5 °C is written |
| closed | 5 °C | room ≤ highest saved setpoint → normal: the saved setpoints are written back |

- No polling: the automation also runs on every change of the room sensor, and on a setpoint change
  while closed (a setpoint set by hand on the card, the thermostat or the vendor app).
- While closed, a period with a different temperature replaces the saved value (as with an open window),
  and a setpoint set by hand of 10 °C or more becomes the saved value; the room is then checked against
  it at once (raised above the room: released; still below: 5 °C again). A lower one is a nudge from the
  5 °C the thermostat shows (seen 2026-11-18: an unlocked knob turned to 6 °C, stored as the setpoint);
  it is undone and the saved value stays. 0.12.
- The hold time spaces out only switches the room temperature causes (battery, motor). A new period or a
  setpoint set by hand is let through at once; a held-back switch is caught by the next sensor change or
  the 15-minute tick.
- Precedence: heating switch off, then open windows, then the room sensor. A window opening while closed
  turns it into a window hold (the saved setpoints stay); when the windows close, the room sensor
  decides at once whether the valves stay closed (room above the setpoint) or get it back.
- The sensor unavailable or not a number: the saved setpoints are written back and the room runs on the
  plan alone. There is no "too old" rule: an Aqara T1 reports only changes, so in a steady room hours
  without a report are normal.
- The card shows the room's setpoint (the saved one), not the 5 °C, with the status *Warm enough · valve
  closed*, and the room sensor's value as the room temperature.

Tested 2026-11-17 in the bathroom (W600, T1 at 22.8 °C): the 06:00 period (10 °C) closed at once (5 °C
written, 10 °C saved); 20 °C set by hand while closed was saved and 5 °C written again within 5 s; 24 °C
by hand released at once (24 °C kept); 10 °C by hand then closed at the 06:15 tick, after the hold time.

### Blueprint updates

HACS installs only the card; blueprints are copies in HA that nothing updates. So each blueprint ends its
description with the release it belongs to (`Weekheat 0.12.0`), and the card has `BLUEPRINT_VERSION`,
the release whose blueprints it needs (it changes only when a release changes them; a test checks all
three match). An admin's card compares them (`blueprint/list`) and, when older or unmarked, offers *Update
now*: `blueprint/import` of the file at the card's tag (`…/blob/v0.12.0/…`, not `main`), `blueprint/save`
over the installed copy (source URL `main`, so HA's own re-import still works), then reloading
automations and scripts. A banner rather than silent: it changes how the rooms behave. The valve
exercise blueprint is also offered when it is missing (it came after 0.13.0; saved as
`ekienmeier/weekheat_exercise.yaml`), and when `script.weekheat_exercise` is missing (the banner then
says only that); *Update now* then creates that script (`config/script/config/weekheat_exercise`,
`use_blueprint` with no inputs). A missing room or day blueprint is not the card's to install.

### Home Assistant down

No fallback: while HA is down, the thermostats keep their last setpoint. When HA starts, the current
period is applied at once if the wanted value changed in the meantime, and a **persistent
notification** says so ("Bedroom: 06:00 period (21 °C) applied late at 06:42, Home Assistant was not
running"). The card shows the same as a banner until it is dismissed.

Tested 2026-11-13: HA restarted across a period boundary (down 10:24:45–10:25:50, the thermostat entity
back at 10:26:06); the start run set the new period at 10:26:22 and raised the notification. Limit: a
thermostat that is still unavailable when the start run happens is written later by the "back"
trigger, without a notification.

### Valve exercise

Replaces the weekly "radiator maintenance" automation of the Aqara app. Each room automation has three
inputs, the same in all rooms (the card writes them to all): `exercise_day` (`off` or `mon`…`sun`),
`exercise_time` (default 13:00), `exercise_wait` (default 60 s). At that time, or on the event
`weekheat_exercise` (optional `entity_id`: one room automation or a list; the card's *Run now* fires it
without), the room's available thermostats are set to 30 °C, then after the wait to 5 °C, after the wait
again, twice; then each gets back its setpoint from before (and its hvac mode). It runs at the start of
the automation run, so the normal run that follows writes a new period's temperature if one began in
between. The automation is queued, so window, plan and switch events wait for it. While it runs, the
state helper carries `_ex` and the card shows the room as *Valve exercise*. One wait for all models: the
W600 moves slowly and quietly, 60 s is a guess, hence configurable. Paused rooms are not exercised.

**A script of its own** (review M17, after 0.13.0). The exercise itself is the script blueprint
`weekheat_exercise` (one script for the home, `script.weekheat_exercise`, no inputs; mode `parallel`,
since every room calls it at the same time). Its fields are `thermostats`, `wait` and `settle_time`; it
leaves out unavailable thermostats, moves the valves, gives back setpoints and modes, and returns once
they report their setpoints again (or after the settle time). The room automation keeps the triggers,
the `_ex` marker and the state: it marks the room, calls the script (its input `exercise_script`) and
waits for it, then writes the state from before. If the script does not exist (`has_value`: a missing
script cannot be called, and `continue_on_error` does not cover that), the room skips the exercise,
raises the notification `weekheat_<room>_exercise` (the card shows it as a banner), and runs on as
usual; the next exercise that runs dismisses it. The card's *Update now* imports the blueprint when it
is missing and creates the script when there is none.

Valve calibration (the thermostat learning its end positions) is not reachable from HA: over HomeKit
the Aqara thermostats expose only setpoint, mode, temperature, battery and identify. It stays in the
Aqara app.

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
- **Plan tab**: one plan at a time (a chip per plan): a day chart (a bar per period, as high as its
  temperature) and the period list. Administrators tap a period to edit its start, temperature or Off,
  add or remove periods, and add (empty, a starter plan, or a copy), rename and delete plans.
- **Week tab**: Mon–Sun with a plan picker each (Sat/Sun marked "only if made a working day"), and
  the free-day plan.
- **Days**: the next 14 days from the day script: date, working/free, reason, the plan each room will
  use; today and tomorrow highlighted. Tap a day to set an exception. Shared by all rooms.
- **Several thermostats in a room** (e.g. a dining and a couch zone): each can be set on its own, as a
  manual change that holds until the next period, like any other; the plan stays one per room (zones
  that need their own plans are separate rooms). Dial layout: a selector *All · <thermostat> …* above
  the one dial; *All* sets every thermostat to the same value and shows "18 / 22 °C" while they differ
  (− / + start from their average). Compact layout: one slider per thermostat, plus an *All together*
  row whose − / + shifts each by the same amount. The status line shows each value when they differ
  ("Manual · 18 / 22 °C until 24:00"). *Back to plan* (shown while the room is manual) writes the
  current period's temperature to all of them.
- **Setup tab** of an opened room (admins only): the name, then one collapsible section each for the
  thermostats, the windows and doors (with the delay) and the room sensor (with the margin), each showing
  a summary while closed; pause and save. Entities are added with a search (name, entity id, area; the
  room's area, taken from its first thermostat, first) and shown as chips, instead of a checkbox per
  entity in the home.
- **Settings** (home): the rooms as a list (a tap opens the room's Setup tab), add room, then the day
  settings in three sections: the Workday sensor with the exceptions and holiday calendars, the keyword
  calendars (picked from the calendar entities), the keyword rules (keyword plus "free day" or a plan
  name, reorderable). Saved as the day script's inputs. Plan names offered are those used in any room.
- **Setup**: "Add room" asks for a name and thermostats (found with the same search as a room's
  Setup tab), then creates the starter plans, the state helper, the heating switch and the automation,
  paused. If a step fails, what was made is deleted again.
- **Language**: German and English, by the HA user's language. Numbers and times follow the user's
  Home Assistant profile (`hass.locale`: number format and time format), mapped to locales as Home
  Assistant's own frontend does (`src/domain/formatting.js`); a 12-hour clock writes "6:30 AM".
  Time inputs keep the browser's format, and dates still follow the card's language.
- **Banners**: HA was down (above), a state helper too short (see *State helper*), the day script
  missing, blueprints older than the card or the valve exercise script missing (with *Update now*), a
  valve exercise skipped, and why the card could not load.

**Admin rights:** creating and editing helpers, scripts and automations is admin-only in HA. So
editing plans, the week, settings and rooms needs an admin user. Other users see everything, set
thermostats, switch a room's heating, and set exceptions (calendar events need no admin).

**Room directory:** reading an automation's configuration (`config/automation/config/<id>`) is
admin-only, so a non-admin's card can't find out which thermostats, plans and helpers make up a room.
An admin's card therefore publishes the rooms to HA's frontend system data under the key `weekheat`
(`frontend/set_system_data`: only admins write, every user reads and can subscribe):

```json
{ "v": 1, "script": true, "exceptions": "calendar.…",
  "rooms": [{ "entity", "id", "name", "thermostats", "plans", "week", "free_day", "state",
              "windows", "window_delay", "heating_switch", "room_sensor", "room_margin" }] }
```

It is rewritten (only when it differs) each time an admin's card loads, and after the card saves a
room or the day settings. A change made in HA's automation editor reaches other users the next time
an admin opens the card. Non-admin cards subscribe to the key and reload when it changes. Everything
else non-admins need is readable anyway: states, `schedule/list` (the plans),
`config/entity_registry/list`, calendar events, and calling the day script for the day list.

### Code

The card is written in modules under `src/`, in layers that each use only the ones below
([coding-guidelines.md](coding-guidelines.md), 1.4): `domain/` (pure logic: periods, plans, days, a
room's status), `ha/` (the only code that calls Home Assistant), `state/` (the store, the drafts, the
loader and the actions), `ui/` (the views, with [Lit](https://lit.dev), and the styles) and `card.js`
(the element). esbuild bundles them into `dist/weekheat-card.js`, the one file HACS installs.

## Prerequisites in HA

- HA 2025.7 or later: the blueprints' object selectors with `fields` (the week, the keyword rules)
  need it; on 2025.4 neither the room automation nor the day script loads (found by the blueprint
  tests, 2026-11-19). Also needed: schedule block data (2025.3), script responses.
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
- **Blueprint tests** (review M18, `tests/blueprints/`, in CI only): pytest with
  `pytest-homeassistant-custom-component` runs the three blueprints, unchanged, in a Home Assistant
  core, on the oldest release they load in (2025.7) and a recent one (2026.10). Real schedule
  helpers are the plans and a real `input_text` the state helper; the thermostats are states whose
  setpoint follows `climate.set_temperature`, and `calendar.get_events` and `workday.check_date`
  answer from the test's events and holidays; time is driven with freezegun, timer by timer. The
  room *Bad* has two thermostats and the starter plans. Covered: a period boundary; a manual change
  that holds over ticks and plan updates; equal adjacent periods; Off across midnight keeping a
  manual value, and the next day's plan at midnight; a thermostat unavailable at a boundary, written
  when back; the day script's answers (working day, public holiday, keyword event, exceptions with
  and without a plan name, a keyword rule naming a plan); a failing day script (one that raises an
  error and one that answers nothing; Monday and Saturday); a window (the delay, a short opening,
  setpoints by hand restored, a new period while open); the room sensor closing and releasing after
  the hold time; the heating switch (off holds 5 °C and ignores windows); the fingerprint `_th`
  (thermostats moved, replaced or removed while held return to the plan; a state without `_th`
  still restores); the valve exercise through `script.weekheat_exercise` (moves, setpoints and modes
  given back, the `_ex` marker, *Run now* for other rooms only) and the notification when the
  script is missing. The plan-name rule is checked against the card with shared cases
  (`tests/fixtures/plan-names.json`, review M16). Not covered: an HA restart across a boundary (the
  `homeassistant` start trigger does not fire in a core that is already running), the late
  notification, and the size guard of the state helper.
- Known gap, shown by an expected failure (`xfail`): a day script that does not exist stops the room's
  run (`ServiceNotFound` is not covered by `continue_on_error`), so windows and the heating switch do
  not work either; the valve exercise guards against the same with `has_value`.

## Decisions (2026-11-13)

- Exceptions in a Local Calendar; Holiday integration for names (both set up).
- Keyword calendars and keyword rules configurable on the card, stored in the day script. A rule
  makes a day free or names a plan (e.g. `Homeoffice`).
- Named plans per room plus a week; free days use the free-day plan; exceptions can name a plan.
- Starter plans as above.
- Editing plans, the week, settings and rooms is admin-only (accepted). Using the card (thermostats,
  heating switch, exceptions) works for every user (2026-11-14).

## Open questions

None at the moment.
