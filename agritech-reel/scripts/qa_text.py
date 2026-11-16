"""Text checks from the text-only renders (out/qa/textonly: only the text, on mid-grey, no pictures or drawings).

- Safe box: any text pixel outside x 65-1015, y 269-1248, in any frame of any beat.
- Contrast: the frame is cut into 60x40 tiles. For each tile that holds steady text (the same amount of text 3 frames
  before and after, so words fading in don't count), the text's luminance in the final render is compared with the
  brightest 10% (light text) or darkest 10% (dark text) of the picture around it, as a WCAG contrast ratio.
  "Steady" is judged on the text's strength in the text-only render (how far each pixel is from the grey), not on
  its pixel count, so a word halfway through its fade-in is not measured as if it were finished.
  Captions must reach 4.5:1. Everything else is large text by WCAG's definition (24 px and up), so 3:1.
- Busiest frame per beat: the steady frame with the most text, used for the stills.
- Hook: text on the very first frame of each hook.
Writes out/qa/text.json.  Run with:  python3 -I scripts/qa_text.py
"""
import json, pathlib, subprocess
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
TL = json.loads((ROOT / 'src/timeline.json').read_text())
W, H = 1080, 1920
X0, X1, Y0, Y1 = 65, 1015, 269, 1248
TW, TH = 60, 40
NX, NY = W // TW, H // TH
GREY, THRESH, TOL = 128, 24, 2


def frames(path):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    n = W * H * 3
    while True:
        b = p.stdout.read(n)
        if len(b) < n:
            break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)
    p.wait()


def rel_lum(rgb):
    c = rgb.astype(np.float32) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]


def dilate(m, r=2):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dy or dx:
                out[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] |= m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
    return out


def band(ty, tx):
    y, x = ty * TH + TH / 2, tx * TW + TW / 2
    if y < 330 and x < 300:
        return 'mark'
    if 1090 <= y <= 1250:
        return 'caption'
    if 1040 <= y < 1090:
        return 'source'
    if 930 <= y < 1040:
        return 'label'
    return 'display'


inside = np.zeros((H, W), bool)
inside[Y0 - TOL:Y1 + TOL, X0 - TOL:X1 + TOL] = True
res = {'safe_box': {}, 'contrast': {}, 'busiest': {}, 'hook_text_frame0': {}}
for lang in ('en', 'az'):
    for lid in TL['lines'][lang]:
        key = f'{lang}-{lid}'
        counts, strength, meas, outside = [], [], [], []
        for k, (T, F) in enumerate(zip(frames(ROOT / f'out/qa/textonly/{key}.mp4'), frames(ROOT / f'out/beats/{key}.mp4'))):
            dev = np.abs(T.astype(np.int16) - GREY).max(axis=2)
            m = dev > THRESH
            out = m & ~inside
            if out.any():
                ys, xs = np.nonzero(out)
                outside.append({'frame': k, 'pixels': int(out.sum()), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]})
            if k == 0 and lid.startswith('H'):
                res['hook_text_frame0'][key] = int(m.sum())
            tc = m.reshape(NY, TH, NX, TW).sum(axis=(1, 3))
            counts.append(tc)
            strength.append((dev * m).reshape(NY, TH, NX, TW).sum(axis=(1, 3)).astype(np.float64))
            if k % 2:  # contrast on every other frame
                continue
            L = rel_lum(F)
            near = dilate(m)
            for ty, tx in zip(*np.nonzero(tc >= 30)):
                ys, xs = slice(ty * TH, (ty + 1) * TH), slice(tx * TW, (tx + 1) * TW)
                tl, bl = L[ys, xs][m[ys, xs]], L[ys, xs][~near[ys, xs]]
                if len(bl) < 200:  # tile almost all text: widen to the tiles around it
                    ys2, xs2 = slice(max(0, ty * TH - TH), min(H, (ty + 2) * TH)), slice(max(0, tx * TW - TW), min(W, (tx + 2) * TW))
                    bl = L[ys2, xs2][~near[ys2, xs2]]
                    if len(bl) < 200:
                        continue
                light = np.median(tl) > np.median(bl)
                t_l = float(np.percentile(tl, 95 if light else 5))
                b_l = float(np.percentile(bl, 90 if light else 10))
                hi, lo = max(t_l, b_l), min(t_l, b_l)
                meas.append((k, int(ty), int(tx), round((hi + 0.05) / (lo + 0.05), 2), 'light' if light else 'dark'))
        C = np.array(counts)
        S = np.array(strength)
        steady = lambda k, ty, tx: all(0 <= j < len(S) and abs(S[j, ty, tx] - S[k, ty, tx]) <= max(400.0, 0.04 * S[k, ty, tx]) for j in (k - 3, k + 3))
        by_band = {}
        for k, ty, tx, cr, kind in meas:
            if steady(k, ty, tx):
                by_band.setdefault(band(ty, tx), []).append((cr, k, ty, tx, kind))
        summary = {}
        for b, v in by_band.items():
            arr = np.array([x[0] for x in v])
            worst = min(v)
            need = 4.5 if b == 'caption' else 3.0
            summary[b] = {'tiles': len(v), 'min': float(arr.min()), 'p05': round(float(np.percentile(arr, 5)), 2), 'median': round(float(np.median(arr)), 2),
                          'need': need, 'below_need_share': round(float((arr < need).mean()), 4),
                          'worst_at': {'frame': worst[1], 'x': worst[3] * TW, 'y': worst[2] * TH, 'text': worst[4]}}
        res['contrast'][key] = summary
        res['safe_box'][key] = {'frames_outside': len(outside), 'examples': outside[:3]}
        tot = C.sum(axis=(1, 2))
        ok = [k for k in range(3, len(C) - 3) if np.abs(C[k - 3] - C[k]).sum() + np.abs(C[k + 3] - C[k]).sum() < 0.04 * max(1, tot[k])]
        res['busiest'][key] = int(max(ok, key=lambda k: tot[k])) if ok else int(np.argmax(tot))
        print(key, 'outside', len(outside), {b: (s['min'], s['p05'], s['below_need_share']) for b, s in summary.items()}, 'busiest', res['busiest'][key], flush=True)

(ROOT / 'out/qa/text.json').write_text(json.dumps(res, indent=1))
