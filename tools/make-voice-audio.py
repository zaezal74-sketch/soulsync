#!/usr/bin/env python3
"""SoulSync — tools/make-voice-audio.py

Regenerates the Korean male prayer voice files in audio/ko-male/ from the text
the app shows. Needs `pip install edge-tts` (online: it uses Microsoft's edge
TTS service) and network access.

    node tools/export-voices.js > tools/voices.json
    python3 tools/make-voice-audio.py

The voice is ko-KR-InJoonNeural, slowed to -18% and lowered by 8 Hz so it reads
as a calm prayer rather than a newsreader.
"""
import asyncio
import json
import os
import sys

import edge_tts

VOICE = "ko-KR-InJoonNeural"
RATE = "-18%"
PITCH = "-8Hz"
HERE = os.path.dirname(os.path.abspath(__file__))
JOBS = os.path.join(HERE, "voices.json")
OUT = os.path.join(HERE, "..", "audio", "ko-male")
CONCURRENCY = 4


async def one(job, sem):
    path = os.path.join(OUT, job["file"])
    async with sem:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(job["text"], VOICE, rate=RATE, pitch=PITCH).save(path)
                size = os.path.getsize(path)
                if size > 5000:
                    print("  ok  %-22s %6d bytes" % (job["file"], size), flush=True)
                    return True
                print("  small %-20s %6d bytes, retrying" % (job["file"], size), flush=True)
            except Exception as exc:  # noqa: BLE001 - report and retry
                print("  err %-21s %s" % (job["file"], exc), flush=True)
            await asyncio.sleep(1.5)
    return False


async def main():
    with open(JOBS, encoding="utf-8") as fh:
        jobs = json.load(fh)
    os.makedirs(OUT, exist_ok=True)
    sem = asyncio.Semaphore(CONCURRENCY)
    results = await asyncio.gather(*(one(job, sem) for job in jobs))
    failed = [job["file"] for job, good in zip(jobs, results) if not good]
    print("\n%d/%d files ready" % (len(jobs) - len(failed), len(jobs)))
    if failed:
        print("failed:", ", ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
