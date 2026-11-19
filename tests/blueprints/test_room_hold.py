"""The room blueprint's holds: windows, the room sensor, the heating switch, changed thermostats.

See home.py for the test home (Monday 2026-11-16, room "Bad" with two thermostats and the starter
plans: Werktag 07:00–17:00 17 °C, 17:00 21 °C).
"""

import pytest
from home import OFF, Room

A, B, C = "climate.bad_a", "climate.bad_b", "climate.bad_c"
WINDOW = "input_boolean.bad_window"
SWITCH = "input_boolean.bad_heating"
SENSOR = "sensor.bad_temperature"
WINDOWS = {"windows": [WINDOW], "window_delay": 30}


async def room_at_eight(home, room: Room) -> None:
    """Start a room with its window closed, at 08:00 (17 °C), and forget the first writes."""
    home.set(WINDOW, "off")
    await home.start(room)
    await home.at("08:00:00")
    await home.run()
    home.taken()


async def test_a_window_turns_down_and_closing_gives_the_setpoints_back(home):
    """Open for the delay: 5 °C, setpoints saved; closed: a setpoint set by hand comes back."""
    await room_at_eight(home, Room(extra=WINDOWS))
    home.thermostat(A, 20)
    home.set(WINDOW, "on")
    await home.wait(10)
    assert home.taken() == []
    await home.wait(25)
    assert home.taken() == [[A, OFF], [B, OFF]]
    assert home.stored()["_open"] == [20.0, 17.0]
    home.set(WINDOW, "off")
    await home.settle()
    assert home.taken() == [[A, 20.0], [B, 17.0]]
    assert "_open" not in home.stored()


async def test_a_short_opening_does_nothing(home):
    """A window open for less than the delay changes nothing."""
    await room_at_eight(home, Room(extra=WINDOWS))
    home.set(WINDOW, "on")
    await home.wait(10)
    home.set(WINDOW, "off")
    await home.wait(60)
    assert home.taken() == []
    assert "_open" not in home.stored()


async def test_a_new_period_while_open_is_given_on_closing(home):
    """A period that starts while the window is open writes nothing; closing gives its value."""
    home.set(WINDOW, "off")
    await home.start(Room(extra=WINDOWS))
    await home.at("16:59:00")
    await home.run()
    home.set(WINDOW, "on")
    await home.wait(31)
    home.taken()
    await home.at("17:00:01")
    assert home.taken() == []
    assert home.stored()["_open"] == [21.0, 21.0]
    home.set(WINDOW, "off")
    await home.settle()
    assert home.taken() == [[A, 21.0], [B, 21.0]]


async def closed_by_the_room_sensor(home) -> None:
    """Start a room at 19 °C with a room sensor; at 07:00 (17 °C) it closes the valves."""
    home.set(SENSOR, "19.0")
    extra = {"room_sensor": SENSOR, "room_margin": 0.5, "room_hold": 10}
    await home.start(Room(extra=extra))
    await home.at("06:30:00")
    assert [home.setpoint(A), home.setpoint(B)] == [21.0, 21.0]
    home.taken()
    await home.at("07:00:01")


async def test_the_room_sensor_closes_the_valves_and_releases_them(home):
    """Room 19 °C at the 17 °C period: closed; cooled to the setpoint: released after the hold."""
    await closed_by_the_room_sensor(home)
    assert home.taken() == [[A, OFF], [B, OFF]]
    assert home.stored()["_open"] == [17.0, 17.0]
    assert home.stored()["_rc"] == 1
    await home.at("07:05:00")
    home.set(SENSOR, "16.8")
    await home.settle()
    assert home.taken() == []
    await home.at("07:11:00")
    home.set(SENSOR, "16.7")
    await home.settle()
    assert home.taken() == [[A, 17.0], [B, 17.0]]
    assert "_rc" not in home.stored()


async def test_the_heating_switch_holds_off_and_ignores_windows(home):
    """Switched off: 5 °C, a window changes nothing; switched on: the plan's temperature."""
    home.set(SWITCH, "on")
    await room_at_eight(home, Room(extra={**WINDOWS, "heating_switch": SWITCH}))
    home.set(SWITCH, "off")
    await home.settle()
    assert home.taken() == [[A, OFF], [B, OFF]]
    home.set(WINDOW, "on")
    await home.wait(31)
    home.set(WINDOW, "off")
    await home.settle()
    assert home.taken() == []
    assert "_open" not in home.stored()
    home.set(SWITCH, "on")
    await home.settle()
    assert home.taken() == [[A, 17.0], [B, 17.0]]


@pytest.mark.parametrize("changed", [[B, A], [A, C], [A]], ids=["moved", "replaced", "removed"])
async def test_thermostats_changed_while_held_return_to_the_plan(home, changed):
    """Setpoints saved for another list of thermostats are not given back to the wrong ones."""
    home.thermostat(C, 19)
    await room_at_eight(home, Room(extra=WINDOWS))
    home.thermostat(A, 20)
    home.thermostat(B, 23)
    home.set(WINDOW, "on")
    await home.wait(31)
    assert home.stored()["_open"] == [20.0, 23.0]
    assert isinstance(home.stored()["_th"], int)
    await home.reconfigure(Room(thermostats=changed, extra=WINDOWS))
    await home.run()
    assert home.stored()["_open"] == [17.0] * len(changed)
    home.set(WINDOW, "off")
    await home.settle()
    assert [home.setpoint(entity) for entity in changed] == [17.0] * len(changed)


async def test_a_state_saved_before_the_fingerprint_still_matches(home):
    """A state without _th (saved by 0.13.0) counts as saved for the current thermostats."""
    await room_at_eight(home, Room(extra=WINDOWS))
    old = '{"climate.bad_a": [17.0], "climate.bad_b": [17.0], "_open": [20.0, 23.0]}'
    data = {"entity_id": Room().state, "value": old}
    await home.hass.services.async_call("input_text", "set_value", data, blocking=True)
    await home.run()
    assert home.taken() == [[A, 20.0], [B, 23.0]]
    assert "_open" not in home.stored()
