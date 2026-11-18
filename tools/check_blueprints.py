"""Check the blueprints against Home Assistant, read-only: templates are rendered, nothing is saved.

  python3 tools/check_blueprints.py validate
      HA's validate_config on the blueprints, with the inputs of the real rooms and day script
      (the valve exercise script has no inputs).
  python3 tools/check_blueprints.py day [--ref v0.13.0] [--days 120]
      The day script of a git ref and of the working copy decide the same days (real events plus
      synthetic ones for the hard cases)?
  python3 tools/check_blueprints.py room [--ref v0.13.0] [--room weekheat_wohnzimmer]
      [--ignore-key _th]
      The room blueprint of a git ref and of the working copy compute the same values and would
      write the same, in scenarios that reach every run mode, the valve exercise (a call of the
      exercise script is emulated with its blueprint) and thermostats changed while held?
      --ignore-key leaves a key of the state helper out when the writes are compared (e.g. a
      marker the ref does not know).

A run is emulated step by step (see Run): variables, conditions and loops are rendered by Home
Assistant's own template engine (POST /api/template, which changes nothing); actions are never
called, their responses come from the test data, and what they would write is recorded.
Run from the repository's root; the HA URL and token come from ~/.config/weekheat/ (see ha.py).
"""

import argparse
import ast
import base64
import datetime
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor

import yaml

from ha import HA

ROOM = "blueprints/automation/weekheat_room.yaml"
DAY = "blueprints/script/weekheat_day.yaml"
EXERCISE = "blueprints/script/weekheat_exercise.yaml"
# The script the room automations call for the valve exercise (their input's default).
EXERCISE_SCRIPT = "script.weekheat_exercise"


def blueprint_text(path: str, ref: str | None) -> str:
    """Return a blueprint's text: from a git ref (e.g. "v0.13.0"), or the working copy."""
    if ref is None:
        with open(path, encoding="utf-8") as file:
            return file.read()
    git = ["git", "show", f"{ref}:{path}"]
    return subprocess.run(git, check=True, capture_output=True, text=True).stdout


def load_blueprint(text: str, inputs: dict) -> dict:
    """Parse a blueprint; each !input becomes the input's value, else the blueprint's default."""
    plain = yaml.safe_load(text.replace("!input ", ""))
    specs = plain["blueprint"].get("input") or {}
    defaults = {key: spec.get("default") for key, spec in specs.items()}

    class Loader(yaml.SafeLoader):
        """A YAML loader that resolves !input."""

    def resolve(loader, node):
        """Return the value of the input a !input tag names."""
        name = loader.construct_scalar(node)
        return inputs.get(name, defaults.get(name))

    Loader.add_constructor("!input", resolve)
    return yaml.load(text, Loader=Loader)


def set_variable(key: str, value) -> str:
    """Return a Jinja statement that sets a variable to a JSON value."""
    encoded = base64.b64encode(json.dumps(value).encode()).decode()
    return "{%% set %s = '%s' | base64_decode | from_json %%}" % (key, encoded)


def render(ha: HA, template, context: dict):
    """Render a template with variables on Home Assistant; parse the result as HA does."""
    if not isinstance(template, str) or "{" not in template:
        return template
    sets = "".join(set_variable(key, value) for key, value in context.items())
    answer = ha.rest("POST", "template", {"template": sets + template})
    if not isinstance(answer, str):
        return answer
    try:
        return ast.literal_eval(answer.strip())
    except (ValueError, SyntaxError):
        return answer.strip()


def rendered(ha: HA, value, context: dict):
    """Render a value that may be a template, or a list or mapping holding templates."""
    if isinstance(value, dict):
        return {key: rendered(ha, item, context) for key, item in value.items()}
    if isinstance(value, list):
        return [rendered(ha, item, context) for item in value]
    return render(ha, value, context)


class Stop(Exception):
    """A run ended: by a stop step, or a condition that did not hold."""


