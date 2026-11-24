#!/usr/bin/env python3
"""Original score, sound effects and courtyard ambience, synthesized (section 7: no commercial tracks, no mugham
recordings; Karplus–Strong plucks for the tar). Everything is placed on the language's resolved beats.

  music-<lang>.wav : 1 · the legend (mock-epic tar motif over a soft choir pad, choir hits on the god rays)
                     2 · the kid (a sneaky plucked groove; drops out for the silence and the cat; swells on the reveal)
                     3 · the glow-up and the end (a warm beat at 100 BPM with the same motif; choir; resolves at f1170)
  sfx-<lang>.wav   : every sound effect listed in section 7, on its frame
  amb-<lang>.wav   : night courtyard (city hum, a far dog, wind in the mulberry, a TV murmur, nərd dice, a spoon in a
                     tea glass); dips 6 dB in the silence and the cat beat; muffled in the stairwell

Usage: python3 scripts/audio/synth.py [az|en ...]   (48 kHz stereo, exactly 40.000 s)
"""
import json, sys
import numpy as np
from pathlib import Path
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, lfilter

ROOT = Path(__file__).resolve().parents[2]
SR = 48000
DUR = 40.0
N = int(DUR * SR)
FPS = 30


def fs(frame):
    return frame / FPS


class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, x, t, pan=0.0, gain=1.0):
        i = int(round(t * SR))
        if i >= N or i + len(x) <= 0:
            return
        if i < 0:
            x = x[-i:]
            i = 0
        x = x[: N - i] * gain
        lg = np.cos((pan + 1) * np.pi / 4)
        rg = np.sin((pan + 1) * np.pi / 4)
        self.L[i:i + len(x)] += x * lg
        self.R[i:i + len(x)] += x * rg

    def stereo(self):
        return np.stack([self.L, self.R], axis=1)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype='band', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype='low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype='high', fs=SR, output='sos'), x)


def env(n, a, r, hold=None):
    a_n = max(1, int(a * SR))
    r_n = max(1, int(r * SR))
    e = np.ones(n)
    e[:a_n] = np.linspace(0, 1, a_n) if a_n < n else np.linspace(0, 1, n)
    if hold is not None:
        h = int(hold * SR)
        tail = np.exp(-np.arange(max(0, n - h)) / r_n)
        e[h:] = e[h:] * tail[: n - h] if h < n else e[h:]
    else:
        e[a_n:] = np.exp(-np.arange(n - a_n) / r_n) if a_n < n else e[a_n:]
    return e


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


rng = np.random.default_rng(1170)


def ks(freq, dur, decay=0.996, bright=0.55, seed=0):
    """Karplus–Strong pluck."""
    n = int(dur * SR)
    p = max(2, int(SR / freq))
    r = np.random.default_rng(seed)
    buf = r.uniform(-1, 1, p)
    buf = lp(buf, 1200 + 8000 * bright, 1) if p > 8 else buf
    out = np.zeros(n)
    b = buf.copy()
    idx = 0
    prev = 0.0
    for i in range(n):
        v = b[idx]
        nxt = decay * (0.5 * (v + prev))
        prev = v
        b[idx] = nxt
        out[i] = v
        idx = (idx + 1) % p
    return out


def tar(freq, dur, seed=0):
    """A bright, nasal tar-like pluck: two coupled KS strings, a small slide into the note, a twang."""
    n = int(dur * SR)
    a = ks(freq * 1.0, dur, 0.9975, 0.85, seed)
    b = ks(freq * 2.003, dur, 0.995, 0.9, seed + 1) * 0.35
    x = a + b
    # nasal body: a resonant band around 1.4 kHz
    x = x + 0.6 * bp(x, 1100, 1900)
    # slide: resample the first 40 ms slightly flat → sharp
    t = np.arange(n) / SR
    bend = 1 - 0.03 * np.exp(-t / 0.03)
    idx = np.cumsum(bend)
    idx = np.clip(idx, 0, n - 1)
    x = np.interp(idx, np.arange(n), x)
    return x * env(n, 0.002, dur * 0.45) * 0.5


