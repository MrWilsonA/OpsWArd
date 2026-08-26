"""Ensure every responder has exactly one authored home-map NPC position."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
component = (ROOT / "src" / "components" / "tactical-room" / "TacticalCanvasRoom.tsx").read_text()
roster = (ROOT / "src" / "lib" / "characters.ts").read_text()

array_names = [
    "INDOOR_NPCS", "OUTDOOR_NPC_SPOTS", "GREENHOUSE_NPCS", "RELAY_NPCS",
    "WORKSHOP_NPCS", "LODGE_NPCS", "COTTAGE_NPCS",
]
homes: dict[str, str] = {}
duplicates: list[str] = []
counts: dict[str, int] = {}
for name in array_names:
    match = re.search(rf"const {name}[^=]*= \[(.*?)\];", component, re.S)
    if not match:
        raise SystemExit(f"missing NPC array {name}")
    ids = re.findall(r"id: '([^']+)'", match.group(1))
    counts[name] = len(ids)
    for responder_id in ids:
        if responder_id in homes:
            duplicates.append(responder_id)
        homes[responder_id] = name

roster_ids = set(re.findall(r"^\s{4}id: '([^']+)'", roster, re.M))
home_ids = set(homes)
if duplicates or roster_ids != home_ids:
    raise SystemExit(
        f"duplicates={duplicates} missing={sorted(roster_ids-home_ids)} unknown={sorted(home_ids-roster_ids)}"
    )
print(f"distribution={counts}")
print(f"all {len(roster_ids)} responders have exactly one home map")
