from pathlib import Path

import numpy as np
from PIL import Image


DIRECTORY = Path("public/game-assets/characters-aligned")
CELL = 64


def main() -> None:
    failures: list[str] = []
    checked = 0
    for path in sorted(DIRECTORY.glob("*-walk-4x4.png")):
        sheet = Image.open(path).convert("RGBA")
        if sheet.size != (256, 256):
            failures.append(f"{path.name}: sheet is {sheet.size}, expected 256x256")
            continue
        for row in range(4):
            for column in range(4):
                frame = sheet.crop((column * CELL, row * CELL, (column + 1) * CELL, (row + 1) * CELL))
                alpha = np.asarray(frame.getchannel("A"))
                points = np.argwhere(alpha > 0)
                label = f"{path.name}[{row},{column}]"
                if points.size == 0:
                    failures.append(f"{label}: empty frame")
                    continue
                y1, x1 = points.min(axis=0)
                y2, x2 = points.max(axis=0)
                if x1 == 0 or y1 == 0 or x2 == CELL - 1 or y2 == CELL - 1:
                    failures.append(f"{label}: opaque pixels touch cell edge")
                checked += 1
    if failures:
        raise SystemExit("\n".join(failures))
    print(f"validated {checked} sprite frames: 64x64 cells, no clipped edges")


if __name__ == "__main__":
    main()