class Run:
    """An emulated run of a script or automation, with fixed answers for its actions.

    `responses(action, data, context)` gives an action's response; `overrides` replace variables
    where they are first defined (so that a scenario reaches a branch whatever the live states are).
    `scripts` maps a script's entity id to its parsed blueprint: a call of it is emulated too, with
    the call's data as its fields, and its calls follow the call's own.
    """

    def __init__(self, ha: HA, context: dict, responses, overrides: dict | None = None):
        """Start a run with these variables."""
        self.ha, self.context, self.responses = ha, dict(context), responses
        self.overrides = dict(overrides or {})
        self.scripts = {}
        self.calls = []

    def steps(self, steps: list):
        """Run a sequence."""
        for step in steps:
            self.step(step)

    def step(self, step: dict):
        """Run one step."""
        if "variables" in step:
            self.variables(step["variables"])
        elif "if" in step:
            self.steps(step["then"] if self.holds(step["if"]) else step.get("else", []))
        elif "repeat" in step:
            self.repeat(step["repeat"])
        elif "condition" in step and not self.holds([step]):
            raise Stop("condition")
        elif "action" in step:
            self.action(step)
        elif "stop" in step:
            raise Stop("stop")
        elif "wait_template" in step:
            self.context["wait"] = {"completed": True}

    def variables(self, variables: dict):
        """Set variables in order, each seeing the ones before.

        An override replaces a variable where it is first defined; later steps that change it
        compute as written.
        """
        for name, template in variables.items():
            if name in self.overrides:
                self.context[name] = self.overrides.pop(name)
            else:
                self.context[name] = rendered(self.ha, template, self.context)

    def holds(self, conditions: list) -> bool:
        """Return whether all template conditions hold."""
        templates = [c if isinstance(c, str) else c["value_template"] for c in conditions]
        return all(render(self.ha, template, self.context) for template in templates)

    def repeat(self, repeat: dict):
        """Run a loop over a list (for_each) or a number of times (count)."""
        count = list(range(repeat.get("count", 0)))
        items = rendered(self.ha, repeat.get("for_each", count), self.context)
        for item in items:
            self.context["repeat"] = {"item": item}
            self.steps(repeat["sequence"])

    def action(self, step: dict):
        """Record an action as rendered, and keep its response if it has one."""
        name = render(self.ha, step["action"], self.context)
        data = rendered(self.ha, {**step.get("target", {}), **step.get("data", {})}, self.context)
        self.calls.append([name, data])
        if name in self.scripts:
            self.calls += run_blueprint(self.ha, self.scripts[name], data, self.responses).calls
        if "response_variable" in step:
            self.context[step["response_variable"]] = self.responses(name, data, self.context)


def run_blueprint(ha: HA, doc: dict, start: dict, responses, overrides=None, scripts=None) -> Run:
    """Emulate a run of a blueprint (script or automation) from its top-level variables.

    `scripts`: the scripts whose calls are emulated too (see Run).
    """
    run = Run(ha, start, responses, overrides)
    run.scripts = scripts or {}
    run.variables(doc.get("variables", {}))
    try:
        run.steps(doc.get("actions") or doc.get("sequence") or [])
    except Stop:
        pass
    return run


def room_configs(ha: HA) -> list:
    """Return the config paths of the automations made from the room blueprint."""
    paths = ha.ws({"type": "blueprint/list", "domain": "automation"})
    path = next(p for p in paths if p.endswith("weekheat_room.yaml"))
    search = {"type": "search/related", "item_type": "automation_blueprint", "item_id": path}
    entities = ha.ws(search).get("automation", [])
    ids = [ha.rest("GET", f"states/{entity}")["attributes"]["id"] for entity in entities]
    return [f"config/automation/config/{config_id}" for config_id in ids]


def validate(ha: HA):
    """Print HA's validate_config of the blueprints, with real inputs (none for the exercise)."""
    configs = [(DAY, "config/script/config/weekheat_day"), (EXERCISE, None)]
    configs += [(ROOM, config) for config in room_configs(ha)]
    for path, config in configs:
        inputs = ha.rest("GET", config)["use_blueprint"]["input"] if config else {}
        doc = load_blueprint(blueprint_text(path, None), inputs)
        config = config or path
        body = {"type": "validate_config", "actions": doc.get("actions") or doc.get("sequence")}
        if doc.get("triggers"):
            body["triggers"] = doc["triggers"]
        print(f"{config}: {json.dumps(ha.ws(body))}")


