from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw


MASTER = Path(r"D:\Projects\OpsWArd\public\game-assets\outdoor-v9-connected-preview.png")
REPORTS = [
    Path(r"C:\Users\ASUS\AppData\Local\Temp\codex-clipboard-e334a0cb-3840-4030-9c7c-00f14997f09e.png"),
    Path(r"C:\Users\ASUS\AppData\Local\Temp\codex-clipboard-2e42f771-57df-4e18-870a-c8a93b3cc57b.png"),
    Path(r"C:\Users\ASUS\AppData\Local\Temp\codex-clipboard-cdee5d60-2df2-4c46-9b0f-844d4d76a599.png"),
]


def build_comparison() -> None:
    original = Image.open(
        Path(r"D:\Projects\OpsWArd\public\game-assets\outdoor-v6-seam-preview.png")
    ).convert("RGB")
    current = Image.open(MASTER).convert("RGB")
    repaired = Image.open(
        Path(r"D:\Projects\OpsWArd\public\game-assets\outdoor-v10-connected-preview.png")
    ).convert("RGB")
    boxes = [(90, 425, 540, 630), (610, 410, 810, 600), (990, 430, 1180, 570)]
    width = max(right - left for left, top, right, bottom in boxes)
    rows = []
    for index, box in enumerate(boxes, start=1):
        row = Image.new("RGB", (width * 3, box[3] - box[1] + 24), "#17120f")
        old_crop = original.crop(box)
        new_crop = current.crop(box)
        repaired_crop = repaired.crop(box)
        row.paste(old_crop, (0, 24))
        row.paste(new_crop, (width, 24))
        row.paste(repaired_crop, (width * 2, 24))
        draw = ImageDraw.Draw(row)
        draw.text((4, 4), f"v6 original - report {index}", fill="white")
        draw.text((width + 4, 4), f"v9 current - report {index}", fill="white")
        draw.text((width * 2 + 4, 4), f"v10 repaired - report {index}", fill="white")
        rows.append(row)
    sheet = Image.new("RGB", (width * 3, sum(row.height for row in rows)), "#17120f")
    y = 0
    for row in rows:
        sheet.paste(row, (0, y))
        y += row.height
    sheet.save(Path(r"D:\Projects\OpsWArd\public\game-assets\outdoor-v9-seam-comparison.png"))


def localize(report_path: Path, master_gray: np.ndarray) -> None:
    report = cv2.imread(str(report_path), cv2.IMREAD_GRAYSCALE)
    sift = cv2.SIFT_create(nfeatures=12000)
    query_keys, query_desc = sift.detectAndCompute(report, None)
    master_keys, master_desc = sift.detectAndCompute(master_gray, None)
    pairs = cv2.BFMatcher().knnMatch(query_desc, master_desc, k=2)
    good = [first for first, second in pairs if first.distance < 0.72 * second.distance]
    if len(good) < 8:
        print(f"{report_path.name}: only {len(good)} matches")
        return

    source = np.float32([query_keys[match.queryIdx].pt for match in good]).reshape(-1, 1, 2)
    target = np.float32([master_keys[match.trainIdx].pt for match in good]).reshape(-1, 1, 2)
    transform, inliers = cv2.findHomography(source, target, cv2.RANSAC, 4.0)
    height, width = report.shape
    corners = np.float32([[[0, 0], [width, 0], [width, height], [0, height]]])
    mapped = cv2.perspectiveTransform(corners, transform)[0]
    print(f"{report_path.name}: matches={len(good)}, inliers={int(inliers.sum())}")
    print(np.round(mapped, 1).tolist())


if __name__ == "__main__":
    master = cv2.imread(str(MASTER), cv2.IMREAD_GRAYSCALE)
    for report_path in REPORTS:
        localize(report_path, master)
    build_comparison()
