#!/usr/bin/env bash
# The whole film from the takes in public/audio/takes/<lang>/<voice>.mp3 (whatever is there; missing voices stay on
# their target times as silent placeholders and are listed in the QA report).
#   bash scripts/build.sh            # both languages
#   LANGS="az" bash scripts/build.sh
set -euo pipefail
cd "$(dirname "$0")/.."
LANGS="${LANGS:-az en}"
rm -rf build/takes && mkdir -p build/takes
for L in $LANGS; do
  for V in ana men qo qq; do
    f="public/audio/takes/$L/$V.mp3"
    if [ -f "$f" ]; then python3 scripts/voice/align_takes.py "$f" "$L" "$V"; fi
  done
done
python3 scripts/voice/place.py $LANGS
node --no-warnings scripts/export-timeline.mjs $LANGS
python3 scripts/audio/synth.py $LANGS
python3 scripts/audio/mix.py $LANGS
node scripts/assets.mjs
for L in $LANGS; do node --no-warnings scripts/qa/layout-sync.mjs "$L"; done
LANGS="$LANGS" bash scripts/qa/stills.sh
for L in $LANGS; do node scripts/render-parts.mjs "$L"; done
node --no-warnings scripts/captions-srt.mjs $LANGS
node scripts/stills.mjs out/qa --comp Cover 0 >/dev/null 2>&1 && mv out/qa/Cover-f0000.png out/cover.png
python3 scripts/qa/run_qa.py $LANGS
