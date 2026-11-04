#!/usr/bin/env bash
# End-to-end build. Re-run after any change to config.ts, layout.ts, the voice, or the logo.
#   1 design system + scenes (src/)        → nothing to build
#   2 voice: measure → place → process      → public/audio/voice_timings.json, stems
#   3 sound: sfx + music + mix              → public/audio/mix.wav
#   4 frozen wall still, QA stills          → public/frames/wall.png, out/qa/stills/
#   5 render parts → join → mux             → out/voluntrack-deadline-passed.mp4
#   6 cover, captions, quality gates        → out/cover.png, out/captions.srt, out/qa/report.md
set -euo pipefail
cd "$(dirname "$0")/.."
step() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

step "export config"
node scripts/export-config.mjs 2>/dev/null

step "voice"
if [[ -f voice_src/takes/student.mp3 && -f voice_src/takes/vt.mp3 ]]; then
  python3 scripts/voice/align_local.py
else
  echo "takes not downloaded yet: placement uses estimated boundaries; the mix has no voice"
fi
python3 scripts/voice/place_voice.py
node scripts/dump-timeline.mjs 2>/dev/null
node scripts/assets.mjs >/dev/null

step "bake feTurbulence textures (grain tiles, stamp inks)"
node scripts/bake.mjs 2>&1 | grep baked

step "frozen wall"
FREEZE=$(node -e "console.log(require('./build/timeline.json').beats.freeze)")
rm -f public/frames/wall.png && node scripts/assets.mjs >/dev/null
node scripts/stills.mjs build/wall --props '{"layer":"before"}' "$FREEZE" 2>/dev/null | grep png
mkdir -p public/frames && mv "build/wall/f$(printf '%04d' "$FREEZE").png" public/frames/wall.png

step "sound"
python3 scripts/audio/synth_sfx.py
python3 scripts/audio/synth_music.py
if [[ -f voice_src/takes/student.mp3 && -f voice_src/takes/vt.mp3 ]]; then python3 scripts/voice/process_voice.py; fi
node scripts/assets.mjs >/dev/null
python3 scripts/audio/mix.py
node scripts/assets.mjs

step "QA stills (with and without the safe box)"
node scripts/stills.mjs out/qa/stills --both 12 54 196 288 405 440 500 546 600 717 830 880 1040 1150 1250 1340 1440 1600 1690 1776 1990 2>/dev/null | grep -c png

if [[ "${STILLS_ONLY:-0}" == "1" ]]; then exit 0; fi

step "render parts, join, mux"
node scripts/render-parts.mjs 2>&1 | grep -v -i "memory\|docker"

step "cover + captions"
node scripts/stills.mjs build/cover --comp Cover 0 2>/dev/null | grep png
cp build/cover/Cover-f0000.png out/cover.tmp.png && mv out/cover.tmp.png out/cover.png
node scripts/captions-srt.mjs

step "quality gates"
python3 scripts/qa/run_qa.py >/dev/null && echo "out/qa/report.md written"
