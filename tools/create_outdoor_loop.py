"""Normalize the generated outdoor art and build a restrained 10-frame pixel loop.

All animation is clipped to semantic masks: water shimmer stays on water,
foliage motion stays inside foliage, and pollen is drawn only at authored spots.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "game-assets"
SOURCE = ASSETS / "opsward-outdoor-v4-source.png"
BASE = ASSETS / "opsward-outdoor-v4.png"
FRAME_DIR = ASSETS / "outdoor-v4-loop-frames"
TILE_DIR = ASSETS / "outdoor-v4-hires-tiles"
GIF = ASSETS / "opsward-outdoor-v4-loop.gif"
PREVIEW = ASSETS / "opsward-outdoor-v4-loop-preview.png"

WIDTH, HEIGHT = 1536, 1024
FRAME_COUNT = 10


def roi_mask(boxes: list[tuple[int, int, int, int]]) -> np.ndarray:
    mask = np.zeros((HEIGHT, WIDTH), dtype=bool)
    for x1, y1, x2, y2 in boxes:
        mask[y1:y2, x1:x2] = True
    return mask


def normalize_source() -> Image.Image:
    source = Image.open(SOURCE).convert("RGB")
    source = source.resize((WIDTH, HEIGHT), Image.Resampling.NEAREST)
    # Keep the generator's full 1536x1024 logical detail. Palette reduction
    # removes blended edge colours without halving the map resolution.
    return source.quantize(colors=240, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")


def main() -> None:
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    TILE_DIR.mkdir(parents=True, exist_ok=True)
    base = normalize_source()
    base.save(BASE, optimize=True)
    # Four streamable quadrants form a 9216x6144 physical map. The renderer
    # draws them back at logical size with smoothing disabled.
    for tile_y in range(2):
        for tile_x in range(2):
            tile = base.crop((tile_x * 768, tile_y * 512, (tile_x + 1) * 768, (tile_y + 1) * 512))
            tile = tile.resize((4608, 3072), Image.Resampling.NEAREST)
            tile.save(TILE_DIR / f"outdoor-{tile_x}-{tile_y}.png", optimize=True)
    pixels = np.asarray(base).copy()
    red, green, blue = pixels[..., 0], pixels[..., 1], pixels[..., 2]

    water_regions = roi_mask([
        (0, 0, 160, 1024),       # west river
        (610, 410, 965, 620),    # central pond
    ])
    water_colour = (
        (blue.astype(np.int16) >= red.astype(np.int16) + 4)
        & (green.astype(np.int16) >= red.astype(np.int16) + 7)
        & (blue > 48)
        & (green > 55)
    )
    water = water_regions & water_colour

    foliage_regions = roi_mask([
        (0, 0, 1536, 185),
        (0, 120, 330, 1024),
        (1260, 100, 1536, 1024),
        (300, 260, 1260, 980),
    ])
    foliage_colour = (
        (green.astype(np.int16) >= red.astype(np.int16) + 10)
        & (green.astype(np.int16) >= blue.astype(np.int16) + 2)
        & (green > 48)
        & (green < 170)
    )
    foliage = foliage_regions & foliage_colour

    pollen_origins = [
        (560, 330), (760, 290), (980, 350), (1160, 420),
        (430, 500), (1040, 555), (540, 650), (950, 680),
        (360, 800), (1180, 760), (690, 745), (860, 850),
    ]

    frames: list[Image.Image] = []
    base16 = pixels.astype(np.int16)
    yy, xx = np.indices((HEIGHT, WIDTH))
    for frame_index in range(FRAME_COUNT):
        animated = base16.copy()

        # Two-pixel wide diagonal ripples travel only through water colours.
        wave = water & (((xx // 2 + yy // 4 + frame_index * 3) % 31) < 2)
        trough = water & (((xx // 3 - yy // 5 + frame_index * 2) % 37) < 2)
        animated[wave] += np.array([10, 17, 20], dtype=np.int16)
        animated[trough] -= np.array([5, 7, 3], dtype=np.int16)

        # A one-tone breathing shift reads as leaf sway without translating
        # foliage outside its own silhouette.
        leaf_phase = foliage & (((xx // 8 + yy // 8 + frame_index) % 10) == 0)
        leaf_shadow = foliage & (((xx // 10 - yy // 7 + frame_index) % 13) == 0)
        animated[leaf_phase] += np.array([4, 9, 2], dtype=np.int16)
        animated[leaf_shadow] -= np.array([3, 5, 2], dtype=np.int16)

        image = Image.fromarray(np.clip(animated, 0, 255).astype(np.uint8), "RGB")
        draw = ImageDraw.Draw(image)
        for particle_index, (origin_x, origin_y) in enumerate(pollen_origins):
            phase = (frame_index + particle_index * 3) % FRAME_COUNT
            x = origin_x + ((phase * 2 + particle_index) % 10) - 5
            y = origin_y - phase * 2
            colour = (235, 220, 145) if particle_index % 2 else (211, 232, 164)
            draw.rectangle((x, y, x + 1, y + 1), fill=colour)

        frame_path = FRAME_DIR / f"outdoor-{frame_index:02d}.png"
        image.save(frame_path, optimize=True)
        frames.append(image)

    frames[0].save(GIF, save_all=True, append_images=frames[1:], duration=150, loop=0, disposal=2)

    # A compact contact sheet makes it easy to spot overlay leaks at a glance.
    preview = Image.new("RGB", (WIDTH, HEIGHT // 2), (24, 18, 14))
    for index in range(5):
        thumb = frames[index * 2].resize((WIDTH // 5, HEIGHT // 2), Image.Resampling.NEAREST)
        preview.paste(thumb, (index * WIDTH // 5, 0))
    preview.save(PREVIEW, optimize=True)

    changed_counts = []
    base_array = np.asarray(base)
    for frame in frames:
        changed_counts.append(int(np.any(np.asarray(frame) != base_array, axis=2).sum()))
    print(f"base={BASE} size={base.size} palette={len(base.getcolors(WIDTH * HEIGHT) or [])}")
    print(f"frames={len(frames)} changed_pixels={min(changed_counts)}..{max(changed_counts)}")
    print(f"gif={GIF} preview={PREVIEW}")


if __name__ == "__main__":
    main()
