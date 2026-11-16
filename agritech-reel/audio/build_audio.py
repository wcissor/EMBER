"""Voice, sound effects and a placeholder music bed for every language and variant, mixed and mastered.

For each language (en, az) and variant (A, B, C), 48 kHz stereo, 32-bit float WAV:
  audio/mix/{lang}-{V}.wav          voice + effects + music, -14 LUFS integrated, true peak <= -1.5 dBTP
  audio/mix/{lang}-{V}-nomusic.wav  voice + effects, mastered the same way
  audio/mix/report.json             every cue, stem level and master measurement

Voice: the per-line wavs in vo/lines/{lang}, each placed at its beat start + audioOffset (src/timeline.json),
so the voice sits on exactly the frames the pictures and captions were timed to.
Effects: ElevenLabs Sound Effects v2 takes in sfx/raw, trimmed here by measurement (see SFX); the collar's
vibration buzz is made in code. One quiet, dry sound per reveal, cued from the same word anchors as the scenes.
Music: a placeholder made in code, because ElevenLabs Music is not on the connected plan. 110 BPM soft plucks,
building by line (bass, then a soft kick, then shaker), dropping to a held chord that fades out on the question.
"""
import json, pathlib, re, subprocess, sys
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
SR = 48000
TL = json.loads((ROOT / 'src/timeline.json').read_text())
FPS, TAIL = TL['fps'], TL['tail']
OUT = ROOT / 'audio/mix'
OUT.mkdir(parents=True, exist_ok=True)


# ---------------- Word anchors, read from src/config.ts so the sound follows the same words as the pictures ----------------
def read_anchors():
    src = (ROOT / 'src/config.ts').read_text()
    block = src[src.index('export const ANCHORS'):]
    block = block[: block.index('\n};') + 3]
    out = {}
    for lang in ('en', 'az'):
        part = block[block.index(f'  {lang}: {{'):]
        part = part[: part.index('\n  },')]
        out[lang] = {lid: {k: int(v) for k, v in re.findall(r'(\w+):\s*(\d+)', body)} for lid, body in re.findall(r'^\s{4}(\w+):\s*\{([^}]*)\}', part, re.M)}
    return out


ANCHORS = read_anchors()


# ---------------- Helpers ----------------
def load(path, start=0.0, end=None):
    x = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']), np.float32).astype(np.float64)
    a = int(round(start * SR))
    b = len(x) if end is None else min(len(x), int(round(end * SR)))
    return x[a:b].copy()


def fade(x, fin=0.005, fout=0.005):
    x = x.copy()
    n_in, n_out = int(fin * SR), int(fout * SR)
    if n_in:
        x[:n_in] *= np.linspace(0, 1, n_in) ** 2
    if n_out:
        x[-n_out:] *= np.linspace(1, 0, n_out) ** 2
    return x


def place(buf, x, at):
    """Add x (mono or stereo) into buf (stereo) starting at `at` seconds; clips what falls outside."""
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    i = int(round(at * SR))
    a = max(0, -i)
    j = min(len(buf), i + len(x))
    if j > max(i, 0):
        buf[max(i, 0):j] += x[a: a + j - max(i, 0)]


def write(path, x):
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_f32le', str(path)],
                   input=x.astype(np.float32).tobytes(), check=True)


def loudness(path):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    i = float(re.findall(r'I:\s+(-?[0-9.]+) LUFS', err)[-1])
    tp = float(re.findall(r'Peak:\s+(-?[0-9.inf]+) dBFS', err)[-1])
    return i, tp


def lufs_of(x):
    tmp = OUT / '_measure.wav'
    write(tmp, x)
    i, _ = loudness(tmp)
    tmp.unlink()
    return i


def db(x):
    return 10 ** (x / 20)


