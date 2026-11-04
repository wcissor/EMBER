#!/usr/bin/env python3
"""Original cue (section 7): minimal warm electronic, 120 BPM, soft plucked arpeggio, round sub,
light kick + shaker, hopeful major key (C), no vocals. Enters with the rays, builds gently, lands the logo on
a downbeat and resolves on a held chord. Bars fall every 120 frames from the entry.
Reads build/timeline.json; writes public/audio/music.wav (48 kHz stereo, exactly 34.000 s)."""
import json
import numpy as np
from pathlib import Path
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[2]
TL = json.loads((ROOT / 'build/timeline.json').read_text())
SR = 48000
FPS = 60
DUR = 34.0
N = int(DUR * SR)
rng = np.random.default_rng(120)

entry_f = TL['music']['entryFrame']
logo_f = TL['music']['logoFrame']
# resolve on the beat nearest the target (f2016), never later than the film allows
resolve_target = TL['music']['resolveFrame']
beat_f = 30
resolve_beat = round((resolve_target - entry_f) / beat_f)
resolve_f = entry_f + resolve_beat * beat_f
bars = (resolve_f - entry_f) / 120

L = np.zeros(N)
R = np.zeros(N)


def sec(frame):
    return frame / FPS


def add(x, start_s, pan=0.0, gain=1.0):
    i = int(start_s * SR)
    if i >= N or i + len(x) <= 0:
        return
    if i < 0:
        x = x[-i:]
        i = 0
    x = x[: N - i] * gain
    lg = np.cos((pan + 1) * np.pi / 4)
    rg = np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(x)] += x * lg
    R[i:i + len(x)] += x * rg


def lp(x, f):
    return sosfilt(butter(2, f, btype='low', fs=SR, output='sos'), x)


def hp(x, f):
    return sosfilt(butter(2, f, btype='high', fs=SR, output='sos'), x)


NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def hz(name, octave):
    return 440.0 * 2 ** ((NOTE[name] + 12 * (octave + 1) - 69) / 12)


CHORDS = {
    'C': (['C', 'E', 'G'], 'C'),
    'G': (['G', 'B', 'D'], 'G'),
    'Am': (['A', 'C', 'E'], 'A'),
    'F': (['F', 'A', 'C'], 'F'),
}
prog = ['C', 'G', 'Am', 'F'] * 3


def chord_at_bar(b):
    if b >= 10:
        return 'C' if b == 10 else 'F'
    return prog[b]


def pluck(f, d=0.42):
    t = np.arange(int(d * SR)) / SR
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.08) + 0.12 * np.sin(6 * np.pi * f * t) * np.exp(-t / 0.05)
    return x * np.minimum(1, t / 0.003) * np.exp(-t / 0.18)


def pad(freqs, d, cutoff):
    t = np.arange(int(d * SR)) / SR
    x = np.zeros(len(t))
    for f in freqs:
        for det in (-0.08, 0.08):
            ph = 2 * np.pi * f * (1 + det / 100) * t
            x += 2 / np.pi * np.arcsin(np.sin(ph)) + 0.15 * np.sin(2 * ph)
    x = lp(x, cutoff)
    a = np.minimum(1, t / 0.35)
    r = np.minimum(1, (d - t) / 0.3)
    return x * a * np.clip(r, 0, 1) / len(freqs)


def subbass(f, d):
    t = np.arange(int(d * SR)) / SR
    x = np.sin(2 * np.pi * f * t) + 0.15 * np.sin(4 * np.pi * f * t)
    return lp(x, 220) * np.minimum(1, t / 0.02) * np.minimum(1, np.clip((d - t) / 0.08, 0, 1))


def kick():
    d = 0.22
    t = np.arange(int(d * SR)) / SR
    f = 70 * np.exp(-t / 0.04) + 44
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)


def shaker(accent):
    d = 0.06
    t = np.arange(int(d * SR)) / SR
    return hp(rng.standard_normal(len(t)), 6000) * np.exp(-t / (0.012 if not accent else 0.02))


beat_s = 0.5
nbars = int(np.ceil(bars))
for b in range(nbars + 1):
    bar_f = entry_f + b * 120
    if bar_f >= resolve_f:
        break
    name = chord_at_bar(b)
    tones, root = CHORDS[name]
    bar_s = sec(bar_f)
    intensity = min(1.0, 0.35 + b * 0.07)
    if b == 10:
        intensity = 1.0
    if b >= 11:
        intensity = 0.8
    # pad: from the entry, opening its filter as it builds
    cutoff = 900 + 160 * b
    add(pad([hz(n, 4) for n in tones] + [hz(root, 3)], 2.05, cutoff), bar_s, 0.0, 0.55 * (0.5 + 0.5 * min(1, b / 2)))
    # arpeggio (8ths) from bar 1
    if b >= 1:
        seq = [hz(root, 4), hz(tones[1], 4), hz(tones[2], 4), hz(root, 5), hz(tones[2], 4), hz(tones[1], 4), hz(tones[2], 4), hz(root, 5)]
        for i, f in enumerate(seq):
            s = bar_s + i * beat_s / 2
            if s * FPS >= resolve_f:
                break
            add(pluck(f), s, -0.18 if i % 2 else 0.18, 0.32 * intensity)
    # round sub from bar 2 (half notes)
    if b >= 2:
        for h in range(2):
            s = bar_s + h * 1.0
            if s * FPS >= resolve_f:
                break
            add(subbass(hz(root, 2), 0.95), s, 0.0, 0.5)
    # light kick (beats 1 & 3) + shaker (16ths) from bar 4
    if b >= 4:
        for k in (0, 2):
            s = bar_s + k * beat_s
            if s * FPS < resolve_f:
                add(kick(), s, 0.0, 0.55 * intensity)
        dens = 16 if b >= 8 else 8
        for i in range(dens):
            s = bar_s + i * (2.0 / dens)
            if s * FPS >= resolve_f:
                break
            add(shaker(i % 2 == 1), s, 0.25 if i % 2 else -0.25, (0.05 if i % 2 == 0 else 0.08) * intensity)
    # gentle riser into the logo downbeat
    if b == 9:
        d = 2.0
        t = np.arange(int(d * SR)) / SR
        x = hp(rng.standard_normal(len(t)), 2500) * (t / d) ** 2.5 * 0.12
        add(x, bar_s, 0.0, 1.0)

# held chord at the resolve: plagal arrival on C, ringing out to the end
hold_s = sec(resolve_f)
hold_d = DUR - hold_s
if hold_d > 0.05:
    add(pad([hz('C', 4), hz('E', 4), hz('G', 4), hz('C', 3), hz('D', 5)], hold_d, 2400), hold_s, 0.0, 0.7)
    for i, f in enumerate([hz('C', 4), hz('G', 4), hz('C', 5), hz('E', 5)]):
        add(pluck(f, 0.9), hold_s + i * 0.03, -0.2 + 0.13 * i, 0.3)
    add(subbass(hz('C', 2), min(1.2, hold_d)), hold_s, 0.0, 0.5)

mix = np.stack([L, R], axis=1)
# fade to silence by the last frame so the loop starts dry (the before world has no music)
fade = int(0.12 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix[: int(sec(entry_f) * SR)] = 0
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.8
out = ROOT / 'public/audio/music.wav'
wavfile.write(out, SR, mix.astype(np.float32))
print(f'music: entry f{entry_f}, logo downbeat f{entry_f + 1200} (logo f{logo_f}), resolve f{resolve_f} (bar {bars:.2f}) -> {out}')
