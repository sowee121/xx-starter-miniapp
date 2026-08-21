#!/usr/bin/env python3
"""Generate answer-feedback TTS (faster than point-read) for miniprogram/static/shared/."""

from __future__ import annotations

import asyncio
import struct
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("请先安装: python3 -m pip install edge-tts", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "miniprogram/static/shared"

VOICE = "zh-CN-XiaoxiaoNeural"
MAX_SECONDS = 2.0
RATES = ("+20%", "+30%", "+40%", "+50%", "+60%")

ITEMS = [
    ("answer-correct.mp3", "答对啦！你真棒！"),
    ("answer-wrong.mp3", "答错啦！再试一次吧～"),
]


def duration_seconds(path: Path) -> float:
    try:
        from mutagen.mp3 import MP3

        return float(MP3(path).info.length)
    except Exception:
        return _mpeg_duration(path)


def _mpeg_duration(path: Path) -> float:
    data = path.read_bytes()
    i = 0
    frames = 0
    samples = 0
    while i + 4 <= len(data):
        if data[i] != 0xFF or (data[i + 1] & 0xE0) != 0xE0:
            i += 1
            continue
        hdr = struct.unpack(">I", data[i : i + 4])[0]
        version_id = (hdr >> 19) & 3
        layer = (hdr >> 17) & 3
        bitrate_idx = (hdr >> 12) & 15
        sr_idx = (hdr >> 10) & 3
        padding = (hdr >> 9) & 1
        if layer != 1 or bitrate_idx in (0, 15) or sr_idx == 3:
            i += 1
            continue
        sr_table = {
            3: (44100, 48000, 32000),
            2: (22050, 24000, 16000),
            0: (11025, 12000, 8000),
        }[version_id]
        sample_rate = sr_table[sr_idx]
        br_v1 = (0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320)
        br_v2 = (0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160)
        bitrate = (br_v1 if version_id == 3 else br_v2)[bitrate_idx] * 1000
        spf = 1152 if version_id == 3 else 576
        frame_len = int(spf / 8 * bitrate / sample_rate) + padding
        if frame_len < 24:
            i += 1
            continue
        frames += 1
        samples += spf
        i += frame_len
        last_sr = sample_rate
    if frames == 0:
        raise RuntimeError(f"无法解析 {path} 时长")
    return samples / last_sr


async def synthesize_under_cap(path: Path, text: str) -> tuple[str, float]:
    last_rate = RATES[0]
    last_dur = 0.0
    for rate in RATES:
        last_rate = rate
        await edge_tts.Communicate(text, VOICE, rate=rate).save(str(path))
        last_dur = duration_seconds(path)
        if last_dur <= MAX_SECONDS:
            return rate, last_dur
    raise SystemExit(
        f"{path.name} 最快 {last_rate} 仍为 {last_dur:.2f}s，超过 {MAX_SECONDS}s"
    )


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, text in ITEMS:
        path = OUT / name
        rate, dur = await synthesize_under_cap(path, text)
        print(
            f"generated {path.relative_to(ROOT)} "
            f"({path.stat().st_size} bytes, {VOICE} rate={rate}, {dur:.2f}s)"
        )


if __name__ == "__main__":
    asyncio.run(main())
