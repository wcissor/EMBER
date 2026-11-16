"""Vertical 1296x2304 true-colour windows (10 m pixels) from Sentinel-2 L2A TCI COGs.
Usage: .venv/bin/python -I scripts/s2_vertical.py <stac.json> <scene id> <lon> <lat> <out.jpg>"""
import json, os, sys, subprocess
import numpy as np
os.environ.setdefault('CURL_CA_BUNDLE', '/root/.ccr/ca-bundle.crt')
os.environ.setdefault('GDAL_DISABLE_READDIR_ON_OPEN', 'EMPTY_DIR')
import rasterio
from rasterio.warp import transform
from rasterio.windows import Window
stac, sid, lon, lat, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
f = next(x for x in json.load(open(stac))['features'] if x['id'] == sid)
with rasterio.open('/vsicurl/' + f['assets']['visual']['href']) as src:
    xs, ys = transform('EPSG:4326', src.crs, [lon], [lat])
    r, c = src.index(xs[0], ys[0])
    W, H = 1296, 2304
    a = src.read([1, 2, 3], window=Window(c - W // 2, r - H // 2, W, H), boundless=True, fill_value=0)
rgb = np.ascontiguousarray(np.transpose(a, (1, 2, 0)).astype(np.uint8))
zero = (rgb.sum(2) == 0).mean()
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-i', '-',
                '-vf', 'eq=gamma=1.12:contrast=1.06:saturation=0.98', '-q:v', '2', out], input=rgb.tobytes(), check=True)
print(sid, out, 'no-data share', round(float(zero), 4), 'mean', rgb.mean(axis=(0, 1)).round(1))
