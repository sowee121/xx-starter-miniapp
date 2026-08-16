#!/usr/bin/env python3
"""合成统一的 4:3 古诗封面（黏土棚拍风）。

规范：
- 画布 640×480，横版长方形，不用浮岛 / 圆徽章 / 椭圆底座
- 6 首诗用 6 只不同动物（咏鹅侧立白鹅，其余干净坐姿动物）
- 右侧只放黏土诗意道具，禁止手绘楼阁/瀑布多边形
- H5 全彩；小程序与 cloud-assets 256 色 PNG
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ATOMS = ROOT / "docs/design/atoms"
POEM_ATOMS = ATOMS / "poem-atoms"
MP_OUT = ROOT / "miniprogram/subpkg/poem/static"
CLOUD_OUT = ROOT / "cloud-assets/subpkg/poem/static"
H5_IMG = ROOT / "docs/design/h5"

W, H = 640, 480
S = 2  # 超采样


def sc(v: float) -> int:
    return round(v * S)


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = hex_color.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def layer(size: tuple[int, int] | None = None) -> Image.Image:
    return Image.new("RGBA", size or (W * S, H * S), (0, 0, 0, 0))


def gradient_bg(top: str, bottom: str) -> Image.Image:
    im = layer()
    a, b = rgba(top), rgba(bottom)
    draw = ImageDraw.Draw(im)
    for y in range(H * S):
        t = y / max(1, H * S - 1)
        t = t * t * (3 - 2 * t)
        color = tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(4))
        draw.line((0, y, W * S, y), fill=color)
    return im


def soft_ground(canvas: Image.Image, color: str, y: float = 340, height: float = 220) -> None:
    ground = layer()
    draw = ImageDraw.Draw(ground)
    draw.ellipse(
        (sc(-40), sc(y), sc(W + 40), sc(y + height)),
        fill=rgba(color, 210),
    )
    ground = ground.filter(ImageFilter.GaussianBlur(sc(8)))
    canvas.alpha_composite(ground)


def drop_shadow(
    canvas: Image.Image,
    box: tuple[float, float, float, float],
    *,
    blur: float = 18,
    alpha: int = 48,
) -> None:
    x, y, w, h = box
    shadow = layer()
    draw = ImageDraw.Draw(shadow)
    cy = y + h * 0.92
    draw.ellipse(
        (sc(x + w * 0.12), sc(cy), sc(x + w * 0.88), sc(cy + h * 0.14)),
        fill=(70, 78, 62, alpha),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(sc(blur)))
    canvas.alpha_composite(shadow)


def paste_contain(
    canvas: Image.Image,
    source: Image.Image | Path,
    box: tuple[float, float, float, float],
    *,
    flip: bool = False,
    shadow: bool = True,
) -> None:
    im = source if isinstance(source, Image.Image) else Image.open(source).convert("RGBA")
    if flip:
        im = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)

    x, y, width, height = (sc(v) for v in box)
    im.thumbnail((width, height), Image.Resampling.LANCZOS)
    px = x + (width - im.width) // 2
    py = y + height - im.height
    if shadow:
        drop_shadow(
            canvas,
            (px / S, py / S, im.width / S, im.height / S),
        )
    canvas.alpha_composite(im, (px, py))


def soft_pond(canvas: Image.Image) -> None:
    """咏鹅用的软黏土水塘：多层椭圆 + 睡莲垫。"""
    pond = layer()
    draw = ImageDraw.Draw(pond)
    draw.ellipse((sc(320), sc(255), sc(610), sc(410)), fill=rgba("#6BAFCB", 210))
    draw.ellipse((sc(345), sc(275), sc(575), sc(375)), fill=rgba("#9FD0E4", 180))
    draw.ellipse((sc(390), sc(295), sc(510), sc(340)), fill=rgba("#E5F6FB", 140))
    for box, color in [
        ((360, 310, 420, 345), "#7BC47F"),
        ((450, 330, 520, 368), "#6BB56F"),
        ((500, 300, 555, 335), "#8AD08E"),
    ]:
        draw.ellipse(tuple(sc(v) for v in box), fill=rgba(color, 220))
    pond = pond.filter(ImageFilter.GaussianBlur(sc(2)))
    canvas.alpha_composite(pond)


def vignette(canvas: Image.Image, strength: int = 40) -> None:
    mask = layer()
    draw = ImageDraw.Draw(mask)
    draw.rectangle((0, 0, W * S, H * S), fill=(40, 45, 38, strength))
    hole = layer()
    ImageDraw.Draw(hole).ellipse(
        (sc(40), sc(20), sc(W - 40), sc(H - 10)),
        fill=(0, 0, 0, 255),
    )
    hole = hole.filter(ImageFilter.GaussianBlur(sc(50)))
    inv = Image.eval(hole.split()[-1], lambda a: 255 - a)
    dark = Image.merge(
        "RGBA",
        (*mask.split()[:3], inv.point(lambda a: a * strength // 255)),
    )
    canvas.alpha_composite(dark)


def save_palette_png(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    quantized = im.convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    quantized.save(path, optimize=True)


def save_cover(name: str, im: Image.Image, *, preview_dir: Path | None = None) -> None:
    final = im.resize((W, H), Image.Resampling.LANCZOS)

    if preview_dir:
        preview_dir.mkdir(parents=True, exist_ok=True)
        final.save(preview_dir / f"{name}.png")
        return

    ATOMS.mkdir(parents=True, exist_ok=True)
    final.save(ATOMS / f"{name}.png")

    save_palette_png(final, MP_OUT / f"{name}.png")
    save_palette_png(final, CLOUD_OUT / f"{name}.png")

    for h5_dir in [H5_IMG / "poem", H5_IMG / "assets", H5_IMG / "img"]:
        if h5_dir.exists():
            final.save(h5_dir / f"{name}.png")


# 咏鹅     侧立白鹅 + 软黏土水塘
# 静夜思   兔 + 月亮（玉兔望月）
# 悯农     牛 + 稻穗 + 篮子
# 春晓     鸟 + 雏菊 + 草丛
# 登鹳雀楼 猴 + 太阳（白日依山尽）
# 望庐山   水獭 + 瀑布山

COVERS = [
    {
        "name": "poem-yong-e",
        "animal": ATOMS / "goose.png",
        "prop": None,
        "top": "#C8E8F0",
        "bottom": "#E8F6F2",
        "ground": "#8FCF9A",
        "animal_box": (50, 40, 280, 400),
        "prop_box": None,
        "extra": "pond",
    },
    {
        "name": "poem-jing-ye-si",
        "animal": POEM_ATOMS / "animal-rabbit.png",
        "prop": POEM_ATOMS / "prop-moon.png",
        "top": "#D9D0F0",
        "bottom": "#EDE6F8",
        "ground": "#C5B8E0",
        "animal_box": (40, 80, 280, 360),
        "prop_box": (340, 40, 260, 300),
        "extra": None,
    },
    {
        "name": "poem-min-nong",
        "animal": POEM_ATOMS / "animal-cow.png",
        "prop": POEM_ATOMS / "prop-basket.png",
        "top": "#F3E4B8",
        "bottom": "#F8F0D8",
        "ground": "#C8B06A",
        "animal_box": (20, 80, 300, 360),
        "prop_box": (360, 160, 220, 240),
        "extra": "grass",
    },
    {
        "name": "poem-chun-xiao",
        "animal": POEM_ATOMS / "animal-bird.png",
        "prop": POEM_ATOMS / "prop-daisy.png",
        "top": "#C8E6C4",
        "bottom": "#E6F4E2",
        "ground": "#8FBF7A",
        "animal_box": (30, 90, 290, 350),
        "prop_box": (360, 80, 220, 300),
        "extra": "grass",
        "cloud": True,
    },
    {
        "name": "poem-deng-guan-que-lou",
        "animal": POEM_ATOMS / "animal-monkey.png",
        "prop": POEM_ATOMS / "prop-sun.png",
        "top": "#F5D5B8",
        "bottom": "#F8E8D4",
        "ground": "#D4B48A",
        "animal_box": (30, 90, 300, 350),
        "prop_box": (360, 40, 240, 240),
        "extra": None,
        "cloud": True,
    },
    {
        "name": "poem-wang-lu-shan-pu-bu",
        "animal": POEM_ATOMS / "animal-otter.png",
        "prop": POEM_ATOMS / "prop-waterfall.png",
        "top": "#B8DCE8",
        "bottom": "#D8EEF2",
        "ground": "#7AAD9A",
        "animal_box": (20, 90, 280, 350),
        "prop_box": (300, 20, 320, 400),
        "extra": None,
        "cloud": True,
    },
]


def render_one(spec: dict, *, preview_dir: Path | None = None) -> Path:
    canvas = gradient_bg(spec["top"], spec["bottom"])
    soft_ground(canvas, spec["ground"])

    if spec.get("extra") == "pond":
        soft_pond(canvas)

    if spec.get("cloud"):
        paste_contain(
            canvas,
            POEM_ATOMS / "prop-cloud.png",
            (30, 15, 170, 85),
            shadow=False,
        )

    if spec.get("prop") and spec.get("prop_box"):
        paste_contain(canvas, spec["prop"], spec["prop_box"])

    if spec.get("prop2") and spec.get("prop2_box"):
        paste_contain(canvas, spec["prop2"], spec["prop2_box"])

    if spec.get("extra") == "grass":
        paste_contain(
            canvas,
            POEM_ATOMS / "prop-grass.png",
            (490, 360, 120, 90),
            shadow=False,
        )

    paste_contain(canvas, spec["animal"], spec["animal_box"])

    vignette(canvas, strength=32)
    save_cover(spec["name"], canvas, preview_dir=preview_dir)
    out = (preview_dir or ATOMS) / f"{spec['name']}.png"
    print(f"ok {spec['name']}")
    return out


def render(*, preview_only: bool = False) -> Path:
    preview_dir = Path("/tmp/poem-covers-v2") if preview_only else None
    if preview_dir:
        preview_dir.mkdir(parents=True, exist_ok=True)

    paths = [render_one(spec, preview_dir=preview_dir) for spec in COVERS]

    cell_w, cell_h = 320, 240
    sheet = Image.new("RGB", (cell_w * 3, cell_h * 2), "#f5f2ea")
    for i, path in enumerate(paths):
        im = Image.open(path).convert("RGB").resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        sheet.paste(im, ((i % 3) * cell_w, (i // 3) * cell_h))
    contact = Path("/tmp/poem-covers-v2-contact.jpg")
    sheet.save(contact, quality=92)
    print(f"contact → {contact}")
    return contact


if __name__ == "__main__":
    # 正式封面已改为整图生成，见 scripts/pack_poem_covers.py
    import sys

    sys.path.insert(0, str(Path(__file__).parent))
    from pack_poem_covers import pack

    pack()
