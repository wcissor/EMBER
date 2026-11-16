"""Frame strips of each licensed clip (6 frames across its length) for choosing segments and crops.
Usage: python3 -I scripts/clip_sheet.py <out.jpg> <code>=<file> ..."""
import subprocess, sys, json, pathlib, tempfile
out = sys.argv[1]
pairs = [a.split('=', 1) for a in sys.argv[2:]]
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
tmp = pathlib.Path(tempfile.mkdtemp(dir='/tmp/claude-0/-home-user-EMBER/0dfb6c9a-6506-5532-adc5-a953975e0935/scratchpad'))
rows = []
for code, f in pairs:
    d = float(json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', f]))['format']['duration'])
    cells = []
    for i in range(6):
        t = d * (i + 0.5) / 6
        p = tmp / f'{code}-{i}.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', f, '-frames:v', '1', '-vf',
                        f"scale=320:200:force_original_aspect_ratio=decrease,pad=320:200:(ow-iw)/2:(oh-ih)/2:color=0x151612,"
                        f"drawtext=fontfile={FONT}:text='{code} t={t:.1f}s':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=0x000000@0.6", str(p)], check=True)
        cells.append(p)
    r = tmp / f'row-{code}.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + sum([['-i', str(c)] for c in cells], []) + ['-filter_complex', 'hstack=inputs=6', str(r)], check=True)
    rows.append(r)
subprocess.run(['ffmpeg', '-v', 'error', '-y'] + sum([['-i', str(r)] for r in rows], []) + ['-filter_complex', f'vstack=inputs={len(rows)}' if len(rows) > 1 else 'null', '-q:v', '3', out], check=True)
print(out)
