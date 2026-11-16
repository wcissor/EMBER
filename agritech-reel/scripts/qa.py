"""Measured checks for the six reels (12 files). Writes out/qa/checks.json plus the contact sheets and loop strips.
The text-only checks (safe box, caption contrast, busiest frames) are in scripts/qa_text.py.
scripts/report.py writes out/qa/report.md from both.

Run with:  python3 -I scripts/qa.py
"""
import json, pathlib, re, subprocess
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT, QA = ROOT / 'out', ROOT / 'out/qa'
QA.mkdir(parents=True, exist_ok=True)
TL = json.loads((ROOT / 'src/timeline.json').read_text())
FPS, TAIL = TL['fps'], TL['tail']
W, H = 1080, 1920
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
VARIANTS = [(l, v) for l in ('en', 'az') for v in ('A', 'B', 'C')]
res = {}


def frames_of(lang, v):
    return sum(TL['lines'][lang][l]['frames'] for l in TL['variants'][v]) + TAIL


def starts_of(lang, v):
    out, t = {}, 0
    for l in TL['variants'][v]:
        out[l] = t / FPS
        t += TL['lines'][lang][l]['frames']
    return out


# ---------------- 9. Specs ----------------
def probe(path, expect_frames):
    j = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]))
    v = next(s for s in j['streams'] if s['codec_type'] == 'video')
    a = next(s for s in j['streams'] if s['codec_type'] == 'audio')
    with open(path, 'rb') as fh:
        head = fh.read(4 * 1024 * 1024)
    moov, mdat = head.find(b'moov'), head.find(b'mdat')
    pts = np.array([float(x) for x in subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', str(path)]).decode().split()])
    d = np.diff(np.sort(pts))
    spec = {
        'width': v['width'], 'height': v['height'], 'codec': v['codec_name'], 'profile': v.get('profile'), 'pix_fmt': v['pix_fmt'],
        'r_frame_rate': v['r_frame_rate'], 'avg_frame_rate': v['avg_frame_rate'], 'frames': len(pts), 'expected_frames': expect_frames,
        'frame_interval_max_error_ms': round(float(np.abs(d - 1 / FPS).max()) * 1000, 3),
        'duration': round(float(j['format']['duration']), 3), 'video_bitrate_mbps': round(int(v.get('bit_rate', 0)) / 1e6, 1),
        'audio_codec': a['codec_name'], 'sample_rate': int(a['sample_rate']), 'channels': a['channels'], 'audio_bitrate_kbps': round(int(a.get('bit_rate', 0)) / 1000),
        'faststart': 0 <= moov < mdat if moov >= 0 else False, 'size_mb': round(path.stat().st_size / 1e6, 1),
    }
    spec['pass'] = (spec['width'] == W and spec['height'] == H and spec['codec'] == 'h264' and spec['profile'] == 'High'
                    and spec['pix_fmt'] == 'yuv420p' and spec['r_frame_rate'] == '30/1' and spec['avg_frame_rate'] == '30/1'
                    and spec['frames'] == expect_frames and spec['frame_interval_max_error_ms'] < 1.0
                    and spec['audio_codec'] == 'aac' and spec['sample_rate'] == 48000 and spec['channels'] == 2 and spec['faststart']
                    and 36 <= spec['duration'] <= 45.1)
    return spec


# ---------------- 10. Loudness ----------------
def loud(path):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    i = float(re.findall(r'I:\s+(-?[0-9.]+) LUFS', err)[-1])
    tp = float(re.findall(r'Peak:\s+(-?[0-9.inf]+) dBFS', err)[-1])
    lra = float(re.findall(r'LRA:\s+(-?[0-9.]+) LU', err)[-1])
    return {'integrated_lufs': i, 'true_peak_dbtp': tp, 'lra': lra, 'pass': abs(i + 14) <= 1 and tp <= -1.0}


res['specs'], res['loudness'] = {}, {}
for lang, v in VARIANTS:
    for suffix in ('', '-nomusic'):
        name = f'ruta-agritech-{lang}-{v}{suffix}.mp4'
        res['specs'][name] = probe(OUT / name, frames_of(lang, v))
        res['loudness'][name] = loud(OUT / name)
        print(name, res['specs'][name]['pass'], res['loudness'][name], flush=True)


# ---------------- Frames, decoded once per variant at 270x480 for the picture checks ----------------
def decode(path, w=270, h=480):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-vf', f'scale={w}:{h}:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


def rel_lum(rgb):
    c = rgb / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]


res['comfort'], res['loop'], res['pace'], res['hook_motion'], res['contact_sheets'] = {}, {}, {}, {}, {}
for lang, v in VARIANTS:
    key = f'{lang}-{v}'
    path = OUT / f'ruta-agritech-{key}.mp4'
    F = decode(path)
    n = len(F)

    # 11. Sound off: one frame per second, tiled with its time.
    cols = 9
    rows = -(-int(n / FPS) // cols)
    sheet = QA / f'contact-sheet-{key}.jpg'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(path), '-vf',
                    f"fps=1,scale=270:480,drawtext=fontfile={FONT}:text='%{{eif\\:t\\:d}} s':x=8:y=450:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6,tile={cols}x{rows}:padding=6:color=0x151612",
                    '-frames:v', '1', '-q:v', '3', str(sheet)], check=True)
    res['contact_sheets'][key] = f'out/qa/{sheet.name}'

    # 12. Comfort: flashes. Relative luminance of 16 blocks (each 1/16 of the frame) per frame. A flash is a pair of
    # opposing changes of 10% or more where the darker state is below 0.8 (WCAG 2.x); at most 3 flashes in any second.
    B = []
    for i in range(0, n, 64):  # in chunks, to keep memory low
        L = rel_lum(F[i:i + 64].astype(np.float32))
        B.append(np.stack([L[:, r * 120:(r + 1) * 120, c * 67:(c + 1) * 67].mean(axis=(1, 2)) for r in range(4) for c in range(4)], 1))
    B = np.concatenate(B)
    dL = np.diff(B, axis=0)
    big = (np.abs(dL) >= 0.10) & (np.minimum(B[:-1], B[1:]) < 0.8)
    worst = 0
    for k in range(B.shape[1]):
        ev = np.nonzero(big[:, k])[0]
        sg = np.sign(dL[ev, k])
        for s0 in range(len(dL)):
            m = (ev >= s0) & (ev < s0 + FPS)
            s = sg[m]
            if len(s):
                worst = max(worst, int((np.count_nonzero(np.diff(s) != 0) + 1) // 2))
    res['comfort'][key] = {'flashes_per_second_max': worst, 'max_block_change': round(float(np.abs(dL).max()), 3), 'pass': worst <= 3}

    # 8. Loop: the last frame into the first, compared with the frame-to-frame change inside the reel.
    diffs = np.array([np.abs(F[i + 1].astype(np.int16) - F[i].astype(np.int16)).mean() for i in range(n - 1)])
    loop = float(np.abs(F[-1].astype(np.int16) - F[0].astype(np.int16)).mean())
    # Compared with the motion of the same shot: the hook's first frames and the tail's last frames.
    own = float(np.median(np.concatenate([diffs[:8], diffs[-5:]])))
    res['loop'][key] = {'last_to_first_mean_abs_diff': round(loop, 2), 'same_shot_median_frame_diff': round(own, 2),
                        'reel_median_frame_diff': round(float(np.median(diffs)), 2), 'pass': loop <= 1.5 * own}
    strip = QA / f'loop-{key}.jpg'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-sseof', '-0.2', '-i', str(path), '-i', str(path), '-filter_complex',
                    f"[0:v]scale=216:384,tile=6x1:padding=4:color=0x151612[a];[1:v]trim=end_frame=6,scale=216:384,tile=6x1:padding=4:color=0x151612[b];[a][b]vstack=inputs=2",
                    '-frames:v', '1', '-q:v', '3', str(strip)], check=True)

    # 2. Hook: the first frame already moves.
    res['hook_motion'][key] = {'frame0_to_1_mean_abs_diff': round(float(diffs[0]), 2), 'pass': bool(diffs[0] > 0.3)}

    # 3. Pace: hard cuts found in the picture (frame difference far above its neighbours), then shot lengths.
    cuts = [0]
    for i in range(1, len(diffs) - 1):
        local = np.median(diffs[max(0, i - 8):i + 9])
        if diffs[i] > max(12.0, 4 * local) and i + 1 - cuts[-1] >= 3:
            cuts.append(i + 1)
    cuts.append(n)
    st = starts_of(lang, v)
    q0 = int(round(st['B8'] * FPS))
    shots = [(a / FPS, (b - a) / FPS) for a, b in zip(cuts, cuts[1:])]
    long = [(round(a, 2), round(d, 2)) for a, d in shots if d > 2.5 and not a * FPS >= q0 - 1]
    res['pace'][key] = {'cuts': len(cuts) - 2, 'mean_shot_s': round(float(np.mean([d for _, d in shots])), 2), 'longest_before_question': max([d for a, d in shots if a * FPS < q0 - 1]),
                        'shots_over_2_5s': long, 'line_starts': {k: round(x, 2) for k, x in st.items()}}
    print(key, res['comfort'][key], res['loop'][key], res['hook_motion'][key], res['pace'][key]['shots_over_2_5s'], flush=True)


