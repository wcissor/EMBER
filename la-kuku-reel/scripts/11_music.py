"""Compose and render an original ~20 s solo felt-piano cue -> music/track.wav

No track was supplied and the ElevenLabs API is not reachable from this environment, so this
writes an original piece (no references to any existing song or artist) and renders it with
the "Splendid Grand" piano of the MuseScore General soundfont (piano samples public domain,
soundfont MIT, S. Christian Collins) via FluidSynth. FluidR3_GM was tried first, but its piano
samples stop dead at 3.0 s, which clipped every pedalled chord before the next change. Brief: soft, intimate solo felt
piano, 66 BPM, warm and sparse, sustain pedal, soft room reverb, one slow rising phrase that
resolves on a warm major chord at ~13.5 s, then rings out. ~20 s, instrumental.

D-flat major, I(maj9) - vi(m9) - IV(maj9) - V7sus4 -> V7 - I(add9). Melody climbs
F4 Ab4 Bb4 C5 Db5 Eb5 (Db5 Eb5 turn) -> F5 on the resolution.
"""
import subprocess
from pathlib import Path

import mido
import numpy as np
import soundfile as sf
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
SF2 = "/usr/share/sounds/sf2/MuseScore_General_Full.sf2"   # apt: musescore-general-soundfont-lossless
SR = 48000
BPM = 66
BEAT = 60.0 / BPM
PRE = 0.5            # silence before the music in the file (the edit step picks the offset)
START = 0.35         # first downbeat, in "timeline" seconds (before PRE is added)
rng = np.random.default_rng(7)

# (beat, [midi notes low->high], velocity, roll_s)  chords; melody separately
CHORDS = [
    (0.0,  [37, 44, 60, 63], 40, 0.035),        # Dbmaj9      Db2 Ab2 C4 Eb4
    (4.0,  [34, 41, 56, 60], 42, 0.035),        # Bbm9        Bb1 F2 Ab3 C4
    (8.0,  [42, 49, 53, 56], 44, 0.035),        # Gbmaj9      Gb2 Db3 F3 Ab3
    (10.0, [58], 30, 0.0),                       #   inner Bb3
    (12.0, [44, 51, 54, 61], 46, 0.035),        # Ab7sus4     Ab2 Eb3 Gb3 Db4
    (13.5, [60], 40, 0.0),                       #   sus -> 3rd (C4)
    (14.5, [37, 44, 53, 63, 68], 60, 0.030),    # Dbadd9      Db2 Ab2 F3 Eb4 Ab4   <- resolution
    (16.5, [85], 30, 0.0),                       #   high Db6 as it rings out
]
MELODY = [  # beat, note, velocity, length in beats
    (0.0, 65, 42, 2.0), (2.0, 68, 43, 2.0), (4.0, 70, 45, 1.5), (5.5, 72, 46, 2.5),
    (8.0, 73, 48, 2.0), (10.0, 75, 50, 2.5), (12.5, 73, 47, 1.0), (13.5, 75, 50, 1.0),
    (14.5, 77, 66, 6.0),
]
PEDAL_CHANGES = [0.0, 4.0, 8.0, 12.0, 13.5, 14.5]
END_BEAT = 21.0
RESOLUTION_BEAT = 14.5


def t_of(beat):
    return START + beat * BEAT