def calendar_events(ha: HA, calendars: list, first: datetime.date, days: int) -> dict:
    """Return the real events of some calendars, in the form calendar.get_events answers."""
    until = (first + datetime.timedelta(days=days + 1)).isoformat()
    events = {}
    for calendar in calendars:
        found = ha.rest("GET", f"calendars/{calendar}?start={first}T00:00:00&end={until}T00:00:00")
        events[calendar] = {"events": [event_of(event) for event in found]}
    return events


def event_of(event: dict) -> dict:
    """Return a REST calendar event as calendar.get_events gives it."""
    start, end = event["start"], event["end"]
    return {
        "start": start.get("date") or start.get("dateTime"),
        "end": end.get("date") or end.get("dateTime"),
        "summary": event["summary"],
    }


def synthetic_events(first: datetime.date) -> dict:
    """Return events for the hard cases, and the dates Workday then does not count as workdays.

    A multi-day exception, "Plan:" with and without a note, a Saturday made a working day, timed
    keyword events across and at midnight, a multi-day keyword event, a holiday.
    """

    def day(n):
        """Return the date n days after the first."""
        return (first + datetime.timedelta(days=n)).isoformat()

    saturday = 10 + (5 - (first + datetime.timedelta(days=10)).weekday()) % 7
    exceptions = [
        {"start": day(3), "end": day(6), "summary": "Freier Tag – Ferien"},
        {"start": day(7), "end": day(8), "summary": "Plan: Home-Office – Test"},
        {"start": day(8), "end": day(9), "summary": "Plan:"},
        {"start": day(9), "end": day(10), "summary": "Geburtstag"},
        {"start": day(saturday), "end": day(saturday + 1), "summary": "Werktag"},
    ]
    late = {"start": f"{day(20)}T20:00:00+01:00", "end": f"{day(21)}T08:00:00+01:00"}
    midnight = {"start": f"{day(23)}T10:00:00+01:00", "end": f"{day(24)}T00:00:00+01:00"}
    keyword = [
        {**late, "summary": "Home-Office"},
        {**midnight, "summary": "schulfrei"},
        {"start": day(30), "end": day(32), "summary": "Schulfrei (zwei Tage)"},
    ]
    holiday = [{"start": day(40), "end": day(41), "summary": "Testfeiertag"}]
    return {"exceptions": exceptions, "keyword": keyword, "holiday": holiday, "dates": [day(40)]}


def day_data(ha: HA, inputs: dict, first: datetime.date, days: int) -> tuple:
    """Return the events (real and synthetic) and the dates Workday counts as holidays."""
    calendars = as_list(inputs.get("calendars"))
    holidays = as_list(inputs.get("holidays"))
    events = calendar_events(ha, list({*calendars, inputs["exceptions"], *holidays}), first, days)
    extra = synthetic_events(first)
    events[inputs["exceptions"]]["events"] += extra["exceptions"]
    if calendars:
        events[calendars[0]]["events"] += extra["keyword"]
    if holidays:
        events[holidays[0]]["events"] += extra["holiday"]
    return events, set(extra["dates"])


def as_list(value) -> list:
    """Return a blueprint input that may be one value, a list or empty, as a list."""
    if isinstance(value, list):
        return value
    return [value] if value else []


def day_responses(events: dict, workday: str, holidays: set):
    """Return the answers of the day script's actions: the events, and Workday's check_date."""

    def answer(action, data, context):
        """Answer one action."""
        if action == "calendar.get_events":
            return events
        date = datetime.date.fromisoformat(data["check_date"])
        return {workday: {"workday": date.weekday() < 5 and data["check_date"] not in holidays}}

    return answer


def decide_days(ha: HA, doc: dict, starts: list, answers) -> list:
    """Return the days one version of the day script decides, 30 from each start."""

    def decide(start):
        """Return the days decided from one start."""
        run = run_blueprint(ha, doc, {"start": start.isoformat(), "days": 30}, answers)
        return run.context.get("result", {}).get("days") or []

    with ThreadPoolExecutor(4) as pool:
        return [day for part in pool.map(decide, starts) for day in part]


