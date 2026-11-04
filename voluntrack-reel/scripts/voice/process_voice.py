#!/usr/bin/env python3
"""Cut every line out of its take, apply the placement edits, process, and place it on the film timeline.

Per line : segment [a,b] → remove capped pauses/performed-sound tails (8 ms crossfades) → tempo ≤ 6% (rubberband,
           pitch preserved) → loudness match → L05: last 120 ms ducked 15 dB (cut off by LINK EXPIRED).
Per voice: high-pass 80 Hz, de-ess 6–8 kHz, gentle 3:1 compression (≤ 6 dB reduction), centred.
Outputs  : public/audio/stems/student.wav, public/audio/stems/vt.wav (48 kHz mono),
           public/audio/voiceover.wav (+ .mp3), build/voice_report.json (gain reduction, levels)."""
import json, subprocess, sys
import numpy as np
from pathlib import Path
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[2]
SR = 48000
DUR = 34.0
PL = json.loads((ROOT / 'build/placement.json').read_text())
CFG = json.loads((ROOT / 'build/config.json').read_text())
P = CFG['PLACEMENT']


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def stretch(x, tempo):
    if abs(tempo - 1) < 1e-4:
        return x
    p = subprocess.run(
        ['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', f'rubberband=tempo={tempo:.5f}:pitchq=quality:transients=smooth', '-f', 'f32le', '-'],
        input=x.astype(np.float32).tobytes(), check=True, capture_output=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


def fade(x, ms_in=6, ms_out=10):
    n_in, n_out = int(ms_in * SR / 1000), int(ms_out * SR / 1000)
    x = x.copy()
    if n_in:
        x[:n_in] *= np.linspace(0, 1, n_in)
    if n_out:
        x[-n_out:] *= np.linspace(1, 0, n_out)
    return x


def cut(seg, a, cuts):
    """Remove [c0,c1] (take seconds) from seg (which starts at take time a), 8 ms equal-power crossfades."""
    xf = int(0.008 * SR)
    out = seg
    for c0, c1 in sorted(cuts, reverse=True):
        i0, i1 = int((c0 - a) * SR), int((c1 - a) * SR)
        i0, i1 = max(xf, i0), min(len(out) - xf, i1)
        if i1 <= i0:
            continue
        head, tail = out[:i0 + xf], out[i1:]
        t = np.linspace(0, np.pi / 2, xf)
        mixz = head[-xf:] * np.cos(t) + tail[:xf] * np.sin(t)
        out = np.concatenate([head[:-xf], mixz, tail[xf:]])
    return out


def rms_db(x):
    active = x[np.abs(x) > 1e-4]
    if len(active) == 0:
        return -90.0
    # speech-weighted level: RMS of the loudest 60% of 20 ms frames
    w = int(0.02 * SR)
    fr = [np.sqrt(np.mean(x[i:i + w] ** 2)) for i in range(0, len(x) - w, w)]
    fr = np.sort(np.array(fr))[int(len(fr) * 0.4):]
    return 20 * np.log10(np.sqrt(np.mean(fr ** 2)) + 1e-9)


def chain(x):
    """HPF 80 Hz → de-ess (6–8 kHz) → 3:1 compressor (≤ 6 dB GR)."""
    x = sosfilt(butter(2, 80, btype='high', fs=SR, output='sos'), x)
    # de-esser: dynamic attenuation of the 6–8 kHz band
    band = sosfilt(butter(2, [6000, 8000], btype='band', fs=SR, output='sos'), x)
    env = np.abs(band)
    a = np.exp(-1 / (0.002 * SR)); r = np.exp(-1 / (0.06 * SR))
    e = np.zeros_like(env); v = 0.0
    for i in range(len(env)):
        v = a * v + (1 - a) * env[i] if env[i] > v else r * v + (1 - r) * env[i]
        e[i] = v
    thr = np.percentile(e[e > 1e-5], 90) if np.any(e > 1e-5) else 1
    red = np.clip(thr / (e + 1e-9), 10 ** (-6 / 20), 1)
    x = x - band * (1 - red)
    # compressor on a 10 ms RMS envelope
    sq = x ** 2
    k = int(0.01 * SR)
    env_r = np.sqrt(np.convolve(sq, np.ones(k) / k, mode='same') + 1e-12)
    lev = 20 * np.log10(env_r + 1e-9)
    thr_db = np.percentile(lev[lev > -60], 75) if np.any(lev > -60) else -20
    over = np.maximum(0, lev - thr_db)
    gr = np.minimum(over * (1 - 1 / 3), 6.0)
    att = np.exp(-1 / (0.005 * SR)); rel = np.exp(-1 / (0.08 * SR))
    g = np.zeros_like(gr); v = 0.0
    for i in range(len(gr)):
        v = att * v + (1 - att) * gr[i] if gr[i] > v else rel * v + (1 - rel) * gr[i]
        g[i] = v
    y = x * 10 ** (-g / 20)
    return y, float(np.max(g))


def main():
    takes = {}
    for t in ('student', 'vt'):
        p = ROOT / f'voice_src/takes/{t}.mp3'
        if not p.exists():
            sys.exit(f'missing {p}')
        takes[t] = decode(p)
    n = int(DUR * SR)
    stems = {'S': np.zeros(n), 'V': np.zeros(n)}
    target = -20.0
    report = {'lines': []}
    for L in PL['lines']:
        x = takes[L['take']]
        a, b = L['segment']
        seg = x[int(a * SR):int(b * SR) + int(0.012 * SR)]
        seg = fade(cut(seg, a, L['cuts']))
        seg = stretch(seg, L['tempo'])
        g = target - rms_db(seg)
        seg = seg * 10 ** (g / 20)
        if L['id'] == P['cutoffLine']:
            m = int(P['cutoffDuckMs'] / 1000 * SR)
            ramp = np.ones(len(seg))
            ramp[-m:] = 10 ** (-P['cutoffDuckDb'] / 20)
            ramp[-m - 240:-m] = np.linspace(1, 10 ** (-P['cutoffDuckDb'] / 20), 240)
            seg = seg * ramp
        i0 = int(L['start'] * SR)
        seg = seg[: max(0, n - i0)]
        stems[L['voice']][i0:i0 + len(seg)] += seg
        expect = L['end'] - L['start']
        report['lines'].append({'id': L['id'], 'gain_db': round(g, 2), 'len_s': round(len(seg) / SR, 3), 'planned_s': round(expect, 3)})
    out = ROOT / 'public/audio/stems'
    out.mkdir(parents=True, exist_ok=True)
    for v, name in (('S', 'student'), ('V', 'vt')):
        y, gr = chain(stems[v])
        stems[v] = y
        report[f'{name}_max_gr_db'] = round(gr, 2)
        wavfile.write(out / f'{name}.wav', SR, y.astype(np.float32))
    vo = stems['S'] + stems['V']
    wavfile.write(ROOT / 'public/audio/voiceover.wav', SR, vo.astype(np.float32))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'public/audio/voiceover.wav'), '-ar', '44100', '-b:a', '192k', str(ROOT / 'public/audio/voiceover.mp3')], check=True)
    (ROOT / 'build/voice_report.json').write_text(json.dumps(report, indent=1))
    print(json.dumps({k: v for k, v in report.items() if k != 'lines'}))
    worst = max(abs(r['len_s'] - r['planned_s']) for r in report['lines'])
    print(f'stems written; worst line length vs plan: {worst * 1000:.1f} ms')


if __name__ == '__main__':
    main()
