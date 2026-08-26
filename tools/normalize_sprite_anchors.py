from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


SOURCE = Path("public/game-assets/characters")
DESTINATION = Path("public/game-assets/characters-aligned")
CELL = 64
SHEET = 256
TARGET_MAX_W = 46
TARGET_MAX_H = 50
OUTLINE = (24, 18, 22, 255)


def clean_and_normalize_sheet(source: Path, destination: Path) -> None:
    original = Image.open(source).convert("RGBA")
    arr = np.asarray(original)

    cleaned_frames: list[Image.Image] = []

    for row in range(4):
        for column in range(4):
            cell = arr[row * CELL : (row + 1) * CELL, column * CELL : (column + 1) * CELL].copy()
            alpha = cell[..., 3]

            # 1. Remove disconnected leak components from adjacent cells
            binary = alpha > 20
            labeled, num_features = ndimage.label(binary)
            if num_features > 0:
                sizes = ndimage.sum_labels(binary, labeled, range(1, num_features + 1))
                main_label = int(np.argmax(sizes)) + 1
                largest_size = float(sizes[main_label - 1])

                keep_mask = np.zeros_like(binary)
                for label_idx, size in enumerate(sizes, 1):
                    pts = np.argwhere(labeled == label_idx)
                    touches_top = pts[:, 0].min() == 0
                    touches_bottom = pts[:, 0].max() == CELL - 1
                    touches_left = pts[:, 1].min() == 0
                    touches_right = pts[:, 1].max() == CELL - 1

                    if label_idx == main_label:
                        keep_mask |= (labeled == label_idx)
                    elif (touches_top or touches_bottom or touches_left or touches_right) and size < largest_size * 0.35:
                        continue
                    elif size >= 4:
                        keep_mask |= (labeled == label_idx)

                cell[~keep_mask] = 0

            # 2. Remove white / pale edge fringe pixels on the outer perimeter
            eroded = ndimage.binary_erosion(cell[..., 3] > 0)
            perimeter = (cell[..., 3] > 0) & ~eroded

            r_c, g_c, b_c = cell[..., 0], cell[..., 1], cell[..., 2]
            max_c = np.maximum(np.maximum(r_c, g_c), b_c)
            min_c = np.minimum(np.minimum(r_c, g_c), b_c)
            sat = max_c - min_c

            is_pale_fringe = perimeter & (max_c > 195) & (sat < 40)
            is_white_fringe = perimeter & (r_c > 210) & (g_c > 200) & (b_c > 190)

            cell[is_pale_fringe | is_white_fringe] = 0

            # Secondary pass for isolated residue pixels
            binary2 = cell[..., 3] > 20
            labeled2, num2 = ndimage.label(binary2)
            if num2 > 0:
                sizes2 = ndimage.sum_labels(binary2, labeled2, range(1, num2 + 1))
                keep_mask2 = np.isin(labeled2, [i for i, s in enumerate(sizes2, 1) if s >= 4])
                cell[~keep_mask2] = 0

            cleaned_frames.append(Image.fromarray(cell, "RGBA"))

    # Extract tight bounding boxes across all frames
    boxes: list[tuple[int, int, int, int] | None] = []
    for frame in cleaned_frames:
        f_alpha = np.asarray(frame.getchannel("A"))
        pts = np.argwhere(f_alpha > 0)
        if pts.size > 0:
            y1, x1 = pts.min(axis=0)
            y2, x2 = pts.max(axis=0) + 1
            boxes.append((int(x1), int(y1), int(x2), int(y2)))
        else:
            boxes.append(None)

    widths = [b[2] - b[0] for b in boxes if b]
    heights = [b[3] - b[1] for b in boxes if b]
    scale = min(1.0, TARGET_MAX_W / max(widths, default=TARGET_MAX_W), TARGET_MAX_H / max(heights, default=TARGET_MAX_H))

    output = Image.new("RGBA", (SHEET, SHEET), (0, 0, 0, 0))

    for idx, (frame, box) in enumerate(zip(cleaned_frames, boxes)):
        if box is None:
            continue
        cropped = frame.crop(box)
        if scale < 1.0:
            new_w = max(1, round(cropped.width * scale))
            new_h = max(1, round(cropped.height * scale))
            cropped = cropped.resize((new_w, new_h), Image.Resampling.NEAREST)

        f_alpha = np.asarray(cropped.getchannel("A")) > 0
        pts = np.argwhere(f_alpha)
        y_cut = int(cropped.height * 0.6)
        upper_pts = np.argwhere(f_alpha[:y_cut, :])
        if upper_pts.size > 0:
            x_center = float((upper_pts[:, 1].min() + upper_pts[:, 1].max() + 1) / 2)
        else:
            x_center = float((pts[:, 1].min() + pts[:, 1].max() + 1) / 2)

        baseline = 56
        x = round(CELL / 2 - x_center)
        y = baseline - cropped.height

        # Ensure frame fits completely inside 64x64 with safe padding (no bleed)
        x = max(3, min(CELL - 3 - cropped.width, x))
        y = max(3, min(CELL - 3 - cropped.height, y))

        cell_img = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        cell_img.alpha_composite(cropped, (x, y))

        # Add crisp pixel outline
        a_channel = cell_img.getchannel("A")
        expanded = a_channel.filter(ImageFilter.MaxFilter(3))
        outline_a = np.maximum(
            np.asarray(expanded, dtype=np.int16) - np.asarray(a_channel, dtype=np.int16),
            0,
        ).astype(np.uint8)
        outline_img = Image.new("RGBA", (CELL, CELL), OUTLINE)
        outline_img.putalpha(Image.fromarray(outline_a, mode="L"))

        composed = Image.alpha_composite(outline_img, cell_img)

        col = idx % 4
        row = idx // 4
        output.alpha_composite(composed, (col * CELL, row * CELL))

    destination.parent.mkdir(parents=True, exist_ok=True)
    output.save(destination, optimize=False)


def main() -> None:
    for source in sorted(SOURCE.glob("*-walk-4x4.png")):
        clean_and_normalize_sheet(source, DESTINATION / source.name)
    print("All 26 character sheets cleaned and normalized successfully!")


if __name__ == "__main__":
    main()
