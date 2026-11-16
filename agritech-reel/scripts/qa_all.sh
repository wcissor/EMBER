#!/bin/bash
# Full rebuild of the pictures and every check, in order. Audio is built separately (audio/build_audio.py).
set -euo pipefail
cd "$(dirname "$0")/.."
scripts/render.sh en az
scripts/textonly.sh en az
python3 scripts/assemble.py
python3 -I scripts/qa_text.py > out/qa/qa_text.log
python3 -I scripts/qa.py > out/qa/qa.log
python3 scripts/qa_stills.py
python3 scripts/report.py
echo ALL DONE
