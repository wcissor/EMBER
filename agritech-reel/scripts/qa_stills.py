"""QA check 1: one still per line at its busiest steady moment (from out/qa/text.json), with the safe box drawn.
Variant A's lines in both languages, plus the lines only B and C use. Writes out/qa/stills/{lang}-{line}.jpg
and one sheet per language. Run after scripts/qa_text.py."""
import json, pathlib, subprocess
ROOT = pathlib.Path(__file__).resolve().parents[1]
busy = json.loads((ROOT / 'out/qa/text.json').read_text())['busiest']
TL = json.loads((ROOT / 'src/timeline.json').read_text())
OUT = ROOT / 'out/qa/stills'
OUT.mkdir(parents=True, exist_ok=True)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
LINES = TL['variants']['A'] + ['H2', 'H3', 'B1b', 'B4s']
for lang in ('en', 'az'):
    tiles = []
    for lid in LINES:
        k = busy[f'{lang}-{lid}']
        png = ROOT / f'build/stills/qa/{lang}-{lid}.png'
        props = json.dumps({'lang': lang, 'line': lid, 'safeBox': True})
        subprocess.run(['npx', 'remotion', 'still', 'build/bundle', 'Beat', str(png), f'--props={props}', f'--frame={k}', '--log=error'], cwd=ROOT, check=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(png), '-q:v', '2', str(OUT / f'{lang}-{lid}.jpg')], check=True)
        t = ROOT / f'build/stills/qa/t-{lang}-{lid}.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(png), '-vf', f"scale=360:640,drawtext=fontfile={FONT}:text='{lang} {lid} f{k}':x=6:y=614:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.7", str(t)], check=True)
        tiles.append(t)
    n = len(tiles)
    layout = '|'.join(f'{(i % 7) * 360}_{(i // 7) * 640}' for i in range(n))
    args = sum([['-i', str(t)] for t in tiles], [])
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + args + ['-filter_complex', f'xstack=inputs={n}:layout={layout}:fill=0x151612', '-q:v', '3', str(OUT / f'sheet-{lang}.jpg')], check=True)
    print('sheet', lang, n)
