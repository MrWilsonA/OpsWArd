from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "game-assets"
SOURCES = ASSETS / "outdoor-v9-seam-sources"
REPAIRS = ASSETS / "outdoor-v9-seam-repairs"
TILES = ASSETS / "outdoor-v9-seamless-tiles"


def feather_mask(size: tuple[int, int], axis: str, feather: int) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 255)
    pixels = mask.load()
    length = width if axis == "x" else height
    for position in range(length):
        distance = min(position, length - 1 - position)
        alpha = 255 if distance >= feather else round(255 * distance / feather)
        if axis == "x":
            for y in range(height):
                pixels[position, y] = alpha
        else:
            for x in range(width):
                pixels[x, position] = alpha
    return mask


def paste_corridor(
    canvas: Image.Image,
    repair: Image.Image,
    source_box: tuple[int, int, int, int],
    destination: tuple[int, int],
    axis: str,
    feather: int = 32,
) -> None:
    corridor = repair.crop(source_box).convert("RGB")
    canvas.paste(corridor, destination, feather_mask(corridor.size, axis, feather))


def build_vertical_stage() -> Image.Image:
    canvas = Image.open(SOURCES / "v6-full-draft.png").convert("RGB")
    top = Image.open(REPAIRS / "vertical-top.png").convert("RGB")
    bottom = Image.open(REPAIRS / "vertical-bottom.png").convert("RGB")

    # The repair inputs are 1536 px-wide crops centered on the original x=1536 join.
    # Only transplant 320 px around that join; all approved v6 artwork remains untouched.
    source_box = (608, 0, 928, 1024)
    paste_corridor(canvas, top, source_box, (1376, 0), "x")
    paste_corridor(canvas, bottom, source_box, (1376, 1024), "x")

    vertical_stage = SOURCES / "v9-vertical-stage.png"
    canvas.save(vertical_stage, optimize=True)

    # Horizontal repair inputs are centered on the y=1024 join after vertical repair.
    canvas.crop((0, 512, 1536, 1536)).save(SOURCES / "horizontal-left.png", optimize=True)
    canvas.crop((1536, 512, 3072, 1536)).save(SOURCES / "horizontal-right.png", optimize=True)
    return canvas


def build_final() -> Image.Image:
    canvas = Image.open(SOURCES / "v9-vertical-stage.png").convert("RGB")
    left = Image.open(REPAIRS / "horizontal-left.png").convert("RGB")
    right = Image.open(REPAIRS / "horizontal-right.png").convert("RGB")

    # Keep the horizontal edit equally narrow: 256 px around the original y=1024 join.
    source_box = (0, 384, 1536, 640)
    paste_corridor(canvas, left, source_box, (0, 896), "y", 28)
    paste_corridor(canvas, right, source_box, (1536, 896), "y", 28)

    master = ASSETS / "outdoor-v9-connected-master.png"
    canvas.save(master, optimize=True)

    TILES.mkdir(parents=True, exist_ok=True)
    for tile_y in range(2):
        for tile_x in range(2):
            box = (
                tile_x * 1536,
                tile_y * 1024,
                (tile_x + 1) * 1536,
                (tile_y + 1) * 1024,
            )
            canvas.crop(box).save(TILES / f"outdoor-{tile_x}-{tile_y}.png", optimize=True)

    canvas.resize((1536, 1024), Image.Resampling.NEAREST).save(
        ASSETS / "outdoor-v9-connected-preview.png", optimize=True
    )
    return canvas


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("stage", choices=("vertical", "final"))
    args = parser.parse_args()
    if args.stage == "vertical":
        build_vertical_stage()
    else:
        build_final()
