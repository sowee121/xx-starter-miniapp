#!/usr/bin/env python3
"""把生成的古诗封面裁成统一 4:3，并同步到 atoms / 小程序 / 云资源 / H5。"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SRC = Path(
    "/Users/ww/.cursor/projects/Users-ww-Projects-Miniprogram-xx-starter-miniapp/assets"
)
ATOMS = ROOT / "docs/design/atoms"
RAW = ATOMS / "raw"
MP_OUT = ROOT / "miniprogram/subpkg/poem/static"
CLOUD_OUT = ROOT / "cloud-assets/subpkg/poem/static"
H5_POEM = ROOT / "docs/design/h5/poem"
PROJECT_ASSETS = ROOT / "assets"

W, H = 640, 480
ATOMS_W, ATOMS_H = 1280, 960

MAP = {
    "cover-yong-e.png": "poem-yong-e.png",
    "cover-jing-ye-si.png": "poem-jing-ye-si.png",
    "cover-min-nong.png": "poem-min-nong.png",
    "cover-chun-xiao.png": "poem-chun-xiao.png",
    "cover-deng-guan-que-lou.png": "poem-deng-guan-que-lou.png",
    "cover-wang-lu-shan.png": "poem-wang-lu-shan-pu-bu.png",
}


def crop_to_43(im: Image.Image) -> Image.Image:
    im = im.convert("RGB")
    w, h = im.size
    target = 4 / 3
    current = w / h
    if abs(current - target) < 0.01:
        return im
    if current > target:
        new_w = round(h * target)
        x = (w - new_w) // 2
        return im.crop((x, 0, x + new_w, h))
    new_h = round(w / target)
    y = (h - new_h) // 2
    return im.crop((0, y, w, y + new_h))


def save_palette(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    quantized = im.convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    quantized.save(path, optimize=True)


def pack() -> None:
    PROJECT_ASSETS.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    ATOMS.mkdir(parents=True, exist_ok=True)
    MP_OUT.mkdir(parents=True, exist_ok=True)
    CLOUD_OUT.mkdir(parents=True, exist_ok=True)
    H5_POEM.mkdir(parents=True, exist_ok=True)

    thumbs: list[Image.Image] = []
    for src_name, dst_name in MAP.items():
        src = SRC / src_name
        if not src.exists():
            raise FileNotFoundError(src)

        shutil.copy2(src, PROJECT_ASSETS / src_name)
        shutil.copy2(src, RAW / dst_name)

        cropped = crop_to_43(Image.open(src))
        hi = cropped.resize((ATOMS_W, ATOMS_H), Image.Resampling.LANCZOS)
        lo = cropped.resize((W, H), Image.Resampling.LANCZOS)

        hi.save(ATOMS / dst_name, optimize=True)
        hi.save(H5_POEM / dst_name, optimize=True)
        save_palette(lo, MP_OUT / dst_name)
        save_palette(lo, CLOUD_OUT / dst_name)

        thumbs.append(lo)
        print(f"ok {dst_name} {hi.size} mp={(MP_OUT / dst_name).stat().st_size}B")

    sheet = Image.new("RGB", (W * 3, H * 2), "#f5f2ea")
    for i, im in enumerate(thumbs):
        sheet.paste(im, ((i % 3) * W, (i // 3) * H))
    contact = Path("/tmp/poem-covers-gen-contact.jpg")
    sheet.save(contact, quality=92)
    print(f"contact → {contact}")


if __name__ == "__main__":
    pack()
