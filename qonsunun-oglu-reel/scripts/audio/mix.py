#!/usr/bin/env python3
"""Dialogue-first mix (section 7).

Voice: each placed line is cut from its take (never a word cut), time-stretched only if the placement asked for it
(≤6%), high-passed at 80 Hz, de-essed, compressed gently (3:1, ≤6 dB of reduction) and matched in loudness.
Courtyard shouts (L01, L19, L20) get a slap-back echo off the opposite block (90 ms, −14 dB) and a touch of distance
EQ; stairwell lines (L11–L15) get a 1.2 s stairwell reverb at 15% wet; room lines stay dry. Voices pan toward their
windows (Ana left, the neighbor's son right, ≤ ±25%); the UI moment is centred.
Music sits ~18 dB under the dialogue and ducks a further 8 dB while anyone speaks (sidechain 30 ms / 250 ms); in long
stretches with no dialogue (the UI moment, the end card) it comes up to lead. Ambience ~−30 dB, never stops.
Master: −14 LUFS integrated, true peak ≤ −1 dBTP, 48 kHz stereo, exactly 40.000 s.

Writes public/audio/stems/<lang>/<voice>.wav (48 kHz, the light that breathes with the voice) and
public/audio/mix-<lang>.wav. Usage: python3 scripts/audio/mix.py [az|en ...]
"""
import json, re, subprocess, sys, tempfile
import numpy as np
from pathlib import Path
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = Path(__file__).resolve().parents[2]
SR = 48000
DUR = 40.0
N = int(DUR * SR)
FPS = 30
VOICES = ['ana', 'men', 'qo', 'qq']
SHOUTS = {'01', '19', '20'}
STAIRS = {'11', '12', '13', '14', '15'}
PAN = {'ana': -0.25, 'qo': 0.25, 'qq': 0.22, 'men': -0.08}
PAN_LINE = {'11': 0.0, '12': 0.15, '13': -0.05, '14': 0.15, '15': 0.15, '16': -0.12, '17': -0.12, '18': -0.12, '21': -0.12}


def decode(path, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def loudness(x, sr=SR):
    """Integrated loudness (LUFS) via ffmpeg ebur128."""
    with tempfile.NamedTemporaryFile(suffix='.wav') as f:
        wavfile.write(f.name, sr, x.astype(np.float32))
        out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f.name, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', out)
    return float(m[-1]) if m else -70.0


def atempo(x, tempo):
    if abs(tempo - 1) < 1e-4:
        return x
    with tempfile.NamedTemporaryFile(suffix='.wav') as a, tempfile.NamedTemporaryFile(suffix='.wav') as b:
        wavfile.write(a.name, SR, x.astype(np.float32))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.name, '-af', f'atempo={tempo:.5f}', b.name], check=True)
        return decode(b.name)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, btype='high', fs=SR, output='sos'), x)


def lp(x, f, o=2):
    return sosfilt(butter(o, f, btype='low', fs=SR, output='sos'), x)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], btype='band', fs=SR, output='sos'), x)


def envelope(x, attack, release):
    a = np.exp(-1 / (attack * SR))
    r = np.exp(-1 / (release * SR))
    e = np.zeros_like(x)
    v = 0.0
    ax = np.abs(x)
    for i in range(len(x)):
        c = ax[i]
        v = (a if c > v else r) * v + (1 - (a if c > v else r)) * c
        e[i] = v
    return e


def compress(x, ratio=3.0, max_gr=6.0, thresh_db=-22.0):
    e = envelope(x, 0.005, 0.12)
    lvl = 20 * np.log10(np.maximum(e, 1e-6))
    over = np.maximum(0, lvl - thresh_db)
    gr = np.minimum(max_gr, over * (1 - 1 / ratio))
    return x * 10 ** (-gr / 20), float(np.max(gr))


def deess(x, thresh=0.06):
    s = bp(x, 5000, 9500)
    e = envelope(s, 0.002, 0.05)
    g = np.where(e > thresh, thresh / np.maximum(e, 1e-9), 1.0)
    g = np.maximum(g, 10 ** (-6 / 20))
    return x - s + s * g


