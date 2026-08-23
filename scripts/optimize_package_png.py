#!/usr/bin/env python3
"""对 miniprogram 内 PNG 做 zopfli 无损再压（不改像素、不转调色板/JPEG）。

用法：
    python3 -m pip install zopfli
    python3 scripts/optimize_package_png.py
"""

from __future__ import annotations

import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MP = ROOT / "miniprogram"


def zopfli_bytes(data: bytes) -> bytes:
    import zopfli.png

    return zopfli.png.optimize(
        data,
        verbose=False,
        lossy_transparent=False,
        lossy_8bit=False,
        use_zopfli=True,
        num_iterations=15,
        num_iterations_large=5,
    )


def zopfli_file(path: str) -> tuple[str, int, int]:
    p = Path(path)
    raw = p.read_bytes()
    before = len(raw)
    try:
        out = zopfli_bytes(raw)
    except Exception:
        return str(p), before, before
    if len(out) < before:
        p.write_bytes(out)
        return str(p), before, len(out)
    return str(p), before, before


def zopfli_path(path: Path) -> int:
    """压缩单个 PNG，返回压缩后字节数。zopfli 不可用时原样返回。"""
    try:
        _, _, after = zopfli_file(str(path))
        return after
    except Exception:
        return path.stat().st_size


def main() -> None:
    try:
        import zopfli.png  # noqa: F401
    except ImportError:
        print("请先安装: python3 -m pip install zopfli", file=sys.stderr)
        sys.exit(1)

    files = sorted(MP.rglob("*.png"))
    if not files:
        print("没有 PNG")
        return

    before_total = sum(p.stat().st_size for p in files)
    saved_n = 0
    after_total = 0

    with ProcessPoolExecutor() as pool:
        futs = [pool.submit(zopfli_file, str(p)) for p in files]
        for fut in as_completed(futs):
            rel, before, after = fut.result()
            after_total += after
            if after < before:
                saved_n += 1
                name = Path(rel).relative_to(MP)
                print(f"  {before / 1024:7.1f} -> {after / 1024:6.1f} KB  {name}")

    print(
        f"\nfiles={len(files)} squeezed={saved_n}  "
        f"{before_total / 1024:.1f} -> {after_total / 1024:.1f} KB  "
        f"({(after_total - before_total) / before_total * 100:+.1f}%)"
    )


if __name__ == "__main__":
    main()
