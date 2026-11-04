#!/usr/bin/env python3
"""Synthesize the sound-effect library in code (section 7: "or synthesize simple versions in code").
Nothing is downloaded. 48 kHz mono float WAVs in public/audio/sfx/.

Prompts from the brief, approximated:
  stamp      heavy rubber stamp slammed through paper onto a wooden desk, single dry hit
  swipe      fast paper card swipe
  swoosh     soft generic message-sent swoosh
  tap        crisp glassy interface tap
  shimmer    airy whoosh with a shimmering tail
  sub        deep gentle sub swell with soft air
  flip       quick clean card-flip whoosh
  chord      warm soft synth chord swell
plus: tick (dry clock tick), crunch (paper), chime (check), note_* (pentatonic), toggle, pop, key, roomtone, fingertap.
"""
import numpy as np
from pathlib import Path
from scipy.signal import butter, sosfilt

SR = 48000
OUT = Path(__file__).resolve().parents[2] / 'public/audio/sfx'
rng = np.random.default_rng(20261104)


def t(d):
    return np.arange(int(d * SR)) / SR


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype='band', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype='high', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype='low', fs=SR, output='sos'), x)


def env(n, a, d, curve=6.0):
    """attack seconds, then exponential decay over d seconds."""
    out = np.zeros(n)
    na = max(1, int(a * SR))
    out[:na] = np.linspace(0, 1, na)
    rest = np.arange(n - na) / SR
    out[na:] = np.exp(-curve * rest / max(d, 1e-4))
    return out


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) + 1e-12
    return x / m * peak


def noise(d):
    return rng.standard_normal(int(d * SR))


def save(name, x):
    from scipy.io import wavfile
    OUT.mkdir(parents=True, exist_ok=True)
    wavfile.write(OUT / f'{name}.wav', SR, np.asarray(x, dtype=np.float32))


def stamp():
    d = 0.45
    tt = t(d)
    f = 95 * np.exp(-tt / 0.05) + 42
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(tt), 0.001, 0.16)
    knock = bp(noise(d), 160, 720) * env(len(tt), 0.0005, 0.07, 7)
    slap = bp(noise(d), 1100, 3600) * env(len(tt), 0.0002, 0.025, 8)
    click = hp(noise(d), 4000) * env(len(tt), 0.0001, 0.006, 8)
    return norm(1.0 * thump + 0.9 * knock + 0.45 * slap + 0.25 * click)


def crunch():
    d = 0.32
    n = int(d * SR)
    x = np.zeros(n)
    k = 0
    while k < n:
        x[k] = rng.uniform(-1, 1) * np.exp(-k / (0.12 * SR))
        k += int(rng.integers(30, 420) * (1 + k / (0.08 * SR)))
    x = bp(x, 1800, 9000) + 0.3 * bp(noise(d), 2500, 7000) * env(n, 0.002, 0.12)
    return norm(x, 0.8)


def swipe(d=0.26):
    n = int(d * SR)
    x = noise(d)
    # sweep band 1.2k → 4.2k
    lo = bp(x, 900, 2500)
    hi = bp(x, 2500, 6500)
    mixv = np.linspace(0, 1, n)
    x = lo * (1 - mixv) + hi * mixv
    e = np.minimum(1, np.arange(n) / (0.05 * SR)) * np.exp(-np.maximum(0, np.arange(n) - 0.05 * SR) / (0.07 * SR))
    return norm(x * e, 0.7)


def swoosh():
    d = 0.42
    n = int(d * SR)
    tt = t(d)
    sweep = np.zeros(n)
    x = noise(d)
    for i, (lo, hi) in enumerate([(400, 1200), (900, 2400), (1800, 4800)]):
        seg = bp(x, lo, hi)
        w = np.clip((tt / d) * 3 - i, 0, 1) * np.clip(i + 1 - (tt / d) * 3, 0, 1) * 1.0
        sweep += seg * (0.4 + w)
    e = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 1.5
    blip_t = np.clip(tt - 0.26, 0, None)
    blip = np.sin(2 * np.pi * (880 + 440 * np.clip(blip_t / 0.05, 0, 1)) * blip_t) * env(n, 0.004, 0.12) * (tt > 0.26)
    return norm(0.5 * sweep * e + 0.35 * blip, 0.6)


def tap(base=2400, d=0.16):
    tt = t(d)
    x = sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / dd) for f, a, dd in [(base, 1, 0.05), (base * 1.63, 0.6, 0.035), (base * 2.37, 0.35, 0.02)])
    x += 0.15 * hp(noise(d), 5000) * env(len(tt), 0.0002, 0.004)
    a = np.minimum(1, tt / 0.0015)
    return norm(x * a, 0.7)


def shimmer(d=1.1):
    n = int(d * SR)
    tt = t(d)
    air = bp(noise(d), 1500, 9000) * (np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2)
    sh = np.zeros(n)
    for i, f in enumerate([4186, 5274, 6272, 7040, 8372]):
        trem = 0.5 + 0.5 * np.sin(2 * np.pi * (9 + i * 1.7) * tt + i)
        sh += np.sin(2 * np.pi * f * tt) * trem * env(n, 0.25, 0.7, 4) / 5
    return norm(0.6 * air + 0.5 * sh, 0.55)


