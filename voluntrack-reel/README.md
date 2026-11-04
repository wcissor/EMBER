# VolunTrack — "Deadline Passed" (34 s vertical reel)

Remotion (React + TypeScript) build of the reel described in the brief: 1080×1920, 60 fps, exactly 2,040 frames.
A student reads out dead volunteering posts until VolunTrack answers "Yes." and the feed rebuilds itself for their age.

## Layout

| path | what |
|---|---|
| `src/config.ts` | every string, voice line (show / say), placement rule and beat anchor |
| `src/theme.ts` · `src/layout.ts` · `src/motion.ts` | palette + type · every position (+ safe box) · motion tokens |
| `src/timeline.ts` | resolves each beat anchor (line + word + offset) against `public/audio/voice_timings.json` |
| `src/scenes/` | `BeforeWorld` (S1–S2), `Turn` (S3), `AfterWorld` (S3–S6), `EndCard` (S7), star choreography |
| `src/components/` | stamp, post card, DM card, captions + echo type, squiggle, star, glass UI, role card, logo, particles |
| `public/logo.svg` · `src/logoData.ts` | the VolunTrack mark: monogram + diamonds traced from `assets/logo-source.jpg`, ring + points rebuilt from measurements |
| `voice_src/alignment.json` | word timings of the two ElevenLabs takes (eleven_v4: Laura = student, Will = VolunTrack) |
| `scripts/voice/` | measure speech boundaries → place lines (≤ 6% speed-up, capped pauses) → process + stems |
| `scripts/audio/` | synthesized SFX + original 120 BPM cue → mix → two-pass loudnorm (−14 LUFS, ≤ −1 dBTP) |
| `scripts/render-parts.mjs` | one muted part per shot → concat demuxer `-c copy` → AAC mux `-c:v copy` + faststart |
| `scripts/qa/` | quality gates 1–12 → `out/qa/report.md` |

## Build

```bash
npm install
bash scripts/build.sh        # voice → timeline → bakes → sound → QA stills → render → cover, captions → QA
npx remotion studio src/index.ts
```

The two voice takes go in `voice_src/takes/student.mp3` and `voice_src/takes/vt.mp3`. Without them the build still runs
(estimated boundaries, no voice in the mix). Fonts are the Google Fonts files `@remotion/google-fonts` references, stored
in `public/fonts/` so rendering needs no network. Generated binaries (audio, grain tiles, stamp inks, the frozen-wall still)
are not committed; the build recreates them.
