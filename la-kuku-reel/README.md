# La Kükü terrasse: quiet-luxury Reel

A 16.625 s, 24 fps, 1080×1920 Instagram Reel for La Kükü terrasse (Filarmoniya bağı, İçərişəhər, Baku).
It moves from afternoon leaves to the amber "LaKükü" neon bar and ends on one line: *Reserve a table*.
This folder holds the full, re-runnable pipeline. Client media (source clips, the final MP4, the cover and
frame-based QA images) is **not** committed, because this repository is public. The media was delivered directly.

| Deliverable | Spec |
|---|---|
| `out/la-kuku-terrasse-reel.mp4` | 1080×1920, 399 frames @ 24 fps, H.264 High yuv420p BT.709, CRF 16 tune=grain (VBV-capped at 20 Mbit/s, 43 MB), AAC 256k 48 kHz, faststart |
| `out/cover.jpg` | still at 14.5 s |
| `qa/QA_REPORT.md` | brief section 9 checklist: 11/11 pass, with evidence |

## Edit

| Shot | Clip | Source frames | Out | Upscale | Into next |
|---|---|---|---|---|---|
| S1 | C4 Leaves | 165–263 (30 fps) | 99 f, 4.125 s | Lanczos + luma unsharp 0.5 | 0.5 s dissolve @ 3.625 |
| S2 | C1 Palm | 6–98 | 93 f, 3.875 s | Lanczos + unsharp | @ 7.000 |
| S3 | C5 Lantern | 0–86 | 87 f, 3.625 s | Lanczos + unsharp | @ 10.125 |
| S4 | C3 Oval sign | 5–52 (25 fps) | 48 f, 2.000 s | realesrnet-x4plus | @ 11.625 |
| S5 | C2 Neon bar | 15–134 | 120 f, 5.000 s | 60 % realesrnet-x4plus + 40 % Lanczos, push-in 1.00→1.04 | fade to black 15.875–16.625 |

Every source frame plays once at 24 fps (no interpolation and no dropped or duplicated frames). Clips are identified
by duration, resolution and fps. `…_2.MOV` is an MD5 duplicate of the neon-bar clip and is ignored.

## Run

```bash
# put the 5 clips in footage/ (any names); optional: your own music/track.mp3 (or .wav)
apt-get install -y ffmpeg fluidsynth musescore-general-soundfont-lossless   # fluidsynth/soundfont only for the composed cue
pip install numpy pillow opencv-python-headless scipy openvino onnx soundfile mido librosa
./run_all.sh                 # ~25 min on a 4-core CPU; no GPU needed
```

To swap in another track (for example from Meta Sound Collection), save it as `music/track.mp3`, delete
`music/track.cue.json`, and run `python3 scripts/12_audio.py && python3 scripts/13_render.py && python3 scripts/14_qa.py`.
The aligner puts the track's strongest late onset (the resolution chord) on 13.6 s, with the title.

