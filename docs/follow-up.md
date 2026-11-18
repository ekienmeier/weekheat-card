# Follow-up after 0.13.0

Written 2026-11-18, at the end of the session that wrote the coding guidelines, reviewed the code,
released 0.12.1 (fixes H1–H4) and 0.13.0 (the refactoring). This file is the plan for the points that
are still open, and what a new session needs to know to continue. Read it together with:

- [coding-guidelines.md](coding-guidelines.md): the rules for all code (CLAUDE.md has the summary).
- [review-2026-11-18.md](review-2026-11-18.md): the findings; its *Status* section says which are fixed.
- [design.md](design.md): how Weekheat works and why (run modes, state helper, fallbacks, code layout).

When a point here is done, update its line in the review's status table and remove it here.

## Where things stand

- `main` is release **v0.13.0** (on GitHub and in HACS). CI passes on it: format, lint, types, 80
  tests, the build check, yamllint, ruff and HACS's validation. The branch `refactor` is merged and
  can be deleted.
- The owner updates their Home Assistant themselves. On 2026-11-18 it still ran the 0.12 card and
  the 0.12.0 blueprints. Before any check against it, see what it runs: the card logs its version in
  the browser console ("WEEKHEAT 0.13.0"); `python3 tools/ha.py ws '{"type": "blueprint/list",
  "domain": "automation"}'` shows the blueprints' descriptions, which end with their release.

## How to work on this project

**Checks.** `npm run check` (Prettier, ESLint with the size and comment rules, `tsc --checkJs`, the
tests) and `npm run build` (the committed `dist/weekheat-card.js` must be the build; CI checks it).
yamllint and ruff run only in CI: they cannot be installed here (no pip; downloading pip's installer
was refused). For Python formatting, CI prints `ruff format --diff`; apply that diff by hand. Note
that GitHub masks the `Bearer …` header in `tools/ha.py` as `***` in the log: keep the code's line.

**Writing code that passes.** Prettier does not format Lit templates (`embeddedLanguageFormatting:
"off"`), so lay them out by hand within 100 columns. Prettier does wrap code lines over 100
characters, and the wrapped lines can push a function over 15 lines: write short lines from the
start, name intermediate values, use typedefs instead of long inline JSDoc types (a `@param` name
must be on the same line as its type, or the JSDoc rules fail).

**The live Home Assistant.** URL and token are in `~/.config/weekheat/` (`url`, `token`). It is the
owner's real heating: **read only, unless the owner says otherwise.** Never write to thermostats,
helpers, automations or blueprints without asking.

- `tools/ha.py`: REST and WebSocket. Its `ws` waits for a `result` message, so commands answered
  otherwise (e.g. `ping`) never return; use `get_config` to test.
- `tools/shoot.mjs`: screenshots of the test dashboard `/weekheat-test/w`, **read-only unless
  `WRITE=1`** (write commands are refused and listed in `OUT/refused.json`). `CARD=<file>` serves a
  card file in place of the installed one; `fake:<entity>=<setpoint>` shows a setpoint without
  writing it. Environment: `HA_URL=$(cat ~/.config/weekheat/url) HA_TOKEN=$(cat ~/.config/weekheat/token)`.
- `tools/compare_shots.mjs`: compares two screenshot folders (pixel counts and red diff pictures).
  To check a card change: `git show v0.13.0:dist/weekheat-card.js > old.js`, take the same steps
  with `CARD=old.js` and with `CARD=dist/weekheat-card.js` (one after the other: the "now" line of
  the chart moves with time), then compare. Selectors of the card: `.room-head`, `.tabs button`,
  `.day-chip`, `.icon-button` (settings), `.foot .link` (layout), `.period-row`, `.settings-head`.
