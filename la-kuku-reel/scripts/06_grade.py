"""Grade each fitted shot and save ProRes 422 HQ 10-bit (work/shots/S#.mov).

chain:  16-bit RGB PNGs @24fps -> per-shot LUT (tetrahedral)
        -> halation (S3-S5 only): highlights > Y 200 x7, blur 20, warm tint, screen in RGB
        -> BT.709 limited YUV 4:2:2 10-bit (explicit matrix; swscale defaults to BT.601)

The screen blend is written as an exact 16-bit expression, out = A + o*B*(65535-A)/65535:
ffmpeg 6.1's built-in 16-bit screen passes the brief's opacity-0 identity test but is wrong
at any other opacity (mean error ~67 8-bit levels vs NumPy), and the float32 route costs up
to 0.13 levels in swscale's int<->float conversion. The self-test checks both opacities.

  python3 06_grade.py [S1 ...]      grade shots
  python3 06_grade.py --self-test   opacity 0 must be identical; opacity 0.30 must match
                                    out = a + 0.30*h*(1-a) to within 0.5 8-bit levels
"""
import subprocess
import sys

from config import LUTS, SHOTS, WORK

HALATION = {"S3": 0.30, "S4": 0.30, "S5": 0.35}
HALO_THRESHOLD = {"S3": 200, "S4": 200, "S5": 200}
DEPTH = "gbrp16le"            # LUT + halation path, end to end
TO_709 = "scale=out_color_matrix=bt709:out_range=tv"


def graph(shot, opacity=None, lut=True):
    g = f"[0:v]format={DEPTH}"
    if lut:
        g += f",lut3d=file={LUTS / f'lakuku_quiet_{shot}.cube'}:interp=tetrahedral"
    op = HALATION.get(shot) if opacity is None else opacity
    if op is None:
        return g + "[out]"
    thr = HALO_THRESHOLD.get(shot, 200)
    return (g + ",split[a][b];"
            f"[b]{TO_709},format=yuv444p,lutyuv=y='clip((val-{thr})*7,0,255)':u=128:v=128,"
            "format=gbrp,gblur=sigma=20,colorchannelmixer=rr=1:gg=0.55:bb=0.25,"
            f"format={DEPTH}[h];"
            f"[a][h]blend=all_expr='A+{op}*B*(65535-A)/65535'[out]")


def encode(shot, filtergraph, dst):
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-framerate", "24", "-i", str(WORK / "fit" / shot / "%06d.png"),
        "-filter_complex", filtergraph + f";[out]{TO_709},format=yuv422p10le[v]", "-map", "[v]",
        "-c:v", "prores_ks", "-profile:v", "3", "-vendor", "apl0", "-pix_fmt", "yuv422p10le",
        "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
        "-r", "24", str(dst)], check=True)


def self_test(shot="S3", n=44):
    """opacity 0 -> bit-identical to the LUT-only image; opacity 0.30 -> matches NumPy screen."""
    import tempfile
    import numpy as np
    import cv2
    src = str(WORK / "fit" / shot / f"{n:06d}.png")
    lut_only = graph(shot, opacity=None, lut=True).split(",split")[0] + "[out]"
    halo_layer = graph(shot, opacity=0.0).split("[h];")[0] + "[h];[h]format=gbrp16le[out]"
    halo_layer = halo_layer.replace(",split[a][b];[b]", ",split[a][b];[a]nullsink;[b]")

    def grab(fg):
        with tempfile.NamedTemporaryFile(suffix=".png") as t:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex",
                            fg + ";[out]format=rgb48le[o]", "-map", "[o]", "-frames:v", "1", t.name], check=True)
            return cv2.imread(t.name, -1).astype(np.float64) / 65535.0

    a, h = grab(lut_only), grab(halo_layer)
    z, o3 = grab(graph(shot, opacity=0.0)), grab(graph(shot, opacity=0.30))
    e0 = np.abs(z - a).max() * 255
    e3 = np.abs(o3 - (a + 0.30 * h * (1 - a))).max() * 255
    ok = e0 < 0.01 and e3 < 0.5
    print(f"self-test (16-bit expression screen): opacity 0 max diff {e0:.3f} levels; "
          f"opacity 0.30 vs NumPy screen max err {e3:.3f} levels -> {'PASS' if ok else 'FAIL'}")
    return ok


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(0 if self_test() else 1)
    for s in sys.argv[1:] or list(SHOTS):
        encode(s, graph(s), WORK / "shots" / f"{s}.mov")
        print(f"{s}: work/shots/{s}.mov (halation {HALATION.get(s, 'off')})", flush=True)
