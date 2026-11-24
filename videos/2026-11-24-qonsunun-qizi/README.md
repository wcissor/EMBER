# VolunTrack — "Qonşunun qızı" (part 2 of "Qonşunun oğlu")

Part 2 of the courtyard comedy, built in part 1's project and look (Remotion + TypeScript, everything drawn in SVG at
1080×1920, 30 fps). It answers the comments "qonşunun qızı olmur?" and "Qonşunun qızı ola bilərik?". Azerbaijani.

**Versions:** `A` (comment bubble + "Necə yəni olmur?!" + title), `A-reply` (no drawn bubble, for "Reply with reel"),
`B` (opens on the column beat), `C` (opens on a flash-forward to the confession); each also without music.

## Pipeline
```bash
python3 scripts/voice/align_takes.py public/audio/takes/az/<voice>.mp3 az <voice>   # local forced alignment
python3 scripts/voice/place.py az                       # place every line on its target (part 1's rules)
node --no-warnings scripts/export-timeline.mjs          # build/timeline-az.json (beats, star rings, version segments)
python3 scripts/audio/synth2.py                         # score (part 1's motif), sound effects, ambience, title card
python3 scripts/audio/mix2.py                           # voices + mix of every version, with and without music, −14 LUFS
node scripts/stills2.mjs out/qa/stills2 --comp MainA 0 100 …   # stills before rendering
node scripts/render2.mjs A Areply B C                   # parts → concat -c copy → mux (-c:v copy)
node --no-warnings scripts/captions-srt2.mjs            # out/captions-az.srt
python3 scripts/qa/run_qa2.py out                       # out/qa/report.md
```

## Where things live
- `src/config.ts` — the approved script (lines, targets), on-screen text, the phone's demo data, every beat.
- `src/Main.tsx` — the film and its versions (B and C re-use A's frames through `Freeze`).
- `src/scenes/p2/` — the courtyard (hook, column, deeds), the stairwell, the phone, the morning yard, the star.
- `src/world/tod.ts` — part 1's night set turned to morning (and dusk) by mixing every colour toward its day value.
- `src/chars/rig.tsx` — part 1's rig plus `QIZ`, the daughter (hoodie, ponytail, trainers).
- `VOICE_SCRIPTS.md` — the takes, and the two Sona takes still to come.
