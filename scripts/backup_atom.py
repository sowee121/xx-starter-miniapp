#!/usr/bin/env python3
"""覆盖原子前备份：复制到 docs/design/atoms/_history/{stem}/{时间戳}.png"""

from __future__ import annotations

import shutil
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HISTORY = ROOT / "docs/design/atoms/_history"


def backup(path: Path) -> Path | None:
    src = path if path.is_absolute() else ROOT / path
    if not src.is_file():
        print(f"skip (missing) {src}")
        return None
    dest_dir = HISTORY / src.stem
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{datetime.now().strftime('%Y%m%d-%H%M%S')}.png"
    if dest.exists():
        dest = dest_dir / f"{datetime.now().strftime('%Y%m%d-%H%M%S-%f')}.png"
    shutil.copy2(src, dest)
    print(f"bak {src.relative_to(ROOT)} -> {dest.relative_to(ROOT)}")
    return dest


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python3 scripts/backup_atom.py <atom.png> [more.png]")
        sys.exit(1)
    for arg in sys.argv[1:]:
        backup(Path(arg))


if __name__ == "__main__":
    main()
