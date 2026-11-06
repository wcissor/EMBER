"""TEMPORARY natural-sound cues for XO "One Breath", synthesised with NumPy.

The brief's cues are meant to come from ElevenLabs Sound Effects (or the
client). Until those exist, this writes physically-motivated stand-ins to
public/sfx-temp/ so the films are not silent; scripts/render.py uses them only
when public/sfx/ has no cues, and says so loudly.

  room-tone   quiet tatami room: still air + faint garden rustle, seamless loop
  water-drop  one drop into a stone basin: impact, rising bubble resonance
  brush       X1 stroke  (src/timeline.json), loudness/brightness follow the brief's easing
  brush-lift  X2 stroke  (src/timeline.json), speeds up into a quick airy lift
  brush-long  the ensō   (src/timeline.json), one breath, the brush leaves still moving
  bell        small rin bowl: inharmonic partials with slow beating

Deterministic (fixed seeds). 48 kHz stereo, 24-bit WAV.
"""
from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "sfx-temp"
SR = 48000


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def write_wav(path: Path, x: np.ndarray, peak_db: float = -1.0):
    """x: (n, 2) float. Normalises to peak_db and writes 24-bit PCM."""
    x = x / max(np.abs(x).max(), 1e-9) * 10 ** (peak_db / 20)
    q = np.clip(np.round(x * 8388607.0), -8388608, 8388607).astype(np.int32)
    # keep the 3 low bytes of every little-endian int32 (interleaved L, R)
    arr = np.frombuffer(q.astype("<i4").tobytes(), dtype=np.uint8).reshape(-1, 4)[:, :3].tobytes()
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(arr)


def bezier_progress(b, n):
    """Brief's cubic-bezier easing sampled on n points of normalised time."""
    x1, y1, x2, y2 = b
    u = np.linspace(0, 1, 4096)
    bx = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u ** 2 * x2 + u ** 3
    by = 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u ** 2 * y2 + u ** 3
    t = np.linspace(0, 1, n)
    return np.interp(t, bx, by)


def stroke_speed(b, dur, total):
    """Speed envelope (mean 1 over the stroke) sampled at SR over `total` s."""
    n = int(dur * SR)
    p = bezier_progress(b, n)
    v = np.gradient(p) * n
    out = np.zeros(int(total * SR))
    out[:n] = v / max(v.mean(), 1e-9)
    return out


