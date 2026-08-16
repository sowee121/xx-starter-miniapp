"""Generate static H5 review pages for the eight approved learning modules.

All pages are deliberately static: state changes are represented by separate
frames so the visual system can be approved before any Mini Program code.
Content for poem / hanzi / math / english is loaded from docs/design/content/.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path("docs/design/h5")
CONTENT = Path("docs/design/content")
ASSET = "../../atoms"

STICKER_TONES = [
    "tone-rose", "tone-sky", "tone-butter", "tone-matcha",
    "tone-peach", "tone-lilac", "tone-mint", "tone-apricot",
]

POEM_TONES = [
    "tone-sky", "tone-lilac", "tone-butter", "tone-matcha", "tone-peach", "tone-mint",
]

# 名称仅用于数据语义；商城卡面不展示名称。
ANIMALS = [
    ("小兔", "rabbit", 2),
    ("小猫", "cat", 2),
    ("小狗", "dog", 2),
    ("小鸭", "duckling", 2),
    ("小鸡", "chicken", 2),
    ("小猪", "pig", 2),
    ("小鸟", "bird", 2),
    ("小鱼", "fish", 2),
    ("小仓鼠", "hamster", 2),
    ("小熊", "bear", 4),
    ("小企鹅", "penguin", 4),
    ("小羊", "sheep", 4),
    ("小牛", "cow", 4),
    ("小猴子", "monkey", 4),
    ("小狐狸", "fox", 6),
    ("小熊猫", "panda", 6),
    ("小象", "elephant", 6),
    ("长颈鹿", "giraffe", 6),
    ("小海豚", "dolphin", 6),
    ("小水獭", "otter", 6),
    ("小恐龙", "dino", 8),
    ("小狮子", "lion", 8),
    ("小老虎", "tiger", 8),
    ("独角兽", "unicorn", 10),
]


def load_json(name: str):
    return json.loads((CONTENT / name).read_text(encoding="utf-8"))


def stable_pick(pool: list[str], key: str, avoid: set[str] | None = None) -> str:
    """Deterministic image pick from pool based on question id."""
    avoid = avoid or set()
    candidates = [x for x in pool if x not in avoid] or list(pool)
    h = 0
    for ch in key:
        h = (h * 131 + ord(ch)) & 0xFFFFFFFF
    return candidates[h % len(candidates)]


def play(size=""):
    cls = "play-btn" if not size else f"play-btn {size}"
    return f'<div class="{cls}" aria-label="播放"><img src="{ASSET}/play.png" alt="" /></div>'


def page(title, body, night=False):
    page_cls = "page is-night" if night else "page"
    meadow = "meadow-night.png" if night else "meadow.png"
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=750" />
  <title>嘻嘻启蒙乐园 · {title}</title>
  <link rel="stylesheet" href="../css/pages.css" />
</head>
<body>
  <div class="{page_cls}">
    <img class="page-bg" src="{ASSET}/{meadow}" alt="" />
    <div class="shell">
      <div class="nav">
        <div class="nav-home" aria-label="返回首页"></div>
        <div class="nav-title">{title}</div>
        <div class="nav-right"><div class="star-pill"><img src="{ASSET}/star.png" alt="" /><b>128</b></div><div class="capsule-slot"></div></div>
      </div>
      {body}
    </div>
  </div>
</body>
</html>
"""


def write(path, title, body, night=False):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(page(title, body, night=night), encoding="utf-8")


def media(image, title, sub, tone="tone-cream", wide=False):
    img_cls = ' class="media-main__image--wide"' if wide else ""
    return f"""<div class="media-row block {tone}">
  <div class="media-main">
    <img{img_cls} src="{ASSET}/{image}.png" alt="" />
    <div class="media-copy"><strong>{title}</strong><span>{sub}</span></div>
  </div>
  <div class="media-play">{play()}</div>
</div>"""


def word_grid(items, tone):
    cards = "".join(
        f'<div class="word-card block {tone}">{x}{play("is-sm")}</div>'
        for x in items
    )
    return f'<div class="word-grid">{cards}</div>'


