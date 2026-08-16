#!/usr/bin/env python3
"""把无道具动物原子做成带白色留白的贴纸成品。

流程：
1. 洋红幕布去背（优先非 v3 原版 chroma）
2. 主体归一到贴纸内容区
3. 放到圆角白底贴纸上，四周留白

用法：
  python3 scripts/make_sticker_pack.py rabbit cat ...
  python3 scripts/make_sticker_pack.py --all
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = Path("/Users/ww/.cursor/projects/Users-ww-Projects-Miniprogram-xx-starter-miniapp/assets")
ATOMS = ROOT / "docs/design/atoms"
RAW = ATOMS / "raw"
CHROMA = ASSETS

CANVAS = 512
PAD = 48
RADIUS = 72
CONTENT = CANVAS - PAD * 2

ANIMALS = [
    "rabbit", "cat", "dog", "bear", "duckling", "penguin", "dino", "unicorn",
    "chicken", "sheep", "cow", "pig", "bird", "fish", "fox", "panda",
    "elephant", "giraffe", "lion", "tiger", "monkey", "dolphin", "otter", "hamster",
]


def chroma(name: str) -> Path:
    # 回退白底版：明确不用 v3 透明重做稿
    candidates = [
        CHROMA / f"atom-chroma-sticker-{name}.png",
        CHROMA / f"atom-chroma-sticker-{name}-v2.png",
    ]
    src = next((p for p in candidates if p.exists()), None)
    if src is None:
        raise FileNotFoundError(f"missing chroma for {name}")
    tmp = ATOMS / f"_tmp-sticker-{name}.png"
    subprocess.check_call([
        sys.executable, str(ROOT / "scripts/chroma_to_png.py"),
        str(src), str(tmp), "--size", "480",
        "--band", "11", "--spill", "0.22", "--erode", "5", "--rim", "18",
    ])
    return tmp


def rounded_white(size: int, radius: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    white = Image.new("RGBA", (size, size), (255, 252, 246, 255))
    img.paste(white, (0, 0), mask)
    return img


def compose(name: str) -> None:
    cut = chroma(name)
    subject = Image.open(cut).convert("RGBA")
    cut.unlink(missing_ok=True)

    bbox = subject.getbbox()
    if bbox:
        subject = subject.crop(bbox)

    max_side = CONTENT - 28
    scale = min(max_side / subject.width, max_side / subject.height)
    subject = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.LANCZOS,
    )

    sticker = rounded_white(CANVAS, RADIUS)
    sx = (CANVAS - subject.width) // 2
    sy = (CANVAS - subject.height) // 2
    out = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    out = Image.alpha_composite(out, sticker)
    out.paste(subject, (sx, sy), subject)

    RAW.mkdir(parents=True, exist_ok=True)
    out.save(RAW / f"sticker-{name}.png")
    out.save(ATOMS / f"sticker-{name}.png")
    print(f"sticker-{name}.png", out.size, "from", "base/v2")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()
    names = ANIMALS if args.all else args.names
    if not names:
        ap.error("provide animal names or --all")
    for name in names:
        compose(name)


if __name__ == "__main__":
    main()
