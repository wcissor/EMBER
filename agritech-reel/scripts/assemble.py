"""Join the beats of each variant and add its audio.

For each language and variant: the beats in order plus the loop tail, joined with the concat demuxer
(-c copy, no re-encode), then muxed with the mastered mix (AAC 320 kb/s, 48 kHz, faststart).
Each file is written to a temporary name ending in .mp4 and renamed only after ffmpeg exits 0.
  out/ruta-agritech-{lang}-{V}.mp4          voice + effects + music
  out/ruta-agritech-{lang}-{V}-nomusic.mp4  voice + effects
"""
import json, os, pathlib, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
TL = json.loads((ROOT / 'src/timeline.json').read_text())
OUT, BEATS, MIX = ROOT / 'out', ROOT / 'out/beats', ROOT / 'audio/mix'
tmpdir = OUT / 'tmp'
tmpdir.mkdir(exist_ok=True)


def run(args):
    p = subprocess.run(args, capture_output=True, text=True)
    if p.returncode != 0:
        raise SystemExit(f"ffmpeg failed ({p.returncode}): {' '.join(args)}\n{p.stderr[-2000:]}")


todo = [(l, v) for l in ('en', 'az') for v in ('A', 'B', 'C')]
if len(sys.argv) > 1:
    todo = [(l, v) for l, v in todo if f'{l}-{v}' in sys.argv[1:]]
for lang, v in todo:
    seq = TL['variants'][v]
    files = [BEATS / f'{lang}-{lid}.mp4' for lid in seq] + [BEATS / f'{lang}-tail-{v}.mp4']
    lst = tmpdir / f'{lang}-{v}.txt'
    lst.write_text(''.join(f"file '{f}'\n" for f in files))
    video = tmpdir / f'{lang}-{v}-video.mp4'
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', '-an', str(video)])
    for suffix in ('', '-nomusic'):
        final = OUT / f'ruta-agritech-{lang}-{v}{suffix}.mp4'
        tmp = OUT / f'.ruta-agritech-{lang}-{v}{suffix}.tmp.mp4'
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(video), '-i', str(MIX / f'{lang}-{v}{suffix}.wav'),
             '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2',
             '-movflags', '+faststart', str(tmp)])
        os.replace(tmp, final)
        print('wrote', final.relative_to(ROOT), flush=True)
    video.unlink()
    lst.unlink()
tmpdir.rmdir()
