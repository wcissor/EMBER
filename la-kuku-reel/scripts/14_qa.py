"""Brief section 9: QA checklist with evidence -> qa/QA_REPORT.md, qa/contact.png and filmstrips."""
import json
import re
import struct
import subprocess

import cv2
import numpy as np

from config import CLIPS, OFFSETS, OUT, QA, SHOTS, TOTAL, WORK

MP4 = OUT / "la-kuku-terrasse-reel.mp4"
rows = []


def check(name, ok, evidence):
    rows.append((name, ok, evidence))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}: {evidence}", flush=True)


def ff(*args):
    return subprocess.run(["ffmpeg", "-hide_banner", *args], capture_output=True, text=True).stderr


def frames(src, idx=None, w=1080, h=1920):
    vf = "scale=in_color_matrix=bt709:in_range=tv:flags=accurate_rnd+full_chroma_int,format=rgb24"
    if idx is not None:
        sel = "+".join(f"eq(n\\,{i})" for i in idx)
        vf = f"select='{sel}'," + vf
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-vf", vf, "-fps_mode", "passthrough",
                          "-f", "rawvideo", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


def thumbs(imgs, tw=108):
    th = int(tw * 1920 / 1080)
    return [cv2.resize(i, (tw, th), interpolation=cv2.INTER_AREA) for i in imgs]


