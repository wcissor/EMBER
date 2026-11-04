# VolunTrack — “Qonşunun oğlu” (40 s vertical reel, AZ + EN)

A Window Theatre comedy built entirely in code (Remotion + TypeScript, everything SVG at 1080×1920, 30 fps, 1,200
frames). Mom compares her son to the perfect neighbor’s son one time too many; he follows the legend to learn his
secret — VolunTrack — and ends the film as the neighbor’s son another mom points at.

## Deliverables

| file | what |
|---|---|
| `out/qonsunun-oglu-az.mp4` | Azerbaijani version (H.264 High, yuv420p, AAC 48 kHz stereo, faststart) |
| `out/qonsunun-oglu-en.mp4` | English version (`lang: "en"`), locked to its own voice timings |
| `out/cover.png` | the hook as a poster (all inside the middle 1080×1440) |
| `out/captions-az.srt`, `out/captions-en.srt` | captions from the measured timings, speaker as prefix |
| `out/qa/` | stills (24 frames + safe box, both languages), glyph test, contact sheets, `report.md` |

## Pipeline

```bash
npm install                                   # Remotion 4.0.540; fonts are local in public/fonts
node scripts/bake.mjs                         # bakes the feTurbulence grain tiles and the concrete texture
node scripts/voice/voice-scripts.mjs          # VOICE_SCRIPTS.md: the 8 takes + character count (credits)
# takes → public/audio/takes/<lang>/<voice>.mp3  (voice = ana | men | qo | qq)
python3 scripts/voice/align_takes.py public/audio/takes/az/men.mp3 az men   # local forced alignment per take
python3 scripts/voice/place.py az en          # places every line (targets, ≤9 f shift, ≤6% speed-up, comic pauses kept)
node --no-warnings scripts/export-timeline.mjs
python3 scripts/audio/synth.py az en          # original score (3 movements), SFX, ambience
python3 scripts/audio/mix.py az en            # stems per voice + dialogue-first mix → −14 LUFS, ≤ −1 dBTP, 40.000 s
node scripts/stills.mjs out/qa/stills/az --both --props '{"lang":"az"}' 0 33 75 …   # stills before the render
node scripts/render-parts.mjs az              # parts per shot (.tmp → rename), concat -c copy, mux -c:v copy
node scripts/render-parts.mjs en
node --no-warnings scripts/captions-srt.mjs
node --no-warnings scripts/qa/layout-sync.mjs az && node --no-warnings scripts/qa/layout-sync.mjs en
python3 scripts/qa/run_qa.py az en            # gates 1–13 → out/qa/report.md
```

## Where things live

- `src/config.ts` — every string in both languages, every voice line (`show` for captions, `say` for the voice), every beat.
- `src/theme.ts` — colours, type, glass; `src/vt.ts` — the only door to VolunTrack blue (QA gate 9).
- `src/layout.ts` — safe box, zones, text boxes, the courtyard world, story places.
- `src/motion.ts` — whip / settle / pose / hero / ui tokens, warmOn, blueOn, acting helpers.
- `src/camera.ts` — the 2.5D camera (parallax 0.1 / 0.3 / 0.7 / 1 / 1.3), drift and push, motion-blur ranges.
- `src/world/` — panel blocks, windows, balconies, dishes, courtyard, light.
- `src/chars/` — the rig (pose to pose, eyes lead, lagged secondary motion, blinks, rim light), props, VolunTrack bits.
- `src/scenes/` — the story windows, the stairwell, the UI moment, the constellation; `src/overlays/` — title, captions, god rays, end card.
