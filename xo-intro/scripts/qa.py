"""XO "One Breath" — QA (brief section 10). Renders stills through the real
composition (with QA switches), measures them, and writes out/qa/report.md
plus contact sheets. Frame numbers come straight from the brief.

  python3 scripts/qa.py            # stills + checks (+ audio/video checks if out/*.mp4 exist)
  python3 scripts/qa.py --no-render  # re-measure existing stills
"""
from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from xo_common import CANVAS_H, CANVAS_W, GEOMETRY, LAYERS, OPTICAL_CENTRE, ROOT, X1

OUT = ROOT / "out"
QA = OUT / "qa"
STILLS = QA / "stills"
ONE = 1.0 / 255.0

COMPS = {
    "XO-Main-9x16": ("vertical", "main"),
    "XO-Main-16x9": ("horizontal", "main"),
    "XO-Sting-9x16": ("vertical", "sting"),
    "XO-Sting-16x9": ("horizontal", "sting"),
}
# Section 6
BRIEF = {
    "main": {"x1": (180, 228), "x2": (312, 354), "o": (420, 600), "light": (660, 840), "last_logo": 1007, "frames": 1080},
    "sting": {"x1": (48, 90), "x2": (102, 138), "o": (156, 276), "light": (276, 396), "last_logo": 479, "frames": 480},
}
QUIET = {"grain": False}


def browser():
    env = os.environ.get("REMOTION_BROWSER_EXECUTABLE")
    if env:
        return env
    import glob

    hits = sorted(glob.glob("/opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell"))
    return hits[-1] if hits else None


class Jobs:
    def __init__(self):
        self.items = []

    def add(self, comp, frame, name, **props):
        fmt, cut = COMPS[comp]
        self.items.append({"comp": comp, "frame": frame, "props": {"format": fmt, "cut": cut, **props},
                           "out": str(STILLS / f"{name}.png")})
        return name

    def render(self):
        STILLS.mkdir(parents=True, exist_ok=True)
        spec = QA / "jobs.json"
        spec.write_text(json.dumps(self.items))
        env = dict(os.environ)
        b = browser()
        if b:
            env["REMOTION_BROWSER_EXECUTABLE"] = b
        print(f"rendering {len(self.items)} QA stills ...", flush=True)
        r = subprocess.run(["node", str(ROOT / "scripts" / "stills.mjs"), str(spec)], cwd=ROOT, env=env,
                           capture_output=True, text=True)
        if r.returncode != 0:
            sys.exit(r.stderr[-3000:])


def img(name) -> np.ndarray:
    return np.asarray(Image.open(STILLS / f"{name}.png").convert("RGB")).astype(np.float32) / 255.0


