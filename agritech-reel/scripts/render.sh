#!/bin/bash
# Render every beat (one voice line with its pictures) as its own muted file, plus the loop tails.
# Same settings for every beat so they join with the concat demuxer and -c copy.
# Usage: scripts/render.sh [lang ...]   (default: en az)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/beats
LANGS=${@:-en az}
render() { # name props
  local name=$1 props=$2 tmp="out/beats/$1.tmp.mp4"
  npx remotion render build/bundle Beat "$tmp" --props="$props" --codec=h264 --crf=16 --pixel-format=yuv420p --muted --log=error
  mv "$tmp" "out/beats/$1.mp4"
  echo "rendered $1"
}
for lang in $LANGS; do
  for line in H1 H2 H3 B1 B1b B2 B3 B4 B4s B5 B6 B7 B8; do
    render "$lang-$line" "{\"lang\":\"$lang\",\"line\":\"$line\"}"
  done
  for v in A:H1 B:H2 C:H3; do
    render "$lang-tail-${v%%:*}" "{\"lang\":\"$lang\",\"line\":\"${v##*:}\",\"tail\":true}"
  done
done
