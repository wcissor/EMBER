# RUTA agritech reel: QA report

Six reels: English and Azerbaijani, each with hooks A, B and C. Each comes with and without music, so 12 files in all.
The brief's 12 checks are below. Numbers come from `scripts/qa.py`, `scripts/qa_text.py` and `audio/build_audio.py`.

## Summary

| # | Check | Result | In short |
|---|---|---|---|
| 1 | Stills first | done | 26 stills at each line's busiest moment, safe box drawn: `stills/` |
| 2 | Hook | PASS | Every first frame moves and has text; a key word lands by 1.12 s at the latest |
| 3 | Pace | PASS | Longest shot before the question: 2.47 s (EN B7) |
| 4 | Slop check | all yes | Real footage or real imagery everywhere; drawings labelled; one accent colour |
| 5 | Truth | PASS | Every number on screen matches `sources.md`; the 10,000 figure is labelled as the maker's |
| 6 | Rights | PASS | 15 shots from 14 Adobe Stock clips traced to licence records; imagery, data, fonts and audio in `licenses/` |
| 7 | Voice | PASS transcript, PASS pace | English 160–170 words a minute; Azerbaijani by ear: RUTA to confirm |
| 8 | Loop | PASS | The last frame flows into the first like any two frames of the same shot |
| 9 | Specs | PASS | All 12 files: 1080×1920, 30 fps constant, H.264 High, yuv420p, AAC 48 kHz, faststart |
| 10 | Loudness | PASS | -13.9 LUFS in every file, true peak -1.7 dBTP at most |
| 11 | Sound off | done | One frame per second per variant: `contact-sheet-*.jpg` |
| 12 | Comfort | PASS | No flashes; captions at least 4.5:1 everywhere |

## Fixed during QA

The first full render failed several of these checks. Each failure was fixed in the design system or the scene, then the affected beats were rendered again and every check was run again:

| What the check found | Fix |
|---|---|
| Pace: the opening shot of B2 ran 2.7 s (EN) and 3.5 s (AZ); the middle shot of the Azerbaijani B6 ran 2.8 s | B2 punches in on the field as the detection boxes appear; the Azerbaijani B6 cuts to the rain cannon on "şirin suyun" |
| Contrast: captions over bright mist (B3, the Azerbaijani H1) dipped to 3.0:1; source tags over spray and mist (B3, B6) to 2.2:1 | A darker bottom gradient under the captions and source tags, the same in every beat |
| Contrast: the collar title sat above its inset, over white fur, at 1.4:1 | The title moved inside the inset (two lines in Azerbaijani), and the inset is darker |
| Contrast: big numbers on the satellite pictures and on the globe's polar ice dipped to 1.1–1.8:1 | A stronger top shade that holds down to the number's last line in B5 and B7 |
| Safe box: the map label "AZERBAIJAN" sat under the country, at y 1436–1458, behind Instagram's buttons; the border line ran behind the captions and the credit lines | The map zoom lands a little wider and higher, so the whole country sits between the number and the credit lines; the label sits inside the country |
| Legibility: three credit and drawing labels were 22 px | 24 px (credits, like the source tags) and 26 px (drawing labels) |
| Sound: the wind bed and the music's shaker sprayed noise up to 16–21 kHz (seen on a spectrogram) | Wind low-passed at 5 kHz and 4 dB quieter; drone low-passed at 10 kHz; shaker band-limited to 3–8 kHz with a softer attack |

## 1. Stills

Each still is the busiest steady moment of its line: the frame with the most text on screen, once counters have landed. The safe box (x 65–1015, y 269–1248) and the caption band are drawn in magenta.

- Variant A, every line: `stills/en-{line}.jpg`, `stills/az-{line}.jpg`.
- Lines only in B and C (H2, H3, B1b, B4s): the same names.
- Sheets: `stills/sheet-en.jpg`, `stills/sheet-az.jpg`.

