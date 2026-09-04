"""Generate static H5 review pages for the eight approved learn modules.

State variants of the same layout are merged into one HTML per module area
(section titles inside the page) so the design index stays compact.

H5 is visual review only: no Audio, tap handlers, or other product interaction.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path("docs/design/h5")
CONTENT = Path("docs/design/content")
ASSET = "../../atoms"

POEM_TONES = [
    "tone-sky", "tone-lilac", "tone-butter", "tone-matcha", "tone-peach", "tone-mint",
]

# 名称仅用于数据语义；商城卡面不展示名称。
# 第 4 项为主题色，与 miniprogram/subpkg/shop/content/stickers.js 的 ANIMALS 逐条对齐；
# 顺序同小程序：升星分组，组内每 3 只一行、行内跨色系不撞色。
ANIMALS = [
    ("小兔", "rabbit", 2, "tone-rose"),
    ("小鸭", "duckling", 2, "tone-butter"),
    ("小鸟", "bird", 2, "tone-sky"),
    ("小猫", "cat", 2, "tone-peach"),
    ("小鸡", "chicken", 2, "tone-orange"),
    ("小鱼", "fish", 2, "tone-mint"),
    ("小猪", "pig", 2, "tone-pink"),
    ("小狗", "dog", 2, "tone-sand"),
    ("小仓鼠", "hamster", 2, "tone-apricot"),
    ("小熊", "bear", 4, "tone-tan"),
    ("小羊", "sheep", 4, "tone-cream"),
    ("小企鹅", "penguin", 4, "tone-frost"),
    ("小牛", "cow", 4, "tone-matcha"),
    ("小猴子", "monkey", 4, "tone-tan"),
    ("小狐狸", "fox", 6, "tone-coral"),
    ("小熊猫", "panda", 6, "tone-lilac"),
    ("长颈鹿", "giraffe", 6, "tone-butter"),
    ("小象", "elephant", 6, "tone-frost"),
    ("小海豚", "dolphin", 6, "tone-mint"),
    ("小水獭", "otter", 6, "tone-tan"),
    ("小恐龙", "dino", 8, "tone-matcha"),
    ("小狮子", "lion", 8, "tone-orange"),
    ("小老虎", "tiger", 8, "tone-butter"),
    ("独角兽", "unicorn", 10, "tone-lilac"),
]


def load_json(name: str):
    return json.loads((CONTENT / name).read_text(encoding="utf-8"))


def play(size="", playing=False):
    cls = "play-btn" if not size else f"play-btn {size}"
    if playing:
        cls += " is-playing"
        icon = "stop.png"
        label = "停止"
    else:
        icon = "play.png"
        label = "播放"
    return f'<div class="{cls}" aria-label="{label}"><img src="{ASSET}/{icon}" alt="" /></div>'


def trail_step_nav(current: int = 2, total: int = 5) -> str:
    """详情底栏：左右黏土箭头（一图翻转）。"""
    prev_dis = " is-disabled" if current <= 1 else ""
    next_dis = " is-disabled" if current >= total else ""
    src = f"{ASSET}/arrow.png"
    return (
        f'<nav class="trail-nav is-step" aria-label="切题">'
        f'<span class="trail-nav__item{prev_dis}" aria-label="上一题">'
        f'<img class="trail-nav__arrow is-flip" src="{src}" alt="" /></span>'
        f'<span class="trail-nav__item{next_dis}" aria-label="下一题">'
        f'<img class="trail-nav__arrow" src="{src}" alt="" /></span>'
        f"</nav>"
    )


def scene_html(night=False, asset=ASSET, full=False):
    if full:
        img = "meadow-night.png" if night else "meadow.png"
        return (
            '<div class="scene scene--full" aria-hidden="true">'
            f'<img class="scene__full" src="{asset}/{img}" alt="" />'
            "</div>"
        )
    return (
        '<div class="scene" aria-hidden="true">'
        f'<img class="scene__meadow" src="{asset}/meadow-hill.png" alt="" />'
        '<div class="scene__blend"></div>'
        "</div>"
    )


def page_frame(title, body, night=False, full_scene=False):
    page_cls = "page is-night" if night else "page"
    return f"""<div class="{page_cls}">
    {scene_html(night, full=full_scene)}
    <div class="shell">
      <div class="custom-header__row">
        <div class="custom-header__home" aria-label="返回首页"><img class="custom-header__home-icon" src="{ASSET}/home-clay.png" alt="" /></div>
        <div class="custom-header__title">{title}</div>
        <div class="custom-header__right"><div class="star-bar"><img class="star-bar__icon" src="{ASSET}/star.png" alt="" /><b class="star-bar__count">128</b></div><div class="capsule-slot"></div></div>
      </div>
      {body}
    </div>
  </div>"""


def page(title, body, night=False, doc_title=None):
    head = doc_title or title
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=750" />
  <title>嘻嘻启蒙乐园 · {head}</title>
  <link rel="stylesheet" href="../css/pages.css" />
</head>
<body>
  {page_frame(title, body, night=night)}
</body>
</html>
"""