def build_midi(path):
    ev = []   # (time_s, msg)
    for beat, notes, vel, roll in CHORDS:
        nxt = min([b for b, *_ in CHORDS if b > beat and len(_[0]) > 1] + [END_BEAT])
        for i, n in enumerate(notes):
            jitter = 0.0 if beat == RESOLUTION_BEAT else rng.normal(0, 0.006)
            on = t_of(beat) + i * roll + jitter
            v = int(np.clip(vel - 4 * (len(notes) - 1 - i) * (n > 50) + rng.integers(-3, 4), 18, 90))
            off = t_of(min(nxt, END_BEAT)) if len(notes) > 1 else t_of(beat + 2.5)
            ev += [(on, mido.Message("note_on", note=n, velocity=v)), (max(off, on + 0.3), mido.Message("note_off", note=n))]
    for beat, n, vel, ln in MELODY:
        on = t_of(beat) + (0.06 if beat != RESOLUTION_BEAT else 0.09) + (0 if beat == RESOLUTION_BEAT else rng.normal(0, 0.008))
        ev += [(on, mido.Message("note_on", note=n, velocity=int(vel + rng.integers(-2, 3)))),
               (t_of(beat + ln) - 0.02, mido.Message("note_off", note=n))]
    for b in PEDAL_CHANGES:
        ev += [(max(t_of(b) - 0.04, 0), mido.Message("control_change", control=64, value=0)),
               (t_of(b) + 0.05, mido.Message("control_change", control=64, value=127))]
    ev += [(t_of(END_BEAT), mido.Message("control_change", control=64, value=0))]
    ev.sort(key=lambda e: (e[0], e[1].type != "note_off"))

    mid = mido.MidiFile(ticks_per_beat=960)
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    tempo = mido.bpm2tempo(BPM)
    tr.append(mido.MetaMessage("set_tempo", tempo=tempo))
    tr += [mido.Message("program_change", program=0), mido.Message("control_change", control=7, value=100),
           mido.Message("control_change", control=91, value=0), mido.Message("control_change", control=93, value=0)]
    last = 0
    for t, msg in ev:
        tick = int(round(mido.second2tick(t + PRE, 960, tempo)))
        tr.append(msg.copy(time=max(tick - last, 0)))
        last = max(tick, last)
    mid.save(path)


def reverb_ir(rt60=2.0, length=3.2, predelay=0.02, seed=3):
    r = np.random.default_rng(seed)
    n = int(length * SR)
    t = np.arange(n) / SR
    env = np.exp(-6.91 * t / rt60)
    ir = r.standard_normal((n, 2)) * env[:, None]
    b, a = signal.butter(1, 5200 / (SR / 2))                   # air absorption / damping
    ir = signal.lfilter(b, a, ir, axis=0)
    fade_in = np.minimum(1.0, t / 0.012)[:, None]             # soften the onset of the tail
    ir *= fade_in
    er = np.zeros((n, 2))
    for d, g, pan in ((0.011, 0.55, 0.3), (0.017, 0.42, -0.4), (0.023, 0.33, 0.6), (0.031, 0.25, -0.2)):
        k = int(d * SR)
        er[k, 0] += g * (1 - pan) / 2 * 2
        er[k, 1] += g * (1 + pan) / 2 * 2
    ir = er * 0.35 + ir / np.sqrt((ir ** 2).sum(0)).max()
    pad = np.zeros((int(predelay * SR), 2))
    return np.vstack([pad, ir])


def ebur(path):
    """integrated loudness (LUFS) and true peak (dBTP) via ffmpeg ebur128"""
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr.split("Summary:")[-1]
    import re
    return float(re.search(r"I:\s+(-?[\d.]+) LUFS", out).group(1)), float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", out).group(1))


def compress(x, thr_db, ratio=2.5, knee=6.0, att=0.008, rel=0.25):
    """feed-forward RMS compressor, stereo-linked, soft knee"""
    a_rms = np.exp(-1 / (0.005 * SR))
    p = signal.lfilter([1 - a_rms], [1, -a_rms], (x ** 2).mean(1))
    lvl = 10 * np.log10(np.maximum(p, 1e-12))
    over = lvl - thr_db
    gr = np.where(over <= -knee / 2, 0.0,
                  np.where(over >= knee / 2, over * (1 - 1 / ratio),
                           (1 - 1 / ratio) * (over + knee / 2) ** 2 / (2 * knee)))
    ga, gr_s = np.exp(-1 / (att * SR)), np.zeros_like(gr)
    gb = np.exp(-1 / (rel * SR))
    g = 0.0
    for i, v in enumerate(gr):                      # attack when GR rises, release when it falls
        c = ga if v > g else gb
        g = c * g + (1 - c) * v
        gr_s[i] = g
    return x * (10 ** (-gr_s / 20))[:, None]


