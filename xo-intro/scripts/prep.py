"""XO "One Breath" — asset prep (brief section 3). Pillow + NumPy only.

Outputs (stroke layers share the 1518 x 1036 logo canvas, so the section-4
coordinates stay valid):

  public/layers/x1.png, x2.png, o.png  stroke layers: RGB #E6DCD1, alpha = ink
  public/layers/full.png               all ink (light-pass mask, QA reference)
  public/layers/debug.png              layers tinted R / G / B + centrelines
  public/layers/meta.json              logo source, alpha calibration, coverage
  public/washi.png                     2400 x 2400 charcoal washi paper
  public/komorebi.png                  2400 x 2400 soft leaf shadows (black + alpha)

Usage:  python3 scripts/prep.py [--only layers|washi|komorebi] [--brief-hi]
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import time

import numpy as np
from PIL import Image, ImageDraw

from xo_common import (
    CANVAS_H,
    CANVAS_W,
    GOFUN,
    INK_BBOX,
    LAYERS,
    MASK_WIDTH,
    O_CENTRE,
    O_RADIUS,
    PUBLIC,
    STANDIN_KEY,
    START_PAD,
    X1,
    X1_WITHIN,
    X2,
    banner,
    circle_distance,
    downsample,
    gaussian_blur,
    load_rgb,
    luma709,
    pixel_grid,
    resolve_logo,
    seg_coords,
    seg_distance,
)

ALPHA_LO = 53.0
ALPHA_HI_BRIEF = 230.0
ALPHA_FLOOR = 0.015
EDGE_MARGIN = 12.0  # brush-edge filter reach (displacement 5 + blur ~2.3 sigma)


# --------------------------------------------------------------------------
# 1 + 2. alpha and stroke layers
# --------------------------------------------------------------------------
def extract_alpha(rgb: np.ndarray, brief_hi: bool) -> tuple[np.ndarray, dict]:
    y = luma709(rgb)
    ink = y[y > 150.0]
    measured = float(np.median(ink)) if ink.size > 2000 else float(luma709(np.array(GOFUN, np.float32)))
    hi = ALPHA_HI_BRIEF if brief_hi else measured
    a = np.clip((y - ALPHA_LO) / (hi - ALPHA_LO), 0.0, 1.0)
    a[a < ALPHA_FLOOR] = 0.0
    full_ink = a[y > hi - 2.0]
    info = {
        "formula": "a = clamp((luma709 - 53) / (hi - 53), 0, 1); a = 0 where a < 0.015",
        "hi": round(hi, 2),
        "hi_source": "brief (230)" if brief_hi else "measured cream luma (median of ink pixels)",
        "measured_cream_luma": round(measured, 2),
        "alpha_of_full_ink": round(float(full_ink.mean()) if full_ink.size else 1.0, 4),
        "alpha_if_hi_were_230": round((measured - ALPHA_LO) / (ALPHA_HI_BRIEF - ALPHA_LO), 4),
    }
    return a.astype(np.float32), info


def x1_claim_band(a, px, py, d2, do, margin=0.5, bin_px=4.0):
    """X1's own half-width along its line, per side: the mean edge (ink area
    per bin), measured away from the crossing and bridged across it. Capped
    at the brief's 36 px. Returns per-pixel claim distance (or None)."""
    s, u, L = seg_coords(px, py, *X1)
    d1 = seg_distance(px, py, *X1)
    near = (d1 <= X1_WITHIN) & (do > d1)
    crossing = near & (d2 <= X1_WITHIN + 8.0)
    nb = int(math.ceil(L / bin_px)) + 1
    centres = (np.arange(nb) + 0.5) * bin_px
    sc = np.clip(s, 0.0, L - 1e-3)
    bins = (sc // bin_px).astype(np.int64)
    hit = np.zeros(nb, bool)
    hit[np.unique(bins[crossing])] = True
    hit = np.convolve(hit, np.ones(3), mode="same") > 0          # one bin of slack each way
    band = np.full(a.shape, X1_WITHIN, np.float32)
    report = {}
    for name, side in (("left", u < 0), ("right", u >= 0)):
        sel = near & side & ~crossing & (s >= 0) & (s <= L)
        area = np.bincount(bins[sel], weights=a[sel], minlength=nb)[:nb]
        prof = area / bin_px                                       # mean half-width
        ok = (prof > 4.0) & ~hit
        if ok.sum() < 8:
            return None, {"note": "X1 profile not measurable; using the brief's 36 px"}
        prof = np.interp(centres, centres[ok], prof[ok])           # bridge the crossing
        win = np.lib.stride_tricks.sliding_window_view(np.pad(prof, 2, mode="edge"), 5)
        prof = np.median(win, axis=1)
        claim = np.minimum(prof + margin, X1_WITHIN)
        band[side] = claim[bins[side]]
        report[name] = round(float(claim[hit].mean()) if hit.any() else float(claim.mean()), 1)
    return band, report


def assign_strokes(a: np.ndarray, literal: bool) -> tuple[dict[str, np.ndarray], dict]:
    px, py = pixel_grid()
    d1 = seg_distance(px, py, *X1)
    d2 = seg_distance(px, py, *X2)
    do = circle_distance(px, py, O_CENTRE, O_RADIUS)
    band, info = (None, {"note": "brief rule: 36 px"}) if literal else x1_claim_band(a, px, py, d2, do)
    is_o = ((do < d1) & (do < d2)).astype(np.float32)          # nearer the O circle than both X lines
    if band is None:
        claim = (d1 <= X1_WITHIN).astype(np.float32)
        info.setdefault("mode", "literal")
    else:
        # anti-aliased split at X1's own edge where it runs through X2's ink;
        # the layers still sum to the exact alpha
        claim = np.clip((band + 0.75 - d1) / 1.5, 0.0, 1.0)
        info["mode"] = "X1 mean edge + 0.5 px (<= 36 px), measured per side"
    w1 = np.maximum(claim, (d1 < d2).astype(np.float32))       # crossing belongs to X1 (drawn first)
    x1 = a * (1 - is_o) * w1
    o = a * is_o
    return {"x1": x1, "x2": a - x1 - o, "o": o}, info           # X2 gets the rest


def save_layer(alpha: np.ndarray, path):
    out = np.empty((CANVAS_H, CANVAS_W, 4), np.uint8)
    out[..., :3] = GOFUN                                      # RGB is always #E6DCD1
    out[..., 3] = np.round(np.clip(alpha, 0, 1) * 255.0).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(path, optimize=True)


def save_debug(layers: dict[str, np.ndarray], path):
    bg = np.array([22, 22, 22], np.float32)
    tint = {"x1": (235, 72, 60), "x2": (78, 205, 96), "o": (72, 122, 240)}
    img = np.broadcast_to(bg, (CANVAS_H, CANVAS_W, 3)).copy()
    for k, a in layers.items():
        img = img * (1 - a[..., None]) + np.array(tint[k], np.float32) * a[..., None]
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB")
    d = ImageDraw.Draw(im)
    grey = (120, 120, 120)

    def offset_line(a, b, off, fill, width=1):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        nx, ny = -(b[1] - a[1]) / L, (b[0] - a[0]) / L
        d.line([(a[0] + nx * off, a[1] + ny * off), (b[0] + nx * off, b[1] + ny * off)], fill=fill, width=width)

    for key, (a, b) in (("x1", X1), ("x2", X2)):
        offset_line(a, b, 0, (255, 255, 255))
        for s in (-1, 1):
            offset_line(a, b, s * MASK_WIDTH[key] / 2, grey)
    for s in (-1, 1):
        offset_line(*X1, s * X1_WITHIN, (150, 60, 50))           # X1 36 px claim band
    cx, cy = O_CENTRE
    for r, col in ((O_RADIUS, (255, 255, 255)), (O_RADIUS - MASK_WIDTH["o"] / 2, grey), (O_RADIUS + MASK_WIDTH["o"] / 2, grey)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=col)
    x0, y0, x1, y1 = INK_BBOX
    d.rectangle([x0, y0, x1, y1], outline=(90, 90, 90))
    d.text((12, 10), "X1 red (first)  X2 green  O blue.  white = centrelines, grey = mask stroke edges, dark red = X1 36 px band", fill=(200, 200, 200))
    im.save(path, optimize=True)


def coverage_report(layers: dict[str, np.ndarray]) -> dict:
    """How much ink each stroke mask reaches at progress 1 (before settle)."""
    px, py = pixel_grid()
    out = {}
    for key, a in layers.items():
        total = float(a.sum())
        w2 = MASK_WIDTH[key] / 2
        if key == "o":
            dist = circle_distance(px, py, O_CENTRE, O_RADIUS)
            inside = dist <= w2
            safe = dist <= w2 - EDGE_MARGIN
            behind = np.zeros_like(inside)
            across = dist
        else:
            s, u, L = seg_coords(px, py, *(X1 if key == "x1" else X2))
            pad = START_PAD[key]
            inside = (s >= -pad) & (s <= L) & (np.abs(u) <= w2)
            safe = (s >= -pad + EDGE_MARGIN) & (s <= L - EDGE_MARGIN) & (np.abs(u) <= w2 - EDGE_MARGIN)
            behind = (s < 0) & (a > 0)
            across = np.abs(u)
        ink = a > 0
        out[key] = {
            "ink_px": int(ink.sum()),
            "ink_outside_mask_pct": round(100 * float(a[~inside].sum()) / max(total, 1e-6), 4),
            "ink_outside_safe_zone_pct": round(100 * float(a[~safe].sum()) / max(total, 1e-6), 4),
            "max_ink_offset_px": round(float(across[ink].max()) if ink.any() else 0.0, 1),
            "ink_behind_path_start_px": int(behind.sum()),
        }
    return out


def build_layers(brief_hi: bool, literal_band: bool) -> dict:
    logo_path, standin = resolve_logo()
    if not logo_path.exists():
        sys.exit(f"logo not found: {logo_path}. Put the real logo at public/xo-logo.png "
                 "(or run scripts/make_standin_logo.py for the stand-in).")
    im = Image.open(logo_path)
    if STANDIN_KEY in getattr(im, "text", {}):
        standin = True
    if standin:
        print(banner("USING THE STAND-IN LOGO — put the real file at public/xo-logo.png"))
    rgb = load_rgb(logo_path)
    if rgb.shape[:2] != (CANVAS_H, CANVAS_W):
        sys.exit(f"{logo_path} is {rgb.shape[1]}x{rgb.shape[0]}; the brief's geometry needs {CANVAS_W}x{CANVAS_H}.")

    a, alpha_info = extract_alpha(rgb, brief_hi)
    print(f"alpha: hi = {alpha_info['hi']} ({alpha_info['hi_source']}); "
          f"full ink -> a = {alpha_info['alpha_of_full_ink']}  "
          f"(the brief's literal 230 would give {alpha_info['alpha_if_hi_were_230']})")
    layers, band_info = assign_strokes(a, literal_band)
    print(f"layers: X1 crossing claim {band_info}")
    LAYERS.mkdir(parents=True, exist_ok=True)
    for k, la in layers.items():
        save_layer(la, LAYERS / f"{k}.png")
    save_layer(a, LAYERS / "full.png")
    save_debug(layers, LAYERS / "debug.png")

    ys, xs = np.nonzero(a > 0)
    bbox = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    cov = coverage_report(layers)
    meta = {
        "logo": str(logo_path.relative_to(PUBLIC.parent)),
        "standin": bool(standin),
        "alpha": alpha_info,
        "ink_bbox_measured": bbox,
        "ink_bbox_brief": list(INK_BBOX),
        "coverage": cov,
        "x1_claim": band_info,
    }
    (LAYERS / "meta.json").write_text(json.dumps(meta, indent=2))
    print(f"layers: x1/x2/o/full + debug.png written; ink bbox {bbox} (brief {list(INK_BBOX)})")
    for k, c in cov.items():
        flag = "" if c["ink_outside_mask_pct"] < 0.01 else "   <-- ink outside the stroke mask (settle fills it)"
        print(f"  {k:2s}: {c['ink_px']:7d} px  outside mask {c['ink_outside_mask_pct']:.3f}%  "
              f"outside safe zone {c['ink_outside_safe_zone_pct']:.3f}%  max offset {c['max_ink_offset_px']} px  "
              f"behind start {c['ink_behind_path_start_px']} px{flag}")
    return meta


# --------------------------------------------------------------------------
# 3. washi paper
# --------------------------------------------------------------------------
def make_washi(path, n=2400, seed=20261106):
    t0 = time.time()
    rng = np.random.default_rng(seed)
    full = 255.0
    # a #333333 base with +-1.5% low-frequency luminance (noise blurred sigma ~60 px)
    lf = gaussian_blur(rng.standard_normal((n, n)).astype(np.float32), 60.0, wrap=True)
    lf *= (0.015 * full / 2.5) / lf.std()
    lf = np.clip(lf, -0.015 * full, 0.015 * full)

    # ~4,000 kozo fibres: curved, 20-90 px long, 0.6-1 px wide, 2-3% lighter
    ss = 4
    canvas = Image.new("L", (n * ss, n * ss), 0)
    d = ImageDraw.Draw(canvas)
    count = 4000
    for _ in range(count):
        length = 20.0 + 70.0 * rng.random() ** 1.4
        ang = rng.random() * math.pi
        x0, y0 = rng.random() * n, rng.random() * n
        dx, dy = math.cos(ang) * length, math.sin(ang) * length
        bend = rng.normal() * 0.22 * length
        cx, cy = x0 + dx / 2 - math.sin(ang) * bend, y0 + dy / 2 + math.cos(ang) * bend
        pts = []
        for t in np.linspace(0.0, 1.0, 14):
            bx = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * (x0 + dx)
            by = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * (y0 + dy)
            pts.append((bx * ss, by * ss))
        width_px = 0.6 + 0.4 * rng.random()
        lighter = 0.02 + 0.01 * rng.random()                      # 2-3 %
        d.line(pts, fill=int(round(255 * lighter / 0.03)), width=max(1, int(round(width_px * ss))), joint="curve")
    fib = downsample(np.asarray(canvas, dtype=np.float32), ss) / 255.0 * 0.03 * full
    del canvas, d
    fib = gaussian_blur(fib, 0.5, wrap=True)                     # blurred 0.5 px

    # a still fine grain of +-1%
    grain = rng.uniform(-0.01 * full, 0.01 * full, (n, n)).astype(np.float32)
    img = 51.0 + lf + fib + grain
    Image.fromarray(np.clip(np.round(img), 0, 255).astype(np.uint8), "L").save(path, optimize=True)
    print(f"washi: {path.name} {n}x{n}  mean {img.mean():.2f}  lf +-{np.abs(lf).max():.2f}  "
          f"fibres {count}  ({time.time() - t0:.1f}s)")


# --------------------------------------------------------------------------
# 4. komorebi leaf shadows
# --------------------------------------------------------------------------
def maple_leaf(length, rng):
    lobes = 7 if rng.random() < 0.6 else 5
    if lobes == 7:
        ang = np.radians([0, 38, -38, 78, -78, 122, -122])
        lens = np.array([1.0, 0.93, 0.93, 0.74, 0.74, 0.46, 0.46])
    else:
        ang = np.radians([0, 50, -50, 102, -102])
        lens = np.array([1.0, 0.9, 0.9, 0.55, 0.55])
    lens = lens * (1 + 0.08 * rng.standard_normal(lobes))
    ang = ang + np.radians(6) * rng.standard_normal(lobes)
    hw = np.radians(17 + 4 * rng.random())
    th = np.linspace(-math.pi, math.pi, 540, endpoint=False)
    r = np.full_like(th, 0.24)
    for a0, l0 in zip(ang, lens):
        dth = np.angle(np.exp(1j * (th - a0)))
        lobe = l0 * np.clip(1 - np.abs(dth) / hw, 0, 1) ** 0.85
        r = np.maximum(r, lobe)
    r *= 1 + 0.035 * np.sin(th * 46)                                # serration
    R = length * 0.55
    pts = np.stack([np.cos(th) * r * R, np.sin(th) * r * R], 1)
    stem = np.array([[-0.16 * R, -0.02 * R], [-0.62 * R, -0.03 * R], [-0.62 * R, 0.03 * R], [-0.16 * R, 0.02 * R]])
    return [pts, stem]


def bamboo_leaf(length, rng):
    t = np.linspace(0, 1, 90)
    width = length / (3.6 + 1.0 * rng.random())
    hw = width / 2 * np.sin(math.pi * t ** 0.62) ** 0.9
    bend = (0.05 + 0.06 * rng.random()) * length * np.sin(math.pi * t / 2) ** 2 * (1 if rng.random() < 0.5 else -1)
    x = t * length - length * 0.35
    top = np.stack([x, bend + hw], 1)
    bot = np.stack([x, bend - hw], 1)[::-1]
    return [np.concatenate([top, bot])]


def make_komorebi(path, n=2400, seed=7):
    """Leaf shadows of a garden tree: a few branches reach in from the frame
    corners/edges (16:9 and 9:16 framings share this texture; its centre sits
    on the logo's optical centre), leaving the logo clear."""
    t0 = time.time()
    rng = np.random.default_rng(seed)
    c = n / 2
    # Leaf masses at the frame corners/edges, relative to the pivot. 16:9 spans
    # x +-960, y +-540; 9:16 spans x +-540, y -900..1020 (+ push-in/drift).
    clusters = [
        ((-830, -450), "maple", 8),    # 16:9 top-left (canopy is heaviest here)
        ((-430, -840), "maple", 7),    # 9:16 top-left
        ((880, -320), "maple", 7),     # 16:9 right edge, upper
        ((450, -790), "bamboo", 5),    # 9:16 top-right
        ((200, -540), "bamboo", 4),    # 16:9 top edge / 9:16 upper third
        ((840, 450), "maple", 5),      # 16:9 bottom-right
        ((430, 910), "maple", 5),      # 9:16 bottom-right
        ((-920, 300), "bamboo", 4),    # 16:9 left edge, lower
        ((-390, 930), "maple", 4),     # 9:16 bottom-left
        ((-170, 580), "maple", 3),     # 16:9 bottom edge
    ]
    leaves = []
    for (cx_, cy_), kind, count in clusters:
        spray = rng.random() * math.tau          # the twig direction of this mass
        for i in range(count):
            r = abs(rng.normal()) * 95.0
            a = spray + rng.normal() * 1.1
            x = cx_ + math.cos(a) * r + rng.normal() * 25
            y = cy_ + math.sin(a) * r + rng.normal() * 25
            if (x / 430) ** 2 + (y / 290) ** 2 < 1.0:           # keep the logo clear
                continue
            length = float(np.clip((95 + 125 * rng.random() ** 0.8) if kind == "maple" else (130 + 90 * rng.random()), 60, 220))
            rot = spray + rng.normal() * 0.8
            leaves.append((kind, x, y, length, rot))

    def raster(scale, jitter):
        im = Image.new("L", (n, n), 0)
        dr = ImageDraw.Draw(im)
        for kind, x, y, length, rot in leaves:
            lr = np.random.default_rng(int(abs(x) * 31 + abs(y) * 17) & 0xFFFF)
            shapes = maple_leaf(length * scale, lr) if kind == "maple" else bamboo_leaf(length * scale, lr)
            cr, sr = math.cos(rot), math.sin(rot)
            ox, oy = c + x + jitter[0], c + y + jitter[1]
            for pts in shapes:
                q = [(ox + px_ * cr - py_ * sr, oy + px_ * sr + py_ * cr) for px_, py_ in pts]
                dr.polygon(q, fill=255)
        return np.asarray(im, np.float32) / 255.0

    a1 = gaussian_blur(raster(1.0, (0, 0)), 18.0)                    # soft leaf shadows
    a2 = gaussian_blur(raster(1.45, (30, 22)), 48.0)                 # larger, softer copy for depth
    a = 1.0 - (1.0 - a1) * (1.0 - 0.65 * a2)
    a /= np.percentile(a[a > 0.02], 99.5)
    a = np.clip(a, 0.0, 1.0)
    out = np.zeros((n, n, 4), np.uint8)
    out[..., 3] = np.round(a * 255).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(path, optimize=True)
    kinds = [lf[0] for lf in leaves]
    print(f"komorebi: {path.name} {n}x{n}  {len(leaves)} leaves "
          f"({kinds.count('maple')} maple, {kinds.count('bamboo')} bamboo)  ({time.time() - t0:.1f}s)")


def up_to_date() -> bool:
    outs = [LAYERS / f for f in ("x1.png", "x2.png", "o.png", "full.png", "debug.png", "meta.json")]
    outs += [PUBLIC / "washi.png", PUBLIC / "komorebi.png"]
    if not all(p.exists() for p in outs):
        return False
    logo, _ = resolve_logo()
    inputs = [p for p in (logo, PUBLIC.parent / "src" / "geometry.json", __import__("pathlib").Path(__file__)) if p.exists()]
    oldest = min(p.stat().st_mtime for p in outs)
    return all(p.stat().st_mtime <= oldest for p in inputs)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", choices=["layers", "washi", "komorebi"])
    ap.add_argument("--brief-hi", action="store_true", help="use the brief's literal 230 as the alpha upper reference")
    ap.add_argument("--if-needed", action="store_true", help="skip when all outputs exist and are newer than their inputs")
    ap.add_argument("--x1-within-literal", action="store_true",
                    help="X1 claims everything within 36 px of its line (brief), instead of its measured edge + 2 px")
    args = ap.parse_args()
    PUBLIC.mkdir(exist_ok=True)
    if args.if_needed and up_to_date():
        print("prep: outputs are up to date")
        return
    if args.only in (None, "layers"):
        build_layers(args.brief_hi, args.x1_within_literal)
    if args.only in (None, "washi"):
        make_washi(PUBLIC / "washi.png")
    if args.only in (None, "komorebi"):
        make_komorebi(PUBLIC / "komorebi.png")


if __name__ == "__main__":
    main()
