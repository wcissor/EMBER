"""Shared constants and helpers for the XO "One Breath" scripts.

Everything here is in *canvas pixels* of the 1518 x 1036 logo canvas
(section 4 of the brief), unless a name says otherwise.
"""
from __future__ import annotations

import json
import math
import os
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
LAYERS = PUBLIC / "layers"
GEOMETRY = json.loads((ROOT / "src" / "geometry.json").read_text())

CANVAS_W, CANVAS_H = GEOMETRY["canvas"]

# Section 4 (from src/geometry.json, shared with the Remotion code) ----------
INK_BBOX = tuple(GEOMETRY["inkBBox"])                 # x0, y0, x1, y1
OPTICAL_CENTRE = tuple(float(v) for v in GEOMETRY["opticalCentre"])
_S = GEOMETRY["strokes"]
X1 = (tuple(_S["x1"]["from"]), tuple(_S["x1"]["to"]))  # drawn first, TL -> BR
X2 = (tuple(_S["x2"]["from"]), tuple(_S["x2"]["to"]))  # drawn second, BL -> TR (lift)
O_CENTRE = tuple(float(v) for v in _S["o"]["centre"])
O_RADIUS = float(_S["o"]["radius"])
O_START = tuple(_S["o"]["start"])                      # ~8 o'clock, runs clockwise on screen
O_START_DEG = math.degrees(math.atan2(O_START[1] - O_CENTRE[1], O_START[0] - O_CENTRE[0]))
MASK_WIDTH = {k: float(v["maskWidth"]) for k, v in _S.items()}
START_PAD = {k: float(v.get("startPad", 0.0)) for k, v in _S.items()}
X1_WITHIN = float(GEOMETRY["layerRule"]["x1Within"])

# Colours
GROUND = (0x33, 0x33, 0x33)
GOFUN = (0xE6, 0xDC, 0xD1)                 # logo cream, RGB of every layer pixel
SHADOW = (0x26, 0x26, 0x26)
WARM = (0xF1, 0xE2, 0xC6)

LOGO_PATH = PUBLIC / "xo-logo.png"
STANDIN_PATH = PUBLIC / "xo-logo.standin.png"
STANDIN_KEY = "XO-StandIn"


def resolve_logo() -> tuple[Path, bool]:
    """Return (path, is_standin). Real logo wins whenever it exists."""
    override = os.environ.get("XO_LOGO")
    if override:
        return Path(override), False
    if LOGO_PATH.exists():
        return LOGO_PATH, False
    return STANDIN_PATH, True


# Geometry -------------------------------------------------------------------
def seg_distance(px: np.ndarray, py: np.ndarray, a, b) -> np.ndarray:
    """Distance from points to segment a-b."""
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / L2, 0.0, 1.0)
    qx = ax + t * dx
    qy = ay + t * dy
    return np.hypot(px - qx, py - qy)


def seg_coords(px, py, a, b):
    """(along, across) coordinates of points relative to the line a->b."""
    ax, ay = a
    bx, by = b
    L = math.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / L, (by - ay) / L
    s = (px - ax) * ux + (py - ay) * uy
    u = -(px - ax) * uy + (py - ay) * ux
    return s, u, L


def circle_distance(px, py, c=O_CENTRE, r=O_RADIUS) -> np.ndarray:
    return np.abs(np.hypot(px - c[0], py - c[1]) - r)


def pixel_grid(w=CANVAS_W, h=CANVAS_H, ss=1):
    """Pixel-centre coordinates in canvas px for a (h*ss, w*ss) raster."""
    ys, xs = np.mgrid[0 : h * ss, 0 : w * ss].astype(np.float32)
    return (xs + 0.5) / ss, (ys + 0.5) / ss


# Image helpers ---------------------------------------------------------------
def gaussian_blur(img: np.ndarray, sigma: float, wrap: bool = False) -> np.ndarray:
    """Exact Gaussian blur via FFT. `img` is 2-D float. Edges are reflected
    unless `wrap` (tileable textures)."""
    if sigma <= 0:
        return img.astype(np.float32)
    a = img.astype(np.float64)
    pad = 0 if wrap else int(math.ceil(3.5 * sigma))
    if pad:
        a = np.pad(a, pad, mode="reflect")
    h, w = a.shape
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    k = np.exp(-2.0 * (math.pi ** 2) * (sigma ** 2) * (fx * fx + fy * fy))
    out = np.fft.irfft2(np.fft.rfft2(a) * k, s=a.shape)
    if pad:
        out = out[pad:-pad, pad:-pad]
    return out.astype(np.float32)


def downsample(img: np.ndarray, ss: int) -> np.ndarray:
    if ss == 1:
        return img
    h, w = img.shape[0] // ss, img.shape[1] // ss
    return img[: h * ss, : w * ss].reshape(h, ss, w, ss, *img.shape[2:]).mean(axis=(1, 3))


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def value_noise_2d(s, v, cell_s, cell_v, rng, offset=(0.0, 0.0)):
    """Smooth value noise sampled at arbitrary (s, v); anisotropic cells.
    Returns values in [0, 1]."""
    s = (s - offset[0]) / cell_s
    v = (v - offset[1]) / cell_v
    s0 = np.floor(s)
    v0 = np.floor(v)
    smin, vmin = int(s0.min()) - 1, int(v0.min()) - 1
    ns = int(s0.max()) - smin + 3
    nv = int(v0.max()) - vmin + 3
    grid = rng.random((ns, nv)).astype(np.float32)
    i = (s0 - smin).astype(np.int64)
    j = (v0 - vmin).astype(np.int64)
    fs = s - s0
    fv = v - v0
    fs = fs * fs * (3 - 2 * fs)
    fv = fv * fv * (3 - 2 * fv)
    g00 = grid[i, j]
    g10 = grid[i + 1, j]
    g01 = grid[i, j + 1]
    g11 = grid[i + 1, j + 1]
    return (g00 * (1 - fs) + g10 * fs) * (1 - fv) + (g01 * (1 - fs) + g11 * fs) * fv


def load_rgb(path: Path) -> np.ndarray:
    from PIL import Image

    return np.asarray(Image.open(path).convert("RGB")).astype(np.float32)


def luma709(rgb: np.ndarray) -> np.ndarray:
    return rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722


def banner(msg: str) -> str:
    line = "!" * (len(msg) + 8)
    return f"\n{line}\n!!  {msg}  !!\n{line}\n"
