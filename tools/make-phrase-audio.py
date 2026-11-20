#!/usr/bin/env python3
"""SoulSync — tools/make-phrase-audio.py

Records `hailMary.mp3` and `ourFather.mp3` phrase by phrase and joins the
phrases at the MP3 frame level, so the prayer has the small natural pauses of
someone praying rather than the long gaps edge-tts inserts between sentences.

    pip install edge-tts
    python3 tools/make-phrase-audio.py            # both voices
    python3 tools/make-phrase-audio.py male       # only audio/ko-male/
    python3 tools/make-phrase-audio.py female     # only audio/ko-female/

Breaks:
  * between phrases of the same line: no extra frame (0.0s),
  * at the stanza break after "복되시나이다." / "이루어지소서.": 6 silent
    MPEG-2 Layer III frames (6 x 24ms = 0.144s ~= 0.15s).

These are the same voices and settings as tools/make-voice-audio.py; use that
script for every other recording.
"""
import asyncio
import os
import sys

import edge_tts

VOICES = {
    "male": {"voice": "ko-KR-HyunsuMultilingualNeural", "rate": "-20%", "pitch": "-15Hz", "dir": "ko-male"},
    "female": {"voice": "ko-KR-SunHiNeural", "rate": "-20%", "pitch": "-14Hz", "dir": "ko-female"},
}

# (phrases, indexes after which a stanza break follows)
PRAYERS = {
    "hailMary.mp3": (
        [
            "은총이 가득하신 마리아님,",
            "기뻐하소서.",
            "주님께서 함께 계시니,",
            "여인 중에 복되시며,",
            "태중의 아들 예수님 또한 복되시나이다.",
            "천주의 성모 마리아님,",
            "이제와 저희 죽을 때에,",
            "저희 죄인을 위하여 빌어주소서.",
            "아멘.",
        ],
        {4},
    ),
    "ourFather.mp3": (
        [
            "하늘에 계신 우리 아버지,",
            "아버지의 이름이 거룩히 빛나시며,",
            "아버지의 나라가 오시며,",
            "아버지의 뜻이 하늘에서와 같이,",
            "땅에서도 이루어지소서.",
            "오늘 저희에게 일용할 양식을 주시고,",
            "저희에게 잘못한 이를 저희가 용서하오니,",
            "저희 죄를 용서하시고,",
            "저희를 유혹에 빠지지 않게 하시고,",
            "악에서 구하소서.",
            "아멘.",
        ],
        {4},
    ),
}

STANZA_FRAMES = 6  # 6 x 24ms = 0.144s
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "audio")
TMP = os.path.join(HERE, ".phrase-tmp")
CONCURRENCY = 4

BR_MPEG2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
SR_MPEG2 = [22050, 24000, 16000]


def frame_len(buf, i):
    """Length of the MPEG-2 Layer III frame starting at i, or 0 if not a header."""
    if i + 4 > len(buf) or buf[i] != 0xFF or (buf[i + 1] & 0xE0) != 0xE0:
        return 0
    if (buf[i + 1] >> 3) & 3 != 2:  # MPEG-2
        return 0
    if (buf[i + 1] >> 1) & 3 != 1:  # Layer III
        return 0
    bitrate = BR_MPEG2_L3[buf[i + 2] >> 4] * 1000
    sr = SR_MPEG2[(buf[i + 2] >> 2) & 3]
    pad = (buf[i + 2] >> 1) & 1
    if not bitrate or not sr:
        return 0
    return 72 * bitrate // sr + pad


def audio_frames(data):
    """Audio frames of an edge-tts file, without ID3 tag or Xing/Info header frame."""
    i = 0
    if data[:3] == b"ID3":
        sz = data[6:10]
        i = 10 + ((sz[0] << 21) | (sz[1] << 14) | (sz[2] << 7) | sz[3])
    frames = []
    while i + 4 <= len(data):
        n = frame_len(data, i)
        if not n:
            i += 1
            continue
        frames.append(data[i:i + n])
        i += n
    if frames and (b"Xing" in frames[0] or b"Info" in frames[0]):
        frames = frames[1:]
    return frames


def silence_frames(sample_frame):
    """Silent frames that keep the last frame's header (bitrate, rate, mode)."""
    return [sample_frame[:4] + b"\x00" * (len(sample_frame) - 4)] * STANZA_FRAMES


async def say(text, path, spec, sem):
    async with sem:
        for _ in range(3):
            try:
                await edge_tts.Communicate(
                    text, spec["voice"], rate=spec["rate"], pitch=spec["pitch"]
                ).save(path)
                if os.path.getsize(path) > 1000:
                    return True
            except Exception as exc:  # noqa: BLE001 - report and retry
                print("  err %s" % exc, flush=True)
            await asyncio.sleep(1.5)
    return False


async def build(name, gender, sem, cache=False):
    spec = VOICES[gender]
    phrases, stanzas = PRAYERS[name]
    os.makedirs(TMP, exist_ok=True)
    parts = []
    for idx, text in enumerate(phrases):
        path = os.path.join(TMP, "%s-%s-%02d.mp3" % (gender, name, idx))
        if cache and os.path.exists(path) and os.path.getsize(path) > 1000:
            pass
        elif not await say(text, path, spec, sem):
            print("  failed phrase %d of %s (%s)" % (idx + 1, name, text), flush=True)
            return False
        frames = audio_frames(open(path, "rb").read())
        if not frames:
            print("  no frames for phrase %d of %s" % (idx + 1, name), flush=True)
            return False
        print("  %-4s %s %2d/%d  %5.2fs  %s" % (
            gender, name, idx + 1, len(phrases), len(frames) * 0.024, text), flush=True)
        parts.extend(frames)
        if idx in stanzas:
            parts.extend(silence_frames(frames[-1]))
    out_dir = os.path.join(OUT, spec["dir"])
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, name)
    with open(out_path, "wb") as fh:
        fh.write(b"".join(parts))
    size = os.path.getsize(out_path)
    print("%s %s -> %s  %d bytes  %.1fs" % (
        gender, name, out_path, size, len(parts) * 0.024), flush=True)
    return size > 5000


async def main(gender, cache=False):
    sem = asyncio.Semaphore(CONCURRENCY)
    spec = VOICES[gender]
    print("%s — %s (%s, %s)" % (gender, spec["voice"], spec["rate"], spec["pitch"]))
    ok = True
    for name in PRAYERS:
        ok = await build(name, gender, sem, cache) and ok
    return 0 if ok else 1


if __name__ == "__main__":
    plain = [arg for arg in sys.argv[1:] if not arg.startswith("--")]
    wanted = plain[0] if plain else "all"
    if wanted == "all":
        genders = list(VOICES)
    elif wanted in VOICES:
        genders = [wanted]
    else:
        print("usage: make-phrase-audio.py [male|female|all]")
        sys.exit(2)
    code = 0
    cache = "--cache" in sys.argv[1:]
    for g in genders:
        if asyncio.run(main(g, cache)) != 0:
            code = 1
    sys.exit(code)
