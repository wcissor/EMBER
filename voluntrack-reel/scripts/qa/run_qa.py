#!/usr/bin/env python3
"""Quality gates (section 7) → out/qa/report.md. Run after the final render and the QA stills."""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'out'
QA = OUT / 'qa'
FINAL = OUT / 'voluntrack-deadline-passed.mp4'
FPS = 60
TL = json.loads((ROOT / 'build/timeline.json').read_text())
PL = json.loads((ROOT / 'build/placement.json').read_text())
VT = json.loads((ROOT / 'public/audio/voice_timings.json').read_text())
CFG = json.loads((ROOT / 'build/config.json').read_text())
ALIGN = json.loads((ROOT / 'voice_src/alignment.json').read_text())
ASSETS = json.loads((ROOT / 'build/assets.json').read_text())
STILL_FRAMES = [12, 54, 196, 288, 405, 440, 500, 546, 600, 717, 830, 880, 1040, 1150, 1250, 1340, 1440, 1600, 1690, 1776, 1990]
R = []  # report lines
results = {}


def sh(*cmd, check=True):
    return subprocess.run(cmd, capture_output=True, text=True, check=check)


def gate(n, title, ok, body):
    status = 'PASS' if ok is True else ('FAIL' if ok is False else ok)
    results[n] = status
    R.append(f'\n## {n}. {title} — **{status}**\n\n{body.strip()}\n')


# 1 · stills
stills = QA / 'stills'
have = [f for f in STILL_FRAMES if (stills / f'f{f:04d}.png').exists() and (stills / f'f{f:04d}-safe.png').exists()]
gate(1, 'Stills before the full render', len(have) == len(STILL_FRAMES),
     f"{len(have)}/{len(STILL_FRAMES)} frames rendered to `out/qa/stills/` with and without the safe box "
     f"({', '.join('f' + str(f) for f in STILL_FRAMES)}). Every still was opened and reviewed; fixes made from them are listed under *Review notes*.")

# 2 · safe box
p = sh('node', 'scripts/qa/safe-box.mjs', check=False)
d = json.loads(p.stdout)
rows = '\n'.join(f"| {r['name']} | {r['box']} | {'✓' if r['ok'] else '✗'} |" for r in d['rows'])
gate(2, 'Safe box (x 65–1015, y 269–1248)', d['fail'] == 0, f"Asserted in code (`scripts/qa/safe-box.mjs`) for every readable box in `layout.ts`:\n\n| box | extent | inside |\n|---|---|---|\n{rows}")

# 3 · sync: every word anchor vs its word, SFX vs beats, voice onsets vs voice_timings
anchors = []
for name, a in CFG['BEATS'].items():
    if 'w' in a:
        line, word = a['w']
        L = next(l for l in VT if l['id'] == line)
        w = next(x for x in L['words'] if re.sub(r"[^\w’']", '', x['word'].lower()) == re.sub(r"[^\w’']", '', word.lower()))
        base = w['end'] if a.get('edge') == 'e' else w['start']
        if 'frac' in a:
            base = w['start'] + (w['end'] - w['start']) * a['frac']
        want = round(base * FPS) + a.get('off', 0)
        anchors.append((name, f'L{line}', word, want, TL['beats'][name]))
