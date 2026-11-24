#!/usr/bin/env python3
"""Part 2 mix: dialogue first (part 1's chain: cut from the take, ≤6% tempo, high-pass, de-ess, 3:1 compression,
each line to −20 LUFS; courtyard shouts get the slap-back off the opposite block, stairwell lines the stairwell
reverb). Music ~14 dB under the voices, ducking a further 6 dB under speech and lifting in long silences; ambience
~16 dB under; sound effects ~7 dB under. Every version (A, A-reply, B, C) is assembled from the same stems along
its segment list, then mastered to −14 LUFS integrated with a true peak under −1 dBTP; each also without music.
Writes public/audio/stems/az/<voice>.wav and public/audio/mix-<version>[-nomusic].wav. Usage: python3 scripts/audio/mix2.py
"""
import json, sys, tempfile, subprocess
import numpy as np
from pathlib import Path
from scipy.io import wavfile

sys.path.insert(0, str(Path(__file__).parent))
import mix as M  # noqa: E402  (part 1's DSP: decode, loudness, atempo, hp, lp, deess, compress, reverb, slapback, pan, place, envelope)

ROOT = Path(__file__).resolve().parents[2]
SR = M.SR
FPS = 30
TL = json.loads((ROOT / 'build' / 'timeline-az.json').read_text())
B = TL['beats']
DUR = B['end'] / FPS
N = int(round(DUR * SR))
VOICES = ['ana', 'men', 'qo', 'qq', 'qz']
SHOUTS = {'P01', 'P03', 'P17', 'P18'}
STAIRS = {'P11', 'P12', 'P13'}
PAN = {'ana': -0.22, 'men': -0.08, 'qo': 0.18, 'qq': 0.22, 'qz': 0.05}
VOICE_FX = {'qq': 'rubberband=pitch=1.1225'}  # Qonşu is Sona lifted 2 semitones, as in part 1
TARGET_LINE = -20.0


def read(path, n=None):
    sr, x = wavfile.read(path)
    x = x.astype(np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    n = n or N
    if len(x) < n:
        x = np.pad(x, ((0, n - len(x)), (0, 0)))
    return x[:n]


def setlu(x, target):
    lu = M.loudness(x.mean(axis=1))
    return x * 10 ** ((target - lu) / 20)


def dialogue():
    pl = json.loads((ROOT / 'build' / 'placement-az.json').read_text())
    cache = {}
    stems = {v: np.zeros(N + SR * 3) for v in VOICES}
    dL = np.zeros(N + SR * 3)
    dR = np.zeros(N + SR * 3)
    report = {'lines': [], 'missing': []}
    for L in pl['lines']:
        if L['source'] != 'take':
            report['missing'].append(L['id'])
            continue
        fpath = ROOT / L['src']['file']
        key = (fpath, L['voice'])
        if key not in cache:
            cache[key] = M.decode(fpath, af=VOICE_FX.get(L['voice']))
        take = cache[key]
        a = max(0, int((L['src']['start'] - 0.03) * SR))
        b = min(len(take), int((L['src']['end'] + 0.08) * SR))
        x = take[a:b].copy()
        fi, fo = int(0.01 * SR), int(0.04 * SR)
        x[:fi] *= np.linspace(0, 1, fi)
        x[-fo:] *= np.linspace(1, 0, fo)
        x = M.atempo(x, L['tempo'])
        x = M.hp(x, 80, 2)
        x = M.deess(x)
        x, gr = M.compress(x)
        lu = M.loudness(x)
        target = TARGET_LINE + (1.5 if L['id'] in SHOUTS else 0)
        x = x * 10 ** ((target - lu) / 20)
        t0 = L['start'] - 0.03 / max(L['tempo'], 1)
        M.place(stems[L['voice']], x, t0)
        y = x
        if L['id'] in SHOUTS:
            y = M.slapback(M.lp(M.hp(y, 120), 9000))
        elif L['id'] in STAIRS:
            y = M.reverb(y, 1.2, 0.15, seed=int(L['id'][1:]))
        l, r = M.pan(y, PAN[L['voice']])
        M.place(dL, l, t0)
        M.place(dR, r, t0)
        report['lines'].append({'id': L['id'], 'voice': L['voice'], 'loudness_in': round(lu, 1), 'gain_db': round(target - lu, 1), 'max_gr_db': round(gr, 1), 'tempo': L['tempo']})
    sd = ROOT / 'public' / 'audio' / 'stems' / 'az'
    sd.mkdir(parents=True, exist_ok=True)
    for v in VOICES:
        if np.any(stems[v]):
            wavfile.write(sd / f'{v}.wav', SR, stems[v][:N].astype(np.float32))
        elif (sd / f'{v}.wav').exists():
            (sd / f'{v}.wav').unlink()
    return np.stack([dL[:N], dR[:N]], axis=1), pl, report


def master(x, out):
    with tempfile.TemporaryDirectory() as td:
        pre = Path(td) / 'pre.wav'
        wavfile.write(pre, SR, x.astype(np.float32))
        meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(pre), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
        js = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
        dur = len(x) / SR
        af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:measured_LRA={js['input_lra']}:"
              f"measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true,aresample=48000,apad,atrim=0:{dur:.6f}")
        tmp = out.with_suffix('.tmp.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(pre), '-af', af, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', str(tmp)], check=True)
        tmp.replace(out)
    o = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(out), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    tail = o[o.rfind('Summary:'):]
    import re
    I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', tail).group(1))
    TP = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', tail).group(1))
    return I, TP


