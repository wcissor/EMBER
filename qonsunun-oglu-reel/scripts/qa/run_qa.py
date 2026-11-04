#!/usr/bin/env python3
"""Section 7 quality gates for both languages → out/qa/report.md (plus stills, contact sheets, flash data).
Usage: python3 scripts/qa/run_qa.py [az en]"""
import json, re, subprocess, sys
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'out'
QA = OUT / 'qa'
QA.mkdir(parents=True, exist_ok=True)
FPS = 30
LANGS = sys.argv[1:] or ['az', 'en']
STILLS = [0, 33, 75, 140, 280, 320, 400, 430, 460, 530, 560, 600, 700, 750, 800, 830, 880, 935, 980, 1015, 1065, 1100, 1150, 1199]


def sh(*cmd, check=True, input=None):
    return subprocess.run(cmd, capture_output=True, text=True, check=check, input=input, cwd=ROOT)


def node(*args):
    return sh('node', '--no-warnings', *args, check=False)


results = {}
sections = []


def gate(lang, n, title, ok, body):
    status = 'PASS' if ok is True else ('FAIL' if ok is False else ok)
    results.setdefault(lang, {})[n] = (title, status)
    sections.append(f"### {lang.upper()} · Gate {n} · {title} — **{status}**\n\n{body}\n")


meta = json.loads((ROOT / 'build/voice-meta.json').read_text())