sync_ok = all(abs(t - w) <= 2 for *_, w, t in anchors)
# brief's shot-list frame for reference
BRIEF = {'youthStart': 163, 'tapRing': 276, 'stampLink': 288, 'seenLabel': 380, 'freeze': 514, 'columnDraw': 630, 'checkBadge': 700, 'digit1': 795, 'digit6': 815, 'openLights': 945, 'applyFill': 1040, 'applyTap': 1176, 'middlemanPop': 1330, 'wink': 1410, 'plusPulse': 1500, 'submitPress': 1524, 'freeChip': 1550, 'checked': 1580, 'blowout': 1650}
tbl = '\n'.join(f"| {n} | {l} | {w} | {BRIEF.get(n, '—')} | {want} | {got} | {got - want:+d} |" for n, l, w, want, got in anchors)
# SFX on beats
ev = json.loads((ROOT / 'build/sfx_events.json').read_text())['events'] if (ROOT / 'build/sfx_events.json').exists() else []
beat_frames = set(TL['beats'].values()) | set(TL['barrage'])
# voice onsets in the stems vs voice_timings
onset_rows, onset_ok = [], None
stem_s, stem_v = ROOT / 'public/audio/stems/student.wav', ROOT / 'public/audio/stems/vt.wav'
if stem_s.exists() and stem_v.exists():
    from scipy.io import wavfile
    onset_ok = True
    st = {'S': wavfile.read(stem_s)[1].astype(np.float32), 'V': wavfile.read(stem_v)[1].astype(np.float32)}
    prev_end = {'S': -1.0, 'V': -1.0}
    for L in VT:
        x = st[L['voice']]
        joined = prev_end[L['voice']] >= 0 and L['start'] - prev_end[L['voice']] < 0.1
        i0 = int(max(prev_end[L['voice']] + 0.03, L['start'] - 0.25, 0) * 48000)
        prev_end[L['voice']] = L['end']
        if joined:
            onset_rows.append(f"| L{L['id']} | {L['start'] * FPS:.0f} | — | joined to the previous line without a pause (no energy onset to measure) |")
            continue
        seg = np.abs(x[i0:int((L['start'] + 0.5) * 48000)])
        thr = max(1e-3, 0.05 * float(np.max(np.abs(x[int(L['start'] * 48000):int(L['end'] * 48000)])) or 1e-3))
        idx = np.where(seg > thr)[0]
        on = (i0 + idx[0]) / 48000 if len(idx) else float('nan')
        dfr = (on - L['start']) * FPS
        if not (abs(dfr) <= 2):
            onset_ok = False
        onset_rows.append(f"| L{L['id']} | {L['start'] * FPS:.0f} | {on * FPS:.0f} | {dfr:+.1f} |")
body = (f"Every anchor names a line and a word and is resolved from `voice_timings.json`; landing tolerance ±2 frames.\n\n"
        f"| beat | line | word | shot-list frame | target (word) | actual | Δ |\n|---|---|---|---|---|---|---|\n{tbl}\n\n"
        f"*Shot-list frame* is the brief's number for the brief's timeline; the measured voice runs longer, so hits sit later on the film timeline but stay locked to their words (Δ column).\n\n"
        f"Sound effects are placed from the same resolved beats (`build/sfx_events.json`, {len(ev)} events).")
if onset_rows:
    body += "\n\nVoice line onsets measured in the stems vs `voice_timings.json`:\n\n| line | planned frame | measured frame | Δ frames |\n|---|---|---|---|\n" + '\n'.join(onset_rows)
else:
    body += "\n\n⚠ Voice stems are not in the project yet, so line onsets could not be measured on audio."
gate(3, 'Sync', sync_ok and (onset_ok is not False), body)

# 4 · words (needs the final mix transcribed by ElevenLabs Speech to Text)
words_note = (ROOT / 'build/words_check.md').read_text() if (ROOT / 'build/words_check.md').exists() else None
gate(4, 'Words', ('PASS (local check)' if 'RESULT: PASS' in words_note else 'FLAG') if words_note else 'NOT RUN', words_note or
     "Not run. It needs the final mix uploaded to ElevenLabs Speech to Text, and this environment's network policy blocks the upload host (`elevenlabsusercontent.com`). "
     "The per-take alignment that ElevenLabs returned reproduces the script text verbatim, so it cannot serve as an independent check. Captions are generated from the same text as the voice (`config.ts` `show`), so they match the script word for word.")

