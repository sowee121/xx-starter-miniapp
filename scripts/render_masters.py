#!/usr/bin/env python3
"""渲染 750×1624 母版设计稿。

软泡沫积木（claymorphism）：统一奶油面 + 外柔阴影 + inset 顶/左高光与底/右暗边。
素材只用 docs/design/atoms 已归档原子图。无侧栏。
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ATOM = ROOT / 'docs/design/atoms'
MOCK = ROOT / 'docs/design/mocks/masters'
W, H = 750, 1624
FONT = '/System/Library/Fonts/Hiragino Sans GB.ttc'

R_CARD = 36
R_BTN = 28

# 统一奶油积木面；极淡 tint 仅作板块识别，主体仍是奶油块
CREAM = (255, 253, 248)
C = {
    'ink': (74, 90, 82),
    'muted': (122, 142, 132),
    'cream': CREAM,
    'welcome': (255, 252, 245),
    # 极淡色差（几乎仍是奶油）
    'poem': (250, 253, 248),
    'hanzi': (255, 252, 244),
    'math': (248, 252, 255),
    'english': (255, 250, 244),
    'pinyin': (250, 248, 255),
    'calendar': (246, 252, 250),
    'task': (252, 253, 246),
    'shop': (255, 250, 248),
}

_fonts: dict = {}
_pics: dict = {}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    key = (size, bold)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(FONT, size, index=2 if bold else 0)
    return _fonts[key]


def pic(name: str) -> Image.Image:
    if name not in _pics:
        _pics[name] = Image.open(ATOM / f'{name}.png').convert('RGBA')
    return _pics[name]


class Canvas:
    def __init__(self, bg: str = 'meadow'):
        self.im = Image.open(ATOM / f'{bg}.png').convert('RGBA').resize((W, H), Image.LANCZOS)

    def layer(self, fn):
        lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        fn(ImageDraw.Draw(lay, 'RGBA'))
        self.im.alpha_composite(lay)

    def foam(self, box, fill=CREAM, r=R_CARD, soft=True):
        """软泡沫积木：外阴影 + 面 + inset 高光/暗边（无底部厚度条）。"""
        x0, y0, x1, y1 = box
        bw, bh = x1 - x0, y1 - y0

        # 外柔阴影（浮在草地上）
        blur, dy, alpha = (22, 14, 0.18) if soft else (16, 10, 0.14)
        pad = blur * 2 + abs(dy) + 8
        sh = Image.new('RGBA', (bw + pad * 2, bh + pad * 2), (0, 0, 0, 0))
        ImageDraw.Draw(sh, 'RGBA').rounded_rectangle(
            (pad, pad + dy, pad + bw, pad + bh), radius=r,
            fill=(70, 100, 85, round(255 * alpha)),
        )
        self.im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)), (x0 - pad, y0 - pad))

        # 面层
        self.layer(lambda d: d.rounded_rectangle(box, radius=r, fill=(*fill, 255)))

        # 圆角遮罩，用于 inset 效果
        mask = Image.new('L', (bw, bh), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, bw - 1, bh - 1), radius=r, fill=255)

        inset = Image.new('RGBA', (bw, bh), (0, 0, 0, 0))
        idr = ImageDraw.Draw(inset, 'RGBA')

        # 顶高光带
        for i in range(max(1, bh // 3)):
            a = round(180 * (1 - i / (bh / 3)) ** 1.4)
            idr.line((0, i, bw, i), fill=(255, 255, 255, a))
        # 左高光
        for i in range(max(1, bw // 8)):
            a = round(90 * (1 - i / (bw / 8)))
            idr.line((i, 0, i, bh), fill=(255, 255, 255, a))
        # 底暗边
        for i in range(max(1, bh // 5)):
            y = bh - 1 - i
            a = round(55 * (1 - i / (bh / 5)))
            idr.line((0, y, bw, y), fill=(120, 145, 130, a))
        # 右暗边
        for i in range(max(1, bw // 10)):
            x = bw - 1 - i
            a = round(40 * (1 - i / (bw / 10)))
            idr.line((x, 0, x, bh), fill=(120, 145, 130, a))

        inset.putalpha(Image.composite(inset.getchannel('A'), Image.new('L', (bw, bh), 0), mask))
        self.im.alpha_composite(inset, (x0, y0))

        # 再加一圈极淡内描边，强化「软块」轮廓（非硬描边）
        rim = Image.new('RGBA', (bw, bh), (0, 0, 0, 0))
        ImageDraw.Draw(rim, 'RGBA').rounded_rectangle(
            (1, 1, bw - 2, bh - 2), radius=max(1, r - 1),
            outline=(255, 255, 255, 140), width=2,
        )
        rim.putalpha(Image.composite(rim.getchannel('A'), Image.new('L', (bw, bh), 0), mask))
        self.im.alpha_composite(rim, (x0, y0))

    def text(self, xy, s, size, bold=False, fill=C['ink'], anchor='la'):
        self.layer(lambda d: d.text(xy, s, font=font(size, bold), fill=fill, anchor=anchor))

    def paste(self, name: str, box, align='bottom'):
        x0, y0, x1, y1 = box
        tw, th = x1 - x0, y1 - y0
        im = pic(name)
        scale = min(tw / im.width, th / im.height)
        nw, nh = max(1, round(im.width * scale)), max(1, round(im.height * scale))
        im = im.resize((nw, nh), Image.LANCZOS)
        cx = x0 + (tw - nw) // 2
        cy = y1 - nh if align == 'bottom' else y0 + (th - nh) // 2
        self.im.alpha_composite(im, (cx, cy))

    def save(self, name: str) -> Path:
        MOCK.mkdir(parents=True, exist_ok=True)
        path = MOCK / f'{name}.png'
        self.im.convert('RGB').save(path, quality=95)
        print('wrote', path.relative_to(ROOT))
        return path


MODULES = [
    ('古诗', 'rabbit', 'poem'),
    ('识字', 'cat', 'hanzi'),
    ('算术', 'dog', 'math'),
    ('英语', 'bear', 'english'),
    ('拼音', 'duckling', 'pinyin'),
    ('日历', 'penguin', 'calendar'),
    ('每日任务', 'dino', 'task'),
    ('积分商城', 'unicorn', 'shop'),
]


def render_home(name: str = 'home') -> Path:
    c = Canvas()
    # 顶部轻雾，保证字可读
    c.layer(lambda d: d.rectangle((0, 0, W, 190), fill=(240, 246, 240, 55)))

    # 胶囊预留示意
    cap = (560, 92, 722, 148)
    c.layer(lambda d: d.rounded_rectangle(cap, radius=28, outline=(150, 172, 160, 85), width=2))
    c.text((641, 120), '胶囊', 18, fill=(150, 172, 160, 160), anchor='mm')

    c.text((36, 120), '嘻嘻启蒙乐园', 32, bold=True, anchor='lm')

    # 星星 pill（奶油泡沫小积木，胶囊左侧）
    c.foam((398, 94, 542, 152), C['cream'], r=R_BTN, soft=False)
    c.paste('star', (404, 100, 448, 140), align='center')
    c.text((456, 120), '128', 26, bold=True, anchor='lm')

    # 欢迎卡
    c.foam((30, 186, 720, 348), C['welcome'])
    c.paste('avatar', (52, 206, 178, 328), align='center')
    c.text((198, 248), '宝贝，你好呀～', 34, bold=True, anchor='lm')
    c.text((198, 300), '一起快乐学习吧！', 26, fill=C['muted'], anchor='lm')

    # 八大入口：2×4 奶油软泡沫积木；动物偏上，标题偏下
    left, gap, top0 = 30, 28, 380
    card_w = (W - left * 2 - gap) // 2
    card_h = 278
    for i, (label, animal, key) in enumerate(MODULES):
        col, row = i % 2, i // 2
        x0 = left + col * (card_w + gap)
        y0 = top0 + row * (card_h + gap)
        x1, y1 = x0 + card_w, y0 + card_h
        c.foam((x0, y0, x1, y1), C[key])
        # 动物立在积木上半
        c.paste(animal, (x0 + 36, y0 + 18, x1 - 36, y1 - 78), align='bottom')
        # 标题在下方居中（对齐参考气质）
        c.text(((x0 + x1) // 2, y1 - 36), label, 30, bold=True, anchor='mm')

    c.text(
        (W // 2, 1588),
        '首页母版 · 软泡沫积木 · 750×1624 · 圆角36 · 无侧栏',
        18, fill=C['muted'], anchor='mm',
    )
    return c.save(name)


if __name__ == '__main__':
    render_home('home')
    # 同步一份 foam 命名，便于对照
    render_home('home-foam')
