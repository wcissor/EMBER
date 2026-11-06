"""Geometry helpers: float-precision fit-to-1080x1920 with proper Lanczos filtering.

PIL's resize(box=...) takes a fractional source rectangle and widens the Lanczos
kernel when downscaling, so crops/zooms are sub-pixel accurate and alias-free.
Images are float32 RGB in [0,1].
"""
import cv2
import numpy as np
from PIL import Image

W, H = 1080, 1920


def read_rgb(p):
    a = cv2.imread(str(p), cv2.IMREAD_UNCHANGED)
    if a is None:
        raise FileNotFoundError(p)
    a = a[..., ::-1]
    return a.astype(np.float32) / (65535.0 if a.dtype == np.uint16 else 255.0)


def write_rgb16(p, rgb):
    cv2.imwrite(str(p), (np.clip(rgb, 0, 1)[..., ::-1] * 65535.0 + 0.5).astype(np.uint16))


def write_rgb8(p, rgb):
    cv2.imwrite(str(p), (np.clip(rgb, 0, 1)[..., ::-1] * 255.0 + 0.5).astype(np.uint8))


def fit_box(w, h, out_w=W, out_h=H, zoom=1.0):
    s = max(out_w / w, out_h / h) * zoom
    bw, bh = out_w / s, out_h / s
    x0, y0 = (w - bw) / 2.0, (h - bh) / 2.0
    return (x0, y0, x0 + bw, y0 + bh)


def fit(rgb, out_w=W, out_h=H, zoom=1.0):
    h, w = rgb.shape[:2]
    box = fit_box(w, h, out_w, out_h, zoom)
    ch = [np.asarray(Image.fromarray(np.ascontiguousarray(rgb[..., c])).resize((out_w, out_h), Image.LANCZOS, box=box))
          for c in range(3)]
    return np.clip(np.stack(ch, -1), 0.0, 1.0)


def luma709(rgb):
    return rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722


def unsharp_luma(rgb, amount=0.5):
    """Same as ffmpeg unsharp=5:5:<amount>:5:5:0 (5x5 binomial blur, luma only).

    Adding an equal delta to R, G and B changes Y only (Cb/Cr unchanged)."""
    y = luma709(rgb)
    k = np.array([1, 4, 6, 4, 1], np.float32) / 16.0
    blur = cv2.sepFilter2D(y, -1, k, k, borderType=cv2.BORDER_REPLICATE)
    return np.clip(rgb + (amount * (y - blur))[..., None], 0.0, 1.0)