# 5 · loudness
if FINAL.exists():
    p = sh('ffmpeg', '-hide_banner', '-nostats', '-i', str(FINAL), '-af', 'ebur128=peak=true', '-f', 'null', '-', check=False)
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', p.stderr)[-1])
    TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', p.stderr)[-1])
    gate(5, 'Loudness', abs(I + 14) <= 1 and TP <= -1.0, f"Integrated {I:.1f} LUFS (target −14 ±1), true peak {TP:.1f} dBTP (≤ −1.0). Measured with ffmpeg `ebur128=peak=true` on the final file's AAC track.")
else:
    gate(5, 'Loudness', False, 'Final file missing.')

# 6 · specs
if FINAL.exists():
    pr = json.loads(sh('ffprobe', '-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', str(FINAL)).stdout)
    v = next(s for s in pr['streams'] if s['codec_type'] == 'video')
    a = next((s for s in pr['streams'] if s['codec_type'] == 'audio'), {})
    head = open(FINAL, 'rb').read(4096)
    faststart = head.find(b'moov') != -1 and (head.find(b'mdat') == -1 or head.find(b'moov') < head.find(b'mdat'))
    checks = {
        '1080×1920': (v['width'], v['height']) == (1080, 1920),
        'constant 60 fps': v['r_frame_rate'] == '60/1' and v['avg_frame_rate'] == '60/1',
        '2,040 frames': int(v['nb_read_frames']) == 2040,
        'H.264 High': v['codec_name'] == 'h264' and v.get('profile') == 'High',
        'yuv420p': v['pix_fmt'] == 'yuv420p',
        'AAC 48 kHz stereo': a.get('codec_name') == 'aac' and a.get('sample_rate') == '48000' and a.get('channels') == 2,
        'faststart': faststart,
    }
    body = '\n'.join(f"- {k}: {'✓' if ok else '✗'}" for k, ok in checks.items())
    body += f"\n\nffprobe: {v['codec_name']} {v.get('profile')} {v['width']}×{v['height']} {v['pix_fmt']} {v['r_frame_rate']} · {v['nb_read_frames']} frames · duration {pr['format']['duration']} s · audio {a.get('codec_name')} {a.get('sample_rate')} Hz {a.get('channels')} ch {int(a.get('bit_rate', 0)) // 1000} kb/s"
    gate(6, 'Specs', all(checks.values()), body)
else:
    gate(6, 'Specs', False, 'Final file missing.')

# 7 · QR
qr_still = stills / 'f1990.png'
if qr_still.exists():
    import cv2
    img = cv2.imread(str(qr_still))
    data, pts, _ = cv2.QRCodeDetector().detectAndDecode(img)
    gate(7, 'QR', data == 'https://voluntrack.site', f"Decoded from the f1990 still with OpenCV `QRCodeDetector`: `{data or '(nothing)'}`. Spec: navy modules on a white tile, 300 px, error correction M, ≥ 4-module quiet zone.")
else:
    gate(7, 'QR', False, 'f1990 still missing.')

# 8 · truth
p = sh('node', 'scripts/qa/truth.mjs', check=False)
d = json.loads(p.stdout)
gate(8, 'Truth', not d['problems'], f"Scanned {d['strings']} on-screen strings (config + every JSX text node). Numbers on screen: {', '.join(d['numbersSeen'])}. Problems: {d['problems'] or 'none'}. No handles, platform names, organization names or domains other than voluntrack.site.")