def write(path, title, body, night=False, doc_title=None):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(page(title, body, night=night, doc_title=doc_title), encoding="utf-8")


def media(image, title, sub, tone="tone-cream", wide=False):
    img_cls = ' class="media-main__thumb--wide"' if wide else ""
    return f"""<div class="media-card block {tone}">
  <div class="media-main">
    <img{img_cls} src="{ASSET}/{image}.png" alt="" />
    <div class="media-main__body"><strong>{title}</strong><span>{sub}</span></div>
  </div>
  <div class="media-play">{play()}</div>
</div>"""


def praise_layer(title: str, desc: str, variant: str = "", action: str = "") -> str:
    """静态审查：弹层已打开态（对齐小程序 feedback-layer）。"""
    card_cls = "feedback-layer__card"
    icon = "big-star"
    actions = {
        "": "继续学",
        "success": "继续学",
        "exchange": "收下啦",
        "fail": "再看看",
    }
    if variant == "fail":
        card_cls += " is-fail"
        icon = "rabbit"
    elif variant == "exchange":
        card_cls += " is-exchange"
    label = action or actions.get(variant, "继续学")
    return f"""<div class="feedback-frame"><div class="feedback-layer"><div class="{card_cls}">
  <img class="feedback-layer__cloud" src="{ASSET}/cloud.png" alt="" />
  <div class="feedback-layer__icon-slot"><img class="feedback-layer__icon" src="{ASSET}/{icon}.png" alt="" /></div>
  <div class="feedback-layer__body">
    <div class="feedback-layer__text">{title}</div>
    <div class="feedback-layer__desc">{desc}</div>
  </div>
  <div class="feedback-layer__continue">{label}</div>
  <img class="feedback-layer__grass" src="{ASSET}/grass-tuft.png" alt="" />
</div></div></div>"""


def section(title: str, body: str) -> str:
    return f'<div class="section"><div class="section-title">{title}</div>{body}</div>'


def remove_paths(*paths: str) -> None:
    for rel in paths:
        target = ROOT / rel
        if target.exists():
            target.unlink()


def make_poem():
    data = load_json("poems.json")
    poems = data["poems"]
    cards = "".join(
        media(p["cover"], p["title"], p["author"], POEM_TONES[i % len(POEM_TONES)], wide=True)
        for i, p in enumerate(poems)
    )
    write("poem/list.html", "古诗", f'<div class="inner-head"><h1>选一首古诗</h1><p>听一听，读一读</p></div><div class="page-list">{cards}</div>')

    sample_i, sample = next(
        (i, p) for i, p in enumerate(poems) if p["id"] == "deng-guan-que-lou"
    )
    sample_tone = POEM_TONES[sample_i % len(POEM_TONES)]

    def poem_lines(active=None):
        parts = []
        for i, line in enumerate(sample["lines"]):
            active_cls = " is-active" if active == i else ""
            parts.append(
                f'<div class="word-row block tone-cream{active_cls}">'
                f'<strong class="word-row__text">{line["text"]}</strong>'
                f'<div class="media-play">{play()}</div></div>'
            )
        return "".join(parts)

    hero = (
        f'<div class="hero block {sample_tone}"><img src="{ASSET}/{sample["cover"]}.png" alt="" />'
        f'<div class="hero__bar"><div class="hero__heading"><h2 class="hero__title">{sample["title"]}</h2>'
        f'<p class="hero__sub">{sample["author"]}</p></div>'
        f'<div class="hero__play">{play("is-lg")}</div></div></div>'
    )
    step = trail_step_nav(2, 6)
    audio_note = '<div class="feedback-bar block tone-butter">语音准备中～</div>'
    write(
        "poem/detail.html",
        "古诗",
        section("点读", hero + poem_lines() + step)
        + section("点读中", hero + poem_lines(0) + step)
        + section("整首播放中", hero + poem_lines() + step)
        + section("语音准备中", hero + poem_lines() + step + audio_note),
    )
    remove_paths("poem/praise.html")