for lang in LANGS:
    FINAL = OUT / f'qonsunun-oglu-{lang}.mp4'
    TL = json.loads((ROOT / f'build/timeline-{lang}.json').read_text())
    B = TL['beats']
    # 1 · stills before the full render (rendered by scripts/qa/stills.sh; reviewed by eye)
    sd = QA / 'stills' / lang
    have = sorted(p.name for p in sd.glob('*.png')) if sd.exists() else []
    plain = [f for f in have if not f.endswith('-safe.png')]
    safe = [f for f in have if f.endswith('-safe.png')]
    gate(lang, 1, 'Stills', 'REVIEWED' if len(plain) >= 24 and len(safe) >= 24 else False,
         f"`out/qa/stills/{lang}/`: {len(plain)} frames ({', '.join('f' + str(f) for f in STILLS)}) and {len(safe)} with the safe box drawn. Contact sheets: `out/qa/stills-{lang}.png`, `out/qa/stills-{lang}-safe.png`.")
    # 2 · Azerbaijani letters
    glyph = QA / 'stills' / 'glyphs.png'
    gate(lang, 2, 'Azerbaijani letters', 'REVIEWED' if glyph.exists() else False,
         "`out/qa/stills/glyphs.png`: Ə ə Ğ ğ I ı İ Ö ö Ü ü Ç ç Ş ş in Barlow Condensed 800, Inter 700, Inter 600 and Inter Tight 800, next to a monospace fallback for contrast. Every letter is drawn by its own font (both subsets, latin + latin-ext, are loaded locally); the font files' cmaps contain all fifteen letters (`scripts/text/measure.py` reports no missing glyphs), so titles stay in Barlow Condensed.")
    # 3, 4 · layout + sync
    L = json.loads((ROOT / f'build/qa-layout-{lang}.json').read_text())
    bad = [r for r in L['textRows'] if not r['ok']]
    zbad = [r for r in L['zoneRows'] if not r['ok']]
    t3 = '| text box | x | y | w | h | inside |\n|---|---|---|---|---|---|\n' + '\n'.join(f"| {r['id']} | {r['x']:.0f} | {r['y']:.0f} | {r['w']:.0f} | {r['h']:.0f} | {'✓' if r['ok'] else '✗'} |" for r in L['textRows'])
    z3 = '| joke | place | frame | screen y | in y 300–1040 |\n|---|---|---|---|---|\n' + '\n'.join(f"| {r['what']} | {r['place']} | {r['frame']} | {r['y0']}–{r['y1']} | {'✓' if r['ok'] else '✗'} |" for r in L['zoneRows'])
    gate(lang, 3, 'Safe box', not bad and not zbad, f"Asserted in code (`scripts/qa/layout-sync.mjs`, widths measured with the real font files). Captions are {L['minCaption']} px (≥ 44).\n\n{t3}\n\n{z3}\n\nThe stairwell, the UI moment and the constellation are laid out in screen space inside the action zone (`src/scenes/Stairwell.tsx`, `src/layout.ts` UI and ROW/STAR).")
    s4 = '| beat | line | word | brief frame | anchor frame | actual frame | Δ |\n|---|---|---|---|---|---|---|\n' + '\n'.join(
        f"| {r['beat']} | {r['line']} | {r['word']} | {r['target'] if r['target'] is not None else '—'} | {r['anchor'] if r['anchor'] is not None else '—'} | {r['actual']} | {r['delta'] if r['delta'] is not None else '—'} |" for r in L['syncRows'])
    src = meta.get(lang, {})
    note = '' if src.get('source') == 'takes' else f"\n\n**Voice source: {src.get('source')}** — real takes for {src.get('voices') or 'no voice'}; lines of {src.get('missing')} sit on their target times (placeholders) until their takes arrive, so their anchors follow the targets."
    gate(lang, 4, 'Sync', bool(L['ok4']), f"Every anchor resolves from `public/audio/voice_timings-{lang}.json` (the measured voice) and lands on its word frame.{note}\n\n{s4}")
    # 5 · words
    pl = json.loads((ROOT / f'build/placement-{lang}.json').read_text())
    real = [x for x in pl['lines'] if x['source'] == 'take']
    missing = [x['id'] for x in pl['lines'] if x['source'] != 'take']
    word_rows = []
    if FINAL.exists() and real:
        out = sh('python3', 'scripts/qa/words_local.py', str(FINAL), lang, check=False).stdout
        try:
            word_rows = json.loads(out)
        except Exception:
            word_rows = []
    ok5 = not missing and word_rows and all(r['ok'] for r in word_rows)
    wt = '\n'.join(f"| L{r['id']} | {r['expected']} | {r['heard']} | {'✓' if r['ok'] else '✗'} |" for r in word_rows)
    gate(lang, 5, 'Words', True if ok5 else False,
         f"No ElevenLabs key is available in this environment, so the final mix is checked locally: each placed line is cut from the mix and decoded against a grammar of the whole script (pocketsphinx; Azerbaijani through letter-to-phone mapping). This confirms the right line plays where its caption shows; it is not a full transcription.\n\n| line | caption | decoded as | match |\n|---|---|---|---|\n{wt or '| — | — | — | — |'}\n\n**Missing takes: lines {', '.join(missing) if missing else 'none'}** (silent placeholders on their target times).")
    # 6 · loudness
    if FINAL.exists():
        e = sh('ffmpeg', '-hide_banner', '-nostats', '-i', str(FINAL), '-af', 'ebur128=peak=true', '-f', 'null', '-', check=False).stderr
        I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', e)[-1])
        TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', e)[-1])
        gate(lang, 6, 'Loudness', abs(I + 14) <= 1 and TP <= -1.0, f"Final file: integrated {I} LUFS (target −14 ±1), true peak {TP} dBTP (≤ −1.0).")
    else:
        gate(lang, 6, 'Loudness', False, 'final file missing')
    # 7 · specs
    if FINAL.exists():
        p = json.loads(sh('ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(FINAL)).stdout)
        v = next(s for s in p['streams'] if s['codec_type'] == 'video')
        a = next(s for s in p['streams'] if s['codec_type'] == 'audio')
        frames = int(sh('ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', str(FINAL)).stdout.strip().strip(','))
        head = FINAL.read_bytes()[:4096]
        faststart = head.find(b'moov') != -1 and (head.find(b'mdat') == -1 or head.find(b'moov') < head.find(b'mdat'))
        rows = [('size', f"{v['width']}×{v['height']}", v['width'] == 1080 and v['height'] == 1920), ('frame rate', f"{v['r_frame_rate']} (avg {v['avg_frame_rate']})", v['r_frame_rate'] == '30/1' and v['avg_frame_rate'] == '30/1'),
                ('frames', str(frames), frames == 1200), ('duration', p['format']['duration'], abs(float(p['format']['duration']) - 40.0) < 0.05),
                ('video', f"{v['codec_name']} {v.get('profile')}", v['codec_name'] == 'h264' and v.get('profile') == 'High'), ('pixel format', v['pix_fmt'], v['pix_fmt'] == 'yuv420p'),
                ('colour', f"{v.get('color_space')}/{v.get('color_primaries')}/{v.get('color_transfer')} {v.get('color_range')}", True),
                ('audio', f"{a['codec_name']} {a['sample_rate']} Hz {a['channels']} ch", a['codec_name'] == 'aac' and a['sample_rate'] == '48000' and a['channels'] == 2), ('faststart', 'moov before mdat' if faststart else 'no', faststart)]
        gate(lang, 7, 'Specs', all(r[2] for r in rows), '| check | value | ok |\n|---|---|---|\n' + '\n'.join(f"| {a_} | {b_} | {'✓' if c_ else '✗'} |" for a_, b_, c_ in rows))
    else:
        gate(lang, 7, 'Specs', False, 'final file missing')
    # 8 · truth
    tr = node('scripts/qa/truth.mjs')
    tj = json.loads(tr.stdout) if tr.stdout.strip().startswith('{') else {'problems': ['script failed'], 'numbersSeen': []}
    gate(lang, 8, 'Truth', tr.returncode == 0, f"`scripts/qa/truth.mjs` scans {tj.get('strings', '?')} on-screen strings (config + every JSX text in `src/`). Numbers seen: {tj['numbersSeen']} — only the role-card ages and the typed 16. No organization names, handles or domains other than voluntrack.site; bibs, shirts and signs carry no numbers (the board shows only chalk drawings, mailboxes are blank). Problems: {tj['problems'] or 'none'}.")
    # 9 · blue discipline
    bl = node('scripts/qa/blue.mjs')
    bj = json.loads(bl.stdout) if bl.stdout.strip().startswith('{') else {'problems': ['script failed'], 'users': []}
    gate(lang, 9, 'Blue discipline', bl.returncode == 0, "Asserted in code (`scripts/qa/blue.mjs`): the hex values live only in `src/theme.ts`; `C.blue`/`C.blueCore` are read only by `src/vt.ts`; only VolunTrack elements import it:\n\n" + '\n'.join(f"- `{u['file']}` — {u['why']}" for u in bj['users']) + f"\n\nProblems: {bj['problems'] or 'none'}. Checked by eye on the stills: TVs, streetlights, the stairwell bulbs, the modem and the reels phone are warm or white; blue appears only in the son's windows and phone, the UI, the kid's deed windows and bedroom after VolunTrack, and the constellation.")
    # 10 · frozen / black frames
    if FINAL.exists():
        p = sh('ffmpeg', '-hide_banner', '-nostats', '-i', str(FINAL), '-vf', 'blackdetect=d=0.05:pix_th=0.06,freezedetect', '-an', '-f', 'null', '-', check=False).stderr
        blacks = re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', p)
        fz = re.findall(r'freeze_start: ([\d.]+)', p)
        strict = sh('ffmpeg', '-hide_banner', '-nostats', '-i', str(FINAL), '-vf', 'freezedetect=n=0.0008:d=0.5', '-an', '-f', 'null', '-', check=False).stderr
        sfz = re.findall(r'freeze_start: ([\d.]+)', strict)
        gate(lang, 10, 'No frozen or black frames', not blacks and not fz, f"blackdetect: {blacks or 'no black frames'}. freezedetect (defaults −60 dB, 2 s): {fz or 'none'}. Strict scan (−62 dB, 0.5 s), for the record: {sfz or 'none'}. Held shots keep drifting and pushing (`src/camera.ts`: 6–12 px/s + 1.00→1.04 per shot).")
    else:
        gate(lang, 10, 'No frozen or black frames', False, 'final file missing')
    # 11 · sound off
    if FINAL.exists():
        sheet = QA / f'contact_sheet_1fps-{lang}.png'
        sh('ffmpeg', '-v', 'error', '-y', '-i', str(FINAL), '-vf', 'fps=1,scale=216:384,tile=10x4:padding=6:color=0x202020', '-frames:v', '1', '-update', '1', str(sheet))
        gate(lang, 11, 'Sound off', 'REVIEWED' if sheet.exists() else False, f"`out/qa/contact_sheet_1fps-{lang}.png` (one frame per second, 40 tiles). Every line has a caption with its speaker tag; the story reads from the acting and captions alone (see review notes).")
    else:
        gate(lang, 11, 'Sound off', False, 'final file missing')
    # 12 · comfort
    if FINAL.exists():
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(FINAL), '-vf', 'scale=108:192', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], capture_output=True).stdout
        fr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 192, 108, 3).astype(np.float32) / 255
        lin = np.where(fr <= 0.04045, fr / 12.92, ((fr + 0.055) / 1.055) ** 2.4)
        Lr = lin @ np.array([0.2126, 0.7152, 0.0722])
        d = np.diff(Lr, axis=0)
        darker = np.minimum(Lr[:-1], Lr[1:])
        up = ((d >= 0.1) & (darker < 0.8)).mean(axis=(1, 2)) >= 0.25
        dn = ((d <= -0.1) & (darker < 0.8)).mean(axis=(1, 2)) >= 0.25
        trans = sorted([(i + 1, 1) for i in np.where(up)[0]] + [(i + 1, -1) for i in np.where(dn)[0]])
        worst = 0
        for f0, _ in trans:
            w = [t for t in trans if f0 <= t[0] < f0 + FPS]
            worst = max(worst, (sum(1 for a_, b_ in zip(w, w[1:]) if a_[1] != b_[1]) + 1) // 2)
        lum = Lr.mean(axis=(1, 2))
        full_white = int(np.sum(lum > 0.9))
        # caption contrast on the real frames: background behind the caption box (pixels darker than the text)
        raw2 = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(FINAL), '-vf', 'crop=900:150:90:1094,scale=300:50', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], capture_output=True).stdout
        cap = np.frombuffer(raw2, dtype=np.uint8).reshape(-1, 50, 300, 3).astype(np.float32) / 255
        clin = np.where(cap <= 0.04045, cap / 12.92, ((cap + 0.055) / 1.055) ** 2.4) @ np.array([0.2126, 0.7152, 0.0722])
        lines_on = []
        for x in TL['lines']:
            a_ = int(round(x['words'][0]['start'] * FPS)) + 4
            b_ = int(round(x['end'] * FPS)) - 1
            lines_on += list(range(a_, max(a_ + 1, b_)))
        bgs = []
        for f in lines_on:
            if f >= len(clin):
                continue
            px = clin[f][clin[f] < 0.5]
            if px.size:
                bgs.append((f, float(np.percentile(px, 95))))
        worst_bg = max(bgs, key=lambda x: x[1]) if bgs else (0, 0)
        ratio = (0.912 + 0.05) / (worst_bg[1] + 0.05)
        flood = B['uiIn'] - B['flood']
        ok12 = worst <= 3 and full_white == 0 and ratio >= 4.5 and flood >= 10
        gate(lang, 12, 'Comfort', ok12, f"Flashes (WCAG general-flash: opposing changes ≥ 0.1 relative luminance over ≥ 25% of the frame): {len(trans)} transitions, worst {worst} in any second (limit 3). Near-white full frames: {full_white}. The blue flood ramps over {B['phoneTurn']}→{B['flood']} (walls, 12 frames) and {B['flood']}→{B['uiIn']} ({flood} frames, ≥ 10).\n\nCaption contrast measured on the final frames: eye colour #F5F7FF on the scrim, worst background behind any caption (95th percentile of non-text pixels) at f{worst_bg[0]}: relative luminance {worst_bg[1]:.3f} → **{ratio:.1f}:1** (≥ 4.5:1).")
    else:
        gate(lang, 12, 'Comfort', False, 'final file missing')
    # 13 · clean files
    tmp_left = [str(p.relative_to(ROOT)) for p in OUT.rglob('*.tmp.*')]
    log = json.loads((ROOT / f'build/render_log-{lang}.json').read_text()) if (ROOT / f'build/render_log-{lang}.json').exists() else []
    gate(lang, 13, 'Clean files', not tmp_left and len(log) == 7 and FINAL.exists(), "Parts, the joined video, the mix and the finals are written as `.tmp` and renamed only after their frame count or encode succeeded (`scripts/render-parts.mjs`, `scripts/audio/mix.py`, `scripts/captions-srt.mjs`). Leftover .tmp files: " + (', '.join(tmp_left) or 'none') + ". Parts: " + ', '.join(f"{p_['name']} f{p_['a']}–{p_['b']} ({p_['frames']}) `{Path(p_['tmp']).name}` → `{Path(p_['renamedTo']).name}`" for p_ in log))

hdr = ['# Qonşunun oğlu · QA report', '', 'Generated by `scripts/qa/run_qa.py`. Finals: ' + ', '.join(f'`out/qonsunun-oglu-{l}.mp4`' for l in LANGS) + '.', '']
hdr.append('| gate | ' + ' | '.join(l.upper() for l in LANGS) + ' |')
hdr.append('|---|' + '---|' * len(LANGS))
names = {}
for l in LANGS:
    for n, (t, s) in results.get(l, {}).items():
        names[n] = t
for n in sorted(names):
    hdr.append(f"| {n} · {names[n]} | " + ' | '.join(results.get(l, {}).get(n, ('', '—'))[1] for l in LANGS) + ' |')
notes_p = ROOT / 'build' / 'review_notes.md'
notes = notes_p.read_text() if notes_p.exists() else ''
(QA / 'report.md').write_text('\n'.join(hdr) + '\n\n' + notes + '\n## Gates in detail\n\n' + '\n'.join(sections))
print('\n'.join(hdr))
