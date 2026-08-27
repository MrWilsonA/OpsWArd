"""Register v6 quadrants to one continuous guide, then split seamless v7 tiles."""

from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "game-assets"
INPUT = ASSETS / "outdoor-v6-hires-tiles"
OUTPUT = ASSETS / "outdoor-v7-seamless-tiles"
GUIDE = ASSETS / "opsward-outdoor-v5.png"
PREVIEW = ASSETS / "outdoor-v7-seam-preview.png"
TILE_WIDTH, TILE_HEIGHT = 1536, 1024
EDGE_LOCK = 12


def match_colour(source: np.ndarray, reference: np.ndarray) -> np.ndarray:
    source_lab = cv2.cvtColor(source, cv2.COLOR_RGB2LAB).astype(np.float32)
    reference_lab = cv2.cvtColor(reference, cv2.COLOR_RGB2LAB).astype(np.float32)
    for channel in range(3):
        source_mean, source_std = source_lab[..., channel].mean(), source_lab[..., channel].std()
        reference_mean, reference_std = reference_lab[..., channel].mean(), reference_lab[..., channel].std()
        source_lab[..., channel] = (
            (source_lab[..., channel] - source_mean)
            * (reference_std / max(source_std, 1.0))
            + reference_mean
        )
    return cv2.cvtColor(np.clip(source_lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    guide_full = np.asarray(Image.open(GUIDE).convert("RGB"))
    registered: list[list[Image.Image]] = [[], []]
    for tile_y in range(2):
        for tile_x in range(2):
            source = np.asarray(Image.open(INPUT / f"outdoor-{tile_x}-{tile_y}.png").convert("RGB"))
            guide_low = guide_full[tile_y * 512:(tile_y + 1) * 512, tile_x * 768:(tile_x + 1) * 768]
            source_low = cv2.resize(source, (768, 512), interpolation=cv2.INTER_AREA)
            flow = cv2.calcOpticalFlowFarneback(
                cv2.cvtColor(guide_low, cv2.COLOR_RGB2GRAY),
                cv2.cvtColor(source_low, cv2.COLOR_RGB2GRAY),
                None, 0.5, 5, 31, 5, 7, 1.5, 0,
            )
            flow_high = cv2.resize(flow, (TILE_WIDTH, TILE_HEIGHT), interpolation=cv2.INTER_LINEAR) * 2.0
            yy, xx = np.indices((TILE_HEIGHT, TILE_WIDTH), dtype=np.float32)
            warped = cv2.remap(source, xx + flow_high[..., 0], yy + flow_high[..., 1], cv2.INTER_NEAREST, borderMode=cv2.BORDER_REFLECT)
            guide_high = cv2.resize(guide_low, (TILE_WIDTH, TILE_HEIGHT), interpolation=cv2.INTER_NEAREST)
            warped = match_colour(warped, guide_high)
            if tile_x == 0: warped[:, -EDGE_LOCK:] = guide_high[:, -EDGE_LOCK:]
            else: warped[:, :EDGE_LOCK] = guide_high[:, :EDGE_LOCK]
            if tile_y == 0: warped[-EDGE_LOCK:, :] = guide_high[-EDGE_LOCK:, :]
            else: warped[:EDGE_LOCK, :] = guide_high[:EDGE_LOCK, :]
            image = Image.fromarray(warped, "RGB")
            image.save(OUTPUT / f"outdoor-{tile_x}-{tile_y}.png", optimize=True)
            registered[tile_y].append(image)
    full = Image.new("RGB", (TILE_WIDTH * 2, TILE_HEIGHT * 2))
    for tile_y in range(2):
        for tile_x in range(2):
            full.paste(registered[tile_y][tile_x], (tile_x * TILE_WIDTH, tile_y * TILE_HEIGHT))
    full.resize((1536, 1024), Image.Resampling.LANCZOS).save(PREVIEW, optimize=True)
    print(f"registered four quadrants and locked {EDGE_LOCK}px internal edges; preview={PREVIEW}")


if __name__ == "__main__":
    main()
