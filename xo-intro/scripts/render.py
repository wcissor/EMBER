"""XO "One Breath" — render pipeline (brief sections 8 + 9).

  1. npx remotion render <comp>: H.264, CRF 16, yuv420p, 60 fps, no audio
  2. per cut, an ffmpeg mix: adelay per cue, amix normalize=0, afade on the
     ends, then a two-pass loudnorm (I=-22, TP=-3, linear mode)
  3. mux: ffmpeg -i video.mp4 -i mix.wav -c:v copy -c:a aac -b:a 256k -shortest
  4. out/XO-Main-9x16.mp4, out/XO-Main-16x9.mp4, out/XO-Sting-9x16.mp4,
     out/XO-Sting-16x9.mp4  (+ out/render-report.json)

Natural sound only, from public/sfx/ (made with ElevenLabs Sound Effects).
Missing files are skipped and listed; with none at all a silent track is muxed.

Usage
  python3 scripts/render.py                       # video + sound + mux, all four
  python3 scripts/render.py --audio-only          # after adding sfx: re-mix + re-mux
  python3 scripts/render.py --only XO-Sting-16x9  # one composition
"""
from __future__ import annotations

import argparse
import glob
import json
import math
import os
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

from xo_common import LAYERS, LOGO_PATH, PUBLIC, ROOT, banner

OUT = ROOT / "out"
VIDEO_DIR = OUT / "video"
AUDIO_DIR = OUT / "audio"
SR = 48000

COMPS = {
    "XO-Main-9x16": "main",
    "XO-Main-16x9": "main",
    "XO-Sting-9x16": "sting",
    "XO-Sting-16x9": "sting",
}
DURATION = {"main": 18.0, "sting": 8.0}          # 1080 / 480 frames at 60 fps
FRAMES = {"main": 1080, "sting": 480}


@dataclass
class Cue:
    file: str
    start: float
    kind: str                  # room | fx | bell
    fit: float | None = None   # time-stretch to this many seconds
    loop: bool = False
    fade_in: float = 0.005     # 5 ms fades on every cue
    fade_out: float = 0.005


# Mix targets (section 8): bell peaks at -6 dBFS; brushes and the water drop
# at -14..-12 dBFS (we aim at -13); room tone ~ -38 dBFS RMS.
TARGET = {"room": ("rms", -38.0), "fx": ("peak", -13.0), "bell": ("peak", -6.0)}

SHEET = {
    "main": [
        Cue("room-tone.mp3", 0.0, "room", loop=True, fade_in=1.5, fade_out=1.2),
        Cue("water-drop.mp3", 2.4, "fx"),
        Cue("brush.mp3", 3.0, "fx"),
        Cue("brush-lift.mp3", 5.2, "fx"),
        Cue("brush-long.mp3", 7.0, "fx", fit=3.0),
        Cue("bell.mp3", 11.2, "bell"),
    ],
    "sting": [
        Cue("room-tone.mp3", 0.0, "room", loop=True, fade_in=0.8),
        Cue("brush.mp3", 0.8, "fx"),
        Cue("brush-lift.mp3", 1.7, "fx"),
        Cue("brush-long.mp3", 2.6, "fx", fit=2.0),
        Cue("bell.mp3", 4.7, "bell"),
    ],
}
# Master fade at the end: Main follows the picture's 1.2 s fade to #0D0D0D;
# the Sting ends on the logo, so only a short tail to avoid a hard cut.
MASTER_FADE_OUT = {"main": 1.2, "sting": 0.6}

LOUD_I, LOUD_TP = -22.0, -3.0
MAX_LIFT_DB = 3.0  # never push the whole mix (room tone included) up more than this


# ---------------------------------------------------------------------------
def run(cmd: list[str], quiet=True, **kw) -> subprocess.CompletedProcess:
    r = subprocess.run(cmd, capture_output=quiet, text=True, **kw)
    if r.returncode != 0:
        tail = (r.stderr or "")[-2500:] if quiet else ""
        sys.exit(f"command failed ({r.returncode}): {' '.join(cmd)}\n{tail}")
    return r


def ffmpeg(*args: str) -> subprocess.CompletedProcess:
    return run(["ffmpeg", "-hide_banner", "-nostdin", "-y", *args])


def probe_duration(path: Path) -> float:
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    return float(r.stdout.strip())


