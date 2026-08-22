#!/usr/bin/env python3
"""从 docs/design/atoms 同步真彩图到 miniprogram，去掉 256 色调色板压缩。

- 不跑 chroma 去背，只用已归档原子
- 透明素材：RGBA PNG，按分包预算限制最长边
- 古诗封面 / 草地：不透明 RGB PNG（缩小边长 + PNG 压缩，不转 JPEG）
- icons/home.png 无同名原子时回退 home-clay.png
- 首页草地统一为 static/shared/meadow.png（不再复制到 home/）

用法：
    python3 scripts/sync_package_images.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ATOMS = ROOT / "docs/design/atoms"
MP = ROOT / "miniprogram"

# 英语分包已拆 english + english-extra + english-more；边长兼顾列表小卡与详情大图
SIDE_ENGLISH = 160
# 算术数一数水果与英语对齐，避免重复素材过大
SIDE_MATH = 160
SIDE_DEFAULT = 272
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


def save_rgba(src: Path, dest: Path, max_side: int) -> tuple[int, int, int]:
    im = Image.open(src).convert("RGBA")
    if max(im.size) > max_side:
        im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    dest = dest.with_suffix(".png")
    dest.parent.mkdir(parents=True, exist_ok=True)
    _unlink_jpg(dest)
    im.save(dest, format="PNG", optimize=True, compress_level=9)
    return im.size[0], im.size[1], dest.stat().st_size


def save_rgb_png(
    src: Path,
    dest: Path,
    size: tuple[int, int] | None = None,
    max_width: int | None = None,
) -> tuple[int, int, int]:
    im = Image.open(src).convert("RGB")
    if size is not None:
        im = im.resize(size, Image.Resampling.LANCZOS)
    elif max_width is not None and im.width > max_width:
        h = round(im.height * max_width / im.width)
        im = im.resize((max_width, h), Image.Resampling.LANCZOS)
    dest = dest.with_suffix(".png")
    dest.parent.mkdir(parents=True, exist_ok=True)
    _unlink_jpg(dest)
    im.save(dest, format="PNG", optimize=True, compress_level=9)
    return im.size[0], im.size[1], dest.stat().st_size


def max_side_for(rel: Path) -> int:
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

        src = atom_for(dest.name)
        if src is None:
            print(f"skip (no atom) {rel}")
            skipped += 1
            continue

        stem = dest.stem
        if stem.startswith("poem-"):
            w, h, n = save_rgb_png(src, dest, size=POEM_SIZE)
            kind = "rgb-poem"
            out_rel = dest.with_suffix(".png").relative_to(MP)
        elif stem in ("meadow", "meadow-night"):
            w, h, n = save_rgb_png(src, dest, max_width=MEADOW_WIDTH)
            kind = "rgb-meadow"
            out_rel = dest.with_suffix(".png").relative_to(MP)
        else:
            w, h, n = save_rgba(src, dest, max_side_for(rel))
            kind = "rgba"
            out_rel = dest.with_suffix(".png").relative_to(MP)

        print(f"ok {kind:10} {w}x{h} {n / 1024:6.1f}KB  {out_rel}")
        updated += 1

    print(f"\nupdated={updated} skipped={skipped}")


if __name__ == "__main__":
    main()
