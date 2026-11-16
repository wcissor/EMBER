"""Split each voice take into its 13 lines and report pace and pauses.
Cuts sit in the longest silence between the last word of one line and the first word of the next."""
import json, subprocess, sys, pathlib
import numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from lines import ORDER, COUNTS, VARIANTS
ROOT = pathlib.Path(__file__).resolve().parents[1]
SR = 48000
HOP = 0.005

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()

def env_db(a):
    h = int(SR * HOP); n = len(a) // h
    return 20 * np.log10(np.sqrt((a[:n * h].reshape(n, h) ** 2).mean(1) + 1e-12))

def runs(mask):
    """(start, end) index pairs of True runs."""
    out, s = [], None
    for i, m in enumerate(mask):
        if m and s is None: s = i
        if not m and s is not None: out.append((s, i)); s = None
    if s is not None: out.append((s, len(mask)))
    return out

def segment(lang, take):
    a = load(ROOT / f'vo/takes/{lang}-{take}.mp3')
    words = [w for w in json.load(open(ROOT / f'vo/takes/{lang}-{take}.words.json'))['words'] if w['type'] == 'word']
    e = env_db(a)
    thr = np.percentile(e[e > -90], 95) - 36
    silent = e < thr
    groups, i = [], 0
    for lid in ORDER:
        groups.append((lid, words[i:i + COUNTS[lang][lid]])); i += COUNTS[lang][lid]
    # boundaries
    cuts = []  # (offset of previous line, onset of next line) in seconds
    for (l0, w0), (l1, w1) in zip(groups, groups[1:]):
        lo = int((w0[-1]['start'] + 0.08) / HOP); hi = int(w1[0]['end'] / HOP)
        rs = [(s, t) for s, t in runs(silent[lo:hi]) if t - s >= 3]
        if rs:
            s, t = max(rs, key=lambda r: r[1] - r[0])
            cuts.append(((lo + s) * HOP, (lo + t) * HOP))
        else:
            m = (w0[-1]['end'] + w1[0]['start']) / 2
            cuts.append((m, m))
    first_on = next(k for k in range(len(e)) if not silent[k]) * HOP
    last_off = (len(e) - next(k for k in range(len(e)) if not silent[len(e) - 1 - k])) * HOP
    ons = [first_on] + [c[1] for c in cuts]
    offs = [c[0] for c in cuts] + [last_off]
    out = {}
    for (lid, ws), on, off in zip(groups, ons, offs):
        seg = silent[int(on / HOP):int(off / HOP)]
        pauses = [round((t - s) * HOP, 2) for s, t in runs(seg) if (t - s) * HOP >= 0.12]
        dur = off - on
        out[lid] = {'on': round(on, 3), 'off': round(off, 3), 'dur': round(dur, 2), 'words': len(ws), 'pauses': pauses,
                    'gap_after': None, 'wpm': round(len(ws) / dur * 60), 'wpm_no_pauses': round(len(ws) / max(dur - sum(pauses), 0.1) * 60),
                    'word_times': [(w['text'], w['start'], w['end']) for w in ws]}
    for (l0, _), (l1, _) in zip(groups, groups[1:]):
        out[l0]['gap_after'] = round(out[l1]['on'] - out[l0]['off'], 2)
    return out

if __name__ == '__main__':
    res = {}
    for lang in ('en', 'az'):
        for take in (1, 2):
            r = segment(lang, take); res[f'{lang}-{take}'] = r
            print(f'== {lang}-{take}')
            for lid, v in r.items():
                print(f"  {lid:4s} {v['on']:6.2f}-{v['off']:6.2f} dur {v['dur']:5.2f} w {v['words']:2d} wpm {v['wpm']:3d} ({v['wpm_no_pauses']:3d} w/o pauses) pauses {v['pauses']} gap_after {v['gap_after']}")
            for var, seq in VARIANTS.items():
                sp = sum(r[l]['dur'] for l in seq); words = sum(r[l]['words'] for l in seq)
                print(f'   variant {var}: speech {sp:.1f}s, {words} words, {words / sp * 60:.0f} wpm, internal pauses {sum(sum(r[l]["pauses"]) for l in seq):.1f}s')
    json.dump(res, open(ROOT / 'vo/takes/analysis.json', 'w'), indent=1, ensure_ascii=False)