def astats(path: Path) -> dict:
    r = run(["ffmpeg", "-hide_banner", "-nostdin", "-i", str(path), "-af", "astats=measure_perchannel=none", "-f", "null", "-"])
    txt = r.stderr
    peak = re.findall(r"Peak level dB:\s*(-?[\d.]+|-inf)", txt)
    rms = re.findall(r"RMS level dB:\s*(-?[\d.]+|-inf)", txt)
    f = lambda v: -math.inf if v == "-inf" else float(v)
    return {"peak": f(peak[-1]) if peak else -math.inf, "rms": f(rms[-1]) if rms else -math.inf}


def loudness(path: Path, stream: str = "0:a") -> dict:
    r = run(["ffmpeg", "-hide_banner", "-nostdin", "-i", str(path), "-map", stream, "-af", "ebur128=peak=true", "-f", "null", "-"])
    summ = r.stderr[r.stderr.rfind("Summary:"):]
    i = re.search(r"I:\s*(-?[\d.]+|-inf)\s*LUFS", summ)
    tp = re.search(r"True peak:\s*Peak:\s*(-?[\d.]+|-inf)\s*dBFS", summ, re.S)
    f = lambda m: (-math.inf if m.group(1) == "-inf" else float(m.group(1))) if m else -math.inf
    return {"lufs": f(i), "true_peak": f(tp)}


def atempo_chain(ratio: float) -> str:
    parts = []
    while ratio > 2.0:
        parts.append(2.0)
        ratio /= 2.0
    while ratio < 0.5:
        parts.append(0.5)
        ratio /= 0.5
    parts.append(ratio)
    return ",".join(f"atempo={p:.6f}" for p in parts)


# ---------------------------------------------------------------------------
# video
# ---------------------------------------------------------------------------
def browser_executable() -> str | None:
    env = os.environ.get("REMOTION_BROWSER_EXECUTABLE")
    if env:
        return env
    hits = sorted(glob.glob("/opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell"))
    return hits[-1] if hits else None  # None: Remotion fetches its own headless shell


def ensure_prep():
    needed = [LAYERS / f for f in ("x1.png", "x2.png", "o.png", "full.png", "meta.json")] + [PUBLIC / "washi.png", PUBLIC / "komorebi.png"]
    stale = LOGO_PATH.exists() and (LAYERS / "meta.json").exists() and LOGO_PATH.stat().st_mtime > (LAYERS / "meta.json").stat().st_mtime
    if stale or not all(p.exists() for p in needed):
        print("prep outputs missing or older than public/xo-logo.png -> running scripts/prep.py")
        run([sys.executable, str(ROOT / "scripts" / "prep.py")], quiet=False)
    return json.loads((LAYERS / "meta.json").read_text())


def render_video(comp: str, concurrency: int) -> Path:
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    out = VIDEO_DIR / f"{comp}.mp4"
    cmd = ["npx", "remotion", "render", "src/index.ts", comp, str(out),
           "--codec=h264", "--crf=16", "--pixel-format=yuv420p", "--image-format=png",
           "--color-space=bt709", "--muted", f"--concurrency={concurrency}", "--log=error"]
    exe = browser_executable()
    if exe:
        cmd.append(f"--browser-executable={exe}")
    t0 = time.time()
    print(f"[video] {comp} ...", flush=True)
    run(cmd, quiet=True, cwd=ROOT)
    n = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
             "stream=nb_read_packets,r_frame_rate,width,height", "-of", "json", str(out)])
    s = json.loads(n.stdout)["streams"][0]
    print(f"[video] {comp}: {s['width']}x{s['height']} {s['r_frame_rate']} fps, {s['nb_read_packets']} frames, "
          f"{out.stat().st_size / 1e6:.1f} MB ({time.time() - t0:.0f}s)")
    if int(s["nb_read_packets"]) != FRAMES[COMPS[comp]]:
        sys.exit(f"{comp}: expected {FRAMES[COMPS[comp]]} frames")
    return out


