#!/usr/bin/env python3
"""从 docs/design/atoms 同步真彩图到 miniprogram，去掉 256 色调色板压缩。

- 不跑 chroma 去背，只用已归档原子
- 透明素材：RGBA PNG，按分包预算限制最长边
- 古诗封面 / 草地：RGB PNG（不透明）
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

# 英语分包音频较多，动物边长略紧；其余可稍高清
SIDE_ENGLISH = 256
SIDE_DEFAULT = 272
POEM_SIZE = (480, 360)


def atom_for(name: str) -> Path | None:
    direct = ATOMS / name
    if direct.exists():
        return direct
    if name == "home.png":
        alt = ATOMS / "home-clay.png"
        return alt if alt.exists() else None
    return None


def save_rgba(src: Path, dest: Path, max_side: int) -> tuple[int, int, int]:
    im = Image.open(src).convert("RGBA")
    if max(im.size) > max_side:
        im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, format="PNG", optimize=True)
    return im.size[0], im.size[1], dest.stat().st_size


def save_rgb(src: Path, dest: Path, size: tuple[int, int] | None = None) -> tuple[int, int, int]:
    im = Image.open(src).convert("RGB")
    if size is not None:
        im = im.resize(size, Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, format="PNG", optimize=True)
    return im.size[0], im.size[1], dest.stat().st_size


def max_side_for(rel: Path) -> int:
    if rel.parts[:2] == ("subpkg", "english"):
        return SIDE_ENGLISH
    return SIDE_DEFAULT


def main() -> None:
    updated = 0
    skipped = 0
    for dest in sorted(MP.rglob("*.png")):
        rel = dest.relative_to(MP)
        # 首页草地已统一到 shared/meadow.png，勿再生成 home/meadow
        if rel.as_posix() == "static/home/meadow.png":
            print(f"skip (deduped) {rel}")
            skipped += 1
            continue

        src = atom_for(dest.name)
        if src is None:
            print(f"skip (no atom) {rel}")
            skipped += 1
            continue

        name = dest.name
        if name.startswith("poem-"):
            w, h, n = save_rgb(src, dest, POEM_SIZE)
            kind = "rgb-poem"
        elif name in ("meadow.png", "meadow-night.png"):
            w, h, n = save_rgb(src, dest, None)
            kind = "rgb-meadow"
        else:
            w, h, n = save_rgba(src, dest, max_side_for(rel))
            kind = "rgba"

        print(f"ok {kind:10} {w}x{h} {n / 1024:6.1f}KB  {rel}")
        updated += 1

    print(f"\nupdated={updated} skipped={skipped}")


if __name__ == "__main__":
    main()
