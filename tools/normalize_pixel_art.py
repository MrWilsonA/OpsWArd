from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def normalize(source: Path, destination: Path, size: int, colors: int) -> None:
    source_rgb = Image.open(source).convert("RGB")

    # Mark only the near-white region connected to the canvas edges. This keeps
    # whites inside eyes/clothing opaque while removing generated backgrounds.
    flood = source_rgb.copy()
    sentinel = (1, 2, 3)
    for corner in (
        (0, 0),
        (flood.width - 1, 0),
        (0, flood.height - 1),
        (flood.width - 1, flood.height - 1),
    ):
        ImageDraw.floodfill(flood, corner, sentinel, thresh=40)

    flood_array = np.asarray(flood)
    background = np.all(flood_array == sentinel, axis=2)
    foreground = Image.fromarray((~background).astype(np.uint8) * 255, mode="L")

    # A nearest-neighbor reduction makes every final sample one exact square
    # pixel. Palette reduction is explicitly non-dithered to prevent noise.
    reduced_rgb = source_rgb.resize((size, size), Image.Resampling.NEAREST)
    reduced_mask = foreground.resize((size, size), Image.Resampling.NEAREST)
    quantized = reduced_rgb.quantize(
        colors=colors,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    ).convert("RGBA")

    alpha = np.asarray(reduced_mask)
    alpha = np.where(alpha >= 128, 255, 0).astype(np.uint8)
    result = np.asarray(quantized).copy()
    result[:, :, 3] = alpha

    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(result, mode="RGBA").save(destination, optimize=False)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--size", type=int, default=64)
    parser.add_argument("--colors", type=int, default=32)
    args = parser.parse_args()
    normalize(args.source, args.destination, args.size, args.colors)


if __name__ == "__main__":
    main()
