"""Text-to-background contrast (WCAG 2.x ratio) for the end line.

Background = mean colour inside the text bounding box of a frame WITHOUT the title (sampled
at t=14.5 s); text = #F3EBDD at 90 % over that background. Usage: 10_contrast.py <png>"""
import json
import sys

import cv2
import numpy as np

from config import WORK


def lin(c):
    c = np.asarray(c, np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def rel_lum(rgb):
    r, g, b = lin(rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(png):
    box = json.loads((WORK / "title_box.json").read_text())
    img = cv2.imread(png, -1)[..., ::-1].astype(np.float64)
    img /= 65535.0 if img.max() > 255 else 255.0
    bg = img[box["y0"]:box["y1"] + 1, box["x0"]:box["x1"] + 1].reshape(-1, 3)
    bg_mean = bg.mean(0)
    txt = 0.9 * np.array([0xF3, 0xEB, 0xDD]) / 255.0 + 0.1 * bg_mean
    Lt, Lb = rel_lum(txt), rel_lum(bg_mean)
    Lb_hi = rel_lum(np.percentile(bg, 90, axis=0))
    ratio = (max(Lt, Lb) + 0.05) / (min(Lt, Lb) + 0.05)
    worst = (Lt + 0.05) / (Lb_hi + 0.05)
    return ratio, worst, bg_mean


if __name__ == "__main__":
    r, w, bg = contrast(sys.argv[1])
    print(f"background mean RGB {np.round(bg * 255).astype(int)}, contrast {r:.2f}:1 "
          f"(vs 90th-pct-bright background {w:.2f}:1) -> {'PASS' if r >= 3 else 'FAIL'} (need >= 3:1)")
