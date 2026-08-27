from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "game-assets"
MASTER = ASSETS / "outdoor-v9-connected-master.png"
SOURCES = ASSETS / "outdoor-v10-spot-sources"
REPAIRS = ASSETS / "outdoor-v10-spot-repairs"
TILES = ASSETS / "outdoor-v10-seamless-tiles"

# Each 1024x1024 crop contains one user-reported residual blend rectangle.
SPOTS = {
    "grass-path": (114, 584, 1138, 1608),
    "river-corner": (901, 499, 1925, 1523),
    "cottage-edge": (1654, 487, 2678, 1511),
}

# Rounded masks avoid introducing another straight-edged patch boundary.
MASK_BOXES = {
    "grass-path": (70, 320, 954, 704),
    "river-corner": (300, 300, 724, 724),
    # Stop before the cottage silhouette. The previous wider mask crossed the
    # facade and made the otherwise intact house look like two joined images.
    "cottage-edge": (320, 390, 555, 680),
}

MASK_BLURS = {
    "grass-path": 72,
    "river-corner": 72,
    "cottage-edge": 24,
}


def prepare() -> None:
    SOURCES.mkdir(parents=True, exist_ok=True)
    master = Image.open(MASTER).convert("RGB")
    for name, box in SPOTS.items():
        master.crop(box).save(SOURCES / f"{name}.png", optimize=True)


def feathered_mask(
    size: tuple[int, int], box: tuple[int, int, int, int], blur: int = 72
) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=min(120, blur * 3), fill=255)
    return mask.filter(ImageFilter.GaussianBlur(blur))


def load_repair(name: str) -> Image.Image:
    repair = Image.open(REPAIRS / f"{name}.png").convert("RGB")
    # Built-in image editing may return a square larger than the requested
    # edit target. Normalize it before any placement so landmarks remain
    # registered to the original 1024x1024 crop.
    if repair.size != (1024, 1024):
        repair = repair.resize((1024, 1024), Image.Resampling.NEAREST)
    return repair


def compose_alpha() -> Image.Image:
    master = Image.open(MASTER).convert("RGB")
    for name, crop_box in SPOTS.items():
        repair = load_repair(name)
        mask = feathered_mask(repair.size, MASK_BOXES[name], MASK_BLURS[name])
        master.paste(repair, (crop_box[0], crop_box[1]), mask)
    return master


def compose_clone() -> Image.Image:
    master = cv2.imread(str(MASTER), cv2.IMREAD_COLOR)
    for name, crop_box in SPOTS.items():
        repair = cv2.cvtColor(np.asarray(load_repair(name)), cv2.COLOR_RGB2BGR)
        mask_image = feathered_mask((1024, 1024), MASK_BOXES[name], MASK_BLURS[name])
        mask = np.asarray(mask_image, dtype=np.uint8)
        center = ((crop_box[0] + crop_box[2]) // 2, (crop_box[1] + crop_box[3]) // 2)
        master = cv2.seamlessClone(repair, master, mask, center, cv2.NORMAL_CLONE)
    return Image.fromarray(cv2.cvtColor(master, cv2.COLOR_BGR2RGB))


def save_final(master: Image.Image) -> None:
    master_path = ASSETS / "outdoor-v10-connected-master.png"
    preview_path = ASSETS / "outdoor-v10-connected-preview.png"
    master.save(master_path, optimize=True)
    master.resize((1536, 1024), Image.Resampling.NEAREST).save(preview_path, optimize=True)

    TILES.mkdir(parents=True, exist_ok=True)
    for tile_y in range(2):
        for tile_x in range(2):
            box = (
                tile_x * 1536,
                tile_y * 1024,
                (tile_x + 1) * 1536,
                (tile_y + 1) * 1024,
            )
            master.crop(box).save(TILES / f"outdoor-{tile_x}-{tile_y}.png", optimize=True)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("stage", choices=("prepare", "alpha", "clone"))
    args = parser.parse_args()
    if args.stage == "prepare":
        prepare()
    elif args.stage == "alpha":
        save_final(compose_alpha())
    else:
        save_final(compose_clone())
