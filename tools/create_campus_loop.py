from pathlib import Path
from math import sin, tau

import numpy as np
from PIL import Image


SOURCE = Path("public/game-assets/opsward-campus-v2.png")
DESTINATION = Path("public/game-assets/opsward-campus-loop.gif")
PREVIEW = Path("public/game-assets/opsward-campus-loop-preview.png")
MASK_PREVIEW = Path("public/game-assets/opsward-campus-animation-mask.png")
FRAME_DIRECTORY = Path("public/game-assets/campus-loop-frames")
FRAME_COUNT = 10
FRAME_DURATION_MS = 150

# Broad regions around existing display panels. The colour mask below decides
# which pixels are lit screen pixels, so desks and monitor bezels stay untouched.
SCREEN_ROIS = [
    (181, 238, 254, 269),
    (109, 390, 299, 456),
    (142, 463, 260, 505),
    (550, 248, 653, 283),
    (842, 248, 948, 283),
    (548, 646, 654, 674),
    (840, 646, 949, 674),
    (1397, 239, 1474, 279),
    (620, 45, 885, 130),
]

# Plant regions cover foliage already present in the source artwork. Pots,
# furniture, walls and floor are excluded by the leaf-colour mask.
PLANT_ROIS = [
    (35, 195, 90, 315),
    (360, 387, 395, 447),
    (347, 573, 392, 629),
    (440, 675, 485, 765),
    (440, 870, 485, 975),
    (505, 85, 565, 170),
    (485, 270, 585, 420),
    (790, 270, 835, 365),
    (885, 75, 930, 175),
    (895, 270, 1005, 420),
    (1120, 95, 1495, 335),
    (1440, 390, 1495, 470),
    (1018, 682, 1085, 750),
    (1115, 680, 1178, 746),
    (1270, 680, 1325, 744),
    (1435, 680, 1496, 757),
    (1150, 875, 1230, 928),
    (1350, 912, 1496, 978),
]


def region_mask(height: int, width: int, rois: list[tuple[int, int, int, int]]) -> np.ndarray:
    mask = np.zeros((height, width), dtype=bool)
    for x0, y0, x1, y1 in rois:
        mask[y0:y1, x0:x1] = True
    return mask


def build_masks(base: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    height, width, _ = base.shape
    red = base[:, :, 0].astype(np.int16)
    green = base[:, :, 1].astype(np.int16)
    blue = base[:, :, 2].astype(np.int16)

    screen_region = region_mask(height, width, SCREEN_ROIS)
    # Warm wood has far less blue than the cream/teal display artwork.
    screen_colour = (
        (green > 82)
        & (blue > 42)
        & (green * 100 > red * 76)
        & (blue * 100 > red * 35)
    )
    screen_mask = screen_region & screen_colour

    plant_region = region_mask(height, width, PLANT_ROIS)
    leaf_colour = (
        (green > 42)
        & (green >= red + 4)
        & (green >= blue + 3)
    )
    leaf_mask = plant_region & leaf_colour
    return screen_mask, leaf_mask


def animate_screens(frame: np.ndarray, base: np.ndarray, mask: np.ndarray, index: int) -> None:
    yy, xx = np.indices(mask.shape)
    pulse = 0.95 + 0.055 * sin(index / FRAME_COUNT * tau)
    moving_scan = ((xx + index * 4) % 19) < 3
    fine_refresh = ((yy + index * 2) % 11) == 0

    scale = np.full(mask.shape, pulse, dtype=np.float32)
    scale[moving_scan] += 0.22
    scale[fine_refresh] -= 0.13
    animated = np.clip(base.astype(np.float32) * scale[:, :, None], 0, 255).astype(np.uint8)
    frame[mask] = animated[mask]


def animate_leaves(frame: np.ndarray, base: np.ndarray, mask: np.ndarray, index: int) -> None:
    phase = index / FRAME_COUNT * tau
    # Shift detail only where source and destination are both foliage. The
    # silhouette never grows new blocks or floats above the pot.
    shift = int(round(sin(phase) * 2))
    shifted_pixels = np.roll(base, shift, axis=1)
    shifted_mask = np.roll(mask, shift, axis=1)
    overlap = mask & shifted_mask
    frame[overlap] = shifted_pixels[overlap]

    yy, xx = np.indices(mask.shape)
    leaf_wave = 0.96 + 0.11 * np.sin((xx * 0.13) + phase)
    leaf_wave += 0.045 * np.sin((yy * 0.19) - phase)
    shaded = np.clip(frame.astype(np.float32) * leaf_wave[:, :, None], 0, 255).astype(np.uint8)
    frame[mask] = shaded[mask]


def render_frame(base: np.ndarray, screen_mask: np.ndarray, leaf_mask: np.ndarray, index: int) -> np.ndarray:
    frame = base.copy()
    animate_screens(frame, base, screen_mask, index)
    animate_leaves(frame, base, leaf_mask, index)
    return frame


def save_mask_preview(base: np.ndarray, screen_mask: np.ndarray, leaf_mask: np.ndarray) -> None:
    preview = base.copy().astype(np.float32)
    preview *= 0.34
    preview[screen_mask] = np.array([85, 232, 225], dtype=np.float32)
    preview[leaf_mask] = np.array([157, 221, 91], dtype=np.float32)
    Image.fromarray(preview.astype(np.uint8), "RGB").save(MASK_PREVIEW)


def main() -> None:
    base_image = Image.open(SOURCE).convert("RGB")
    base = np.asarray(base_image, dtype=np.uint8)
    screen_mask, leaf_mask = build_masks(base)
    allowed_mask = screen_mask | leaf_mask

    arrays = [render_frame(base, screen_mask, leaf_mask, index) for index in range(FRAME_COUNT)]
    for index, frame in enumerate(arrays):
        changed = np.any(frame != base, axis=2)
        escaped = changed & ~allowed_mask
        if np.any(escaped):
            raise RuntimeError(
                f"Frame {index} changed {int(escaped.sum())} pixels outside animation masks"
            )

    rgb_frames = [Image.fromarray(frame, "RGB") for frame in arrays]
    FRAME_DIRECTORY.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(rgb_frames):
        frame.save(FRAME_DIRECTORY / f"campus-{index:02d}.png", optimize=True)
    palette_reference = rgb_frames[0].quantize(
        colors=224,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    )
    frames = [
        frame.quantize(palette=palette_reference, dither=Image.Dither.NONE)
        for frame in rgb_frames
    ]
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        DESTINATION,
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_DURATION_MS,
        loop=0,
        disposal=2,
        optimize=True,
    )

    thumbnail_size = (384, 256)
    preview = Image.new(
        "RGB",
        (thumbnail_size[0] * 5, thumbnail_size[1] * 2),
        "#211713",
    )
    for index, frame in enumerate(rgb_frames):
        thumb = frame.resize(thumbnail_size, Image.Resampling.NEAREST)
        preview.paste(
            thumb,
            ((index % 5) * thumbnail_size[0], (index // 5) * thumbnail_size[1]),
        )
    preview.save(PREVIEW, optimize=False)
    save_mask_preview(base, screen_mask, leaf_mask)

    print(f"screen pixels: {int(screen_mask.sum())}")
    print(f"leaf pixels: {int(leaf_mask.sum())}")
    print("verified: every changed pixel stays inside a screen or leaf mask")


if __name__ == "__main__":
    main()
