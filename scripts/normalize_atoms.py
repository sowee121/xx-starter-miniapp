#!/usr/bin/env python3
"""统一动物原子素材的视觉体量。

原始切图各自留白不同、身形比例差异大，直接 object-fit 会让宽身动物看起来明显更小。
这里按「宽高几何平均数」归一，再限制最大宽高，最后统一贴底对齐，
使所有动物在卡片里坐在同一条基线上、视觉体量接近。

用法：
    python3 scripts/normalize_atoms.py            # 处理默认动物列表
    python3 scripts/normalize_atoms.py cat dog    # 只处理指定素材
"""

import shutil
import sys
from pathlib import Path

from PIL import Image

ATOMS = Path("docs/design/atoms")
RAW = ATOMS / "raw"

CANVAS = 512
TARGET_GM = 420   # 目标视觉体量：sqrt(宽 × 高)
MAX_SIDE = 480
BOTTOM_PAD = 16

ANIMALS = [
    "rabbit", "cat", "dog", "bear", "duckling", "penguin", "dino", "unicorn",
    "chicken", "sheep", "cow", "pig", "bird", "fish", "fox", "panda",
    "elephant", "giraffe", "lion", "tiger", "monkey", "dolphin", "otter", "hamster",
]
CENTERED = ["star", "avatar"]


def load_raw(name: str) -> Image.Image:
    """优先用 raw/ 里的原始件，保证脚本可重复执行不劣化。"""
    raw = RAW / f"{name}.png"
    cur = ATOMS / f"{name}.png"
    if not raw.exists():
        RAW.mkdir(parents=True, exist_ok=True)
        shutil.copy2(cur, raw)
    return Image.open(raw).convert("RGBA")


def place(name: str, bottom_align: bool) -> None:
    im = load_raw(name)
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)

    w, h = im.size
    gm = (w * h) ** 0.5
    scale = TARGET_GM / gm
    scale = min(scale, MAX_SIDE / w, MAX_SIDE / h)
    im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    x = (CANVAS - im.width) // 2
    y = CANVAS - BOTTOM_PAD - im.height if bottom_align else (CANVAS - im.height) // 2
    canvas.paste(im, (x, max(0, y)), im)
    canvas.save(ATOMS / f"{name}.png")
    print(f"{name}: {im.size} bottom={bottom_align}")


def main() -> None:
    picks = sys.argv[1:]
    for name in ANIMALS:
        if not picks or name in picks:
            place(name, bottom_align=True)
    for name in CENTERED:
        if not picks or name in picks:
            place(name, bottom_align=False)


if __name__ == "__main__":
    main()