def compare_day(ha: HA, ref: str, days: int):
    """Print whether the day script of `ref` and of the working copy decide the same days."""
    inputs = ha.rest("GET", "config/script/config/weekheat_day")["use_blueprint"]["input"]
    first = datetime.date.today()
    events, holidays = day_data(ha, inputs, first, days)
    answers = day_responses(events, inputs["workday"], holidays)
    starts = [first + datetime.timedelta(days=n) for n in range(0, days, 30)]
    old = decide_days(ha, load_blueprint(blueprint_text(DAY, ref), inputs), starts, answers)
    new = decide_days(ha, load_blueprint(blueprint_text(DAY, None), inputs), starts, answers)
    differ = [(a, b) for a, b in zip(old, new) if a != b]
    kinds = sorted({day["kind"] for day in new})
    print(f"{len(new)} days ({len(old)} for {ref}); {len(differ)} differ; kinds: {kinds}")
    for a, b in differ[:5]:
        print(f"  {a['date']}\n    {ref}: {a}\n    new: {b}")


def room_scenarios(thermostats: list, now_m: int) -> dict:
    """Return scenarios that reach each run mode: variables to set, by name.

    `state` is the stored state helper (see room_run); `trigger` the trigger's id (default tick).
    """
    first, second = thermostats[0], thermostats[-1]
    both = {first: [23.0], second: [23.0]}
    held = {first: [23.0], "_open": [23.0, 23.0], "_rc": 1, "_rt": now_m - 30}
    window = {first: [23.0], "_open": [22.0, 21.0]}
    plain = {"open_now": False, "room_t": None, "switch_off": False, "now_m": now_m}
    return {
        "plan": {**plain, "state": {first: [20.0], second: [20.0]}},
        "plan unchanged": {**plain, "state": both, "wanted": 23.0},
        "window opens": {**plain, "state": {first: [23.0]}, "open_now": True},
        "window held": {**plain, "state": window, "open_now": True},
        "window held, new period": {
            **plain,
            "state": {**window, first: [18.0]},
            "wanted": 23.0,
            "open_now": True,
        },
        "window closes": {**plain, "state": {first: [23.0], "_open": [22.0, None]}},
        "valves held, room warm": {**plain, "state": held, "room_t": 25.0},
        "valves held, room cooled": {**plain, "state": held, "room_t": 22.5},
        "valves held, too soon": {**plain, "state": {**held, "_rt": now_m - 2}, "room_t": 22.5},
        "valves close": {**plain, "state": both, "wanted": 23.0, "room_t": 24.0},
        "heating off": {**plain, "state": window, "switch_off": True},
        "gap in the plan": {**plain, "state": {first: [23.0]}, "wanted": None},
        **changed_scenarios(plain, window, held),
        **exercise_scenarios(plain, both),
    }


def changed_scenarios(plain: dict, window: dict, held: dict) -> dict:
    """Return scenarios of a room held while its thermostats were changed (review L8).

    The saved setpoints carry the fingerprint of their thermostat list (_th); -1 is never the
    current one. With the right fingerprint (th_print set to match), a held room runs as before.
    """
    moved = {"_th": -1}
    same = {**plain, "state": {**window, "_th": 4242}, "th_print": 4242}
    return {
        "changed, window closed": {**plain, "state": {**window, **moved}, "wanted": 23.0},
        "changed, window open": {
            **plain,
            "state": {**window, **moved},
            "wanted": 23.0,
            "open_now": True,
        },
        "changed, valves held": {
            **plain,
            "state": {**held, **moved},
            "wanted": 23.0,
            "room_t": 25.0,
        },
        "changed, heating off": {**plain, "state": {**window, **moved}, "switch_off": True},
        "unchanged, window closed": same,
        "unchanged, window held": {**same, "open_now": True},
    }


def exercise_scenarios(plain: dict, both: dict) -> dict:
    """Return scenarios of the valve exercise (Run now), with and without its script."""
    run = {**plain, "state": both, "wanted": 23.0, "trigger": "exercise_now"}
    return {
        "exercise": {**run, "ex_ready": True},
        "exercise, no script": {**run, "ex_ready": False},
    }