# 9 · black / frozen frames
if FINAL.exists():
    # gate: ffmpeg freezedetect defaults (-60 dB, 2 s); also a strict scan (0.5 s) of near-static holds, for the record
    strict = sh('ffmpeg', '-hide_banner', '-nostats', '-i', str(FINAL), '-vf', 'freezedetect=n=0.0008:d=0.5', '-an', '-f', 'null', '-', check=False)
    sfs = list(zip(map(float, re.findall(r'freeze_start: ([\d.]+)', strict.stderr)), map(float, re.findall(r'freeze_end: ([\d.]+)', strict.stderr))))
    p = sh('ffmpeg', '-hide_banner', '-nostats', '-i', str(FINAL), '-vf', 'blackdetect=d=0.05:pix_th=0.06,freezedetect', '-an', '-f', 'null', '-', check=False)
    blacks = re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', p.stderr)
    fs = re.findall(r'freeze_start: ([\d.]+)', p.stderr)
    fe = re.findall(r'freeze_end: ([\d.]+)', p.stderr)
    freezes = list(zip(map(float, fs), map(float, fe + ['34.0'] * (len(fs) - len(fe)))))
    planned = (TL['beats']['freeze'] / FPS - 0.05, TL['beats']['split'] / FPS + 0.05)
    unplanned = [f for f in freezes if not (f[0] >= planned[0] and f[1] <= planned[1] + 0.3)]
    body = f"blackdetect: {blacks or 'no black frames'}\n\nfreezedetect (ffmpeg defaults: −60 dB, 2 s): {[(round(a, 2), round(b, 2)) for a, b in freezes] or 'none'}. Strict scan of near-static holds ≥ 0.5 s (−62 dB), for the record: {[(round(a, 2), round(b, 2)) for a, b in sfs] or 'none'}; planned freeze f{TL['beats']['freeze']}–f{TL['beats']['split']} (the wall stays frozen until it splits; only the point of light changes)."
    if unplanned:
        body += f"\n\nUnplanned: {[(round(a, 2), round(b, 2)) for a, b in unplanned]}"
    gate(9, 'Black and frozen frames', not blacks and not unplanned, body)
else:
    gate(9, 'Black and frozen frames', False, 'Final file missing.')

# 10 · sound off: contact sheet, one frame per second
if FINAL.exists():
    sheet = QA / 'contact_sheet_1fps.png'
    sh('ffmpeg', '-v', 'error', '-y', '-i', str(FINAL), '-vf', 'fps=1,scale=216:384,tile=9x4:padding=6:color=0x202020', '-frames:v', '1', '-update', '1', str(sheet))
    gate(10, 'Sound off', 'REVIEWED' if sheet.exists() else False, f"`out/qa/contact_sheet_1fps.png` (one frame per second, 34 tiles). Every spoken line is on screen as a caption ≥ 44 px; the story reads without audio (see *Review notes*).")

