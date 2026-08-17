#!/usr/bin/env python3
"""Batch-generate point-read MP3 for 嘻嘻启蒙乐园 using edge-tts.

Audio is written into per-subpackage static dirs so each WeChat subpackage
stays under its 2MB limit.

Content files are CommonJS modules shaped `module.exports = <strict JSON>`,
because the native WeChat mini program loader cannot require a bare .json file.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("请先安装: python3 -m pip install edge-tts", file=sys.stderr)
    sys.exit(1)

VOICE_ZH = "zh-CN-XiaoxiaoNeural"
VOICE_EN = "en-US-AnaNeural"
RATE = "-10%"  # 低幼放慢语速
MAX_RETRIES = 5
INTER_ITEM_DELAY = 0.3

# `module.exports = ` 包装：原生小程序 require 不了 .json，内容存成 .js
EXPORT_PREFIX = "module.exports = "

# 每个模块：内容文件位置、音频输出目录、小程序运行时引用前缀
MODULES: dict[str, dict[str, str]] = {
    "poems": {
        "kind": "poems",
        "content": "miniprogram/subpkg/poem/content/poems.js",
        "audio": "miniprogram/subpkg/poem/static/audio",
        "url": "/subpkg/poem/static/audio",
        "voice": VOICE_ZH,
        "budget_mb": "1.5",
    },
    "hanzi": {
        "kind": "hanzi",
        "content": "miniprogram/subpkg/hanzi/content/hanzi.js",
        "audio": "miniprogram/subpkg/hanzi/static/audio",
        "url": "/subpkg/hanzi/static/audio",
        "voice": VOICE_ZH,
        "budget_mb": "1.4",
    },
    "english": {
        "kind": "english",
        "content": "miniprogram/subpkg/english/content/english.js",
        "audio": "miniprogram/subpkg/english/static/audio",
        "url": "/subpkg/english/static/audio",
        "voice": VOICE_EN,
        "budget_mb": "1.5",
    },
    "pinyin": {
        "kind": "pinyin",
        "content": "miniprogram/subpkg/pinyin/content/pinyin.js",
        "audio": "miniprogram/subpkg/pinyin/static/audio",
        "url": "/subpkg/pinyin/static/audio",
        "voice": VOICE_ZH,
        "budget_mb": "0.8",
    },
}


def find_project_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "miniprogram").is_dir():
            return parent
        if (parent / ".cursor" / "skills").is_dir():
            return parent
    return Path.cwd()


def read_content(path: Path):
    """Load a `module.exports = <strict JSON>` module into a dict."""
    text = path.read_text(encoding="utf-8").strip()
    if text.startswith(EXPORT_PREFIX):
        text = text[len(EXPORT_PREFIX) :]
    text = text.rstrip().rstrip(";")
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise SystemExit(
            f"{path} 解析失败：`module.exports = ` 后面必须是严格 JSON"
            f"（双引号、无尾逗号、无 // 注释）。{e}"
        ) from e


def write_content(path: Path, data) -> None:
    body = json.dumps(data, ensure_ascii=False, indent=2)
    path.write_text(f"{EXPORT_PREFIX}{body}\n", encoding="utf-8")


def slug(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^\w\u4e00-\u9fff-]+", "-", s, flags=re.UNICODE)
    return s.strip("-") or "item"


def hanzi_audio_stem(char: str, pinyin: str = "", word_index: int | None = None) -> str:
    """ASCII-only filename stem for 识字 clips.

    Chinese names such as ``入.mp3`` plus ``encodeURI`` become ``%E5%85%A5.mp3``.
    WeChat DevTools then returns INNERERRCODE:-1100 / 找不到所请求的 URL.
    Homophones (天/田, 二/耳) share pinyin, so the Unicode code point is required.
    """
    py = slug(pinyin) if pinyin else "zi"
    if not py.isascii():
        py = "zi"
    code = f"u{ord(char):04x}"
    if word_index is None:
        return f"{py}-{code}"
    return f"{py}-{code}-w{word_index + 1}"


async def synthesize(text: str, voice: str, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    last_err: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            await edge_tts.Communicate(text, voice, rate=RATE).save(str(out_path))
            return
        except Exception as e:
            last_err = e
            wait = 0.5 * (2**attempt)
            print(f"  重试 {attempt + 1}/{MAX_RETRIES} ({wait:.1f}s): {e}")
            await asyncio.sleep(wait)
    raise RuntimeError(f"合成失败: {text[:30]!r} -> {out_path}") from last_err


class Generator:
    def __init__(self, root: Path, force: bool) -> None:
        self.root = root
        self.force = force
        self.generated = 0
        self.skipped = 0
        self.failed: list[str] = []

    async def gen(
        self, text: str, voice: str, audio_dir: Path, url_prefix: str, name: str
    ) -> str | None:
        """Synthesize one clip, return its miniprogram runtime path."""
        if not text or not text.strip():
            return None
        out_path = audio_dir / f"{name}.mp3"
        url = f"{url_prefix}/{name}.mp3"
        if out_path.exists() and not self.force:
            self.skipped += 1
            return url
        try:
            await synthesize(text.strip(), voice, out_path)
            self.generated += 1
            print(f"  OK {url}")
            await asyncio.sleep(INTER_ITEM_DELAY)
            return url
        except Exception as e:
            self.failed.append(f"{url}: {e}")
            print(f"  FAIL {url}: {e}", file=sys.stderr)
            return None

    # ---- per-kind handlers -------------------------------------------------

    async def do_poems(self, data, voice, audio_dir, url) -> bool:
        changed = False
        for poem in data.get("poems", []):
            pid = poem.get("id") or slug(poem.get("title", "poem"))
            for i, line in enumerate(poem.get("lines", []), start=1):
                got = await self.gen(
                    line.get("text", ""), voice, audio_dir, url, f"{pid}-line-{i}"
                )
                if got and line.get("audio") != got:
                    line["audio"] = got
                    changed = True
                if line.get("plain"):
                    got = await self.gen(
                        line["plain"], voice, audio_dir, url, f"{pid}-plain-{i}"
                    )
                    if got and line.get("plainAudio") != got:
                        line["plainAudio"] = got
                        changed = True
            if poem.get("fullText"):
                got = await self.gen(
                    poem["fullText"], voice, audio_dir, url, f"{pid}-full"
                )
                if got and poem.get("fullAudio") != got:
                    poem["fullAudio"] = got
                    changed = True
        return changed

    async def do_chars(self, data, voice, audio_dir, url) -> bool:
        """旧版 chars[]；保留兼容。"""
        changed = False
        for item in data.get("chars", []):
            changed = (await self._fill_char_item(item, voice, audio_dir, url)) or changed
        return changed

    async def _fill_char_item(self, item, voice, audio_dir, url) -> bool:
        changed = False
        char = item.get("char", "")
        if not char:
            return False
        pinyin = item.get("pinyin", "")
        got = await self.gen(
            char, voice, audio_dir, url, hanzi_audio_stem(char, pinyin)
        )
        if got and item.get("audio") != got:
            item["audio"] = got
            changed = True
        words = item.get("words", [])
        word_audios = list(item.get("wordAudios", []))
        word_audios += [""] * (len(words) - len(word_audios))
        for idx, word in enumerate(words):
            got = await self.gen(
                word,
                voice,
                audio_dir,
                url,
                hanzi_audio_stem(char, pinyin, idx),
            )
            if got and word_audios[idx] != got:
                word_audios[idx] = got
                changed = True
        if word_audios:
            item["wordAudios"] = word_audios
        return changed

    async def do_hanzi(self, data, voice, audio_dir, url) -> bool:
        """当前结构：{ poem: [...], life: [...] }"""
        changed = False
        for key in ("poem", "life"):
            for item in data.get(key, []):
                changed = (await self._fill_char_item(item, voice, audio_dir, url)) or changed
        return changed

    async def do_english(self, data, voice, audio_dir, url) -> bool:
        changed = False
        items = data.get("words", [])
        if not items and data.get("categories"):
            items = []
            for cat in data["categories"]:
                items.extend(cat.get("items", []))
        for item in items:
            word = item.get("word", "")
            if not word:
                continue
            key = slug(word)
            got = await self.gen(word, voice, audio_dir, url, key)
            if got and item.get("audio") != got:
                item["audio"] = got
                changed = True
            if item.get("sentence"):
                got = await self.gen(
                    item["sentence"], voice, audio_dir, url, f"{key}-sentence"
                )
                if got and item.get("sentenceAudio") != got:
                    item["sentenceAudio"] = got
                    changed = True
        return changed

    async def do_pinyin(self, data, voice, audio_dir, url) -> bool:
        changed = False
        vowels = data.get("vowels") or []
        for item in vowels:
            letter = item.get("letter", "")
            if not letter:
                continue
            # ü 单字母常被 edge-tts 拒收，改用同韵母「迂」
            speak = "迂" if letter == "ü" else letter
            file_key = "umlaut-u" if letter == "ü" else letter
            got = await self.gen(speak, voice, audio_dir, url, file_key)
            if got and item.get("audio") != got:
                item["audio"] = got
                changed = True
        return changed

    async def do_sfx(self, data, voice, audio_dir, url) -> bool:
        changed = False
        for item in data.get("items", []):
            sid, text = item.get("id", ""), item.get("text", "")
            # 无 text 的条目是手工下载的音效（如 star），不做 TTS
            if not sid or not text:
                continue
            got = await self.gen(text, voice, audio_dir, url, sid)
            if got and item.get("audio") != got:
                item["audio"] = got
                changed = True
        return changed

    # ---- driver ----------------------------------------------------------

    async def run_module(self, name: str, cfg: dict[str, str]) -> None:
        content_path = self.root / cfg["content"]
        if not content_path.exists():
            print(f"\n[{name}] 跳过，未找到 {cfg['content']}")
            return
        print(f"\n[{name}] {cfg['content']}")
        data = read_content(content_path)
        handler = getattr(self, f"do_{cfg['kind']}")
        changed = await handler(
            data, cfg["voice"], self.root / cfg["audio"], cfg["url"]
        )
        if changed:
            write_content(content_path, data)
            print(f"  已写回 {cfg['content']}")

    def report_size(self, only: set[str]) -> None:
        print("\n音频体积（分包上限 2MB，含图片与代码）:")
        for name, cfg in MODULES.items():
            if only and name not in only:
                continue
            d = self.root / cfg["audio"]
            if not d.is_dir():
                continue
            total = sum(f.stat().st_size for f in d.rglob("*.mp3"))
            mb = total / 1024 / 1024
            flag = "  <-- 偏大，检查分包预算" if mb > float(cfg["budget_mb"]) else ""
            print(f"  {name:<12} {mb:6.2f} MB (预算 {cfg['budget_mb']} MB){flag}")

    async def run(self, only: set[str]) -> None:
        for name, cfg in MODULES.items():
            if not only or name in only:
                await self.run_module(name, cfg)
        print(
            f"\n完成: 新生成 {self.generated}, 跳过 {self.skipped}, "
            f"失败 {len(self.failed)}"
        )
        self.report_size(only)
        if self.failed:
            print("\n失败列表:", file=sys.stderr)
            for line in self.failed:
                print(f"  {line}", file=sys.stderr)
            sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="edge-tts 批量生成点读 MP3")
    parser.add_argument(
        "--root", type=Path, default=None, help="项目根（含 miniprogram/）"
    )
    parser.add_argument("--force", action="store_true", help="覆盖已存在的 MP3")
    parser.add_argument(
        "--only",
        type=str,
        default="",
        help="仅处理模块，逗号分隔: " + ",".join(MODULES),
    )
    args = parser.parse_args()
    root = args.root or find_project_root()
    only = {x.strip() for x in args.only.split(",") if x.strip()}
    unknown = only - set(MODULES)
    if unknown:
        print(f"未知模块: {', '.join(sorted(unknown))}", file=sys.stderr)
        sys.exit(2)
    print(f"项目根: {root}")
    asyncio.run(Generator(root, args.force).run(only))


if __name__ == "__main__":
    main()