def lowpass(x, fc, order=4):
    """Zero-phase low-pass (Butterworth-shaped magnitude, applied in the frequency domain) for short sounds."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (f / fc) ** (2 * order)), n=len(x))


def level(x, mode, target):
    if mode == 'peak':
        return x * db(target) / (np.abs(x).max() + 1e-12)
    active = x[np.abs(x) > np.abs(x).max() * 0.03]
    return x * db(target) / (np.sqrt(np.mean(active ** 2)) + 1e-12)


def bed(x, length, xf=0.4):
    """Tile a short ambience to `length` seconds with equal-power crossfades."""
    n, k = int(length * SR), int(xf * SR)
    out = x[: min(len(x), n)].copy()
    ramp = np.linspace(0, np.pi / 2, k)
    while len(out) < n:
        out[-k:] = out[-k:] * np.cos(ramp) + x[:k] * np.sin(ramp)
        out = np.concatenate([out, x[k:]])
    return out[:n]


# ---------------- Effects: one take each, trimmed by measurement ----------------
RAW = ROOT / 'sfx/raw'
# name: (take, trim start, trim end, fade in, fade out, level mode, level dB); LOWPASS takes the hiss off two of them
TAKES = {
    'breaker': ('breaker-a', 0.0, 0.60, 0.001, 0.25, 'peak', -15),    # one clunk, 245 ms burst; -b clips (+3.9 dBFS)
    'wind': ('wind-b', 0.10, 1.90, 0.0, 0.0, 'rms', -40),           # steadier of the two; tiled into a bed, faded there
    'laser1': ('laser-a', 1.465, 1.600, 0.001, 0.06, 'peak', -19),  # 55-75 ms ticks around 6 kHz, the least "pew"
    'laser2': ('laser-a', 2.535, 2.670, 0.001, 0.06, 'peak', -20),
    'laser3': ('laser-a', 6.310, 6.445, 0.001, 0.06, 'peak', -21),
    'drone': ('drone-b', 0.05, 1.30, 0.25, 0.45, 'rms', -35),       # steady pass, 1.25 s
    'beep': ('beep-a', 0.28, 0.66, 0.004, 0.12, 'peak', -20),       # one short tone
    'shutter': ('shutter-a', 0.10, 0.42, 0.001, 0.08, 'peak', -17),  # first click only
    'drop': ('drop-a', 0.0, 0.45, 0.001, 0.12, 'peak', -17),
    'whoosh': ('whoosh-b', 0.0, 0.95, 0.05, 0.30, 'rms', -30),      # low swell, peaks 0.40 s in
    'hit': ('hit-b', 0.0, 0.90, 0.002, 0.35, 'peak', -19),          # soft low hit, clean decay
}
WHOOSH_PEAK = 0.40
LOWPASS = {'wind': 5000, 'drone': 10000}  # wind without the broadband hiss; drone without the top whine
SND = {}
for name, (f, a, b, fi, fo, mode, lvl) in TAKES.items():
    x = load(RAW / f'{f}.mp3', a, b)
    if name in LOWPASS:
        x = lowpass(x, LOWPASS[name])
    SND[name] = level(fade(x, fi, fo), mode, lvl)


def buzz():
    """Collar vibration: a 160 Hz motor buzz in three short pulses, made in code (no take fitted)."""
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    tone = np.sign(np.sin(2 * np.pi * 160 * t)) * 0.6 + np.sin(2 * np.pi * 160 * t) * 0.4
    tone = np.convolve(tone, np.ones(24) / 24, 'same')  # soften the square edges
    gate = ((t % 0.14) < 0.09).astype(float)
    gate = np.convolve(gate, np.ones(int(0.008 * SR)) / int(0.008 * SR), 'same')
    return level(fade(tone * gate, 0.004, 0.04), 'peak', -22)


SND['buzz'] = buzz()


def logo_chord():
    """The end card's sound: a soft D add9 chord, strummed 25 ms apart and left to ring out, made in code."""
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k, m in enumerate([50, 57, 62, 64, 66]):  # D3 A3 D4 E4 F#4, the music bed's home chord
        f0 = 440.0 * 2 ** ((m - 69) / 12)
        x = sum((0.5 ** (h - 1)) * np.sin(2 * np.pi * h * f0 * t) * np.exp(-t / (0.9 / h ** 0.8)) for h in range(1, 6))
        x *= 1 - np.exp(-t / 0.004)
        i = int(k * 0.025 * SR)
        out[i:] += x[: n - i] * (1.0 - 0.08 * k)
    return level(fade(lowpass(out, 6000), 0.002, 0.5), 'peak', -18)


SND['logo'] = logo_chord()


def cues_for(lang, lid, words):
    """Effect cues for one line, in beat seconds, from the same word anchors the scenes use."""
    A = ANCHORS[lang].get(lid, {})
    w = lambda i: words[min(i, len(words) - 1)]['start']
    f = lambda s: round(s * FPS) / FPS
    D = TL['lines'][lang][lid]['frames'] / FPS
    if lid == 'H1':
        return [('breaker', f(w(A['bust'])))]
    if lid == 'H2':
        return [('laser1', w(A['burn'])), ('laser2', w(A['laser'])), ('laser3', w(A['laser']) + 0.12)]
    if lid == 'B2':
        return [('laser1', w(A['burn']) + 0.1), ('laser2', w(A['laser'])), ('laser3', w(A['laser']) + 0.18)]
    if lid == 'B1':
        return [('wind', 0.0, D)]
    if lid == 'H3':
        return [('wind', 0.0, D)]
    if lid == 'B3':
        return [('drone', 0.05)]
    if lid in ('B4', 'B4s'):
        return [('beep', w(A['sound'])), ('buzz', w(A['vib']))]
    if lid == 'B5':
        return [('shutter', w(A['field']) - 0.05)]
    if lid == 'B6':
        return [('drop', w(A['count']) - 0.05)]
    if lid == 'B7':
        land = max(w(A['land']) + 0.45, 1.0)
        return [('whoosh', land - WHOOSH_PEAK)]
    if lid == 'B8':
        return [('hit', 0.0)]
    if lid == 'END':
        return [('logo', 0.45)]  # as the field closes onto its horizon line
    return []