def praise(text="真棒！", sub="你得到一颗小星星～", retry=False):
    cls = "praise retry block tone-butter" if retry else "praise block tone-cream"
    return f"""<div class="{cls}">
  <img class="praise-deco praise-cloud" src="{ASSET}/cloud.png" alt="" />
  <img class="praise-deco praise-grass" src="{ASSET}/grass-tuft.png" alt="" />
  <div class="praise-main-slot">
    <img class="praise-main" src="{ASSET}/{'rabbit' if retry else 'big-star'}.png" alt="" />
  </div>
  <div class="praise-copy">
    <h1>{text}</h1>
    <p>{sub}</p>
  </div>
  <div class="chip is-follow">继续玩</div>
</div>"""


def make_poem():
    data = load_json("poems.json")
    poems = data["poems"]
    cards = "".join(
        media(p["cover"], p["title"], p["author"], POEM_TONES[i % len(POEM_TONES)], wide=True)
        for i, p in enumerate(poems)
    )
    write("poem/list.html", "古诗", f'<div class="inner-head"><h1>选一首来听</h1><p>一首一首慢慢听</p></div>{cards}')

    sample = next(p for p in poems if p["id"] == "deng-guan-que-lou")
    lines = "".join(
        f'<div class="poem-line block tone-cream"><div class="poem-copy"><strong>{line["text"]}</strong></div><div class="media-play">{play()}</div></div>'
        for line in sample["lines"]
    )
    body = f"""<div class="hero block tone-peach"><img src="{ASSET}/{sample['cover']}.png" alt="" /><h2>{sample['title']}</h2><p>{sample['author']}</p></div>
{lines}
<div class="footer-btn big-btn"><img src="{ASSET}/play.png" alt="" />整首诗</div>"""
    write("poem/detail.html", "古诗", body)
    write("poem/praise.html", "古诗", praise("好厉害！", f"听完《{sample['title']}》啦～"))


def make_hanzi():
    data = load_json("hanzi.json")
    write("hanzi/hub.html", "识字", f"""<div class="inner-head"><h1>认识汉字</h1><p>看一看，听一听</p></div>
<div class="duo"><div class="duo-card block tone-sky"><img src="{ASSET}/hanzi-hub-poem.png" alt="" /><strong>古诗里的字</strong><span>从古诗里认字</span></div><div class="duo-card block tone-peach"><img src="{ASSET}/hanzi-hub-life.png" alt="" /><strong>生活里的字</strong><span>身边常用字</span></div></div>""")
    poem_chars = sorted(data["poem"], key=lambda c: (c["strokes"], c["pinyin"]))
    # 生活库：JSON 已按「一～十数值序 + 关联分组」排好，保持原序
    life_chars = list(data["life"])
    for path, heading, chars, tone in [
        ("hanzi/poem-list.html", "古诗里的字", poem_chars, "tone-sky"),
        ("hanzi/life-list.html", "生活里的字", life_chars, "tone-peach"),
    ]:
        words = [x["char"] for x in chars]
        tip = "点一点就能听 · 笔画少到多" if path.endswith("poem-list.html") else "点一点就能听 · 数字在前"
        write(path, "识字", f'<div class="inner-head"><h1>{heading}</h1><p>{tip}</p></div>{word_grid(words, tone)}')
    sample = next(c for c in life_chars if c["char"] == "人")
    write(
        "hanzi/detail.html",
        "识字",
        f"""<div class="detail-stack"><div class="detail-big block tone-peach"><div class="detail-emoji" aria-hidden="true">{sample["emoji"]}</div><div class="glyph">{sample["char"]}</div><p>{sample["pinyin"]} · {sample["strokes"]}画</p>{play("is-lg")}</div><div class="detail-pair"><div class="block tone-cream">{sample["words"][0]}{play("is-sm")}</div><div class="block tone-cream">{sample["words"][1]}{play("is-sm")}</div></div></div>""",
    )
    write("hanzi/praise.html", "识字", praise())


def count_stage_html(fruit: str, n: int) -> str:
    """同一水果原子重复 n 次。
    换行由 CSS max-width 控制：列数 = 10 的约数中 ≤ n 的最大者（n=10 → 5）。
    """
    items = "".join(
        f'<img class="count-item" src="{ASSET}/{fruit}.png" alt="" />' for _ in range(n)
    )
    return f'<div class="count-stage" data-count="{n}">{items}</div>'


