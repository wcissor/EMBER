"""Fit every shot to 1080x1920 with sub-pixel accuracy and temporal smoothing.

S1-S3 (536x954): Lanczos from the denoised source + luma unsharp 0.5 (the brief's
                 no-AI fallback; AI skipped by the 45-min rule and the foliage A/B).
S4 (sign):       realesrnet-x4plus 1440x2560 -> fit.
S5 (neon hero):  60% realesrnet-x4plus + 40% Lanczos (lettering protection), with the
                 1.00 -> 1.04 linear push-in rendered sub-pixel (PIL box resize), not zoompan.
Then a centred 1:5:1 temporal mix (same weights as tmix=frames=3:weights='1 5 1',
but centred: ffmpeg's tmix is causal and would lag one frame and duplicate frame 1).
Output: work/fit/S#/%06d.png, 16-bit RGB.
"""
import shutil
import sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np

from config import SHOTS, WORK
from fitlib import fit, read_rgb, unsharp_luma, write_rgb16

PLAN = {"S1": "lanczos", "S2": "lanczos", "S3": "lanczos", "S4": "ai", "S5": "blend"}
AI_WEIGHT = 0.6
PUSH = {"S5": (1.00, 1.04)}
TWEIGHTS = (1.0, 5.0, 1.0)


def make_frame(shot, i, n):
    """i: 0-based index within the shot."""
    z0, z1 = PUSH.get(shot, (1.0, 1.0))
    zoom = z0 + (z1 - z0) * i / (n - 1)
    name = f"{i + 1:06d}.png"
    mode = PLAN[shot]
    if mode == "lanczos":
        return unsharp_luma(fit(read_rgb(WORK / "frames" / shot / name), zoom=zoom), 0.5)
    ai = fit(read_rgb(WORK / "up" / shot / name), zoom=zoom)
    if mode == "ai":
        return ai
    lz = fit(read_rgb(WORK / "frames" / shot / name), zoom=zoom)
    return AI_WEIGHT * ai + (1 - AI_WEIGHT) * lz


def run_shot(shot):
    n = SHOTS[shot]["frames"]
    out = WORK / "fit" / shot
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True)
    with ThreadPoolExecutor(4) as ex:
        frames = list(ex.map(lambda i: make_frame(shot, i, n), range(n)))
    a, b, c = TWEIGHTS
    for i in range(n):
        prev, nxt = frames[max(i - 1, 0)], frames[min(i + 1, n - 1)]
        write_rgb16(out / f"{i + 1:06d}.png", (a * prev + b * frames[i] + c * nxt) / (a + b + c))
    print(f"{shot}: {n} frames -> {out}", flush=True)


if __name__ == "__main__":
    for s in sys.argv[1:] or list(SHOTS):
        run_shot(s)