# ---------------- Music placeholder (made in code) ----------------
BPM = 110
BEAT = 60 / BPM
BAR = 4 * BEAT
NOTE = lambda m: 440.0 * 2 ** ((m - 69) / 12)  # MIDI note -> Hz
# Two chords, one bar each: Dadd9 and Gmaj7(9), open voicings, so the bed never resolves and loops cleanly.
CHORDS = [
    {'bass': 38, 'tones': [50, 57, 64, 66, 69]},   # D2 | D3 A3 E4 F#4 A4
    {'bass': 43, 'tones': [50, 55, 59, 66, 69]},   # G2 | D3 G3 B3 F#4 A4
]
ARP = [0, 2, 1, 3, 4, 2, 3, 1]  # eighth-note pattern over the chord tones
_cache = {}


def pluck(midi, bright):
    """A soft plucked tone: harmonics that die away faster the higher they are."""
    key = (midi, round(bright, 2))
    if key not in _cache:
        f0 = NOTE(midi)
        n = int(1.6 * SR)
        t = np.arange(n) / SR
        x = np.zeros(n)
        for k in range(1, 7):
            if k * f0 > 9000:
                break
            amp = (0.55 ** (k - 1)) * (bright if k > 2 else 1.0)
            x += amp * np.sin(2 * np.pi * k * f0 * t * (1 + 0.0007 * k)) * np.exp(-t / (0.55 / k ** 0.9))
        x *= 1 - np.exp(-t / 0.003)
        _cache[key] = fade(x, 0, 0.4)  # no click where the note is cut
    return _cache[key]


def kick():
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    f = 46 + 50 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return fade(np.sin(ph) * np.exp(-t / 0.11) * (1 - np.exp(-t / 0.002)), 0, 0.08)


def shaker(seed):
    """A soft shaker: noise kept between about 3 and 8 kHz, with a gentle 8 ms attack (no full-band click)."""
    rng = np.random.default_rng(seed)
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    x = lowpass(x - lowpass(x, 3000, 2), 8000, 4)  # band-pass
    return fade(x * np.exp(-t / 0.025) * (1 - np.exp(-t / 0.008)), 0, 0.02)


def music_for(seq, starts, total, b8_start, b8_speech_end):
    """Stereo music bed for one variant. Layers enter by line: plucks from the start, bass from the second line,
    a soft kick from the third, shaker from B5. Everything stops at the question; a held chord fades out under it."""
    N = int(round(total * SR))
    L = np.zeros((N, 2))
    t_bass = starts[1]
    t_kick = starts[2]
    t_shaker = starts[seq.index('B5')]
    nbar = int(np.ceil(b8_start / BAR)) + 1
    for bar in range(nbar):
        t0 = bar * BAR
        ch = CHORDS[bar % 2]
        # brightness opens slowly over the reel (more upper harmonics), so it builds without getting louder
        bright = 0.35 + 0.65 * min(1.0, t0 / max(1.0, b8_start))
        for e, idx in enumerate(ARP):
            at = t0 + e * BEAT / 2
            if at >= b8_start - 0.02:
                break
            x = pluck(ch['tones'][idx], bright) * (0.9 if e % 2 == 0 else 0.7)
            n = int(min(len(x), (b8_start - at) * SR))
            if n <= 0:
                continue
            x = x if n == len(x) else fade(x[:n], 0, 0.01)  # notes stop cleanly at the question
            pan = 0.5 + (0.18 if idx % 2 else -0.18)  # alternate slightly left and right
            place(L, np.stack([x * np.cos(pan * np.pi / 2), x * np.sin(pan * np.pi / 2)], 1) * np.sqrt(2), at)
        for bt in range(4):
            at = t0 + bt * BEAT
            if at >= b8_start - 0.02:
                break
            if at >= t_bass - 1e-6 and bt in (0, 2):
                f0 = NOTE(ch['bass'])
                n = int(0.7 * SR)
                tt = np.arange(n) / SR
                b = (np.sin(2 * np.pi * f0 * tt) + 0.3 * np.sin(2 * np.pi * 2 * f0 * tt)) * np.exp(-tt / 0.35) * (1 - np.exp(-tt / 0.01))
                n = int(min(n, (b8_start - at) * SR))
                place(L, fade(b[:n], 0, 0.15) * 0.55, at)
            if at >= t_kick - 1e-6 and bt in (0, 2):
                place(L, kick() * 0.5, at)
            if at >= t_shaker - 1e-6:
                s = shaker(bar * 4 + bt) * 0.16
                place(L, np.stack([s * 0.7, s], 1), at + BEAT / 2)
    # Held chord under the question: D add9, slow in, fades out by the end of the question.
    n = int(max(0.5, b8_speech_end + 0.6 - b8_start) * SR)
    tt = np.arange(n) / SR
    pad = sum(np.sin(2 * np.pi * NOTE(m) * tt) * g for m, g in [(50, 1.0), (57, 0.6), (64, 0.45), (66, 0.35)])
    env = (1 - np.exp(-tt / 0.25)) * np.clip((n - np.arange(n)) / (0.9 * SR), 0, 1) ** 2
    place(L, pad * env * 0.22, b8_start)
    return L


