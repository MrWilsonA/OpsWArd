"""Create small transparent semantic animation layers for every world map."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "game-assets"
OUT = ASSETS / "map-animation-overlays-v2"
FRAME_COUNT = 10

MAPS = {
    "greenhouse": {
        "source": ASSETS / "greenhouse-interior-v1.png",
        "screens": [(650, 105, 895, 225), (1190, 185, 1435, 330)],
        "plants": [(45, 45, 1490, 205), (380, 275, 1165, 790), (40, 820, 1495, 930)],
        "particles": [(350, 310), (720, 370), (1050, 550), (550, 690), (980, 760)],
    },
    "relay": {
        "source": ASSETS / "relay-interior-v1.png",
        "screens": [(640, 55, 900, 220), (990, 55, 1360, 220), (1180, 345, 1435, 660)],
        "plants": [], "particles": [],
    },
    "workshop": {
        "source": ASSETS / "workshop-interior-v1.png",
        "screens": [(650, 45, 880, 205), (40, 260, 420, 430), (560, 300, 960, 590), (565, 625, 940, 820)],
        "plants": [], "particles": [],
    },
    "lodge": {
        "source": ASSETS / "lodge-interior-v2.png",
        "screens": [(640, 45, 900, 210), (55, 175, 190, 775), (640, 295, 830, 470), (370, 610, 570, 790), (900, 610, 1085, 790)],
        "plants": [], "particles": [],
    },
    "cottage": {
        "source": ASSETS / "cottage-interior-v1.png",
        "screens": [(70, 55, 485, 360), (580, 100, 980, 330), (1060, 315, 1345, 500), (550, 440, 955, 640)],
        "plants": [], "particles": [],
    },
}


def rect_mask(height: int, width: int, boxes: list[tuple[int, int, int, int]]) -> np.ndarray:
    mask = np.zeros((height, width), dtype=bool)
    for x1, y1, x2, y2 in boxes:
        mask[y1:y2, x1:x2] = True
    return mask


def save_overlay(path: Path, rgb: np.ndarray, changed: np.ndarray) -> None:
    rgba = np.zeros((*changed.shape, 4), dtype=np.uint8)
    clipped = np.clip(rgb, 0, 255).astype(np.uint8)
    rgba[..., :3][changed] = clipped[changed]
    rgba[..., 3] = changed.astype(np.uint8) * 255
    Image.fromarray(rgba, "RGBA").save(path, optimize=True)


def build_outdoor() -> None:
    base = np.asarray(Image.open(ASSETS / "opsward-outdoor-v4.png").convert("RGB"))
    target = OUT / "outdoor"
    target.mkdir(parents=True, exist_ok=True)
    for index in range(FRAME_COUNT):
        frame = np.asarray(Image.open(ASSETS / "outdoor-v4-loop-frames" / f"outdoor-{index:02d}.png").convert("RGB"))
        changed = np.any(frame != base, axis=2)
        save_overlay(target / f"{index:02d}.png", frame, changed)


def build_interior(map_id: str, config: dict) -> None:
    base = np.asarray(Image.open(config["source"]).convert("RGB")).astype(np.int16)
    height, width = base.shape[:2]
    red, green, blue = base[..., 0], base[..., 1], base[..., 2]
    screen_roi = rect_mask(height, width, config["screens"])
    plant_roi = rect_mask(height, width, config["plants"])
    screen_colour = screen_roi & (green >= red + 7) & (blue >= red - 2) & (green > 45) & (green < 205)
    plant_colour = plant_roi & (green >= red + 10) & (green >= blue + 2) & (green > 42) & (green < 190)
    yy, xx = np.indices((height, width))
    target = OUT / map_id
    target.mkdir(parents=True, exist_ok=True)

    for index in range(FRAME_COUNT):
        animated = base.copy()
        scanline = screen_colour & (((yy + index * 3) % 23) < 2)
        data_tick = screen_colour & (((xx // 5 + yy // 7 + index * 2) % 31) == 0)
        leaf_tick = plant_colour & (((xx // 7 - yy // 5 + index) % 17) == 0)
        animated[scanline] += np.array([5, 14, 12])
        animated[data_tick] += np.array([9, 18, 7])
        animated[leaf_tick] += np.array([3, 10, 2])
        changed = scanline | data_tick | leaf_tick

        overlay = Image.fromarray(np.clip(animated, 0, 255).astype(np.uint8), "RGB")
        if config["particles"]:
            draw = ImageDraw.Draw(overlay)
            for particle_index, (origin_x, origin_y) in enumerate(config["particles"]):
                phase = (index + particle_index * 2) % FRAME_COUNT
                x = origin_x + phase - 5
                y = origin_y - phase * 2
                draw.rectangle((x, y, x + 1, y + 1), fill=(226, 222, 150))
                changed[y:y + 2, x:x + 2] = True
        save_overlay(target / f"{index:02d}.png", np.asarray(overlay), changed)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    build_outdoor()
    for map_id, config in MAPS.items():
        build_interior(map_id, config)
    files = list(OUT.glob("*/*.png"))
    print(f"created {len(files)} transparent animation overlays in {OUT}")


if __name__ == "__main__":
    main()
