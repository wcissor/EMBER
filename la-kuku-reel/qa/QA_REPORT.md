# QA report: La Kükü terrasse Reel

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Duration 16.6-16.7 s, 399 frames @ 24 fps | PASS | 16.625 s, 399 frames, 24/1 fps |
| 2 | No jolts (per-shot motion spikes; no frames from jolt zones) | PASS | S1 max 1.9 px/frame (median 0.4); S2 max 1.3 px/frame (median 0.6); S3 max 1.0 px/frame (median 0.4); S4 max 1.8 px/frame (median 1.4); S5 max 0.9 px/frame (median 0.3); source limits C1 3.27s<=3.3, C5 2.87s<=2.9, C3 2.08s<=2.12, C4 from 5.50s>=5.5; filmstrips qa/dissolves_filmstrip.png |
| 3 | Smooth motion: frame counts exact, no duplicate frames | PASS | S1 99/99 frames, min consecutive diff 0.59 (median 1.05); S2 93/93 frames, min consecutive diff 1.83 (median 6.81); S3 87/87 frames, min consecutive diff 2.01 (median 4.42); S4 48/48 frames, min consecutive diff 2.12 (median 3.69); S5 120/120 frames, min consecutive diff 0.70 (median 1.28) |
| 4 | S5 push-in 1.00->1.04 linear, no stepping | PASS | measured zoom vs zoom-1.0 render at every 7th frame: 1.0000 ... 1.0400 (expected 1.0000 ... 1.0400), max error 0.0001, 2nd-difference std 0.00021; rendered sub-pixel (PIL box resize), never zoompan |
| 5 | Lettering intact (neon S5, sign S4) vs lanczos | PASS | S4 realesrnet-x4plus, S5 60/40 AI/lanczos blend; x4plus rejected (changed neon letterforms). S4: PSNR 34.6 dB, edge-map corr 0.997 / S5: PSNR 30.2 dB, edge-map corr 0.994; S5 blend round-trip 34.8 dB; see qa/ab_S4.png, qa/ab_S5.png |
| 6 | Greens/blacks consistent, pinks dusty rose, chroma inside 75% ring | PASS | YLOW 29.9, 30.1, 30.2, 27.3, 29.0 (spread 2.9); green hue 111.6, 110.2, 111.8 (spread 1.6 deg), sat spread 0.014; pinks 347/347 deg; max chroma p99.9 0.256 (<0.37) |
| 7 | No banding (S2 sky, final fade) - grain dithers gradients | PASS | S2 sky uses 100% of the code values in its range (posterised gradients leave gaps); see qa/banding_200pct.png |
| 8 | Halation only on S3-S5, never on text | PASS | HALATION = {"S3": 0.30, "S4": 0.30, "S5": 0.35} applied per shot before the edit; title composited afterwards in 13_render.py |
| 9 | Text centred, in safe zone, readable, fully on by 14.4 s | PASS | box x 334-745 (centre 539.5), y 1149-1178 (baseline 1178): inside organic AND ad-safe zones (bottom 35% = y>1248; right rail x>950); contrast 12.85:1 vs bar shadow (1.91:1 at y=1400, 2.20:1 at y=1300); fade-in 13.6-14.4 s |
| 10 | Audio: one music stream, -14 +-1 LUFS, TP <= -1.0 dBTP (final mp4) | PASS | 1 audio stream (aac 48000 Hz 2 ch); -14.1 LUFS, true peak -2.3 dBTP; loudnorm linear; resolution chord at 13.600 s |
| 11 | Export: 1080x1920 H.264 High yuv420p 24 fps, AAC 48 kHz, faststart | PASS | 1080x1920 h264 High yuv420p bt709, aac 48000 Hz; top-level atoms ['ftyp', 'moov', 'free', 'mdat']; 43.0 MB, 20.7 Mbit/s |
