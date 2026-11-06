"""Extract exact source frame ranges with a light artifact denoise (hqdn3d).

Frames are written as 16-bit RGB PNG (BT.709 limited -> full RGB, full chroma
interpolation) so later scaling/grading keeps precision. No audio is read (-an).
Conform to 24 fps happens later by reading the PNGs with -framerate 24.
"""
import json
import shutil
import subprocess
import sys

from config import FOOTAGE, SHOTS, WORK, shot_dir

TO_RGB = ("scale=in_color_matrix=bt709:in_range=tv:"
          "flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp,format=rgb48be")


def main(only=None):
    cmap = json.loads((WORK / "clipmap.json").read_text())
    for sid, s in SHOTS.items():
        if only and sid not in only:
            continue
        src = FOOTAGE / cmap[s["clip"]]["file"]
        d = shot_dir("frames", sid)
        shutil.rmtree(d, ignore_errors=True)
        d.mkdir(parents=True)
        vf = (f"select='between(n\\,{s['first']}\\,{s['last']})',"
              f"format=yuv420p16le,hqdn3d=1.5:1.2:3:3,{TO_RGB}")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-an", "-vf", vf,
                        "-fps_mode", "passthrough", str(d / "%06d.png")], check=True)
        n = len(list(d.glob("*.png")))
        ok = n == s["frames"]
        print(f"{sid} {s['clip']} frames {s['first']}-{s['last']}: {n} PNGs (expect {s['frames']}) "
              f"{'OK' if ok else 'MISMATCH'}")
        if not ok:
            sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[1:] or None)
