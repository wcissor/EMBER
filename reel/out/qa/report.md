# RUTA AgLink reel: QA report

Length 30.767 s (923 frames at 30 fps). Voice: ElevenLabs "Andy Freeman - Neutral Sci-Fi Narration", model eleven_v4, take A of 2.

## Summary

| Check | Result |
|---|---|
| 1. Stills, one per scene, safe box drawn | done, see below |
| 2. Slop check | all yes |
| 3. Facts | every claim traced to the brief or the RUTA website; open points listed |
| 4. Voice | PASS: transcript matches the script word for word, 138.9 wpm |
| 5. Safe box | PASS: all text ink inside x 72-1005, y 295-1213 in all 923 frames |
| 6. Specs (ffprobe) | PASS |
| 7. Loudness | PASS: -14.2 LUFS / -1.4 dBTP (with music), -14.1 LUFS / -1.4 dBTP (without) |
| 8. Sound off | contact sheet, one frame per second: `contact-sheet.png` |
| 9. Comfort | PASS: no flashes, lowest text contrast 6.34:1 |

## 1. Stills

Each still is the busiest moment of its scene, with the safe box (x 65-1015, y 269-1248) and the 6-column grid drawn in magenta.

- **S1 Hook** `stills/s1.jpg`: Crop rows, the sensor, its pulse, and the packet flickering halfway up its route; the solid olive trail stops and the dotted route continues without it.
- **S2 Problem** `stills/s2.jpg`: DISTANCE (path stretched), CROPS (rows cut the path), WEATHER (rain); the received strip has gaps.
- **S3 Reveal** `stills/s3.jpg`: AgLink drawn in front elevation (enclosure, two antennas, chip as a hidden line, pole), the name, "by" and the RUTA logo.
- **S4 Diversity** `stills/s4.jpg`: RX A has faded to a flat line; the selector is moving to RX B; the output keeps streaming.
- **S5 Edge AI** `stills/s5.jpg`: Signal now (solid) and forecast (dotted olive) with the predicted dip, FORECAST · LOSS, the chip lit ON-DEVICE, packets unbroken.
- **S6 Result** `stills/s6.jpg`: Cloud outline crossed out with one hairline; the received strip fills with no gaps.
- **S7 End** `stills/s7.jpg`: RUTA logo, AgLink, smart field modem. Holds still.

## 2. Slop check

| Scene | Explains something true? | One accent colour? | Three or fewer moving? | No measurement-like number? | Would Teenage Engineering sign it? |
|---|---|---|---|---|---|
| S1 Hook | yes | yes | yes (rows finishing, pulse ring, packet) | yes | yes |
| S2 Problem | yes | yes | yes (rain, strip filling, path fading) | yes | yes |
| S3 Reveal | yes | yes (logo R is the brand olive) | yes (drawing, name) | yes | yes |
| S4 Diversity | yes | yes | yes (wave B, selector, output packets) | yes | yes |
| S5 Edge AI | yes | yes | yes (time axis scrolling, packets, chip lighting) | yes | yes |
| S6 Result | yes | yes | yes (one at a time: cloud, strike, strip) | yes | yes |
| S7 End | yes | yes | yes (nothing after 1 s) | yes | yes |

Fixed during the stills pass: labels crossed by crop rows (S2), the FORECAST · LOSS label crossing the NOW line (S5), packets bunching where the output stream loops (S4, S5), pairs of rain drops (S2).

## 3. Facts

| Claim on screen or in the voice | Source |
|---|---|
| Sensor data goes missing; distance, crops and weather weaken the signal | General radio behaviour, as framed in the brief. No figures shown. |
| AgLink is a smart field modem, made by RUTA | The brief |
| Two antennas | RUTA website: "Two antennas. A compact body." |
| It takes the stronger signal (diversity reception) | The brief. **Not confirmed:** selection versus combining. |
| An AI model on the device predicts packet loss | The brief. **Not confirmed:** whether it runs on the prototype today. The website only says "a demonstration of signal-change analysis" exists. |
| "so it can adapt in time"; no specific action shown | The brief keeps this general until RUTA says what AgLink does (switch antenna, resend, change timing). |
| Device drawing: enclosure, two antennas, pole mount | RUTA website (pole-mounted concept). Drawn as a diagram, not a product render; the solar panel is left out. |
| No numbers, results, customers, partners or awards | None appear anywhere in the reel. |

