from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


def edge_foreground_mask(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    pixels = np.asarray(rgb)
    brightness_floor = pixels.min(axis=2)
    chroma = pixels.max(axis=2) - pixels.min(axis=2)
    candidate = (brightness_floor >= 218) & (chroma <= 24)

    height, width = candidate.shape
    background = np.zeros_like(candidate, dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        if candidate[0, x]:
            queue.append((x, 0))
        if candidate[height - 1, x]:
            queue.append((x, height - 1))
    for y in range(height):
        if candidate[y, 0]:
            queue.append((0, y))
        if candidate[y, width - 1]:
            queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if background[y, x] or not candidate[y, x]:
            continue
        background[y, x] = True
        for nx, ny in (
            (x - 1, y),
            (x + 1, y),
            (x, y - 1),
            (x, y + 1),
            (x - 1, y - 1),
            (x + 1, y - 1),
            (x - 1, y + 1),
            (x + 1, y + 1),
        ):
            if 0 <= nx < width and 0 <= ny < height and not background[ny, nx]:
                queue.append((nx, ny))

    return Image.fromarray((~background).astype(np.uint8) * 255, mode="L")


def prepare_sprite_sheet(source: Path, destination: Path) -> None:
    source_rgba = Image.open(source).convert("RGBA")

    # ImageGen returns 1254px square. Trim to the nearest 4-way subdivision so
    # every generated pose is sampled independently into an exact 64px cell.
    divisible = min(source_rgba.width, source_rgba.height) // 4 * 4
    left = (source_rgba.width - divisible) // 2
    top = (source_rgba.height - divisible) // 2
    source_rgba = source_rgba.crop((left, top, left + divisible, top + divisible))
    source_cell = divisible // 4

    sheet = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    for row in range(4):
        for column in range(4):
            box = (
                column * source_cell,
                row * source_cell,
                (column + 1) * source_cell,
                (row + 1) * source_cell,
            )
            frame_rgba = source_rgba.crop(box)
            frame_rgb = frame_rgba.convert("RGB")
            source_alpha = frame_rgba.getchannel("A")
            # Preserve genuine transparency returned by ImageGen. For opaque
            # outputs, remove the connected white/checkerboard background.
            if source_alpha.getextrema()[0] < 255:
                frame_mask = source_alpha.point(lambda value: 255 if value >= 128 else 0)
            else:
                frame_mask = edge_foreground_mask(frame_rgb)
            frame_rgb = frame_rgb.resize((64, 64), Image.Resampling.NEAREST)
            frame_mask = frame_mask.resize((64, 64), Image.Resampling.NEAREST)

            quantized = frame_rgb.quantize(
                colors=40,
                method=Image.Quantize.MEDIANCUT,
                dither=Image.Dither.NONE,
            ).convert("RGBA")
            rgba = np.asarray(quantized).copy()
            alpha = np.asarray(frame_mask)
            rgba[:, :, 3] = np.where(alpha >= 128, 255, 0).astype(np.uint8)
            frame = Image.fromarray(rgba, mode="RGBA")
            sheet.alpha_composite(frame, (column * 64, row * 64))

    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, optimize=False)


def prepare_interior(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGB")
    image = image.resize((800, 600), Image.Resampling.NEAREST)
    image = image.quantize(
        colors=128,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    ).convert("RGB")
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, optimize=False)


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    sprite = subparsers.add_parser("sprite")
    sprite.add_argument("source", type=Path)
    sprite.add_argument("destination", type=Path)

    interior = subparsers.add_parser("interior")
    interior.add_argument("source", type=Path)
    interior.add_argument("destination", type=Path)

    args = parser.parse_args()
    if args.command == "sprite":
        prepare_sprite_sheet(args.source, args.destination)
    else:
        prepare_interior(args.source, args.destination)


if __name__ == "__main__":
    main()
