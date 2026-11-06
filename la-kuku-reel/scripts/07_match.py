"""Shot-matching measurements (brief section 5d). Writes qa/match.json + scope sheets.

- YLOW: ffmpeg signalstats 10th-percentile luma, 8-bit limited range, mean over all frames.
- Greens: circular-mean hue and mean saturation of pixels with hue 70-170 deg (S1-S3);
  near-neutral pixels (S < 0.10 or V < 0.08) are excluded because their hue is noise.
- Pinks: cushion ROIs in S1/S2, mean hue/sat (dusty rose ~345-10 deg, never ~300-320 magenta).
- Chroma: 99.9th-percentile BT.709 chroma magnitude vs the 75 % colour-bar ring (~0.37-0.45).
"""
import json
import re
import subprocess
import sys

import cv2
import numpy as np

from config import QA, SHOTS, WORK

# cushion boxes, x, y, w, h in 1080x1920 (S2 boxes sit either side of the red-brown palm trunk)
PINK_ROI = {"S1": [(410, 870, 240, 150)], "S2": [(300, 1430, 220, 160), (720, 1540, 300, 140)]}


def ylow(shot):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(WORK / "shots" / f"{shot}.mov"), "-vf",
                        "format=yuv422p,signalstats,metadata=print:key=lavfi.signalstats.YLOW:file=-",
                        "-f", "null", "-"], capture_output=True, text=True, check=True).stdout
    v = [float(x) for x in re.findall(r"YLOW=([\d.]+)", r)]
    return float(np.mean(v)), float(np.min(v)), float(np.max(v))


def frames_rgb(shot, step=8):
    n = SHOTS[shot]["frames"]
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(WORK / "shots" / f"{shot}.mov"), "-vf",
                          f"select='not(mod(n\\,{step}))',scale=in_color_matrix=bt709:in_range=tv:"
                          "flags=accurate_rnd+full_chroma_int,format=rgb48le",
                          "-fps_mode", "passthrough", "-f", "rawvideo", "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.uint16).reshape(-1, 1920, 1080, 3).astype(np.float32) / 65535.0
    return a


def hsv(a):
    return cv2.cvtColor(a, cv2.COLOR_RGB2HSV)  # float: H 0-360, S, V 0-1


def circ_mean(h):
    r = np.deg2rad(h)
    return float(np.rad2deg(np.arctan2(np.sin(r).mean(), np.cos(r).mean())) % 360)


def chroma99(a):
    y = a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722
    cb, cr = (a[..., 2] - y) / 1.8556, (a[..., 0] - y) / 1.5748
    return float(np.percentile(np.hypot(cb, cr), 99.9))


def main(shots):
    res = {}
    for s in shots:
        fr = frames_rgb(s)
        m = {"ylow_mean": None}
        m["ylow_mean"], m["ylow_min"], m["ylow_max"] = ylow(s)
        hs = np.concatenate([hsv(f).reshape(-1, 3) for f in fr])
        g = hs[(hs[:, 0] >= 70) & (hs[:, 0] <= 170) & (hs[:, 1] >= 0.10) & (hs[:, 2] >= 0.08)]
        m["green_px_frac"] = float(len(g) / len(hs))
        m["green_hue"], m["green_sat"] = (circ_mean(g[:, 0]), float(g[:, 1].mean())) if len(g) else (None, None)
        if s in PINK_ROI:
            p = np.concatenate([hsv(f[y:y + h, x:x + w]).reshape(-1, 3)
                                for f in fr for (x, y, w, h) in PINK_ROI[s]])
            p = p[((p[:, 0] >= 290) | (p[:, 0] <= 25)) & (p[:, 1] >= 0.12) & (p[:, 2] >= 0.15)]
            m["pink_hue"], m["pink_sat"], m["pink_px"] = circ_mean(p[:, 0]), float(p[:, 1].mean()), int(len(p))
            m["pink_magenta_frac"] = float(((p[:, 0] >= 290) & (p[:, 0] < 330)).mean())
        m["chroma_p99_9"] = chroma99(fr)
        res[s] = m
        print(s, json.dumps({k: (round(v, 3) if isinstance(v, float) else v) for k, v in m.items()}), flush=True)
        mid = WORK / "shots" / f"{s}.mov"
        t = "1" if SHOTS[s]["frames"] > 30 else "0.5"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", t, "-i", str(mid), "-vf",
                        "format=yuv444p,split[a][b];[b]waveform=g=green:fl=numbers,scale=1080:256,format=yuv444p[w];[a][w]vstack",
                        "-frames:v", "1", str(QA / f"wf_{s}.png")], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", t, "-i", str(mid), "-vf",
                        "vectorscope=m=color3:g=green,scale=512:512", "-frames:v", "1",
                        str(QA / f"vs_{s}.png")], check=True)
    old = json.loads((QA / "match.json").read_text()) if (QA / "match.json").exists() else {}
    old.update(res)
    (QA / "match.json").write_text(json.dumps(old, indent=2))
    report(old)


def report(r):
    have = [s for s in SHOTS if s in r]
    yl = [r[s]["ylow_mean"] for s in have]
    print(f"\nYLOW per shot: " + ", ".join(f"{s} {r[s]['ylow_mean']:.1f}" for s in have)
          + f"  -> spread {max(yl) - min(yl):.1f} (need <= 8, i.e. +-4), target ~28")
    gs = [s for s in ("S1", "S2", "S3") if s in r and r[s]["green_hue"] is not None]
    if len(gs) > 1:
        hues = [r[s]["green_hue"] for s in gs]
        sats = [r[s]["green_sat"] for s in gs]
        print("greens: " + ", ".join(f"{s} hue {r[s]['green_hue']:.1f} sat {r[s]['green_sat']:.3f}" for s in gs)
              + f" -> hue spread {max(hues) - min(hues):.1f} (<=4), sat spread {max(sats) - min(sats):.3f} (<=0.05)")
    for s in ("S1", "S2"):
        if s in r and "pink_hue" in r[s]:
            print(f"pinks {s}: hue {r[s]['pink_hue']:.1f} sat {r[s]['pink_sat']:.3f} "
                  f"magenta-range fraction {r[s]['pink_magenta_frac']:.3f}")
    print("chroma p99.9: " + ", ".join(f"{s} {r[s]['chroma_p99_9']:.3f}" for s in have) + "  (75% ring ~0.37)")


if __name__ == "__main__":
    main(sys.argv[1:] or list(SHOTS))