def reverb(x, decay=1.2, wet=0.15, seed=0, damp=4000):
    n = int(decay * 1.5 * SR)
    t = np.arange(n) / SR
    ir = np.random.default_rng(seed).standard_normal(n) * np.exp(-6.9 * t / decay)
    ir = lp(ir, damp)
    ir[: int(0.012 * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    y = fftconvolve(x, ir)[: len(x) + n]
    out = np.zeros(len(y))
    out[: len(x)] += x * (1 - wet)
    out += y * wet
    return out


def slapback(x, delay=0.09, db=-14):
    i = int(delay * SR)
    y = np.zeros(len(x) + i)
    y[: len(x)] += x
    y[i:] += lp(hp(x, 300), 3500) * 10 ** (db / 20)
    return y


def pan(x, p):
    return x * np.cos((p + 1) * np.pi / 4), x * np.sin((p + 1) * np.pi / 4)


def place(dst, x, t):
    i = int(round(t * SR))
    if i < 0:
        x = x[-i:]
        i = 0
    n = min(len(x), len(dst) - i)
    if n > 0:
        dst[i:i + n] += x[:n]


def read_wav(path):
    sr, x = wavfile.read(path)
    x = x.astype(np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    if len(x) < N:
        x = np.pad(x, ((0, N - len(x)), (0, 0)))
    return x[:N]


def mix(lang):
    pl = json.loads((ROOT / 'build' / f'placement-{lang}.json').read_text())
    TL = json.loads((ROOT / 'build' / f'timeline-{lang}.json').read_text())
    B = TL['beats']
    takes_cache = {}
    stems = {v: np.zeros(N) for v in VOICES}
    dL = np.zeros(N + SR * 3)
    dR = np.zeros(N + SR * 3)
    report = {'lines': [], 'missing': [], 'callback': None}
    TARGET_LINE = -20.0
    for L in pl['lines']:
        if L['source'] != 'take':
            report['missing'].append(L['id'])
            continue
        f = ROOT / L['src']['file']
        if f not in takes_cache:
            takes_cache[f] = decode(f)
        take = takes_cache[f]
        a = max(0, int((L['src']['start'] - 0.03) * SR))
        b = min(len(take), int((L['src']['end'] + 0.08) * SR))
        x = take[a:b].copy()
        fi, fo = int(0.01 * SR), int(0.04 * SR)
        x[:fi] *= np.linspace(0, 1, fi)
        x[-fo:] *= np.linspace(1, 0, fo)
        x = atempo(x, L['tempo'])
        x = hp(x, 80, 2)
        x = deess(x)
        x, gr = compress(x)
        lu = loudness(x)
        target = TARGET_LINE + (1.5 if L['id'] in SHOUTS else 0) - (2.5 if L['id'] == '11' else 0)
        x = x * 10 ** ((target - lu) / 20)
        t0 = L['start'] - 0.03 / max(L['tempo'], 1)
        place(stems[L['voice']], x, t0)
        y = x
        if L['id'] in SHOUTS:
            y = slapback(lp(hp(y, 120), 9000))
        elif L['id'] in STAIRS:
            y = reverb(y, 1.2, 0.15, seed=int(L['id']))
        p = PAN_LINE.get(L['id'], PAN[L['voice']])
        l, r = pan(y, p)
        place(dL, l, t0)
        place(dR, r, t0)
        report['lines'].append({'id': L['id'], 'voice': L['voice'], 'loudness_in': round(lu, 1), 'gain_db': round(target - lu, 1), 'max_gr_db': round(gr, 1), 'tempo': L['tempo']})
    # the "16" callback: "on altı" / "sixteen" sliced from L06 by its word timings, −10 dB, long reverb
    l06 = next((x for x in pl['lines'] if x['id'] == '06'), None)
    if l06 and l06['source'] == 'take':
        take = takes_cache.get(ROOT / l06['src']['file'])
        if take is None:
            take = decode(ROOT / l06['src']['file'])
        words = l06['words']
        idx = [1, 2] if lang == 'az' else [len(words) - 1]
        ws = (words[idx[0]]['start'] - l06['start']) * l06['tempo'] + l06['src']['start']
        we = (words[idx[-1]]['end'] - l06['start']) * l06['tempo'] + l06['src']['start']
        cb = take[int((ws - 0.02) * SR):int((we + 0.05) * SR)].copy()
        cb *= 10 ** (-10 / 20) * 10 ** ((TARGET_LINE - loudness(cb)) / 20)
        cb = reverb(cb, 3.2, 0.55, seed=6, damp=3000)
        l, r = pan(cb, 0)
        place(dL, l, B['type1'] / FPS - 0.05)
        place(dR, r, B['type1'] / FPS - 0.05)
        report['callback'] = {'from': 'L06', 'at_frame': B['type1'], 'words': [words[i]['word'] for i in idx]}
    else:
        report['callback'] = 'skipped: L06 (Ana) take not supplied yet'
    dlg = np.stack([dL[:N], dR[:N]], axis=1)
    sd = ROOT / 'public' / 'audio' / 'stems' / lang
    sd.mkdir(parents=True, exist_ok=True)
    for v in VOICES:
        wavfile.write(sd / f'{v}.wav', SR, stems[v].astype(np.float32))

    music = read_wav(ROOT / 'public' / 'audio' / f'music-{lang}.wav')
    sfx = read_wav(ROOT / 'public' / 'audio' / f'sfx-{lang}.wav')
    amb = read_wav(ROOT / 'public' / 'audio' / f'amb-{lang}.wav')
    # levels relative to the dialogue reference (−20 LUFS per line)
    def setlu(x, target):
        lu = loudness(x.mean(axis=1)) if x.ndim == 2 else loudness(x)
        return x * 10 ** ((target - lu) / 20)
    music = setlu(music, TARGET_LINE - 18 + 6)  # the bed between lines; ducks under speech below
    amb = setlu(amb, TARGET_LINE - 16)
    sfx = setlu(sfx, TARGET_LINE - 7)
    # sidechain: −8 dB while anyone speaks (30 ms attack, 250 ms release); music-led when nobody speaks for long
    speech = np.zeros(N)
    for L in pl['lines']:
        i0, i1 = int(L['start'] * SR), int(L['end'] * SR)
        speech[max(0, i0):min(N, i1)] = 1
    key = envelope(np.abs(dlg).mean(axis=1), 0.03, 0.25)
    key = np.clip(key / (np.percentile(key[speech > 0], 70) + 1e-9) if speech.any() else key * 0, 0, 1)
    duck_db = -8 * np.maximum(key, speech * 0.6)
    # long silences (≥ 1.5 s with no line) lift the music to lead; smoothed over 0.4 s
    quiet = np.ones(N)
    marks = sorted([(L['start'], L['end']) for L in pl['lines']])
    for s, e in marks:
        quiet[max(0, int((s - 1.0) * SR)):min(N, int((e + 1.0) * SR))] = 0
    k = int(0.4 * SR)
    quiet = np.convolve(quiet, np.ones(k) / k, mode='same')
    music_gain = 10 ** ((duck_db + 7 * quiet) / 20)
    music = music * music_gain[:, None]
    master = dlg + music + amb + sfx
    with tempfile.TemporaryDirectory() as td:
        pre = Path(td) / 'pre.wav'
        wavfile.write(pre, SR, master.astype(np.float32))
        meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(pre), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
        js = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
        out = ROOT / 'public' / 'audio' / f'mix-{lang}.wav'
        tmp = out.with_suffix('.tmp.wav')
        af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:measured_LRA={js['input_lra']}:"
              f"measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true,aresample=48000,apad,atrim=0:{DUR}")
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(pre), '-af', af, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', str(tmp)], check=True)
        tmp.replace(out)
    (ROOT / 'build' / f'mix-{lang}.json').write_text(json.dumps(report, indent=1))
    print(f"mix {lang}: {len(report['lines'])} lines from takes, missing {report['missing'] or 'none'}; callback: {report['callback']}")


if __name__ == '__main__':
    for lang in sys.argv[1:] or ['az', 'en']:
        mix(lang)