def sub():
    d = 1.4
    tt = t(d)
    sw = np.sin(np.pi * np.clip(tt / 1.1, 0, 1)) ** 1.6
    s = np.sin(2 * np.pi * 48 * tt) * sw + 0.25 * np.sin(2 * np.pi * 96 * tt) * sw
    air = hp(noise(d), 3000) * (np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2) * 0.12
    return norm(s + air, 0.8)


def flip():
    d = 0.36
    n = int(d * SR)
    tt = t(d)
    x = noise(d)
    lo = bp(x, 600, 2000)
    hi = bp(x, 2000, 6000)
    k = np.clip(tt / d, 0, 1)
    e = np.sin(np.pi * k) ** 2
    return norm((lo * (1 - k) + hi * k) * e, 0.6)


def chord(d=2.2):
    tt = t(d)
    freqs = [130.81, 196.0, 261.63, 329.63, 392.0, 587.33]  # C3 G3 C4 E4 G4 D5
    x = np.zeros(len(tt))
    for f in freqs:
        for det in (-0.12, 0.0, 0.12):
            ph = 2 * np.pi * f * (1 + det / 100) * tt
            x += (np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph))
    x = lp(x, 2200)
    e = np.sin(np.pi * np.clip(tt / d, 0, 1) * 0.5) ** 2 * np.exp(-np.clip(tt - d * 0.6, 0, None) / 0.6)
    return norm(x * e, 0.6)


def tick():
    d = 0.06
    tt = t(d)
    ping = np.sin(2 * np.pi * 3200 * tt) * np.exp(-tt / 0.008)
    body = np.sin(2 * np.pi * 900 * tt) * np.exp(-tt / 0.006)
    click = hp(noise(d), 3000) * np.exp(-tt / 0.0012)
    return norm(0.6 * ping + 0.5 * body + 0.6 * click, 0.9)


def chime(f=1318.5, d=0.9):
    tt = t(d)
    x = np.zeros(len(tt))
    for ratio, a, dd in [(1, 1, 0.45), (2.76, 0.35, 0.2), (5.4, 0.15, 0.1), (2.0, 0.25, 0.3)]:
        x += a * np.sin(2 * np.pi * f * ratio * tt) * np.exp(-tt / dd)
    return norm(x * np.minimum(1, tt / 0.002), 0.6)


def note(f, d=0.55):
    tt = t(d)
    x = np.sin(2 * np.pi * f * tt) + 0.18 * np.sin(4 * np.pi * f * tt)
    e = np.minimum(1, tt / 0.012) * np.exp(-tt / 0.22)
    return norm(x * e, 0.6)


def toggle():
    d = 0.05
    tt = t(d)
    return norm(np.sin(2 * np.pi * 2100 * tt) * np.exp(-tt / 0.006) + 0.4 * hp(noise(d), 4000) * np.exp(-tt / 0.002), 0.7)


def pop():
    d = 0.16
    tt = t(d)
    f = 900 * np.exp(-tt / 0.03) + 300
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.035)
    x += 0.3 * bp(noise(d), 2000, 6000) * np.exp(-tt / 0.02)
    return norm(x, 0.6)


def key():
    d = 0.04
    tt = t(d)
    return norm(bp(noise(d), 2500, 7000) * np.exp(-tt / 0.004) + 0.4 * np.sin(2 * np.pi * 1700 * tt) * np.exp(-tt / 0.005), 0.5)


def fingertap():
    d = 0.12
    tt = t(d)
    x = np.sin(2 * np.pi * 180 * tt) * np.exp(-tt / 0.02) + 0.5 * bp(noise(d), 600, 2400) * np.exp(-tt / 0.01)
    return norm(x, 0.6)


def roomtone(d=34.0):
    x = lp(noise(d), 1800, 2) + 0.4 * lp(noise(d), 300, 2)
    return norm(x, 0.5)


if __name__ == '__main__':
    lib = {
        'stamp': stamp(), 'crunch': crunch(), 'swipe': swipe(), 'swipe_fast': swipe(0.18), 'swoosh': swoosh(), 'tap': tap(),
        'tap_low': tap(1800), 'shimmer': shimmer(), 'shimmer_long': shimmer(1.6), 'sub': sub(), 'flip': flip(), 'chord': chord(),
        'tick': tick(), 'chime': chime(), 'chime_hi': chime(1567.98, 0.6), 'toggle': toggle(), 'pop': pop(), 'key': key(),
        'fingertap': fingertap(), 'roomtone': roomtone(),
    }
    for i, f in enumerate([523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66]):  # C5 D5 E5 G5 A5 C6 D6
        lib[f'note_{i}'] = note(f)
    for name, x in lib.items():
        save(name, x)
    print('wrote', len(lib), 'sfx to', OUT)
