"""Save a blueprint file of this repo to Home Assistant (blueprint/save), overwriting the copy there.

Usage: python3 tools/deploy_blueprint.py blueprints/script/weekheat_day.yaml
The HA path is ekienmeier/<file name>, as an import of the GitHub URL would make it.
"""
import sys
from pathlib import Path

from ha import HA

REPO = "https://github.com/ekienmeier/weekheat-card/blob/main/"

for name in sys.argv[1:]:
    p = Path(name)
    domain = p.parent.name  # blueprints/<domain>/<file>
    HA().ws({"type": "blueprint/save", "domain": domain, "path": f"ekienmeier/{p.name}",
             "yaml": p.read_text(), "source_url": REPO + p.as_posix(), "allow_override": True})
    print(f"saved {domain}/ekienmeier/{p.name}")
