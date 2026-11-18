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

### 1. L9: plans are read from Monday only

- **Problem.** The card shows a plan's Monday blocks (`planOf` in `src/ha/plans.js` reads
  `item.monday`); the room automation follows the schedule's state, i.e. today's blocks. A plan
  edited per weekday in Home Assistant's schedule editor shows one thing on the card and does another.
- **Approach.** In `loadPlans`, compare the seven days' blocks; keep a flag `perDay` (and perhaps the
  periods of each day). The Plan view shows a note when set ("In Home Assistant this plan differs by
  weekday; the card shows Monday, and saving it here makes every day like it"), texts in both
  languages. Optionally `statusOf` uses today's blocks for the period now.
- **Check.** Tests in `tests/ha/plans-blueprints.test.mjs` (a schedule item with differing days);
  screenshots unchanged for normal plans.
- **Version.** Minor (a visible note). No blueprint change.

### 2. L16: native confirm() dialogs

- **Problem.** Deleting a plan (`src/ui/views/plan.js`, `planActions`) and running the valve exercise
  now (`src/ui/views/settings.js`, `exercisePanel`) use the browser's `confirm()`, which ignores the
  Home Assistant theme and blocks the page.
- **Approach.** A two-step button: the first press sets `ui.confirming` (e.g. `delete:<plan>`,
  `exercise`) and the button reads "Really delete?" / "Wirklich löschen?"; the second press acts; any
  other action or a timeout clears it. Add `confirming` to `UiState` (`src/state/store.js`), an action
  module or functions in `navigation.js`, texts in both languages.
- **Check.** A state test (first press asks, second acts, navigation clears); screenshots of both steps.
- **Version.** Minor.

### 3. L5: Home Assistant's number and time format

- **Problem.** Numbers use `de-AT` or `en-GB` by the language (`numberLocale` in
  `src/domain/format.js`); times are always 24-hour (`fromMin` in `src/domain/time.js`, used in
  `src/ui/status.js`, `src/ui/views/control.js`, `plan-periods.js`, `chart.js`). The user's Home
  Assistant settings are ignored.
- **Approach.** Read `hass.locale` (`language`, `number_format`: language, system, comma_decimal,
  decimal_comma, space_comma, none; `time_format`: language, system, 12, 24). Map them as Home
  Assistant's own frontend does (comma_decimal → en-US, decimal_comma → de, space_comma → fr, system
  → the browser's, language → the language). One `formatting(hass)` gives the number locale and
  12/24 hours; `formatNumber`, `formatTemp` and a new `formatTime(minutes, …)` use it. Time inputs
  keep the browser's format.
- **Check.** Domain tests for each setting; screenshots unchanged with the owner's settings.
- **Version.** Minor.

### 4. L7: slugify differs from Home Assistant's for some letters

- **Problem.** `slugify` in `src/domain/plans.js` removes accents and turns ß into ss, but Home
  Assistant (python-slugify with unidecode) also transliterates letters such as ø, æ, œ, ł, đ, þ, ð.
  The card's plan-name matching (`matchPlan`) and the blueprint's (`plan_hits`, HA's `slugify` filter)
  can then disagree, and plan entity ids made by `createPlan` differ from what HA would make.
- **Approach.** Render `{{ name | slugify }}` on Home Assistant (read-only) for a list of names with
  such letters; put the pairs into a test table; add a small transliteration map before the NFKD step.
- **Check.** The table test; the existing plan-matching tests.
- **Version.** Patch.

### 5. L12: a room's status is computed several times per render

- **Problem.** `statusOf` (`src/state/selectors.js`) runs `roomStatus` on every call; one render of an
  opened room with two thermostats calls it, `thermostatStatus` and `friendlyNames` many times.
- **Approach.** Measure first (in the browser through `shoot.mjs` with `page.evaluate` and
  `performance.now()`, or in Node with fake states). Only if it is noticeable: memoise per render, e.g.
  a cache keyed by the `hass` object (a `WeakMap`) and a version number that `Store.update` increments.
- **Check.** Tests unchanged; the measurement before and after.
- **Version.** None or patch.

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

### 9. Optional: what the default HACS store would need

The repository's description and topics (GitHub settings) and images in the README. Only if the owner
wants Weekheat in the default HACS store; CI's HACS check skips these now (`.github/workflows/check.yaml`).