# ---------------- 2. Hook: the hook's key words, heard within 1.5 s ----------------
KEY = {('en', 'H1'): ['billions', 'indoor', 'farms'], ('az', 'H1'): ['qapalı', 'fermalara', 'milyardlarla'],
       ('en', 'H2'): ['robot', 'burns', 'weeds', 'lasers'], ('az', 'H2'): ['alaq', 'otlarını', 'lazerlə'],
       ('en', 'H3'): ['new', 'zealand', 'cows'], ('az', 'H3'): ['yeni', 'zelandiyada', 'inəklərə']}
res['hook_words'] = {}
for (lang, lid), keys in KEY.items():
    words = TL['lines'][lang][lid]['words']
    norm = lambda s: re.sub(r'[^\wəğıöüşç]', '', s.lower())
    times = {k: next((w['start'] for w in words if norm(w['text']).startswith(k)), None) for k in keys}
    first = min(t for t in times.values() if t is not None)
    res['hook_words'][f'{lang}-{lid}'] = {'first_key_word_s': round(first, 2), 'times': times, 'first_word_s': words[0]['start'], 'pass': first <= 1.5}


# ---------------- 7. Voice: transcript against script, and pace ----------------
def norm_words(s):
    s = s.lower().replace('u.s.', 'us').replace('a.i.', 'ai').replace('300,000', '300000')
    return [w for w in (re.sub(r'[^\wəğıöüşç]', '', x) for x in s.split()) if w]


