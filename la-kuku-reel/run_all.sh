#!/usr/bin/env bash
# End-to-end build of the La Kükü terrasse Reel. Clips go in footage/; music/track.* is optional.
set -euo pipefail
cd "$(dirname "$0")"
REL=https://github.com/xinntao/Real-ESRGAN/releases/download
mkdir -p tools/dl tools/models work/logs

# Real-ESRGAN weights -> ONNX (weights are untrusted downloads: read with python -I and a restricted unpickler)
[ -f tools/dl/RealESRNet_x4plus.pth ] || curl -sSfL -o tools/dl/RealESRNet_x4plus.pth $REL/v0.1.1/RealESRNet_x4plus.pth
[ -f tools/models/realesrnet-x4plus.onnx ] || python3 -I scripts/esrgan_cpu.py build \
    --pth tools/dl/RealESRNet_x4plus.pth --out tools/models/realesrnet-x4plus.onnx

cd scripts
python3 01_identify.py
python3 02_extract.py
for s in S4 S5; do                      # AI only on the 360p clips (45-min rule); ~11 min on 4 cores
  python3 -I esrgan_cpu.py run --model ../tools/models/realesrnet-x4plus.onnx \
      --inp ../work/frames/$s --out ../work/up/$s --precision bf16 > ../work/logs/upscale_$s.log
done
python3 04_fit.py
python3 05_lut.py
python3 06_grade.py --self-test
python3 06_grade.py
python3 07_match.py
python3 09_title.py --baseline 1178
ls ../music/track.* >/dev/null 2>&1 || python3 11_music.py
python3 12_audio.py
python3 13_render.py
python3 14_qa.py