def pizz(freq, dur, seed=0):
    n = int(dur * SR)
    x = ks(freq, dur, 0.985, 0.35, seed)
    return lp(x, 2400) * env(n, 0.003, 0.09) * 0.8


VOWEL_AA = [(800, 80), (1150, 90), (2900, 120)]


def choir(notes, dur, attack=0.25, release=0.6, bright=1.0, seed=0):
    """Wordless 'aah': detuned saws through vowel formants."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    src = np.zeros(n)
    r = np.random.default_rng(seed)
    for m in notes:
        f0 = midi(m)
        for k in range(5):
            det = 1 + r.uniform(-0.006, 0.006)
            vib = 1 + 0.004 * np.sin(2 * np.pi * (5.1 + r.uniform(-0.4, 0.4)) * t + r.uniform(0, 6))
            ph = np.cumsum(f0 * det * vib) / SR
            src += 2 * (ph % 1.0) - 1
    out = np.zeros(n)
    for fc, bw in VOWEL_AA:
        out += bp(src, fc - bw, fc + bw, 2)
    out = out + 0.15 * lp(src, 600)
    e = np.minimum(1, t / max(1e-3, attack)) * np.exp(-np.maximum(0, t - (dur - release)) / (release / 3))
    out = out * e
    return out / (np.max(np.abs(out)) + 1e-9) * 0.5 * bright


def pad(notes, dur, attack=0.6, release=0.8, cutoff=1400, seed=0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    src = np.zeros(n)
    r = np.random.default_rng(seed)
    for m in notes:
        for k in range(3):
            f0 = midi(m) * (1 + r.uniform(-0.004, 0.004))
            ph = np.cumsum(np.full(n, f0)) / SR
            src += 2 * (ph % 1.0) - 1
    out = lp(src, cutoff, 2)
    e = np.minimum(1, t / attack) * np.exp(-np.maximum(0, t - (dur - release)) / (release / 3))
    out *= e
    return out / (np.max(np.abs(out)) + 1e-9) * 0.4


def sine(freq, dur, attack=0.02, decay=0.6, harm=0.15):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) + harm * np.sin(2 * np.pi * freq * 2 * t)
    return x * np.minimum(1, t / attack) * np.exp(-t / decay)


def noise(n, seed=0):
    return np.random.default_rng(seed).standard_normal(n)


def kick(dur=0.35):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 48 + 90 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.16) * 0.9


def clap(seed=0):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    x = bp(noise(n, seed), 900, 3200)
    e = np.zeros(n)
    for k, d in enumerate([0, 0.011, 0.022]):
        i = int(d * SR)
        e[i:] += np.exp(-(t[: n - i]) / (0.012 if k < 2 else 0.09)) * (0.6 if k < 2 else 1)
    return x * e * 0.5


def hat(seed=0, open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    return hp(noise(n, seed), 7000) * np.exp(-t / (0.06 if open_ else 0.012)) * 0.25


# D Shur-flavoured motif (mock-epic) and its major-pentatonic glow-up version (MIDI notes, beats)
MOTIF_SHUR = [(62, 0.5), (63, 0.25), (66, 0.25), (67, 0.5), (69, 0.5), (67, 0.25), (66, 0.25), (63, 0.5), (62, 1.0)]
MOTIF_MAJOR = [(62, 0.5), (64, 0.25), (66, 0.25), (69, 0.5), (71, 0.5), (69, 0.25), (66, 0.25), (64, 0.5), (62, 1.0)]
PENTA = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86]  # D major pentatonic


def play_motif(bus, motif, t0, beat, transpose=0, gain=1.0, pan=-0.1, seed=0, voice=tar):
    t = t0
    for i, (m, b) in enumerate(motif):
        bus.add(voice(midi(m + transpose), max(0.35, b * beat * 2.2), seed=seed + i), t, pan=pan, gain=gain)
        t += b * beat
    return t


def music(TL):
    B = TL['beats']
    bus = Bus()
    # ── 1 · The legend (f0–whipBack): choir pad + tar motif, choir hits on the god rays
    end1 = fs(B['whipBack'])
    bus.add(pad([50, 57, 62, 65], end1 + 0.6, attack=1.2, release=0.6, cutoff=900, seed=1), 0.0, gain=0.55)
    bus.add(choir([62, 69, 74], end1, attack=1.6, release=0.8, bright=0.5, seed=2), 0.0, gain=0.35)
    beat1 = 60 / 92
    play_motif(bus, MOTIF_SHUR, fs(3), beat1, transpose=12, gain=0.55, pan=-0.15, seed=10)
    for k, name in enumerate(['winA', 'winB', 'winC', 'winD']):
        # a little flourish as each window lights up
        t0 = fs(B[name])
        for j, m in enumerate([74, 76, 78] if k % 2 == 0 else [78, 76, 74]):
            bus.add(tar(midi(m + (k % 2) * 2), 0.6, seed=40 + k * 3 + j), t0 + j * 0.09, pan=0.2, gain=0.32)
    play_motif(bus, MOTIF_SHUR, fs(B['allFour'] - 6), beat1 * 0.8, transpose=12, gain=0.5, pan=-0.1, seed=60)
    for name in ['title', 'rays2']:
        bus.add(choir([62, 66, 69, 74, 78], 2.2, attack=0.08, release=1.4, bright=1.0, seed=hash(name) % 100), fs(B[name]), gain=0.95)
    # ── 2 · The kid (whipBack–flood): a sneaky plucked groove at 100 BPM, D minor
    beat = 0.6
    t = fs(B['whipBack']) + 0.15
    end2 = fs(B['phoneTurn'])
    drops = [(fs(B['silence']) - 0.1, fs(B['plugReach'])), (fs(B['catStep']) - 0.05, fs(B['tumbleLand']) + 0.25)]
    bass = [38, 38, 41, 43, 45, 43, 41, 40]
    top = [74, None, 77, 74, None, 72, 74, None]
    i = 0
    while t < end2:
        if not any(a <= t < b for a, b in drops):
            bus.add(pizz(midi(bass[i % 8]), 0.45, seed=200 + i), t, pan=-0.05, gain=0.8)
            if top[i % 8] is not None:
                bus.add(pizz(midi(top[i % 8]), 0.3, seed=300 + i), t + beat / 2, pan=0.25, gain=0.5)
            if i % 4 == 2:
                bus.add(hat(seed=i), t + beat / 2, pan=0.3, gain=0.6)
        t += beat
        i += 1
    # the warm pad swells on the stairwell reveal and carries the flood
    bus.add(pad([62, 66, 69, 74], fs(B['uiIn']) - end2 + 1.2, attack=0.9, release=0.9, cutoff=2200, seed=7), end2, gain=0.75)
    bus.add(choir([62, 69, 74, 78], fs(B['uiIn']) - end2 + 0.8, attack=0.8, release=0.6, bright=0.6, seed=8), end2 + 0.2, gain=0.4)
    # ── 3 · The glow-up and the end: warm beat at 100 BPM, the motif in major; choir at kidRays; resolve at f1170
    resolve = fs(B['resolve'])
    grid0 = resolve - beat * 4 * 12  # downbeat lands on the resolve
    start3 = fs(B['uiIn'])
    k0 = int(np.ceil((start3 - grid0) / beat))
    for k in range(k0, int((resolve - grid0) / beat)):
        tb = grid0 + k * beat
        pos = k % 4
        bus.add(kick(), tb, gain=0.85 if pos in (0, 2) else 0.0)
        if pos in (1, 3):
            bus.add(clap(seed=k), tb, pan=0.05, gain=0.55)
        bus.add(hat(seed=k), tb + beat / 2, pan=0.25, gain=0.55)
        if pos == 0:
            root = [50, 47, 43, 45][(k // 4) % 4]
            bus.add(lp(pizz(midi(root - 12), 0.55, seed=k) * 1.4, 300), tb, gain=0.9)
            bus.add(pad([root + 12, root + 16 if root != 47 else root + 15, root + 19], beat * 4, attack=0.05, release=0.4, cutoff=1800, seed=k), tb, gain=0.25)
    # the motif rides the beat (twice), the choir returns on the kid's rays
    play_motif(bus, MOTIF_MAJOR, grid0 + beat * 4 * (int((fs(B['deed1']) - grid0) / (beat * 4)) + 0), beat, transpose=12, gain=0.42, pan=-0.15, seed=500)
    play_motif(bus, MOTIF_MAJOR, grid0 + beat * 4 * (int((fs(B['kidStep']) - grid0) / (beat * 4))), beat, transpose=12, gain=0.45, pan=-0.15, seed=520)
    bus.add(choir([62, 66, 69, 74, 78], fs(B['crane']) - fs(B['kidRays']) + 0.4, attack=0.15, release=0.5, bright=0.9, seed=9), fs(B['kidRays']), gain=0.8)
    # the resolve: a big choir chord, a last tar flourish, held to the end
    tail = DUR - resolve
    bus.add(choir([50, 62, 66, 69, 74, 78, 81], tail, attack=0.06, release=tail * 0.9, bright=1.0, seed=11), resolve, gain=1.0)
    bus.add(pad([50, 57, 62, 66, 69], tail, attack=0.05, release=tail * 0.9, cutoff=2600, seed=12), resolve, gain=0.6)
    for j, m in enumerate([62, 66, 69, 74, 78, 81]):
        bus.add(tar(midi(m + 12), 1.4, seed=600 + j), resolve - 0.36 + j * 0.06, pan=-0.2 + j * 0.08, gain=0.3)
    bus.add(kick(0.6), resolve, gain=1.0)
    return bus


# ───────────────────────────── Sound effects ─────────────────────────────
def whoosh(dur=0.45, lo=300, hi=3000, seed=0, rise=False):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = noise(n, seed)
    # sweep a band through the noise
    out = np.zeros(n)
    steps = 12
    for s in range(steps):
        a, b = s * n // steps, (s + 1) * n // steps
        u = s / (steps - 1)
        c = lo * (hi / lo) ** (u if rise else 1 - abs(2 * u - 1))
        out[a:b] = bp(x, max(60, c * 0.6), min(SR / 2 - 100, c * 1.6))[a:b]
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return out * e * 0.6


def tink(freq=2600, dur=0.5):
    return (sine(freq, dur, 0.002, 0.18, 0.4) + 0.4 * sine(freq * 2.76, dur, 0.002, 0.07, 0)) * 0.45


def click_hum(seed=0):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    click = hp(noise(int(0.006 * SR), seed), 2000) * 0.6
    hum = (np.sin(2 * np.pi * 100 * t) + 0.5 * np.sin(2 * np.pi * 200 * t)) * np.minimum(1, t / 0.05) * np.exp(-t / 0.25) * 0.08
    out = hum.copy()
    out[: len(click)] += click
    return out


def beep(freq, dur=0.05):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return np.sign(np.sin(2 * np.pi * freq * t)) * 0.12 * np.minimum(1, t / 0.002) * np.minimum(1, (dur - t) / 0.004)


def thump(dur=0.18, f=90, seed=0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * f * t * (1 - 0.3 * t / dur)) * np.exp(-t / 0.05)
    grit = lp(noise(n, seed), 1200) * np.exp(-t / 0.02) * 0.4
    return (body + grit) * 0.7


def slam(seed=0):
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    x = thump(1.6, 60, seed) * 1.4 + lp(noise(n, seed), 400) * np.exp(-t / 0.08) * 0.5
    # concrete stairwell: a few dense echoes
    out = x.copy()
    for d, g in [(0.045, 0.45), (0.083, 0.35), (0.131, 0.28), (0.197, 0.2), (0.29, 0.12)]:
        i = int(d * SR)
        out[i:] += lp(x[: n - i], 2500) * g
    return out * 0.8


def step(seed=0, soft=False):
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    x = bp(noise(n, seed), 400, 3000) * np.exp(-t / (0.01 if soft else 0.018))
    return x * (0.12 if soft else 0.3)


def yowl(seed=0):
    n = int(0.75 * SR)
    t = np.arange(n) / SR
    f = 520 + 380 * np.sin(np.pi * np.clip(t / 0.7, 0, 1)) - 120 * t
    ph = 2 * np.pi * np.cumsum(f) / SR
    src = np.sign(np.sin(ph)) * 0.5 + np.sin(ph * 2) * 0.3
    out = np.zeros(n)
    for fc, bw in [(900, 200), (1800, 300), (3000, 500)]:
        out += bp(src, fc - bw, fc + bw)
    out *= np.minimum(1, t / 0.03) * np.exp(-np.maximum(0, t - 0.45) / 0.08)
    return out * 0.5


def sparkle(seed=0):
    out = np.zeros(int(0.7 * SR))
    for k, m in enumerate([88, 93, 95, 100]):
        x = sine(midi(m), 0.5, 0.002, 0.12, 0.2)
        i = int(k * 0.05 * SR)
        out[i:i + len(x)] += x[: len(out) - i] * 0.22
    return out


def glass_tap(seed=0):
    return tink(3400, 0.25) * 0.6 + hp(noise(int(0.25 * SR), seed), 4000) * np.exp(-np.arange(int(0.25 * SR)) / SR / 0.004) * 0.15


def tea_clink(seed=0):
    out = np.zeros(int(0.8 * SR))
    for k, (f, g) in enumerate([(3150, 1.0), (4420, 0.6), (3150, 0.5)]):
        x = sine(f, 0.6, 0.001, 0.12, 0.3) + sine(f * 1.51, 0.6, 0.001, 0.05, 0)
        i = int(k * 0.11 * SR)
        out[i:i + len(x)] += x[: len(out) - i] * g * 0.18
    return out


def chime(freq):
    return (sine(freq, 1.4, 0.03, 0.55, 0.25) + 0.3 * sine(freq * 2, 1.4, 0.03, 0.3, 0)) * 0.28


def sfx(TL):
    B = TL['beats']
    bus = Bus()
    s = lambda k: fs(B[k])
    # whips and pushes
    bus.add(whoosh(0.5, seed=1), s('whipStart'), pan=0.3, gain=0.8)
    bus.add(whoosh(0.45, seed=2), s('whipBack'), pan=-0.3, gain=0.8)
    bus.add(whoosh(0.45, 200, 2200, seed=3), s('push'), gain=0.7)
    bus.add(whoosh(0.42, seed=4), fs(B['anaBurst'] - 6), pan=-0.3, gain=0.75)
    bus.add(whoosh(1.4, 120, 2600, seed=5, rise=True), s('crane'), gain=0.6)
    # blue windows: a clean tink each (VolunTrack); the bedroom gets a chime and bloom
    for k in ['winA', 'winB', 'winC', 'winD', 'deed1', 'deed2', 'deed3']:
        bus.add(tink(2600 if k.startswith('win') else 2900), s(k), pan=0.25 if k.startswith('win') else -0.2, gain=0.8)
    bus.add(tink(2900), s('bedroomBlue'), pan=-0.15, gain=0.9)
    bus.add(chime(midi(81)), s('bedroomBlue'), pan=-0.15, gain=0.9)
    # the modem: nervous beeps faster and faster through L09, calm after he's gone
    t = s('plugReach')
    while t < s('flip'):
        u = (t - s('plugReach')) / max(0.1, s('flip') - s('plugReach'))
        bus.add(beep(2200 + 600 * u, 0.04), t, pan=-0.2, gain=0.8)
        t += 1 / (2 + 10 * u)
    for k in range(4):
        bus.add(beep(1800, 0.05), s('bolt') + 0.25 + k * 0.45, pan=-0.2, gain=0.5 * (1 - k / 4))
    bus.add(step(seed=9, soft=True) * 2, s('plugReach') + 1.0, pan=-0.2, gain=0.6)  # the plug
    # the flip, the phone catch, the bolt, the door slam
    bus.add(whoosh(0.3, 400, 4000, seed=6), s('flip'), pan=-0.05, gain=0.6)
    bus.add(glass_tap(7) * 0.6, fs(B['flip'] + 13), pan=-0.05, gain=0.5)
    for k in range(4):
        bus.add(step(seed=20 + k), s('bolt') + k * 0.11, pan=0.1 + k * 0.05, gain=0.8)
    bus.add(slam(3), s('doorSlam'), pan=0.2, gain=0.95)
    # stairwell: his steps (calm), the kid's tiptoes, the cat, the tumble
    st = fs(TL['scenes']['stairs'][0])
    for k in range(5):
        bus.add(step(seed=40 + k), st + k * 0.22, pan=0.15, gain=0.5)
    t = st
    while t < s('catStep'):
        bus.add(step(seed=int(t * 100), soft=True), t, pan=-0.1, gain=0.9)
        t += 0.27
    bus.add(yowl(1), s('catStep'), pan=-0.2, gain=0.85)
    for k in range(3):
        bus.add(thump(0.2, 80 + 10 * k, seed=60 + k), s('catStep') + 0.12 + k * (fs(B['tumbleLand'] - B['catStep']) - 0.2) / 3, pan=-0.05, gain=0.7)
    bus.add(thump(0.3, 70, seed=70), s('tumbleLand'), gain=0.9)
    bus.add(sparkle(1), fs(B['offerHand'] + 6), pan=0.15, gain=0.8)
    bus.add(whoosh(0.7, 300, 5000, seed=8, rise=True), s('phoneTurn'), pan=0.1, gain=0.7)
    # UI: glass taps and notes
    bus.add(glass_tap(10), s('type1'), gain=0.8)
    bus.add(sine(midi(74), 0.5, 0.01, 0.25), s('type1'), gain=0.25)
    bus.add(glass_tap(11), s('type6'), gain=0.8)
    bus.add(sine(midi(78), 0.5, 0.01, 0.25), s('type6'), gain=0.25)
    for i, m in enumerate([74, 78, 81]):
        bus.add(sine(midi(m), 0.9, 0.02, 0.4, 0.2), fs(B['cards'] + 3 * i), pan=-0.1 + 0.1 * i, gain=0.35)
    bus.add(glass_tap(12), s('tap'), gain=1.0)
    bus.add(sine(midi(86), 0.8, 0.01, 0.35, 0.2), s('tap'), gain=0.35)
    bus.add(whoosh(0.6, 500, 3500, seed=13), fs(B['tap'] + 4), gain=0.55)
    # the lights come back on around the new window: warm click-hums in a ripple
    for k in range(7):
        bus.add(click_hum(seed=80 + k), fs(B['cardLand']) + 0.06 * k + 0.02 * (k % 3), pan=-0.3 + 0.1 * k, gain=0.6)
    # tea glass and spoon
    bus.add(tea_clink(2), fs(B['kidStep'] + 8), pan=-0.1, gain=0.9)
    # choir 'aah' hits (three) are in the score; the constellation: one soft rising chime per ring
    rings = TL.get('rings', 9)
    for r in range(rings + 1):
        bus.add(chime(midi(PENTA[min(len(PENTA) - 1, r)] + 12)), fs(B['ripple'] + 3 * r), pan=-0.3 + 0.6 * r / max(1, rings), gain=0.5)
    return bus


# ───────────────────────────── Ambience ─────────────────────────────
def ambience(TL):
    B = TL['beats']
    t = np.arange(N) / SR
    brown = np.cumsum(noise(N, 1))
    brown = hp(brown - np.mean(brown), 25)
    hum = lp(brown, 180) / (np.std(brown) + 1e-9) * 0.25
    wind_mod = 0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t + 1) * np.sin(2 * np.pi * 0.023 * t)
    wind = bp(noise(N, 2), 500, 3500) * (0.04 + 0.08 * wind_mod)
    # TV murmur: band-limited noise with syllable-like modulation, no words
    syl = np.clip(np.sin(2 * np.pi * 3.7 * t) + 0.6 * np.sin(2 * np.pi * 2.3 * t + 0.4), 0, None)
    tv = bp(noise(N, 3), 300, 1600) * syl * 0.035
    L = hum + wind + tv * 0.6
    R = hum + bp(noise(N, 4), 500, 3500) * (0.04 + 0.08 * wind_mod[::-1]) + tv * 0.3
    bus = Bus()
    bus.L += L
    bus.R += R
    # nərd dice from the bench, every ~3.4 s (matching the old man's roll)
    k = 0
    while k * 3.4 < DUR:
        for j in range(3):
            bus.add(step(seed=500 + k * 3 + j, soft=True) * 3, k * 3.4 + 0.05 + j * 0.07, pan=0.1, gain=0.7)
        k += 1
    # a far dog, a spoon in a tea glass now and then
    for tt in [6.5, 19.5, 31.2]:
        n = int(0.25 * SR)
        x = lp(yowl(int(tt)) [:n], 900) * 0.25
        bus.add(x, tt, pan=0.6, gain=0.5)
        bus.add(x, tt + 0.32, pan=0.6, gain=0.35)
    for tt in [9.2, 26.4]:
        bus.add(tea_clink(int(tt)) * 0.4, tt, pan=-0.5, gain=0.6)
    out = bus.stereo()
    # muffled in the stairwell; dips 6 dB in the silence and the cat beat
    a, b = TL['scenes']['stairs']
    sa, sb = int(fs(a) * SR), int(fs(b) * SR)
    for ch in range(2):
        muff = lp(out[:, ch], 700)
        xf = np.zeros(N)
        ramp = int(0.15 * SR)
        xf[sa:sb] = 1
        xf[max(0, sa - ramp):sa] = np.linspace(0, 1, sa - max(0, sa - ramp))
        xf[sb:sb + ramp] = np.linspace(1, 0, min(ramp, N - sb))
        out[:, ch] = out[:, ch] * (1 - xf) + muff * xf
    g = np.ones(N)
    for x0, x1 in [(fs(B['silence']), fs(B['plugReach'])), (fs(B['catStep']), fs(B['tumbleLand']) + 0.2)]:
        i0, i1 = int(x0 * SR), int(x1 * SR)
        g[i0:i1] = 0.5
    g = np.convolve(g, np.ones(int(0.08 * SR)) / int(0.08 * SR), mode='same')
    return out * g[:, None]


def write(path, x):
    x = np.asarray(x, dtype=np.float64)
    peak = np.max(np.abs(x))
    if peak > 0.99:
        x = x / peak * 0.99
    wavfile.write(path, SR, x.astype(np.float32))


def main():
    langs = sys.argv[1:] or ['az', 'en']
    for lang in langs:
        TL = json.loads((ROOT / 'build' / f'timeline-{lang}.json').read_text())
        TL['rings'] = 9
        out = ROOT / 'public' / 'audio'
        out.mkdir(parents=True, exist_ok=True)
        write(out / f'music-{lang}.wav', music(TL).stereo())
        write(out / f'sfx-{lang}.wav', sfx(TL).stereo())
        write(out / f'amb-{lang}.wav', ambience(TL))
        print('synth', lang, 'music + sfx + ambience written')


if __name__ == '__main__':
    main()
