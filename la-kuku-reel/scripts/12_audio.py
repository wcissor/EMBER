"""Music edit: align the resolution chord to the title, cut, fade, two-pass loudnorm.

1. librosa onset strength on music/track.(wav|mp3); strongest onset in the back half of the
   cue = resolution chord; offset = onset - 13.6 s (if no clear chord, offset 0).
2. ffmpeg -ss offset -t 16.625, afade in 0-1 s, out 15.125-16.625 s -> work/music_cut.wav
3. loudnorm I=-14 TP=-1.5 LRA=7, two passes, linear; if it reverts to dynamic, retry at
   I=-15 (the brief's fallback). Writes work/music_norm.wav and work/audio_report.json.
"""
import json
import re
import subprocess
import sys

import librosa
import numpy as np

from config import MUSIC, TITLE_IN, TOTAL, WORK

TARGET_T = TITLE_IN[0]           # 13.6 s


def find_track():
    for ext in ("wav", "mp3", "m4a", "flac"):
        p = MUSIC / f"track.{ext}"
        if p.exists():
            return p
    sys.exit("no music/track.* found")


def align(track):
    """Strongest late onset of (full-band + bass-band) onset strength = resolution chord.

    The bass band matters: a cadence is defined by the root arriving, and in a soft, mastered
    piano cue full-band onsets are nearly flat. 'Clear' = beats the late-window runner-up by
    >= 1.15x. Returns (offset, onset, ratio)."""
    y, sr = librosa.load(str(track), sr=22050, mono=True)
    hop = 256
    S = np.abs(librosa.stft(y, n_fft=4096, hop_length=hop))
    f = librosa.fft_frequencies(sr=sr, n_fft=4096)
    full = librosa.onset.onset_strength(S=librosa.amplitude_to_db(S), sr=sr, hop_length=hop)
    low = librosa.onset.onset_strength(S=librosa.amplitude_to_db(S[f < 300]), sr=sr, hop_length=hop)
    env = full / np.median(full[full > 0]) + low / np.median(low[low > 0])
    times = librosa.times_like(env, sr=sr, hop_length=hop)
    peaks = librosa.util.peak_pick(env, pre_max=20, post_max=20, pre_avg=40, post_avg=40, delta=0.3, wait=20)
    dur = len(y) / sr
    late = sorted([p for p in peaks if TARGET_T - 1.0 <= times[p] <= dur - 2.0], key=lambda p: -env[p])
    if not late:
        return 0.0, None, None
    ratio = float(env[late[0]] / env[late[1]]) if len(late) > 1 else float("inf")
    onset = float(times[late[0]])
    return (max(0.0, onset - TARGET_T) if ratio >= 1.15 else 0.0), onset, ratio


def loudnorm(src, dst, I):
    flt = f"loudnorm=I={I}:TP=-1.5:LRA=7"
    p1 = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(src), "-af", flt + ":print_format=json",
                         "-f", "null", "-"], capture_output=True, text=True).stderr
    m = json.loads(re.findall(r"\{[^{}]*\}", p1)[-1])
    flt2 = (f"{flt}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
            f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=json")
    p2 = subprocess.run(["ffmpeg", "-hide_banner", "-y", "-i", str(src), "-af", flt2, "-ar", "48000",
                         "-c:a", "pcm_s24le", str(dst)], capture_output=True, text=True).stderr
    m2 = json.loads(re.findall(r"\{[^{}]*\}", p2)[-1])
    return m, m2


def main():
    track = find_track()
    offset, onset, ratio = align(track)
    print(f"track {track.name}: strongest late onset {onset:.3f} s ({ratio:.2f}x runner-up, clear >= 1.15) "
          f"-> offset {offset:.3f} s, chord lands at {onset - offset:.3f} s"
          if onset is not None else "no clear late chord -> offset 0")
    cue = track.with_suffix(".cue.json")
    if cue.exists():   # composer's marker for a cue written by 11_music.py: cross-check only
        mark = json.loads(cue.read_text())["resolution_s"]
        print(f"cue marker {mark:.3f} s: detection {'agrees' if onset is not None and abs(onset - mark) < 0.15 else 'DISAGREES'}"
              f" (delta {0 if onset is None else onset - mark:+.3f} s)")
    cut, norm = WORK / "music_cut.wav", WORK / "music_norm.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{offset:.3f}", "-i", str(track), "-t", str(TOTAL),
                    "-af", f"afade=t=in:st=0:d=1,afade=t=out:st={TOTAL - 1.5}:d=1.5", "-ar", "48000",
                    "-c:a", "pcm_s24le", str(cut)], check=True)
    rep = dict(track=track.name, onset=onset, offset=offset, chord_lands_at=None if onset is None else onset - offset)
    for I in (-14, -15):
        m1, m2 = loudnorm(cut, norm, I)
        rep.update(target_I=I, pass1=m1, pass2=m2)
        print(f"loudnorm I={I}: input I {m1['input_i']} TP {m1['input_tp']} LRA {m1['input_lra']} -> "
              f"{m2['normalization_type']} (output I {m2['output_i']} TP {m2['output_tp']})")
        if m2["normalization_type"] == "linear":
            break
    (WORK / "audio_report.json").write_text(json.dumps(rep, indent=2))


if __name__ == "__main__":
    main()
