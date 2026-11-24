#!/usr/bin/env bash
# Gate 1: the brief's stills (plus the same frames with the safe box drawn) for both languages, and contact sheets.
set -euo pipefail
cd "$(dirname "$0")/../.."
FRAMES="0 33 75 140 280 320 400 430 460 530 560 600 700 750 800 830 880 935 980 1015 1065 1100 1150 1199"
for L in ${LANGS:-az en}; do
  node scripts/stills.mjs out/qa/stills/$L --both --props "{\"lang\":\"$L\"}" $FRAMES 2>&1 | grep -E "png|rror" || true
  python3 scripts/qa/sheet.py out/qa/stills-$L.png 216 8 $(for f in $FRAMES; do printf "out/qa/stills/$L/$L-f%04d.png " $f; done)
  python3 scripts/qa/sheet.py out/qa/stills-$L-safe.png 216 8 $(for f in $FRAMES; do printf "out/qa/stills/$L/$L-f%04d-safe.png " $f; done)
done
node scripts/stills.mjs out/qa/stills --comp GlyphTest 0 >/dev/null 2>&1 && mv out/qa/stills/GlyphTest-f0000.png out/qa/stills/glyphs.png
