from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "game-assets"
BASE_MASTER = ASSETS / "outdoor-v10-connected-master.png"
SOURCE = ASSETS / "outdoor-v11-house-source.png"
REPAIR = ASSETS / "outdoor-v11-house-repair.png"
MASTER = ASSETS / "outdoor-v11-connected-master.png"
PREVIEW = ASSETS / "outdoor-v11-connected-preview.png"
TILES = ASSETS / "outdoor-v11-seamless-tiles"

CROP_BOX = (1880, 400, 2904, 1424)
HOUSE_MASK_BOX = (90, 330, 950, 835)


def prepare() -> None:
    Image.open(BASE_MASTER).convert("RGB").crop(CROP_BOX).save(SOURCE, optimize=True)


def compose() -> None:
    master = Image.open(BASE_MASTER).convert("RGB")
    repair = Image.open(REPAIR).convert("RGB")
    if repair.size != (1024, 1024):
        repair = repair.resize((1024, 1024), Image.Resampling.NEAREST)

    # The feather lives entirely in grass/path around the building, so no mask
    # boundary crosses the roof or facade.
    mask = Image.new("L", (1024, 1024), 0)
    ImageDraw.Draw(mask).rounded_rectangle(HOUSE_MASK_BOX, radius=110, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(36))
    master.paste(repair, (CROP_BOX[0], CROP_BOX[1]), mask)

    master.save(MASTER, optimize=True)
    master.resize((1536, 1024), Image.Resampling.NEAREST).save(PREVIEW, optimize=True)
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
    parser.add_argument("stage", choices=("prepare", "compose"))
    args = parser.parse_args()
    prepare() if args.stage == "prepare" else compose()