def make_hanzi():
    data = load_json("hanzi.json")
    tone_map = {
        "number": "tone-lilac",
        "color": "tone-rose",
        "animal": "tone-butter",
        "family": "tone-coral",
        "body": "tone-peach",
        "nature": "tone-matcha",
        "place": "tone-sand",
        "transport": "tone-sky",
    }
    sections = []
    for cat in data["categories"]:
        tone = tone_map.get(cat["id"], "tone-cream")
        cards = "".join(
            f'<div class="word-card word-card--hanzi block {tone}">'
            f'<div class="word-card__emoji">{item["emoji"]}</div>'
            f'<div class="word-card__label">{item["char"]}</div></div>'
            for item in cat["items"]
        )
        sections.append(
            f'<div class="section"><div class="section-title">{cat["title"]}</div>'
            f'<div class="word-grid">{cards}</div></div>'
        )
    write(
        "hanzi/list.html",
        "识字",
        f'<div class="inner-head"><h1>生活常见字</h1><p>听一听，认汉字</p></div>{"".join(sections)}',
    )
    sample = next(
        item
        for cat in data["categories"]
        for item in cat["items"]
        if item["char"] == "人"
    )
    step = trail_step_nav(1, 12)
    write(
        "hanzi/detail.html",
        "识字",
        f"""<div class="detail-stack"><div class="detail-card block tone-rose"><div class="detail-card__emoji" aria-hidden="true">{sample["emoji"]}</div><div class="detail-card__glyph">{sample["char"]}</div><p class="detail-card__sub">{sample["pinyin"]} · {sample["strokes"]} 画</p>{play("is-lg")}</div><div class="detail-pair"><div class="word-row is-half block tone-cream">{sample["words"][0]}{play("is-sm")}</div><div class="word-row is-half block tone-cream">{sample["words"][1]}{play("is-sm")}</div></div>{step}</div>
{section("语音准备中", '<div class="feedback-bar block tone-butter">语音准备中～</div>')}""",
    )
    remove_paths("hanzi/hub.html", "hanzi/poem-list.html", "hanzi/life-list.html", "hanzi/praise.html")


def count_stage_html(fruit: str, n: int) -> str:
    """同一水果原子重复 n 次。
    换行由 CSS max-width 控制（5=3+2、7=4+3 末行居中，6=3×2，10=5×2）。
    """
    items = "".join(
        f'<img class="count-item" src="{ASSET}/{fruit}.png" alt="" />' for _ in range(n)
    )
    return f'<div class="count-stage" data-count="{n}">{items}</div>'


