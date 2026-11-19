"""A test home for the blueprint tests: the Weekheat blueprints in a Home Assistant core.

The three blueprints are copied into the test configuration and used as they are: the day script,
the valve exercise script and room automations made from them, with real schedule helpers as plans
and a real input_text as the state helper. Everything around them is faked: thermostats are states
whose setpoint follows `climate.set_temperature` (unless unavailable), windows, switches and
room sensors are states set by the test, and the day script's `calendar.get_events` and
`workday.check_date` answer from the test's events and holidays. Time is driven with freezegun.
It does not test the card, nor any integration (climate, calendar, workday) itself.
"""

import asyncio
import json
import shutil
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from pathlib import Path

import yaml
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse, callback
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from homeassistant.util import slugify
from homeassistant.util.async_ import get_scheduled_timer_handles
from pytest_homeassistant_custom_component.common import (
    async_fire_time_changed,
    async_get_persistent_notifications,
)

# The repository's blueprints, and the folder ("namespace") they are saved under in the test home.
BLUEPRINTS = Path(__file__).resolve().parents[2] / "blueprints"
NAMESPACE = "ekienmeier"
# The time zone of the test home (the owner's).
TIME_ZONE = "Europe/Vienna"
# The weekday keys of schedule helpers, Monday first.
DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
# The setpoint of Off, in °C (off_temp in the room blueprint).
OFF = 5.0
# The card's starter plans: a period's start and its temperature (None: Off).
WORKING_DAY = [
    ("00:00", None),
    ("06:00", 21),
    ("07:00", 17),
    ("17:00", 21),
    ("21:00", 18),
    ("22:00", None),
]
FREE_DAY = [
    ("00:00", None),
    ("07:30", 21),
    ("08:30", 19),
    ("17:00", 21),
    ("21:30", 18),
    ("22:30", None),
]
# The Workday sensor and the calendars the day script reads.
WORKDAY = "binary_sensor.workday_sensor"
EXCEPTIONS = "calendar.weekheat_exceptions"
FAMILY = "calendar.family"
# How often the test lets the loop run between two checks whether the runs are done.
YIELDS = 200
# The most steps of time a test lets pass while waiting for runs to end, or to reach a time.
MAX_STEPS = 2000
# The shortest step of time between two timers, in seconds (so that time always moves on).
MIN_STEP = 1.0
# Timers due this close after the next one fire with it, in seconds: Home Assistant's loop runs
# the timers that are due together (e.g. every schedule helper's at midnight) before the runs they
# start, so a room does not see one helper on the new day and another still on the old one.
TOGETHER = 0.01


def blocks(periods: list) -> list:
    """Return schedule blocks for periods [(start "HH:MM", temperature or None)] up to 24:00."""
    ends = [start for start, _ in periods[1:]] + ["24:00"]
    out = []
    for (start, temp), end in zip(periods, ends):
        data = {"temperature": temp} if temp is not None else {"temperature": OFF, "off": True}
        out.append({"from": f"{start}:00", "to": f"{end}:00", "data": data})
    return out


@dataclass
class Room:
    """A room automation's inputs, with defaults for a room "Bad" with two thermostats."""

    name: str = "Bad"
    thermostats: list = field(default_factory=lambda: ["climate.bad_a", "climate.bad_b"])
    plans: dict = field(default_factory=lambda: {"Werktag": WORKING_DAY, "Freier Tag": FREE_DAY})
    free_day: str = "Freier Tag"
    extra: dict = field(default_factory=dict)

    @property
    def slug(self) -> str:
        """Return the room's slug, as the card makes its entity ids."""
        return slugify(self.name)

    @property
    def automation(self) -> str:
        """Return the room automation's entity id."""
        return f"automation.{self.slug}"

    @property
    def state(self) -> str:
        """Return the state helper's entity id."""
        return f"input_text.weekheat_{self.slug}_state"

    def plan(self, name: str) -> str:
        """Return a plan's entity id."""
        return f"schedule.weekheat_{self.slug}_{slugify(name)}"

    def schedules(self) -> dict:
        """Return the schedule helpers' configuration, every weekday alike (as the card writes)."""
        out = {}
        for name, periods in self.plans.items():
            key = self.plan(name).split(".", 1)[1]
            out[key] = {"name": f"{self.name} {name}", **{day: blocks(periods) for day in DAYS}}
        return out

    def inputs(self) -> dict:
        """Return the blueprint inputs; the week uses the first plan on every weekday."""
        first = self.plan(next(iter(self.plans)))
        week = {key: first for key in ("mon", "tue", "wed", "thu", "fri", "sat", "sun")}
        base = {
            "room_name": self.name,
            "thermostats": self.thermostats,
            "plans": [self.plan(name) for name in self.plans],
            "week": week,
            "free_day": self.plan(self.free_day),
            "state": self.state,
            "settle_time": 5,
        }
        return {**base, **self.extra}

    def config(self) -> dict:
        """Return the automation's configuration."""
        blueprint = {"path": f"{NAMESPACE}/weekheat_room.yaml", "input": self.inputs()}
        return {"id": self.slug, "alias": self.slug, "use_blueprint": blueprint}


