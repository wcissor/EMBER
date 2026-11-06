"""Probe footage/, drop MD5 duplicates, map files to clips by duration+res+fps.

Writes work/clipmap.json. Exits non-zero if any clip is VFR, ambiguous or missing.
"""
import hashlib
import json
import subprocess
import sys

from config import CLIPS, FOOTAGE, WORK


def probe(path):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
        "stream=width,height,r_frame_rate,avg_frame_rate,duration,nb_frames,"
        "color_space,color_transfer,color_primaries,color_range:stream_side_data=rotation",
        "-of", "json", str(path)])
    st = json.loads(out)["streams"][0]
    rot = 0
    for sd in st.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(sd["rotation"])
    num, den = map(int, st["r_frame_rate"].split("/"))
    return dict(w=st["width"], h=st["height"], r=st["r_frame_rate"], avg=st["avg_frame_rate"],
                fps=num / den, dur=float(st["duration"]), nb=int(st.get("nb_frames", 0)), rot=rot,
                color=f'{st.get("color_space")}/{st.get("color_transfer")}/{st.get("color_primaries")}/{st.get("color_range")}')


def main():
    WORK.mkdir(exist_ok=True)
    files = sorted(p for p in FOOTAGE.iterdir() if p.suffix.lower() in (".mov", ".mp4"))
    seen, uniq = {}, []
    for f in files:
        h = hashlib.md5(f.read_bytes()).hexdigest()
        if h in seen:
            print(f"skip {f.name}: MD5 duplicate of {seen[h]}")
            continue
        seen[h] = f.name
        uniq.append((f, h))

    problems, mapping = [], {}
    for f, h in uniq:
        p = probe(f)
        vfr = p["r"] != p["avg"]
        cands = [cid for cid, c in CLIPS.items()
                 if abs(c["dur"] - p["dur"]) < 0.09 and (c["w"], c["h"]) in ((p["w"], p["h"]), (p["h"], p["w"]))
                 and abs(c["fps"] - p["fps"]) < 0.5]
        print(f"{f.name}: {p['w']}x{p['h']} r={p['r']} avg={p['avg']} dur={p['dur']:.3f} nb={p['nb']} "
              f"rot={p['rot']} color={p['color']} -> {cands} {'VFR!' if vfr else 'CFR'}")
        if vfr:
            problems.append(f"{f.name} is VFR ({p['r']} vs {p['avg']})")
        if len(cands) != 1:
            problems.append(f"{f.name}: ambiguous/no match {cands}")
            continue
        cid = cands[0]
        if cid in mapping:
            problems.append(f"{cid} matched twice ({mapping[cid]['file']}, {f.name})")
        mapping[cid] = dict(file=f.name, md5=h, **p)

    for cid in CLIPS:
        if cid not in mapping:
            problems.append(f"missing clip {cid} ({CLIPS[cid]['name']})")
    (WORK / "clipmap.json").write_text(json.dumps(mapping, indent=2))
    if problems:
        print("PROBLEMS:\n  " + "\n  ".join(problems))
        sys.exit(1)
    for cid, m in mapping.items():
        print(f"{cid} {CLIPS[cid]['name']:<10} <- {m['file']}")


if __name__ == "__main__":
    main()