def make_math():
    data = load_json("math.json")
    fruit = data["fruitImage"]
    by_id = {q["id"]: q for q in data["count"] + data["calc"]}
    samples = data["h5Samples"]

    write(
        "math/hub.html",
        "算术",
        f"""<div class="inner-head"><h1>小小数学家</h1><p>数一数，算一算</p></div><div class="entry-grid"><div class="entry-card block tone-rose"><img class="entry-card__image" src="{ASSET}/english-fruit-apple.png" alt="" /><strong class="entry-card__title">数一数</strong><span class="entry-card__sub">1 ~ 10</span></div><div class="entry-card block tone-pink"><img class="entry-card__image" src="{ASSET}/dog.png" alt="" /><strong class="entry-card__title">算一算</strong><span class="entry-card__sub">1 ~ 10</span></div></div>""",
    )

    def options_html(choices, tones, picked=None, correct=None, wrong=False):
        # 选项一律升序展示（与小程序一致）
        ordered = sorted(choices)
        parts = []
        for tone, choice in zip(tones, ordered):
            mods = []
            if picked is not None and choice == picked:
                mods.append("is-picked")
                if wrong:
                    mods.append("is-shaking")
            if correct is not None and choice == correct:
                mods.append("is-correct")
            cls = " ".join(["option", "block", tone] + mods)
            parts.append(f'<div class="{cls}">{choice}</div>')
        return "".join(parts)

    def quiz(head, choices, tones, picked=None, correct=None, note="", step=None, wrong=False):
        nav = step if step is not None else trail_step_nav(1, 5)
        return (
            head
            + f'<div class="options">{options_html(choices, tones, picked, correct)}</div>'
            + nav
            + note
        )

    retry_note = '<div class="feedback-bar block tone-butter">答错啦！再试一次吧～</div>'
    correct_note = '<div class="feedback-bar block tone-matcha">答对啦！你真棒！</div>'

    # 数一数审查帧：固定苹果样例；真机只换数量，水果固定苹果
    count_q = by_id[samples["count"]]
    n = int(count_q["answer"])
    count_tones = ["tone-sky", "tone-butter", "tone-peach"]
    count_head = (
        f'<div class="quiz-head block tone-butter">{count_stage_html(fruit, n)}'
        f"<h2>数一数，有几个？</h2></div>"
    )
    count_wrong = next(c for c in sorted(count_q["choices"]) if c != n)

    # 算一算固定用狗狗拿算盘；选项升序，真机题目数字随机
    calc_img = data.get("calcImage", "dog")
    add_q = by_id[samples["add"]]
    add_tones = ["tone-peach", "tone-butter", "tone-lilac"]
    add_head = (
        f'<div class="quiz-head block tone-sky"><img src="{ASSET}/{calc_img}.png" alt="" />'
        f'<h2>{add_q["a"]} ＋ {add_q["b"]} ＝ ？</h2></div>'
    )
    add_ans = add_q["answer"]
    add_wrong = next(c for c in sorted(add_q["choices"]) if c != add_ans)

    sub_q = by_id[samples["sub"]]
    sub_tones = ["tone-sky", "tone-butter", "tone-peach"]
    sub_head = (
        f'<div class="quiz-head block tone-matcha"><img src="{ASSET}/{calc_img}.png" alt="" />'
        f'<h2>{sub_q["a"]} − {sub_q["b"]} ＝ ？</h2></div>'
    )
    sub_ans = sub_q["answer"]
    sub_wrong = next(c for c in sorted(sub_q["choices"]) if c != sub_ans)

    write(
        "math/count.html",
        "数一数",
        section("答题", quiz(count_head, count_q["choices"], count_tones))
        + section("选中", quiz(count_head, count_q["choices"], count_tones, picked=count_wrong))
        + section("答对", quiz(count_head, count_q["choices"], count_tones, picked=n, correct=n, note=correct_note))
        + section(
            "再试一次",
            quiz(count_head, count_q["choices"], count_tones, picked=count_wrong, note=retry_note),
        )
        + "".join(
            section(
                f"数 {q['answer']} 个",
                quiz(
                    f'<div class="quiz-head block tone-butter">{count_stage_html(fruit, int(q["answer"]))}'
                    f"<h2>数一数，有几个？</h2></div>",
                    q["choices"],
                    count_tones,
                ),
            )
            for qid in (f"c{i}" for i in range(1, 11))
            for q in [by_id[qid]]
        ),
    )

    write(
        "math/calc.html",
        "算一算",
        section("加法", quiz(add_head, add_q["choices"], add_tones))
        + section("加法 · 选中", quiz(add_head, add_q["choices"], add_tones, picked=add_wrong))
        + section("加法 · 答对", quiz(add_head, add_q["choices"], add_tones, picked=add_ans, correct=add_ans, note=correct_note))
        + section(
            "加法 · 再试一次",
            quiz(add_head, add_q["choices"], add_tones, picked=add_wrong, note=retry_note),
        )
        + section("减法", quiz(sub_head, sub_q["choices"], sub_tones))
        + section("减法 · 选中", quiz(sub_head, sub_q["choices"], sub_tones, picked=sub_wrong))
        + section("减法 · 答对", quiz(sub_head, sub_q["choices"], sub_tones, picked=sub_ans, correct=sub_ans, note=correct_note))
        + section(
            "减法 · 再试一次",
            quiz(sub_head, sub_q["choices"], sub_tones, picked=sub_wrong, note=retry_note),
        ),
    )

    remove_paths(
        "math/count-retry.html",
        "math/count-c1.html",
        "math/count-c6.html",
        "math/count-c10.html",
        "math/calc-retry.html",
        "math/calc-sub.html",
        "math/calc-sub-retry.html",
        "math/praise.html",
        "math/count-picked.html",
        "math/calc-picked.html",
    )


