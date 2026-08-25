"""Check that every room stays reachable from the spawn tile.

Reads the generated collision mask instead of a duplicated rectangle list, so
this always validates exactly what the game loads.
"""
from __future__ import annotations

import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
COLLISION_PNG = ROOT / "public/game-assets/campus-collision.png"
LAYOUT_JSON = ROOT / "src/lib/campus-layout.json"

# Mirrors the runtime foot ellipse in TacticalCanvasRoom.
FOOT_RADIUS_X = 9
FOOT_RADIUS_Y = 6
FOOT_OFFSET_Y = 4
GRID = 4

TARGETS = {
    "server_vault": (100, 300),
    "security_watch": (200, 600),
    "archive_library": (270, 930),
    "archive_east_aisle": (461, 800),
    "data_garden": (1110, 300),
    "briefing_room": (1130, 600),
    "pantry_lounge": (1040, 800),
    "central_north": (752, 220),
    "arrival_landing": (752, 940),
    "hall_between_pods": (752, 300),
    "hall_south": (760, 700),
}

NPCS = {
    "james": (350, 300),
    "enjidiren": (1110, 300),
    "miria": (350, 530),
    "george": (1130, 600),
    "theresa": (640, 830),
    "nuying": (880, 830),
}


def load_clearance() -> np.ndarray:
    walkable = np.asarray(Image.open(COLLISION_PNG).convert("L")) > 127
    ys, xs = np.mgrid[-FOOT_RADIUS_Y:FOOT_RADIUS_Y + 1, -FOOT_RADIUS_X:FOOT_RADIUS_X + 1]
    foot = (xs / FOOT_RADIUS_X) ** 2 + (ys / FOOT_RADIUS_Y) ** 2 <= 1
    clearance = ndimage.binary_erosion(walkable, foot)
    # The mask is indexed by the avatar's origin, which sits above its feet.
    return np.roll(clearance, -FOOT_OFFSET_Y, axis=0)


def flood(clearance: np.ndarray, start: tuple[int, int]) -> np.ndarray:
    height, width = clearance.shape
    seen = np.zeros((height // GRID + 1, width // GRID + 1), bool)
    sx, sy = start[0] // GRID, start[1] // GRID
    queue = deque([(sx, sy)])
    seen[sy, sx] = True
    while queue:
        x, y = queue.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or ny >= seen.shape[0] or nx >= seen.shape[1] or seen[ny, nx]:
                continue
            wx, wy = nx * GRID, ny * GRID
            if wy >= height or wx >= width or not clearance[wy, wx]:
                continue
            seen[ny, nx] = True
            queue.append((nx, ny))
    return seen


def main() -> int:
    layout = json.loads(LAYOUT_JSON.read_text(encoding="utf-8"))
    spawn = (layout["spawn"]["x"], layout["spawn"]["y"])
    clearance = load_clearance()
    if not clearance[spawn[1], spawn[0]]:
        print(f"FAIL spawn {spawn} is not standable")
        return 1

    reached = flood(clearance, spawn)
    failures = 0
    for name, (x, y) in TARGETS.items():
        standable = clearance[y, x]
        connected = reached[y // GRID, x // GRID]
        status = "ok" if standable and connected else "FAIL"
        if status == "FAIL":
            failures += 1
        print(f"{status:4} {name:26} ({x},{y}) standable={bool(standable)} reachable={bool(connected)}")

    for name, (x, y) in NPCS.items():
        standable = bool(clearance[y, x])
        if not standable:
            failures += 1
        print(f"{'ok' if standable else 'FAIL':4} npc:{name:22} ({x},{y}) standable={standable}")

    print(f"\n{failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
