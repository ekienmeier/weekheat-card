"""The room blueprint's plan-name rule against the cases shared with the card (review M16).

tests/fixtures/plan-names.json holds the cases; tests/domain/plan-names.test.mjs checks the card's
matchPlan and slugify with them. Here the blueprint's own templates (plan_hits, named_plan) and
Home Assistant's slugify filter are rendered with Home Assistant's template engine.
"""

import json
from pathlib import Path

import pytest
import yaml
from homeassistant.helpers.template import Template

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = json.loads((ROOT / "tests/fixtures/plan-names.json").read_text(encoding="utf-8"))


class BlueprintLoader(yaml.SafeLoader):
    """A YAML loader that reads !input as the input's name."""


BlueprintLoader.add_constructor("!input", lambda loader, node: loader.construct_scalar(node))


def room_templates() -> dict:
    """Return the room blueprint's variables step that picks the plan (it holds plan_hits)."""
    path = ROOT / "blueprints/automation/weekheat_room.yaml"
    doc = yaml.load(path.read_text(encoding="utf-8"), Loader=BlueprintLoader)
    steps = [step["variables"] for step in doc["actions"] if "variables" in step]
    return next(step for step in steps if "plan_hits" in step)


def render(hass, text: str, variables: dict):
    """Render a template as Home Assistant renders a variable (the result parsed)."""
    return Template(text, hass).async_render(variables)


@pytest.mark.parametrize("name, slug", FIXTURE["slugs"])
async def test_slugify_gives_the_slugs_the_card_makes(hass, name, slug):
    """Home Assistant's slugify gives the slugs the card's slugify makes (L7)."""
    assert render(hass, "{{ name | slugify }}", {"name": name}) == slug


@pytest.mark.parametrize("case", FIXTURE["cases"], ids=lambda case: case["about"])
async def test_a_plan_name_picks_the_plan_the_card_picks(hass, case):
    """The room blueprint picks the plan that the card's matchPlan picks (M16, H2)."""
    for entity, friendly in case["plans"]:
        hass.states.async_set(entity, "on", {"friendly_name": friendly} if friendly else {})
    templates = room_templates()
    variables = {
        "room_name": case["room"],
        "plan_list": [entity for entity, _ in case["plans"]],
        "day": {"plan": case["name"] or None},
    }
    variables["plan_hits"] = render(hass, templates["plan_hits"], variables)
    named = render(hass, templates["named_plan"], variables)
    assert (named or None) == case["match"]