# ---------------------------------------------------------------------------
# sound
# ---------------------------------------------------------------------------
def prepare_cue(cue: Cue, cut: str, sfx_dir: Path, tmp: Path) -> dict | None:
    src = sfx_dir / cue.file
    if not src.exists():
        return None
    D = DURATION[cut]
    room = D - cue.start
    base = tmp / f"{cut}-{Path(cue.file).stem}"
    dec = base.with_suffix(".dec.wav")
    ffmpeg("-i", str(src), "-ac", "2", "-ar", str(SR), "-c:a", "pcm_f32le", str(dec))
    dur = probe_duration(dec)
    note = []
    if cue.fit and abs(dur - cue.fit) > 0.02:
        fitted = base.with_suffix(".fit.wav")
        ffmpeg("-i", str(dec), "-af", atempo_chain(dur / cue.fit), "-c:a", "pcm_f32le", str(fitted))
        note.append(f"time-stretched {dur:.2f}s -> {cue.fit:.2f}s")
        dec, dur = fitted, probe_duration(fitted)
    if cue.loop and dur < room:
        # seamless loop: chain copies with 1 s equal-power crossfades
        xf = min(1.0, dur / 4)
        n = int(math.ceil((room - xf) / (dur - xf))) + 1
        looped = base.with_suffix(".loop.wav")
        inputs = sum((["-i", str(dec)] for _ in range(n)), [])
        chain, last = [], "[0:a]"
        for k in range(1, n):
            lbl = f"[x{k}]"
            chain.append(f"{last}[{k}:a]acrossfade=d={xf:.3f}:c1=qsin:c2=qsin{lbl}")
            last = lbl
        ffmpeg(*inputs, "-filter_complex", ";".join(chain), "-map", last, "-c:a", "pcm_f32le", str(looped))
        note.append(f"looped x{n} with {xf:.2f}s crossfades")
        dec = looped
    # trim to the piece, then gain-stage on what will actually play
    trimmed = base.with_suffix(".trim.wav")
    ffmpeg("-i", str(dec), "-af", f"atrim=0:{room:.4f}", "-c:a", "pcm_f32le", str(trimmed))
    length = probe_duration(trimmed)
    st = astats(trimmed)
    mode, target = TARGET[cue.kind]
    measured = st[mode]
    gain = 0.0 if not math.isfinite(measured) else target - measured
    fo = min(cue.fade_out, length / 2)
    staged = base.with_suffix(".cue.wav")
    ffmpeg("-i", str(trimmed), "-af",
           f"volume={gain:.3f}dB,afade=t=in:d={min(cue.fade_in, length / 2):.4f}:curve=qsin,"
           f"afade=t=out:st={length - fo:.4f}:d={fo:.4f}:curve=qsin",
           "-c:a", "pcm_f32le", str(staged))
    return {"file": cue.file, "start": cue.start, "path": staged, "kind": cue.kind,
            "measured": {mode: round(measured, 2)}, "target": {mode: target}, "gain_db": round(gain, 2),
            "length_s": round(length, 3), "notes": note}


def two_pass_loudnorm(mix: Path, master: Path) -> dict:
    def measure(extra=""):
        r = run(["ffmpeg", "-hide_banner", "-nostdin", "-i", str(mix), "-af",
                 f"loudnorm=I={LOUD_I}:TP={LOUD_TP}:LRA=50:print_format=json{extra}", "-f", "null", "-"])
        return json.loads(r.stderr[r.stderr.rfind("{"):])

    m = measure()
    mi, mtp = float(m["input_i"]), float(m["input_tp"])
    # linear only: the gain may neither breach -3 dBTP nor lift the room tone more than MAX_LIFT_DB
    gain = min(LOUD_I - mi, (LOUD_TP - 0.2) - mtp, MAX_LIFT_DB)
    target = mi + gain
    second = (f"loudnorm=I={target:.2f}:TP={LOUD_TP}:LRA=50:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
              f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:"
              f"linear=true:print_format=json,aresample={SR}")
    r = run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-i", str(mix), "-af", second, "-c:a", "pcm_s24le", str(master)])
    out = json.loads(r.stderr[r.stderr.rfind("{"):])
    return {"measured_lufs": mi, "measured_tp": mtp, "applied_gain_db": round(gain, 2), "target_lufs": round(target, 2),
            "normalization_type": out.get("normalization_type"), "output_lufs": float(out["output_i"]),
            "output_tp": float(out["output_tp"])}


