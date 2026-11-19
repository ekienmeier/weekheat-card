# Follow-up after 0.14.0

Written 2026-11-18, at the end of the session that wrote the coding guidelines, reviewed the code,
released 0.12.1 (fixes H1–H4) and 0.13.0 (the refactoring); updated 2026-11-19 after 0.14.0, which
closed the remaining points (L5, L7, L8, L9, L12, L16, M16, M17, M18). This file is the plan for the
points that are still open, and what a new session needs to know to continue. Read it together with:

- [coding-guidelines.md](coding-guidelines.md): the rules for all code (CLAUDE.md has the summary).
- [review-2026-11-18.md](review-2026-11-18.md): the findings; its *Status* section says which are fixed.
- [design.md](design.md): how Weekheat works and why (run modes, state helper, fallbacks, code layout).

When a point here is done, update its line in the review's status table and remove it here.

## Where things stand

- `main` is release **v0.15.0** (on GitHub; installed through HACS as a custom repository). CI runs
  format, lint, types, the Node tests, the build check, yamllint, ruff, HACS's validation and the
  blueprint tests (`tests/blueprints/`) in a Home Assistant core (2025.7 and 2026.10).
- 0.14.0 changed the blueprints: the room blueprint stores a fingerprint of its thermostats with saved
  setpoints (`_th`), calls the new script blueprint `blueprints/script/weekheat_exercise.yaml` for
  the valve exercise, calls the day script only when it exists, and all three need HA 2025.7
  (`min_version`). *Update now* on the card imports the exercise blueprint and creates
  `script.weekheat_exercise`.
- The owner updates their Home Assistant themselves. Before any check against it, see what it runs:
  the card logs its version in the browser console ("WEEKHEAT 0.14.0"); `python3 tools/ha.py ws
  '{"type": "blueprint/list", "domain": "automation"}'` shows the blueprints' descriptions, which end
  with their release.

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
  To check a card change: `git show v0.14.0:dist/weekheat-card.js > old.js`, take the same steps
  with `CARD=old.js` and with `CARD=dist/weekheat-card.js` (one after the other: the "now" line of
  the chart moves with time), then compare. Selectors of the card: `.room-head`, `.tabs button`,
  `.day-chip`, `.icon-button` (settings), `.foot .link` (layout), `.period-row`, `.settings-head`.
- `tools/check_blueprints.py`: `validate` (HA's `validate_config` with the real inputs), `day` and
  `room` (a git ref against the working copy: same days, same values, same writes?). It emulates
  runs read-only. Use it for every blueprint change; for an intended change, its output shows
  exactly where the versions differ (against `v0.12.0` it finds the old timestamps, as a check).
  `room` also runs the valve exercise (the exercise script's calls are emulated with its blueprint)
  and thermostats changed while held; `--ignore-key _th` leaves the fingerprint out when comparing
  with a release before it (against `v0.13.0`, only the *changed* and *no script* scenarios differ).

**Blueprint tests** (`tests/blueprints/`, review M18). pytest with
`pytest-homeassistant-custom-component` (pinned in `requirements-<HA>.txt`, one per Home Assistant
release: 2025.7 is the oldest the blueprints load in, 2026.10 a recent one) runs the blueprints in a
Home Assistant core. They run only in CI (job *blueprints*, one per release); Python packages cannot
be installed here. `home.py` is the test home: `Room(...)` describes a room automation (its inputs;
`extra` for windows, sensor, switch, exercise), `home.start(room)` sets up plans, state helper,
scripts and the automation, `home.at("07:00:01", days=…)` lets time pass timer by timer (one jump
would fire every timer at the end, so a tick could run the room before a schedule changed its
period), `home.run()` triggers the room as the card does, `home.thermostat(...)` changes a setpoint
by hand, `home.taken()` returns the writes since the last call, `home.stored()` the state helper.
To debug a failure, read the job's log (the workflow runs `pytest -v`): for a failed test it shows
the captured output, every state change and write with its time (`home.py` prints them), and the
captured log, with the automation's own errors (e.g. a blueprint that does not validate). Get the
log with `GET /repos/…/actions/jobs/<id>/logs` and `curl -L` (it redirects to storage that must
not get the token). To try a new case quickly, push
the branch and run only it with a temporary `-k` in the workflow (do not commit that). When a
release of the package moves to a new Home Assistant, raise the pin of the recent row; keep the
oldest row at the oldest release the blueprints support. `tests/fixtures/plan-names.json` holds
the plan-name cases that the Node tests (`tests/domain/plan-names.test.mjs`) and the Python tests
(`test_plan_names.py`, which renders the blueprint's templates) both check; add a case there, not
in one of them.

**GitHub.** There is no `gh` CLI. The token is in `~/.config/weekheat/github_token`; use the REST
API (curl or Python): workflow runs `GET /repos/ekienmeier/weekheat-card/actions/runs?head_sha=…`,
their jobs and logs, releases `POST /repos/ekienmeier/weekheat-card/releases` with `tag_name` and
`name` both `vX.Y.Z`.

**Releasing.** As the README's *Versioning* says: `VERSION` in `src/version.js`; when a blueprint
changes also `BLUEPRINT_VERSION` and the mark at the end of all three blueprints' descriptions (a
test checks they match); `npm run build`; the README's status line (minor version only); a commit
`… (x.y.z)`; tag; push; wait for CI on `main`; the GitHub release named like the tag, with short
notes that say whether the blueprints must be updated (the card's *Update now*).

**Lessons from this session.** In the shadow DOM, base rules must not outrank component rules:
use `:where(…)` for them. `continue_on_error` covers only Home Assistant errors, not template or
configuration errors. The `has_value` filter works in templates. `ha.rest` returns parsed JSON, so
a template answer like `255` comes back as a number.

## Open points

None from the review. Known and left as they are: the midnight double write (design.md *Testing*),
and that the blueprint tests do not cover an HA restart, the late notification and the state size
guard.

### Not planned: the default HACS store

The owner decided on 2026-11-18 not to publish Weekheat in the default HACS store: it would not make
their own updates easier (a custom repository gets the same update entity), and blueprints are not
distributed by HACS either way. CI's HACS check keeps skipping description, topics and images
(`.github/workflows/check.yaml`).
