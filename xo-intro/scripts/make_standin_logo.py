"""Synthesize a geometry-matched STAND-IN for public/xo-logo.png.

The real XO logo was not supplied with the brief. This script paints a
sumi-e style X + ensō on the exact section-4 geometry (same 1518 x 1036
canvas, same centrelines, widths and ink bounding box) so the whole
pipeline can be built, timed and QA'd. It is written to
public/xo-logo.standin.png and tagged with a PNG text chunk; prep.py uses
it only when public/xo-logo.png is missing, and says so loudly.

Drop the real logo at public/xo-logo.png and re-run `npm run build`.
"""
from __future__ import annotations

import math

import numpy as np
from PIL import Image, PngImagePlugin

from xo_common import (
    CANVAS_H,
    CANVAS_W,
    GOFUN,
    GROUND,
    O_CENTRE,
    O_START_DEG,
    STANDIN_KEY,
    STANDIN_PATH,
    X1,
    X2,
    downsample,
    pixel_grid,
    seg_coords,
    smoothstep,
    value_noise_2d,
)

SS = 3  # supersampling for clean anti-aliased edges
rng = np.random.default_rng(1518_1036)


def interp(x, xp, fp):
    return np.interp(x, xp, fp).astype(np.float32)


def streaks(s, v_px, seed, cell_s=24.0, cell_v=2.0):
    """Bristle streak noise: long along the stroke, fine across it."""
    r = np.random.default_rng(seed)
    n1 = value_noise_2d(s, v_px, cell_s, cell_v, r)
    n2 = value_noise_2d(s, v_px, cell_s * 0.45, cell_v * 0.55, r)
    n3 = value_noise_2d(s, v_px, cell_s * 3.0, cell_v * 4.0, r)
    return 0.5 * n1 + 0.25 * n2 + 0.25 * n3


def coverage_from_sd(sd):
    """Signed distance (canvas px, <0 inside) -> AA coverage at SS raster."""
    return np.clip(0.5 - sd * SS, 0.0, 1.0)


def edge_offset(s, u, hw_ref, seed):
    """Organic edge: fine tooth + slow wobble, continuous across the stroke."""
    r = np.random.default_rng(seed)
    fine = value_noise_2d(s, u, 7.0, hw_ref * 0.9, r) - 0.5
    slow = value_noise_2d(s, u, 75.0, hw_ref * 1.8, r) - 0.5
    return 0.9 * fine + 2.4 * slow


def body_sd(s, u, s_a, s_b, c_fn, w_fn, cap_a, cap_b, edge):
    """Signed distance to a stroke body with elliptical caps (stroke space)."""
    sc = np.clip(s, s_a, s_b)
    c = c_fn(sc)
    hw = w_fn(sc) * 0.5
    du = u - c
    sd_body = np.abs(du) - hw - edge
    ds_a = np.minimum(s - s_a, 0.0) / np.maximum(cap_a * hw, 1e-3)
    ds_b = np.maximum(s - s_b, 0.0) / np.maximum(cap_b * hw, 1e-3)
    ds = ds_a + ds_b
    e = np.sqrt(ds * ds + (du / np.maximum(hw, 1e-3)) ** 2)
    sd_cap = (e - 1.0) * hw - edge
    return np.where((s < s_a) | (s > s_b), sd_cap, sd_body), du, hw


def kasure(s, du, hw, g, seed, start, amount, edge_amount=0.18, cell_s=40.0, cell_v=1.7):
    """Dry-brush streaks: appear after `start` (0..1 along the stroke)."""
    n = streaks(s, du, seed, cell_s=cell_s, cell_v=cell_v)
    v = np.abs(du) / np.maximum(hw, 1e-3)
    dry = -0.9 + amount * smoothstep(start, 1.0, g) + edge_amount * smoothstep(0.8, 1.0, v) * smoothstep(start * 0.8, 1.0, g)
    return smoothstep(dry - 0.035, dry + 0.035, n)


def paint_x1(px, py):
    s, u, L = seg_coords(px, py, *X1)
    s_a, s_b = 40.0, 556.0
    t_of = lambda q: (q - s_a) / (s_b - s_a)
    c_fn = lambda q: 3.0 * np.sin(math.pi * t_of(q))
    w_fn = lambda q: 55.0 + (37.0 - 55.0) * t_of(q) + 4.0 * np.exp(-(((q - 56.0) / 26.0) ** 2))
    edge = edge_offset(s, u, 28.0, 101)
    sd, du, hw = body_sd(s, u, s_a, s_b, c_fn, w_fn, 0.85, 0.62, edge)
    cov = coverage_from_sd(sd)
    g = np.clip(t_of(s), 0.0, 1.0)
    tex = kasure(s, du, hw, g, 11, 0.55, 0.98)
    return cov * tex


