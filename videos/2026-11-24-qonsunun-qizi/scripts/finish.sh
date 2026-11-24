#!/usr/bin/env bash
# Finish the deliverables from the current voice state: renders (resuming finished parts), captions, cover, stills, QA.
set -euo pipefail
cd "$(dirname "$0")/.."
node --no-warnings scripts/export-timeline.mjs
RESUME=1 node scripts/render-parts.mjs az
RESUME=1 node scripts/render-parts.mjs en
node --no-warnings scripts/captions-srt.mjs
node scripts/stills.mjs out/qa --comp Cover 0 >/dev/null 2>&1 && mv out/qa/Cover-f0000.png out/cover.png
bash scripts/qa/stills.sh
for L in az en; do node --no-warnings scripts/qa/layout-sync.mjs "$L"; done
python3 scripts/qa/run_qa.py az en
echo "FINISHED"
