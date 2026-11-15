#!/usr/bin/env bash
# Render the reel per the brief: each scene muted with identical settings, joined with the concat
# demuxer (-c copy), then each mix added (-c:v copy, AAC 320k, faststart). Every output is written
# to a temporary name ending in .mp4 and renamed only after ffmpeg exits 0.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/tmp
npx remotion bundle src/index.ts --out-dir build --log=error >/dev/null

STARTS=($(node -e "const t=require('./src/timeline.json');console.log(t.sceneStarts.join(' '),t.durationInFrames)"))
: > out/tmp/scenes.txt
for i in 0 1 2 3 4 5 6; do
  a=${STARTS[$i]}; b=$(( ${STARTS[$((i+1))]} - 1 ))
  f="out/tmp/scene-$((i+1)).mp4"
  npx remotion render build Reel "out/tmp/scene-$((i+1)).tmp.mp4" --frames=$a-$b \
    --codec=h264 --crf=16 --pixel-format=yuv420p --muted --log=error
  mv "out/tmp/scene-$((i+1)).tmp.mp4" "$f"
  echo "file 'scene-$((i+1)).mp4'" >> out/tmp/scenes.txt
  echo "scene $((i+1)): frames $a-$b"
done

ffmpeg -v error -y -f concat -safe 0 -i out/tmp/scenes.txt -c copy out/tmp/video.tmp.mp4
mv out/tmp/video.tmp.mp4 out/tmp/video.mp4

mux () { # $1 audio wav, $2 output
  ffmpeg -v error -y -i out/tmp/video.mp4 -i "$1" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -ac 2 \
    -movflags +faststart -shortest "${2%.mp4}.tmp.mp4"
  mv "${2%.mp4}.tmp.mp4" "$2"
}
mux audio/mix.wav out/ruta-aglink-reel.mp4
mux audio/mix-nomusic.wav out/ruta-aglink-reel-nomusic.mp4

# Cover: the S3 frame with "AgLink", captions off (content sits inside the middle 1080x1440).
npx remotion still build Reel out/cover.png --frame=$(( ${STARTS[3]} - 4 )) --props='{"hideCaptions":true}' --log=error
echo RENDER_DONE
