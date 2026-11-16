"""Cut the chosen voice takes into one file per line, with word timings for captions.

- The take is normalised to -16 LUFS as a whole, then cut at the silences found by analyse_takes.py.
- Pauses inside a line longer than CAP are shortened to CAP (no word is touched).
- Azerbaijani is sped up by TEMPO with Rubber Band (pitch unchanged) so every variant stays within 45 s.
Writes vo/lines/<lang>/<line>.wav (48 kHz mono float) and vo/lines/<lang>/lines.json.
Run: python3 -I audio/make_lines.py
"""
import json, re, subprocess, sys, pathlib
import numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from analyse_takes import segment, load, env_db, runs, HOP, SR
ROOT = pathlib.Path(__file__).resolve().parents[1]
TAKE = {'en': 2, 'az': 2}
TEMPO = {'en': 1.0, 'az': 1.08}
CAP = 0.25          # longest pause kept inside a line (s)
CAP_SPECIAL = {('en', 'B6'): 0.38, ('az', 'B6'): 0.38}   # the beat after "Why now?"
PRE, POST = 0.04, 0.10

def lufs(path):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[0-9.]+) LUFS', err)[-1])

def write_wav(path, a):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_f32le', str(path)],
                   input=a.astype(np.float32).tobytes(), check=True)

def stretch(a, tempo):
    if tempo == 1.0: return a
    out = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af',
                          f'rubberband=tempo={tempo}:transients=mixed:pitchq=quality', '-f', 'f32le', '-'],
                         input=a.astype(np.float32).tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32).copy()

for lang in ('en', 'az'):
    take = ROOT / f'vo/takes/{lang}-{TAKE[lang]}.mp3'
    gain = 10 ** ((-16 - lufs(take)) / 20)
    a = load(take) * gain
    seg = segment(lang, TAKE[lang])
    e = env_db(a)
    thr = np.percentile(e[e > -90], 95) - 36
    silent = e < thr
    out_dir = ROOT / f'vo/lines/{lang}'; out_dir.mkdir(parents=True, exist_ok=True)
    meta = {'take': f'{lang}-{TAKE[lang]}', 'tempo': TEMPO[lang], 'gain_db': round(20 * np.log10(gain), 2), 'lines': {}}
    lids = list(seg)
    for k, lid in enumerate(lids):
        v = seg[lid]
        t0 = max(0.0, v['on'] - PRE)
        nxt = seg[lids[k + 1]]['on'] if k + 1 < len(lids) else len(a) / SR
        t1 = min(v['off'] + POST, nxt - 0.02)
        # time map: list of (src_time, dst_time) breakpoints for pause removal
        removed = []  # (src_start, length) of removed audio
        cap = CAP_SPECIAL.get((lang, lid), CAP)
        i0, i1 = int(v['on'] / HOP), int(v['off'] / HOP)
        for s, t in runs(silent[i0:i1]):
            L = (t - s) * HOP
            if L > cap:
                mid = (i0 + s) * HOP + L / 2
                cut = L - cap
                removed.append((mid - cut / 2, cut))
        # build the line audio
        pieces, cur = [], t0
        for rs, rl in removed:
            pieces.append(a[int(cur * SR):int(rs * SR)])
            cur = rs + rl
        pieces.append(a[int(cur * SR):int(t1 * SR)])
        # 10 ms crossfades at each join
        x = pieces[0]
        f = int(0.01 * SR)
        for p in pieces[1:]:
            ramp = np.linspace(0, 1, f, dtype=np.float32)
            x = np.concatenate([x[:-f], x[-f:] * (1 - ramp) + p[:f] * ramp, p[f:]])
        fi, fo = int(0.004 * SR), int(0.04 * SR)
        x[:fi] *= np.linspace(0, 1, fi); x[-fo:] *= np.linspace(1, 0, fo)

        def remap(t):
            d = t - t0
            for rs, rl in removed:
                if t > rs + rl: d -= rl
                elif t > rs: d -= (t - rs)
            return d / TEMPO[lang]
        y = stretch(x, TEMPO[lang])
        write_wav(out_dir / f'{lid}.wav', y)
        words = [{'text': w, 'start': round(remap(s), 3), 'end': round(remap(e_), 3)} for w, s, e_ in v['word_times']]
        meta['lines'][lid] = {'file': f'vo/lines/{lang}/{lid}.wav', 'duration': round(len(y) / SR, 3),
                              'speech_on': round(remap(v['on']), 3), 'speech_off': round(remap(v['off']), 3),
                              'removed_pause_s': round(sum(r[1] for r in removed), 2), 'words': words}
        print(lang, lid, f"{len(y) / SR:.2f}s", 'removed', round(sum(r[1] for r in removed), 2), 'speech', meta['lines'][lid]['speech_on'], meta['lines'][lid]['speech_off'])
    json.dump(meta, open(out_dir / 'lines.json', 'w'), indent=1, ensure_ascii=False)
