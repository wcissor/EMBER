"""Shared edit decision list and paths for the La Kükü terrasse Reel.

Clips are identified by duration + resolution + fps (never by filename);
see 01_identify.py, which writes work/clipmap.json.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FOOTAGE = ROOT / "footage"
WORK = ROOT / "work"
OUT = ROOT / "out"
QA = ROOT / "qa"
LUTS = ROOT / "luts"
FONTS = ROOT / "fonts"
MUSIC = ROOT / "music"

FPS_OUT = 24
W, H = 1080, 1920

# Source clip signatures (from the brief): duration s, width, height, fps
CLIPS = {
    "C4": dict(name="Leaves",     dur=9.73, w=536, h=954, fps=30),
    "C1": dict(name="Palm",       dur=3.90, w=536, h=954, fps=30),
    "C5": dict(name="Lantern",    dur=3.57, w=536, h=954, fps=30),
    "C3": dict(name="Oval sign",  dur=2.69, w=360, h=640, fps=25),
    "C2": dict(name="Neon bar",   dur=8.50, w=360, h=640, fps=30),
}

# Shot list: 0-based inclusive source frame ranges, conformed frame-for-frame to 24 fps.
SHOTS = {
    "S1": dict(clip="C4", first=165, last=263),   # 99 f = 4.125 s
    "S2": dict(clip="C1", first=6,   last=98),    # 93 f = 3.875 s
    "S3": dict(clip="C5", first=0,   last=86),    # 87 f = 3.625 s
    "S4": dict(clip="C3", first=5,   last=52),    # 48 f = 2.000 s
    "S5": dict(clip="C2", first=15,  last=134),   # 120 f = 5.000 s
}
for s in SHOTS.values():
    s["frames"] = s["last"] - s["first"] + 1

DISSOLVE = 0.5
# xfade offsets (seconds) = timeline start of the next shot
OFFSETS = [3.625, 7.000, 10.125, 11.625]
TOTAL = 16.625            # 399 frames
TITLE_IN = (13.6, 0.8)    # fade-in start, duration
FADE_IN = (0.0, 0.5)
FADE_OUT = (15.875, 0.75)
COVER_T = 14.5


def shot_dir(kind, shot):
    return WORK / kind / shot