class Home:
    """The test home: Home Assistant with the blueprints, fake thermostats and fake day sources."""

    def __init__(self, hass: HomeAssistant, freezer, config_dir: Path):
        """Keep the hass instance, the time machine and the configuration folder."""
        self.hass, self.freezer, self.config_dir = hass, freezer, config_dir
        # set_temperature calls as [entity id, temperature], in order; and hvac mode calls.
        self.writes: list = []
        self.modes: list = []
        # Calendar events by calendar, {"start", "end", "summary"}; dates that are holidays.
        self.events: dict = {}
        self.holidays: set = set()
        self.rooms: list = []

    async def prepare(self) -> None:
        """Set the time zone, copy the blueprints, set up the fakes and the base integrations."""
        await self.hass.config.async_set_time_zone(TIME_ZONE)
        self.hass.config.config_dir = str(self.config_dir)
        for domain in ("automation", "script"):
            target = self.config_dir / "blueprints" / domain / NAMESPACE
            target.mkdir(parents=True)
            for source in (BLUEPRINTS / domain).glob("*.yaml"):
                shutil.copy(source, target / source.name)
        self.register_fakes()
        assert await async_setup_component(self.hass, "persistent_notification", {})

    def register_fakes(self) -> None:
        """Register the fake climate, calendar and workday services and the day sources."""
        services = self.hass.services
        self.hass.bus.async_listen("state_changed", self._trace)
        services.async_register("climate", "set_temperature", self._set_temperature)
        services.async_register("climate", "set_hvac_mode", self._set_hvac_mode)
        only = SupportsResponse.ONLY
        services.async_register("calendar", "get_events", self._get_events, supports_response=only)
        services.async_register("workday", "check_date", self._check_date, supports_response=only)
        workdays = ["mon", "tue", "wed", "thu", "fri"]
        self.hass.states.async_set(WORKDAY, "on", {"workdays": workdays})
        for calendar in (EXCEPTIONS, FAMILY):
            self.hass.states.async_set(calendar, "off")

    @callback
    def _trace(self, event) -> None:
        """Print each state change with the time (pytest shows it when a test fails)."""
        state = event.data["new_state"]
        if state is None or state.domain in ("automation", "script"):
            return
        temp = state.attributes.get("temperature")
        print(f"{dt_util.now():%a %H:%M:%S.%f} {state.entity_id} = {state.state} ({temp})")

    @callback
    def _set_temperature(self, call: ServiceCall) -> None:
        """Take a setpoint, as a thermostat does (an unavailable one ignores it)."""
        for entity in call.data["entity_id"]:
            temp = float(call.data["temperature"])
            self.writes.append([entity, temp])
            print(f"{dt_util.now():%a %H:%M:%S.%f} write {entity} {temp}")
            state = self.hass.states.get(entity)
            if state.state == "unavailable":
                continue
            attributes = {**state.attributes, "temperature": temp}
            self.hass.states.async_set(entity, state.state, attributes)

    @callback
    def _set_hvac_mode(self, call: ServiceCall) -> None:
        """Take an hvac mode."""
        for entity in call.data["entity_id"]:
            self.modes.append([entity, call.data["hvac_mode"]])
            state = self.hass.states.get(entity)
            self.hass.states.async_set(entity, call.data["hvac_mode"], state.attributes)

    @callback
    def _get_events(self, call: ServiceCall) -> dict:
        """Answer calendar.get_events with the test's events (all of them, whatever the range)."""
        entities = call.data["entity_id"]
        return {entity: {"events": self.events.get(entity, [])} for entity in entities}

    @callback
    def _check_date(self, call: ServiceCall) -> dict:
        """Answer workday.check_date: Monday to Friday, except the holidays."""
        date = str(call.data["check_date"])
        weekday = dt_util.parse_date(date).weekday()
        workday = weekday < 5 and date not in self.holidays
        return {entity: {"workday": workday} for entity in call.data["entity_id"]}

    def thermostat(self, entity: str, setpoint: float = OFF, mode: str = "heat") -> None:
        """Add or change a thermostat; a change of its setpoint here is a change by hand."""
        attributes = {"temperature": setpoint, "friendly_name": entity.split(".")[1]}
        self.hass.states.async_set(entity, mode, attributes)

    def setpoint(self, entity: str) -> float | None:
        """Return a thermostat's setpoint."""
        return self.hass.states.get(entity).attributes.get("temperature")

    def set(self, entity: str, state: str, attributes: dict | None = None) -> None:
        """Set a window, switch or sensor."""
        self.hass.states.async_set(entity, state, attributes or {})

    def stored(self, room: Room | None = None) -> dict:
        """Return the room's state helper, parsed ({} when empty)."""
        text = self.hass.states.get((room or self.rooms[0]).state).state
        return json.loads(text) if text.startswith("{") else {}

    def notifications(self) -> dict:
        """Return the persistent notifications by id."""
        return async_get_persistent_notifications(self.hass)

    def taken(self) -> list:
        """Return the setpoint writes since the last call, and forget them."""
        out, self.writes = self.writes, []
        return out

    def scripts(self, exercise: bool, extra: dict) -> dict:
        """Return the scripts' configuration: the day script, the exercise script, extras."""
        day_inputs = {
            "workday": WORKDAY,
            "exceptions": EXCEPTIONS,
            "calendars": [FAMILY],
            "rules": [{"keyword": "schulfrei"}, {"keyword": "Homeoffice", "plan": "Homeoffice"}],
        }
        out = {"weekheat_day": {"use_blueprint": self.use("weekheat_day.yaml", day_inputs)}}
        if exercise:
            out["weekheat_exercise"] = {"use_blueprint": self.use("weekheat_exercise.yaml", {})}
        return {**out, **extra}

    @staticmethod
    def use(file: str, inputs: dict) -> dict:
        """Return a use_blueprint configuration."""
        return {"path": f"{NAMESPACE}/{file}", "input": inputs}

    async def start(self, *rooms: Room, exercise: bool = True, scripts: dict | None = None):
        """Set up the plans, state helpers, scripts and room automations (without running them)."""
        self.rooms = list(rooms)
        for room in rooms:
            for entity in room.thermostats:
                if self.hass.states.get(entity) is None:
                    self.thermostat(entity)
        schedules = {key: value for room in rooms for key, value in room.schedules().items()}
        helpers = {room.state.split(".")[1]: {"name": "state", "max": 255} for room in rooms}
        await self.setup("schedule", schedules)
        await self.setup("input_text", helpers)
        await self.setup("script", self.scripts(exercise, scripts or {}))
        await self.setup("automation", [room.config() for room in rooms])

    async def setup(self, domain: str, config) -> None:
        """Set up an integration with a configuration."""
        assert await async_setup_component(self.hass, domain, {domain: config})
        await self.hass.async_block_till_done()

    async def reconfigure(self, room: Room) -> None:
        """Change a room automation as HA's editor does: new configuration, then reload."""
        self.rooms = [room if old.slug == room.slug else old for old in self.rooms]
        config = {"automation": [old.config() for old in self.rooms]}
        text = yaml.safe_dump(config, allow_unicode=True)
        (self.config_dir / "configuration.yaml").write_text(text, encoding="utf-8")
        await self.hass.services.async_call("automation", "reload", blocking=True)
        await self.hass.async_block_till_done()

    async def run(self, room: Room | None = None) -> None:
        """Run a room as the card does (automation.trigger), and let it finish."""
        entity = (room or self.rooms[0]).automation
        await self.hass.services.async_call("automation", "trigger", {"entity_id": entity})
        await self.settle()

    async def at(self, clock: str, days: int = 0) -> None:
        """Let time pass to a local time ("HH:MM:SS") today or some days on, firing what is due."""
        date = dt_util.now().date() + timedelta(days=days)
        zone = dt_util.get_default_time_zone()
        target = datetime.combine(date, time.fromisoformat(clock), tzinfo=zone)
        assert target >= dt_util.now(), "time only runs forward"
        await self.until(target)

    async def wait(self, seconds: float) -> None:
        """Let some seconds pass, firing what is due."""
        await self.until(dt_util.utcnow() + timedelta(seconds=seconds))

    async def until(self, target: datetime) -> None:
        """Let time pass to a moment, timer by timer, so that each fires at its own time.

        One jump would fire them all at the end, in their order but each seeing the final time:
        a 15-minute tick would then run the room before a schedule helper changed its period.
        """
        for _ in range(MAX_STEPS):
            due = self._next_due()
            if due is None or due >= target:
                break
            self.freezer.move_to(due)
            async_fire_time_changed(self.hass)
            await self.settle()
        self.freezer.move_to(target)
        async_fire_time_changed(self.hass)
        await self.settle()

    def _next_due(self) -> datetime | None:
        """Return when the next timer is due (at least a second from now), or None."""
        loop = self.hass.loop
        handles = get_scheduled_timer_handles(loop)
        whens = [handle.when() for handle in handles if not handle.cancelled()]
        if not whens:
            return None
        seconds = max(min(whens) - loop.time() + TOGETHER, MIN_STEP)
        import time as _t

        soon = sorted((h for h in handles if not h.cancelled()), key=lambda h: h.when())[:3]
        print("DUE", loop.time(), _t.monotonic(), _t.time(), [(h.when(), repr(h)[:150]) for h in soon])
        return dt_util.utcnow() + timedelta(seconds=seconds)

    async def settle(self, step: float = 1.0) -> None:
        """Let the runs end; while one waits (a delay, a timeout), let time pass in steps."""
        for _ in range(MAX_STEPS):
            await self._yield()
            if not self._busy():
                await self.hass.async_block_till_done()
                return
            self.freezer.tick(step)
            async_fire_time_changed(self.hass)
        raise AssertionError("the runs did not end")

    async def _yield(self) -> None:
        """Let the loop run for a while (runs waiting for time stay waiting)."""
        for _ in range(YIELDS):
            await asyncio.sleep(0)

    def _busy(self) -> bool:
        """Return whether an automation or script is running."""
        states = self.hass.states.async_all(["automation", "script"])
        return any(state.attributes.get("current", 0) for state in states)
