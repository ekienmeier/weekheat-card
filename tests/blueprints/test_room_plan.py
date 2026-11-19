"""The room blueprint follows its plans: periods, changes by hand, midnight, the day decision.

The cases of design.md's *Testing* that the owner once tested live, in a Home Assistant core (see
home.py). The test home starts on Monday 2026-11-16 at 05:00; the room "Bad" has two thermostats
and the card's starter plans (Werktag: 06:00 21 °C, 07:00 17 °C, ...; Freier Tag: 07:30 21 °C, ...).
"""

import pytest
from home import EXCEPTIONS, FAMILY, FREE_DAY, OFF, WORKING_DAY, Room
from homeassistant.core import SupportsResponse
from homeassistant.exceptions import HomeAssistantError
from pytest_homeassistant_custom_component.common import async_mock_service

A, B = "climate.bad_a", "climate.bad_b"


async def test_a_period_boundary_writes_the_new_temperature(home):
    """At 06:00 the 21 °C period starts: both thermostats get it, and the state says so."""
    await home.start(Room())
    await home.run()
    assert home.taken() == [[A, OFF], [B, OFF]]
    await home.at("06:00:01")
    assert home.taken() == [[A, 21.0], [B, 21.0]]
    assert home.stored() == {A: [21.0], B: [21.0]}


async def test_a_change_by_hand_holds_until_the_next_period(home):
    """A setpoint set by hand is not fought, by a tick or a plan update, until the next period."""
    await home.start(Room())
    await home.at("06:00:01")
    home.taken()
    home.thermostat(A, 23)
    await home.settle()
    await home.at("06:15:01")
    await home.at("06:45:01")
    assert home.taken() == []
    assert home.setpoint(A) == 23
    await home.at("07:00:01")
    assert home.taken() == [[A, 17.0], [B, 17.0]]


async def test_equal_adjacent_periods_behave_as_one(home):
    """A period with the same temperature as the one before writes nothing; by hand holds."""
    plan = [("00:00", None), ("06:00", 21), ("07:00", 21), ("08:00", 17)]
    await home.start(Room(plans={"Werktag": plan, "Freier Tag": FREE_DAY}))
    await home.at("06:00:01")
    home.taken()
    home.thermostat(A, 23)
    await home.at("07:00:01")
    assert home.taken() == []
    assert home.setpoint(A) == 23
    await home.at("08:00:01")
    assert home.taken() == [[A, 17.0], [B, 17.0]]


async def test_off_across_midnight_keeps_a_change_by_hand(home):
    """22:00 Off followed by 00:00 Off does not reset a manual 22 °C at midnight."""
    await home.start(Room())
    await home.at("22:00:01")
    home.taken()
    home.thermostat(A, 22)
    await home.at("23:00:00")
    await home.at("00:00:10", days=1)
    assert home.taken() == []
    assert home.setpoint(A) == 22
    await home.at("06:00:01")
    assert home.taken() == [[A, 21.0], [B, 21.0]]


async def test_midnight_starts_the_next_days_plan(home):
    """From Friday to Saturday, the free-day plan takes over at midnight."""
    free = [("00:00", 16), ("09:00", 19)]
    await home.start(Room(plans={"Werktag": WORKING_DAY, "Freier Tag": free}))
    await home.at("23:00:00", days=4)
    home.taken()
    await home.at("00:00:10", days=1)
    assert home.taken() == [[A, 16.0], [B, 16.0]]


async def test_an_unavailable_thermostat_is_written_when_it_is_back(home):
    """A thermostat that is unavailable at a period boundary gets the period's value later."""
    await home.start(Room())
    await home.run()
    home.set(B, "unavailable")
    home.taken()
    await home.at("06:00:01")
    assert home.taken() == [[A, 21.0]]
    assert home.stored()[B] == [OFF]
    home.thermostat(B, OFF)
    await home.settle()
    assert home.taken() == [[B, 21.0]]


DAYS = {
    "a working day": ({}, set(), 17.0),
    "a public holiday": ({}, {"2026-11-16"}, 21.0),
    "a keyword event": ({FAMILY: "Herbstferien schulfrei"}, set(), 21.0),
    "an exception: free day": ({EXCEPTIONS: "Freier Tag"}, set(), 21.0),
    "an exception naming a plan": ({EXCEPTIONS: "Plan: Homeoffice – Handwerker"}, set(), 19.5),
    "a keyword rule naming a plan": ({FAMILY: "Homeoffice"}, set(), 19.5),
}


@pytest.mark.parametrize("events, holidays, wanted", DAYS.values(), ids=DAYS.keys())
async def test_the_day_script_picks_the_plan(home, events, holidays, wanted):
    """Monday 08:00: Werktag has 17 °C, Freier Tag 21 °C, Homeoffice 19.5 °C."""
    for calendar, summary in events.items():
        home.events[calendar] = [{"start": "2026-11-16", "end": "2026-11-17", "summary": summary}]
    home.holidays |= holidays
    office = [("00:00", 19.5)]
    plans = {"Werktag": WORKING_DAY, "Freier Tag": FREE_DAY, "Homeoffice": office}
    await home.start(Room(plans=plans))
    await home.at("08:00:00")
    assert [home.setpoint(A), home.setpoint(B)] == [wanted, wanted]


FAILURES = ["raises an error", "answers nothing"]


async def failing_day_script(home, how: str) -> Room:
    """Start a room whose day script fails, and return the room's day script."""
    if how == "raises an error":
        room = Room(extra={"day_script": "script.broken_day"})
        await home.start(room)
        error = HomeAssistantError("the day script failed")
        optional = SupportsResponse.OPTIONAL
        async_mock_service(
            home.hass, "script", "broken_day", raise_exception=error, supports_response=optional
        )
        return room
    silent = {"silent_day": {"sequence": [{"stop": "No answer", "error": True}]}}
    room = Room(extra={"day_script": "script.silent_day"})
    await home.start(room, scripts=silent)
    return room


@pytest.mark.parametrize("how", FAILURES)
@pytest.mark.parametrize("days, wanted", [(0, 17.0), (5, 21.0)], ids=["monday", "saturday"])
async def test_a_failing_day_script_lets_the_weekday_decide(home, how, days, wanted):
    """The day script fails: Monday is a working day, Saturday a free day (08:00: 17 / 21 °C)."""
    await failing_day_script(home, how)
    await home.at("08:00:00", days=days)
    assert [home.setpoint(A), home.setpoint(B)] == [wanted, wanted]


@pytest.mark.xfail(
    strict=True,
    reason="a day script that does not exist cannot be called, and continue_on_error does not "
    "cover that (ServiceNotFound): the room's run stops before it writes anything",
)
async def test_a_missing_day_script_lets_the_weekday_decide(home):
    """The day script does not exist: the weekday should decide, as when it fails."""
    await home.start(Room(extra={"day_script": "script.no_such_day"}))
    await home.at("08:00:00")
    assert [home.setpoint(A), home.setpoint(B)] == [17.0, 17.0]