def make_math():
    data = load_json("math.json")
    fruits = data["fruitPool"]
    by_id = {q["id"]: q for q in data["count"] + data["calc"]}
    samples = data["h5Samples"]

    write(
        "math/hub.html",
        "算术",
        f"""<div class="inner-head"><h1>小小数学家</h1><p>数一数，算一算</p></div><div class="duo"><div class="duo-card block tone-butter"><img src="{ASSET}/apple-english.png" alt="" /><strong>数一数</strong><span>1 到 10</span></div><div class="duo-card block tone-sky"><img src="{ASSET}/dog.png" alt="" /><strong>算一算</strong><span>1 到 5</span></div></div>""",
    )

    def options_html(choices, tones):
        # 选项一律升序展示（与小程序一致）
        ordered = sorted(choices)
        return "".join(
            f'<div class="option block {tone}">{choice}</div>'
            for tone, choice in zip(tones, ordered)
        )

    # 数一数审查帧：固定样例；真机每次随机水果+数量
    count_q = by_id[samples["count"]]
    fruit = stable_pick(fruits, count_q["id"])
    n = int(count_q["answer"])
    count = (
        f'<div class="quiz-head block tone-cream">{count_stage_html(fruit, n)}'
        f"<h2>数一数，有几个？</h2></div>"
        f'<div class="options">{options_html(count_q["choices"], ["tone-sky", "tone-butter", "tone-peach"])}</div>'
    )

    # 算一算固定用狗狗拿算盘；选项升序，真机题目数字随机
    calc_img = data.get("calcImage", "dog")
    add_q = by_id[samples["add"]]
    add = (
        f'<div class="quiz-head block tone-sky"><img src="{ASSET}/{calc_img}.png" alt="" />'
        f'<h2>{add_q["a"]} ＋ {add_q["b"]} ＝ ？</h2></div>'
        f'<div class="options">{options_html(add_q["choices"], ["tone-peach", "tone-butter", "tone-lilac"])}</div>'
    )

    sub_q = by_id[samples["sub"]]
    sub = (
        f'<div class="quiz-head block tone-matcha"><img src="{ASSET}/{calc_img}.png" alt="" />'
        f'<h2>{sub_q["a"]} − {sub_q["b"]} ＝ ？</h2></div>'
        f'<div class="options">{options_html(sub_q["choices"], ["tone-sky", "tone-butter", "tone-peach"])}</div>'
    )

    write("math/count.html", "数一数", count)
    write("math/count-retry.html", "数一数", count + '<div class="retry-note block tone-butter">再试一次～</div>')
    # 额外审查帧：1 / 6 / 10 → 列数 1 / 5+1 / 5+5
    for qid in ("c1", "c6", "c10"):
        q = by_id[qid]
        f = stable_pick(fruits, qid)
        body = (
            f'<div class="quiz-head block tone-cream">{count_stage_html(f, int(q["answer"]))}'
            f"<h2>数一数，有几个？</h2></div>"
            f'<div class="options">{options_html(q["choices"], ["tone-sky", "tone-butter", "tone-peach"])}</div>'
        )
        write(f"math/count-{qid}.html", "数一数", body)

    write("math/calc.html", "算一算", add)
    write("math/calc-retry.html", "算一算", add + '<div class="retry-note block tone-butter">再试一次～</div>')
    write("math/calc-sub.html", "算一算", sub)
    write("math/calc-sub-retry.html", "算一算", sub + '<div class="retry-note block tone-butter">再试一次～</div>')
    write("math/praise.html", "算术", praise("真棒！", "你数对啦～"))


def make_english():
    data = load_json("english.json")
    sections = []
    tones = ["tone-rose", "tone-butter", "tone-sky", "tone-matcha", "tone-peach"]
    for i, cat in enumerate(data["categories"]):
        cards = "".join(
            media(item["image"], item["word"], item["sentence"], tones[i % len(tones)])
            for item in cat["items"]
        )
        sections.append(f'<div class="section-title">{cat["title"]}</div>{cards}')
    write("english/list.html", "英语", f'<div class="inner-head"><h1>英语小天地</h1><p>听一听，说一说</p></div>{"".join(sections)}')

    sample = data["categories"][0]["items"][0]
    write("english/detail.html", "英语", f"""<div class="detail-big block tone-rose"><img src="{ASSET}/{sample['image']}.png" alt="" /><h2>{sample['word']}</h2><p>{sample['sentence']}</p><div class="detail-pair is-listen"><div class="play-wrap">{play("is-lg")}<span>单词</span></div><div class="play-wrap">{play("is-lg")}<span>句子</span></div></div></div>""")
    write("english/praise.html", "英语", praise("好厉害！", f"你学会 {sample['word']} 啦～"))


