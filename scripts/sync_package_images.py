#!/usr/bin/env python3
"""从 docs/design/atoms 同步真彩图到 miniprogram，去掉 256 色调色板压缩。

- 不跑 chroma 去背，只用已归档原子
- 透明素材：RGBA PNG，预乘 alpha 后按原图比例缩最长边（不去背、不铺方画布）
- 古诗封面：同样 PNG，按原图比例缩最长边；草地用 PNG（原子 750×390，不再压 JPEG）
- icons/home.png 无同名原子时回退 home-clay.png
- 底部草地用裁切丘坡 meadow-hill / meadow_s 同步为 PNG；夜景用 CSS，不再出第二张图
- 英语列表缩略图从原子直接出 128px（字卡约 88–100rpx 的 2x），写入 english/static/list/

用法：
    python3 scripts/sync_package_images.py
"""

from __future__ import annotations

import re
from pathlib import Path

from PIL import Image

from chroma_to_png import clean_fringe, resize_premul
from optimize_package_png import zopfli_path

ROOT = Path(__file__).resolve().parents[1]
ATOMS = ROOT / "docs/design/atoms"
MP = ROOT / "miniprogram"

# 2x：代码包边长 ≈ 屏上 rpx。只限制最长边，保持原子宽高比。
SIDE_ENGLISH = 320
# 字母 360rpx；26 张 + 字母歌同包，272 是还能进 1.85MB 的上限
SIDE_ABC = 272
SIDE_LIST = 128
# 算术数一数最大 256rpx
SIDE_MATH = 384
# 拼音/日历详情 360rpx，原子约 448，包有余量就用原子边长
SIDE_DEFAULT = 448
# 古诗通栏约 690rpx；6 张 PNG 用 750 会超 2MB，最长边 560 才能进包
SIDE_POEM = 560
# 首页吉祥物 168–172rpx
SIDE_HOME = 192
# 表扬弹层主图 288rpx（大星星）；云朵/草丛一并提到 320
SIDE_DECOR = 320
# 商城贴纸卡内图约 170–200rpx
SIDE_STICKER = 256
SIDE_ICON = 128
# 草地通栏 750rpx，与原子同宽
SIDE_MEADOW = 750
ICON_STEMS = {"play", "stop", "check", "home", "star", "arrow"}
JPEG_QUALITY = 82

ENGLISH_DETAIL_PACKS = (
    "english-fruit",
    "english-animal",
    "english-color",
    "english-body",
    "english-transport",
    "english-number",
    "english-food",
    "english-nature",
)


def atom_for(name: str) -> Path | None:
    stem = Path(name).stem
    for candidate in (ATOMS / name, ATOMS / f"{stem}.png"):
        if candidate.exists():
            return candidate
    if name in ("home.png", "home.jpg"):
        alt = ATOMS / "home-clay.png"
        return alt if alt.exists() else None
    return None


def _unlink_jpg(dest_png: Path) -> None:
    jpg = dest_png.with_suffix(".jpg")
    if jpg.exists():
        jpg.unlink()


def _unlink_png(dest_jpg: Path) -> None:
    png = dest_jpg.with_suffix(".png")
    if png.exists():
        png.unlink()


def _fit_size(size: tuple[int, int], max_side: int) -> tuple[int, int]:
    w, h = size
    longest = max(w, h)
    if longest <= max_side:
        return w, h
    scale = max_side / longest
    return max(1, round(w * scale)), max(1, round(h * scale))


def save_jpeg(src: Path, dest: Path, quality: int = JPEG_QUALITY) -> tuple[int, int, int]:
    """仅草地：不透明大图用 JPEG 控主包体积。不拉扯比例。"""
    im = Image.open(src).convert("RGB")
    dest = dest.with_suffix(".jpg")
    dest.parent.mkdir(parents=True, exist_ok=True)
    _unlink_png(dest)
    im.save(dest, format="JPEG", quality=quality, optimize=True, progressive=True)
    return im.size[0], im.size[1], dest.stat().st_size


def save_png(src: Path, dest: Path, max_side: int) -> tuple[int, int, int]:
    """不透明 PNG：按原图比例缩最长边，不强制宽高。"""
    im = Image.open(src).convert("RGB")
    nw, nh = _fit_size(im.size, max_side)
    if (nw, nh) != im.size:
        im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    dest = dest.with_suffix(".png")
    dest.parent.mkdir(parents=True, exist_ok=True)
    _unlink_jpg(dest)
    im.save(dest, format="PNG", optimize=True, compress_level=9)
    zopfli_path(dest)
    return im.size[0], im.size[1], dest.stat().st_size


