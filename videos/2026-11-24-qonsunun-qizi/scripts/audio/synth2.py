#!/usr/bin/env python3
"""Part 2's score, sound effects and ambience, synthesized in code with part 1's instruments and its motif
(scripts/audio/synth.py: Karplus–Strong tar, pizzicato, choir, pad, drums; MOTIF_SHUR / MOTIF_MAJOR in D).

  music-a.wav : 1 the hook (mock-epic pad + the tar motif, a choir hit on the title stamp) · 2 the kid's smug groove,
                then one note per lit window, faster and faster, and the music stops dead before "Yenə?!" · 3 the list
                (choir pad, a tar flourish per deed window, a dry button on "səviyyədir") · 4 the sneaky stairwell
                groove (out for the cat), a sting on "o göstərib" · 5 the warm 100 BPM beat with the motif in major,
                confetti, the window's glow · 6 morning (light tar, a warm chord on "…Həyətimizə bax.") · 7 out before
                her line to camera, lifts after it · 8 one note of the motif per ring of the star, resolving on D,
                then the opening pad comes back in for the loop
  sfx-a.wav   : one sound per event (pop1 kept separately in sfx-pop1.wav: version A-reply has no first bubble)
  amb-a.wav   : night courtyard / stairwell / phone room tone / morning yard (birds, a broom, kids) / evening
  title.wav   : the B/C title card (stamp + choir hit), 45 frames
Usage: python3 scripts/audio/synth2.py
"""
import json, sys
import numpy as np
from pathlib import Path
from scipy.io import wavfile

sys.path.insert(0, str(Path(__file__).parent))
import synth as S  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SR = S.SR
FPS = 30
TL = json.loads((ROOT / 'build' / 'timeline-az.json').read_text())
B = TL['beats']
DUR = B['end'] / FPS + 0.5
S.DUR = DUR
S.N = int(DUR * SR)
N = S.N
f = lambda k: B[k] / FPS
midi = S.midi
tar, pizz, choir, pad, kick, clap, hat = S.tar, S.pizz, S.choir, S.pad, S.kick, S.clap, S.hat
COLUMN_ORDER = ['qz5', 'qz6', 'qz4', 'qz7', 'qz3', 'qz8', 'qz2', 'qz9', 'qz1']
GAPS = [0, 5, 4, 4, 3, 3, 2, 2, 2]
column_on = [B['herWin']]
at = B['column']
for g in GAPS[1:]:
    at += g
    column_on.append(at)
RINGS = int(TL.get('starRings', 11))
RING_GAP = 3


def gate(bus, t0, t1, fade=0.012):
    """Silence the bus between t0 and t1 (hard 'stop dead' with a 12 ms fade)."""
    i0, i1 = int(t0 * SR), int(t1 * SR)
    k = int(fade * SR)
    g = np.ones(N)
    g[i0:i1] = 0
    g[max(0, i0 - k):i0] = np.linspace(1, 0, i0 - max(0, i0 - k))
    if i1 < N:
        g[i1:i1 + k] = np.linspace(0, 1, min(k, N - i1))
    bus.L *= g
    bus.R *= g