def make_pinyin():
    vowels = load_json("pinyin.json")["vowels"]
    letters = [item["letter"] for item in vowels]
    write("pinyin/list.html", "拼音", f'<div class="inner-head"><h1>单韵母</h1><p>听一听小声音</p></div>{word_grid(letters, "tone-lilac")}')

    for item in vowels:
        body = f"""<div class="detail-big block tone-lilac"><img class="pinyin-vowel-image" src="{ASSET}/{item['asset']}.png" alt="{item['letter']}" /><div class="glyph">{item['letter']}</div><p>{item['hint']}</p>{play("is-lg")}</div>"""
        write(f"pinyin/detail-{item['asset'].removeprefix('pinyin-')}.html", "拼音", body)

    sample = vowels[0]
    write("pinyin/detail.html", "拼音", f"""<div class="detail-big block tone-lilac"><img class="pinyin-vowel-image" src="{ASSET}/{sample['asset']}.png" alt="{sample['letter']}" /><div class="glyph">{sample['letter']}</div><p>{sample['hint']}</p>{play("is-lg")}</div>""")
    write("pinyin/praise.html", "拼音", praise())


def make_calendar():
    write("calendar/day.html", "日历", f"""<div class="calendar-scene block tone-butter"><div class="calendar-sky-icon"><img src="{ASSET}/sun.png" alt="" /></div><div class="calendar-date">2026年8月15日</div><div class="calendar-week">星期六</div><div class="calendar-tag">白天</div></div>""")
    write(
        "calendar/night.html",
        "日历",
        f"""<div class="calendar-scene calendar-scene-night block tone-night"><div class="calendar-sky-icon"><img src="{ASSET}/moon-stars.png" alt="" /></div><div class="calendar-date">2026年8月15日</div><div class="calendar-week">星期六</div><div class="calendar-tag">晚上</div></div>""",
        night=True,
    )


def make_task():
    # 审查稿示例日：数量每天随机（古诗 1～2，其余学习 1～5），此处固定一组示意
    tasks = [
        ("读 2 首古诗", 2, 3),
        ("认 4 个汉字", 4, 4),
        ("做 3 道算术题", 3, 3),
        ("学 5 个单词", 5, 5),
        ("读 2 个拼音", 2, 2),
        ("看一看日历", 1, 1),
    ]

    def rows(done):
        parts = []
        for i, (title, target, reward) in enumerate(tasks):
            progress = ""
            # 示例：按数量累计，不限定指定内容；target>1 且未完成时显示进度
            if target > 1 and i >= done:
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
                f'<div class="task-row block tone-cream {"done" if i < done else ""}">'
                f'<div class="tick"><img src="{ASSET}/check.png" alt="" /></div>'
                f'<div class="task-row__copy"><strong>{title}</strong>{progress}</div>'
                f'<span class="task-reward">+{reward}'
                f'<img src="{ASSET}/star.png" alt="星星" /></span></div>'
            )
        return "".join(parts)

    write("task/list.html", "每日任务", '<div class="inner-head"><h1>今天的任务</h1><p>慢慢完成就很好</p></div>' + rows(0))
    write("task/partial.html", "每日任务", '<div class="inner-head"><h1>今天已完成 3 项</h1><p>再完成一点点～</p></div>' + rows(3))
    write("task/all-done.html", "每日任务", '<div class="inner-head"><h1>全部完成啦</h1><p>今天真棒！</p></div>' + rows(6))
    write("task/praise.html", "每日任务", praise("真棒！", "今天的任务完成啦～"))