def make_english():
    data = load_json("english.json")
    alphabet = load_json("alphabet.json")
    write(
        "english/hub.html",
        "英语",
        f"""<div class="inner-head"><h1>英语小天地</h1><p>字母表，学单词</p></div><div class="entry-grid"><div class="entry-card block tone-sky"><img class="entry-card__image" src="{ASSET}/english-letter-a.png" alt="" /><strong class="entry-card__title">字母表</strong><span class="entry-card__sub">A ~ Z</span></div><div class="entry-card block tone-rose"><img class="entry-card__image" src="{ASSET}/english-fruit-apple.png" alt="" /><strong class="entry-card__title">单词</strong><span class="entry-card__sub">生活常见词</span></div></div>""",
    )

    abc_cards = "".join(
        f'<div class="word-card block tone-sky">'
        f'<img class="word-card__image" src="{ASSET}/{item["image"]}.png" alt="{item["letter"]}" />'
        f'{play("is-sm")}</div>'
        for item in alphabet["letters"]
    )
    song_card = (
        f'<div class="word-card is-song block tone-sky">'
        f'<img class="word-card__image" src="{ASSET}/english-abc.png" alt="ABC Song" />'
        f'{play("is-sm")}</div>'
    )
    song_card_stop = (
        f'<div class="word-card is-song block tone-sky">'
        f'<img class="word-card__image" src="{ASSET}/english-abc.png" alt="ABC Song" />'
        f'{play("is-sm", playing=True)}</div>'
    )
    write(
        "english/alphabet-list.html",
        "英语",
        f'<div class="inner-head"><h1>字母表</h1><p>听一听，学字母</p></div><div class="word-grid">{abc_cards}{song_card}</div>'
        + section("字母歌播放中", f'<div class="word-grid">{abc_cards}{song_card_stop}</div>'),
    )

    abc_sample = alphabet["letters"][0]
    abc_step = trail_step_nav(1, len(alphabet["letters"]))
    write(
        "english/alphabet-detail.html",
        "英语",
        f"""<div class="detail-stack"><div class="detail-card block tone-sky"><img class="detail-card__image--wide" src="{ASSET}/{abc_sample["image"]}.png" alt="{abc_sample["letter"]}" /><p class="detail-card__sub">{abc_sample["phonetic"]}</p>{play("is-lg")}</div>{abc_step}</div>
{section("语音准备中", '<div class="feedback-bar block tone-butter">语音准备中～</div>')}""",
    )

    sections = []
    tone_map = {
        "fruit": "tone-apricot",
        "animal": "tone-butter",
        "color": "tone-rose",
        "number": "tone-lilac",
        "body": "tone-peach",
        "transport": "tone-sky",
        "food": "tone-orange",
        "nature": "tone-matcha",
    }
    for cat in data["categories"]:
        tone = tone_map.get(cat["id"], "tone-cream")
        cards = "".join(
            (
                f'<div class="word-card word-card--english block {tone}">'
                f'<img class="word-card__image" src="{ASSET}/{item["image"]}.png" alt="" />'
                f'<div class="word-card__label">{item["word"]}</div></div>'
            )
            for item in cat["items"]
        )
        sections.append(section(cat["title"], f'<div class="word-grid">{cards}</div>'))
    write(
        "english/list.html",
        "英语",
        f'<div class="inner-head"><h1>单词</h1><p>听一听，学单词</p></div>{"".join(sections)}',
    )

    sample = data["categories"][0]["items"][0]
    step = trail_step_nav(1, len(data["categories"][0]["items"]))
    write(
        "english/detail.html",
        "英语",
        f"""<div class="detail-stack"><div class="detail-card block tone-apricot"><img class="detail-card__image" src="{ASSET}/{sample['image']}.png" alt="" /><h2 class="detail-card__title">{sample['word']}</h2><p class="detail-card__sub">{sample['phonetic']}</p><p class="detail-card__meaning">{sample.get('meaning', '')}</p>{play("is-lg")}</div><div class="word-row block tone-cream"><div class="word-row__text">{sample['sentence']}</div>{play("is-sm")}</div>{step}</div>
{section("语音准备中", '<div class="feedback-bar block tone-butter">语音准备中～</div>')}""",
    )
    remove_paths("english/praise.html")


