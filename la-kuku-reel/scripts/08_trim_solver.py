"""Solve per-shot match trims from measurements (brief 5d: measure, don't guess).

Simulates trim -> grade on every 8th fitted frame (4x downsampled) with a vectorised copy of
05_lut.py's functions (asserted equal to the scalar originals on the LUT grid), then solves:
  toe   -> YLOW (10th-pct luma, 8-bit limited) = target
  ghue  -> mean green hue (70-170 deg) = common target          (S1-S3)
  phue  -> mean cushion hue = dusty rose                          (S1, S2)
Writes the result into trims.json. Halation is not simulated (it barely moves these stats);
07_match.py verifies on the real renders afterwards.
"""
import importlib.util
import json
import sys
from pathlib import Path

import cv2
import numpy as np

from config import SHOTS, WORK

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("lut", HERE / "05_lut.py")
lut = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lut)

PINK_ROI = {"S1": [(410, 870, 240, 150)], "S2": [(300, 1430, 220, 160), (720, 1540, 300, 140)]}


# ---------------------------------------------------------------- vectorised colour maths
def rgb2hsv(x):
    mx, mn = x.max(-1), x.min(-1)
    d = mx - mn
    s = np.where(mx > 0, d / np.where(mx > 0, mx, 1), 0)
    r, g, b = x[..., 0], x[..., 1], x[..., 2]
    dd = np.where(d > 0, d, 1)
    rc, gc, bc = (mx - r) / dd, (mx - g) / dd, (mx - b) / dd
    h = np.where(r == mx, bc - gc, np.where(g == mx, 2.0 + rc - bc, 4.0 + gc - rc))
    h = np.where(d > 0, (h / 6.0) % 1.0, 0.0)
    return h * 360.0, s, mx


def hsv2rgb(hd, s, v):
    h6 = (hd % 360.0) / 60.0
    i = np.floor(h6).astype(int) % 6
    f = h6 - np.floor(h6)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    sel = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]
    out = np.zeros(hd.shape + (3,))
    for k, (a, b, c) in enumerate(sel):
        m = i == k
        out[m] = np.stack([a[m], b[m], c[m]], -1)
    return out


def tri(hd, c, width):
    d = np.minimum(np.abs(hd - c), 360 - np.abs(hd - c))
    return np.maximum(0.0, 1 - d / width)


def grade_v(x):
    hd, s, v = rgb2hsv(x)
    wg, wp = tri(hd, 110, 50), tri(hd, 335, 30)
    hd = hd - 5 * wg + 6 * wp
    s = s * 0.88 * (1 - 0.25 * wg) * (1 - 0.40 * wp)
    v = v * (1 - 0.10 * wg)
    y = lut.T_USED(hsv2rgb(hd, np.minimum(s, 1), v))
    L = y[..., 0] * 0.2126 + y[..., 1] * 0.7152 + y[..., 2] * 0.0722
    hi, lo = np.clip((L - 0.55) / 0.45, 0, 1), np.clip((0.45 - L) / 0.45, 0, 1)
    y[..., 0] += 0.025 * hi - 0.006 * lo
    y[..., 1] += 0.008 * hi
    y[..., 2] += -0.025 * hi + 0.010 * lo
    return np.clip(y, 0, 1)


def trim_v(x, t):
    t = {**lut.IDENTITY, **t}
    x = np.clip(x * np.asarray(t["wb"]) * t["gain"], 0, 1) ** (1.0 / t["gamma"])
    x = x + t["lift"] * (1 - x)
    p = lut.TOE_PIVOT
    x = np.where(x < p, x - t["toe"] * x * (1 - x / p) ** 2, x)
    L = (x[..., 0] * 0.2126 + x[..., 1] * 0.7152 + x[..., 2] * 0.0722)[..., None]
    x = np.clip(L + (x - L) * t["sat"], 0, 1)
    if t["ghue"] or t["phue"] or t["gsat"] != 1 or t["psat"] != 1:
        hd, s, v = rgb2hsv(x)
        wg, wp = lut.wgreen(hd), tri(hd, 335, 40)
        hd = hd + t["ghue"] * wg + t["phue"] * wp
        s = s * (1 + (t["gsat"] - 1) * wg) * (1 + (t["psat"] - 1) * wp)
        x = hsv2rgb(hd, np.minimum(s, 1), v)
    return np.clip(x, 0, 1)