def music():
    bus = S.Bus()
    # ── 1 · hook: the pad, the motif, a choir hit on the title stamp
    end1 = f('s2')
    bus.add(pad([50, 57, 62, 65], end1 + 0.4, attack=0.5, release=0.4, cutoff=900, seed=1), 0.0, gain=0.55)
    bus.add(choir([62, 69, 74], end1, attack=0.6, release=0.5, bright=0.5, seed=2), 0.0, gain=0.3)
    S.play_motif(bus, S.MOTIF_SHUR, 0.05, 60 / 120, transpose=12, gain=0.5, pan=-0.15, seed=10)
    bus.add(choir([62, 66, 69, 74, 78], 2.0, attack=0.05, release=1.2, bright=1.0, seed=21), f('title'), gain=0.95)
    bus.add(kick(0.5), f('title'), gain=0.9)
    # ── 2 · the kid's smug groove, then a note per lit window (faster and faster), stop dead before "Yenə?!"
    beat = 0.6
    t = f('s2') + 0.05
    i = 0
    while t < f('herWin') / 1.0 - 0.05:
        bus.add(pizz(midi([38, 41, 43, 45][i % 4]), 0.45, seed=200 + i), t, pan=-0.05, gain=0.75)
        if i % 2 == 1:
            bus.add(pizz(midi(74 if i % 4 == 1 else 77), 0.3, seed=300 + i), t + beat / 2, pan=0.25, gain=0.45)
        bus.add(hat(seed=i), t + beat / 2, pan=0.3, gain=0.4)
        t += beat
        i += 1
    for k, fr in enumerate(column_on):
        bus.add(tar(midi(S.PENTA[min(len(S.PENTA) - 1, k + 2)] + 12), 0.5, seed=400 + k), fr / FPS, pan=0.25, gain=0.45)
    gate(bus, f('musicStop'), f('deed1') - 0.35)
    # ── 3 · the list: choir pad, a flourish per deed window, a dry button on "səviyyədir"
    t3 = f('deed1') - 0.3
    end3 = f('button')
    bus.add(pad([50, 57, 62, 65], end3 - t3 + 0.2, attack=0.4, release=0.15, cutoff=1100, seed=3), t3, gain=0.5)
    bus.add(choir([62, 69, 74], end3 - t3, attack=0.5, release=0.2, bright=0.6, seed=4), t3, gain=0.3)
    for k, name in enumerate(['deed1', 'deed2', 'deed3']):
        for j, m in enumerate([74, 76, 78] if k % 2 == 0 else [78, 76, 74]):
            bus.add(tar(midi(m + (k % 2) * 2), 0.6, seed=40 + k * 3 + j), f(name) + j * 0.09, pan=0.2, gain=0.32)
    S.play_motif(bus, S.MOTIF_SHUR, f('count') - 0.1, 60 / 110, transpose=12, gain=0.42, pan=-0.1, seed=60)
    gate(bus, end3 - 0.02, f('stairs') + 0.05)
    # the button itself: one dry staccato chord + kick, right on the end of the line
    for m in [50, 57, 62, 65, 69]:
        bus.add(pizz(midi(m), 0.22, seed=700 + m), end3, gain=0.5)
    bus.add(kick(0.25), end3, gain=0.8)
    # ── 4 · the stairwell groove; out for the cat; the sting on "o göstərib"
    t = f('stairs') + 0.05
    i = 0
    drops = [(f('catOver') - 0.05, f('catOver') + 0.75)]
    bass = [38, 38, 41, 43, 45, 43, 41, 40]
    top = [74, None, 77, 74, None, 72, 74, None]
    while t < f('phoneIn'):
        if not any(a <= t < b for a, b in drops):
            bus.add(pizz(midi(bass[i % 8]), 0.45, seed=500 + i), t, pan=-0.05, gain=0.75)
            if top[i % 8] is not None:
                bus.add(pizz(midi(top[i % 8]), 0.3, seed=550 + i), t + beat / 2, pan=0.25, gain=0.45)
            if i % 4 == 2:
                bus.add(hat(seed=i), t + beat / 2, pan=0.3, gain=0.5)
        t += beat
        i += 1
    bus.add(choir([62, 66, 69, 74], 1.4, attack=0.03, release=1.0, bright=0.9, seed=31), f('sting'), gain=0.75)
    for j, m in enumerate([74, 78, 81]):
        bus.add(tar(midi(m), 0.7, seed=620 + j), f('sting') + j * 0.07, pan=0.15, gain=0.35)
    # ── 5 · the warm beat at 100 BPM, the motif in major; confetti; the window glows
    t5 = f('phoneIn')
    end5 = f('morning')
    k = 0
    tb = t5
    while tb < end5 - 0.1:
        pos = k % 4
        if pos in (0, 2):
            bus.add(kick(), tb, gain=0.8)
        if pos in (1, 3):
            bus.add(clap(seed=k), tb, pan=0.05, gain=0.5)
        bus.add(hat(seed=k), tb + beat / 2, pan=0.25, gain=0.5)
        if pos == 0:
            root = [50, 47, 43, 45][(k // 4) % 4]
            bus.add(S.lp(pizz(midi(root - 12), 0.55, seed=k) * 1.4, 300), tb, gain=0.85)
            bus.add(pad([root + 12, root + 16 if root != 47 else root + 15, root + 19], beat * 4, attack=0.05, release=0.4, cutoff=1800, seed=k), tb, gain=0.22)
        tb += beat
        k += 1
    S.play_motif(bus, S.MOTIF_MAJOR, f('pageOpen'), beat, transpose=12, gain=0.4, pan=-0.15, seed=800)
    bus.add(choir([62, 66, 69, 74, 78], 1.6, attack=0.05, release=1.0, bright=1.0, seed=32), f('tick'), gain=0.7)
    bus.add(choir([62, 69, 74, 78], end5 - f('winGlow') + 0.6, attack=0.2, release=0.5, bright=0.8, seed=33), f('winGlow'), gain=0.6)
    # ── 6 · morning: light tar arpeggios in D major over a soft pad; a warm chord on "…Həyətimizə bax."
    t6 = f('morning')
    end6 = f('toCam') - 0.15
    bus.add(pad([50, 57, 62, 66], end6 - t6, attack=0.3, release=0.3, cutoff=1600, seed=5), t6, gain=0.4)
    t = t6 + 0.1
    i = 0
    arp = [62, 66, 69, 74, 69, 66]
    while t < f('soften') - 0.1:
        bus.add(tar(midi(arp[i % 6] + 12), 0.5, seed=900 + i), t, pan=-0.2 + 0.4 * ((i % 6) / 5), gain=0.28)
        t += 0.3
        i += 1
    bus.add(pad([50, 62, 66, 69, 74], end6 - f('soften') + 0.3, attack=0.2, release=0.4, cutoff=2400, seed=6), f('soften'), gain=0.65)
    bus.add(choir([62, 66, 69, 74], end6 - f('soften'), attack=0.3, release=0.4, bright=0.7, seed=34), f('soften'), gain=0.5)
    # ── 7 · out before her line to camera; lifts after it
    gate(bus, end6, f('musicLift'))
    bus.add(choir([62, 66, 69, 74, 78], 1.2, attack=0.35, release=0.4, bright=0.9, seed=35), f('musicLift') - 0.2, gain=0.6)
    # ── 8 · one note of the motif per ring of the star; the last resolves on D; the opening pad returns for the loop
    notes = [m for m, _ in S.MOTIF_MAJOR]
    for r in range(RINGS + 1):
        m = notes[r] if r < len(notes) else notes[-1]
        if r == RINGS:
            m = 62
        bus.add(tar(midi(m + 12), 1.0, seed=1000 + r), (B['starOn'] + r * RING_GAP) / FPS, pan=-0.3 + 0.6 * r / max(1, RINGS), gain=0.42)
        bus.add(S.chime(midi(m + 24)), (B['starOn'] + r * RING_GAP) / FPS, pan=-0.3 + 0.6 * r / max(1, RINGS), gain=0.22)
    res = (B['starOn'] + RINGS * RING_GAP) / FPS
    tail = f('end') - res
    bus.add(choir([50, 62, 66, 69, 74, 78], tail, attack=0.06, release=tail * 0.7, bright=1.0, seed=36), res, gain=0.8)
    bus.add(pad([50, 57, 62, 66, 69], tail, attack=0.05, release=tail * 0.7, cutoff=2600, seed=12), res, gain=0.5)
    bus.add(kick(0.5), res, gain=0.8)
    # the loop: the hook's pad fades back in under the crane, at the level it starts with
    bus.add(pad([50, 57, 62, 65], f('end') - f('loopBack') + 0.3, attack=0.5, release=0.05, cutoff=900, seed=1), f('loopBack'), gain=0.55)
    return bus


def sfx():
    bus = S.Bus()
    pop1 = S.Bus()
    s = f

    def pop(b, t):
        b.add(S.glass_tap(3) * 0.7, t, gain=0.9)
        b.add(S.sine(midi(81), 0.25, 0.005, 0.12, 0.1), t, gain=0.35)
    pop(pop1, (B['bubble1'] + 1) / FPS)
    bus.add(S.slam(3), s('doorBang'), pan=-0.25, gain=0.9)
    bus.add(S.thump(0.25, 65, seed=4), s('title'), gain=1.0)
    bus.add(S.whoosh(0.35, 400, 3500, seed=5), s('title') - 0.12, gain=0.5)
    bus.add(S.whoosh(0.45, seed=6), s('whipToHer'), pan=0.3, gain=0.8)
    # one switch click per window (+ the VolunTrack tink)
    for k, fr in enumerate(column_on):
        bus.add(S.click_hum(seed=10 + k) * 0.8, fr / FPS - 0.02, pan=0.3, gain=0.6)
        bus.add(S.tink(2600 + 60 * k), fr / FPS, pan=0.3, gain=0.5)
    for k in ['deed1', 'deed2', 'deed3']:
        bus.add(S.tink(2900), s(k), pan=0.25, gain=0.7)
    # the stairwell: tiptoes, the careful step over the cat, a meow, her steps, the box thud, his door
    t = s('stairs')
    while t < s('catOver'):
        bus.add(S.step(seed=int(t * 100), soft=True), t, pan=-0.15, gain=0.8)
        t += 0.27
    n = int(0.32 * SR)
    meow = S.lp(S.yowl(2)[:n], 2400) * np.linspace(1, 0.2, n)
    bus.add(meow, s('catOver') + 0.25, pan=-0.3, gain=0.6)
    bus.add(S.step(seed=77, soft=True) * 1.4, (B['catOver'] + 16) / FPS, pan=-0.1, gain=0.8)
    t = s('stairs') + 0.1
    while t < s('bump'):
        bus.add(S.step(seed=int(t * 77)), t, pan=0.2, gain=0.45)
        t += 0.42
    bus.add(S.thump(0.28, 85, seed=9), s('bump'), pan=0.05, gain=1.0)
    bus.add(S.glass_tap(9) * 0.3, s('bump') + 0.05, pan=0.05, gain=0.5)
    bus.add(S.slam(5) * 0.35, (B['nodUp'] - 8) / FPS, pan=0.35, gain=0.5)
    # the phone
    pop(bus, s('msgPop'))
    for k in ['linkTap', 'signTap', 'applyTap']:
        bus.add(S.glass_tap(12), s(k), gain=0.9)
    bus.add(S.glass_tap(13), (B['signTap'] + 15) / FPS, gain=0.8)
    for j in range(7):
        bus.add(S.beep(3100 + 90 * j, 0.018), (B['signTap'] + 3) / FPS + j * 0.035, gain=0.35)
    bus.add(S.whoosh(0.3, 500, 4000, seed=14), s('pageOpen') - 0.05, gain=0.45)
    bus.add(S.whoosh(0.25, 600, 5000, seed=15), s('formFlash') - 0.03, gain=0.4)
    bus.add(S.whoosh(0.25, 5000, 600, seed=16), s('backRole') - 0.03, gain=0.4)
    bus.add(S.sparkle(2), s('tick'), gain=0.9)
    for j, m in enumerate([74, 78, 81, 86]):
        bus.add(S.chime(midi(m)), s('tick') + j * 0.05, pan=-0.2 + 0.13 * j, gain=0.35)
    bus.add(S.chime(midi(81)), s('winGlow'), pan=-0.1, gain=0.6)
    # morning: broom sweeps and rustling bags while the yard is on screen
    for t in np.arange(s('morning') + 0.2, s('qqPoint') - 0.1, 0.42):
        sw = S.bp(S.noise(int(0.28 * SR), int(t * 1000)), 1800, 7000) * np.hanning(int(0.28 * SR)) * 0.5
        bus.add(sw, t, pan=-0.2, gain=0.7)
    for t in np.arange(s('bubble2') - 0.05, s('dusk') - 0.3, 0.9):
        sw = S.bp(S.noise(int(0.28 * SR), int(t * 1000) + 7), 1800, 7000) * np.hanning(int(0.28 * SR)) * 0.25
        bus.add(sw, t, pan=-0.4, gain=0.5)
    pop(bus, (B['bubble2'] + 1) / FPS)
    bus.add(S.whoosh(0.9, 2600, 200, seed=17), s('loopBack'), gain=0.55)
    return bus, pop1


def birds(n, seed=0):
    rng = np.random.default_rng(seed)
    x = np.zeros(n)
    t = 0.0
    while t < n / SR - 0.4:
        k = int(t * SR)
        dur = 0.06 + rng.random() * 0.12
        m = int(dur * SR)
        tt = np.arange(m) / SR
        f0 = 2600 + rng.random() * 2200
        sweep = f0 * (1 + 0.35 * np.sin(2 * np.pi * (6 + rng.random() * 8) * tt))
        ph = 2 * np.pi * np.cumsum(sweep) / SR
        chirp = np.sin(ph) * np.hanning(m) * (0.3 + 0.7 * rng.random())
        for rep in range(1 + int(rng.random() * 3)):
            j = k + int(rep * (dur + 0.03) * SR)
            if j + m < n:
                x[j:j + m] += chirp * 0.5
        t += 0.25 + rng.random() * 0.9
    return x


def ambience():
    t = np.arange(N) / SR
    brown = np.cumsum(S.noise(N, 1))
    brown = S.hp(brown - np.mean(brown), 25)
    hum = S.lp(brown, 180) / (np.std(brown) + 1e-9) * 0.25
    wind_mod = 0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t + 1) * np.sin(2 * np.pi * 0.023 * t)
    wind = S.bp(S.noise(N, 2), 500, 3500) * (0.04 + 0.08 * wind_mod)
    syl = np.clip(np.sin(2 * np.pi * 3.7 * t) + 0.6 * np.sin(2 * np.pi * 2.3 * t + 0.4), 0, None)
    tv = S.bp(S.noise(N, 3), 300, 1600) * syl * 0.035
    night = np.stack([hum + wind + tv * 0.6, hum + S.bp(S.noise(N, 4), 500, 3500) * (0.04 + 0.08 * wind_mod[::-1]) + tv * 0.3], axis=1)
    stair = np.stack([S.lp(night[:, 0], 700) * 0.9, S.lp(night[:, 1], 700) * 0.9], axis=1)
    room = np.stack([S.lp(brown, 120) / (np.std(brown) + 1e-9) * 0.12] * 2, axis=1)
    kids = S.bp(S.noise(N, 9), 400, 2000) * np.clip(np.sin(2 * np.pi * 1.7 * t) * np.sin(2 * np.pi * 0.4 * t), 0, None) * 0.03
    traffic = S.lp(S.noise(N, 10), 400) * 0.04
    morning = np.stack([birds(N, 1) * 0.5 + kids + traffic + hum * 0.4, birds(N, 2) * 0.5 + kids * 0.8 + traffic + hum * 0.4], axis=1)
    # scene masks with 0.15 s crossfades
    def mask(a, b):
        m = np.zeros(N)
        i0, i1 = int(a * SR), int(b * SR)
        m[max(0, i0):min(N, i1)] = 1
        k = int(0.15 * SR)
        return np.convolve(m, np.ones(k) / k, mode='same')
    m_night = np.clip(mask(0, f('stairs')) + mask(f('winGlow'), f('morning')) + mask(f('dusk'), DUR), 0, 1)
    m_stair = mask(f('stairs'), f('phoneIn'))
    m_room = mask(f('phoneIn'), f('winGlow'))
    m_morn = mask(f('morning'), f('dusk'))
    out = night * m_night[:, None] + stair * m_stair[:, None] + room * m_room[:, None] + morning * m_morn[:, None]
    # the end returns to exactly the night it started with: the last 0.5 s is the opening's ambience
    k = int(0.5 * SR)
    e = int(f('end') * SR)
    out[e - k:e] = out[e - k:e] * np.linspace(1, 0, k)[:, None] + night[:k] * np.linspace(0, 1, k)[:, None]
    return out


def title_card():
    """The B/C title card (45 frames): a whoosh into the stamp and the stamp (sfx), the choir hit (music)."""
    n = int(45 / FPS * SR) + int(1.5 * SR)
    saveN = S.N
    S.N = n
    m = S.Bus()
    x = S.Bus()
    at = 4 / FPS
    x.add(S.whoosh(0.35, 400, 3500, seed=5), at - 0.12, gain=0.5)
    x.add(S.thump(0.25, 65, seed=4), at, gain=1.0)
    m.add(choir([62, 66, 69, 74, 78], 1.6, attack=0.05, release=1.0, bright=1.0, seed=21), at, gain=0.95)
    m.add(kick(0.5), at, gain=0.9)
    S.N = saveN
    return m.stereo(), x.stereo()


def write(path, x):
    x = np.asarray(x, dtype=np.float64)
    peak = np.max(np.abs(x))
    if peak > 0.99:
        x = x / peak * 0.99
    wavfile.write(path, SR, x.astype(np.float32))


if __name__ == '__main__':
    out = ROOT / 'public' / 'audio'
    out.mkdir(parents=True, exist_ok=True)
    write(out / 'music-a.wav', music().stereo())
    sb, p1 = sfx()
    write(out / 'sfx-a.wav', sb.stereo())
    write(out / 'sfx-pop1.wav', p1.stereo())
    write(out / 'amb-a.wav', ambience())
    tm, tx = title_card()
    write(out / 'title-music.wav', tm)
    write(out / 'title-sfx.wav', tx)
    print(f'synth2: {DUR:.2f} s; music, sfx, pop1, ambience, title card written')