def tp_limit(x, ceil_db=-2.0, look=0.004, rel=0.08):
    """offline look-ahead limiter on 4x-oversampled (true) peaks"""
    os = signal.resample_poly(x, 4, 1, axis=0)
    pk = np.abs(os).max(1)[: len(x) * 4].reshape(-1, 4).max(1)
    ceil = 10 ** (ceil_db / 20)
    g_req = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    L = int(look * SR)
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    g = minimum_filter1d(g_req, 2 * L + 1)
    b = np.exp(-1 / (rel * SR))
    out, prev = np.empty_like(g), 1.0
    for i, v in enumerate(g):                       # instant down (look-ahead), smooth release up
        prev = v if v < prev else b * prev + (1 - b) * v
        out[i] = prev
    out = np.minimum(uniform_filter1d(out, 2 * L + 1), g_req)
    return x * out[:, None]


def main():
    (ROOT / "music").mkdir(exist_ok=True)
    work = ROOT / "work" / "music"
    work.mkdir(parents=True, exist_ok=True)
    midi, dry_wav = work / "felt_piano.mid", work / "felt_piano_dry.wav"
    build_midi(midi)
    subprocess.run(["fluidsynth", "-ni", "-q", "-g", "0.7", "-r", str(SR), "-o", "synth.reverb.active=0",
                    "-o", "synth.chorus.active=0", "-F", str(dry_wav), "-T", "wav", SF2, str(midi)], check=True)
    x, sr = sf.read(dry_wav, always_2d=True)
    assert sr == SR
    x = np.vstack([x, np.zeros((int(1.5 * SR), 2))])
    # "felt": soften the hammer brightness, keep the body warm
    b, a = signal.butter(2, 3600 / (SR / 2))
    x = signal.lfilter(b, a, x, axis=0)
    b, a = signal.butter(1, 45 / (SR / 2), "highpass")          # rumble
    x = signal.lfilter(b, a, x, axis=0)
    # soft room
    ir = reverb_ir()
    wet = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in (0, 1)], 1)
    wet *= 0.32 * np.sqrt((x ** 2).mean()) / np.sqrt((wet ** 2).mean())
    y = x + wet
    n_end = int((PRE + t_of(END_BEAT) + 1.2) * SR)
    y = y[:n_end]
    fade = np.ones(len(y))
    k = int(1.2 * SR)
    fade[-k:] = np.cos(np.linspace(0, np.pi / 2, k)) ** 2
    y *= fade[:, None]
    # mastering: gentle compression, then true-peak limiting so loudness can be set linearly
    y *= 10 ** (-6.0 / 20) / np.abs(y).max()
    thr = np.percentile(10 * np.log10(np.maximum(signal.lfilter([0.002], [1, -0.998], (y ** 2).mean(1)), 1e-12)), 75)
    y = compress(y, thr - 3.0, ratio=2.5)
    tmp = work / "master_tmp.wav"
    for _ in range(3):                              # set loudness ~-14 LUFS with true peak <= -2 dBTP
        sf.write(tmp, tp_limit(y, -2.0).astype(np.float32), SR, subtype="FLOAT")
        I, tp = ebur(tmp)
        y *= 10 ** ((-14.0 - I) / 20)
    y = tp_limit(y, -2.0)
    sf.write(ROOT / "music" / "track.wav", y.astype(np.float32), SR, subtype="PCM_24")
    I, tp = ebur(ROOT / "music" / "track.wav")
    print(f"master: {I:.1f} LUFS integrated, true peak {tp:.1f} dBTP, PLR {tp - I:.1f} dB")
    res = PRE + t_of(RESOLUTION_BEAT)
    import json
    (ROOT / "music" / "track.cue.json").write_text(json.dumps(
        {"resolution_s": round(res, 3), "note": "D-flat add9 cadence, bass onset (chord rolls ~0.12 s)"}))
    print(f"music/track.wav: {len(y) / SR:.2f} s, resolution chord written at {res:.3f} s (file time)")


if __name__ == "__main__":
    main()
