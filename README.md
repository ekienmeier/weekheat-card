# Weekheat

Heating plans for Home Assistant, for heat-only thermostats such as radiator valves (TRVs) with a
single setpoint.

- Each room has any number of named **day plans** (e.g. Working day, Home office, Free day), each a
  list of periods with a temperature or Off.
- A **week** picks the plan for each working weekday; every **free day** uses the room's free-day plan.
- Whether a day is a working day or a free day is decided for the whole home: weekend days and public
  holidays (Workday integration), calendar events with a keyword (e.g. `schulfrei` → free day,
  `Homeoffice` → the Home office plan), and exceptions set on the card.
- Thermostats are written only when the scheduled temperature changes, so a change made by hand holds
  until the next period with a different temperature. There is no manual mode to leave.
- The card lists the rooms with their status and temperature. An opened room has three views: **Control**
  (the dial and the heating switch), **Plan** (one plan at a time: a day chart and its periods) and
  **Week**, and for administrators **Setup** (thermostats, windows and doors, room sensor). The day list
  sits behind the day chip at the top, the home-wide settings (rooms, calendars, keyword rules, valve
  exercise) behind the gear.
- An opened room shows its setpoint on a **dial** (drag the handle, use − / + or the arrow keys) or
  on a horizontal **slider** (drag or tap the bar, arrow keys), with the room temperature marked on both.
  A room with several thermostats can set each one on its own (a selector above the dial, or one slider
  each), until the next period; *Back to plan* ends a manual change at once.
- **Windows and doors**: while a room's window or door sensor is open (for a delay, 30 s by default), its
  thermostats are set to 5 °C; when all are closed, the setpoints from before come back.
