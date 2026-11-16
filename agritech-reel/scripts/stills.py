"""Render stills of every beat of a variant (fractions of each beat) and tile them into contact sheets.
Usage: python3 -I scripts/stills.py <lang> <variant> [fractions comma-separated] [--safe]"""
import json, subprocess, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
lang, variant = sys.argv[1], sys.argv[2]
fr = [float(x) for x in (sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith('--') else '0.25,0.6,0.93').split(',')]
safe = '--safe' in sys.argv
tl = json.loads((ROOT / 'src/timeline.json').read_text())
out = ROOT / f'build/stills/{lang}-{variant}'
out.mkdir(parents=True, exist_ok=True)
files = []
import os
only = [x for x in os.environ.get('LINES', '').split(',') if x]
for line in [l for l in tl['variants'][variant] if not only or l in only]:
    n = tl['lines'][lang][line]['frames']
    for f in fr:
        k = min(n - 1, int(round(f * (n - 1))))
        p = out / f'{line}-{k:03d}.png'
        props = json.dumps({'lang': lang, 'line': line, 'safeBox': safe})
        subprocess.run(['npx', 'remotion', 'still', 'build/bundle', 'Beat', str(p), f'--props={props}', f'--frame={k}', '--log=error'], cwd=ROOT, check=True)
        files.append((line, k, p))
# sheets: 6 per row, 3 rows per sheet, 360x640 tiles with a label
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
tiles = []
for line, k, p in files:
    t = p.with_suffix('.tile.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(p), '-vf', f"scale=360:640,drawtext=fontfile={FONT}:text='{line} f{k}':x=6:y=616:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.7", str(t)], check=True)
    tiles.append(t)
per = 18
for si in range(0, len(tiles), per):
    group = tiles[si:si + per]
    n = len(group)
    layout = '|'.join(f'{(i % 6) * 360}_{(i // 6) * 640}' for i in range(n))
    args = sum([['-i', str(t)] for t in group], [])
    sheet = out / f'sheet-{si // per + 1}.jpg'
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + args + ['-filter_complex', f'xstack=inputs={n}:layout={layout}:fill=black' if n > 1 else 'null', '-q:v', '3', str(sheet)], check=True)
    print(sheet)