def assemble(stem, segs, title=None):
    """Cut the A-timeline stem along a segment list; `title` is the title card's own audio (or None for silence)."""
    parts = []
    xf = int(0.008 * SR)
    for s in segs:
        if s[0] == 'film':
            a, b = int(round(s[1] / FPS * SR)), int(round(s[2] / FPS * SR))
            parts.append(stem[a:b].copy())
        else:
            n = int(round(s[1] / FPS * SR))
            parts.append(title[:n].copy() if title is not None else np.zeros((n, 2)))
    for p in parts:
        p[:xf] *= np.linspace(0, 1, xf)[:, None]
        p[-xf:] *= np.linspace(1, 0, xf)[:, None]
    return np.concatenate(parts, axis=0)


def main():
    dlg, pl, report = dialogue()
    music = setlu(read(ROOT / 'public/audio/music-a.wav'), TARGET_LINE - 14)
    amb = setlu(read(ROOT / 'public/audio/amb-a.wav'), TARGET_LINE - 16)
    sfx_level = TARGET_LINE - 7 - M.loudness(read(ROOT / 'public/audio/sfx-a.wav').mean(axis=1))
    sfx = read(ROOT / 'public/audio/sfx-a.wav') * 10 ** (sfx_level / 20)
    pop1 = read(ROOT / 'public/audio/sfx-pop1.wav') * 10 ** (sfx_level / 20)
    tn = int(round(TL['titleLen'] / FPS * SR))
    t_music = read(ROOT / 'public/audio/title-music.wav', tn) * 10 ** ((TARGET_LINE - 14 - M.loudness(read(ROOT / 'public/audio/music-a.wav').mean(axis=1))) / 20)
    t_sfx = read(ROOT / 'public/audio/title-sfx.wav', tn) * 10 ** (sfx_level / 20)
    # the night ambience under the title card: the opening's
    t_amb = amb[:tn].copy()
    # sidechain: music −6 dB under speech (30 ms / 250 ms), lifted +6 dB in silences ≥ 1 s away from any line
    speech = np.zeros(N)
    for L in pl['lines']:
        speech[max(0, int(L['start'] * SR)):min(N, int(L['end'] * SR))] = 1
    key = M.envelope(np.abs(dlg).mean(axis=1), 0.03, 0.25)
    key = np.clip(key / (np.percentile(key[speech > 0], 70) + 1e-9) if np.any(key[speech > 0]) else key * 0, 0, 1)
    duck_db = -6 * np.maximum(key, speech * 0.7)
    quiet = np.ones(N)
    for L in pl['lines']:
        quiet[max(0, int((L['start'] - 1.0) * SR)):min(N, int((L['end'] + 1.0) * SR))] = 0
    k = int(0.4 * SR)
    quiet = np.convolve(quiet, np.ones(k) / k, mode='same')
    music = music * (10 ** ((duck_db + 6 * quiet) / 20))[:, None]
    out = ROOT / 'public' / 'audio'
    res = {}
    for v, segs in TL['segments'].items():
        has_bubble = v == 'A'
        d = assemble(dlg, segs)
        mu = assemble(music, segs, t_music)
        am = assemble(amb, segs, t_amb)
        fx = assemble(sfx + (pop1 if has_bubble else 0), segs, t_sfx)
        for name, mixx in [(f'mix-{v}', d + mu + am + fx), (f'mix-{v}-nomusic', d + am + fx)]:
            I, TP = master(mixx, out / f'{name}.wav')
            res[name] = {'seconds': round(len(mixx) / SR, 3), 'I': I, 'TP': TP}
            print(f'{name}: {len(mixx) / SR:.3f} s, {I:.1f} LUFS, true peak {TP:.1f} dBTP')
    report['masters'] = res
    (ROOT / 'build' / 'mix-az.json').write_text(json.dumps(report, indent=1))
    print('lines from takes:', len(report['lines']), '; waiting for takes:', report['missing'])


if __name__ == '__main__':
    main()
