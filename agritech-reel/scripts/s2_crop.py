"""Cut a true-colour window out of a Sentinel-2 L2A TCI COG (10 m) without downloading the whole tile.
Usage: .venv/bin/python scripts/s2_crop.py <stac.json> <scene id> <lon> <lat> <size_km> <out.ppm>
Writes a binary PPM (convert with ffmpeg). Imagery: Contains modified Copernicus Sentinel data."""
import json, os, sys
import numpy as np
os.environ.setdefault('CURL_CA_BUNDLE', '/root/.ccr/ca-bundle.crt')
os.environ.setdefault('GDAL_DISABLE_READDIR_ON_OPEN', 'EMPTY_DIR')
import rasterio
from rasterio.warp import transform
from rasterio.windows import Window

stac, sid, lon, lat, km, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
f = next(x for x in json.load(open(stac))['features'] if x['id'] == sid)
href = f['assets']['visual']['href']
with rasterio.open('/vsicurl/' + href) as src:
    xs, ys = transform('EPSG:4326', src.crs, [lon], [lat])
    r, c = src.index(xs[0], ys[0])
    n = int(km * 1000 / src.res[0])
    win = Window(c - n // 2, r - n // 2, n, n)
    a = src.read([1, 2, 3], window=win, boundless=True, fill_value=0)
rgb = np.ascontiguousarray(np.transpose(a, (1, 2, 0)).astype(np.uint8))
with open(out, 'wb') as fh:
    fh.write(b'P6\n%d %d\n255\n' % (rgb.shape[1], rgb.shape[0]))
    fh.write(rgb.tobytes())
print(sid, href, src.crs, 'window', win, 'size', rgb.shape, 'mean', rgb.mean(axis=(0, 1)).round(1))
