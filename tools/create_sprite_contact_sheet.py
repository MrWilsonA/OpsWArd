from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


SOURCE = Path("public/game-assets/characters")
DESTINATION = Path("public/game-assets/sprite-sheet-contact.png")
COLUMNS = 5
THUMBNAIL = 128
LABEL_HEIGHT = 22
PADDING = 10


def checkerboard(size: tuple[int, int], tile: int = 8) -> Image.Image:
    image = Image.new("RGBA", size, "#f2eadb")
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill="#ded2bf")
    return image


def main() -> None:
    sheets = sorted(SOURCE.glob("*-walk-4x4.png"))
    rows = (len(sheets) + COLUMNS - 1) // COLUMNS
    cell_width = THUMBNAIL + PADDING * 2
    cell_height = THUMBNAIL + LABEL_HEIGHT + PADDING * 2
    contact = Image.new("RGB", (cell_width * COLUMNS, cell_height * rows), "#2a1c18")
    draw = ImageDraw.Draw(contact)
    font = ImageFont.load_default()

    for index, path in enumerate(sheets):
        column = index % COLUMNS
        row = index // COLUMNS
        x = column * cell_width + PADDING
        y = row * cell_height + PADDING
        preview = checkerboard((THUMBNAIL, THUMBNAIL))
        sprite = Image.open(path).convert("RGBA").resize((THUMBNAIL, THUMBNAIL), Image.Resampling.NEAREST)
        preview.alpha_composite(sprite)
        contact.paste(preview.convert("RGB"), (x, y))
        label = path.stem.removesuffix("-walk-4x4").replace("_", " ").title()
        draw.text((x, y + THUMBNAIL + 5), label, fill="#fff0c8", font=font)

    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    contact.save(DESTINATION, optimize=False)


if __name__ == "__main__":
    main()