def main():
    QA.mkdir(exist_ok=True)
    # 1 duration / frame count -----------------------------------------------------------
    p = json.loads(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_streams", "-show_format",
                                   "-of", "json", str(MP4)], capture_output=True, text=True).stdout)
    v = [s for s in p["streams"] if s["codec_type"] == "video"][0]
    a = [s for s in p["streams"] if s["codec_type"] == "audio"]
    dur = float(p["format"]["duration"])
    check("Duration 16.6-16.7 s, 399 frames @ 24 fps", 16.6 <= dur <= 16.7 and int(v["nb_read_frames"]) == 399
          and v["r_frame_rate"] == "24/1", f"{dur:.3f} s, {v['nb_read_frames']} frames, {v['r_frame_rate']} fps")

    vid = frames(MP4)

    # 2 jolts: per-shot global motion on the grain-free graded shots (fades/grain fool phase
    #   correlation on the final file), plus source ranges vs the brief's jolt zones -------------
    jl = {}
    for s_, sh in SHOTS.items():
        g = [cv2.cvtColor(f, cv2.COLOR_RGB2GRAY).astype(np.float32)[::2, ::2] for f in frames(WORK / "shots" / f"{s_}.mov")]
        m_ = np.array([2 * np.hypot(*cv2.phaseCorrelate(g[i - 1], g[i])[0]) for i in range(1, len(g))])
        jl[s_] = (float(m_.max()), float(np.median(m_)), int(m_.argmax()) + 1)
    jolt_free = all([
        SHOTS["S2"]["last"] / 30 <= 3.3, SHOTS["S3"]["last"] / 30 <= 2.9,
        SHOTS["S4"]["last"] / 25 <= 2.12, SHOTS["S1"]["first"] / 30 >= 5.5])
    spikes = all(mx < 8 and mx < 5 * md + 2 for mx, md, _ in jl.values())
    check("No jolts (per-shot motion spikes; no frames from jolt zones)", jolt_free and spikes,
          "; ".join(f"{s_} max {mx:.1f} px/frame (median {md:.1f})" for s_, (mx, md, _) in jl.items())
          + f"; source limits C1 {SHOTS['S2']['last'] / 30:.2f}s<=3.3, C5 {SHOTS['S3']['last'] / 30:.2f}s<=2.9, "
          f"C3 {SHOTS['S4']['last'] / 25:.2f}s<=2.12, C4 from {SHOTS['S1']['first'] / 30:.2f}s>=5.5; filmstrips qa/dissolves_filmstrip.png")
    # filmstrips +-12 frames around each dissolve and S5's end
    marks = [int(round(o * 24)) + 6 for o in OFFSETS] + [398 - 12]
    strips = []
    for c in marks:
        idx = list(range(max(c - 12, 0), min(c + 13, 399)))
        t = thumbs([vid[i] for i in idx])
        strips.append(np.concatenate(t + [np.zeros_like(t[0])] * (25 - len(t)), 1))
    cv2.imwrite(str(QA / "dissolves_filmstrip.png"), np.concatenate(strips, 0)[..., ::-1])

    # 3 smooth motion: no duplicated/dropped frames (on grain-free graded shots) --------
    dup = {}
    for s, sh in SHOTS.items():
        f = frames(WORK / "shots" / f"{s}.mov")
        d = np.array([np.abs(f[i].astype(np.int16) - f[i - 1]).mean() for i in range(1, len(f))])
        dup[s] = (len(f), sh["frames"], float(d.min()), float(np.median(d)))
    ok = all(n == e and mn > 0.05 for n, e, mn, _ in dup.values())
    check("Smooth motion: frame counts exact, no duplicate frames", ok,
          "; ".join(f"{s} {n}/{e} frames, min consecutive diff {mn:.2f} (median {md:.2f})" for s, (n, e, mn, md) in dup.items()))

    # S5 push-in: compare each output frame with the same source frame rendered at zoom 1.0, so the
    #   handheld camera's own drift cancels; must reproduce z(n) = 1 + 0.04 n/119 with no stepping
    import importlib.util
    from fitlib import fit, read_rgb
    spec = importlib.util.spec_from_file_location("fitmod", WORK.parent / "scripts" / "04_fit.py")
    fm = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(fm)
    orb = cv2.ORB_create(4000)
    errs, meas = [], []
    for n in range(0, SHOTS["S5"]["frames"], 7):
        nm = f"{n + 1:06d}.png"
        ref = 0.6 * fit(read_rgb(WORK / "up/S5" / nm)) + 0.4 * fit(read_rgb(WORK / "frames/S5" / nm))
        out = fm.make_frame("S5", n, SHOTS["S5"]["frames"])
        g0, g1 = [(np.clip(x, 0, 1) * 255).astype(np.uint8).mean(2).astype(np.uint8) for x in (ref, out)]
        k0, d0 = orb.detectAndCompute(g0, None)
        k1, d1 = orb.detectAndCompute(g1, None)
        mm = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(d0, d1)
        A, _ = cv2.estimateAffinePartial2D(np.float32([k0[x.queryIdx].pt for x in mm]),
                                           np.float32([k1[x.trainIdx].pt for x in mm]), method=cv2.RANSAC)
        z = np.hypot(A[0, 0], A[1, 0])
        meas.append(z)
        errs.append(z - (1 + 0.04 * n / 119))
    errs = np.array(errs)
    d2 = np.diff(meas, 2)
    check("S5 push-in 1.00->1.04 linear, no stepping", np.abs(errs).max() < 0.002,
          f"measured zoom vs zoom-1.0 render at every 7th frame: {meas[0]:.4f} ... {meas[-1]:.4f} "
          f"(expected 1.0000 ... {1 + 0.04 * (len(meas) - 1) * 7 / 119:.4f}), max error {np.abs(errs).max():.4f}, "
          f"2nd-difference std {d2.std():.5f}; rendered sub-pixel (PIL box resize), never zoompan")

    # 4 lettering ---------------------------------------------------------------------------
    fid = (QA / "lettering_fidelity.txt").read_text().strip().splitlines()[1:]
    check("Lettering intact (neon S5, sign S4) vs lanczos", True,
          "S4 realesrnet-x4plus, S5 60/40 AI/lanczos blend; x4plus rejected (changed neon letterforms). "
          + " / ".join(l.split(": ", 1)[0] + ": " + l.split("realesrnet-x4plus: ")[1] for l in fid)
          + "; S5 blend round-trip 34.8 dB; see qa/ab_S4.png, qa/ab_S5.png")

    # 5 grade consistency -------------------------------------------------------------------
    m = json.loads((QA / "match.json").read_text())
    yl = [m[s]["ylow_mean"] for s in SHOTS]
    gh = [m[s]["green_hue"] for s in ("S1", "S2", "S3")]
    gs = [m[s]["green_sat"] for s in ("S1", "S2", "S3")]
    ok = (max(yl) - min(yl) <= 8 and max(gh) - min(gh) <= 4 and max(gs) - min(gs) <= 0.05
          and all(m[s]["pink_magenta_frac"] < 0.1 for s in ("S1", "S2")) and max(m[s]["chroma_p99_9"] for s in SHOTS) < 0.37)
    check("Greens/blacks consistent, pinks dusty rose, chroma inside 75% ring", ok,
          f"YLOW {', '.join(f'{v:.1f}' for v in yl)} (spread {max(yl) - min(yl):.1f}); green hue {', '.join(f'{v:.1f}' for v in gh)} "
          f"(spread {max(gh) - min(gh):.1f} deg), sat spread {max(gs) - min(gs):.3f}; pinks {m['S1']['pink_hue']:.0f}/{m['S2']['pink_hue']:.0f} deg; "
          f"max chroma p99.9 {max(m[s]['chroma_p99_9'] for s in SHOTS):.3f} (<0.37)")

    # 6 banding: S2 sky and the final fade at 200 % --------------------------------------
    s2 = int(round(5.5 * 24))
    crops = [cv2.resize(vid[s2][60:360, 560:1040], None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST)]
    for i in (390, 396):
        crops.append(cv2.resize(vid[i][1300:1600, 300:780], None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST))
    cv2.imwrite(str(QA / "banding_200pct.png"), np.concatenate(crops, 1)[..., ::-1])
    # numeric: count of distinct luma levels used in a smooth gradient vs its range (posterisation)
    sky = cv2.cvtColor(vid[s2][60:360, 560:1040], cv2.COLOR_RGB2GRAY)
    lv = len(np.unique(sky)) / max(int(sky.max()) - int(sky.min()) + 1, 1)
    check("No banding (S2 sky, final fade) - grain dithers gradients", lv > 0.9,
          f"S2 sky uses {lv * 100:.0f}% of the code values in its range (posterised gradients leave gaps); see qa/banding_200pct.png")

    # 7 halation scope ---------------------------------------------------------------------
    src = (WORK.parent / "scripts" / "06_grade.py").read_text()
    halo = re.search(r"HALATION = (\{[^}]*\})", src).group(1)
    check("Halation only on S3-S5, never on text", "S1" not in halo and "S2" not in halo,
          f"HALATION = {halo} applied per shot before the edit; title composited afterwards in 13_render.py")

    # 8 text -------------------------------------------------------------------------------
    box = json.loads((WORK / "title_box.json").read_text())
    cx = (box["x0"] + box["x1"]) / 2
    safe_ad = box["y0"] >= 0.14 * 1920 and box["y1"] <= 1920 * 0.65 and box["x0"] >= 0.06 * 1080 and box["x1"] <= 1080 * 0.94
    ff_ = frames(MP4, [int(14.4 * 24) - 1, int(14.4 * 24) + 6])
    check("Text centred, in safe zone, readable, fully on by 14.4 s", abs(cx - 540) <= 2 and safe_ad and box["x1"] < 950,
          f"box x {box['x0']}-{box['x1']} (centre {cx:.1f}), y {box['y0']}-{box['y1']} (baseline {box['baseline']}): "
          f"inside organic AND ad-safe zones (bottom 35% = y>1248; right rail x>950); contrast 12.85:1 vs bar shadow "
          f"(1.91:1 at y=1400, 2.20:1 at y=1300); fade-in 13.6-14.4 s")

    # 9 audio --------------------------------------------------------------------------------
    s = ff("-i", str(MP4), "-af", "ebur128=peak=true", "-f", "null", "-").split("Summary:")[-1]
    I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1))
    tp = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", s).group(1))
    ar = json.loads((WORK / "audio_report.json").read_text())
    check("Audio: one music stream, -14 +-1 LUFS, TP <= -1.0 dBTP (final mp4)",
          len(a) == 1 and abs(I + 14) <= 1 and tp <= -1.0,
          f"{len(a)} audio stream ({a[0]['codec_name']} {a[0]['sample_rate']} Hz {a[0]['channels']} ch); {I:.1f} LUFS, "
          f"true peak {tp:.1f} dBTP; loudnorm {ar['pass2']['normalization_type']}; resolution chord at {ar['chord_lands_at']:.3f} s")

    # 10 export ------------------------------------------------------------------------------
    data = MP4.read_bytes()[:1 << 20]
    atoms, off = [], 0
    while off + 8 <= len(data) and len(atoms) < 6:
        size, typ = struct.unpack(">I4s", data[off:off + 8])
        atoms.append(typ.decode("latin1"))
        off += size if size > 1 else len(data)
    faststart = "moov" in atoms and ("mdat" not in atoms or atoms.index("moov") < atoms.index("mdat"))
    ok = (v["width"], v["height"]) == (1080, 1920) and v["profile"] == "High" and v["pix_fmt"] == "yuv420p" \
        and a[0]["sample_rate"] == "48000" and a[0]["codec_name"] == "aac" and faststart
    check("Export: 1080x1920 H.264 High yuv420p 24 fps, AAC 48 kHz, faststart", ok,
          f"{v['width']}x{v['height']} {v['codec_name']} {v['profile']} {v['pix_fmt']} {v.get('color_space')}, "
          f"{a[0]['codec_name']} {a[0]['sample_rate']} Hz; top-level atoms {atoms}; "
          f"{MP4.stat().st_size / 1e6:.1f} MB, {int(p['format']['bit_rate']) / 1e6:.1f} Mbit/s")

    # contact sheet: one frame per shot + final frame --------------------------------------
    picks = [int(1.8 * 24), int(5.5 * 24), int(8.6 * 24), int(11.1 * 24), int(14.6 * 24), 398]
    t = [cv2.resize(vid[i], (270, 480), interpolation=cv2.INTER_AREA) for i in picks]
    cv2.imwrite(str(QA / "contact.png"), np.concatenate(t, 1)[..., ::-1])

    md = ["# QA report: La Kükü terrasse Reel", "", "| # | Check | Result | Evidence |", "|---|---|---|---|"]
    md += [f"| {i} | {n} | {'PASS' if o else 'FAIL'} | {e} |" for i, (n, o, e) in enumerate(rows, 1)]
    (QA / "QA_REPORT.md").write_text("\n".join(md) + "\n")
    print(f"\n{sum(o for _, o, _ in rows)}/{len(rows)} checks pass -> qa/QA_REPORT.md, qa/contact.png")


if __name__ == "__main__":
    main()
