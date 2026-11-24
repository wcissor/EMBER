#!/usr/bin/env python3
"""Gate 12 caption contrast on the final frames: for every frame a caption is up, sample the background behind each
of its text rows (the row's line box across the measured text width, +16 px), ignoring the glyphs themselves
(pixels brighter than 0.5 relative luminance, dilated 4 px to drop their anti-aliased edges), and take the 95th percentile. Frames in a caption's 3-frame fade-out are skipped (the words are leaving, not at rest). Prints JSON {worst, under, frames}."""
import json, subprocess, sys
import numpy as np
from scipy.ndimage import binary_dilation
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
final, lang = sys.argv[1], sys.argv[2]
TL = json.loads((ROOT / f'build/timeline-{lang}.json').read_text())
L = json.loads((ROOT / f'build/qa-layout-{lang}.json').read_text())
rows = {}
for r in L['textRows']:
    if ' row ' in r['id']:
        lid, n = r['id'].split(' row ')
        rows.setdefault(lid[1:], []).append(r)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', final, '-vf', 'crop=1080:220:0:1060', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 220, 1080, 3)
EYE = 0.912  # relative luminance of #F5F7FF
out, worst = [], (None, None, 99)
# caption windows exactly as the film draws them (src/overlays/Overlays.tsx): from the tag (first word − 4) to
# min(line end + 6, next tag); the last 3 frames are the fade-out, which is not text at rest
wins = []
for i, x in enumerate(TL['lines']):
    frm = int(round(x['words'][0]['start'] * 30)) - 4
    to = int(round(x['end'] * 30)) + 6
    wins.append([frm, to])
for i in range(len(wins) - 1):
    wins[i][1] = min(wins[i][1], wins[i + 1][0])
for i, x in enumerate(TL['lines']):
    a = int(round(x['words'][0]['start'] * 30)) + 4  # the first word has fully risen in
    b = wins[i][1] - 3  # before the fade-out
    boxes = rows[x['id']]
    for f in range(a, max(a + 1, b)):
        if f >= len(fr):
            continue
        im = fr[f].astype(np.float32) / 255
        lin = np.where(im <= 0.04045, im / 12.92, ((im + 0.055) / 1.055) ** 2.4) @ np.array([0.2126, 0.7152, 0.0722])
        vals = []
        for bx in boxes:
            x0, x1 = int(max(0, bx['x'] - 16)), int(min(1080, bx['x'] + bx['w'] + 16))
            y0, y1 = int(bx['y'] - 1060), int(bx['y'] + bx['h'] - 1060)
            reg = lin[max(0, y0):min(220, y1), x0:x1]
            glyphs = binary_dilation(reg > 0.5, iterations=4)  # the letters and their anti-aliased edges
            vals.append(reg[~glyphs])
        px = np.concatenate(vals)
        if not px.size:
            continue
        bg = float(np.percentile(px, 95))
        cr = (EYE + 0.05) / (bg + 0.05)
        out.append((f, x['id'], round(cr, 2)))
        if cr < worst[2]:
            worst = (f, x['id'], round(cr, 2))
under = [o for o in out if o[2] < 4.5]
print(json.dumps({'worst': worst, 'under': under, 'frames': len(out)}))