def spectral_noise(n, env, rng, n_fft=1024, hop=256):
    """Noise whose spectrum follows env(frame_time_s, freqs) -> magnitude."""
    freqs = np.fft.rfftfreq(n_fft, 1 / SR)
    win = np.hanning(n_fft)
    frames = n // hop + 6
    out = np.zeros(frames * hop + n_fft)
    norm = np.zeros_like(out)
    for i in range(frames):
        t = (i * hop - n_fft / 2) / SR
        mag = env(max(t, 0.0), freqs)
        ph = rng.uniform(0, 2 * np.pi, len(freqs))
        frame = np.fft.irfft(mag * np.exp(1j * ph), n_fft) * win
        out[i * hop : i * hop + n_fft] += frame
        norm[i * hop : i * hop + n_fft] += win ** 2
    out = out / np.maximum(norm, 1e-6)
    return out[n_fft // 2 : n_fft // 2 + n]


def lowpass_noise(n, hz, rng):
    """Smooth random signal (std ~1) band-limited below hz."""
    k = max(int(SR / hz), 1)
    x = rng.standard_normal(n // k + 3)
    xi = np.interp(np.arange(n) / k, np.arange(len(x)), x)
    return xi / max(xi.std(), 1e-9)


def room_ir(rng, t60_low=1.1, t60_high=0.45, length=1.6, pre=0.012):
    """Small tatami-room impulse response (stereo): early reflections + a
    tail whose highs decay faster."""
    n = int(length * SR)
    irs = []
    for ch in range(2):
        def env(t, f):
            t60 = t60_low + (t60_high - t60_low) * np.clip(np.log2(np.maximum(f, 125) / 125) / 6, 0, 1)
            return np.exp(-6.91 * t / t60) * (f > 60)
        tail = spectral_noise(n, env, rng)
        tail *= np.clip(np.arange(n) / (0.02 * SR), 0, 1)        # soft onset of the diffuse tail
        er = np.zeros(n)
        for d, g in ((0.007, 0.5), (0.011, 0.38), (0.017, 0.3), (0.023, 0.22), (0.031, 0.16)):
            idx = int((d + 0.002 * rng.standard_normal()) * SR)
            if 0 < idx < n:
                er[idx] += g * (1 if rng.random() > 0.5 else -1)
        ir = np.concatenate([np.zeros(int(pre * SR)), er + 0.35 * tail / max(np.abs(tail).max(), 1e-9)])[:n]
        irs.append(ir)
    return np.stack(irs, 1)


def convolve(x, ir):
    """x: (n,) or (n,2); ir: (m,2) -> (n+m-1, 2)."""
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    n = x.shape[0] + ir.shape[0] - 1
    N = 1 << int(math.ceil(math.log2(n)))
    out = np.stack([np.fft.irfft(np.fft.rfft(x[:, c], N) * np.fft.rfft(ir[:, c], N), N)[:n] for c in range(2)], 1)
    return out


def place(dry, ir, wet_db, length):
    """Dry (n,2) + room (wet_db relative), trimmed/padded to length s."""
    n = int(length * SR)
    wet = convolve(dry, ir)
    wet *= 10 ** (wet_db / 20) * (np.abs(dry).max() / max(np.abs(wet).max(), 1e-9))
    out = np.zeros((max(n, wet.shape[0]), 2))
    out[: dry.shape[0]] += dry
    out[: wet.shape[0]] += wet
    out = out[:n]
    f = int(0.01 * SR)
    out[-f:] *= np.linspace(1, 0, f)[:, None]
    return out


def decorrelated(n, env, rng, width=0.35):
    """Stereo pair sharing a centre component, with `width` of independent side."""
    c = spectral_noise(n, env, rng)
    l = spectral_noise(n, env, rng)
    r = spectral_noise(n, env, rng)
    return np.stack([c + width * l, c + width * r], 1) / (1 + width)


# --------------------------------------------------------------------------
# cues
# --------------------------------------------------------------------------
def room_tone(rng, length=20.0, xfade=1.0):
    n = int((length + xfade) * SR)

    def air(t, f):
        f = np.maximum(f, 1.0)
        pink = 1 / np.sqrt(f / 100)
        hp = (f / 45) ** 2 / (1 + (f / 45) ** 2)
        lp = 1 / (1 + (f / 1800) ** 3)
        return pink * hp * lp

    bed = decorrelated(n, air, rng, width=0.6)
    # faint garden rustle: leaves in a light breeze, slow gusts
    def leaves(t, f):
        return np.exp(-0.5 * (np.log2(np.maximum(f, 1) / 3800) / 0.9) ** 2)

    rustle = decorrelated(n, leaves, rng, width=0.8)
    gust = 0.5 + 0.5 * np.tanh(1.6 * lowpass_noise(n, 0.35, rng))
    rustle *= (0.15 + 0.85 * gust)[:, None]
    x = bed / np.abs(bed).std() + 0.22 * rustle / np.abs(rustle).std()
    # seamless loop: equal-power crossfade of the tail into the head
    m = int(xfade * SR)
    a = np.sin(np.linspace(0, np.pi / 2, m))[:, None]
    head = x[:m] * a + x[-m:] * np.cos(np.linspace(0, np.pi / 2, m))[:, None]
    return np.concatenate([head, x[m:-m]], 0)[: int(length * SR)]


def water_drop(rng, ir):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    # impact: a tiny bright tick
    tick = rng.standard_normal(n) * np.exp(-t / 0.0007)
    tick = np.diff(np.concatenate([[0], tick]))  # tilt up
    # bubble resonance rising in pitch (the 'plink')
    def bubble(t0, f0, f1, tau, amp):
        tt = np.clip(t - t0, 0, None)
        f = f0 + (f1 - f0) * (1 - np.exp(-tt / 0.012))
        ph = 2 * np.pi * np.cumsum(f) / SR
        on = (t >= t0).astype(float)
        att = np.clip(tt / 0.0008, 0, 1)
        return amp * on * att * np.sin(ph) * np.exp(-tt / tau)

    x = 0.35 * tick + bubble(0.0015, 1150, 2050, 0.021, 1.0) + bubble(0.034, 2300, 3100, 0.008, 0.22)
    dry = np.stack([x, x], 1)
    garden = room_ir(rng, t60_low=0.5, t60_high=0.25, length=0.8, pre=0.006)
    return place(dry, garden, -17, 2.0)


def brush(rng, ir, easing, stroke, total, lift=0.0, press=1.0, wet_db=-17):
    n = int(total * SR)
    v = stroke_speed(easing, stroke, total)
    t = np.arange(n) / SR
    # touch-down, glide, lift: amplitude follows speed, with a soft press at the start
    att = np.clip(t / 0.03, 0, 1) ** 1.5
    fade = 0.07 + 0.04 * lift
    rel_start = stroke - 0.5 * fade
    rel = np.exp(-((np.clip(t - rel_start, 0, None) / fade) ** 1.6))
    amp = att * rel * (0.25 + np.clip(v, 0, 3)) ** 0.75
    pressure = press * np.exp(-t / (0.35 * stroke + 0.05))
    vmax = max(v.max(), 1e-6)
    hop_t = lambda tt: int(min(max(tt, 0) * SR, n - 1))

    def env(tt, f):
        i = hop_t(tt)
        sp = np.clip(v[i] / vmax, 0, 1)
        fc = 4200 + 6200 * sp + 3000 * lift * sp
        f = np.maximum(f, 1.0)
        hp = (f / 900) ** 2 / (1 + (f / 900) ** 2)
        lp = 1 / (1 + (f / fc) ** 2.5)
        fibre = 1 + 0.6 * np.exp(-0.5 * (np.log2(f / 3300) / 0.45) ** 2)
        body = 0.35 * pressure[i] * np.exp(-0.5 * (np.log2(f / 480) / 0.6) ** 2)
        return (hp * lp * fibre + body) * (f / 1000) ** -0.25

    x = decorrelated(n, env, rng, width=0.3)
    # bristle chatter (paper tooth drag) and sparse fibre ticks
    chatter = np.clip(1 + 0.1 * lowpass_noise(n, 45, rng) * (0.5 + np.clip(v / vmax, 0, 1)), 0.8, 1.2)
    x *= (amp * chatter)[:, None]
    rate = 22 * np.clip(v, 0, 3)
    ticks = (rng.random(n) < rate / SR) * rng.uniform(0.2, 1.0, n)
    k = np.exp(-np.arange(int(0.0012 * SR)) / (0.0003 * SR)) * rng.standard_normal(int(0.0012 * SR))
    tk = np.convolve(ticks, k)[:n]
    x += 0.05 * np.max(np.abs(x)) * np.stack([tk, tk], 1) / max(np.abs(tk).max(), 1e-9)
    return place(x, ir, wet_db, total)


def rin_bell(rng, ir, f0=659.0, length=6.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    # bowl-bell partials (ratio, level, T60 s); each a slightly split doublet
    partials = [(1.000, 1.00, 9.0), (2.756, 0.52, 5.0), (5.404, 0.26, 2.6), (8.933, 0.12, 1.4), (13.34, 0.05, 0.8)]
    x = np.zeros(n)
    for ratio, lvl, t60 in partials:
        f = f0 * ratio
        split = 0.45 + 0.7 * rng.random()                     # Hz: slow, gentle shimmer
        for df, g in ((-split / 2, 0.84), (split / 2, 0.16)):
            ph = rng.uniform(0, 2 * np.pi)
            x += lvl * g * np.sin(2 * np.pi * (f + df) * t + ph) * np.exp(-6.91 * t / t60)
    x *= np.clip(t / 0.0015, 0, 1)
    # felt-mallet strike: a soft, short knock
    knock = rng.standard_normal(n) * np.exp(-t / 0.004)
    knock = np.convolve(knock, np.ones(6) / 6, mode="same")
    x += 0.06 * knock
    dry = np.stack([x, x * 0.98], 1)
    return place(dry, ir, -12, length)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(20261106)
    ir = room_ir(rng)
    X1, X2, O = (0.4, 0, 0.6, 0.85), (0.5, 0, 0.9, 0.6), (0.45, 0, 0.75, 0.85)
    # stroke lengths from the film's timeline (src/timeline.json, Main, 60 fps)
    strokes = __import__("json").loads((ROOT / "src" / "timeline.json").read_text())["main"]["strokes"]
    x1, x2, o = ((strokes[k][1] - strokes[k][0]) / 60 for k in ("x1", "x2", "o"))
    cues = {
        "room-tone": room_tone(rng),
        "water-drop": water_drop(rng, ir),
        "brush": brush(rng, ir, X1, x1, x1 + 0.2, lift=0.1, press=1.0),
        "brush-lift": brush(rng, ir, X2, x2, x2 + 0.2, lift=1.0, press=0.8),
        "brush-long": brush(rng, ir, O, o, o, lift=0.4, press=1.1, wet_db=-15),
        "bell": rin_bell(rng, ir),
    }
    for name, x in cues.items():
        write_wav(OUT / f"{name}.wav", x)
        print(f"{name:10s} {x.shape[0] / SR:5.2f} s")
    (OUT / "README.md").write_text(
        "TEMPORARY synthesised cues (scripts/make_temp_sfx.py). Used only when public/sfx/ has no cues.\n"
        "Replace with ElevenLabs Sound Effects (or the client's files) in public/sfx/.\n")


if __name__ == "__main__":
    main()
