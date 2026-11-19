"""The valve exercise: the room automation marks the room and calls script.weekheat_exercise.

See home.py for the test home (Monday 2026-11-16, room "Bad" with two thermostats; Werktag has
17 °C from 07:00 to 17:00).
"""

from home import OFF, Room

A, B = "climate.bad_a", "climate.bad_b"
# A room exercised on Mondays at 13:00, holding each position for 10 s.
EXERCISE = {"exercise_day": "mon", "exercise_time": "13:00:00", "exercise_wait": 10}
# What the exercise writes to both thermostats before it gives back their setpoints.
MOVES = [[entity, temp] for temp in (30.0, OFF, 30.0, OFF) for entity in (A, B)]


def state_values(home, entity: str) -> list:
    """Record every value a state takes from now on; return the list that fills."""
    values = []

    def changed(event):
        """Keep the new value."""
        if event.data["entity_id"] == entity and event.data["new_state"]:
            values.append(event.data["new_state"].state)

    home.hass.bus.async_listen("state_changed", changed)
    return values


async def test_the_exercise_moves_the_valves_and_gives_everything_back(home):
    """At its time: 30 °C and 5 °C twice, then the setpoints and modes from before."""
    room = Room(extra=EXERCISE)
    await home.start(room)
    await home.at("12:00:00")
    await home.run()
    home.thermostat(B, 17.0, mode="off")
    home.taken()
    marks = state_values(home, room.state)
    await home.at("13:00:00")
    assert home.taken() == [*MOVES, [A, 17.0], [B, 17.0]]
    assert home.modes == [[B, "heat"], [B, "off"]]
    assert any('"_ex": 1' in value for value in marks)
    assert home.stored() == {A: [17.0], B: [17.0]}


async def test_run_now_exercises_only_the_rooms_it_names(home):
    """The event weekheat_exercise with another room's id leaves this room alone; without, not."""
    await home.start(Room(extra=EXERCISE))
    await home.at("12:00:00")
    await home.run()
    home.taken()
    home.hass.bus.async_fire("weekheat_exercise", {"entity_id": "automation.kitchen"})
    await home.settle()
    assert home.taken() == []
    home.hass.bus.async_fire("weekheat_exercise", {})
    await home.settle()
    assert home.taken() == [*MOVES, [A, 17.0], [B, 17.0]]


async def test_without_the_script_the_room_says_so_and_heats_on(home):
    """No script.weekheat_exercise: a notification, and the plan applies as usual."""
    await home.start(Room(extra=EXERCISE), exercise=False)
    await home.at("12:00:00")
    home.hass.bus.async_fire("weekheat_exercise", {})
    await home.settle()
    assert home.taken() == [[A, 17.0], [B, 17.0]]
    note = home.notifications()["weekheat_bad_exercise"]
    assert "script.weekheat_exercise" in note["message"]