| Line | What the still shows |
|---|---|
| H1 | Vertical farm, dimmed as its lights go out. "NEARLY $1B raised. Filed for bankruptcy." Source tag names Plenty. |
| B1 | Low over wheat at sunset; "OUTSIDE." in dark olive on the sky. |
| B2 | Crop rows, "10,000 a minute · MAKER'S FIGURE", Carbon Robotics source tag. |
| B3 | Pilot and spray drone; "300,000+ farm drones in China" on the bright sky. |
| B4 | Cow close-up with the collar inset (sound arcs, vibration marks) linked to its neck. |
| B5 | Sentinel-2 centre-pivot fields in Kansas; "EVERY 5 days." ("Free." follows); place, Copernicus credit and source in three short mono lines. |
| B6 | Rain cannon over a field; "≈70% of the fresh water we use" in dark type on the sky. |
| B7 | Sentinel-2 Kura–Araz lowland; "36% of workers"; place, credit and source. |
| B8 | Golden field at dusk; the question in black with the key word in dark olive; the four options below. |
| H2 | Dimmed crop rows with two crosshairs, the number already on screen, ILLUSTRATION. |
| H3 | New Zealand herd from a drone, a dotted fence line drawing itself across the pasture, VIRTUAL FENCE · ILLUSTRATION. |
| B1b | Sunset over wheat, caption only. |
| B4s | The collar inset on the cow, as in B4. |

**Safe box, text-only scan:** every frame of all 26 beats was rendered with only its text (no pictures, no drawings) and scanned. No text pixel falls outside the safe box.

## 2. Hook

| Reel | First frame moves (mean change to frame 2) | Text on frame 1 | First word | Key words heard at |
|---|---|---|---|---|
| EN A | 1.87 | yes | 0.00 s | "billions" 1.12 s, "indoor" 1.92 s, "farms" 2.32 s |
| EN B | 4.99 | yes | 0.03 s | "robot" 0.42 s, "burns" 1.23 s, "weeds" 1.47 s, "lasers" 2.10 s |
| EN C | 5.8 | yes | 0.07 s | "new" 0.18 s, "zealand" 0.39 s, "cows" 1.26 s |
| AZ A | 1.81 | yes | 0.01 s | "qapalı" 0.83 s, "fermalara" 1.24 s, "milyardlarla" 1.75 s |
| AZ B | 5.03 | yes | 0.12 s | "alaq" 0.12 s, "otlarını" 0.38 s, "lazerlə" 0.86 s |
| AZ C | 5.84 | yes | 0.13 s | "yeni" 0.13 s, "zelandiyada" 0.35 s, "inəklərə" 1.35 s |

The first caption word is on screen from frame 1. In hook B the number and its MAKER'S FIGURE label count up from frame 2.

## 3. Pace

Shot lengths in seconds (English / Azerbaijani), from the cut rules in `src/scenes.tsx`, which place every cut on a word of the voice:

| Line | Shots |
|---|---|
| H1 | H1-a racks 1.6/1.7 → H1-c lettuce channels 1.5/1.6 → H1-a racks, lights out 1.9/2.2 |
| H2 | B2-a rows 1.1/1.2 → B2-a punch-in 1.8/1.1 → B2-a rows 1.8/1.4 |
| H3 | B4-a2 NZ herd 1.5/1.8 → B4-a1 NZ herd 1.4/1.3 |
| B1 | B1-a wheat 1.1/0.8 → B1-a punch-in 1.8/1.5 |
| B1b | B1-b tractor from above 1.1/2.0 → B1-a wheat at sunset 2.0/2.3 |
| B2 | B2-a rows 1.1/1.4 → B2-a punch-in, detections 1.6/2.0 → B2-b corn, crosshairs 1.8/1.4 → B2-a rows, 10,000 1.8/1.6 → B2-a punch-in 1.0/0.8 |
| B3 | B3-a spray drone 1.5/1.1 → B3-d pilot and drone 2.3/2.3 |
| B4 | B4-a1 NZ herd 1.5/1.6 → B4-b cow, collar inset 1.6/1.7 → B4-b punch-in, sound 1.9/2.1 → B4-c herd from above, fence 1.4/1.7 |
| B4s | B4-b cow, collar inset 1.7/2.3 → B4-b punch-in, sound 1.9/2.1 → B4-c herd from above, fence 1.4/1.2 |
| B5 | globe, orbit diagram 1.9/2.3 → Sentinel-2 Kansas, capture frame 2.2/1.9 → Sentinel-2 Kansas, punch-in 1.4/0.5 |
| B6 | B6-a sprinklers 1.1/2.2 → B6-b rain cannon 1.9/1.9 → B6-b punch-in 1.5/1.2 |
| B7 | map zoom to Azerbaijan 1.7/2.1 → Sentinel-2 Kura-Araz 2.5/1.6 → Sentinel-2 Kura-Araz, punch-in 1.7/2.1 |
| B8 | B1-c golden field, the question 3.4/3.1 |

