#!/usr/bin/env python3
"""Mix (section 7). Voice first; music ~20 dB under, ducked a further 8 dB while anyone speaks; SFX on beats.
Master: two-pass loudnorm to -14 LUFS integrated, true peak <= -1 dBTP, 48 kHz stereo, exactly 34.000 s
→ public/audio/mix.wav. Also writes build/sfx_events.json (what played where)."""
import json, subprocess, sys
import numpy as np
from pathlib import Path
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parents[2]
SR = 48000
FPS = 60
DUR = 34.0
N = int(DUR * SR)
TL = json.loads((ROOT / 'build/timeline.json').read_text())
B = TL['beats']
CARDS = TL['cards']
SFX = ROOT / 'public/audio/sfx'
STEMS = ROOT / 'public/audio/stems'


def load(path):
    sr, x = wavfile.read(path)
    x = x.astype(np.float32)
    if x.ndim == 2:
        x = x.mean(axis=1)
    assert sr == SR, path
    return x


lib = {p.stem: load(p) for p in SFX.glob('*.wav')}
L = np.zeros(N)
R = np.zeros(N)
events = []


def place(name, frame, gain_db=0.0, pan=0.0, bus=None):
    x = lib[name] * 10 ** (gain_db / 20)
    i = int(round(frame / FPS * SR))
    if i >= N:
        return
    x = x[: N - i]
    lg, rg = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    (bus or (L, R))[0][i:i + len(x)] += x * lg
    (bus or (L, R))[1][i:i + len(x)] += x * rg
    events.append({'frame': int(frame), 'sfx': name, 'gain_db': round(float(gain_db), 2), 'pan': round(float(pan), 2)})


pan_x = lambda x: float(np.clip((x - 540) / 540, -1, 1) * 0.3)
l07 = TL['lines']['07']
stamp_gain = lambda f: -4.0 - (6.0 if l07['start'] <= f <= l07['end'] + 6 else 0.0)


def stamp_hit(f, x):
    place('stamp', f, stamp_gain(f), pan_x(x))
    place('crunch', f + 1, stamp_gain(f) - 9, pan_x(x))


# ── before world: foley only, panned with the cards ──
place('swipe', 0, -15, 0.0)
stamp_hit(B['stampDeadline'], CARDS['hook']['to'][0])
place('swipe', B['youthStart'], -13, pan_x(CARDS['youth']['from'][0]))
stamp_hit(B['stamp18'], CARDS['youth']['to'][0])
place('swipe', B['applyCardStart'], -13, pan_x(CARDS['apply']['from'][0]))
place('fingertap', B['tapRing'], -14, pan_x(CARDS['apply']['to'][0]))
stamp_hit(B['stampLink'], CARDS['apply']['to'][0])
place('swipe', B['dmStart'], -13, pan_x(CARDS['dm']['from'][0]))
place('swoosh', B['bubbleSend'], -12, 0.12)
stamp_hit(B['seenStamp'], CARDS['dm']['to'][0] + 170)
for i, hit in enumerate(TL['barrage']):
    fr, to = CARDS['barrage'][i]
    place('swipe_fast', hit - 9, -15, pan_x(fr[0]))
    stamp_hit(hit, to[0])
for i, f in enumerate(TL['wall']):
    to = CARDS['wall'][i % len(CARDS['wall'])]
    place('swipe_fast', f - 8, -19, pan_x(to[0]))
# clock: a dry tick every 30 frames (-28 dBFS), faster and faster through the barrage, dead stop at the freeze
ticks, f = [], 0
while f < B['barrageStart']:
    ticks.append(f); f += 30
step = 24
while f < B['freeze']:
    ticks.append(f); f += step; step = max(6, step * 0.82)
tick_peak = np.max(np.abs(lib['tick']))
for f in ticks:
    if f < B['freeze']:
        place('tick', f, 20 * np.log10(10 ** (-28 / 20) / tick_peak), 0.0)
# silence: room tone only (-60 dBFS) from the freeze until the cue enters
rt = lib['roomtone']
i0, i1 = int(B['freeze'] / FPS * SR), int(B['musicEntry'] / FPS * SR)
rt_seg = rt[i0:i1] / (np.sqrt(np.mean(rt ** 2)) + 1e-9) * 10 ** (-60 / 20)
ramp = np.minimum(1, np.minimum(np.arange(len(rt_seg)), np.arange(len(rt_seg))[::-1]) / (0.03 * SR))
L[i0:i1] += rt_seg * ramp
R[i0:i1] += rt_seg * ramp

