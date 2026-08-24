#!/usr/bin/env python3
"""从 docs/design/atoms 同步真彩图到 miniprogram，去掉 256 色调色板压缩。

- 不跑 chroma 去背，只用已归档原子
- 透明素材：RGBA PNG，按分包预算限制最长边
- 古诗封面：不透明，缩小到 400×300 后存 JPEG（与草地同一套路）
- icons/home.png 无同名原子时回退 home-clay.png
- 底部草地用裁切丘坡 meadow-hill 同步为 JPEG；夜景用 CSS，不再出第二张图

用法：
    python3 scripts/sync_package_images.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from optimize_package_png import zopfli_path

ROOT = Path(__file__).resolve().parents[1]
ATOMS = ROOT / "docs/design/atoms"
MP = ROOT / "miniprogram"

# 英语分包已拆 english + english-extra + english-more；边长兼顾列表小卡与详情大图
SIDE_ENGLISH = 160
# 列表缩略图放在 english 包内，避免真机跨分包读图失败
SIDE_LIST = 96
# 算术数一数只留苹果，边长与英语对齐
SIDE_MATH = 160
SIDE_DEFAULT = 272
# 首页入口吉祥物约 168rpx；主包代码质量线 1.5MB，用 160px 换余量
SIDE_HOME = 160
SIDE_DECOR = 160
# 商城三列贴纸约 200rpx，192px 足够 2x，24 张从 272 收下来能明显瘦包
SIDE_STICKER = 192
# 播放/停止/勾选/首页/星星屏上只有几十 rpx，128 已覆盖 3x
SIDE_ICON = 128
ICON_STEMS = {"play", "stop", "check", "home", "star", "arrow"}
POEM_SIZE = (400, 300)
MEADOW_WIDTH = 750


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


def save_jpeg(
    src: Path,
    dest: Path,
    size: tuple[int, int] | None = None,
) -> tuple[int, int, int]:
    """不透明图：JPEG quality 82。草地原尺寸；古诗封面缩到 400×300。"""
    im = Image.open(src).convert("RGB")
    if size is not None:
        im = im.resize(size, Image.Resampling.LANCZOS)
    dest = dest.with_suffix(".jpg")
    dest.parent.mkdir(parents=True, exist_ok=True)
    _unlink_png(dest)
    im.save(dest, format="JPEG", quality=82, optimize=True, progressive=True)
    return im.size[0], im.size[1], dest.stat().st_size


def save_rgba(src: Path, dest: Path, max_side: int) -> tuple[int, int, int]:
    im = Image.open(src).convert("RGBA")
    if max(im.size) > max_side:
        im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
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
    if rel.parts[:2] in (
        ("subpkg", "english"),
        ("subpkg", "english-extra"),
        ("subpkg", "english-more"),
        ("subpkg", "english-abc"),
    ):
        return SIDE_ENGLISH
    if rel.parts[:2] == ("subpkg", "math"):
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

        stem = dest.stem
        if stem.startswith("meadow-night"):
            print(f"skip (css night) {rel}")
            skipped += 1
            continue
        if stem == "meadow":
            src = ATOMS / "meadow_s.png"
            if src is None or not src.exists():
                print(f"skip (no atom) {rel}")
                skipped += 1
                continue
            w, h, n = save_jpeg(src, dest)
            print(f"ok jpeg-meadow {w}x{h} {n / 1024:6.1f}KB  {dest.with_suffix('.jpg').relative_to(MP)}")
            updated += 1
            continue
        else:
            src = atom_for(dest.name)
        if src is None or not src.exists():
            print(f"skip (no atom) {rel}")
            skipped += 1
            continue

        if stem.startswith("poem-"):
            w, h, n = save_jpeg(src, dest, size=POEM_SIZE)
            kind = "jpeg-poem"
            out_rel = dest.with_suffix(".jpg").relative_to(MP)
        else:
            w, h, n = save_rgba(src, dest, max_side_for(rel, stem))
            kind = "rgba"
            out_rel = dest.with_suffix(".png").relative_to(MP)

        print(f"ok {kind:10} {w}x{h} {n / 1024:6.1f}KB  {out_rel}")
        updated += 1

    write_english_list_thumbs()
    print(f"\nupdated={updated} skipped={skipped}")


def write_english_list_thumbs() -> None:
    """把 extra/more 词图缩到 96px 放进 english/static/list，供单词列表真机显示。"""
    dest_dir = MP / "subpkg/english/static/list"
    dest_dir.mkdir(parents=True, exist_ok=True)
    sources = [
        *(MP / "subpkg/english-extra/static").glob("*.png"),
        *(MP / "subpkg/english-more/static").glob("*.png"),
    ]
    for src in sources:
        dest = dest_dir / src.name
        save_rgba(src, dest, SIDE_LIST)
        print(f"ok list-thumb {dest.relative_to(MP)}")


if __name__ == "__main__":
    main()
