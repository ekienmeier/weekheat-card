# Weekheat

Home Assistant heating plans: a Lovelace card (`weekheat-card.js`) and two blueprints (`blueprints/`).
Design and decisions: `docs/design.md`. Tests: `npm test` (Node 22).

## Versioning

Follow the *Versioning* section of `README.md`. In short: a new feature or visible change raises the
minor version, a fix the patch version; docs, tests or tools alone get none. A release sets `VERSION` in
`weekheat-card.js` and the README's status line, uses a commit titled `… (x.y.z)`, a tag `vx.y.z` and a
GitHub release with short notes that say whether a blueprint must be re-imported.