| Script | Stage |
|---|---|
| `01_identify.py` | ffprobe + MD5, map clips by duration/res/fps, refuse VFR or ambiguous files |
| `02_extract.py` | exact frame ranges, `hqdn3d=1.5:1.2:3:3`, 16-bit RGB PNG with explicit BT.709 decode |
| `esrgan_cpu.py` | Real-ESRGAN without PyTorch: restricted-unpickler `.pth` reader → ONNX → OpenVINO (BF16/AMX) |
| `03_ab.py` | per-shot A/B sheets at 200 % (Lanczos, unsharp, x4plus, net-x4plus) |
| `04_fit.py` | sub-pixel fit to 1080×1920, S5 push-in, centred 1:5:1 temporal mix |
| `05_lut.py` | base look `luts/lakuku_quiet.cube` (33³) and per-shot cubes with trims (65³) |
| `06_grade.py` | LUT → halation (S3–S5) → ProRes 422 HQ 10-bit; `--self-test` checks the blend |
| `07_match.py` / `08_trim_solver.py` | 5d measurements (YLOW, greens, pinks, chroma) and the trim solver |
| `09_title.py` / `10_contrast.py` | tracked Cormorant SC title (Pillow) and the WCAG contrast check |
| `11_music.py` / `12_audio.py` | original felt-piano cue; align, cut, fade, two-pass linear loudnorm |
| `13_render.py` | final graph (`--uncapped` reproduces the brief's encode exactly) |
| `14_qa.py` | section 9 checklist → `qa/QA_REPORT.md`, contact sheet, filmstrips |

## Decisions and deviations from the brief (and why)

1. **AI upscale on CPU.** This environment has no GPU or Vulkan, so the official Real-ESRGAN weights run as ONNX on
   OpenVINO. The graph matches the official ncnn model at 64.3 dB PSNR, and BF16 matches FP32 at 52.7 dB. The brief's
   timing rule triggered (about 85 min estimated, over 45), so AI runs only on the 360p clips. The A/B agreed: on
   foliage, x4plus turns background speckle crunchy and net-x4plus turns ivy "painted", so S1–S3 use Lanczos with the
   brief's no-AI fallback (`unsharp 0.5`).
2. **Lettering.** x4plus rebuilt the thin neon tubes as bevelled 3-D letters, so it was rejected. net-x4plus keeps both
   letterforms (edge-map correlation 0.997/0.994). S5, the hero, uses the brief's 60/40 AI/Lanczos blend, which raises
   round-trip fidelity from 30.2 to 34.8 dB. See `qa/lettering_fidelity.txt`.
3. **LUT black and white points.** The brief's contrast line compounds two operations and puts black at 7.2 % and white
   at 91.8 %. Its own comment says 3.5 % and 95.5 %, and the verbatim curve looked milky and could never reach the
   YLOW≈28 target. `T_USED` implements the stated intent; the verbatim cube is kept as
   `luts/lakuku_quiet_brief-verbatim.cube`. Per-shot trims are baked into 65³ LUTs because `eq` is 8-bit only, and a
   33³ grid drifted S2's hue-rotated olives by about 5°.
4. **ffmpeg 6.1 workarounds.**
   - The 16-bit `blend=screen` is wrong at any opacity above 0 (mean error about 67 levels) while still passing the
     brief's opacity-0 test, so halation uses an exact 16-bit expression blend.
   - `tmix` is causal: it lags one frame, duplicates frame 1 of every shot and drops the last. It is replaced by a
     centred 1:5:1 mix.
   - `waveform` crashes on 10-bit input, so the scope sheets run at 8-bit.
   - The S5 push-in is rendered sub-pixel, not with zoompan. Measured zoom is 1.0000 to 1.0400, with an error of at most 0.0001.
5. **Title position.** Both of the brief's positions fail its own 3:1 contrast rule over the floor reflection: 1.91:1 at
   y=1400 and 2.20:1 at y=1300. The line sits at baseline y=1178 in the bar's shadow, directly under the neon, at
   12.85:1. That is also inside Meta's ad-safe zone (35 % of the bottom kept free).
6. **Music.** No track was supplied, and the ElevenLabs API is unreachable from here. `11_music.py` writes an original
   cue to the brief's generation prompt: D♭ major, 66 BPM, a rising melody resolving on D♭add9 at 13.600 s. It uses a
   public-domain piano, because FluidR3's piano samples stop dead at 3.0 s. It is mastered (gentle compression plus a
   true-peak limiter) so that loudnorm stays **linear** at −14 LUFS. The final file measures −14.1 LUFS, −2.3 dBTP.
7. **Encode size.** Exact CRF 16 with per-pixel temporal grain comes out at 96 Mbit/s (200 MB). Capped at 20 Mbit/s it
   is 43 MB, and the two are indistinguishable after a simulated Instagram re-encode (SSIM 0.952 between them).

Shot matching (5d) on the final grades:
- YLOW: 29.9, 30.1, 30.2, 27.3, 29.0.
- Green hue on S1–S3: 111.6°, 110.2°, 111.8°, a spread of 1.6°; saturation spread 0.014.
- Cushions: dusty rose at about 347°.
- Chroma p99.9: at most 0.256, inside the 75 % ring.

## Credits and licences

- Cormorant SC: SIL Open Font License 1.1 (`fonts/OFL.txt`), © The Cormorant Project Authors.
- Piano: "Splendid Grand" from MuseScore General (public domain samples; soundfont MIT, © S. Christian Collins).
  The cue is original. No artist, song or label was referenced.
- Real-ESRGAN by Xintao Wang et al. (BSD-3-Clause). Weights are downloaded at run time and not redistributed here.
- Footage © La Kükü terrasse. Not included in this repository.
