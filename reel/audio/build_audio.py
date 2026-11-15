"""Voice, sound effects and a placeholder music pulse, mixed and mastered.

Outputs (48 kHz stereo, 32-bit float WAV):
  audio/stems/vo.wav      the chosen take, sliced per line and placed on the timeline
  audio/stems/sfx.wav     ElevenLabs sound effects, trimmed and placed on visual events
  audio/stems/music.wav   a 96 BPM pulse made in code, ducked about 18 dB under the voice
  audio/mix.wav           voice + effects + music, mastered to -14 LUFS, true peak <= -1.5 dBTP
  audio/mix-nomusic.wav   voice + effects, mastered the same way
"""
import json, pathlib, re, subprocess
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
SR = 48000
TL = json.loads((ROOT / 'src/timeline.json').read_text())
EV = TL['events']
DUR = TL['durationSec']
N = int(round(DUR * SR))
STEMS = ROOT / 'audio/stems'
STEMS.mkdir(parents=True, exist_ok=True)


def load(path, start=0.0, end=None):
    args = ['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    x = np.frombuffer(subprocess.check_output(args), np.float32).astype(np.float64)
    a = int(start * SR)
    b = len(x) if end is None else min(len(x), int(end * SR))
    return x[a:b].copy()


def fade(x, fin=0.005, fout=0.005):
    n_in, n_out = int(fin * SR), int(fout * SR)
    if n_in:
        x[:n_in] *= np.linspace(0, 1, n_in) ** 2
    if n_out:
        x[-n_out:] *= np.linspace(1, 0, n_out) ** 2
    return x


def place(buf, x, at):
    i = int(round(at * SR))
    j = min(len(buf), i + len(x))
    if j > i:
        buf[i:j] += x[: j - i]


def write(path, mono_or_stereo):
    x = mono_or_stereo
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    args = ['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_f32le', str(path)]
    subprocess.run(args, input=x.astype(np.float32).tobytes(), check=True)


def loudness(path):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    i = float(re.findall(r'I:\s+(-?[0-9.]+) LUFS', err)[-1])
    tp = float(re.findall(r'Peak:\s+(-?[0-9.inf]+) dBFS', err)[-1])
    return i, tp


def db(x):
    return 10 ** (x / 20)


# ---------------- Voice: slice the take per line and place each slice on the timeline ----------------
plan = json.loads((ROOT / 'audio/vo_plan.json').read_text())
take = load(ROOT / plan['take'])
vo = np.zeros(N)
for s in plan['slices']:
    seg = take[int(s['take_from'] * SR): int(s['take_to'] * SR)].copy()
    place(vo, fade(seg, 0.004, 0.004), s['place_at'])
write(STEMS / 'vo-raw.wav', vo)
vo_lufs, _ = loudness(STEMS / 'vo-raw.wav')
vo *= db(-16.0 - vo_lufs)  # voice stem at -16 LUFS before mastering
write(STEMS / 'vo.wav', vo)

# Where the voice is speaking (for ducking), from the word timings, held 0.15 s past each word.
speaking = np.zeros(N, bool)
for w in TL['words']:
    a, b = int(w['start'] * SR), int((w['end'] + 0.15) * SR)
    speaking[a:min(N, b)] = True


# ---------------- Sound effects (ElevenLabs Sound Effects v2), quiet and dry ----------------
RAW = ROOT / 'sfx/raw'
S = [f / TL['fps'] for f in TL['sceneStarts']]
# name: (file, trim start, trim end, fade in, fade out, level mode, level dB, cue times)
SFX = {
    'sensor tick': ('s1-tick-1', 0.0, 0.12, 0.001, 0.05, 'peak', -15, [EV['s1_pulse1'], EV['s1_pulse2']]),
    'static dropout': ('s1-dropout-2', 2.06, 2.613, 0.15, 0.003, 'rms', -32, [EV['s1_vanish'] - (2.613 - 2.06)]),
    'hum thinning': ('s2-hum-1', 0.0, 2.0, 0.08, 1.5, 'rms', -33, [S[1] + 0.05]),
    'pen plotter': ('s3-plotter-2', 0.0, 1.0, 0.05, 0.25, 'rms', -31, [EV['s3_draw']]),
    'lock-on': ('s4-lockon-2', 0.16, 0.62, 0.005, 0.03, 'peak', -17, [EV['s4_lock'] - 0.05]),
    'forecast rise': ('s5-rise-2', 0.0, 1.0, 0.08, 0.25, 'rms', -34, [EV['s5_dip']]),
    'adapt click': ('s5-click-1', 0.12, 0.40, 0.002, 0.05, 'peak', -15, [EV['s5_adapt']]),
    'packets arriving': ('s6-ticks-1', 0.0, 1.6, 0.02, 0.2, 'rms', -33, [EV['s6_fill']]),
    'low note': ('s7-note-2', 0.0, 1.75, 0.03, 0.6, 'rms', -30, [S[6] + 0.6]),
}
sfx = np.zeros(N)
cues = []
for name, (f, a, b, fi, fo, mode, level, times) in SFX.items():
    x = fade(load(RAW / f'{f}.mp3', a, b), fi, fo)
    if mode == 'peak':
        x *= db(level) / (np.abs(x).max() + 1e-12)
    else:
        active = x[np.abs(x) > np.abs(x).max() * 0.03]
        x *= db(level) / (np.sqrt(np.mean(active ** 2)) + 1e-12)
    for t in times:
        place(sfx, x, t)
        cues.append({'sound': name, 'file': f'sfx/raw/{f}.mp3', 'at': round(t, 3), 'length': round(len(x) / SR, 2)})
write(STEMS / 'sfx.wav', sfx)


# ---------------- Music: placeholder pulse in code, 96 BPM, no drums, ends on a held chord ----------------
BPM = 96
beat = 60 / BPM
t = np.arange(N) / SR
music = np.zeros(N)
roots = [55.00, 55.00, 43.65, 49.00]  # A1, A1, F1, G1: one bar each (4 beats), repeating
end_card = S[6] + 0.6
nbeats = int(end_card / beat)
for k in range(nbeats):
    t0 = k * beat
    f0 = roots[(k // 4) % len(roots)]
    n = int(0.6 * SR)
    tt = np.arange(n) / SR
    env = (1 - np.exp(-tt / 0.012)) * np.exp(-tt / 0.22)
    # soft analog-style bass: fundamental, a little 2nd and 3rd harmonic, slight detune
    note = np.sin(2 * np.pi * f0 * tt) + 0.35 * np.sin(2 * np.pi * 2 * f0 * 1.003 * tt) + 0.12 * np.sin(2 * np.pi * 3 * f0 * tt)
    place(music, note * env * (0.9 if k % 4 == 0 else 0.7), t0)
    if k % 2 == 1:  # sparse clock tick on the off-beats of every other beat
        rng = np.random.default_rng(k)
        m = int(0.006 * SR)
        click = rng.standard_normal(m) * np.exp(-np.arange(m) / (0.0015 * SR))
        click = np.convolve(click, [1, -0.95], 'same')  # bright, thin
        place(music, 0.06 * click, t0 + beat / 2)
# held chord under the end card: A minor (A2, C3, E3, A3), slow attack, held to the end
n = N - int(end_card * SR)
tt = np.arange(n) / SR
chord = sum(np.sin(2 * np.pi * f * tt) * g for f, g in [(110.0, 1.0), (130.81, 0.55), (164.81, 0.5), (220.0, 0.3)])
chord *= (1 - np.exp(-tt / 0.35)) * np.minimum(1, (n - np.arange(n)) / (0.4 * SR))
place(music, 0.55 * chord, end_card)
place(music, 0.5 * np.sin(2 * np.pi * 55.0 * tt) * (1 - np.exp(-tt / 0.2)) * np.minimum(1, (n - np.arange(n)) / (0.4 * SR)), end_card)
write(STEMS / 'music-raw.wav', music)
m_lufs, _ = loudness(STEMS / 'music-raw.wav')
music *= db(-16.0 - m_lufs)  # music stem at -16 LUFS before ducking
# Ducking: 18 dB under the voice while it speaks, 10 dB under in the gaps, smoothed.
duck_db = np.where(speaking, -18.0, -10.0)
k = int(0.12 * SR)
duck_db = np.convolve(duck_db, np.ones(k) / k, 'same')
music *= db(duck_db)
write(STEMS / 'music.wav', music)


# ---------------- Mix and master (two-pass loudnorm to -14 LUFS, TP -1.5 dBTP) ----------------
def master(stems, out):
    mix = sum(stems)
    write(out.with_suffix('.sum.wav'), mix)
    # The TTS voice has sharp consonant peaks. A 4x-oversampled peak limiter at -4.5 dBFS tames them,
    # so the loudnorm pass can stay linear (a plain gain) and still keep true peak under -1.5 dBTP.
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out.with_suffix('.sum.wav')), '-af',
                    'aresample=192000,alimiter=limit=0.596:attack=3:release=60:level=false,aresample=48000',
                    '-c:a', 'pcm_f32le', str(out.with_suffix('.pre.wav'))], check=True)
    out.with_suffix('.sum.wav').unlink()
    p1 = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(out.with_suffix('.pre.wav')), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(p1[p1.rindex('{'):p1.rindex('}') + 1])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=json")
    p2 = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-y', '-i', str(out.with_suffix('.pre.wav')), '-af', af, '-ar', str(SR), '-ac', '2', '-c:a', 'pcm_f32le', str(out)], capture_output=True, text=True)
    if p2.returncode != 0:
        raise SystemExit(p2.stderr)
    r = json.loads(p2.stderr[p2.stderr.rindex('{'):p2.stderr.rindex('}') + 1])
    out.with_suffix('.pre.wav').unlink()
    return {'pass1': {k: m[k] for k in ('input_i', 'input_tp', 'input_lra')}, 'normalization': r.get('normalization_type'), 'output_i': r['output_i'], 'output_tp': r['output_tp']}


report = {
    'voice_lufs_raw': vo_lufs,
    'music_lufs_raw': m_lufs,
    'cues': cues,
    'mix': master([vo, sfx, music], ROOT / 'audio/mix.wav'),
    'mix_nomusic': master([vo, sfx], ROOT / 'audio/mix-nomusic.wav'),
}
(ROOT / 'audio/audio_report.json').write_text(json.dumps(report, indent=1))
print(json.dumps({k: report[k] for k in ('mix', 'mix_nomusic')}, indent=1))