# ---------------- Mastering (two-pass loudnorm to -14 LUFS, true peak -1.5 dBTP) ----------------
def master(mix, out):
    write(out.with_suffix('.sum.wav'), mix)
    # 4x-oversampled peak limiter at -4.5 dBFS tames TTS consonant peaks, so loudnorm can stay linear (a plain gain).
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
    i, tp = loudness(out)
    return {'normalization': r.get('normalization_type'), 'lufs': i, 'true_peak': tp}


# ---------------- Build every variant ----------------
def build(lang, v):
    seq = TL['variants'][v]
    lines = TL['lines'][lang]
    starts, t = [], 0
    for lid in seq:
        starts.append(t / FPS)
        t += lines[lid]['frames']
    total = (t + TAIL) / FPS
    N = int(round(total * SR))

    vo = np.zeros((N, 2))
    speaking = np.zeros(N, bool)
    for lid, s in zip(seq, starts):
        if not lines[lid]['audioFile']:  # the end card has no voice
            continue
        x = load(ROOT / lines[lid]['audioFile'])
        place(vo, fade(x, 0.003, 0.01), s + lines[lid]['audioOffset'])
        for wd in lines[lid]['words']:
            a, b = int((s + wd['start']) * SR), int((s + wd['end'] + 0.15) * SR)
            speaking[a:min(N, b)] = True
    vo_lufs = lufs_of(vo)
    vo *= db(-16.0 - vo_lufs)  # voice stem at -16 LUFS before mastering

    sfx = np.zeros((N, 2))
    cue_log = []
    for lid, s in zip(seq, starts):
        for c in cues_for(lang, lid, lines[lid]['words']):
            name, at = c[0], c[1]
            x = SND[name]
            if len(c) == 3:  # an ambience bed that runs for the length of the line
                x = fade(bed(SND[name], c[2] - at), 0.3, 0.4)
            place(sfx, x, s + at)
            cue_log.append({'line': lid, 'sound': name, 'at': round(s + at, 3), 'length': round(len(x) / SR, 2)})

    b8 = seq.index('B8')
    b8_end = starts[b8] + lines['B8']['speechEnd']
    music = music_for(seq, starts, total, starts[b8], b8_end)
    m_lufs = lufs_of(music)
    music *= db(-16.0 - m_lufs)
    # The voice leads: music 14 dB under while it speaks, 9 dB under between lines, smoothed over 0.25 s.
    duck = np.where(speaking, -14.0, -9.0)
    k = int(0.25 * SR)
    duck = np.convolve(duck, np.ones(k) / k, 'same')
    music *= db(duck)[:, None]

    rep = {'lang': lang, 'variant': v, 'duration': round(total, 3), 'frames': t + TAIL, 'voice_lufs_raw': vo_lufs, 'music_lufs_raw': m_lufs, 'cues': cue_log}
    rep['mix'] = master(vo + sfx + music, OUT / f'{lang}-{v}.wav')
    rep['mix_nomusic'] = master(vo + sfx, OUT / f'{lang}-{v}-nomusic.wav')
    print(lang, v, f"{total:.2f} s", 'music', rep['mix'], 'no music', rep['mix_nomusic'], flush=True)
    return rep


if __name__ == '__main__':
    todo = [(l, v) for l in ('en',) for v in ('A', 'B', 'C')]  # English only (RUTA doesn't need Azerbaijani); name az-A etc. to build it
    if len(sys.argv) > 1:
        todo = [(l, v) for l in ('en', 'az') for v in ('A', 'B', 'C') if f'{l}-{v}' in sys.argv[1:]]
    reports = [build(l, v) for l, v in todo]
    path = OUT / 'report.json'
    old = json.loads(path.read_text()) if path.exists() and len(sys.argv) > 1 else {}
    old.update({f"{r['lang']}-{r['variant']}": r for r in reports})
    path.write_text(json.dumps(old, indent=1, ensure_ascii=False))
