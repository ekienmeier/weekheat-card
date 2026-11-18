# Weekheat

Home Assistant heating plans: a Lovelace card (source in `src/`, built to `dist/weekheat-card.js` with
`npm run build`; the built file is committed) and two blueprints (`blueprints/`). Design and decisions:
`docs/design.md`. Checks: `npm run check` (format, lint, types, tests; Node 22).

Checks against the live Home Assistant: `tools/shoot.mjs` (read-only unless `WRITE=1`),
`tools/compare_shots.mjs`, `tools/check_blueprints.py` and `tools/ha.py` (read with it; never write to the
user's thermostats, helpers or blueprints without asking).

**Open work:** `docs/follow-up.md` is the plan for the points still open after 0.13.0, and says how to work
on this project (tools, GitHub without `gh`, releasing, what can only be checked in CI). Start there.

## Coding guidelines

All new and changed code follows `docs/coding-guidelines.md`. In short: an explanatory comment on every
module, class, function, shared type and non-obvious variable; functions at most 15 lines of code
(aim for 12), classes and modules at most 400, counted after formatting at 100 columns; layers as in
section 1.4 there. Existing code is brought in line by the plan in `docs/review-2026-11-18.md`.

## Versioning

Follow the *Versioning* section of `README.md`. In short: a new feature or visible change raises the
minor version, a fix the patch version; docs, tests or tools alone get none. A release sets `VERSION` in
`src/version.js` (and `BLUEPRINT_VERSION` when a blueprint changed), runs `npm run build`, sets the README's
status line, uses a commit titled `… (x.y.z)`, a tag `vx.y.z` and a
GitHub release named exactly like the tag (`vx.y.z`; HACS shows both when they differ) with short notes
that say whether a blueprint must be re-imported.
