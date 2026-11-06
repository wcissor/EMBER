# XO — “One Breath” (一息) logo intro

A silent-luxury logo film for XO (hair, manicure, pedicure), built in Remotion.
An invisible brush writes the logo: two calm strokes make the X, then the O is
painted as an ensō in one breath and left open. Then only stillness and light.

| Deliverable | Size | Length |
| --- | --- | --- |
| `out/XO-Main-9x16.mp4` | 1080×1920 | 6.0 s (360 frames) |
| `out/XO-Main-16x9.mp4` | 1920×1080 | 6.0 s |
| `out/XO-Sting-9x16.mp4` | 1080×1920 | 4.7 s (282 frames, ends on the logo) |
| `out/XO-Sting-16x9.mp4` | 1920×1080 | 4.7 s |

All are H.264 CRF 16, yuv420p, BT.709, 60 fps, with a silent AAC track (the
client asked for no sound; see Sound).

## Logo

`public/xo-logo.png` is the real XO logo (1518×1036, cream on #333333). After
replacing it, run `npm run build` (prep → render → QA), then check
`public/layers/debug.png` (the brief asks for this) and `out/qa/report.md`.

`public/xo-logo.standin.png` is a geometry-matched brush XO, painted by
`scripts/make_standin_logo.py`. It is used only when `xo-logo.png` is
missing, and the pipeline warns loudly when it does.

## Setup

```bash
npm install                      # Remotion 4.0.541, React 19
python3 -m pip install pillow numpy   # prep, sound and QA scripts
# ffmpeg + ffprobe on PATH
```

| Command | Does |
| --- | --- |
| `npm run studio` | Remotion Studio (runs prep first if needed) |
| `npm run prep` | `scripts/prep.py`: alpha, stroke layers, debug, washi, komorebi |
| `npm run render` | `scripts/render.py`: 4 videos → mix → linear loudness → mux |
| `npm run render -- --audio-only` | re-mix and re-mux after adding sound files |
| `npm run render -- --only XO-Sting-16x9` | one composition |
| `npm run qa` | `scripts/qa.py`: the section-10 checklist → `out/qa/report.md` |
| `npm run build` | all of the above |

## Timing

The client wants the logo written fast, but not hurried. It first asked for
the whole logo between 1 s and 2 s; that and a 1.2 s reveal were "really too
fast", while the 10 s cut's 3.9 s reveal was too slow. The logo is now written
between 1.0 s and 3.2 s, with the X strokes close to the 10 s cut's speed and
tight gaps. The film is 6 s (Main) or 4.7 s (Sting). Every beat is in frames at 60 fps
in `src/timeline.json`, the one file read by `src/timeline.ts`, `render.py`,
`make_temp_sfx.py` and `qa.py`. The brush easings stay the brief's; only the
spans changed. After editing it, run `npm run build`.

| Main | Brief | Now |
| --- | --- | --- |
| Fade in | 0–1.5 s | 0–0.75 s |
| X1 | 3.0–3.8 s | 1.00–1.45 s |
| X2 | 5.2–5.9 s | 1.57–1.97 s |
| O (ensō) | 7.0–10.0 s | 2.08–3.20 s |
| Light pass | 11.0–14.0 s | 3.40–4.60 s |
| Fade out | 16.8–18.0 s | 5.40–6.00 s |
| Length | 18 s | 6 s |

The Sting writes the logo on the same beats. Its light passes at 3.2–4.2 s,
and it ends on the logo at 4.7 s (the brief: 8 s). Wet ink dries in 24 frames
(the brief: 48).

## Sound

**The films are silent: the client asked for no sound.** They carry a silent
AAC track, like the earlier cut the client approved. The sound pipeline stays
in place for later:

- **Real cues:** put the ElevenLabs Sound Effects files in `public/sfx/` (the
  table is in `public/sfx/README.md`), then run `npm run render -- --audio-only`.
  Missing files are skipped and listed.
- **Temporary cues:** `npm run sfx:temp` synthesises physically-motivated
  stand-ins into `public/sfx-temp/`: brush strokes whose loudness and
  brightness follow the stroke easings, a water drop with a rising bubble
  resonance, a rin bowl with inharmonic, gently beating partials, and a
  seamless room tone. `npm run render -- --audio-only --temp-sfx` mixes them in.
  Regenerate them after changing the timeline.
- **ElevenLabs:** the canvas "XO One Breath — natural sound" holds the six
  prompts. Generation is refused because the account's subscription has a
  failed or incomplete payment. It was tried twice, the second time on
  6 Nov 2026, and nothing was charged. Its brush cues are 0.75, 0.7 and 2 s
  long. For the current strokes, set them to about 0.5, 0.5 and 0.5 s (the
  minimum is 0.5 s); `brush-long` is time-stretched to the ensō anyway.

How a mix is built:

- Each cue is gain-staged on what will actually play: the bell peaks at −6 dBFS,
  brushes and the water drop at −13 dBFS, the room tone at −38 dBFS RMS. Every
  cue gets 5 ms fades, and `brush-long` is time-stretched to the ensō's length.
  Every cue sits on a beat of `src/timeline.json`: each brush on its stroke,
  the bell as the light starts. If the room tone is shorter than the cut, it
  loops with equal-power crossfades.
- `adelay` per cue → `amix normalize=0` → fades on the ends (Main follows the
  picture's fade-out; the Sting gets a 0.3 s tail because it ends on the
  logo).
- Two passes, **linear only**: the mix is measured with `ebur128` (BS.1770, the
  meter QA uses), then gets one plain `volume` gain toward I=−22 LUFS. The gain
  is capped by true-peak headroom (TP −3) and at +3 dB. Nothing compresses or
  limits, so the room tone is never lifted to hit a number. (`loudnorm` was
  dropped: its meter read about 1 dB low on these short, sparse mixes, so its
  linear mode landed 1 LU hot.) The final MP4's audio is re-measured after AAC.

## How it is built

```
src/geometry.json   section-4 geometry, shared by the TS and Python code
src/timeline.json   every beat in frames (Main, Sting), shared by the TS and Python code
src/timeline.ts     the timelines with the section-6 brush easings
src/look.ts         the style bible as numbers
src/geometry.ts     layout per format, bristled mask lanes
src/layers.tsx      paper canvas, SVG reveal, wet ink, light pass, vignette, grain, fade
src/XO.tsx          one component, props {format: "vertical"|"horizontal", cut}
scripts/            prep.py, render.py, qa.py, stills.mjs, make_standin_logo.py
```

Layer stack, bottom to top:

1. **Paper**: washi under the camera push-in (1.000→1.035, eased, pivoting on the
   logo's optical centre), multiplied by the komorebi, which moves 1.3× the paper
   plus a 24 px drift and a ±10 px, 7 s sway. Also the paper's +2% of the warm
   light pass. All of this is composited per frame in float, with dither.
2. **Logo**: the three layer PNGs (real logo pixels, never redrawn), each
   revealed through an SVG mask, composited additively. X2 also carries its
   small crossing shade.
3. **Wet ink**: the same pixels at +8% (108%) over the trailing 12% of the
   path; dries over 24 frames (the brief: 48).
4. **Light pass** on the logo: a warm band masked by the full logo alpha
   (+8% at the peak, so warm light reaches ~9%, under the 10% cap).
5. Dithered 8% **vignette**, 1.5% monochrome **film grain** (a new seeded
   pattern every 2 frames, overlay blend), and the **fade** to and from #0D0D0D.

### Brief interpretations and deviations (deliberate, all switchable)

- **Alpha upper reference.** prep uses the brief's 230 whenever the logo's
  solid ink is at least that bright. The real file's interior luma is about
  225–233, so its dry-brush texture keeps its tone: alpha 0.80 / 0.97 / 1.0 at
  the 5th, 50th and 95th percentiles. Only if the ink is darker (for example,
  painted at exactly #E6DCD1, luma 221) does it fall back to the measured
  value, so the logo can't turn semi-transparent.
- **The X crossing.** The crossing still belongs to X1, but two things change.
  First, "within 36 px of the X1 line" would hand X1 stubs of X2 (nubs for
  1.4 s), so X1 claims only to its measured edge + 0.5 px (never more than 36).
  Second, the overlap pixels are the union of both inks: more solid than X1's
  dry brush, and edged with the artwork's dark lines along X2. Inside the
  crossing, X1 therefore gets its own texture, mirrored along the stroke from
  either side in stroke-normalised coordinates. X2 carries the remaining
  density, plus a small ground-coloured shade layer (`x2-shade.png`) for its
  dark edge lines, revealed by X2's own mask. X1 alone reads as one
  continuous stroke. The layers sum bit-exactly, so the final frame is still
  the exact logo. `--x1-within-literal` restores the brief's rule.
- **Ensō start pad.** The X paths get a 16 px start pad. The O's is 0: the real
  ensō's dry tail runs into the gap right behind its start, and a pad would
  reveal it 3 s early.
- **Bristles.** The prescribed mask (brief path, 110/130 px, butt caps,
  pathLength 1, dasharray "1 1", dashoffset 1 − progress) and filter
  (feTurbulence 0.9 / 2 octaves / fixed seed → displacement 10 → blur 3) are
  used as specified. On its own, that chain reads as a soft wipe: 0.9
  cycles/px is above Nyquist, so the noise only adds blur. Each mask is
  therefore cut into ~1.5 px parallel lanes (concentric arcs for the ensō). Their
  tips form pointed bristle clumps on a rounded belly, with tapered ends. All
  lanes are solid at progress 1, so the final frame is the exact logo.
- **Komorebi on the logo.** A 3% layer over the logo cannot be done cleanly in
  8-bit CSS compositing, because low-opacity layers posterise a soft shadow
  into hard plateaus. The leaf masses are placed clear of the logo instead:
  the paper gets exactly 6%, the logo 0% (within "at most 3%").
- **Light levels** are read as % of full scale: +2% ≈ +5 levels on paper,
  +8% ≈ +20 levels on the logo, in the warm #F1E2C6.
- **Layer seams.** The stroke layers partition the logo's alpha, so they are
  added (`plus-lighter`) inside an isolated group. Source-over leaves
  conflation seams where X1 and X2 meet.

## QA

`npm run qa` renders about 90 stills through the real composition with QA
switches, then checks every automatable item in the brief's section 10:

- the last logo frame equals all three layers fully shown, within 1/255
- no leaks one frame before X2 and before the O starts (frames 93 and 124 in both
  cuts; QA reads src/timeline.json)
- each mask is solid at progress 1, before the settle
- the fronts are bristled, not a wipe (measured front raggedness)
- komorebi ≤ 3% on the logo
- light pass levels and dithering
- the vignette is 8% and dithered
- wet ink at 108%
- grain cadence and amplitude
- the 9:16 logo stays within y 300–1400
- #0D0D0D first and last frames
- the deliverables' codec, frames and BT.709 tags
- loudness ≈ −22 LUFS and ≤ −3 dBTP, when there is sound

It also writes `out/qa/brush-fronts.png` and a timeline contact sheet per
composition. Two checks stay manual: watch at full speed with sound on a phone
at full brightness, and judge the pace. It is the client's call now: edit
`src/timeline.json`.

## Notes

- Rendering uses PNG frames (not JPEG) and `--color-space=bt709`. Expect
  ~28 Mb/s: CRF 16 keeps the grain.
- `scripts/render.py` uses `$REMOTION_BROWSER_EXECUTABLE` when set. Otherwise
  Remotion downloads its own headless shell.
- Remotion is free for individuals and companies of up to 3 people; larger
  teams need a company license (remotion.pro).
