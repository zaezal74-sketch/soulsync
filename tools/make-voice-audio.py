#!/usr/bin/env python3
"""SoulSync — tools/make-voice-audio.py

Regenerates the recorded Korean prayer voices in audio/ko-male/ and
audio/ko-female/ from the text the app shows. Needs `pip install edge-tts`
(online: it uses Microsoft's edge TTS service) and network access.

    node tools/export-voices.js > tools/voices.json
    python3 tools/make-voice-audio.py          # both voices
    python3 tools/make-voice-audio.py male     # only audio/ko-male/
    python3 tools/make-voice-audio.py female   # only audio/ko-female/

Each voice is slowed to -20% so it reads as a calm prayer rather than a
newsreader; the pitch is lowered a little further for the male voice so it
sits under the device's default register.
"""
import asyncio
import json
import os
import sys

import edge_tts

VOICES = {
    "male": {"voice": "ko-KR-HyunsuMultilingualNeural", "rate": "-20%", "pitch": "-15Hz", "dir": "ko-male"},
    "female": {"voice": "ko-KR-SunHiNeural", "rate": "-20%", "pitch": "-14Hz", "dir": "ko-female"},
}
HERE = os.path.dirname(os.path.abspath(__file__))
JOBS = os.path.join(HERE, "voices.json")
OUT = os.path.join(HERE, "..", "audio")
CONCURRENCY = 4


async def one(job, sem, gender):
    spec = VOICES[gender]
    path = os.path.join(OUT, spec["dir"], job["file"])
    async with sem:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(
                    job["text"], spec["voice"], rate=spec["rate"], pitch=spec["pitch"]
                ).save(path)
                size = os.path.getsize(path)
                if size > 5000:
                    print("  ok  %-22s %6d bytes" % (job["file"], size), flush=True)
                    return True
                print("  small %-20s %6d bytes, retrying" % (job["file"], size), flush=True)
            except Exception as exc:  # noqa: BLE001 - report and retry
                print("  err %-21s %s" % (job["file"], exc), flush=True)
            await asyncio.sleep(1.5)
    return False


async def main(gender):
    with open(JOBS, encoding="utf-8") as fh:
        jobs = json.load(fh)
    os.makedirs(os.path.join(OUT, VOICES[gender]["dir"]), exist_ok=True)
    print("%s — %s (%s, %s)" % (gender, VOICES[gender]["voice"], VOICES[gender]["rate"], VOICES[gender]["pitch"]))
    sem = asyncio.Semaphore(CONCURRENCY)
    results = await asyncio.gather(*(one(job, sem, gender) for job in jobs))
    failed = [job["file"] for job, good in zip(jobs, results) if not good]
    print("\n%s: %d/%d files ready" % (gender, len(jobs) - len(failed), len(jobs)))
    if failed:
        print("failed:", ", ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    wanted = sys.argv[1] if len(sys.argv) > 1 else "all"
    if wanted == "all":
        genders = list(VOICES)
    elif wanted in VOICES:
        genders = [wanted]
    else:
        print("usage: make-voice-audio.py [male|female|all]")
        sys.exit(2)
    code = 0
    for g in genders:
        if asyncio.run(main(g)) != 0:
            code = 1
    sys.exit(code)