def build_mix(cut: str, sfx_dir: Path) -> dict:
    D = DURATION[cut]
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    tmp = AUDIO_DIR / "tmp"
    tmp.mkdir(exist_ok=True)
    cues, missing = [], []
    for cue in SHEET[cut]:
        c = prepare_cue(cue, cut, sfx_dir, tmp)
        (cues.append(c) if c else missing.append(cue.file))
    master = AUDIO_DIR / f"{cut}-master.wav"
    info = {"cut": cut, "missing": missing, "cues": [{k: v for k, v in c.items() if k != "path"} for c in cues]}
    if not cues:
        ffmpeg("-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=stereo", "-t", f"{D}", "-c:a", "pcm_s24le", str(master))
        info["silent"] = True
        return info
    mix = AUDIO_DIR / f"{cut}-mix.wav"
    inputs = sum((["-i", str(c["path"])] for c in cues), [])
    parts = []
    for i, c in enumerate(cues):
        ms = int(round(c["start"] * 1000))
        parts.append(f"[{i}:a]adelay=delays={ms}|{ms}[a{i}]")
    fo = MASTER_FADE_OUT[cut]
    parts.append("".join(f"[a{i}]" for i in range(len(cues))) +
                 f"amix=inputs={len(cues)}:normalize=0:duration=longest:dropout_transition=0,"
                 f"apad=whole_dur={D},atrim=0:{D},asetpts=N/SR/TB,"
                 f"afade=t=in:d=0.005,afade=t=out:st={D - fo:.3f}:d={fo:.3f}:curve=qsin[m]")
    ffmpeg(*inputs, "-filter_complex", ";".join(parts), "-map", "[m]", "-ar", str(SR), "-c:a", "pcm_f32le", str(mix))
    info["mix_stats"] = astats(mix)
    info["loudnorm"] = two_pass_loudnorm(mix, master)
    return info


def mux(comp: str, video: Path, master: Path) -> Path:
    out = OUT / f"{comp}.mp4"
    ffmpeg("-i", str(video), "-i", str(master), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
           "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", str(out))
    return out


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", help="comma-separated composition ids")
    ap.add_argument("--audio-only", action="store_true", help="reuse out/video/*.mp4; re-mix and re-mux")
    ap.add_argument("--sfx-dir", default=str(PUBLIC / "sfx"))
    ap.add_argument("--concurrency", type=int, default=os.cpu_count() or 4)
    args = ap.parse_args()

    comps = [c.strip() for c in args.only.split(",")] if args.only else list(COMPS)
    for c in comps:
        if c not in COMPS:
            sys.exit(f"unknown composition {c}; choose from {', '.join(COMPS)}")
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found on PATH")
    meta = ensure_prep()
    if meta.get("standin"):
        print(banner("RENDERING WITH THE STAND-IN LOGO (public/xo-logo.png not found)"))

    report = {"standin_logo": bool(meta.get("standin")), "videos": {}, "mixes": {}}
    videos = {}
    for comp in comps:
        v = VIDEO_DIR / f"{comp}.mp4"
        if args.audio_only:
            if not v.exists():
                sys.exit(f"{v} missing: render the video first (drop --audio-only)")
        else:
            v = render_video(comp, args.concurrency)
        videos[comp] = v

    sfx_dir = Path(args.sfx_dir)
    for cut in sorted({COMPS[c] for c in comps}):
        info = build_mix(cut, sfx_dir)
        report["mixes"][cut] = info
        if info.get("silent"):
            print(f"[sound] {cut}: no sfx found in {sfx_dir} -> silent track")
        else:
            ln = info["loudnorm"]
            print(f"[sound] {cut}: {len(info['cues'])} cues, loudnorm {ln['normalization_type']} "
                  f"{ln['applied_gain_db']:+.2f} dB -> {ln['output_lufs']:.1f} LUFS, {ln['output_tp']:.1f} dBTP")
        if info["missing"]:
            print(f"[sound] {cut}: MISSING {', '.join(info['missing'])} (rendered without)")

    for comp, v in videos.items():
        cut = COMPS[comp]
        out = mux(comp, v, AUDIO_DIR / f"{cut}-master.wav")
        entry = {"file": str(out.relative_to(ROOT)), "size_mb": round(out.stat().st_size / 1e6, 1),
                 "duration_s": round(probe_duration(out), 3)}
        if not report["mixes"][cut].get("silent"):
            entry["audio"] = loudness(out)
        report["videos"][comp] = entry
        a = entry.get("audio")
        print(f"[mux] {entry['file']}  {entry['duration_s']} s  {entry['size_mb']} MB" +
              (f"  audio {a['lufs']:.1f} LUFS / {a['true_peak']:.1f} dBTP" if a else "  (silent)"))

    OUT.mkdir(exist_ok=True)
    (OUT / "render-report.json").write_text(json.dumps(report, indent=2, default=str))
    missing = sorted({m for i in report["mixes"].values() for m in i["missing"]})
    if missing:
        print(f"\nMissing sound files (add to {sfx_dir}, then run `npm run render -- --audio-only`):\n  " + "\n  ".join(missing))
    if report["standin_logo"]:
        print(banner("STAND-IN LOGO: add public/xo-logo.png, then `npm run build`"))


if __name__ == "__main__":
    main()