def make_pinyin():
    vowels = load_json("pinyin.json")["vowels"]
    cards = "".join(
        f'<div class="word-card block tone-cream">'
        f'<img class="word-card__image" src="{ASSET}/{item["asset"]}.png" alt="{item["letter"]}" />'
        f'{play("is-sm")}</div>'
        for item in vowels
    )
    write(
        "pinyin/list.html",
        "拼音",
        f'<div class="inner-head"><h1>单韵母</h1><p>听一听，练发音</p></div><div class="word-grid">{cards}</div>',
    )

    sample = vowels[0]
    pebbles = "".join(
        (
            f'<span class="trail-nav__item is-current" aria-current="true"><span class="trail-nav__glyph">{item["letter"]}</span></span>'
            if item["letter"] == sample["letter"]
            else f'<span class="trail-nav__item"><span class="trail-nav__glyph">{item["letter"]}</span></span>'
        )
        for item in vowels
    )
    # 审查：主帧 enrichment（伙伴坞 + 石子径）；第二帧对照 o
    alt = vowels[1]
    write(
        "pinyin/detail.html",
        "拼音",
        f"""<div class="detail-stack"><div class="detail-card block tone-cream"><img class="detail-card__image--wide" src="{ASSET}/{sample['asset']}.png" alt="{sample['letter']}" /><p class="detail-card__sub">{sample.get('phonetic', '')}</p>{play("is-lg")}</div><div class="buddy-dock block tone-cream"><img class="buddy-dock__mascot" src="{ASSET}/buddy-duckling.png" alt="" /><div class="buddy-dock__bubble">{sample['hint']}</div></div><nav class="trail-nav" aria-label="韵母石子径">{pebbles}</nav></div>
<div class="section" id="{alt['letter']}"><div class="section-title">{alt['letter']}（对照）</div><div class="detail-stack"><div class="detail-card block tone-cream"><img class="detail-card__image--wide" src="{ASSET}/{alt['asset']}.png" alt="{alt['letter']}" /><p class="detail-card__sub">{alt.get('phonetic', '')}</p>{play("is-lg")}</div><div class="buddy-dock block tone-cream"><img class="buddy-dock__mascot" src="{ASSET}/buddy-duckling.png" alt="" /><div class="buddy-dock__bubble">{alt['hint']}</div></div></div></div>
{section("语音准备中", '<div class="feedback-bar block tone-butter">语音准备中～</div>')}""",
    )
    remove_paths(
        "pinyin/praise.html",
        "pinyin/detail-a.html",
        "pinyin/detail-o.html",
        "pinyin/detail-e.html",
        "pinyin/detail-i.html",
        "pinyin/detail-u.html",
        "pinyin/detail-umlaut-u.html",
    )


def heat_month_html(night=False):
    cells = (
        '<div class="heat__cell is-pad"></div>' * 5
        + '<div class="heat__cell is-lv1"></div>'
        + '<div class="heat__cell is-lv2"></div>'
        + '<div class="heat__cell is-lv0"></div>'
        + '<div class="heat__cell is-lv2"></div>'
        + '<div class="heat__cell is-lv3"></div>'
        + '<div class="heat__cell is-lv1"></div>'
        + '<div class="heat__cell is-lv0"></div>'
        + '<div class="heat__cell is-lv4"></div>'
        + '<div class="heat__cell is-lv2"></div>'
        + '<div class="heat__cell is-lv1"></div>'
        + '<div class="heat__cell is-lv3"></div>'
        + '<div class="heat__cell is-lv2"></div>'
        + '<div class="heat__cell is-lv0"></div>'
        + '<div class="heat__cell is-lv1"></div>'
        + '<div class="heat__cell is-lv4 is-today"></div>'
        + '<div class="heat__cell is-lv2"></div>'
        + '<div class="heat__cell is-lv1"></div>'
        + '<div class="heat__cell is-lv0"></div>'
        + '<div class="heat__cell is-lv3"></div>'
        + '<div class="heat__cell is-lv2"></div>'
        + '<div class="heat__cell is-lv1"></div>'
        + '<div class="heat__cell is-lv0"></div>'
        + '<div class="heat__cell is-lv2"></div>'
        + '<div class="heat__cell is-lv3"></div>'
        + '<div class="heat__cell is-lv1"></div>'
        + '<div class="heat__cell is-lv4"></div>'
        + '<div class="heat__cell is-lv2"></div>'
        + '<div class="heat__cell is-lv1"></div>'
        + '<div class="heat__cell is-lv0"></div>'
        + '<div class="heat__cell is-lv1"></div>'
        + '<div class="heat__cell is-lv2"></div>'
    )
    tone = "tone-night" if night else "tone-cream"
    return (
        f'<div class="heat block {tone}">'
        '<div class="heat__title">八月学习</div>'
        '<div class="heat__week">'
        '<div class="heat__wd">一</div><div class="heat__wd">二</div><div class="heat__wd">三</div>'
        '<div class="heat__wd">四</div><div class="heat__wd">五</div><div class="heat__wd">六</div>'
        '<div class="heat__wd">日</div>'
        '</div>'
        f'<div class="heat__grid">{cells}</div>'
        '<div class="heat__legend">'
        '<div class="heat__legend-label">少</div>'
        '<div class="heat__cell is-lv0"></div>'
        '<div class="heat__cell is-lv1"></div>'
        '<div class="heat__cell is-lv2"></div>'
        '<div class="heat__cell is-lv3"></div>'
        '<div class="heat__cell is-lv4"></div>'
        '<div class="heat__legend-label">多</div>'
        '</div>'
        '</div>'
    )


