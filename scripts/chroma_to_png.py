#!/usr/bin/env python3
"""洋红幕布素材去背：抠出主体、裁掉空白、按需降饱和后另存为透明 PNG。

用法：
    python3 scripts/chroma_to_png.py 输入.png 输出.png [--size 448]
    python3 scripts/chroma_to_png.py in.png out.png --clear-holes   # 字母镂空
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


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


def fit_canvas(
    img: Image.Image, canvas: int, *, align: str = "center", bottom_pad: int = 12
) -> Image.Image:
    """预乘 alpha 后缩放，避免透明边与黑底混出脏边。"""
    w, h = img.size
    target = int(canvas * 0.92)
    scale = min(target / w, target / h)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    if (nw, nh) != (w, h):
        arr = np.asarray(img.convert("RGBA"), dtype=np.float32)
        rgb, a = arr[:, :, :3], arr[:, :, 3:4] / 255.0
        premul = np.dstack([rgb * a, arr[:, :, 3]])
        premul_img = Image.fromarray(np.clip(premul, 0, 255).astype(np.uint8), mode="RGBA")
        premul_img = premul_img.resize((nw, nh), Image.Resampling.LANCZOS)
        out_a = np.asarray(premul_img, dtype=np.float32)
        a2 = out_a[:, :, 3:4] / 255.0
        rgb2 = np.divide(
            out_a[:, :, :3],
            np.maximum(a2, 1e-4),
            out=np.zeros_like(out_a[:, :, :3]),
            where=a2 > 1e-4,
        )
        img = Image.fromarray(
            np.dstack([np.clip(rgb2, 0, 255), out_a[:, :, 3]]).astype(np.uint8),
            mode="RGBA",
        )
        img = clean_fringe(img, kill_alpha=36)
    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    x = (canvas - nw) // 2
    if align == "bottom":
        y = canvas - bottom_pad - nh
    else:
        y = (canvas - nh) // 2
    out.paste(img, (x, y), img)
    return out


def _magenta_mask(r: np.ndarray, g: np.ndarray, b: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    lo = np.minimum(r, b)
    mag = (lo > 40) & (g < lo - 40)
    strength = np.clip((lo.astype(np.float32) - g.astype(np.float32) - 40.0) / 80.0, 0.0, 1.0)
    strength = np.where(mag, strength, 0.0)
    return mag, strength


def _flood_bg(mag: np.ndarray) -> np.ndarray:
    h, w = mag.shape
    seen = np.zeros((h, w), dtype=np.uint8)
    q: deque[tuple[int, int]] = deque()

    def try_add(x: int, y: int) -> None:
        if mag[y, x] and not seen[y, x]:
            seen[y, x] = 1
            q.append((x, y))

    for x in range(w):
        try_add(x, 0)
        try_add(x, h - 1)
    for y in range(h):
        try_add(0, y)
        try_add(w - 1, y)

    while q:
        x, y = q.popleft()
        if x > 0:
            try_add(x - 1, y)
        if x + 1 < w:
            try_add(x + 1, y)
        if y > 0:
            try_add(x, y - 1)
        if y + 1 < h:
            try_add(x, y + 1)
    return seen.astype(bool)


def clean_fringe(rgba: Image.Image, *, kill_alpha: int = 28) -> Image.Image:
    """去掉半透明脏边：弱 alpha 直接剔除，其余 fringe 用邻近实体色填色。"""
    arr = np.asarray(rgba.convert("RGBA"), dtype=np.uint8).copy()
    rgb = arr[:, :, :3].astype(np.float32)
    a = arr[:, :, 3].astype(np.float32)

    a = np.where(a < kill_alpha, 0.0, a)

    solid = a > 220
    # 实体色场：仅保留高不透明像素，模糊后回填 fringe
    solid_rgb = np.where(solid[..., None], rgb, 0.0)
    solid_w = solid.astype(np.float32)
    # 用较大核把实体色扩到边缘
    def blur_f32(ch: np.ndarray, radius: float) -> np.ndarray:
        img = Image.fromarray(np.clip(ch, 0, 255).astype(np.uint8), mode="L")
        img = img.filter(ImageFilter.GaussianBlur(radius))
        return np.asarray(img, dtype=np.float32)

    radius = 2.5
    w_blur = blur_f32(solid_w * 255.0, radius) / 255.0
    w_blur = np.maximum(w_blur, 1e-4)
    filled = np.stack(
        [blur_f32(solid_rgb[:, :, c], radius) / w_blur for c in range(3)],
        axis=-1,
    )

    fringe = (a > 0) & (a < 250)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    lo = np.minimum(r, b)
    dirty = fringe & (
        ((lo > g + 18) & (lo > 50))  # 洋红残留
        | ((r + g + b) < 320)  # 半透明发灰/发暗（幕布晕）
        | ((np.maximum(r, b) - g) > 18)
    )
    # fringe 一律用邻近实体色，避免缩图后的灰黑镶边
    rgb = np.where(fringe[..., None], filled, rgb)
    # 额外兜底：仍标 dirty 的也强制实体色（同上）
    rgb = np.where(dirty[..., None], filled, rgb)

    # 砍掉过弱半透明，奶油底上更干净
    a = np.where(a < max(kill_alpha, 48), 0.0, a)
    out = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), np.clip(a, 0, 255).astype(np.uint8)])
    return Image.fromarray(out, mode="RGBA")


def soft_matte(
    rgb: Image.Image,
    *,
    clear_holes: bool = False,
    blur: float = 1.25,
    spill: float = 0.65,
) -> Image.Image:
    """软边缘去背：连续洋红强度 + 泛洪幕布 + 羽化，避免硬切毛刺。"""
    arr = np.asarray(rgb.convert("RGB"), dtype=np.int16)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    mag, strength = _magenta_mask(r, g, b)
    bg = _flood_bg(mag)
    if clear_holes:
        bg = bg | mag

    alpha = np.where(bg, (1.0 - strength) * 255.0, 255.0).astype(np.float32)
    alpha = np.where(strength > 0.88, 0.0, alpha)

    a_img = Image.fromarray(np.clip(alpha, 0, 255).astype(np.uint8), mode="L")
    if blur > 0:
        a_img = a_img.filter(ImageFilter.GaussianBlur(blur))
    alpha = np.asarray(a_img, dtype=np.float32)

    out = arr.astype(np.float32).copy()
    fringe = (alpha > 8) & (alpha < 248)
    pull = np.clip((np.maximum(r, b).astype(np.float32) - g.astype(np.float32)) / 80.0, 0.0, 1.0)
    pull = pull * fringe.astype(np.float32)
    for c in (0, 2):
        out[:, :, c] = out[:, :, c] * (1.0 - spill * pull) + g.astype(np.float32) * (spill * pull)

    rgba = np.dstack(
        [
            np.clip(out, 0, 255).astype(np.uint8),
            np.clip(alpha, 0, 255).astype(np.uint8),
        ]
    )
    return clean_fringe(Image.fromarray(rgba, mode="RGBA"))


def extract(
    src_path: Path,
    dst_path: Path,
    *,
    size: int = 448,
    clear_holes: bool = False,
    align: str = "center",
    desat: float = 0.0,
    light: float = 0.0,
    blur: float = 1.25,
    spill: float = 0.65,
    # legacy CLI knobs kept for compatibility (ignored by soft path)
    band: int = 7,
    erode: int = 3,
    rim: int = 24,
) -> Image.Image:
    del band, erode, rim  # soft matte replaces hard erode/rim path
    rgb = Image.open(src_path).convert("RGB")
    out = soft_matte(rgb, clear_holes=clear_holes, blur=blur, spill=spill)
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    out = tone(out, desat, light)
    out = fit_canvas(out, size, align=align)
    # 最终再清一次弱边（缩图可能重新引入）
    out = clean_fringe(out, kill_alpha=56)
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst_path, format="PNG", optimize=True)
    print(dst_path, out.size)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--size", type=int, default=448, help="输出画布边长")
    ap.add_argument("--desat", type=float, default=0.0)
    ap.add_argument("--light", type=float, default=0.0)
    ap.add_argument("--band", type=int, default=7, help="兼容旧参数（软抠忽略）")
    ap.add_argument("--spill", type=float, default=0.65, help="边缘去洋红溢色强度 0~1")
    ap.add_argument("--erode", type=int, default=3, help="兼容旧参数（软抠忽略）")
    ap.add_argument("--rim", type=int, default=0, help="兼容旧参数（软抠忽略）")
    ap.add_argument("--blur", type=float, default=1.25, help="alpha 羽化半径，去毛刺")
    ap.add_argument(
        "--clear-holes",
        action="store_true",
        help="清除封闭镂空内的洋红（字母用；动物腮红勿开）",
    )
    ap.add_argument(
        "--align",
        choices=("center", "bottom"),
        default="center",
        help="贴画布对齐方式",
    )
    args = ap.parse_args()

    extract(
        Path(args.src),
        Path(args.dst),
        size=args.size,
        clear_holes=args.clear_holes,
        align=args.align,
        desat=args.desat,
        light=args.light,
        blur=args.blur,
        spill=args.spill,
        band=args.band,
        erode=args.erode,
        rim=args.rim,
    )


if __name__ == "__main__":
    main()