# ── the Turn + after world: interface sounds (no thuds) ──
place('sub', B['yes'] - 10, -9)
place('shimmer', B['rays'], -15)
place('shimmer_long', B['split'], -18)
place('chime', B['checkBadge'], -13)
place('key', B['digit1'], -16)
place('key', B['digit6'], -16)
place('tap_low', B['fieldPulse'], -15)
place('shimmer', B['rippleHit'], -14)
for k in range(4):
    place(f'note_{k}', B['hero'] + 3 * k, -13, (k - 1.5) * 0.06)
for k in range(4):
    place('tap', B['openLights'] + 4 * k, -24, (k - 1.5) * 0.05)
    place('tap', B['applyFill'] + 4 * k, -21, (k - 1.5) * 0.05)
place('swipe', B['categoryGlide'], -24, 0.1)
place('toggle', B['toggleFlip'], -13, 0.2)
place('tap', B['applyTap'], -9, 0.2)
place('swoosh', B['sheetExpand'], -19)
place('pop', B['middlemanPop'], -11)
place('toggle', B['wink'], -20, -0.15)
place('flip', B['flip'], -11)
F0 = B['formFill']
for k in range(0, 24, 3):
    place('key', F0 + k, -25, -0.05)
for f in (F0 + 27, F0 + 30, F0 + 36, F0 + 42, F0 + 48):
    place('key', f, -25, -0.05)
for i, f in enumerate((F0 + 24, F0 + 33, F0 + 39, F0 + 45, F0 + 51)):
    place('chime_hi', f, -22 + i * 0.5, 0.1)
place('tap', B['submitPress'], -13)
place('pop', B['freeChip'], -16)
place('chime', B['checked'], -11)
place('swoosh', B['collapse'], -20)
place('shimmer_long', B['blowout'], -13)
place('shimmer', B['logoRise'], -17)
place('chord', B['logoResolve'] - 30, -14)
place('tap', B['urlQr'], -19)

sfx = np.stack([L, R], axis=1)

# ── voice ──
have_voice = (STEMS / 'student.wav').exists() and (STEMS / 'vt.wav').exists()
voice = np.zeros(N)
if have_voice:
    for s in ('student', 'vt'):
        x = load(STEMS / f'{s}.wav')[:N]
        voice[: len(x)] += x
else:
    print('WARNING: no voice stems yet — mixing without voice', file=sys.stderr)

# ── music: ~20 dB under the voice, sidechain duck -8 dB while anyone speaks (30 ms / 250 ms) ──
sr, music = wavfile.read(ROOT / 'public/audio/music.wav')
music = music.astype(np.float32)[:N]
if len(music) < N:
    music = np.pad(music, ((0, N - len(music)), (0, 0)))


def active_rms_db(x, thr=-50):
    w = int(0.05 * SR)
    fr = np.array([np.sqrt(np.mean(x[i:i + w] ** 2)) for i in range(0, len(x) - w, w)])
    fr = fr[20 * np.log10(fr + 1e-9) > thr]
    return 20 * np.log10(np.sqrt(np.mean(fr ** 2)) + 1e-9) if len(fr) else -40.0


voice_db = active_rms_db(voice) if have_voice else -20.0
music_db = active_rms_db(music.mean(axis=1))
music *= 10 ** ((voice_db - 20 - music_db) / 20)
env = np.abs(voice)
att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.25 * SR))
k = int(0.01 * SR)
env = np.sqrt(np.convolve(voice ** 2, np.ones(k) / k, mode='same'))
gate = (20 * np.log10(env + 1e-9) > voice_db - 24).astype(np.float64)
duck = np.zeros(N)
v = 0.0
for i in range(N):
    g = gate[i]
    v = att * v + (1 - att) * g if g > v else rel * v + (1 - rel) * g
    duck[i] = v
music *= (10 ** (-8 * duck / 20))[:, None]

mix = sfx + music + voice[:, None]
pre = ROOT / 'build/premix.wav'
wavfile.write(pre, SR, mix.astype(np.float32))

# ── master: two-pass loudnorm → -14 LUFS, TP <= -1 dBTP, 48 kHz stereo, exactly 34.000 s ──
p1 = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(pre), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
js = p1.stderr[p1.stderr.rindex('{'):p1.stderr.rindex('}') + 1]
m = json.loads(js)
af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
      f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=json,aresample=48000,apad,atrim=0:34")
out = ROOT / 'public/audio/mix.tmp.wav'
p2 = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-y', '-i', str(pre), '-af', af, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', str(out)], capture_output=True, text=True)
if p2.returncode != 0:
    sys.exit(p2.stderr[-2000:])
out.replace(ROOT / 'public/audio/mix.wav')
(ROOT / 'build/sfx_events.json').write_text(json.dumps({'voice': have_voice, 'voice_db': float(voice_db), 'events': events}, indent=1))
print(f"mix.wav written (voice: {have_voice}); pass-1 input {m['input_i']} LUFS / {m['input_tp']} dBTP; {len(events)} sfx events")