- `tools/check_blueprints.py`: `validate` (HA's `validate_config` with the real inputs), `day` and
  `room` (a git ref against the working copy: same days, same values, same writes?). It emulates
  runs read-only. Use it for every blueprint change; for an intended change, its output shows
  exactly where the versions differ (against `v0.12.0` it finds the old timestamps, as a check).

**GitHub.** There is no `gh` CLI. The token is in `~/.config/weekheat/github_token`; use the REST
API (curl or Python): workflow runs `GET /repos/ekienmeier/weekheat-card/actions/runs?head_sha=…`,
their jobs and logs, releases `POST /repos/ekienmeier/weekheat-card/releases` with `tag_name` and
`name` both `vX.Y.Z`.

**Releasing.** As the README's *Versioning* says: `VERSION` in `src/version.js`; when a blueprint
changes also `BLUEPRINT_VERSION` and the mark at the end of both blueprints' descriptions (a test
checks they match); `npm run build`; the README's status line (minor version only); a commit
`… (x.y.z)`; tag; push; wait for CI on `main`; the GitHub release named like the tag, with short
notes that say whether the blueprints must be updated (the card's *Update now*).

**Lessons from this session.** In the shadow DOM, base rules must not outrank component rules:
use `:where(…)` for them. `continue_on_error` covers only Home Assistant errors, not template or
configuration errors. The `has_value` filter works in templates. `ha.rest` returns parsed JSON, so
a template answer like `255` comes back as a number.

## Open points, in a sensible order

Each says what is wrong, where, a way to fix it, how to check it, and what it means for the version.

### 6. L8: saved setpoints are stored by position

- **Problem.** While a window is open or the room sensor holds the valves closed, the state helper's
  `_open` holds the setpoints to give back, as a list in thermostat order (a list to stay within 255
  characters, see design.md *State helper*). If the room's thermostats are changed (added, removed,
  reordered) while it is held, the values go back to the wrong thermostats.
- **Options** (a decision for the owner; it changes the state format, which README's *Versioning*
  ties to 1.0):
  1. The blueprint also stores a short fingerprint of the thermostat list (e.g. the count and the
     total length of their entity ids), and ignores `_open` when it no longer matches: the room then
     returns to its plan. Cheap; catches nearly every change.
  2. The card, when it saves new thermostats for a held room, rewrites `_open` in the new order. The
     card would write the automation's state, which crosses the layers' responsibilities and can race
     with a run.
  3. `_open` as a map by entity id: exact, but costs an entity id per thermostat (see H1, `stateSize`).
- **Note.** "Forget `_open` and let the next run decide" is not safe on its own: with the window still
  open, the open branch would save the thermostats' current 5 °C as the values to give back.
- **Check.** New scenarios in `tools/check_blueprints.py room` (thermostats changed while held);
  `stateSize` and its tests if the format grows; design.md's *State helper* and *Run modes*.
- **Version.** Minor, with a blueprint change (admins get *Update now*).

### 7. M18: automated tests of the blueprints

- **Problem.** The blueprints' logic is checked only by hand: `tools/check_blueprints.py` against the
  live Home Assistant, and the live tests listed in design.md. Nothing runs in CI.
- **Approach.** Python tests with `pytest-homeassistant-custom-component` (it pins a Home Assistant
  version and gives a `hass` fixture): copy both blueprints into the test config, create the day
  script and a room automation from them, register thermostat states with `hass.states.async_set`,
  mock `climate.set_temperature`, `calendar.get_events` and `workday.check_date` with
  `async_mock_service` (with responses), and drive time with `async_fire_time_changed`. Start with the
  cases in design.md's *Testing*: a period boundary, a manual change that holds, equal adjacent
  periods, midnight, a window opening and closing, the room sensor closing and releasing, the heating
  switch, a failing day script. A CI job with a pinned Python and that package.
- **Also (M16's rest).** The plan-name rule exists in the card (`matchPlan`) and in the room blueprint
  (`plan_hits`, `named_plan`). Put shared cases into a JSON fixture (e.g. `tests/fixtures/plan-names.json`)
  that the Node tests and the Python tests (rendering the blueprint's templates with HA's `Template`)
  both check.
- **Version.** None (tests only).

### 8. M17: the room blueprint is still one long run

- **Problem.** About 420 lines of actions in one automation run; each template is short now, but the
  file is long (one file per blueprint, guidelines 1.3).
- **Option** (a decision for the owner): move the valve exercise into a script blueprint of its own,
  called by the room automation. Smaller room blueprint, but a third blueprint to install; the card's
  update banner (`src/ha/blueprints.js`, `blueprintStatus`) would have to know it.
- **Version.** Minor, with blueprint changes.

### 9. Not planned: the default HACS store

The owner decided on 2026-11-18 not to publish Weekheat in the default HACS store: it would not make
their own updates easier (a custom repository gets the same update entity), and blueprints are not
distributed by HACS either way. CI's HACS check keeps skipping description, topics and images
(`.github/workflows/check.yaml`).
