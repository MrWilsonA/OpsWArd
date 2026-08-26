"""Author the OpsWArd campus collision + occlusion data.

The tactical room used to guess at rectangles, so avatars clipped through walls
and the "foreground" pass repainted slabs of floor on top of the player. This
tool is the single source of truth instead. It exports:

  public/game-assets/campus-collision.png  8-bit, 255 = walkable
  public/game-assets/campus-occluder.png   RGBA alpha stencil of furniture only
  src/lib/campus-layout.json               occluder rects + baselines + spawn

Geometry was traced from campus-00.png with tools/grid_crop.py. Every obstacle
doubles as an occluder: it is drawn over the avatar whenever the avatar's feet
sit above its baseline. Obstacles with a `base` are tall furniture - only the
bottom `base` pixels block, so a character can slip behind a shelf and be
covered by it, exactly like walking behind scenery in a 2D RPG.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public/game-assets/campus-loop-frames/campus-00.png"
COLLISION_PNG = ROOT / "public/game-assets/campus-collision.png"
OCCLUDER_PNG = ROOT / "public/game-assets/campus-occluder.png"
LAYOUT_JSON = ROOT / "src/lib/campus-layout.json"
DEBUG_PNG = ROOT / "tools/debug-campus-layout.png"

WORLD_WIDTH, WORLD_HEIGHT = 1536, 1024

# --- walkable surfaces -------------------------------------------------------
FLOORS: list[tuple[int, int, int, int]] = [
    # Server Vault
    (58, 240, 405, 336),
    # Security Watch
    (88, 378, 400, 622),
    # Archive Library, plus the east aisle running up beside the shelves
    (96, 756, 444, 946),
    (440, 756, 480, 882),
    # Data Garden
    (1085, 170, 1500, 330),
    # Briefing Room
    (1095, 465, 1500, 620),
    # Pantry Lounge
    (1020, 760, 1500, 947),
    # Central hall + arrival landing
    (440, 186, 1065, 636),
    (490, 636, 1012, 890),
    (620, 890, 884, 966),
    # Doorway thresholds where the dividing wall is only a few pixels thick
    (400, 200, 448, 288),
    (396, 470, 448, 600),
    (1056, 240, 1098, 312),
    (1056, 480, 1100, 600),
    (462, 780, 500, 878),
    (1004, 780, 1042, 878),
]

# --- obstacles ---------------------------------------------------------------
# Default: solid across the whole footprint. through=True marks tall furniture
# standing against a wall - shelves, cabinets, counters, racks. Those never
# block, so a character can tuck in behind them when a room gets tight, and the
# occluder pass paints them back over the character. Anything a person could
# walk around instead (desks, tables, sofas, planters) stays solid.
OBSTACLES: list[dict] = [
    # Server Vault
    dict(id="vault-racks", rect=(100, 140, 340, 240)),
    dict(id="vault-cabinet", rect=(338, 140, 376, 240)),
    dict(id="vault-desk", rect=(138, 242, 310, 322)),
    # Security Watch
    dict(id="security-wall-screens", rect=(100, 372, 312, 464)),
    dict(id="security-desk", rect=(114, 462, 298, 560)),
    dict(id="security-shelf", rect=(312, 394, 364, 472)),
    dict(id="security-drawer", rect=(356, 458, 398, 494)),
    dict(id="security-planter", rect=(314, 576, 398, 620)),
    dict(id="security-cabinet-a", rect=(48, 404, 92, 494)),
    dict(id="security-cabinet-b", rect=(48, 500, 92, 562)),
    dict(id="security-cabinet-c", rect=(48, 566, 92, 626)),
    # Archive Library
    dict(id="archive-wall-shelves", rect=(50, 650, 440, 744)),
    dict(id="archive-dresser-a", rect=(40, 670, 96, 756)),
    dict(id="archive-dresser-b", rect=(202, 716, 244, 756)),
    dict(id="archive-plant-ne", rect=(436, 680, 486, 756)),
    dict(id="archive-shelf-left", rect=(97, 774, 147, 926)),
    dict(id="archive-shelf-right", rect=(391, 774, 437, 926)),
    dict(id="archive-cabinet-w", rect=(40, 828, 96, 948)),
    dict(id="archive-plant-sw", rect=(40, 770, 96, 828)),
    dict(id="archive-plant-se", rect=(444, 882, 486, 946)),
    dict(id="archive-south-wall", rect=(40, 946, 500, 970)),
    dict(id="archive-chair-left", rect=(189, 818, 233, 881)),
    dict(id="archive-chair-right", rect=(302, 818, 343, 881)),
    dict(id="archive-table", rect=(225, 813, 310, 897)),
    # Data Garden
    dict(id="garden-window-boxes", rect=(1150, 120, 1400, 170)),
    dict(id="garden-cabinet", rect=(1086, 120, 1130, 170)),
    dict(id="garden-console", rect=(1130, 120, 1160, 170)),
    dict(id="garden-beds", rect=(1129, 170, 1382, 314)),
    dict(id="garden-lamp-desk", rect=(1390, 120, 1446, 190)),
    dict(id="garden-side-desk", rect=(1446, 120, 1500, 190)),
    dict(id="garden-workstation", rect=(1377, 198, 1500, 332)),
    # Briefing Room
    dict(id="briefing-cabinets", rect=(1096, 370, 1466, 465)),
    dict(id="briefing-plant", rect=(1450, 370, 1500, 465)),
    dict(id="briefing-table", rect=(1140, 470, 1460, 615)),
    dict(id="briefing-south-wall", rect=(1080, 620, 1520, 650)),
    # Pantry Lounge
    dict(id="pantry-counter", rect=(1014, 674, 1330, 760)),
    dict(id="pantry-side-table", rect=(1370, 694, 1449, 760)),
    dict(id="pantry-plants-ne", rect=(1449, 680, 1495, 760)),
    dict(id="pantry-sofa", rect=(1114, 800, 1246, 864)),
    dict(id="pantry-chair-left", rect=(1072, 846, 1122, 913)),
    dict(id="pantry-chair-right", rect=(1245, 846, 1291, 913)),
    dict(id="pantry-coffee-table", rect=(1134, 874, 1228, 920)),
    dict(id="pantry-lamp", rect=(1238, 812, 1266, 851)),
    dict(id="pantry-dining", rect=(1350, 750, 1462, 862)),
    dict(id="pantry-planter-s", rect=(1341, 905, 1453, 947)),
    dict(id="pantry-plant-sw", rect=(1014, 905, 1056, 947)),
    dict(id="pantry-plant-se", rect=(1448, 891, 1491, 947)),
    # Central hall - north pods
    dict(id="nw-pod-wall", rect=(480, 240, 508, 430)),
    dict(id="ne-pod-wall", rect=(996, 240, 1024, 430)),
    dict(id="nw-desk", rect=(530, 250, 686, 355)),
    dict(id="nw-plant", rect=(495, 263, 540, 349)),
    dict(id="nw-planter", rect=(484, 368, 602, 426)),
    dict(id="ne-desk", rect=(814, 250, 970, 355)),
    dict(id="ne-plant", rect=(812, 263, 856, 349)),
    dict(id="ne-planter", rect=(896, 368, 1018, 426)),
    dict(id="ne-cabinet", rect=(952, 248, 1000, 355)),
    # Central hall - command table (smooth circular ellipse covering table + surrounding chairs)
    dict(id="command-table", rect=(633, 398, 873, 634), shape="ellipse", occlude=False),
    # Central hall - south pods & doorway partitions
    dict(id="sw-pod-wall", rect=(478, 574, 508, 810)),
    dict(id="sw-pod-left-post", rect=(478, 740, 510, 810)),
    dict(id="sw-pod-top-rail", rect=(506, 744, 560, 768)),
    dict(id="sw-pod-right-post", rect=(558, 744, 604, 810)),
    dict(id="sw-plant", rect=(495, 644, 540, 730)),
    dict(id="sw-planter", rect=(484, 574, 602, 636)),
    dict(id="sw-desk", rect=(530, 648, 686, 750)),
    dict(id="se-pod-wall", rect=(996, 574, 1024, 810)),
    dict(id="se-pod-left-post", rect=(896, 744, 946, 810)),
    dict(id="se-pod-top-rail", rect=(942, 744, 996, 768)),
    dict(id="se-pod-right-post", rect=(994, 730, 1024, 810)),
    dict(id="pantry-west-wall", rect=(1000, 636, 1044, 786)),
    dict(id="se-plant", rect=(812, 644, 856, 730)),
    dict(id="se-planter", rect=(896, 574, 1016, 636)),
    dict(id="se-desk", rect=(814, 648, 970, 750)),
    dict(id="se-cabinet", rect=(952, 648, 1000, 755)),
    dict(id="south-planter-w", rect=(547, 763, 592, 808)),
    dict(id="south-planter-e", rect=(880, 763, 925, 808)),
]

SPAWN = (752, 856)

# How far a floor colour may bleed inwards from an occluder rect edge.
EDGE_MARGIN = 18

# How deep the avatar may step into walk-behind furniture.
THROUGH_DEPTH = 26

# Walk-behind pieces no taller than this are passable end to end.
SHORT_PIECE = 62


def rasterise(rect, shape: str, out: np.ndarray, value: bool) -> None:
    x1, y1, x2, y2 = rect
    if y2 <= y1 or x2 <= x1:
        return
    if shape == "ellipse":
        ys, xs = np.mgrid[y1:y2, x1:x2]
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        rx, ry = max(1.0, (x2 - x1) / 2), max(1.0, (y2 - y1) / 2)
        mask = ((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2 <= 1
        region = out[y1:y2, x1:x2]
        region[mask] = value
    else:
        out[y1:y2, x1:x2] = value


def build_masks():
    walkable = np.zeros((WORLD_HEIGHT, WORLD_WIDTH), bool)
    for rect in FLOORS:
        rasterise(rect, "rect", walkable, True)

    occluder = np.zeros_like(walkable)
    for obstacle in OBSTACLES:
        x1, y1, x2, y2 = obstacle["rect"]
        shape = obstacle.get("shape", "rect")
        if obstacle.get("occlude", True):
            rasterise((x1, y1, x2, y2), shape, occluder, True)
        if obstacle.get("through"):
            depth = y2 - y1 if y2 - y1 <= SHORT_PIECE else THROUGH_DEPTH
            rasterise((x1, y2 - depth, x2, y2), shape, walkable, True)
            if y2 - depth > y1:
                rasterise((x1, y1, x2, y2 - depth), shape, walkable, False)
        else:
            rasterise((x1, y1, x2, y2), shape, walkable, False)
    return walkable, occluder


def kmeans(points: np.ndarray, clusters: int, iterations: int = 10) -> np.ndarray:
    if points.shape[0] > 20000:
        points = points[:: points.shape[0] // 20000 + 1]
    centres = points[np.linspace(0, points.shape[0] - 1, clusters).astype(int)].copy()
    for _ in range(iterations):
        distances = ((points[:, None, :] - centres[None, :, :]) ** 2).sum(axis=2)
        assignment = distances.argmin(axis=1)
        for index in range(clusters):
            member = points[assignment == index]
            if member.size:
                centres[index] = member.mean(axis=0)
    return centres


def carve_floor_from_occluder(rgb: np.ndarray, walkable: np.ndarray, occluder: np.ndarray) -> np.ndarray:
    """Drop floor-coloured pixels out of every occluder rect.

    The occluder layer is painted over the avatar, so floor left inside a rect
    would blank out the ground around the character. Each rect samples the real
    floor colours from the walkable ring just outside itself, clears everything
    that matches, and keeps only the leaks reachable from the rect border so a
    dark gap inside a bookshelf stays opaque.
    """
    alpha = occluder.copy()
    sample = rgb.astype(np.float32)
    weights = np.array([1.0, 1.05, 0.95], np.float32)
    open_floor = walkable & ~occluder

    for obstacle in OBSTACLES:
        if not obstacle.get("occlude", True):
            continue
        x1, y1, x2, y2 = obstacle["rect"]
        pad = 16
        rx1, ry1 = max(0, x1 - pad), max(0, y1 - pad)
        rx2, ry2 = min(WORLD_WIDTH, x2 + pad), min(WORLD_HEIGHT, y2 + pad)

        ring = np.zeros((WORLD_HEIGHT, WORLD_WIDTH), bool)
        ring[ry1:ry2, rx1:rx2] = True
        ring[y1:y2, x1:x2] = False
        ring &= open_floor
        colours = sample[ring]
        if colours.shape[0] < 60:
            continue

        references = kmeans(colours, clusters=4)
        window = sample[y1:y2, x1:x2]
        matches = np.zeros(window.shape[:2], bool)
        for reference in references:
            delta = (window - reference) * weights
            matches |= np.sqrt((delta * delta).sum(axis=2)) <= 26.0

        labels, count = ndimage.label(matches)
        if not count:
            continue
        border = set(labels[0, :]) | set(labels[-1, :]) | set(labels[:, 0]) | set(labels[:, -1])
        border.discard(0)
        if not border:
            continue
        leaking = np.isin(labels, sorted(border))
        leaking = ndimage.binary_opening(leaking, np.ones((3, 3), bool))
        leaking = ndimage.binary_propagation(leaking, mask=matches)
        # Floor only ever intrudes around the outside of a piece of furniture,
        # so refuse to carve deeper than a margin. Interiors stay opaque.
        inner = np.ones_like(leaking)
        inner[EDGE_MARGIN:-EDGE_MARGIN or None, EDGE_MARGIN:-EDGE_MARGIN or None] = False
        alpha[y1:y2, x1:x2] &= ~(leaking & inner)

    # Sweep up the dust the carve leaves behind: a handful of stray floor pixels
    # would read as grit floating over the avatar.
    labels, count = ndimage.label(alpha)
    if count:
        sizes = ndimage.sum_labels(alpha, labels, range(1, count + 1))
        keep = np.zeros(count + 1, bool)
        keep[1:][sizes >= 24] = True
        alpha = keep[labels]
    return alpha


def main() -> int:
    rgb = np.asarray(Image.open(SOURCE).convert("RGB"))
    walkable, occluder = build_masks()
    alpha = carve_floor_from_occluder(rgb, walkable, occluder)

    Image.fromarray(np.where(walkable, 255, 0).astype(np.uint8), "L").save(COLLISION_PNG)
    stencil = np.zeros((WORLD_HEIGHT, WORLD_WIDTH, 4), np.uint8)
    stencil[..., 3] = np.where(alpha, 255, 0)
    Image.fromarray(stencil, "RGBA").save(OCCLUDER_PNG)

    layout = {
        "world": {"width": WORLD_WIDTH, "height": WORLD_HEIGHT},
        "spawn": {"x": SPAWN[0], "y": SPAWN[1]},
        "occluders": [
            {
                "id": obstacle["id"],
                "x": obstacle["rect"][0],
                "y": obstacle["rect"][1],
                "width": obstacle["rect"][2] - obstacle["rect"][0],
                "height": obstacle["rect"][3] - obstacle["rect"][1],
                "baseline": obstacle["rect"][3],
                "through": bool(obstacle.get("through")),
            }
            for obstacle in OBSTACLES
            if obstacle.get("occlude", True)
        ],
    }
    LAYOUT_JSON.write_text(json.dumps(layout, indent=2) + "\n", encoding="utf-8")

    debug = rgb.copy()
    debug[walkable] = np.clip(debug[walkable] * 0.5 + np.array([40, 230, 120]) * 0.5, 0, 255).astype(np.uint8)
    edge = alpha & ~ndimage.binary_erosion(alpha, np.ones((3, 3), bool))
    debug[edge] = (255, 80, 200)
    Image.fromarray(debug).resize((1024, 683), Image.NEAREST).save(DEBUG_PNG)

    print(f"walkable {walkable.mean():.3f} · occluder {alpha.mean():.3f} · {len(OBSTACLES)} obstacles")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
