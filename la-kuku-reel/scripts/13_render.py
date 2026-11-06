"""Final render (brief section 8) -> out/la-kuku-terrasse-reel.mp4 + out/cover.jpg

Same graph as the brief: 0.5 s xfades at 3.625 / 7.000 / 10.125 / 11.625, vignette PI/6,
title fade-in 13.6-14.4 s, luma-only temporal grain AFTER scaling and on top of the text,
fades after grain (0-0.5 s in, 15.875-16.625 s out), H.264 High CRF 16 tune=grain, AAC 256k.
Fixes: title looped at 24 fps (not image2's default 25), RGBA title converted to YUV with an
explicit BT.709 matrix (swscale defaults to BT.601), compositing in 4:4:4 with a single
4:2:0 conversion at the end, cover JPEG made via RGB so JPEG's BT.601 full range is correct.
"""
import subprocess
import sys

from config import COVER_T, DISSOLVE, FADE_IN, FADE_OUT, OFFSETS, OUT, TITLE_IN, TOTAL, WORK

DST = OUT / "la-kuku-terrasse-reel.mp4"
# Capped CRF: the brief's CRF 16 / tune=grain, plus a VBV ceiling. Uncapped, per-pixel temporal grain
# drives x264 to ~96 Mbit/s (200 MB for 16.6 s) with no visible gain after Instagram's re-encode.
# Pass --uncapped to reproduce the brief's encode exactly.
VBV = [] if "--uncapped" in sys.argv else ["-maxrate", "20M", "-bufsize", "40M"]
COVER = OUT / "cover.jpg"


def graph():
    g = []
    prev = "[0:v]"
    for i, off in enumerate(OFFSETS, start=1):
        out = f"[x{i}]" if i < len(OFFSETS) else "[xf]"
        g.append(f"{prev}[{i}:v]xfade=transition=fade:duration={DISSOLVE}:offset={off:.3f}{out}")
        prev = out
    g.append("[xf]format=yuv444p,vignette=angle=PI/6[v]")
    g.append(f"[5:v]format=rgba,fade=t=in:st={TITLE_IN[0]}:d={TITLE_IN[1]}:alpha=1,"
             "scale=out_color_matrix=bt709:out_range=tv,format=yuva444p[t]")
    g.append(f"[v][t]overlay=0:0:shortest=1:format=yuv444,noise=c0s=7:c0f=t,"
             f"fade=t=in:st={FADE_IN[0]}:d={FADE_IN[1]},fade=t=out:st={FADE_OUT[0]}:d={FADE_OUT[1]},"
             "format=yuv420p[vout]")
    return ";\n".join(g)


def main():
    OUT.mkdir(exist_ok=True)
    cmd = ["ffmpeg", "-v", "error", "-y"]
    for s in ("S1", "S2", "S3", "S4", "S5"):
        cmd += ["-i", str(WORK / "shots" / f"{s}.mov")]
    cmd += ["-framerate", "24", "-loop", "1", "-i", str(WORK / "title.png"), "-i", str(WORK / "music_norm.wav"),
            "-filter_complex", graph(), "-map", "[vout]", "-map", "6:a", "-t", str(TOTAL), "-r", "24",
            "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "16", "-tune", "grain", *VBV,
            "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
            "-color_range", "tv", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", str(DST)]
    print(graph())
    subprocess.run(cmd, check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(COVER_T), "-i", str(DST), "-frames:v", "1",
                    "-vf", "scale=in_color_matrix=bt709:in_range=tv:flags=accurate_rnd+full_chroma_int,format=rgb24",
                    "-q:v", "2", str(COVER)], check=True)
    print(f"wrote {DST} and {COVER}")


if __name__ == "__main__":
    main()