def make_reward():
    animals = sorted(ANIMALS, key=lambda item: (item[2], item[0]))
    cards = "".join(
        f'<div class="sticker-card block {STICKER_TONES[i % len(STICKER_TONES)]}">'
        f'<img src="{ASSET}/sticker-{asset}.png" alt="{name}" />'
        f'<span class="sticker-price"><b>{price}</b><img src="{ASSET}/star.png" alt="星星" /></span>'
        f'<div class="chip is-compact">兑换</div></div>'
        for i, (name, asset, price) in enumerate(animals)
    )
    write("reward/shop.html", "积分商城", f'<div class="inner-head"><h1>动物贴纸</h1><p>用星星兑换喜欢的贴纸</p></div><div class="sticker-grid">{cards}</div>')
    weak = cards.replace(">兑换<", ">再攒一点<")
    write("reward/not-enough.html", "积分商城", f'<div class="inner-head"><h1>再攒一点星星～</h1><p>学一学就会有更多星星</p></div><div class="sticker-grid muted-action">{weak}</div>')
    owned = cards.replace(">兑换<", ">已拥有<")
    write("reward/owned.html", "积分商城", f'<div class="inner-head"><h1>我的贴纸</h1><p>已经兑换到的小伙伴</p></div><div class="sticker-grid">{owned}</div>')
    write("reward/praise.html", "积分商城", praise("兑换成功！", "新的动物贴纸送给你～"))


def make_shared():
    write("shared/praise.html", "真棒", praise())
    write("shared/retry.html", "再试一次", praise("再试一次～", "慢慢来，你一定可以！", True))


def make_index():
    links = [
        ("首页", "home.html"),
        ("古诗 · 列表", "poem/list.html"), ("古诗 · 详情", "poem/detail.html"), ("古诗 · 鼓励", "poem/praise.html"),
        ("识字 · 分库", "hanzi/hub.html"), ("识字 · 古诗字库", "hanzi/poem-list.html"), ("识字 · 生活字库", "hanzi/life-list.html"), ("识字 · 详情", "hanzi/detail.html"), ("识字 · 鼓励", "hanzi/praise.html"),
        ("算术 · 入口", "math/hub.html"), ("算术 · 数一数", "math/count.html"), ("算术 · 数一数重试", "math/count-retry.html"), ("算术 · 数1个", "math/count-c1.html"), ("算术 · 数6个", "math/count-c6.html"), ("算术 · 数10个", "math/count-c10.html"), ("算术 · 加法", "math/calc.html"), ("算术 · 加法重试", "math/calc-retry.html"), ("算术 · 减法", "math/calc-sub.html"), ("算术 · 减法重试", "math/calc-sub-retry.html"), ("算术 · 鼓励", "math/praise.html"),
        ("英语 · 列表", "english/list.html"), ("英语 · 详情", "english/detail.html"), ("英语 · 鼓励", "english/praise.html"),
        ("拼音 · 列表", "pinyin/list.html"), ("拼音 · 详情 a", "pinyin/detail.html"), ("拼音 · 详情 o", "pinyin/detail-o.html"), ("拼音 · 详情 e", "pinyin/detail-e.html"), ("拼音 · 详情 i", "pinyin/detail-i.html"), ("拼音 · 详情 u", "pinyin/detail-u.html"), ("拼音 · 详情 ü", "pinyin/detail-umlaut-u.html"), ("拼音 · 鼓励", "pinyin/praise.html"),
        ("日历 · 白天", "calendar/day.html"), ("日历 · 晚上", "calendar/night.html"),
        ("任务 · 未完成", "task/list.html"), ("任务 · 已完成三项", "task/partial.html"), ("任务 · 全部完成", "task/all-done.html"), ("任务 · 鼓励", "task/praise.html"),
        ("商城 · 贴纸货架", "reward/shop.html"), ("商城 · 星星不足", "reward/not-enough.html"), ("商城 · 已拥有", "reward/owned.html"), ("商城 · 兑换成功", "reward/praise.html"),
        ("公共 · 真棒", "shared/praise.html"), ("公共 · 温和重试", "shared/retry.html"),
    ]
    tiles = "".join(f'<a href="{url}">{name}</a>' for name, url in links)
    content = f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=750"><title>嘻嘻启蒙乐园 · 设计目录</title><link rel="stylesheet" href="css/pages.css"></head><body><div class="page"><img class="page-bg" src="../atoms/meadow.png" alt=""><div class="shell"><div class="inner-head"><h1>设计审核目录</h1><p>八大板块静态 H5</p></div><div class="page-links">{tiles}</div></div></div></body></html>"""
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