def make_calendar():
    heat_day = heat_month_html()
    heat_night = heat_month_html(night=True)
    day = (
        f'<div class="calendar-scene block tone-butter">'
        f'<div class="calendar-scene__sky"><img class="calendar-scene__sky-image" src="{ASSET}/sun.png" alt="" /></div>'
        '<div class="calendar-scene__today"><div class="calendar-scene__date">2026 年 8 月 15 日</div><div class="calendar-scene__week">星期六</div></div>'
        '<div class="block-btn">打卡</div>'
        f'</div>{heat_day}'
    )
    night = (
        f'<div class="calendar-scene calendar-scene--night block tone-night">'
        f'<div class="calendar-scene__sky"><img class="calendar-scene__sky-image" src="{ASSET}/moon-stars.png" alt="" /></div>'
        '<div class="calendar-scene__today"><div class="calendar-scene__date">2026 年 8 月 15 日</div><div class="calendar-scene__week">星期六</div></div>'
        '<div class="block-btn is-disabled">今天已打卡</div>'
        f'</div>{heat_night}'
    )
    # 昼夜是同一页的两种时段态：审查稿拆成两个 HTML，各自一屏完整页
    write("calendar/day.html", "日历", day, doc_title="日历 · 白天")
    write("calendar/night.html", "日历", night, night=True, doc_title="日历 · 晚上")
    remove_paths("calendar/index.html")


def make_task():
    # 审查稿示例日：数量每天随机（古诗 1～2，其余学习 1～5），此处固定一组示意
    tasks = [
        ("读 2 首古诗", 2, 3),
        ("认 4 个汉字", 4, 4),
        ("做 3 道算术题", 3, 3),
        ("学 5 个英语", 5, 5),
        ("读 2 个拼音", 2, 2),
        ("日历打卡", 1, 1),
    ]

    def rows(done):
        parts = []
        for i, (title, target, reward) in enumerate(tasks):
            progress = ""
            # 日历 target=1 始终显示 0/1 或 1/1；其余 target>1 且未完成时显示进度
            if target == 1:
                current = 1 if i < done else 0
                progress = f'<span class="task-row__progress">{current}/{target}</span>'
            elif target > 1 and i >= done:
                if i == 1 and done == 1:
                    progress = f'<span class="task-row__progress">2/{target}</span>'
                elif i == 2 and done == 2:
                    progress = f'<span class="task-row__progress">2/{target}</span>'
                elif i == 3 and done == 3:
                    progress = f'<span class="task-row__progress">1/{target}</span>'
                elif i == 4 and done == 4:
                    progress = f'<span class="task-row__progress">1/{target}</span>'
                else:
                    progress = f'<span class="task-row__progress">0/{target}</span>'
            parts.append(
                f'<div class="task-row block tone-cream {"is-done" if i < done else ""}">'
                f'<div class="task-row__tick"><img src="{ASSET}/check.png" alt="" /></div>'
                f'<div class="task-row__body"><strong>{title}</strong>{progress}</div>'
                f'<span class="task-row__reward">+{reward}'
                f'<img src="{ASSET}/star.png" alt="星星" /></span></div>'
            )
        return "".join(parts)

    write(
        "task/list.html",
        "每日任务",
        f'<div class="inner-head"><h1>每日任务</h1><p>未完成 · 进行中 · 全部完成</p></div>'
        f'{section("未完成", rows(0))}'
        f'{section("已完成 3 项", rows(3))}'
        f'{section("全部完成", rows(6))}',
    )
    remove_paths("task/partial.html", "task/all-done.html", "task/praise.html")


