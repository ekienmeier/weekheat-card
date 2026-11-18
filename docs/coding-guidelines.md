# Weekheat coding guidelines

Status: adopted 2026-11-18. They apply to every new or changed line. Existing code is brought in line
step by step, following the plan in [review-2026-11-18.md](review-2026-11-18.md).

The stack: a Lovelace card in plain JavaScript (an ES module, a custom element with shadow DOM, no
runtime dependencies), two Home Assistant blueprints (YAML with Jinja templates), tests with the Node
test runner (Node 22), and development tools in Python 3 (standard library) and Node (Playwright).

## How to read this

- **Must** is a rule. Once the tools in [Enforcement](#3-enforcement) are set up, CI fails when it is
  broken. **Should** is the default; deviating from it needs a reason.
- A rule may be broken only with a comment at that spot, naming the rule and the reason:
  `// guideline-exception: 1.2 — the HA API needs these steps in one call` (YAML: `# guideline-exception: …`).
  Reviews check every one.
- When rules conflict: correctness and safety first, then readability, then the size rules, then brevity.

## 1. Project rules

### 1.1 Explanatory comments

Each of these **must** have a comment:

- every module (file): what it is for and where its boundary is (what it does not do);
- every class, function, method, getter and setter, and every exported constant;
- every type that crosses a module boundary. JavaScript has no interfaces, so these are JSDoc
  `@typedef`s with one `@property` per field (a room, a period, a day, a room's status, the UI state, a draft);
- every module-level constant, every class field and state field, and every local variable whose
  purpose is not clear from its name and the line it is on. Thresholds, regular expressions, magic
  values and workarounds always need one;
- every blueprint step (`- action`, `- if`, `- variables`, `- repeat`) and every template longer than one line;
- every Python module, class and function (a docstring).

A comment says **why** the code exists and **what it promises**: inputs, result, side effects, units,
edge cases. It does not retell the code. A workaround names its evidence (device, integration, HA
version, date), as the code already does for HomeKit and the Aqara W600.

Form: `/** … */` JSDoc with `@param {type} name` and `@returns {type}` on functions; `@typedef` and
`@property` for shapes; `//` on its own line above the code for local notes. A change that makes a
comment wrong fixes it in the same commit.

### 1.2 Functions: at most 15 lines

- A function, method, getter, setter, callback or arrow function has **at most 15 lines of code**;
  aim for 12 or fewer. Over 12: check whether it does more than one thing. Over 15: it must be split.
- Lines of code are the lines from the function's first line to its last (signature and closing
  brace included), not counting blank lines and lines that hold only a comment, **after formatting**
  with the project formatter (2.2). This is what ESLint's `max-lines-per-function` counts with
  `skipBlankLines` and `skipComments`.
- Render functions count too: the lines of a returned template literal are lines of code. Large
  markup is built from smaller render functions.
- Code must not be squeezed to fit: the limit only means something together with 2.2 (100 columns,
  one statement per line, no nested ternaries).
- Data tables (texts, styles, starter plans) are not functions; they live in data modules (1.3).

### 1.3 Classes: at most 400 lines

- A class has **at most 400 lines of code**, counted as in 1.2.
- One class per module, and a module has at most 400 lines of code. The module limit then enforces the
  class limit and keeps modules without a class small too. Data modules (the texts of one language,
  the styles of one part of the card) may be longer only if splitting them would separate things that
  belong together; split them by language or by part instead.
- The card class is only the Home Assistant element: `setConfig`, `hass`, the lifecycle callbacks, and
  wiring the parts in 1.4 together. It holds no business logic and builds no markup itself.
- Blueprints: Home Assistant needs one file per blueprint, so a blueprint is not split to meet this
  rule. Each template follows 1.2, and the file is divided into commented stages (2.8).

### 1.4 Clean design, separation of concerns

The card's code is split into layers. A layer uses only the layers below it:

| Layer | Folder | Contents | Must not |
|---|---|---|---|
| shell | `card.js` | the custom element: config, `hass`, lifecycle, wiring | contain logic or markup |
| ui | `ui/` | views (state → markup), event binding (DOM event → action), styles | call Home Assistant, change state while rendering |
| state | `state/` | the store (data and UI state) and the actions, one module per feature | touch the DOM |
| ha | `ha/` | the only code that calls `callWS`, `callApi`, `callService` or subscribes | know about views |
| domain | `domain/` | pure logic: time, plans, days, room status, dial geometry, versions | read `hass`, the DOM or the clock, or have side effects |
| i18n | `i18n/` | the texts of each language, and the lookup that fills placeholders | contain logic beyond the lookup |

- **Views are pure.** The same state always gives the same markup. A view never writes state, and
  never creates state as it goes (no drafts made on first render).
- **Domain functions are pure.** They take everything they need as arguments (states, plans, days,
  the current time) and are unit tested.
- **One source of truth per fact.** Some rules must exist twice: in the card (JavaScript) and in a
  blueprint (Jinja), for example the plan-name matching or the exception titles. Then each copy names
  the other in its comment, and a test checks that they agree, as the blueprint version test does.
- **Bundling** (whether the modules are joined into the one `weekheat-card.js` or served as they are)
  is decided before the card is split. HACS installs every `.js` file in the folder where it finds the card.

## 2. General rules

These are widely accepted rules, adapted to this project. Sources are listed in [References](#4-references).

### 2.1 Design

- **Single responsibility**: a module, class or function has one reason to change.
- **DRY for knowledge, not for look-alikes**: a rule or a number exists once. Two pieces of code that
  only look alike and change for different reasons stay separate.
- **KISS and YAGNI**: no option, layer or abstraction without a present use.
- **Pure by default**: side effects happen at the edges (`ha/`, the shell, the event binding).
- **Command–query separation**: a function either returns a value or changes something, not both.
- **No flag arguments** (`run(fn, false)`): use two functions, or an options object with named fields.
- **At most three positional parameters**; beyond that, one options object.
- **No magic numbers or strings**: named constants, with the unit in the name or the comment
  (`WRITE_TOLERANCE_C = 0.25`).
- **Dead code is deleted**, not commented out. Git keeps it.

### 2.2 Readability and formatting

- **Prettier** formats all JavaScript: 100 columns, 2 spaces, single quotes, semicolons, trailing
  commas. Nobody formats by hand.
- **One statement per line.** A block with more than one statement is not written on one line.
- **No nested ternaries.** One `a ? b : c` is fine; a choice between three or more cases uses `if`,
  `switch` or a lookup table.
- **Nesting depth at most 3, cyclomatic complexity at most 10** per function.
- **Names say what something is.** Variables and fields are nouns (`roomStatus`, not `n`), functions
  are verbs (`loadRooms`), booleans read as a yes/no question (`isOpen`, `hasSwitch`). Single letters
  only for loop indices and coordinates (`i`, `x`, `y`). Abbreviations only when they are common
  (`id`, `min`, `max`, `url`, `ws`). The texts are `text`, not `t`, which in a heating app reads as a
  temperature.
- **Naming style**: constants `UPPER_SNAKE_CASE`, classes `PascalCase`, functions and variables
  `camelCase`, files `kebab-case.js`, CSS classes words in `kebab-case` (`period-row`, not `prow2`),
  actions `feature-verb` (`plan-save`, `week-reset`).
- **Code and comments are in English**; user-visible texts are in `i18n/`.

### 2.3 JavaScript

- ES2022 modules. `const` by default, `let` only when the variable is reassigned, never `var`.
- `===` and `!==`. `x == null` is allowed only to test for null or undefined at once.
- `async`/`await` rather than `.then` chains. Every promise is awaited or returned to a caller that
  handles it. A promise that is deliberately not awaited gets a `.catch` and a comment saying why.
- **Errors**: catch only where the error can be handled. An empty `catch {}` or `.catch(() => null)`
  needs a comment naming the error it expects and why ignoring it is safe. Never build and store data
  from a read that failed (for example, never publish a room list that lacks a room because reading it
  failed). Errors shown to the user are translated.
- **No fixed sleeps** to wait for Home Assistant. Wait for the condition itself, with a timeout,
  through one shared `waitFor(condition, timeoutMs)` helper.
- **Types**: every function and shape has JSDoc types, checked with `tsc --noEmit --checkJs`. This
  needs no build step. If a bundler is adopted, TypeScript becomes an option.
- Arguments are not changed by the function that receives them. State changes only through the
  store's actions.

### 2.4 Home Assistant card

From Home Assistant's [custom card documentation](https://contributors.home-assistant.io/frontend/custom-ui/card/):

- `setConfig` checks the configuration and throws an `Error` with a clear message when it is invalid
  (Home Assistant then shows the error in place of the card).
- `set hass` is called on every state change in the home, so it must be cheap: it re-renders only when
  something the card shows has changed.
- Every subscription and timer is stopped in `disconnectedCallback` and started again in
  `connectedCallback`. Home Assistant detaches cards and attaches them again, for example when the
  user switches views.
- The card renders inside `ha-card` and takes its colours from Home Assistant's theme variables
  (`var(--state-climate-heat-color)`). Fixed colours are allowed only as fallbacks.
- Admin-only APIs are called only for administrators. Every other user gets a working card (read-only
  where needed).

### 2.5 Security

The card runs in administrators' browsers, with a token that can change anything in Home Assistant.

- **No hand-built HTML in `innerHTML`.** Markup is built with a tagged template that escapes every
  interpolated value for its context (`html\`…\``, or Lit). Raw HTML may only come from that same tag.
  ([OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).)
- Values used in CSS selectors go through `CSS.escape`.
- Everything that comes from Home Assistant is untrusted data: names, entity ids, automation ids,
  calendar titles, notification texts, the published room directory.
- No secrets in the repository. Tools read the URL and token from `~/.config/weekheat/`.

### 2.6 Accessibility

Target: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) level AA.

- Everything that can be clicked is a `<button>` or a native form control. No click handlers on `div`s.
- Controls that show only an icon or a symbol have an `aria-label`.
- The dial and the slider follow the
  [WAI-ARIA slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/): `role="slider"`,
  `aria-valuemin`, `aria-valuemax` and `aria-valuenow` matching the scale shown, `aria-valuetext`
  ("21 °C", "Off"), and the arrow keys, Home, End, Page Up and Page Down.
- Focus stays on the same control after a re-render.
- Colour is never the only sign of a state; there is always a text or an icon too.
- Touch targets are at least 24 × 24 CSS pixels (44 preferred).

### 2.7 Texts (i18n)

- Every text the user sees, error messages included, is in `i18n/`, in both languages. A test checks
  that both languages have the same keys and that every key is used.
- Values go into texts through placeholders (`{margin}`), filled by one function. Never change a
  translated sentence with `.replace()` on its words.
- Numbers, dates and times are formatted with `Intl`, using the user's Home Assistant settings
  (`hass.locale`), through one helper.

### 2.8 Blueprints (YAML and Jinja)

The [Home Assistant YAML style guide](https://contributors.home-assistant.io/writing/reference/yaml/)
applies: 2 spaces; lists and mappings in block style (no `{a: 1}` or `[a, b]`); strings in double
quotes; nulls left empty (not `~`); `true`/`false` only; options at their default are left out;
`triggers`, `conditions`, `actions` and `sequence` are always lists; targets under `target`; states read
with `states()`, `is_state()` and `state_attr()`. On top of that:

- **Templates**: double quotes outside, single quotes inside; a space on both sides of `|`; long
  templates as block scalars with one statement per line; **at most 15 lines per template**. A
  computation that needs more is split into several variables.
- **Inputs are normalised once**, in the top-level `variables:` (a list is always a list; an optional
  entity is `''` or an entity id). Later steps use only the normalised variables.
- **Thresholds and fixed values are named variables** at the top, each with a comment
  (`off_temp: 5`, `write_tolerance: 0.25`). The card has the same constants, and a test checks that they match.
- **Every step has a comment** above it, saying what it does and why. The run modes (the state machine)
  are documented as a table in `docs/design.md` and at the step that chooses the mode.
- **Fail soft**: an optional part (a calendar, the room sensor) that is missing or fails must not stop
  the heating. Steps that matter for safety and comfort (open windows, the heating switch) must not
  depend on optional ones.
- **The state helper fits in 255 characters** in the worst case (the most thermostats allowed, the
  longest entity ids, every key set). A test or a guard checks this.
- Each blueprint's description ends with `Weekheat x.y.z` (already tested).

### 2.9 Python tools

[PEP 8](https://peps.python.org/pep-0008/) and [PEP 257](https://peps.python.org/pep-0257/) docstrings,
type hints, `argparse` with `--help` for command lines, explicit imports, the standard library only,
and 1.2 for function length. Formatted and checked with ruff.

### 2.10 Tests

- Every domain function has unit tests. Every bug fix comes with a test that fails without the fix.
- Test names describe behaviour: `'a manual setpoint holds until the next period'`.
- Consistency tests guard every rule that exists in two places (card and blueprint).
- Unit tests are fast and need no Home Assistant. Live tests on a real Home Assistant are listed in
  `docs/design.md` (*Testing*), with their date and result.
- `domain/` keeps at least 90 % line coverage (`node --test --experimental-test-coverage`).
- Blueprint logic gets automated tests against a real Home Assistant core (for example with
  `pytest-homeassistant-custom-component`); until then, the live tests are documented.

### 2.11 Working

- Commits are small and about one thing; the message says what changed and why. Releases follow the
  *Versioning* section of the README.
- Before a commit, `npm run check` (format, lint, types, tests) passes. CI runs the same on every push,
  plus YAML lint and the HACS validation.
- A change in behaviour updates the README and `docs/design.md` in the same commit.

## 3. Enforcement

To be set up (see the review's plan). Until then, reviews check these by hand.

| Rule | Tool and setting |
|---|---|
| 1.1 comments | `eslint-plugin-jsdoc`: `require-jsdoc` (functions, methods, classes), `require-param`, `require-returns`, `require-property` |
| 1.2 ≤ 15 lines | ESLint `max-lines-per-function: {max: 15, skipBlankLines: true, skipComments: true}` |
| 1.3 ≤ 400 lines | ESLint `max-lines: {max: 400, skipBlankLines: true, skipComments: true}`, `max-classes-per-file: 1` |
| 2.2 format | Prettier (`printWidth: 100`, `singleQuote: true`); ESLint `max-len: 100`, `max-statements-per-line: 1`, `no-nested-ternary`, `max-depth: 3`, `complexity: 10`, `max-params: 3`, `id-length: {min: 2, exceptions: [i, j, x, y]}` |
| 2.3 JavaScript | ESLint `eqeqeq: [always, {null: ignore}]`, `no-var`, `prefer-const`, `no-empty`; `tsc --noEmit --checkJs` |
| 2.5 security | `eslint-plugin-no-unsanitized` (flags `innerHTML` assignments) |
| 2.7 texts | a test: same keys in every language, no unused key |
| 2.8 blueprints | `yamllint`; tests: template length ≤ 15 lines, version marker, constants match the card, state size ≤ 255 |
| 2.9 Python | `ruff check` (rules E, F, D, PLR0915 with `max-statements = 15`) and `ruff format` |
| CI | GitHub Actions: `npm run check`, `yamllint`, `hacs/action` |

## 4. References

- Robert C. Martin, *Clean Code* (2008): small functions, one level of abstraction, names, comments.
- [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html) and
  [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript).
- [Home Assistant: custom cards](https://contributors.home-assistant.io/frontend/custom-ui/card/),
  [YAML style guide](https://contributors.home-assistant.io/writing/reference/yaml/),
  [scripts and `continue_on_error`](https://www.home-assistant.io/docs/scripts/#continuing-on-error).
- [HACS: plugin repositories](https://www.hacs.xyz/docs/publish/plugin/).
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [WAI-ARIA slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/).
- [PEP 8](https://peps.python.org/pep-0008/), [PEP 257](https://peps.python.org/pep-0257/).
- [Semantic Versioning](https://semver.org).
