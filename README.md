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
- An opened room shows its setpoint on a **dial** (drag the handle, use − / + or the arrow keys) or in a
  compact row.
- **Windows and doors**: while a room's window or door sensor is open (for a delay, 30 s by default), its
  thermostats are set to 5 °C; when all are closed, the setpoints from before come back.
- Everything runs inside Home Assistant (a script, one automation per room, schedule helpers). The
  card edits and shows; nothing depends on a dashboard being open.

Based on the idea and structure of [Temperate](https://github.com/xman2000/temperate-card) by Stephen
(MIT), which does this for heat/cool thermostats with one day plan. Design: [docs/design.md](docs/design.md).

Status: early (0.1). Tested with Aqara E1/W600 thermostats through HomeKit Controller on HA 2026.11.

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
- **Switch off the thermostats' own schedules**, otherwise they overwrite the plan at their own times.
- Editing on the card (plans, week, settings, rooms) needs an administrator user. For now the card as
  a whole needs an administrator, because it reads the room automations' configuration.

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

## Card options

| Option | Default | |
|---|---|---|
| `title` | | Card title |
| `rooms` | all | Room automations to show, in this order (entity ids or automation ids) |
| `days` | 14 | Days in the day list |
| `day_script` | `script.weekheat_day` | The day script |
| `layout` | `dial` | `dial` or `compact`: how an opened room shows its setpoint. Each browser remembers the last layout picked on the card. |
| `dial_min`, `dial_max` | 5, 30 | Scale of the dial in °C |

## Exceptions

Set on the card's *Days* tab, stored as all-day events in the exceptions calendar, titled `Werktag` /
`Working day`, `Freier Tag` / `Free day` or `Plan: <name>`, optionally followed by ` – <note>`. They can
also be added in Home Assistant's calendar view.

## Development

- `tests/`: logic tests, `node --test tests/*.test.mjs` (Node 22).
- `tools/ha.py`: a small REST/WebSocket client (URL and token from `~/.config/weekheat/`).
- `tools/deploy_blueprint.py`: save a blueprint from this repo to Home Assistant.
- `tools/shoot.mjs`: screenshots of a dashboard with Playwright, with the working copy of the card in place of
  the installed one.

## License

MIT