- No shot runs longer than 2.5 s except the closing question, which holds for 3.1–3.4 s.
- The moves inside shots (slow push-ins, the globe turning, the map zoom) keep every shot moving. Nothing is static.

## 4. Slop check

| Line | Real footage, real imagery or drawn from real data? | One accent colour? | No AI imagery, glow, generic HUD or stock cliché? |
|---|---|---|---|
| H1 | yes: licensed footage of a vertical farm | yes | yes |
| B1 | yes: licensed footage of wheat at sunset | yes (dark olive on the bright sky) | yes |
| B2 | yes: licensed footage of crop rows; crosshairs labelled ILLUSTRATION | yes | yes: two thin crosshairs, no HUD frame |
| B3 | yes: licensed footage of a spray drone and its pilot | yes | yes |
| B4 | yes: licensed footage of cattle; collar inset labelled ILLUSTRATION | yes | yes |
| B5 | yes: NASA Blue Marble and a real Sentinel-2 scene; orbit labelled DIAGRAM | yes | yes |
| B6 | yes: licensed footage of irrigation | yes | yes |
| B7 | yes: NASA imagery, Natural Earth border, a real Sentinel-2 scene | yes | yes |
| B8 | yes: licensed footage of a field at dusk | yes (dark olive key word) | yes |
| H2 | yes: licensed footage of crop rows; crosshairs labelled ILLUSTRATION | yes | yes |
| H3 | yes: licensed drone footage of a New Zealand herd; fence labelled ILLUSTRATION | yes | yes |
| B1b | yes: licensed footage of a field at sunset | yes | yes |
| B4s | yes: licensed footage of a cow; collar inset labelled ILLUSTRATION | yes | yes |

- No AI-generated images or video are used anywhere. Every Adobe Stock clip is marked `isGenTech: false`.
- Rejected at the shortlist: a clip that looked like a 3D render, one with a lens flare, a tractor sprayer passed off as a drone, and a toy camera drone.
- The accent is RUTA's olive. It is #B4BD92 on dark pictures and #59643F on bright skies: one colour in two values, so it stays readable on both.

## 5. Truth

| Line | On screen | Source in `sources.md` | Source tag |
|---|---|---|---|
| H1 | NEARLY $1B raised / TƏXMİNƏN 1 mlrd $ | TechCrunch, 24 Mar 2025: Plenty "has raised nearly $1 billion" | SOURCE: TECHCRUNCH 2025 · PLENTY |
| B2, H2 | 10,000 a minute · MAKER'S FIGURE / 10 000 · İSTEHSALÇININ RƏQƏMİ | Tom's Hardware, 28 Aug 2025: Carbon Robotics' "claimed '10,000 weeds per minute'" (LaserWeeder G2) | SOURCE: CARBON ROBOTICS 2025 |
| B3 | 300,000+ farm drones in China | CleanTechnica, 20 Sep 2026: "China entered 2026 with about 309,000 plant-protection drones" | SOURCE: CLEANTECHNICA 2026 |
| B5 | EVERY 5 days. Free. | ESA Sentinel-2 facts: "Revisit time: Five days from two-satellite constellation"; ESA 2013 on free, full and open access | SOURCE: ESA · COPERNICUS |
| B5 | KANSAS, USA · 2 AUG 2026 | Sentinel-2 scene S2B_14SLG_20260802 (STAC record in research/satellite/stac-kansas.json) | Copernicus credit line |
| B6 | ≈70% of the fresh water we use | FAO AQUASTAT 2025: agriculture 72% of withdrawals (FAO newsroom), 71% globally in 2022 (Smart Water Magazine) | SOURCE: FAO AQUASTAT 2025 |
| B7 | 36% of workers / İŞLƏYƏNLƏRİN 36% | World Bank CCDR via APA, 29 Nov 2023: "accounts for 36% of total employment" | SOURCE: WORLD BANK 2023 |
| B7 | KURA–ARAZ LOWLAND · 23 JUL 2026 | Sentinel-2 scene S2A_39TTE_20260723 (research/satellite/stac-kura-araz.json) | Copernicus credit line |

