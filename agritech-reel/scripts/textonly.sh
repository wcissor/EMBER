#!/bin/bash
# QA: render every beat with only its text (captions, numbers, labels, sources, the mark) on mid-grey.
# The masks show exactly where text sits, for the safe-box scan and the caption contrast check.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/qa/textonly
for lang in ${@:-en}; do
  for line in H1 H2 H3 B1 B1b B2 B3 B4 B4s B5 B6 B7 B8 END; do
    npx remotion render build/bundle-qa Beat "out/qa/textonly/$lang-$line.tmp.mp4" --props="{\"lang\":\"$lang\",\"line\":\"$line\",\"textOnly\":true}" \
      --codec=h264 --crf=6 --pixel-format=yuv444p --muted --log=error
    mv "out/qa/textonly/$lang-$line.tmp.mp4" "out/qa/textonly/$lang-$line.mp4"
    echo "text-only $lang-$line"
  done
done