def defines(doc: dict, name: str) -> bool:
    """Return whether a top-level step of a blueprint's actions sets a variable of this name."""
    steps = doc.get("actions") or doc.get("sequence") or []
    return any(name in step.get("variables", {}) for step in steps)


def room_run(ha: HA, doc: dict, scenario: dict, scripts: dict) -> Run:
    """Emulate a run of a room, with its day script answering a plain Wednesday.

    The scenario's `state` replaces the stored state: `stored` where the version reads it so,
    else `applied` (releases before 0.14 read the state straight into it).
    """
    day_info = {"days": [{"weekday": "wed", "free": False, "plan": None, "kind": "plain"}]}

    def answer(action, data, context):
        """Answer the day script call; nothing else answers."""
        return day_info if action.startswith("script.") else None

    overrides = dict(scenario)
    trigger = {"id": overrides.pop("trigger", "tick"), "entity_id": None, "event": {"data": {}}}
    if "state" in overrides:
        overrides["stored" if defines(doc, "stored") else "applied"] = overrides.pop("state")
    start = {"trigger": trigger, "this": {"entity_id": "automation.x"}}
    return run_blueprint(ha, doc, start, answer, overrides, scripts)


def writes(calls: list, ignore: list) -> list:
    """Return the calls that change something, with the ignored keys left out of state values.

    Script calls are left out (the day script only answers; the exercise script's own calls are
    in the list), and so is dismissing a notification (dismissing none changes nothing).
    """
    kept = []
    for name, data in calls:
        if name.startswith("script.") or name == "persistent_notification.dismiss":
            continue
        if name == "input_text.set_value" and ignore:
            value = data["value"]
            value = json.loads(value) if isinstance(value, str) else value
            data = {**data, "value": {k: v for k, v in value.items() if k not in ignore}}
        kept.append([name, data])
    return kept


def compare_scenario(ha: HA, setup: tuple, scenario: tuple) -> tuple:
    """Return a scenario's mode, the variables that differ, and the writes of both versions."""
    versions, scripts, ignore = setup
    name, overrides = scenario
    a, b = (room_run(ha, doc, overrides, scripts) for doc in versions)
    differ = [key for key in a.context if key in b.context and a.context[key] != b.context[key]]
    return name, b.context.get("mode"), differ, (writes(a.calls, ignore), writes(b.calls, ignore))


def compare_room(ha: HA, ref: str, room: str, ignore: list):
    """Print whether the room blueprint of `ref` and of the working copy agree in each scenario.

    Both versions call the working copy's exercise script (a ref before 0.14 has none).
    """
    inputs = ha.rest("GET", f"config/automation/config/{room}")["use_blueprint"]["input"]
    versions = tuple(load_blueprint(blueprint_text(ROOM, r), inputs) for r in (ref, None))
    scripts = {EXERCISE_SCRIPT: load_blueprint(blueprint_text(EXERCISE, None), {})}
    now_m = int(datetime.datetime.now().timestamp() // 60)
    scenarios = room_scenarios(as_list(inputs["thermostats"]), now_m)
    setup = (versions, scripts, ignore)
    with ThreadPoolExecutor(6) as pool:
        results = pool.map(lambda item: compare_scenario(ha, setup, item), scenarios.items())
        for name, mode, differ, (old_calls, new_calls) in results:
            same = old_calls == new_calls
            print(f"{name:26} mode {mode!s:8} differ: {differ or 'none'}; writes same: {same}")
            if not same:
                print(f"    {ref}: {old_calls}\n    new: {new_calls}")


def main():
    """Run the check the command line asks for."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("check", choices=["validate", "day", "room"])
    parser.add_argument("--ref", default="v0.13.0", help="the git ref to compare with")
    parser.add_argument("--days", type=int, default=120, help="day: how many days")
    parser.add_argument("--room", default="weekheat_wohnzimmer", help="room: the automation id")
    parser.add_argument(
        "--ignore-key", action="append", default=[], help="room: a state key not to compare"
    )
    args = parser.parse_args()
    ha = HA()
    if args.check == "validate":
        validate(ha)
    elif args.check == "day":
        compare_day(ha, args.ref, args.days)
    else:
        compare_room(ha, args.ref, args.room, args.ignore_key)


if __name__ == "__main__":
    main()