def make_reward():
    # 顺序即展示顺序（与 stickers.js 一致），不再按名称重排
    animals = ANIMALS
    shop_cards = "".join(
        f'<div class="sticker-card block {tone}">'
        f'<img src="{ASSET}/sticker-{asset}.png" alt="{name}" />'
        f'<span class="sticker-card__price"><b>{price}</b><img src="{ASSET}/star.png" alt="星星" /></span>'
        f'<div class="chip is-compact">兑换</div></div>'
        for name, asset, price, tone in animals
    )
    samples = animals[:3]
    album = "".join(
        f'<div class="sticker-card is-album block {tone}">'
        f'<img src="{ASSET}/sticker-{asset}.png" alt="{name}" />'
        f'<div class="sticker-card__name">{name}</div></div>'
        for name, asset, _price, tone in samples
    )
    short = "".join(
        f'<div class="sticker-card block {tone}">'
        f'<img src="{ASSET}/sticker-{asset}.png" alt="{name}" />'
        f'<span class="sticker-card__price"><b>{price}</b><img src="{ASSET}/star.png" alt="星星" /></span>'
        f'<div class="chip is-compact is-short">星星不足</div></div>'
        for name, asset, price, tone in samples
    )
    write(
        "reward/shop.html",
        "积分商城",
        f"""<div class="inner-head"><h1>动物贴纸</h1><p>我的贴纸与兑换</p></div>
{section("我的贴纸", '<div class="album-hint">去兑换小动物吧～</div>')}
{section("我的贴纸 · 已收集", f'<div class="sticker-grid">{album}</div>')}
{section("兑换贴纸", f'<div class="sticker-grid">{shop_cards}</div>')}
{section("星星不足", f'<div class="sticker-grid">{short}</div>')}""",
    )

    remove_paths(
        "reward/states.html",
        "reward/praise.html",
        "reward/not-enough.html",
        "reward/owned.html",
    )


def make_shared():
    task_awards = [
        ("古诗", "读 2 首古诗"),
        ("识字", "认 4 个汉字"),
        ("算术 · 数一数", "做 3 道算术题"),
        ("算术 · 算一算", "做 3 道算术题"),
        ("英语", "学 5 个英语"),
        ("拼音", "读 2 个拼音"),
        ("日历", "日历打卡"),
    ]
    body = (
        '<div class="inner-head"><h1>公共反馈弹窗</h1><p>各模块共用 · 静态已打开态</p></div>'
        + "".join(
            section(
                label,
                praise_layer(
                    "宝贝真棒",
                    f"「{task}」任务完成啦～",
                    action="好的" if label == "日历" else "继续学",
                ),
            )
            for label, task in task_awards
        )
        + section(
            "积分商城 · 兑换成功",
            praise_layer("兑换成功", "新的动物贴纸送给你～", "exchange"),
        )
        + section(
            "积分商城 · 兑换失败",
            praise_layer("兑换失败", "稍后再来兑贴纸吧～", "fail"),
        )
    )
    write("shared/feedback.html", "公共反馈弹窗", body)
    remove_paths("shared/praise.html", "shared/retry.html", "shared/audio-pending.html")


def make_index():
    links = [
        ("首页", "home.html"),
        ("家长区", "parent.html"),
        ("古诗 · 列表", "poem/list.html"),
        ("古诗 · 详情", "poem/detail.html"),
        ("识字 · 列表", "hanzi/list.html"),
        ("识字 · 详情", "hanzi/detail.html"),
        ("算术 · 入口", "math/hub.html"),
        ("算术 · 数一数", "math/count.html"),
        ("算术 · 算一算", "math/calc.html"),
        ("英语 · 入口", "english/hub.html"),
        ("英语 · 字母表", "english/alphabet-list.html"),
        ("英语 · 字母详情", "english/alphabet-detail.html"),
        ("英语 · 单词列表", "english/list.html"),
        ("英语 · 单词详情", "english/detail.html"),
        ("拼音 · 列表", "pinyin/list.html"),
        ("拼音 · 详情", "pinyin/detail.html"),
        ("日历 · 白天", "calendar/day.html"),
        ("日历 · 晚上", "calendar/night.html"),
        ("每日任务", "task/list.html"),
        ("积分商城", "reward/shop.html"),
        ("公共反馈弹窗", "shared/feedback.html"),
    ]
    tiles = "".join(f'<a href="{url}">{name}</a>' for name, url in links)
    content = f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=750"><title>嘻嘻启蒙乐园 · 设计目录</title><link rel="stylesheet" href="css/pages.css"></head><body><div class="page">{scene_html(asset="../atoms")}<div class="shell"><div class="inner-head"><h1>设计审核目录</h1><p>八大板块静态 H5</p></div><div class="page-links">{tiles}</div></div></div></body></html>"""
    (ROOT / "index.html").write_text(content, encoding="utf-8")


def main():
    make_poem()
    make_hanzi()
    make_math()
    make_english()
    make_pinyin()
    make_calendar()
    make_task()
    make_reward()
    make_shared()
    make_index()
    print("generated", len(list(ROOT.rglob("*.html"))), "html pages")


if __name__ == "__main__":
    main()
