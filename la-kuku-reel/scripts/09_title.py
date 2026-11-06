"""Render the end line "Reserve a table" to work/title.png (1080x1920 RGBA).

Cormorant SC Medium, 46 px, tracking +0.14 em, #F3EBDD @ 90 %, horizontally centred, baseline
at y = 1178: in the bar's shadow under the neon, 12.85:1 contrast. The brief's y=1400 / 1300 sit
on the floor reflection at 1.91:1 / 2.20:1, below its own 3:1 rule. Soft shadow: same text,
black 25 %, Gaussian blur 6 px. Glyphs advance by font.getlength(ch) + 0.14*46 (drawtext cannot
track). Rendered at 4x and area-downsampled so tracked glyphs land on exact sub-pixel positions
without hinting distortion.

  python3 09_title.py [--baseline 1178] [--shadow 0.25]
"""
import argparse
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from config import FONTS, QA, WORK

TEXT = "Reserve a table"
SIZE = 46
TRACK = 0.14
COLOR = (0xF3, 0xEB, 0xDD)
OPACITY = 0.90
SS = 4


def layout(font, size):
    adv = [font.getlength(ch) for ch in TEXT]
    track = TRACK * size
    total = sum(adv) + track * (len(TEXT) - 1)
    return adv, track, total


def render(baseline, shadow, out):
    W, H = 1080, 1920
    font = ImageFont.truetype(str(FONTS / "CormorantSC-Medium.ttf"), SIZE * SS)
    adv, track, total = layout(font, SIZE * SS)
    mask = Image.new("L", (W * SS, H * SS), 0)
    d = ImageDraw.Draw(mask)
    x = (W * SS - total) / 2.0
    for ch, a in zip(TEXT, adv):
        d.text((x, baseline * SS), ch, font=font, fill=255, anchor="ls")
        x += a + track
    m = np.asarray(mask.resize((W, H), Image.BOX), np.float32) / 255.0          # glyph coverage
    sh = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)),
                    np.float32) / 255.0 * shadow
    a_txt = m * OPACITY
    a_out = a_txt + sh * (1 - a_txt)                                              # text over shadow
    rgb = np.zeros((H, W, 3), np.float32)
    nz = a_out > 0
    rgb[nz] = (np.array(COLOR, np.float32) * a_txt[nz, None]) / a_out[nz, None]  # un-premultiply
    rgba = np.dstack([rgb, a_out * 255]).round().clip(0, 255).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(out)
    ys, xs = np.nonzero(m > 0.02)
    box = dict(x0=int(xs.min()), x1=int(xs.max()), y0=int(ys.min()), y1=int(ys.max()), baseline=baseline,
               width=round(total / SS, 1), shadow=shadow)
    (WORK / "title_box.json").write_text(json.dumps(box))
    print(f"wrote {out}: text box x {box['x0']}-{box['x1']}, y {box['y0']}-{box['y1']} "
          f"(advance width {box['width']} px), baseline {baseline}, shadow {shadow}")
    return box


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline", type=int, default=1178)
    ap.add_argument("--shadow", type=float, default=0.25)
    a = ap.parse_args()
    render(a.baseline, a.shadow, WORK / "title.png")
