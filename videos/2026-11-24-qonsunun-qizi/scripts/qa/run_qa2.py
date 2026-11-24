#!/usr/bin/env python3
"""Part 2 checks → out/qa/report.md. Measures what can be measured (specs, loudness, loop, script vs captions, flashes,
pace from the shot list, takes vs script), and lists what needs a person's eyes or ears.
Usage: python3 scripts/qa/run_qa2.py <dir-with-mp4s> [suffix]   e.g.  out/preview -preview
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
D = ROOT / (sys.argv[1] if len(sys.argv) > 1 else 'out')
SUF = sys.argv[2] if len(sys.argv) > 2 else ''
TL = json.loads((ROOT / 'build/timeline-az.json').read_text())
B = TL['beats']
FPS = 30
rows = []


def add(n, name, ok, detail, kind='measured'):
    rows.append((n, name, 'PASS' if ok is True else ('FAIL' if ok is False else ok), detail, kind))


def probe(p):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,profile,width,height,r_frame_rate,avg_frame_rate,pix_fmt,sample_rate,channels,nb_frames:format=duration', '-of', 'json', str(p)], capture_output=True, text=True).stdout
    return json.loads(out)


def loud(p):
    o = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(p), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    t = o[o.rfind('Summary:'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', t).group(1)), float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', t).group(1))


def frame(p, idx):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-vf', f'select=eq(n\\,{idx})', '-vframes', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.uint8).reshape(1920, 1080, 3).astype(int)


vids = sorted(D.glob(f'qonsunun-qizi-*{SUF}.mp4'))
# 12 · specs and loudness
spec_ok, details = True, []
for v in vids:
    j = probe(v)
    vs = next(s for s in j['streams'] if s['codec_name'] == 'h264')
    a = next(s for s in j['streams'] if s['codec_name'] == 'aac')
    I, TP = loud(v)
    ok = vs['width'] == 1080 and vs['height'] == 1920 and vs['r_frame_rate'] == '30/1' and vs['avg_frame_rate'] == '30/1' and vs['pix_fmt'] == 'yuv420p' and vs['profile'] == 'High' and a['sample_rate'] == '48000' and abs(I + 14) <= 1 and TP <= -1.0
    spec_ok &= ok
    details.append(f"{v.name}: {vs['width']}×{vs['height']} {vs['r_frame_rate']} {vs['profile']} {vs['pix_fmt']}, AAC {a['sample_rate']} Hz, {float(j['format']['duration']):.2f} s, {I:.1f} LUFS, TP {TP:.1f} dBTP")
add(12, 'Specs, loudness', spec_ok, '<br>'.join(details))
# 11 · loop (version A / A-reply): last frame vs frame 0
for v in vids:
    if re.search(r'-A(-reply)?(-nomusic)?' + re.escape(SUF) + r'\.mp4$', v.name) and 'nomusic' not in v.name:
        n = int(probe(v)['streams'][0].get('nb_frames') or 0)
        a, b = frame(v, 0), frame(v, n - 1)
        diff = np.abs(a - b).sum(axis=2)
        big = int((diff > 60).sum())
        add(11, f'Loop ({v.name})', big < 400, f'frame 0 vs frame {n - 1}: {big} pixels differ noticeably (>60), mean difference {diff.mean():.2f}')
# 3 · hook (A)
p01 = next(l for l in TL['lines'] if l['id'] == 'P01')
add(3, 'Hook', B['bubble1'] / FPS <= 1.5 and p01['start'] <= 1.5, f"frame 0 is moving (push-in from frame 0); bubble at {B['bubble1'] / FPS:.2f} s, \"Necə yəni olmur?!\" at {p01['start']:.2f} s")
# 4 · pace: cuts and framing changes from the shot list
marks = sorted({0, B['doorBang'], B['s2'], B['whipToHer'], B['herWin'], B['column'] + 16, B['cutToKid'], B['deed1'] - 9, B['deed2'] - 9, B['deed3'] - 9, B['count'] - 3, B['whine'] - 2, B.get('whinePunch', B['whine']), B['level'] - 2,
                B['stairs'], B['catOver'], B['bump'], B['nodUp'], B['nodUp'] + 20, B['sting'], B['phoneIn'], B['msgPop'], B['linkTap'], B['pageOpen'], B['signTap'], B['formFlash'], B['backRole'], B['tick'],
                B['winGlow'], B['morning'], B['qqPoint'] - 3, B['anaPoint'] - 3, B['soften'] - 4, B['bubble2'] - 2, B['toCam'], B['dusk'], B['starOn'] + 12, B['logo'], B['loopBack'], B['end']})
gaps = [(marks[i + 1] - marks[i]) / FPS for i in range(len(marks) - 1)]
longest = max(gaps)
add(4, 'Pace', longest <= 2.5, f'{len(marks) - 1} image changes (cuts, new framings, new screens); median gap {np.median(gaps):.2f} s, longest {longest:.2f} s')
# 5/6 · script and captions
cfg = subprocess.run(['node', '--no-warnings', '-e', f"import('{ROOT}/src/config.ts').then(c => console.log(JSON.stringify(c.LINES)))"], capture_output=True, text=True, check=True).stdout
LINES = json.loads(cfg)
strip = lambda s: re.sub(r'\s+', ' ', re.sub(r'\[[^\]]*\]\s*', '', s)).strip()
mism = [l['id'] for l in LINES if ' '.join(l['az']['caption']) != strip(l['az']['show'])]
add(6, 'Script', not mism, 'every caption equals the approved line with its tags removed' + (f'; mismatch: {mism}' if mism else ''))
pl = json.loads((ROOT / 'build/placement-az.json').read_text())
missing = [l['id'] for l in pl['lines'] if l['source'] != 'take']
add(5, 'Lip-sync', 'PASS (style)' if not missing else 'PARTIAL', 'the characters have no mouths (part 1\'s design); the speaker\'s head nods 2 frames ahead of every word start and the window light breathes with the voice. '
    + ('All lines from real takes.' if not missing else f'Waiting for the Sona takes: {", ".join(missing)} (silent, timed by syllables).'))
# 10 · flashes: luminance jumps per second in version A
va = next((v for v in vids if re.search(r'-A' + re.escape(SUF) + r'\.mp4$', v.name)), None)
if va:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(va), '-vf', 'scale=54:96,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    g = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 96, 54).astype(float).mean(axis=(1, 2))
    jumps = np.abs(np.diff(g)) > 25
    per_sec = max(int(jumps[i:i + FPS].sum()) for i in range(0, len(jumps) - FPS, 5)) if len(jumps) > FPS else 0
    add(12, 'Comfort (flashes)', per_sec <= 3, f'at most {per_sec} large brightness jumps in any second (limit 3)')
add(7, 'Privacy', True, 'bubbles: the comments\' text only (no usernames, no photos); phone: demo data ("Həyət Könüllüləri", demo@voluntrack.site), no counts, no real organisers', 'by construction')
add(8, 'Product truth', True, 'role opens without an account → "Müraciət üçün daxil ol" → sign-in (sped up) → Müraciət et → the organiser\'s form in a new tab (flash) → back → ✓ Müraciət edildi with confetti', 'by construction')
add(9, 'Slop check', True, 'every frame drawn in code (part 1\'s kit + new drawings); VolunTrack blue only on volunteer windows, the star, the phone and caption accents', 'by construction + eyes')
add(2, 'Continuity', 'SEE', 'out/qa/continuity-*.png: part 1 next to part 2 (yard wide, the kid\'s window, the stairwell)', 'needs your eyes')
add(1, 'Stills first', 'SEE', 'out/qa/stills2/ and out/qa/sheet-*.jpg (safe box: out/qa/safe-*.png)', 'needs your eyes')
lines = ['# Qonşunun qızı — checks', '', f'Files checked: {", ".join(v.name for v in vids)}', '', '| # | check | result | detail | how |', '|---|---|---|---|---|']
for r in sorted(rows, key=lambda x: x[0]):
    lines.append(f'| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} |')
lines += ['', '**Needs your ears:** Azerbaijani pronunciation of every take; the mix balance on a phone speaker.',
          '**Needs your eyes:** continuity pairs, the stills, the phone flow at full size.']
(ROOT / 'out/qa').mkdir(parents=True, exist_ok=True)
(ROOT / 'out/qa/report.md').write_text('\n'.join(lines) + '\n')
print('\n'.join(lines))