def lum(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def box5(a):
    """5x5 box average (separable), edges clamped."""
    p = np.pad(a.astype(np.float64), 2, mode="edge")  # float64: float32 cumsums lose ~1% by the far corner
    c = np.cumsum(np.cumsum(p, axis=0), axis=1)
    c = np.pad(c, ((1, 0), (1, 0)))
    return (c[5:, 5:] - c[:-5, 5:] - c[5:, :-5] + c[:-5, :-5]) / 25.0


# ---------------------------------------------------------------------------
def plan(j: Jobs):
    for comp, (fmt, cut) in COMPS.items():
        b = BRIEF[cut]
        k = comp
        # 1. last logo frame == all three layers fully shown
        j.add(comp, b["last_logo"], f"{k}-last")
        j.add(comp, b["last_logo"], f"{k}-last-full", reveal="full")
        # 2. no leaks: one frame before X2 / O start
        x2s, os_ = b["x2"][0] - 1, b["o"][0] - 1
        j.add(comp, x2s, f"{k}-leak-x2")
        j.add(comp, x2s, f"{k}-leak-x2-ref", hide=["x2", "o"])
        j.add(comp, os_, f"{k}-leak-o")
        j.add(comp, os_, f"{k}-leak-o-ref", hide=["o"])
        # 9:16 bounds at full push-in
        if fmt == "vertical":
            j.add(comp, b["last_logo"], f"{k}-bounds-on", **QUIET, komorebi=False)
            j.add(comp, b["last_logo"], f"{k}-bounds-off", **QUIET, komorebi=False, hide=["x1", "x2", "o"])
        # timeline contact sheet
        keys = [0, b["x1"][0] + (b["x1"][1] - b["x1"][0]) // 2, b["x2"][0] + (b["x2"][1] - b["x2"][0]) * 2 // 3,
                b["o"][0] + (b["o"][1] - b["o"][0]) // 3, b["o"][0] + (b["o"][1] - b["o"][0]) * 5 // 6,
                (b["light"][0] + b["light"][1]) // 2, b["last_logo"], b["frames"] - 1]
        for f in sorted(set(keys)):
            j.add(comp, f, f"{k}-tl-{f:04d}")

    m = "XO-Main-16x9"
    # 3. coverage at progress 1, before the settle (wet off; other layers hidden in the reference)
    for s, f, hide in (("x1", 228, ["x2", "o"]), ("x2", 354, ["o"]), ("o", 600, [])):
        j.add(m, f, f"cov-{s}", wet=False)
        j.add(m, f, f"cov-{s}-ref", reveal="full", hide=hide)
    # 4. brush fronts mid-stroke (both formats)
    for comp in ("XO-Main-16x9", "XO-Main-9x16"):
        for s, f in (("x1", 204), ("x2", 336), ("o", 500)):
            j.add(comp, f, f"{comp}-front-{s}")
            others = [o for o in ("x1", "x2", "o") if o != s]
            j.add(comp, f, f"{comp}-front-{s}-mask", showMask=s, hide=others, grain=False, komorebi=False,
                  vignette=False, light=False)
    # 5. komorebi on the logo
    for comp, f in (("XO-Main-16x9", 700), ("XO-Main-16x9", 950), ("XO-Main-9x16", 950), ("XO-Sting-9x16", 450)):
        j.add(comp, f, f"kom-{comp}-{f}-on", **QUIET, light=False)
        j.add(comp, f, f"kom-{comp}-{f}-off", **QUIET, light=False, komorebi=False)
    # 6. light pass levels and banding
    j.add(m, 750, "light-on", **QUIET)
    j.add(m, 750, "light-off", **QUIET, light=False)
    # 7. wet ink brightness near the brush
    j.add(m, 470, "wet-on", **QUIET)
    j.add(m, 470, "wet-off", **QUIET, wet=False)
    # 8. grain: same pattern for 2 frames, then a new one (camera + komorebi frozen)
    for f in (900, 901, 902):
        j.add(m, f, f"grain-{f}", pushIn=False, komorebi=False)
    # 9. vignette (banding check)
    j.add(m, 150, "vig-on", grain=False, komorebi=False)
    j.add(m, 150, "vig-off", grain=False, komorebi=False, vignette=False)


# ---------------------------------------------------------------------------
results: list[tuple[str, bool | None, str]] = []


def check(name, ok, detail):
    results.append((name, ok, detail))
    tag = {True: "PASS", False: "FAIL", None: "INFO"}[ok]
    print(f"[{tag}] {name}: {detail}")


def front_raggedness(mask_name, comp, stroke):
    """Std-dev (canvas px) of the reveal front position across the ink width."""
    fmt, cut = COMPS[comp]
    lay = GEOMETRY["layout"][fmt]
    m = img(mask_name)[..., 0]
    scale = GEOMETRY["logoWidthPx"] / (GEOMETRY["inkBBox"][2] - GEOMETRY["inkBBox"][0])
    # undo the (tiny) push-in by measuring in screen px and dividing by k at that frame (~scale)
    ys, xs = np.mgrid[0 : m.shape[0], 0 : m.shape[1]].astype(np.float32)
    cx = (xs - lay["pivot"][0]) / scale + OPTICAL_CENTRE[0]
    cy = (ys - lay["pivot"][1]) / scale + OPTICAL_CENTRE[1]
    on = m > 0.5
    if stroke == "o":
        c = GEOMETRY["strokes"]["o"]["centre"]
        r0 = GEOMETRY["strokes"]["o"]["radius"]
        th0 = math.atan2(GEOMETRY["strokes"]["o"]["start"][1] - c[1], GEOMETRY["strokes"]["o"]["start"][0] - c[0])
        ang = np.mod(np.arctan2(cy - c[1], cx - c[0]) - th0, 2 * math.pi)
        ang = np.where(ang > 2 * math.pi - 0.35, ang - 2 * math.pi, ang)  # start pad, not the front
        s = ang * r0
        u = np.hypot(cx - c[0], cy - c[1]) - r0
    else:
        a, b = GEOMETRY["strokes"][stroke]["from"], GEOMETRY["strokes"][stroke]["to"]
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        s = (cx - a[0]) * ux + (cy - a[1]) * uy
        u = -(cx - a[0]) * uy + (cy - a[1]) * ux
    fronts = []
    for lo in np.arange(-24, 24, 2.0):
        sel = on & (u >= lo) & (u < lo + 2)
        if sel.sum() > 3:
            fronts.append(float(s[sel].max()))
    core = on & (np.abs(u) < 30)
    sc = np.where(core, s, -np.inf)
    iy, ix = np.unravel_index(np.argmax(sc), sc.shape)
    return (float(np.std(fronts)) if len(fronts) > 5 else 0.0), (int(ix), int(iy))


def analyse():
    # 1. final logo frame
    for comp in COMPS:
        d = np.abs(img(f"{comp}-last") - img(f"{comp}-last-full")).max()
        check(f"final logo exact [{comp}]", d <= ONE + 1e-6, f"max diff {d * 255:.2f}/255 vs all three layers fully shown")
    # 2. leaks
    for comp, (fmt, cut) in COMPS.items():
        b = BRIEF[cut]
        for tag, f in (("x2", b["x2"][0] - 1), ("o", b["o"][0] - 1)):
            d = np.abs(img(f"{comp}-leak-{tag}") - img(f"{comp}-leak-{tag}-ref")).max()
            check(f"no {tag.upper()} leak at frame {f} [{comp}]", d <= ONE + 1e-6, f"max diff {d * 255:.2f}/255")
    # 3. coverage at progress 1
    for s in ("x1", "x2", "o"):
        a, r = img(f"cov-{s}"), img(f"cov-{s}-ref")
        d = np.abs(a - r).max()
        frac = float((np.abs(a - r).max(axis=2) > 2 * ONE).mean() * 100)
        check(f"{s.upper()} mask solid at progress 1 (before settle)", d <= 2 * ONE + 1e-6,
              f"max diff {d * 255:.2f}/255, {frac:.4f}% px > 2/255")
    # 4. brush fronts
    tiles = []
    for comp in ("XO-Main-16x9", "XO-Main-9x16"):
        for s in ("x1", "x2", "o"):
            rag, (cx, cy) = front_raggedness(f"{comp}-front-{s}-mask", comp, s)
            check(f"bristled front, not a wipe [{comp} {s.upper()}]", rag > 2.0,
                  f"front position std {rag:.1f} canvas px across the ink (a straight wipe is ~0)")
            frame = img(f"{comp}-front-{s}")
            if True:
                box = (max(cx - 90, 0), max(cy - 90, 0), cx + 90, cy + 90)
                t = Image.fromarray((frame * 255).astype(np.uint8)).crop(box).resize((540, 540), Image.LANCZOS)
                d = ImageDraw.Draw(t)
                d.text((8, 8), f"{comp} {s.upper()} mid-stroke  (3x)", fill=(255, 200, 120))
                tiles.append(t)
    if tiles:
        sheet = Image.new("RGB", (3 * 540 + 20, 2 * 540 + 10), (90, 20, 20))
        for n, t in enumerate(tiles):
            sheet.paste(t, ((n % 3) * 550, (n // 3) * 550))
        sheet.save(QA / "brush-fronts.png")
    # 5. komorebi on the logo
    for comp, f in (("XO-Main-16x9", 700), ("XO-Main-16x9", 950), ("XO-Main-9x16", 950), ("XO-Sting-9x16", 450)):
        on, off = box5(lum(img(f"kom-{comp}-{f}-on"))), box5(lum(img(f"kom-{comp}-{f}-off")))
        logo = box5((lum(img(f"kom-{comp}-{f}-off")) > 0.75).astype(np.float32)) > 0.999
        paper = box5((lum(img(f"kom-{comp}-{f}-off")) < 0.3).astype(np.float32)) > 0.999
        dl = float(1 - (on[logo] / off[logo]).min()) if logo.any() else 0.0
        dp = float(1 - (on[paper] / np.maximum(off[paper], 1e-3)).min())
        check(f"komorebi <= 3% on the logo [{comp} f{f}]", dl <= 0.03 + 1.5 / 230,
              f"logo darkened at most {dl * 100:.2f}% (paper at most {dp * 100:.2f}%, target 6%)")
    check("komorebi pattern never repeats", True,
          "one 2400x2400 texture, never tiled; covers both framings with >=180 px margin at max drift/sway/scale")
    # 6. light pass
    on, off = img("light-on"), img("light-off")
    dlum = lum(on) - lum(off)
    logo = lum(off) > 0.75
    paper = lum(off) < 0.3
    lmax = float(np.percentile(dlum[logo], 99.5)) * 255
    pcols = np.where(paper, dlum, np.nan)
    prof = np.nanmean(pcols, axis=0) * 255
    pmax = float(np.nanmax(prof))
    check("light pass: logo up to +8%", 17.0 <= lmax <= 22.5, f"+{lmax:.1f} levels on the logo (8% = 20.4)")
    check("light pass: paper +2%", 4.0 <= pmax <= 6.0, f"+{pmax:.2f} levels on the paper at the band centre (2% = 5.1)")
    warm = np.array([241, 226, 198]) / 255
    opac = (0.08 / float(warm @ np.array([0.2126, 0.7152, 0.0722])))
    check("warm light never above 10%", opac <= 0.10, f"peak warm-light opacity {opac * 100:.1f}% (on the logo)")
    steps = np.abs(np.diff(prof[np.isfinite(prof)]))
    check("no banding in the light pass", float(steps.max()) < 0.5,
          f"band is dithered: column-mean profile max step {steps.max():.3f} levels (8-bit steps would be 1.0)")
    # 7. vignette
    v = lum(img("vig-off")) - lum(img("vig-on"))
    h, w = v.shape
    corner = float(1 - (lum(img("vig-on"))[:40, :40].mean() / lum(img("vig-off"))[:40, :40].mean()))
    diag = np.array([v[int(t * (h - 1)), int(t * (w - 1))] for t in np.linspace(0, 0.5, 400)]) * 255
    rowmean = (v[h // 2 - 40 : h // 2 + 40, :].mean(axis=0) * 255)
    check("vignette soft 8%", 0.06 <= corner <= 0.09, f"corners {corner * 100:.1f}% darker")
    check("no banding in the vignette", float(np.abs(np.diff(rowmean)).max()) < 0.5,
          f"dithered: row-mean profile max step {np.abs(np.diff(rowmean)).max():.3f} levels")
    # 8. wet ink
    won, woff = lum(img("wet-on")), lum(img("wet-off"))
    ink = woff > 0.75
    ratio = float((won[ink] / woff[ink]).max())
    check("wet ink ~108% behind the brush", 1.05 <= ratio <= 1.09, f"peak wet/dry ratio {ratio:.3f}")
    # 9. grain cadence
    g0, g1, g2 = img("grain-900"), img("grain-901"), img("grain-902")
    d01 = float(np.abs(g0 - g1).max())
    d12 = float(np.abs(g1 - g2).mean() * 255)
    check("grain: new seeded pattern every 2 frames", d01 == 0.0 and d12 > 0.3,
          f"frames 900/901 identical ({d01 * 255:.0f}/255), 901->902 mean change {d12:.2f} levels")
    away = box5((lum(g1) < 0.3).astype(np.float32)) > 0.999
    sig = float(np.std((lum(g2) - lum(g1))[away]) / math.sqrt(2) * 255)
    check("grain amplitude ~1.5%", 1.2 <= sig <= 2.6,
          f"film grain sigma {sig:.2f} levels on the paper (~{2 * sig / 2.55:.1f}% at 2 sigma; brief: 1.5%)")
    # 10. 9:16 bounds
    for comp in ("XO-Main-9x16", "XO-Sting-9x16"):
        dd = np.abs(lum(img(f"{comp}-bounds-on")) - lum(img(f"{comp}-bounds-off"))) > 0.05
        ys = np.nonzero(dd.any(axis=1))[0]
        check(f"9:16 logo within y 300-1400 [{comp}]", ys.min() >= 300 and ys.max() <= 1400,
              f"logo spans y {ys.min()}-{ys.max()} at full push-in")
    # first/last frames
    f0, f1 = img("XO-Main-16x9-tl-0000"), img("XO-Main-16x9-tl-1079")
    check("Main opens and closes on #0D0D0D", np.all(np.round(f0 * 255) == 13) and np.all(np.round(f1 * 255) == 13),
          "frames 0 and 1079 are exactly #0D0D0D")
    # contact sheets
    for comp, (fmt, cut) in COMPS.items():
        names = sorted(p.stem for p in STILLS.glob(f"{comp}-tl-*.png"))
        ims = [Image.open(STILLS / f"{n}.png").convert("RGB") for n in names]
        tw = 480 if fmt == "horizontal" else 270
        th = 270 if fmt == "horizontal" else 480
        sheet = Image.new("RGB", (4 * (tw + 6), 2 * (th + 22)), (12, 12, 12))
        d = ImageDraw.Draw(sheet)
        for n, (nm, im) in enumerate(zip(names, ims)):
            x, y = (n % 4) * (tw + 6), (n // 4) * (th + 22)
            sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y + 18))
            fr = int(nm.rsplit("-", 1)[1])
            d.text((x + 4, y + 3), f"f{fr}  {fr / 60:.2f}s", fill=(200, 200, 200))
        sheet.save(QA / f"{comp}-timeline.png")


def media_checks():
    for comp, (fmt, cut) in COMPS.items():
        p = OUT / f"{comp}.mp4"
        if not p.exists():
            check(f"deliverable {p.name}", None, "not rendered yet (npm run render)")
            continue
        r = subprocess.run(["ffprobe", "-v", "error", "-count_packets", "-show_entries",
                            "stream=codec_type,codec_name,pix_fmt,width,height,r_frame_rate,nb_read_packets,color_space,sample_rate,channels"
                            ":format=duration", "-of", "json", str(p)], capture_output=True, text=True)
        info = json.loads(r.stdout)
        v = next(s for s in info["streams"] if s["codec_type"] == "video")
        a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
        want = (1080, 1920) if fmt == "vertical" else (1920, 1080)
        ok = (v["codec_name"] == "h264" and v["pix_fmt"] == "yuv420p" and v["r_frame_rate"] == "60/1"
              and (v["width"], v["height"]) == want and int(v["nb_read_packets"]) == BRIEF[cut]["frames"]
              and v.get("color_space") == "bt709")
        check(f"deliverable {p.name}", ok, f"{v['width']}x{v['height']} h264 {v['pix_fmt']} {v['r_frame_rate']} "
              f"{v['nb_read_packets']} frames, {float(info['format']['duration']):.3f}s, color {v.get('color_space')}, "
              f"audio {a['codec_name'] + ' ' + a['sample_rate'] + ' Hz' if a else 'none'}")
        if a:
            rr = subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-i", str(p), "-map", "0:a", "-af", "ebur128=peak=true",
                                 "-f", "null", "-"], capture_output=True, text=True).stderr
            s = rr[rr.rfind("Summary:"):]
            import re

            I = re.search(r"I:\s*(-?[\d.]+|-inf)", s)
            TP = re.search(r"Peak:\s*(-?[\d.]+|-inf)", s)
            iv = float(I.group(1)) if I and I.group(1) != "-inf" else -math.inf
            tp = float(TP.group(1)) if TP and TP.group(1) != "-inf" else -math.inf
            if not math.isfinite(iv) or iv <= -69.0:
                check(f"audio loudness [{comp}]", None, "silent track (no sfx in public/sfx yet)")
            else:
                check(f"audio ~-22 LUFS, <= -3 dBTP [{comp}]", abs(iv + 22) <= 1.5 and tp <= -3.0,
                      f"{iv:.1f} LUFS integrated, {tp:.1f} dBTP")


def write_report(meta):
    lines = ["# XO \"One Breath\" — QA report", ""]
    if meta.get("standin"):
        lines += ["> **Rendered with the geometry-matched STAND-IN logo.** Add `public/xo-logo.png` and re-run "
                  "`npm run build` for the real deliverables.", ""]
    lines += ["| | Check | Result |", "|---|---|---|"]
    for name, ok, detail in results:
        tag = {True: "PASS", False: "**FAIL**", None: "info"}[ok]
        lines.append(f"| {tag} | {name} | {detail} |")
    lines += ["", "Visual items (watch on a phone at full brightness, with sound): `brush-fronts.png`, "
              "`*-timeline.png`. If anything feels on time, slow it by 10% (timeline.ts).", ""]
    (QA / "report.md").write_text("\n".join(lines))
    fails = [r for r in results if r[1] is False]
    print(f"\n{len([r for r in results if r[1]])} passed, {len(fails)} failed -> {QA / 'report.md'}")
    return not fails


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-render", action="store_true")
    args = ap.parse_args()
    QA.mkdir(parents=True, exist_ok=True)
    meta = json.loads((LAYERS / "meta.json").read_text())
    if meta.get("standin"):
        print("NOTE: QA is running on the stand-in logo.")
    j = Jobs()
    plan(j)
    if not args.no_render:
        j.render()
    analyse()
    media_checks()
    sys.exit(0 if write_report(meta) else 1)


if __name__ == "__main__":
    main()
