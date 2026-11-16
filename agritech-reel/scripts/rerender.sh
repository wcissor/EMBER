#!/bin/bash
# Re-render only the given beats (same settings as scripts/render.sh). Usage: scripts/rerender.sh en-B2 az-B6 ...
set -euo pipefail
cd "$(dirname "$0")/.."
for name in "$@"; do
  lang=${name%%-*}; line=${name#*-}
  tmp="out/beats/$name.tmp.mp4"
  npx remotion render build/bundle Beat "$tmp" --props="{\"lang\":\"$lang\",\"line\":\"$line\"}" --codec=h264 --crf=16 --pixel-format=yuv420p --muted --log=error
  mv "$tmp" "out/beats/$name.mp4"
  echo "rendered $name"
done
