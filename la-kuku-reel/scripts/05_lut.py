"""Write luts/lakuku_quiet.cube (the brief's grade, verbatim) and one per-shot LUT
luts/lakuku_quiet_S#.cube = grade(trim_S#(rgb)).

Per-shot match trims run *before* the base grade (as the brief asks for eq/colorbalance
before the LUT). They are baked into the 33^3 LUT instead of using ffmpeg's eq,
because eq only works at 8 bits and would quantise the 16-bit chain mid-grade.
Trim values live in trims.json next to this script.
"""
import colorsys
import json
import os
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
N = 33          # base look, as specified
N_SHOT = 65     # per-shot cubes: hue-selective trims on low-saturation olives need the finer grid


# ---- base grade: copied from the brief ----------------------------------------------------
# The brief's contrast line compounds a pivot contrast with a range remap, which puts black at
# 7.2 % and white at 91.8 % instead of the "~3.5 % / ~95.5 %" its own comment states (and makes
# its YLOW~28 target unreachable). T_USED implements the stated intent; T_BRIEF is kept so the
# verbatim cube can be regenerated for comparison (luts/lakuku_quiet_brief-verbatim.cube).
T_BRIEF = lambda x: 0.035 + (0.5 + (x - 0.5) * 0.92) * (0.955 - 0.035)
T_USED = lambda x: 0.035 + x * (0.955 - 0.035)


def w(h, c, width):
    d = min(abs(h - c), 360 - abs(h - c))
    return max(0.0, 1 - d / width)


def grade(r, g, b, t=T_USED):
    h, s, v = colorsys.rgb_to_hsv(r, g, b); hd = h * 360
    wg = w(hd, 110, 50); wp = w(hd, 335, 30)          # greens / pinks-magentas
    hd += -5 * wg + 6 * wp                              # greens -> deep olive-emerald, pinks -> dusty rose
    s *= 0.88 * (1 - 0.25 * wg) * (1 - 0.40 * wp)       # global -12%, greens -25%, pinks -40%
    v *= (1 - 0.10 * wg)                                # deepen greens 10%
    r, g, b = colorsys.hsv_to_rgb((hd % 360) / 360, min(s, 1), v)
    r, g, b = t(r), t(g), t(b)                          # softer contrast, blacks lifted to 3.5 %, whites rolled to 95.5 %
    L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    hi = np.clip((L - 0.55) / 0.45, 0, 1); lo = np.clip((0.45 - L) / 0.45, 0, 1)
    r += 0.025 * hi - 0.006 * lo; g += 0.008 * hi; b += -0.025 * hi + 0.010 * lo   # warm highlights, neutral-cool shadows
    return [min(max(c, 0.0), 1.0) for c in (r, g, b)]


# ---- per-shot trims (applied first) -----------------------------------------------------
IDENTITY = dict(gain=1.0, gamma=1.0, lift=0.0, toe=0.0, wb=[1.0, 1.0, 1.0], sat=1.0,
                ghue=0.0, gsat=1.0, phue=0.0, psat=1.0)
TOE_PIVOT = 0.25


def wgreen(hd):
    """flat-top green window for trims: 1 over 75-165 deg, linear tapers to 0 at 40 / 200 deg,
    so a hue rotation moves the whole foliage family uniformly (works on scalars or arrays)."""
    return np.clip((hd - 40.0) / 35.0, 0, 1) * np.clip((200.0 - hd) / 35.0, 0, 1)


def trim(rgb, t):
    """gain/wb -> gamma -> lift -> toe (smooth shadow compression below 25 %, 0 and the pivot
    stay fixed, monotonic while toe < 1) -> saturation -> hue-selective green / pink moves."""
    t = {**IDENTITY, **t}
    x = np.clip(np.asarray(rgb, np.float64) * np.asarray(t["wb"]) * t["gain"], 0, 1)
    x = x ** (1.0 / t["gamma"])
    x = x + t["lift"] * (1.0 - x)
    x = np.where(x < TOE_PIVOT, x - t["toe"] * x * (1.0 - x / TOE_PIVOT) ** 2, x)
    L = 0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2]
    x = np.clip(L + (x - L) * t["sat"], 0, 1)
    if t["ghue"] or t["phue"] or t["gsat"] != 1 or t["psat"] != 1:
        h, s, v = colorsys.rgb_to_hsv(*x)
        hd = h * 360
        wg, wp = wgreen(hd), w(hd, 335, 40)
        hd += t["ghue"] * wg + t["phue"] * wp
        s *= (1 + (t["gsat"] - 1) * wg) * (1 + (t["psat"] - 1) * wp)
        x = np.array(colorsys.hsv_to_rgb((hd % 360) / 360, min(s, 1.0), v))
    return np.clip(x, 0, 1)


def write_cube(path, title, fn, n=N):
    with open(path, "w") as f:
        f.write(f'TITLE "{title}"\nLUT_3D_SIZE {n}\n')
        for bi in range(n):
            for gi in range(n):
                for ri in range(n):          # red varies fastest
                    f.write("%.6f %.6f %.6f\n" % tuple(fn(ri / (n - 1), gi / (n - 1), bi / (n - 1))))


def main():
    os.makedirs(ROOT / "luts", exist_ok=True)
    write_cube(ROOT / "luts/lakuku_quiet.cube", "LaKuku Quiet", grade)
    write_cube(ROOT / "luts/lakuku_quiet_brief-verbatim.cube", "LaKuku Quiet (brief verbatim)",
               lambda r, g, b: grade(r, g, b, T_BRIEF))
    trims = json.loads((Path(__file__).parent / "trims.json").read_text())
    shots = sys.argv[1:] or sorted(trims)
    for s in shots:
        t = trims[s]
        write_cube(ROOT / f"luts/lakuku_quiet_{s}.cube", f"LaKuku Quiet {s}",
                   lambda r, g, b, t=t: grade(*trim((r, g, b), t)), N_SHOT)
        print(f"luts/lakuku_quiet_{s}.cube  trims={t}")


if __name__ == "__main__":
    main()