def self_check():
    g = np.stack(np.meshgrid(*[np.linspace(0, 1, 9)] * 3, indexing="ij"), -1).reshape(-1, 3)
    t = dict(toe=0.4, ghue=-10, phue=8, gsat=0.9, psat=0.8, gamma=1.05)
    ref = np.array([lut.grade(*lut.trim(p, t)) for p in g])
    err = np.abs(grade_v(trim_v(g, t)) - ref).max()
    assert err < 1e-9, err
    return err


# ---------------------------------------------------------------- measurement
def load(shot, step=8):
    fr = []
    for i in range(0, SHOTS[shot]["frames"], step):
        a = cv2.imread(str(WORK / "fit" / shot / f"{i + 1:06d}.png"), -1)[..., ::-1].astype(np.float64) / 65535
        fr.append(a)
    return fr


def stats(frames, shot, t):
    yl, gh, gs, ph = [], [], [], []
    for f in frames:
        small = f[::3, ::3]   # decimate, do not average: keeps per-pixel colour statistics
        y = grade_v(trim_v(small, t))
        Y = 16 + 219 * (y[..., 0] * 0.2126 + y[..., 1] * 0.7152 + y[..., 2] * 0.0722)
        yl.append(np.percentile(Y, 10))
        hd, s, v = rgb2hsv(y)
        m = (hd >= 70) & (hd <= 170) & (s >= 0.10) & (v >= 0.08)
        gh.append(hd[m]); gs.append(s[m])
        if shot in PINK_ROI:
            for (x0, y0, w, h) in PINK_ROI[shot]:
                sub = grade_v(trim_v(f[y0:y0 + h, x0:x0 + w], t))
                phd, ps, pv = rgb2hsv(sub)
                pm = ((phd >= 290) | (phd <= 25)) & (ps >= 0.12) & (pv >= 0.15)
                ph.append(phd[pm])
    circ = lambda h: float(np.rad2deg(np.arctan2(np.sin(np.deg2rad(h)).mean(), np.cos(np.deg2rad(h)).mean())) % 360)
    out = dict(ylow=float(np.mean(yl)), ghue=circ(np.concatenate(gh)), gsat=float(np.concatenate(gs).mean()))
    if ph:
        out["phue"] = circ(np.concatenate(ph))
    return out


def solve1(f, target, lo, hi, iters=11):
    """bisection on a monotone scalar function"""
    flo = f(lo) - target
    for _ in range(iters):
        mid = (lo + hi) / 2
        fm = f(mid) - target
        if np.sign(fm) == np.sign(flo):
            lo, flo = mid, fm
        else:
            hi = mid
    return round((lo + hi) / 2, 3)


def main():
    print("vectorised grade == brief grade: max err %.1e" % self_check())
    targets = json.loads((HERE / "match_targets.json").read_text())
    trims = json.loads((HERE / "trims.json").read_text())
    shots = sys.argv[1:] or [s for s in targets if s in SHOTS]
    for s in shots:
        tg = targets[s]
        frames = load(s)
        t = dict(trims.get(s, {}))
        base = stats(frames, s, t)
        for _ in range(2):   # coordinate passes: toe -> ghue -> phue
            if "ylow" in tg:
                t["toe"] = solve1(lambda v: -stats(frames, s, {**t, "toe": v})["ylow"], -tg["ylow"], 0.0, 0.95)
            if "ghue" in tg:
                t["ghue"] = solve1(lambda v: stats(frames, s, {**t, "ghue": v})["ghue"], tg["ghue"], -40, 40)
            if "phue" in tg:
                t["phue"] = solve1(lambda v: stats(frames, s, {**t, "phue": v})["phue"], tg["phue"], -10, 25)
        after = stats(frames, s, t)
        trims[s] = t
        fmt = lambda d: ", ".join(f"{k} {v:.2f}" for k, v in d.items())
        print(f"{s}: trims {t}\n    before: {fmt(base)}\n    after:  {fmt(after)}", flush=True)
    (HERE / "trims.json").write_text(json.dumps(trims, indent=2) + "\n")


if __name__ == "__main__":
    main()
