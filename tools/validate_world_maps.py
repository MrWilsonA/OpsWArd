"""Validate non-indoor map spawn, NPC and portal reachability on an 8px grid."""

from collections import deque
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
COLLIDERS = ROOT / "src" / "lib" / "map-colliders"
GRID = 8
PROBES = [(0, 0), (6, 0), (-6, 0), (0, 4), (0, -4), (4.2, 2.8), (-4.2, 2.8), (4.2, -2.8), (-4.2, -2.8)]

TARGETS = {
    "outdoor": [(748, 342), (620, 395), (885, 402), (585, 535), (975, 525), (755, 705), (748, 312), (1168, 948), (1274, 330), (590, 900), (250, 360), (1220, 585)],
    "greenhouse": [(768, 880), (755, 330), (1110, 565), (470, 685), (768, 930), (770, 260)],
    "relay": [(768, 880), (755, 300), (1000, 690), (710, 820), (768, 930), (975, 465)],
    "workshop": [(768, 880), (500, 310), (1015, 610), (760, 880), (768, 930), (1020, 470)],
    "lodge": [(768, 900), (760, 405), (510, 580), (1020, 580), (768, 930)],
    "cottage": [(768, 885), (745, 380), (480, 700), (925, 760), (768, 930), (1360, 310)],
}


def inside(point, box):
    x, y = point
    if box.get("shape") != "ellipse":
        return box["x1"] <= x <= box["x2"] and box["y1"] <= y <= box["y2"]
    cx, cy = (box["x1"] + box["x2"]) / 2, (box["y1"] + box["y2"]) / 2
    rx, ry = (box["x2"] - box["x1"]) / 2, (box["y2"] - box["y1"]) / 2
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1


def open_point(data, point):
    x, y = point
    for dx, dy in PROBES:
        probe = (x + dx, y + 3 + dy)
        if not any(inside(probe, floor) for floor in data["floors"]):
            return False
        if any(inside(probe, obstacle) for obstacle in data["obstacles"]):
            return False
    return True


def reachable(data, start):
    start = (round(start[0] / GRID), round(start[1] / GRID))
    queue = deque([start])
    seen = {start}
    while queue:
        gx, gy = queue.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nxt = gx + dx, gy + dy
            if nxt in seen or not open_point(data, (nxt[0] * GRID, nxt[1] * GRID)):
                continue
            seen.add(nxt)
            queue.append(nxt)
    return seen


def main():
    failures = []
    for map_id, targets in TARGETS.items():
        data = json.loads((COLLIDERS / f"{map_id}.json").read_text())
        open_targets = [open_point(data, point) for point in targets]
        if not all(open_targets):
            failures.extend(f"{map_id}: blocked target {point}" for point, status in zip(targets, open_targets) if not status)
            continue
        seen = reachable(data, targets[0])
        for point in targets[1:]:
            grid_point = (round(point[0] / GRID), round(point[1] / GRID))
            if grid_point not in seen:
                failures.append(f"{map_id}: unreachable target {point}")
        print(f"{map_id}: {len(targets)} targets open, {len(seen)} grid nodes reachable")
    if failures:
        raise SystemExit("\n".join(failures))
    print("all non-indoor map targets are open and connected")


if __name__ == "__main__":
    main()