- The laser weeder's figure is labelled "MAKER'S FIGURE" / "İSTEHSALÇININ RƏQƏMİ" wherever it appears (B2 and the H2 hook). The B2 voice also says "its maker says".
- "≈70%" sits inside FAO's 71–72%. The voice says "about seventy percent".
- "300,000+" is below CleanTechnica's "about 309,000". The voice says "over 300,000".
- The orbit on the globe is labelled "DIAGRAM": it shows the kind of orbit, not a real pass.
- The crosshairs, the collar and the fence are labelled "ILLUSTRATION". No robot or collar product is shown.

## 6. Rights

| Shot code | Adobe Stock ID (from `scripts/footage.py`) | Licence record | Match |
|---|---|---|---|
| B1-a | 710929741 | 710929741 | yes |
| B1-b | 788101373 | 788101373 | yes |
| B1-c | 1527068097 | 1527068097 | yes |
| B2-a | 275600505 | 275600505 | yes |
| B2-b | 566524463 | 566524463 | yes |
| B3-a | 608684392 | 608684392 | yes |
| B3-d | 488053406 | 488053406 | yes |
| B4-a1 | 247370608 | 247370608 | yes |
| B4-a2 | 247370608 | 247370608 | yes |
| B4-b | 841343330 | 841343330 | yes |
| B4-c | 293665831 | 293665831 | yes |
| B6-a | 368399272 | 368399272 | yes |
| B6-b | 781897184 | 781897184 | yes |
| H1-a | 820742732 | 820742732 | yes |
| H1-c | 469320194 | 469320194 | yes |

