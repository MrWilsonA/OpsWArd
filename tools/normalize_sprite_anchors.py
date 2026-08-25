from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


SOURCE = Path("public/game-assets/characters")
DESTINATION = Path("public/game-assets/characters-aligned")
CELL = 64
SHEET = 256
MAX_WIDTH = 58
MAX_HEIGHT = 56
OUTLINE = (30, 21, 24, 255)


def remove_disconnected_edge_leaks(frame: Image.Image) -> Image.Image:
    rgba = np.asarray(frame).copy()
    alpha = rgba[:, :, 3] > 0
    height, width = alpha.shape
    visited = np.zeros(alpha.shape, dtype=bool)
    components: list[list[tuple[int, int]]] = []

    for start_y, start_x in np.argwhere(alpha):
        if visited[start_y, start_x]:
            continue
        stack = [(int(start_y), int(start_x))]
        visited[start_y, start_x] = True
        component: list[tuple[int, int]] = []
        while stack:
            y, x = stack.pop()
            component.append((y, x))
            for offset_y in (-1, 0, 1):
                for offset_x in (-1, 0, 1):
                    if offset_x == 0 and offset_y == 0:
                        continue
                    next_y, next_x = y + offset_y, x + offset_x
                    if not (0 <= next_y < height and 0 <= next_x < width):
                        continue
                    if alpha[next_y, next_x] and not visited[next_y, next_x]:
                        visited[next_y, next_x] = True
                        stack.append((next_y, next_x))
        components.append(component)

    largest = max((len(component) for component in components), default=0)
    for component in components:
        touches_edge = any(y in (0, height - 1) or x in (0, width - 1) for y, x in component)
        if touches_edge and len(component) < largest * 0.15:
            for y, x in component:
                rgba[y, x] = (0, 0, 0, 0)
    return Image.fromarray(rgba, "RGBA")


def alpha_bbox(frame: Image.Image) -> tuple[int, int, int, int] | None:
    alpha = np.asarray(frame.getchannel("A"))
    points = np.argwhere(alpha > 0)
    if points.size == 0:
        return None
    y1, x1 = points.min(axis=0)
    y2, x2 = points.max(axis=0) + 1
    return int(x1), int(y1), int(x2), int(y2)


def upper_body_anchor(frame: Image.Image) -> float:
    alpha = np.asarray(frame.getchannel("A"))
    points = np.argwhere(alpha > 0)
    if points.size == 0:
        return CELL / 2
    y1 = int(points[:, 0].min())
    y2 = int(points[:, 0].max()) + 1
    upper_limit = y1 + max(1, int((y2 - y1) * 0.62))
    upper = np.argwhere((alpha > 0) & (np.indices(alpha.shape)[0] < upper_limit))
    if upper.size == 0:
        upper = points
    return float((upper[:, 1].min() + upper[:, 1].max() + 1) / 2)


def add_outline(frame: Image.Image) -> Image.Image:
    alpha = frame.getchannel("A")
    expanded = alpha.filter(ImageFilter.MaxFilter(3))
    outline_alpha = np.maximum(
        np.asarray(expanded, dtype=np.int16) - np.asarray(alpha, dtype=np.int16),
        0,
    ).astype(np.uint8)
    outline = Image.new("RGBA", frame.size, OUTLINE)
    outline.putalpha(Image.fromarray(outline_alpha, mode="L"))
    return Image.alpha_composite(outline, frame)


def normalize_sheet(source: Path, destination: Path) -> None:
    original = Image.open(source).convert("RGBA")
    frames: list[Image.Image] = []
    boxes: list[tuple[int, int, int, int] | None] = []
    for row in range(4):
        for column in range(4):
            overflow_top = 8 if row == 3 else 0
            frame = original.crop((
                column * CELL,
                row * CELL - overflow_top,
                (column + 1) * CELL,
                (row + 1) * CELL,
            ))
            frame = remove_disconnected_edge_leaks(frame)
            frames.append(frame)
            boxes.append(alpha_bbox(frame))

    widths = [box[2] - box[0] for box in boxes if box]
    heights = [box[3] - box[1] for box in boxes if box]
    scale = min(1.0, MAX_WIDTH / max(widths, default=MAX_WIDTH), MAX_HEIGHT / max(heights, default=MAX_HEIGHT))

    output = Image.new("RGBA", (SHEET, SHEET), (0, 0, 0, 0))
    for index, (frame, box) in enumerate(zip(frames, boxes)):
        if box is None:
            continue
        cropped = frame.crop(box)
        if scale < 1.0:
            cropped = cropped.resize(
                (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
                Image.Resampling.NEAREST,
            )

        anchor = upper_body_anchor(cropped)
        frame_number = index % 4
        baseline = 59 if frame_number in (0, 2) else 60
        x = round(CELL / 2 - anchor)
        y = baseline - cropped.height
        aligned = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        aligned.alpha_composite(cropped, (x, y))
        aligned = add_outline(aligned)
        column = index % 4
        row = index // 4
        output.alpha_composite(aligned, (column * CELL, row * CELL))

    destination.parent.mkdir(parents=True, exist_ok=True)
    output.save(destination, optimize=False)


def main() -> None:
    for source in sorted(SOURCE.glob("*-walk-4x4.png")):
        normalize_sheet(source, DESTINATION / source.name)


if __name__ == "__main__":
    main()
