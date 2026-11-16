"""Map and satellite assets for B5 and B7.

- public/maps/caucasus.jpg: NASA Blue Marble (GIBS) of 36-56E, 33-47N, x scaled by cos(40 deg) so shapes look right.
- public/maps/aze.json: Azerbaijan's outline (Natural Earth, public domain) in caucasus.jpg pixel coordinates.
- public/sat/globe.mp4 (+ globe.json): an orthographic globe of the Blue Marble turning slowly toward Kansas.
- public/sat/kansas.jpg, public/sat/kura-araz.jpg: Sentinel-2 true colour at 10 m, 1296x2304 (12.96 x 23.04 km).
Run with the project venv: .venv/bin/python -I scripts/maps.py
"""
import json, math, subprocess, pathlib, os
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[1]
R = ROOT / 'research'
PUB = ROOT / 'public'

def read_img(path):
    w, h = map(int, subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', str(path)]).decode().split(','))
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3)

def write_img(path, a, q=2):
    h, w, _ = a.shape
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-i', '-', '-q:v', str(q), str(path)],
                   input=np.ascontiguousarray(a).tobytes(), check=True)

# (a) Caucasus map, equirectangular with standard parallel 40N
LON0, LON1, LAT0, LAT1 = 36.0, 56.0, 33.0, 47.0
K = math.cos(math.radians(40))
W = int(round(4000 * K)); H = 2800
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(R / 'maps/bm-caucasus-500m.jpg'), '-vf', f'scale={W}:{H}:flags=lanczos', '-q:v', '2', str(PUB / 'maps/caucasus.jpg')], check=True)

def to_px(lon, lat):
    return ((lon - LON0) / (LON1 - LON0) * W, (LAT1 - lat) / (LAT1 - LAT0) * H)

# (b) Azerbaijan outline from Natural Earth
ne = json.load(open(R / 'maps/ne_10m_admin_0_countries.geojson'))
aze = next(f for f in ne['features'] if f['properties'].get('ADM0_A3') == 'AZE')
polys = aze['geometry']['coordinates']
paths, total = [], 0.0
for poly in polys:
    ring = poly[0]
    pts = [to_px(x, y) for x, y in ring]
    L = sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
    total += L
    paths.append({'d': 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + ' Z', 'length': round(L, 1), 'points': len(pts)})
paths.sort(key=lambda p: -p['length'])
lons = [x for poly in polys for x, y in poly[0]]; lats = [y for poly in polys for x, y in poly[0]]
bbox = [*to_px(min(lons), max(lats)), *to_px(max(lons), min(lats))]
json.dump({'image': 'maps/caucasus.jpg', 'width': W, 'height': H, 'bounds': [LON0, LAT0, LON1, LAT1], 'xscale': K,
           'paths': paths, 'bbox_px': [round(v, 1) for v in bbox], 'source': 'Natural Earth 1:10m admin 0 (public domain)'},
          open(PUB / 'maps/aze.json', 'w'), indent=1)
print('caucasus', W, H, 'aze paths', [(p['points'], p['length']) for p in paths], 'bbox', [round(v) for v in bbox])

# (c) Globe frames
tex = read_img(R / 'maps/bm-global-3600.jpg').astype(np.float32)  # 3600x1800, lon -180..180, lat 90..-90
TH, TW, _ = tex.shape
S = 1080; RAD = 470; N = 96   # 3.2 s of frames at 30 fps
cx = cy = S / 2
yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
X = (xx + 0.5 - cx) / RAD; Y = -(yy + 0.5 - cy) / RAD
rho2 = X ** 2 + Y ** 2
inside = rho2 <= 1.0
Z = np.sqrt(np.clip(1 - rho2, 0, 1))
frames_dir = ROOT / 'build/globe'; frames_dir.mkdir(parents=True, exist_ok=True)
params = []
bg = np.array([11, 12, 10], np.float32)  # theme black #0B0C0A
for f in range(N):
    t = f / (N - 1)
    e = t * t * (3 - 2 * t)
    lam0 = math.radians(-70 + (-98 + 70) * e)      # turns west toward Kansas
    phi0 = math.radians(30 + (37 - 30) * e)
    # inverse orthographic
    lat = np.arcsin(np.clip(Z * math.sin(phi0) + Y * math.cos(phi0), -1, 1))
    lon = lam0 + np.arctan2(X, Z * math.cos(phi0) - Y * math.sin(phi0))
    u = ((np.degrees(lon) + 180) % 360) / 360 * TW - 0.5
    v = (90 - np.degrees(lat)) / 180 * TH - 0.5
    u0 = np.floor(u).astype(int); v0 = np.clip(np.floor(v).astype(int), 0, TH - 2)
    fu = (u - u0)[..., None]; fv = (v - v0)[..., None]
    u0m = u0 % TW; u1m = (u0 + 1) % TW
    c = (tex[v0, u0m] * (1 - fu) * (1 - fv) + tex[v0, u1m] * fu * (1 - fv) + tex[v0 + 1, u0m] * (1 - fu) * fv + tex[v0 + 1, u1m] * fu * fv)
    shade = (0.55 + 0.45 * Z)[..., None]          # gentle limb darkening, no glow
    img = np.where(inside[..., None], c * shade, bg)
    # 1-pixel antialiased edge
    edge = np.clip((1.0 - np.sqrt(rho2)) * RAD + 0.5, 0, 1)[..., None]
    img = img * edge + bg * (1 - edge)
    write_img(frames_dir / f'{f:03d}.png', np.clip(img, 0, 255).astype(np.uint8))
    params.append({'lam0': round(math.degrees(lam0), 4), 'phi0': round(math.degrees(phi0), 4)})
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-i', str(frames_dir / '%03d.png'), '-c:v', 'libx264', '-crf', '12', '-preset', 'slow',
                '-pix_fmt', 'yuv420p', '-g', '15', '-bf', '0', str(PUB / 'sat/globe.mp4')], check=True)
json.dump({'size': S, 'radius': RAD, 'frames': params, 'texture': 'NASA Blue Marble (GIBS BlueMarble_ShadedRelief_Bathymetry)'}, open(PUB / 'sat/globe.json', 'w'))
print('globe frames', N)
