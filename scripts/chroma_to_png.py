#!/usr/bin/env python3
"""洋红幕布素材去背：抠出主体、裁掉空白、按需降饱和后另存为透明 PNG。

用法：
    python3 scripts/chroma_to_png.py 输入.png 输出.png [--size 512] [--desat 0.35] [--light 0.06]
"""

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


def build_alpha(rgb: Image.Image) -> Image.Image:
    """从画布四边泛洪，只移除与外部连通的洋红幕布。

    单纯按颜色全图删除会把独角兽的紫色鬃毛、粉色腮红一起误抠。
    原子素材的幕布必然与画布边缘相连，因此先做候选色判断，再从
    四边泛洪，只透明化外部连通区域，可保留主体内部的同色细节。
    """
    px = rgb.load()
    w, h = rgb.size
    alpha = Image.new("L", (w, h), 255)
    px_a = alpha.load()

    def is_magenta(x: int, y: int) -> bool:
        cr, cg, cb = px[x, y]
        lo = min(cr, cb)
        return lo > 45 and cg < lo - 45

    queue: deque[tuple[int, int]] = deque()
    seen = bytearray(w * h)

    def add(x: int, y: int) -> None:
        idx = y * w + x
        if not seen[idx] and is_magenta(x, y):
            seen[idx] = 1
            queue.append((x, y))

    for x in range(w):
        add(x, 0)
        add(x, h - 1)
    for y in range(h):
        add(0, y)
        add(w - 1, y)

    while queue:
        x, y = queue.popleft()
        px_a[x, y] = 0
        if x > 0:
            add(x - 1, y)
        if x + 1 < w:
            add(x + 1, y)
        if y > 0:
            add(x, y - 1)
        if y + 1 < h:
            add(x, y + 1)

    return alpha


def despill(
    rgb: Image.Image, alpha: Image.Image, band: int = 7, spill: float = 0.34, rim: int = 0
) -> Image.Image:
    """只在贴近幕布的一圈边缘去洋红溢色。

    主体内部的粉色腮红、彩色珠子同样是「红蓝高、绿低」，
    全图处理会把它们一起压灰，所以限定在边缘band内。
    毛毡绒毛边缘的洋红晕开得更宽，需要更大的 band 和更狠的 spill。

    rim 另外压制幕布反光烤进绒毛的珊瑚红镶边：那种像素红高、绿蓝都低，
    不满足洋红判定，只能按「红绿差上限」单独收。
    """
    edge = alpha.point(lambda v: 255 if v == 0 else 0).filter(ImageFilter.MaxFilter(band))
    px = rgb.load()
    pa = alpha.load()
    pe = edge.load()
    w, h = rgb.size
    for y in range(h):
        for x in range(w):
            if pa[x, y] == 0 or pe[x, y] == 0:
                continue
            cr, cg, cb = px[x, y]
            if cr > cg and cb > cg:
                cap = cg + round((max(cr, cb) - cg) * spill)
                cr, cb = min(cr, cap), min(cb, cap)
            if rim and cr - cg > rim:
                cr = cg + rim
            px[x, y] = (cr, cg, cb)
    return rgb


def tone(img: Image.Image, desat: float, light: float) -> Image.Image:
    """向马卡龙低饱和色系靠拢。"""
    if desat <= 0 and light <= 0:
        return img
    r, g, b, a = img.split()
    px_r, px_g, px_b = r.load(), g.load(), b.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            cr, cg, cb = px_r[x, y], px_g[x, y], px_b[x, y]
            grey = (cr * 299 + cg * 587 + cb * 114) // 1000
            vals = []
            for c in (cr, cg, cb):
                v = c + (grey - c) * desat
                v = v + (255 - v) * light
                vals.append(int(max(0, min(255, v))))
            px_r[x, y], px_g[x, y], px_b[x, y] = vals
    return Image.merge("RGBA", (r, g, b, a))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--size", type=int, default=512, help="最长边输出尺寸")
    ap.add_argument("--desat", type=float, default=0.0)
    ap.add_argument("--light", type=float, default=0.0)
    ap.add_argument("--band", type=int, default=7, help="去溢色的边缘宽度，绒毛边要调大")
    ap.add_argument("--spill", type=float, default=0.34, help="边缘残留洋红的保留比例，越小压得越狠")
    ap.add_argument("--erode", type=int, default=3, help="边缘收缩核，绒毛边要调大")
    ap.add_argument("--rim", type=int, default=0, help="边缘允许的最大红绿差，压幕布反光的粉边")
    args = ap.parse_args()

    src = Image.open(args.src).convert("RGB")
    alpha = build_alpha(src)
    alpha = alpha.filter(ImageFilter.MinFilter(args.erode)).filter(ImageFilter.GaussianBlur(0.8))
    src = despill(src, alpha, band=args.band, spill=args.spill, rim=args.rim)

    out = src.convert("RGBA")
    out.putalpha(alpha)
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    out = tone(out, args.desat, args.light)

    scale = args.size / max(out.size)
    out = out.resize((max(1, round(out.width * scale)), max(1, round(out.height * scale))), Image.LANCZOS)

    dst = Path(args.dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst)
    print(dst, out.size)


if __name__ == "__main__":
    main()