def paint_x2(px, py):
    s, u, L = seg_coords(px, py, *X2)
    s_a, s_tip = 70.0, 631.0
    s_t = 420.0  # taper (quick lift) starts here
    tau = lambda q: np.clip((q - s_t) / (s_tip - s_t), 0.0, 1.0)
    c_fn = lambda q: 7.2 * tau(q) ** 1.6
    w_fn = lambda q: np.where(
        q < s_t,
        interp(q, [s_a, 140.0, s_t], [48.0, 45.0, 42.0]) + 4.0 * np.exp(-(((q - 84.0) / 24.0) ** 2)),
        2.2 + 39.8 * (1.0 - tau(q)) ** 1.5,
    )
    hw_ref = 22.0
    edge = edge_offset(s, u, hw_ref, 202) * (1.0 - 0.75 * tau(np.clip(s, s_a, s_tip)))
    sd, du, hw = body_sd(s, u, s_a, s_tip, c_fn, w_fn, 0.85, 1.8, edge)
    cov = coverage_from_sd(sd)
    g = np.clip((s - s_a) / (s_tip - s_a), 0.0, 1.0)
    tex = kasure(s, du, hw, g, 23, 0.45, 1.18, edge_amount=0.28, cell_s=55.0, cell_v=1.5)
    # the hairline tip stays continuous: a fine, fast lift
    tex = np.maximum(tex, smoothstep(0.88, 0.97, g) * 0.95)
    return cov * tex


def paint_o(px, py):
    cx, cy = O_CENTRE
    dx, dy = px - cx, py - cy
    rho = np.hypot(dx, dy)
    ang = np.degrees(np.arctan2(dy, dx))
    phi = np.mod(ang - O_START_DEG, 360.0)  # 0 at ~8 o'clock, increasing clockwise
    phi = np.where(phi > 350.0, phi - 360.0, phi)  # just behind the start = start cap
    r_fn = lambda p: 167.0 + 2.2 * np.sin(np.radians(p) + 0.8) + 1.3 * np.sin(2 * np.radians(p) + 2.0)
    w_fn = lambda p: interp(p, [0, 18, 80, 150, 222, 280, 315, 340], [64, 62, 54, 51, 56, 58, 58, 54])
    s = 167.0 * np.radians(phi)
    pc = np.clip(phi, 0.0, 340.0)
    u = rho - r_fn(pc)
    hw = w_fn(pc) * 0.5
    edge = edge_offset(s, u, 30.0, 303)
    sd_body = np.abs(u) - hw - edge
    ds = np.minimum(s, 0.0) / (0.55 * hw)          # rounded press at 8 o'clock
    e = np.sqrt(ds * ds + (u / hw) ** 2)
    sd = np.where(s < 0.0, (e - 1.0) * hw - edge, sd_body)
    cov = coverage_from_sd(sd)
    g = np.clip(phi / 338.0, 0.0, 1.0)
    # dry brush builds over the last third; bristles thin out and split
    n = streaks(s, u, 37, cell_s=60.0, cell_v=1.6)
    v = np.abs(u) / hw
    dry = -0.9 + 1.32 * smoothstep(0.62, 1.0, g) + 0.3 * smoothstep(0.75, 1.0, v) * smoothstep(0.5, 1.0, g)
    # each bristle (smooth noise across u, ~2.5 px) runs dry at its own angle
    b = value_noise_2d(np.zeros_like(u), u, 1.0, 2.4, np.random.default_rng(41))
    b2 = value_noise_2d(np.zeros_like(u), u, 1.0, 7.0, np.random.default_rng(43))
    lane_end = 309.0 + 30.0 * np.clip(0.7 * b + 0.3 * b2, 0.0, 1.0) ** 0.8
    fade = smoothstep(lane_end - 9.0, lane_end, phi)   # 0 -> 1 as a bristle runs out
    thr = dry + 1.05 * fade
    tex = smoothstep(thr - 0.035, thr + 0.035, n)
    tail = 1.0 - smoothstep(lane_end - 0.6, lane_end, phi)
    return cov * tex * tail


def main():
    px, py = pixel_grid(ss=SS)
    ink = np.zeros_like(px)
    for name, fn in (("x1", paint_x1), ("x2", paint_x2), ("o", paint_o)):
        a = fn(px, py).astype(np.float32)
        ink = 1.0 - (1.0 - ink) * (1.0 - a)
        print(f"  painted {name}")
    ink = downsample(ink, SS)
    bg = np.array(GROUND, np.float32)
    cream = np.array(GOFUN, np.float32)
    rgb = bg[None, None, :] + ink[..., None] * (cream - bg)[None, None, :]
    out = np.clip(np.round(rgb), 0, 255).astype(np.uint8)
    meta = PngImagePlugin.PngInfo()
    meta.add_text(STANDIN_KEY, "1")
    meta.add_text("Description", "Geometry-matched stand-in for the XO logo. Replace with public/xo-logo.png.")
    STANDIN_PATH.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, "RGB").save(STANDIN_PATH, pnginfo=meta, optimize=True)
    ys, xs = np.nonzero(ink > 0.02)
    print(f"wrote {STANDIN_PATH.relative_to(STANDIN_PATH.parents[1])}  ink bbox x {xs.min()}-{xs.max()}  y {ys.min()}-{ys.max()}")


if __name__ == "__main__":
    main()
