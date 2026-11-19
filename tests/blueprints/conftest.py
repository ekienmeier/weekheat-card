"""Fixtures of the blueprint tests: a test home on Monday 2026-11-16, 05:00 in Vienna."""

import pytest
from home import Home


@pytest.fixture
def expected_lingering_timers() -> bool:
    """Allow timers left at the end of a test.

    The schedule helpers and the automations' time triggers keep their next timer when Home
    Assistant stops; Home Assistant's own tests of these integrations allow it the same way.
    """
    return True


@pytest.fixture
async def home(hass, freezer, tmp_path) -> Home:
    """Return a prepared test home; the test adds its rooms with `home.start`."""
    freezer.move_to("2026-11-16T05:00:00+01:00")
    test_home = Home(hass, freezer, tmp_path)
    await test_home.prepare()
    return test_home
