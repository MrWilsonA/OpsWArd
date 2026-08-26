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


def dynamic_column_split(row_alpha: np.ndarray) -> list[tuple[int, int]]:
    col_proj = np.sum(row_alpha > 0, axis=0) > 0
    labeled, num = ndimage.label(col_proj)
    if num >= 4:
        sizes = ndimage.sum_labels(col_proj, labeled, range(1, num + 1))
        large_labels = sorted(range(1, num + 1), key=lambda l: sizes[l - 1], reverse=True)[:4]
        large_labels.sort(key=lambda l: int(np.argwhere(labeled == l).min()))

        splits = [0]
        for i in range(3):
            l_cur = large_labels[i]
            l_next = large_labels[i + 1]
            end_cur = int(np.argwhere(labeled == l_cur).max())
            start_next = int(np.argwhere(labeled == l_next).min())
            split_x = (end_cur + start_next) // 2
            splits.append(split_x)
        splits.append(256)
        return [(int(splits[i]), int(splits[i + 1])) for i in range(4)]
    return [(0, 75), (75, 127), (127, 178), (178, 256)]


def clean_and_normalize_sheet(source: Path, destination: Path) -> None:
    original = Image.open(source).convert("RGBA")
    arr = np.asarray(original).copy()

    frames: list[Image.Image] = []
    boxes: list[tuple[int, int, int, int] | None] = []

    for row in range(4):
        # Row 3 (facing up) has round head overflow from row 2
        overflow_top = 12 if row == 3 else 0
        y1_src = max(0, row * CELL - overflow_top)
        y2_src = (row + 1) * CELL

        row_slice = arr[y1_src:y2_src, :].copy()

        # If row 2, strictly clear bottom 16px where row 3 head might leak
        if row == 2:
            row_slice[row_slice.shape[0] - 16 :, :] = 0

        col_splits = dynamic_column_split(row_slice[..., 3])

        for col in range(4):
            x1_src, x2_src = col_splits[col]
            cell = row_slice[:, x1_src:x2_src].copy()

            # Remove disconnected edge leaks from neighbor cells and small 1-2px floating dust
            binary = cell[..., 3] > 20
            labeled, num_features = ndimage.label(binary)
            if num_features > 0:
                sizes = ndimage.sum_labels(binary, labeled, range(1, num_features + 1))
                main_label = int(np.argmax(sizes)) + 1

                for label_idx, size in enumerate(sizes, 1):
                    if label_idx != main_label and size <= 45:
                        pts = np.argwhere(labeled == label_idx)
                        touches_edge = (
                            pts[:, 0].min() <= 1
                            or pts[:, 0].max() >= cell.shape[0] - 2
                            or pts[:, 1].min() <= 1
                            or pts[:, 1].max() >= cell.shape[1] - 2
                        )
                        if touches_edge or size <= 3:
                            cell[labeled == label_idx] = 0

            # Fill any hollow internal holes or concavities in hair / skin / clothes
            binary_clean = cell[..., 3] > 20
            closed = ndimage.binary_closing(binary_clean, structure=np.ones((5, 5)))
            solid = ndimage.binary_fill_holes(closed)
            holes = solid & ~binary_clean

            if np.any(holes):
                upper_pixels = cell[(cell[..., 3] > 20) & (np.indices(cell.shape[:2])[0] < int(cell.shape[0] * 0.5))]
                if len(upper_pixels) > 0:
                    med_r = int(np.median(upper_pixels[..., 0]))
                    med_g = int(np.median(upper_pixels[..., 1]))
                    med_b = int(np.median(upper_pixels[..., 2]))
                else:
                    med_r, med_g, med_b = 222, 228, 232
                cell[holes, 0] = med_r
                cell[holes, 1] = med_g
                cell[holes, 2] = med_b
                cell[holes, 3] = 255

            frame_img = Image.fromarray(cell, "RGBA")
            frames.append(frame_img)

            f_alpha = np.asarray(frame_img.getchannel("A"))
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

    for idx, (frame, box) in enumerate(zip(frames, boxes)):
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

        x = max(3, min(CELL - 3 - cropped.width, x))
        y = max(3, min(CELL - 3 - cropped.height, y))

        cell_img = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        cell_img.alpha_composite(cropped, (x, y))

        # Add clean crisp dark outline
        a_chan = cell_img.getchannel("A")
        expanded = a_chan.filter(ImageFilter.MaxFilter(3))
        outline_a = np.maximum(
            np.asarray(expanded, dtype=np.int16) - np.asarray(a_chan, dtype=np.int16),
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
