"""Save blueprint files of this repo to Home Assistant (blueprint/save), over the copies there.

Usage: python3 tools/deploy_blueprint.py blueprints/script/weekheat_day.yaml
The HA path is ekienmeier/<file name>, as an import of the GitHub URL would make it.
"""

import argparse
from pathlib import Path

from ha import HA

REPO = "https://github.com/ekienmeier/weekheat-card/blob/main/"
# The repository: source URLs are relative to it, wherever this runs.
ROOT = Path(__file__).resolve().parent.parent


def deploy(ha: HA, name: str):
    """Save one blueprint file (blueprints/<domain>/<file>) to Home Assistant."""
    path = Path(name).resolve()
    domain = path.parent.name
    source = REPO + path.relative_to(ROOT).as_posix()
    ha.ws({"type": "blueprint/save", "domain": domain, "path": f"ekienmeier/{path.name}",
           "yaml": path.read_text(), "source_url": source, "allow_override": True})
    print(f"saved {domain}/ekienmeier/{path.name}")


def main():
    """Save the blueprint files given on the command line."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("files", nargs="+", help="blueprint files, e.g. blueprints/script/...")
    ha = HA()
    for name in parser.parse_args().files:
        deploy(ha, name)


if __name__ == "__main__":
    main()
