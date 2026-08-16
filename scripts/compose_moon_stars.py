#!/usr/bin/env python3
"""用已归档的黏土原子拼出日历夜间图标 moon-stars.png。

素材只做缩放与摆位，不重绘任何形体，保证与其他动物原子同一套软陶质感。

用法：
    python3 scripts/compose_moon_stars.py
"""

from pathlib import Path

from PIL import Image

ATOMS = Path("docs/design/atoms")
CANVAS = (540, 420)
OUT_LONG_SIDE = 512

MOON_HEIGHT = 384
MOON_POS = (8, 20)
# 上小下大，和用户认可的参考图星星分布一致
STARS = [(126, (388, 34)), (140, (392, 246))]


def fit_height(im: Image.Image, height: int) -> Image.Image:
    scale = height / im.height
    return im.resize((max(1, round(im.width * scale)), height), Image.LANCZOS)


def fit_width(im: Image.Image, width: int) -> Image.Image:
    scale = width / im.width
    return im.resize((width, max(1, round(im.height * scale))), Image.LANCZOS)


def trimmed(name: str) -> Image.Image:
    im = Image.open(ATOMS / f"{name}.png").convert("RGBA")
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def main() -> None:
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))

    moon = fit_height(trimmed("moon"), MOON_HEIGHT)
    canvas.alpha_composite(moon, MOON_POS)

    star = trimmed("star-face")
    for width, pos in STARS:
        canvas.alpha_composite(fit_width(star, width), pos)

    bbox = canvas.getbbox()
    if bbox:
        canvas = canvas.crop(bbox)
    scale = OUT_LONG_SIDE / max(canvas.size)
    canvas = canvas.resize(
        (max(1, round(canvas.width * scale)), max(1, round(canvas.height * scale))),
        Image.LANCZOS,
    )

    dst = ATOMS / "moon-stars.png"
    canvas.save(dst)
    print(dst, canvas.size)


if __name__ == "__main__":
    main()
