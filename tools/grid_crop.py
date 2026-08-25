"""Render a labelled coordinate grid over a region of the campus art.

Used while authoring collision geometry so rectangles can be read straight off
the drawing instead of guessed.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public/game-assets/campus-loop-frames/campus-00.png"


def main() -> int:
    x1, y1, x2, y2, scale, out = (
        int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]),
        float(sys.argv[5]), sys.argv[6],
    )
    step = int(sys.argv[7]) if len(sys.argv) > 7 else 32
    image = Image.open(SOURCE).convert("RGB").crop((x1, y1, x2, y2))
    image = image.resize((int((x2 - x1) * scale), int((y2 - y1) * scale)), Image.NEAREST)
    draw = ImageDraw.Draw(image, "RGBA")
    for x in range(x1 - x1 % step, x2 + step, step):
        px = int((x - x1) * scale)
        major = x % (step * 4) == 0
        draw.line([(px, 0), (px, image.height)], fill=(255, 60, 60, 220 if major else 90), width=1)
        if major:
            draw.text((px + 2, 2), str(x), fill=(255, 255, 90))
    for y in range(y1 - y1 % step, y2 + step, step):
        py = int((y - y1) * scale)
        major = y % (step * 4) == 0
        draw.line([(0, py), (image.width, py)], fill=(60, 160, 255, 220 if major else 90), width=1)
        if major:
            draw.text((2, py + 2), str(y), fill=(140, 230, 255))
    image.save(out)
    print(out, image.size)
    return 0


if __name__ == "__main__":
    sys.exit(main())