## 4. Voice

- Script 67 words, transcript 67 words, differences: none.
- Pace: 67 words over 28.95 s of voice = 138.9 words a minute (target 130-155).
- Pronunciation: the voice was sent "Ruta" (not "RUTA", which v4 reads as emphasis) and "AgLink" as written; Scribe returned "Ruta" and "AgLink".
  Caveat: the transcription ran on the generation node, and it reproduced the script's line breaks, so ElevenLabs probably used the script as a hint.
  It confirms timing more than pronunciation. Nobody has listened to the take yet: RUTA should confirm ROO-tah and AG-link by ear.
- The take was re-spaced only between lines (+1.15 s in total) so each cut lands 0.2 s before its line; no word was edited.

## 5. Safe box

A text-only render (captions, labels, display type, logo; drawings off) was scanned frame by frame: 0 frames had any text pixel outside the safe box.

## 6. Specs

| | with music | without music |
|---|---|---|
| width | 1080 | 1080 |
| height | 1920 | 1920 |
| codec | h264 | h264 |
| profile | High | High |
| pix_fmt | yuv420p | yuv420p |
| r_frame_rate | 30/1 | 30/1 |
| avg_frame_rate | 30/1 | 30/1 |
| frames | 923 | 923 |
| duration | 30.767 | 30.767 |
| audio_codec | aac | aac |
| sample_rate | 48000 | 48000 |
| channels | 2 | 2 |
| audio_bitrate | 256836 | 243306 |
| faststart | True | True |

## 7. Loudness

- With music: -14.2 LUFS integrated, -1.4 dBTP true peak, LRA 2.8 LU.
- Without music: -14.1 LUFS integrated, -1.4 dBTP true peak, LRA 3.0 LU.
- Chain: 4x-oversampled peak limiter at -4.5 dBFS, then two-pass loudnorm (I -14, TP -1.5). The second pass used loudnorm's dynamic mode for the last part of the gain.
- Levels: voice stem -16 LUFS; music 18 dB under the voice while it speaks and 10 dB under in the gaps; effects in between.

## 8. Sound off

`contact-sheet.png` shows one frame per second. The captions carry the words, and the drawings show the problem (packet lost, gaps), the device, the two antennas, the forecast and the unbroken stream.

## 9. Comfort

- Largest luminance change between frames in any 1/16 of the frame: 0.046 (a flash needs 0.10 or more). Flashes per second: 0.
- Text contrast on #151612: text 15.8:1, olive 9.2:1, grey labels 6.34:1, logo cream 15.42:1, logo sage 8.62:1.

## Sound effects used

| Sound | ElevenLabs file | At (s) | Length (s) |
|---|---|---|---|
| sensor tick | `sfx/raw/s1-tick-1.mp3` | 0.3 | 0.12 |
| sensor tick | `sfx/raw/s1-tick-1.mp3` | 1.3 | 0.12 |
| static dropout | `sfx/raw/s1-dropout-2.mp3` | 0.997 | 0.55 |
| hum thinning | `sfx/raw/s2-hum-1.mp3` | 3.517 | 2.0 |
| pen plotter | `sfx/raw/s3-plotter-2.mp3` | 10.117 | 1.0 |
| lock-on | `sfx/raw/s4-lockon-2.mp3` | 16.797 | 0.46 |
| forecast rise | `sfx/raw/s5-rise-2.mp3` | 19.48 | 1.0 |
| adapt click | `sfx/raw/s5-click-1.mp3` | 22.52 | 0.28 |
| packets arriving | `sfx/raw/s6-ticks-1.mp3` | 25.473 | 1.6 |
| low note | `sfx/raw/s7-note-2.mp3` | 28.067 | 1.75 |

I cannot listen to audio, so each effect was chosen from two takes by measurement: length, envelope and pitch. RUTA should play the reel once with sound before posting.

## Music

The connected ElevenLabs connector has no music generation, so the bed is a placeholder made in code (`audio/build_audio.py`):
a soft 96 BPM bass pulse (A, A, F, G), sparse off-beat clock ticks, no drums, ending on a held A-minor chord under the end card.
To use ElevenLabs Music instead, add the full ElevenLabs connector and check that the plan allows business use.

## Credits

- Opening photo: Jack Stapleton on Unsplash (Unsplash License).
- Fonts: Geist and Geist Mono (SIL Open Font License 1.1).
