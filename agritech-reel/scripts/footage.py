"""Make graded 1080x1920 30 fps proxies of the licensed clips.

Each entry: source file, in-point and length (source seconds), horizontal crop centre (0-1, for landscape clips),
extra zoom and vertical centre (for clips that need reframing), and whether to conform the frame rate
(each source frame becomes one 30 fps frame, so 24/25 fps footage plays 1.25x/1.2x faster without judder).
Grade (same for every clip): deep blacks, greens pulled slightly toward olive, warm highlights, gentle contrast.

Usage: python3 -I scripts/footage.py preview   -> footage/preview/grade-sheet.jpg (before/after stills)
       python3 -I scripts/footage.py build [codes...]
"""
import json, subprocess, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / 'footage/src'
OUT = ROOT / 'footage/proxy'
CLIPS = {
    # code: (file, start, dur, crop_cx, zoom, cy, still_t)
    'H1-a':  ('AdobeStock_820742732_4K.mov', 0.4, 7.0, None, 1.0, 0.5, 2.0),
    'H1-c':  ('AdobeStock_469320194_4K.mov', 0.0, 11.8, 0.5, 1.0, 0.5, 3.0),
    'B1-a':  ('AdobeStock_710929741_HD.mov', 1.5, 9.0, None, 1.0, 0.5, 3.0),
    'B1-b':  ('AdobeStock_788101373_4K.mov', 8.0, 10.0, None, 1.0, 0.5, 5.0),
    'B1-c':  ('AdobeStock_1527068097_4K.mov', 0.0, 6.0, 0.5, 1.0, 0.5, 2.0),
    'B2-a':  ('AdobeStock_275600505_4K.mov', 4.0, 10.0, 0.5, 1.0, 0.5, 3.0),
    'B2-b':  ('AdobeStock_566524463_HD.mov', 0.0, 11.0, None, 1.0, 0.5, 3.0),
    'B3-a':  ('AdobeStock_608684392_4K.mov', 0.0, 11.0, 0.52, 1.0, 0.5, 3.0),
    'B3-d':  ('AdobeStock_488053406_4K.mov', 13.0, 6.3, 0.33, 1.0, 0.5, 2.0),
    'B4-a1': ('AdobeStock_247370608_4K.mov', 0.0, 7.0, 0.5, 1.0, 0.5, 2.0),
    'B4-a2': ('AdobeStock_247370608_4K.mov', 14.5, 8.0, 0.5, 1.0, 0.5, 5.0),
    'B4-b':  ('AdobeStock_841343330_4K.mov', 3.0, 12.0, None, 1.4, 0.643, 5.0),
    'B4-c':  ('AdobeStock_293665831_4K.mov', 0.0, 12.0, 0.5, 1.0, 0.5, 4.0),
    'B6-a':  ('AdobeStock_368399272_4K.mov', 2.0, 9.0, 0.55, 1.0, 0.5, 3.0),
    'B6-b':  ('AdobeStock_781897184_4K.mov', 6.0, 10.0, None, 1.0, 0.5, 4.0),
}
GRADE = ','.join([
    "eq=contrast=1.05:saturation=0.9",
    "selectivecolor=greens=-0.2 0.02 0.12 0.06:yellows=-0.04 0.02 -0.02 0.02:cyans=-0.1 0 0.06 0.04",
    "colorbalance=rm=0.015:bm=-0.02:rh=0.04:gh=0.012:bh=-0.045",
    "curves=all='0/0 0.07/0.04 0.5/0.49 0.93/0.94 1/0.985'",
])

def probe(f):
    j = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,sample_aspect_ratio', '-of', 'json', str(f)]))
    s = j['streams'][0]; n, d = map(int, s['r_frame_rate'].split('/'))
    sar = s.get('sample_aspect_ratio', '1:1')
    sn, sd = (map(int, sar.split(':')) if sar not in ('N/A', '0:1') else (1, 1))
    return s['width'], s['height'], n / d, sn / sd

def frame_filter(code):
    f, start, dur, cx, zoom, cy, _ = CLIPS[code]
    w, h, fps, sar = probe(SRC / f)
    flt = []
    if w * sar > h:   # landscape: 9:16 crop of the full height (in display pixels; some sources are anamorphic)
        cw = int(round(h * 9 / 16 / sar / 2)) * 2
        x = int(min(max(cx * w - cw / 2, 0), w - cw))
        flt.append(f'crop={cw}:{h}:{x}:0')
        w = cw
    if zoom != 1.0:  # reframe: crop a smaller 9:16 window
        zw = int(round(w / zoom / 2)) * 2; zh = int(round(zw * sar * 16 / 9 / 2)) * 2
        hh = h
        y = int(min(max(cy * hh - zh / 2, 0), hh - zh))
        flt.append(f'crop={zw}:{zh}:{(w - zw) // 2}:{y}')
    flt.append('scale=1080:1920:flags=lanczos+accurate_rnd+full_chroma_int,setsar=1')
    flt.append('format=yuv444p')
    return flt, fps

def build(code):
    f, start, dur, *_ = CLIPS[code]
    flt, fps = frame_filter(code)
    conform = abs(fps - 30) > 0.05 and abs(fps - 30000 / 1001) > 0.01
    vf = flt + [GRADE]
    vf.append('setpts=N/(30*TB)' if (conform or abs(fps - 30000 / 1001) < 0.01) else 'null')
    tmp = OUT / f'{code}.tmp.mp4'
    cmd = ['ffmpeg', '-v', 'error', '-y', '-ss', f'{start}', '-t', f'{dur}', '-i', str(SRC / f), '-an',
           '-vf', ','.join(vf), '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p',
           '-g', '15', '-bf', '0', '-movflags', '+faststart', str(tmp)]
    subprocess.run(cmd, check=True)
    tmp.rename(OUT / f'{code}.mp4')
    d = float(json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(OUT / f'{code}.mp4')]))['format']['duration'])
    print(code, f'{fps:.3f} fps', 'conformed' if conform else '', f'-> {d:.2f}s')
    return d

def preview():
    pv = ROOT / 'footage/preview'
    tiles = []
    for code, (f, start, dur, cx, zoom, cy, st) in CLIPS.items():
        flt, _ = frame_filter(code)
        for tag, extra in (('a', []), ('b', [GRADE])):
            p = pv / f'{code}-{tag}.png'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{start + st}', '-i', str(SRC / f), '-frames:v', '1', '-vf',
                            ','.join(flt + extra + ['scale=270:480', 'format=rgb24']), str(p)], check=True)
            tiles.append(p)
    # rows of 8 tiles (4 clips before/after)
    n = len(tiles); cols = 8; rows = -(-n // cols)
    args = sum([['-i', str(t)] for t in tiles], [])
    layout = '|'.join(f'{(i % cols) * 270}_{(i // cols) * 480}' for i in range(n))
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + args + ['-filter_complex', f'xstack=inputs={n}:layout={layout}:fill=0x151612', '-q:v', '3', str(pv / 'grade-sheet.jpg')], check=True)
    print(pv / 'grade-sheet.jpg')

if __name__ == '__main__':
    if sys.argv[1] == 'preview': preview()
    else:
        codes = sys.argv[2:] or list(CLIPS)
        res = {c: build(c) for c in codes}
        old = json.loads((OUT / 'durations.json').read_text()) if (OUT / 'durations.json').exists() else {}
        old.update(res); (OUT / 'durations.json').write_text(json.dumps(old, indent=1))