VOWELS = set('aeəiıoöuü')
res['voice'] = {}
for lang in ('en', 'az'):
    script = json.loads((ROOT / f'vo/script-{lang}.json').read_text())['lines']
    meta = json.loads((ROOT / f'vo/lines/{lang}/lines.json').read_text())
    lines = {}
    for lid, text in script.items():
        sw = norm_words(text)
        tw = norm_words(' '.join(w['text'] for w in meta['lines'][lid]['words']))
        diff = [(a, b) for a, b in zip(sw, tw) if a != b] + ([('length', len(sw), len(tw))] if len(sw) != len(tw) else [])
        lines[lid] = {'script_words': len(sw), 'transcript_words': len(tw), 'differences': diff}
    pace = {}
    for v in 'ABC':
        n_words = n_syl = 0
        speech = 0.0
        for lid in TL['variants'][v]:
            m = TL['lines'][lang][lid]
            n_words += len(m['words'])
            speech += m['speechEnd'] - m['speechStart']  # measured speech on/off (Scribe's last-word ends run long)
            if lang == 'az':
                n_syl += sum(sum(ch in VOWELS for ch in w['text'].lower()) for w in m['words'])
        st = starts_of(lang, v)
        span = st['B8'] + TL['lines'][lang]['B8']['speechEnd'] - TL['lines'][lang][TL['variants'][v][0]]['words'][0]['start']
        pace[v] = {'words': n_words, 'speech_s': round(speech, 2), 'span_s': round(span, 2),
                   'wpm_speaking': round(n_words / speech * 60, 1), 'wpm_overall': round(n_words / span * 60, 1)}
        if lang == 'az':
            pace[v]['syllables_per_s_speaking'] = round(n_syl / speech, 2)
    res['voice'][lang] = {'take': meta.get('take'), 'tempo': meta.get('tempo'), 'lines': lines, 'pace': pace,
                          'transcript_match': all(not x['differences'] for x in lines.values())}

(QA / 'checks.json').write_text(json.dumps(res, indent=1, ensure_ascii=False))
print(json.dumps({k: res[k] for k in ('hook_words', 'voice')}, indent=1, ensure_ascii=False)[:6000])
