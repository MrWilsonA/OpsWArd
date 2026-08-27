"""Create four guaranteed-seamless high-resolution tiles from one continuous master."""

from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "game-assets"
SOURCE = ASSETS / "opsward-outdoor-v5.png"
MASTER = ASSETS / "outdoor-v8-continuous-master.png"
OUTPUT = ASSETS / "outdoor-v8-seamless-tiles"
PREVIEW = ASSETS / "outdoor-v8-seam-preview.png"


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = np.asarray(Image.open(SOURCE).convert("RGB"))
    # A continuous 2x detail pass produces smaller scenery pixels without any
    # independently generated boundaries. Sharpening happens before palette
    # reduction so the result remains hard-edged pixel art rather than blur.
    enlarged = cv2.resize(source, (3072, 2048), interpolation=cv2.INTER_CUBIC)
    blur = cv2.GaussianBlur(enlarged, (0, 0), 0.72)
    sharpened = cv2.addWeighted(enlarged, 1.42, blur, -0.42, 0)
    master = Image.fromarray(sharpened, "RGB").quantize(
        colors=240, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE,
    ).convert("RGB")
    master.save(MASTER, optimize=True)
    for tile_y in range(2):
        for tile_x in range(2):
            master.crop((tile_x * 1536, tile_y * 1024, (tile_x + 1) * 1536, (tile_y + 1) * 1024)).save(
                OUTPUT / f"outdoor-{tile_x}-{tile_y}.png", optimize=True,
            )
    master.resize((1536, 1024), Image.Resampling.LANCZOS).save(PREVIEW, optimize=True)
    print(f"continuous master={MASTER}; four seamless tiles={OUTPUT}")


if __name__ == "__main__":
    main()
