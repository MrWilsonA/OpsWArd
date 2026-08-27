"""Build leak-proof high-resolution animation overlays for the four v6 tiles."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "game-assets"
TILES = ASSETS / "outdoor-v10-seamless-tiles"
OUTPUT = ASSETS / "outdoor-v10-hires-overlays"
FRAME_COUNT = 10
TILE_WIDTH, TILE_HEIGHT = 1536, 1024

# Global world-space origins. They deliberately occupy only a few groves and
# path corners so the campus feels alive without turning into visual noise.
LEAF_ORIGINS = [
    (255, 155), (610, 145), (915, 165), (1340, 190),
    (350, 520), (1060, 480), (550, 790), (1010, 780), (1320, 850),
]
WIND_ORIGINS = [(505, 390), (935, 335), (610, 650), (1110, 680)]


def tile_local(world_x: int, world_y: int, tile_x: int, tile_y: int) -> tuple[int, int]:
    return (world_x - tile_x * 768) * 2, (world_y - tile_y * 512) * 2


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    counts: list[int] = []
    for tile_y in range(2):
        for tile_x in range(2):
            source = np.asarray(Image.open(TILES / f"outdoor-{tile_x}-{tile_y}.png").convert("RGB"))
            red = source[..., 0].astype(np.int16)
            green = source[..., 1].astype(np.int16)
            blue = source[..., 2].astype(np.int16)
            yy, xx = np.indices((TILE_HEIGHT, TILE_WIDTH))

            # Colour classification is performed on each actual v6 tile, so a
            # ripple cannot appear over a path or building after regeneration.
            water = (blue >= red + 16) & (green >= red + 5) & (blue > 55)
            canopy = (
                (green >= red + 14)
                & (green >= blue - 3)
                & (green > 42)
                & (green < 178)
                & (red < 135)
            )

            for frame in range(FRAME_COUNT):
                rgba = np.zeros((TILE_HEIGHT, TILE_WIDTH, 4), dtype=np.uint8)

                wave = water & (((xx // 3 + yy // 5 + frame * 3) % 43) < 2)
                wave_rgb = np.clip(source.astype(np.int16) + np.array([8, 16, 24]), 0, 255).astype(np.uint8)
                rgba[..., :3][wave] = wave_rgb[wave]
                rgba[..., 3][wave] = 150

                # Sparse travelling highlights imply branch sway while every
                # overlay pixel remains inside the original canopy silhouette.
                leaf_light = canopy & (((xx // 8 + yy // 6 + frame) % 19) == 0)
                leaf_dark = canopy & (((xx // 11 - yy // 9 + frame) % 29) == 0)
                light_rgb = np.clip(source.astype(np.int16) + np.array([5, 13, 3]), 0, 255).astype(np.uint8)
                dark_rgb = np.clip(source.astype(np.int16) - np.array([6, 8, 4]), 0, 255).astype(np.uint8)
                rgba[..., :3][leaf_light] = light_rgb[leaf_light]
                rgba[..., 3][leaf_light] = 105
                rgba[..., :3][leaf_dark] = dark_rgb[leaf_dark]
                rgba[..., 3][leaf_dark] = 85

                overlay = Image.fromarray(rgba, "RGBA")
                draw = ImageDraw.Draw(overlay)
                for index, (world_x, world_y) in enumerate(LEAF_ORIGINS):
                    local_x, local_y = tile_local(world_x, world_y, tile_x, tile_y)
                    if not (-30 <= local_x < TILE_WIDTH + 30 and -30 <= local_y < TILE_HEIGHT + 30):
                        continue
                    phase = (frame + index * 2) % FRAME_COUNT
                    x = local_x + phase * 4
                    y = local_y + phase * 3
                    colour = (195, 150, 54, 205) if index % 2 else (139, 174, 62, 210)
                    draw.rectangle((x, y, x + 3, y + 3), fill=colour)
                    draw.point((x + 4, y + 2), fill=(89, 111, 46, 170))

                for index, (world_x, world_y) in enumerate(WIND_ORIGINS):
                    local_x, local_y = tile_local(world_x, world_y, tile_x, tile_y)
                    if not (-60 <= local_x < TILE_WIDTH + 60 and -30 <= local_y < TILE_HEIGHT + 30):
                        continue
                    phase = (frame * 7 + index * 13) % 54
                    x = local_x + phase
                    y = local_y + ((frame + index) % 3) * 2
                    draw.line((x, y, x + 16, y - 4), fill=(235, 225, 157, 72), width=2)
                    draw.line((x + 23, y - 6, x + 31, y - 8), fill=(235, 225, 157, 46), width=2)

                path = OUTPUT / f"outdoor-{tile_x}-{tile_y}-{frame:02d}.png"
                overlay.save(path, optimize=True)
                counts.append(int(np.count_nonzero(np.asarray(overlay)[..., 3])))

    print(f"created {FRAME_COUNT * 4} v6 tile overlays; alpha pixels {min(counts)}..{max(counts)}")


if __name__ == "__main__":
    main()