| Other material | Licence or credit | In `licenses/README.md` |
|---|---|---|
| sat/globe.mp4, maps/bm-*.jpg | NASA Blue Marble (GIBS) | yes |
| sat/kansas.jpg, sat/kura-araz.jpg | Copernicus Sentinel-2 | yes |
| maps/aze.json | Natural Earth | yes |
| fonts/*.woff2 | Geist, SIL OFL 1.1 | yes |
| img/ruta-logo.png | RUTA's own mark | yes |
| vo/lines/* | ElevenLabs voices (Starter plan) | yes |
| sfx/raw/* | ElevenLabs Sound Effects | yes |
| music (in code) | Ours | yes |

Details: `licenses/adobe-stock/records.md` (17 clips, licensed 16 Nov 2026, $0), `licenses/data.md` (NASA, Copernicus, Natural Earth), `licenses/elevenlabs.md`, `licenses/fonts/`.

## 7. Voice

**English:** take en-2, tempo ×1.0. ElevenLabs Scribe transcript against the script, line by line: every word matches.

| Variant | Words | First word to last | Words a minute | Inside lines only (gaps between lines left out) |
|---|---|---|---|---|
| A | 116 | 43.6 s | 159.7 | 167.7 |
| B | 101 | 36.14 s | 167.7 | 176.6 |
| C | 114 | 40.26 s | 169.9 | 178.8 |

**Azerbaijani:** take az-2, tempo ×1.08. ElevenLabs Scribe transcript against the script, line by line: every word matches.

| Variant | Words | First word to last | Words a minute | Inside lines only (gaps between lines left out) | Syllables a second, inside lines |
|---|---|---|---|---|---|
| A | 102 | 43.72 s | 140.0 | 147.0 | 6.17 |
| B | 87 | 36.45 s | 143.2 | 150.5 | 6.23 |
| C | 99 | 41.57 s | 142.9 | 150.1 | 6.22 |

- **English:** the brief asks for 160–175 words a minute. Measured from the first word to the last, as a listener hears it, A is at the bottom of that range and B and C sit in the middle. Inside the lines alone, the voice runs at 168–179.
- **Azerbaijani:** words are longer than English words, because suffixes are joined on ("təsərrüfatındadır" is one word for "is in agriculture"). So the same speaking speed gives fewer words a minute.
  - The Azerbaijani voice was sped up 8% (pitch kept), so the reels fit in 45 s and match the English pace.
  - Syllables a second show speaking speed better than words do. Inside lines, the Azerbaijani voice says about 6.2 syllables a second (counted by vowels); the English voice says about 4.1–4.3 (estimated).
  - Languages differ in syllable rate, so the two numbers are not meant to be equal. What matters is whether the Azerbaijani sounds natural. If it sounds rushed to a native ear, the fix is to drop the 8% speed-up and shorten a line.
- **Native sound:** I cannot judge by ear. A native speaker at RUTA should listen to the Azerbaijani reels, especially "Zelandiyada", "intellektlə" and "təsərrüfatındadır".

## 8. Loop

Each reel ends with 6 frames of its hook's first shot, taken from just before frame 1. The last frame then flows straight into the first.

| Reel | Last frame → first frame | The same shot, frame to frame (median) | Whole reel, frame to frame (median) |
|---|---|---|---|
| EN A | 1.36 | 1.89 | 1.94 |
| EN B | 4.04 | 4.94 | 1.76 |
| EN C | 6.02 | 5.65 | 1.9 |
| AZ A | 1.37 | 1.83 | 2.03 |
| AZ B | 4.04 | 4.92 | 1.8 |
| AZ C | 6.02 | 5.66 | 2.09 |

Mean absolute difference in 8-bit levels at 270×480. The seam passes when it is no bigger than 1.5× the same shot's own frame-to-frame change: hook C opens on a moving herd, so its frames change more than the reel's average. Strips of the last 6 and first 6 frames: `loop-{lang}-{V}.jpg`. The audio ends in near-silence, so the loop point is quiet too.

## 9. Specs

| File | Size | Frames | Duration | Video | Frame rate | Audio | Faststart |
|---|---|---|---|---|---|---|---|
| ruta-agritech-en-A.mp4 | 64.5 MB | 1344 (expected 1344) | 44.8 s | h264 High yuv420p 1080×1920, 11.2 Mb/s | 30/1, interval error ≤ 0.001 ms | aac 48000 Hz 2 ch 277 kb/s | yes |
| ruta-agritech-en-A-nomusic.mp4 | 64.3 MB | 1344 (expected 1344) | 44.8 s | h264 High yuv420p 1080×1920, 11.2 Mb/s | 30/1, interval error ≤ 0.001 ms | aac 48000 Hz 2 ch 246 kb/s | yes |
| ruta-agritech-en-B.mp4 | 53.8 MB | 1121 (expected 1121) | 37.367 s | h264 High yuv420p 1080×1920, 11.2 Mb/s | 30/1, interval error ≤ 0.001 ms | aac 48000 Hz 2 ch 275 kb/s | yes |
| ruta-agritech-en-B-nomusic.mp4 | 53.6 MB | 1121 (expected 1121) | 37.367 s | h264 High yuv420p 1080×1920, 11.2 Mb/s | 30/1, interval error ≤ 0.001 ms | aac 48000 Hz 2 ch 245 kb/s | yes |
| ruta-agritech-en-C.mp4 | 66.1 MB | 1246 (expected 1246) | 41.533 s | h264 High yuv420p 1080×1920, 12.4 Mb/s | 30/1, interval error ≤ 0.001 ms | aac 48000 Hz 2 ch 279 kb/s | yes |
| ruta-agritech-en-C-nomusic.mp4 | 65.9 MB | 1246 (expected 1246) | 41.533 s | h264 High yuv420p 1080×1920, 12.4 Mb/s | 30/1, interval error ≤ 0.001 ms | aac 48000 Hz 2 ch 246 kb/s | yes |
| ruta-agritech-az-A.mp4 | 68.5 MB | 1348 (expected 1348) | 44.933 s | h264 High yuv420p 1080×1920, 11.9 Mb/s | 30/1, interval error ≤ 0.001 ms | aac 48000 Hz 2 ch 254 kb/s | yes |
| ruta-agritech-az-A-nomusic.mp4 | 68.4 MB | 1348 (expected 1348) | 44.933 s | h264 High yuv420p 1080×1920, 11.9 Mb/s | 30/1, interval error ≤ 0.001 ms | aac 48000 Hz 2 ch 233 kb/s | yes |
| ruta-agritech-az-B.mp4 | 57.2 MB | 1133 (expected 1133) | 37.767 s | h264 High yuv420p 1080×1920, 11.8 Mb/s | 30/1, interval error ≤ 0.001 ms | aac 48000 Hz 2 ch 254 kb/s | yes |
| ruta-agritech-az-B-nomusic.mp4 | 57.1 MB | 1133 (expected 1133) | 37.767 s | h264 High yuv420p 1080×1920, 11.8 Mb/s | 30/1, interval error ≤ 0.001 ms | aac 48000 Hz 2 ch 232 kb/s | yes |
| ruta-agritech-az-C.mp4 | 70.0 MB | 1287 (expected 1287) | 42.9 s | h264 High yuv420p 1080×1920, 12.8 Mb/s | 30/1, interval error ≤ 0.001 ms | aac 48000 Hz 2 ch 254 kb/s | yes |
| ruta-agritech-az-C-nomusic.mp4 | 69.9 MB | 1287 (expected 1287) | 42.9 s | h264 High yuv420p 1080×1920, 12.8 Mb/s | 30/1, interval error ≤ 0.001 ms | aac 48000 Hz 2 ch 233 kb/s | yes |

## 10. Loudness

| File | Integrated | True peak | LRA |
|---|---|---|---|
| ruta-agritech-en-A.mp4 | -13.9 LUFS | -1.8 dBTP | 2.7 LU |
| ruta-agritech-en-A-nomusic.mp4 | -13.9 LUFS | -1.8 dBTP | 2.8 LU |
| ruta-agritech-en-B.mp4 | -13.9 LUFS | -1.8 dBTP | 2.8 LU |
| ruta-agritech-en-B-nomusic.mp4 | -13.9 LUFS | -1.7 dBTP | 2.9 LU |
| ruta-agritech-en-C.mp4 | -13.9 LUFS | -1.8 dBTP | 2.7 LU |
| ruta-agritech-en-C-nomusic.mp4 | -13.9 LUFS | -1.7 dBTP | 2.9 LU |
| ruta-agritech-az-A.mp4 | -13.9 LUFS | -2.1 dBTP | 3.3 LU |
| ruta-agritech-az-A-nomusic.mp4 | -13.9 LUFS | -2.1 dBTP | 3.5 LU |
| ruta-agritech-az-B.mp4 | -13.9 LUFS | -2.0 dBTP | 3.1 LU |
| ruta-agritech-az-B-nomusic.mp4 | -13.9 LUFS | -2.0 dBTP | 3.2 LU |
| ruta-agritech-az-C.mp4 | -13.9 LUFS | -2.1 dBTP | 2.7 LU |
| ruta-agritech-az-C-nomusic.mp4 | -13.9 LUFS | -2.1 dBTP | 2.8 LU |

- **Chain:**
  - The voice stem is set to −16 LUFS.
  - Effects sit 15–40 dB below full scale, depending on the sound.
  - Music sits 14 dB under the voice while it speaks and 9 dB under between lines.
  - Then a 4× oversampled peak limiter at −4.5 dBFS and a two-pass loudnorm (−14 LUFS, −1.5 dBTP), linear in every file.
- Measured on the final MP4s, after AAC encoding.

## 11. Sound off

`contact-sheet-{lang}-{V}.jpg` show one frame per second, with the time stamped on each. Without sound, each reel still reads:
- indoor farm, "$1B raised, filed for bankruptcy"
- "OUTSIDE."
- crop rows with crosshairs, "10,000 a minute"
- drone, "300,000+"
- cow with collar inset, then a herd with a dotted fence
- globe, then fields, "every 5 days, free"
- irrigation, "≈70%"
- Azerbaijan on the map, "36% of workers"
- the question

The burned-in captions carry every spoken word.

## 12. Comfort

- **Flashes:** none in any reel. WCAG allows 3 a second.
  - Method: relative luminance of each sixteenth of the frame, frame by frame. A flash is a pair of opposite changes of 10% or more.
  - The laser ticks are tiny (a few pixels) and single, so they are not flashes.
- **Caption contrast:** the lowest is 6.75:1, in az-B3.
  - Method: in each 60×40 tile holding a steady caption (words still fading in or out are left out), the text's luminance against the brightest 10% of the picture around it, after the bottom shade.

| Beat | Captions: lowest | 5th percentile | median |
|---|---|---|---|
| en-H1 | 7.08:1 | 9.6:1 | 14.43:1 |
| en-B1 | 9.15:1 | 9.49:1 | 16.65:1 |
| en-B2 | 7.62:1 | 8.01:1 | 14.76:1 |
| en-B3 | 6.76:1 | 6.79:1 | 12.06:1 |
| en-B4 | 8.12:1 | 8.45:1 | 14.16:1 |
| en-B5 | 8.38:1 | 9.51:1 | 15.63:1 |
| en-B6 | 7.41:1 | 9.13:1 | 16.17:1 |
| en-B7 | 8.16:1 | 8.63:1 | 14.99:1 |
| en-H2 | 8.46:1 | 8.81:1 | 15.7:1 |
| en-B1b | 9.33:1 | 16.51:1 | 16.86:1 |
| en-H3 | 7.98:1 | 8.51:1 | 15.14:1 |
| en-B4s | 8.26:1 | 8.45:1 | 9.1:1 |
| az-H1 | 6.79:1 | 6.97:1 | 13.93:1 |
| az-B1 | 9.22:1 | 9.43:1 | 9.6:1 |
| az-B2 | 7.62:1 | 8.16:1 | 15.02:1 |
| az-B3 | 6.75:1 | 6.81:1 | 12.17:1 |
| az-B4 | 8.1:1 | 8.5:1 | 15.47:1 |
| az-B5 | 8.52:1 | 9.53:1 | 15.48:1 |
| az-B6 | 9.38:1 | 12.21:1 | 16.14:1 |
| az-B7 | 8.0:1 | 8.46:1 | 14.74:1 |
| az-H2 | 8.75:1 | 8.96:1 | 15.85:1 |
| az-B1b | 9.19:1 | 16.57:1 | 16.87:1 |
| az-H3 | 7.7:1 | 9.09:1 | 15.45:1 |
| az-B4s | 8.07:1 | 8.51:1 | 15.1:1 |

**Other text** (numbers, labels, source tags) is large text by WCAG's definition (24 px and up), so it needs 3:1.
All of it reaches 3:1 or more at every steady moment.
The RUTA mark sits at 40% opacity by design and is not counted as text.

## Sound effects

One quiet, dry sound per reveal, from ElevenLabs Sound Effects (two takes each, chosen by measurement), cued from the same words as the pictures:

| Line | Sound | Take used | When |
|---|---|---|---|
| H1 | breaker | breaker-a, the first clunk | as the farm goes dark, on "bust" |
| B1, H3 | wind | wind-b, the steadier take, low-passed at 5 kHz and tiled under the line | under the whole line |
| B2, H2 | laser ticks | three different 55–75 ms ticks from laser-a | as each crosshair fires |
| B3 | drone | drone-b, the steady pass, low-passed at 10 kHz | under the spray drone |
| B4, B4s | beep, buzz | beep-a trimmed; the buzz is made in code | on "sound" and "vibration" |
| B5 | shutter | shutter-a, first click | as the frame closes on the field |
| B6 | water drop | drop-a | as the 70% lands |
| B7 | whoosh | whoosh-b, a low swell | peaking as the map lands on Azerbaijan |
| B8 | soft hit | hit-b | on the cut to the question |

I can't listen to audio, so each take was chosen by measurement: length, envelope, pitch and clipping. RUTA should play each reel once with sound before posting.

## Music

- **ElevenLabs Music:** not used. The connected ElevenLabs connector can't generate music, so the music is a placeholder made in code.
- **The placeholder:** 110 BPM soft plucks over two open chords. A bass, a soft kick and a shaker (band-limited to 3–8 kHz, so it never clicks) come in line by line. It drops to a held chord that fades out on the question.
- **Our advice:** post the `-nomusic` files with a trending track added in Instagram, or replace the placeholder with licensed music.