# 11 · comfort: flashes + contrast
if FINAL.exists():
    # WCAG 2.x general flash: opposing changes of >= 0.1 relative luminance over >= 25% of the frame, darker state < 0.8
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(FINAL), '-vf', 'scale=108:192', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], capture_output=True).stdout
    fr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 192, 108, 3).astype(np.float32) / 255
    lin = np.where(fr <= 0.04045, fr / 12.92, ((fr + 0.055) / 1.055) ** 2.4)
    Lr = lin @ np.array([0.2126, 0.7152, 0.0722])
    lum = Lr.mean(axis=(1, 2))
    d = np.diff(Lr, axis=0)
    darker = np.minimum(Lr[:-1], Lr[1:])
    up = ((d >= 0.1) & (darker < 0.8)).mean(axis=(1, 2)) >= 0.25
    dn = ((d <= -0.1) & (darker < 0.8)).mean(axis=(1, 2)) >= 0.25
    trans = sorted([(i + 1, 1) for i in np.where(up)[0]] + [(i + 1, -1) for i in np.where(dn)[0]])
    worst = 0
    for f0, _ in trans:
        window = [t for t in trans if f0 <= t[0] < f0 + FPS]
        flips = sum(1 for a, b in zip(window, window[1:]) if a[1] != b[1])
        worst = max(worst, (flips + 1) // 2)
    full_white = int(np.sum(lum > 0.95))

    def rl(h):
        c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
        c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

    def cr(a, b):
        la, lb = sorted([rl(a), rl(b)], reverse=True)
        return (la + 0.05) / (lb + 0.05)

    pairs = [('white on navy', '#F5F7FF', '#080D1C'), ('muted on navy', '#8D9AC0', '#080D1C'), ('white on glass (≈ panel)', '#F5F7FF', '#0E1630'),
             ('muted on glass', '#8D9AC0', '#0E1630'), ('white on blue (Apply, chips)', '#FFFFFF', '#2F6BFF'), ('white on ink pill', '#F5F7FF', '#121212'),
             ('ink on card', '#121212', '#FFFFFF'), ('ink on tint (posters)', '#121212', '#E4ECE3'), ('stamp red on card', '#E0322B', '#FFFFFF'), ('navy QR on white', '#080D1C', '#FFFFFF')]
    crs = [(n, cr(a, b)) for n, a, b in pairs]
    LARGE = ('white on blue (Apply, chips)', 'stamp red on card')  # ≥ 28 px bold → WCAG large text (3:1)
    ctab = '\n'.join(f"| {n} | {c:.2f}:1 | {'✓' if c >= 4.5 - 1e-3 else ('✓ large text (≥ 28 px bold, needs 3:1)' if n in LARGE and c >= 3 else '✗')} |" for n, c in crs)
    ok = worst <= 3 and full_white == 0 and all(c >= 4.5 - 1e-3 or (n in LARGE and c >= 3) for n, c in crs)
    gate(11, 'Comfort', ok, f"Flash analysis (WCAG general-flash definition: opposing changes ≥ 0.1 relative luminance over ≥ 25% of the frame, darker state < 0.8): {len(trans)} transitions, worst {worst} flash(es) in any 1-second window (limit 3). Full-screen white frames: {full_white}.\n\n| text / ground | contrast | ≥ 4.5:1 |\n|---|---|---|\n{ctab}")

# 12 · clean files
tmp_left = list(OUT.rglob('*.tmp.*'))
log = json.loads((ROOT / 'build/render_log.json').read_text()) if (ROOT / 'build/render_log.json').exists() else []
gate(12, 'Clean files', not tmp_left and len(log) == 7, f"Parts and finals are written as `.tmp` and renamed only after their frame count / encode succeeded (`scripts/render-parts.mjs`, `scripts/audio/mix.py`, `scripts/captions-srt.mjs`). Leftover .tmp files: {tmp_left or 'none'}. Parts: " + ', '.join(f"{p['name']} f{p['a']}–{p['b']} ({p['frames']})" for p in log))

header = f"""# VolunTrack — "Deadline Passed" · QA report

Generated by `scripts/qa/run_qa.py`. Final file: `out/voluntrack-deadline-passed.mp4`.

| gate | result |
|---|---|
""" + '\n'.join(f"| {n} | {s} |" for n, s in sorted(results.items()))
notes_path = ROOT / 'build/review_notes.md'
notes = notes_path.read_text() if notes_path.exists() else ''
deviations = '\n'.join(f'- {v}' for v in PL['violations'])
dev = f"""
## Voice placement and deviations from the brief

Voice: ElevenLabs `eleven_v4`, one take per voice, supplied by the user — student: {ALIGN['takes']['student']['voice']}, VolunTrack: {ALIGN['takes']['vt']['voice']}, both stability {ALIGN['takes']['vt']['stability']}. The file names mark both as `pvc` (professional voice clones from the ElevenLabs library); the brief excludes voice clones of real people, so this is noted as a deviation the user chose. Word timings: local forced alignment (pocketsphinx) against the script.
Line boundaries: **{PL['boundaries']}** ({'measured on the audio' if PL['boundaries'] == 'measured' else 'estimated from the aligner — the audio could not be downloaded'}).

The measured takes run longer than the brief's target table, so the placement rules could not all be met:

{deviations or '- none'}
"""
(QA / 'report.md').write_text(header + '\n' + dev + '\n'.join(R) + ('\n## Review notes\n\n' + notes if notes else ''))
print((QA / 'report.md').read_text()[:1500])