def save_rgba(src: Path, dest: Path, max_side: int) -> tuple[int, int, int]:
    im = Image.open(src).convert("RGBA")
    nw, nh = _fit_size(im.size, max_side)
    if (nw, nh) != im.size:
        im = resize_premul(im, (nw, nh))
    else:
        im = clean_fringe(im, kill_alpha=36)
    dest = dest.with_suffix(".png")
    dest.parent.mkdir(parents=True, exist_ok=True)
    _unlink_jpg(dest)
    im.save(dest, format="PNG", optimize=True, compress_level=9)
    zopfli_path(dest)
    return im.size[0], im.size[1], dest.stat().st_size


def max_side_for(rel: Path, stem: str | None = None) -> int:
    name = stem if stem is not None else rel.stem
    if name in ICON_STEMS:
        return SIDE_ICON
    if rel.parts[:2] == ("static", "home") and name != "star":
        return SIDE_HOME
    if name in {"big-star", "cloud", "grass-tuft"}:
        return SIDE_DECOR
    if rel.parts[:2] == ("subpkg", "shop") and name.startswith("sticker-"):
        return SIDE_STICKER
    if rel.parts[:4] == ("subpkg", "english", "static", "list"):
        return SIDE_LIST
    if len(rel.parts) >= 2 and rel.parts[0] == "subpkg":
        pkg = rel.parts[1]
        if pkg == "english-abc":
            return SIDE_ABC
        if pkg in ENGLISH_DETAIL_PACKS:
            return SIDE_ENGLISH
        if pkg == "math":
            return SIDE_MATH
    return SIDE_DEFAULT


def main() -> None:
    updated = 0
    skipped = 0
    targets = sorted({*MP.rglob("*.png"), *MP.rglob("*.jpg")})
    for dest in targets:
        rel = dest.relative_to(MP)
        posix = rel.as_posix()
        if posix in ("static/home/meadow.png", "static/home/meadow.jpg"):
            print(f"skip (deduped) {rel}")
            skipped += 1
            continue
        if rel.parts[:4] == ("subpkg", "english", "static", "list"):
            continue

        stem = dest.stem
        if stem.startswith("meadow-night"):
            print(f"skip (css night) {rel}")
            skipped += 1
            continue
        if stem == "meadow":
            src = ATOMS / "meadow_s.png"
            if not src.exists():
                print(f"skip (no atom) {rel}")
                skipped += 1
                continue
            w, h, n = save_png(src, dest, SIDE_MEADOW)
            print(f"ok png-meadow {w}x{h} {n / 1024:6.1f}KB  {dest.with_suffix('.png').relative_to(MP)}")
            updated += 1
            continue

        src = atom_for(dest.name)
        if src is None or not src.exists():
            print(f"skip (no atom) {rel}")
            skipped += 1
            continue

        if stem.startswith("poem-"):
            w, h, n = save_png(src, dest, SIDE_POEM)
            kind = "png-poem"
            out_rel = dest.with_suffix(".png").relative_to(MP)
        else:
            w, h, n = save_rgba(src, dest, max_side_for(rel, stem))
            kind = "rgba"
            out_rel = dest.with_suffix(".png").relative_to(MP)

        print(f"ok {kind:10} {w}x{h} {n / 1024:6.1f}KB  {out_rel}")
        updated += 1

    write_english_list_thumbs()
    write_english_hub_preview()
    print(f"\nupdated={updated} skipped={skipped}")


def write_english_list_thumbs() -> None:
    """从原子出 128px 缩略图到 english/static/list，供单词列表真机显示。"""
    dest_dir = MP / "subpkg/english/static/list"
    dest_dir.mkdir(parents=True, exist_ok=True)
    words_js = MP / "subpkg/english/content/english-words.js"
    stems = re.findall(r'"image":\s*"(english-[^"]+)"', words_js.read_text())
    wanted: set[str] = set()
    for stem in stems:
        name = f"{stem}.png"
        src = atom_for(name)
        if src is None:
            print(f"skip (no atom) list/{name}")
            continue
        wanted.add(name)
        dest = dest_dir / name
        w, h, n = save_rgba(src, dest, SIDE_LIST)
        print(f"ok list-thumb {w}x{h} {n / 1024:6.1f}KB  {dest.relative_to(MP)}")
    for leftover in dest_dir.glob("*.png"):
        if leftover.name not in wanted:
            leftover.unlink()
            print(f"rm stale-thumb {leftover.relative_to(MP)}")


def write_english_hub_preview() -> None:
    """枢纽单词入口用 320px 苹果图，避免 188rpx 大卡去读列表小图。"""
    src = atom_for("english-fruit-apple.png")
    if src is None:
        print("skip (no atom) english-fruit-apple.png")
        return
    dest = MP / "subpkg/english/static/english-fruit-apple.png"
    w, h, n = save_rgba(src, dest, SIDE_ENGLISH)
    print(f"ok hub-preview {w}x{h} {n / 1024:6.1f}KB  {dest.relative_to(MP)}")


if __name__ == "__main__":
    main()