- **Room sensor** (optional, a workaround): while the room is a margin (0.5 °C by default) above the
  setpoint, its thermostats are held at 5 °C; once it has cooled down to the setpoint, they get it back.
  Only for thermostats that ignore a linked sensor or overshoot, see [Room sensor](#room-sensor-a-workaround).
- **Valve exercise**: once a week (day, time and wait set on the card), all thermostats go to 30 °C and
  5 °C, twice, then back to what they had before. Other events wait until it is done.
- Everything runs inside Home Assistant (a script, one automation per room, schedule helpers). The
  card edits and shows; nothing depends on a dashboard being open.

Based on the idea and structure of [Temperate](https://github.com/xman2000/temperate-card) by Stephen
(MIT), which does this for heat/cool thermostats with one day plan. Design: [docs/design.md](docs/design.md).

Status: early (0.12). Tested with Aqara E1/W600 thermostats through HomeKit Controller on HA 2026.11.

## Parts

| Part | What it is |
|---|---|
| `blueprints/script/weekheat_day.yaml` | Script blueprint: working day / free day for a range of dates, and why |
| `blueprints/automation/weekheat_room.yaml` | Automation blueprint: one room (its thermostats, plans and week) |
| `weekheat-card.js` | Dashboard card `custom:weekheat-card` |

## Requirements

- Home Assistant 2025.4 or later (tested on 2026.11).
- The [Workday](https://www.home-assistant.io/integrations/workday/) integration (weekend days, public holidays).
- A [Local Calendar](https://www.home-assistant.io/integrations/local_calendar/) for the exceptions.
- Optional: the [Holiday](https://www.home-assistant.io/integrations/holiday/) integration (holiday
  names) and calendars with keyword events (e.g. CalDAV).
- Only Home Assistant sets the temperature: see [Before you start](#before-you-start).
- Editing plans, the week, settings and rooms on the card needs an administrator user. Other users can
  set temperatures, switch a room's heating on and off and set day exceptions; their card shows the
  rooms once an administrator has opened the card (it publishes the rooms for them).

## Before you start

Weekheat expects to be the only one that sets the thermostats' temperature. Anything else that does
works against the plan, and Weekheat cannot tell it from a change made by hand.

- **Switch off the thermostats' own schedules** (in the vendor app), otherwise they overwrite the plan at
  their own times (seen with the Aqara W600: 15 °C at 20:30 over a plan's 24 °C).
- **Switch off the vendor's window detection and "radiator maintenance"** if you use Weekheat's windows
  and valve exercise: two of each get in each other's way.
- **No other automations** that set the same thermostats' temperature (in Home Assistant or the vendor's
  app); an automation that only reads them is fine.
- **Switch on the child lock** on the thermostats, so a knob turned by accident doesn't change the
  setpoint. Changes are made in Home Assistant: the card, the app, voice.

## Installation

1. **Card**: in the Home Assistant Marketplace (HACS on older versions), add this repository as a
   custom repository of type **Dashboard**, then download **Weekheat**.
2. **Blueprints**: import both under *Settings → Automations & scenes → Blueprints → Import*:
   ```
   https://github.com/ekienmeier/weekheat-card/blob/main/blueprints/script/weekheat_day.yaml
   https://github.com/ekienmeier/weekheat-card/blob/main/blueprints/automation/weekheat_room.yaml
   ```
3. **Day script**: create a script from *Weekheat day* with the id `weekheat_day` (so it becomes
   `script.weekheat_day`). Pick the Workday sensor and the exceptions calendar; calendars and keyword
   rules can be set later on the card.
4. **Card**: add it to a dashboard:
   ```yaml
   type: custom:weekheat-card
   title: Heizung
   ```
5. **Rooms**: on the card, *Add room*: a name and the thermostats. This creates two starter plans
   (working day, free day), a state helper and the room automation, **paused**. Adjust the plans,
   then activate the room on the card.

### Updating

- **Card**: update it in the Home Assistant Marketplace (HACS), then reload the browser.
- **Blueprints**: HACS does not update them. When a release changes them, an administrator's card shows
  *"The Weekheat blueprints are older than the card"* with **Update now**: one tap saves the blueprints
  of exactly that card release and reloads the automations; nothing else to do. The release notes say
  when a release changes the blueprints.
- Without the card (or before 0.12): *Settings → Automations & scenes → Blueprints*, the ⋮ menu of
  *Weekheat room* and *Weekheat day*, **Re-import blueprint**. Your room automations keep their settings.

## Room sensor: a workaround

Most thermostats regulate on their own sensor, or on a linked room sensor, and need nothing more. Some
don't: the **Aqara W600** shows a linked sensor's temperature but controls its valve on its internal
sensor, which sits low at the radiator, so the room can end up several degrees above the setpoint (an
open firmware bug, see the [Aqara forum](https://forum.aqara.com/t/w600-external-sensor-does-not-control-valve-firmware-issue/341137)).
For such thermostats, a room can get a sensor (in its *Setup* tab, off by default):

- While the room is the **margin** above the setpoint (0.5 °C by default), Weekheat sets its thermostats
  to **5 °C**, so the valves close; once the room is back down to the setpoint, they get the setpoint again.
  The card keeps showing the setpoint, with *Warm enough · valve closed*.
- **On the thermostat** and in the vendor's app you see 5 °C while the valves are closed.
- **More writes** to the thermostats: switches are at least 10 minutes apart (the hold time), but a small
  margin means more of them, and the batteries last a little less.
- **A new period or a change on the card** takes effect at once. A setpoint of **10 °C or more** set on
  the thermostat itself while closed is taken over too; a lower one (a nudge from the 5 °C shown) is
  undone. Better: switch on the child lock, see [Before you start](#before-you-start).
- If the sensor is unavailable, the room runs on the plan alone.

Don't use it for thermostats that control well: it only adds writes. With several thermostats in one
room, it closes all of them once the room is above the highest setpoint plus the margin.

## Card options

| Option | Default | |
|---|---|---|
| `title` | | Card title |
| `rooms` | all | Room automations to show, in this order (entity ids or automation ids) |
| `days` | 14 | Days in the day list |
| `day_script` | `script.weekheat_day` | The day script |
| `layout` | `dial` | `dial` or `compact` (a slider): how an opened room shows its setpoint. Each browser remembers the last layout picked on the card. |
| `dial_min`, `dial_max` | 5, 30 | Scale of the dial in °C |

## Exceptions

Set on the card's *Days* tab, stored as all-day events in the exceptions calendar, titled `Werktag` /
`Working day`, `Freier Tag` / `Free day` or `Plan: <name>`, optionally followed by ` – <note>`. They can
also be added in Home Assistant's calendar view.

## Development

- `tests/`: logic tests, `node --test tests/*.test.mjs` (Node 22).
- `tools/ha.py`: a small REST/WebSocket client (URL and token from `~/.config/weekheat/`).
- `tools/deploy_blueprint.py`: save a blueprint from this repo to Home Assistant.
- `tools/shoot.mjs`: screenshots of a dashboard with Playwright (card or whole page, dialogs included), with
  the working copy of the card in place of the installed one. `nowrite` drops every service call the card
  makes and `fake:<entity>=<setpoint>` shows a setpoint without writing it, for checks against a live HA.

## Versioning

[Semantic Versioning](https://semver.org), still below 1.0:

- **Minor** (0.x.0): a new feature or a visible change in behaviour or on the card.
- **Patch** (0.x.y): a fix, or something taken back, without a new feature.
- **Major**: 1.0.0 once the room automation's inputs and the state helper's format are stable, so an
  update needs no manual steps. Below 1.0 a minor version may still break things; its release notes say
  what to do.
- Changes to docs, tests or `tools/` alone get no new version.
- The blueprints have no version of their own: they are released with the card. The release notes say
  when a blueprint must be re-imported.

A release is: `VERSION` in `weekheat-card.js` and the status line above, a commit titled
`… (x.y.z)`, a tag `vx.y.z` and a GitHub release with short notes (HACS offers it as the update). The
release's name is the tag itself (`vx.y.z`): HACS shows both as the heading of its update notes when they differ.

## License

MIT
