# Qonşunun qızı — checks

Files checked: qonsunun-qizi-A-nomusic-preview.mp4, qonsunun-qizi-A-preview.mp4

| # | check | result | detail | how |
|---|---|---|---|---|
| 1 | Stills first | SEE | out/qa/stills2/ and out/qa/sheet-*.jpg (safe box: out/qa/safe-*.png) | needs your eyes |
| 2 | Continuity | SEE | out/qa/continuity-*.png: part 1 next to part 2 (yard wide, the kid's window, the stairwell) | needs your eyes |
| 3 | Hook | PASS | frame 0 is moving (push-in from frame 0); bubble at 0.17 s, "Necə yəni olmur?!" at 0.85 s | measured |
| 4 | Pace | FAIL | 38 image changes (cuts, new framings, new screens); median gap 1.07 s, longest 2.83 s | measured |
| 5 | Lip-sync | PARTIAL | the characters have no mouths (part 1's design); the speaker's head nods 2 frames ahead of every word start and the window light breathes with the voice. Waiting for the Sona takes: P01, P03, P05, P06, P07, P08, P10, P17, P18, P19, P19b (silent, timed by syllables). | measured |
| 6 | Script | PASS | every caption equals the approved line with its tags removed | measured |
| 7 | Privacy | PASS | bubbles: the comments' text only (no usernames, no photos); phone: demo data ("Həyət Könüllüləri", demo@voluntrack.site), no counts, no real organisers | by construction |
| 8 | Product truth | PASS | role opens without an account → "Müraciət üçün daxil ol" → sign-in (sped up) → Müraciət et → the organiser's form in a new tab (flash) → back → ✓ Müraciət edildi with confetti | by construction |
| 9 | Slop check | PASS | every frame drawn in code (part 1's kit + new drawings); VolunTrack blue only on volunteer windows, the star, the phone and caption accents | by construction + eyes |
| 11 | Loop (qonsunun-qizi-A-preview.mp4) | FAIL | frame 0 vs frame 1261: 116882 pixels differ noticeably (>60), mean difference 14.23 | measured |
| 12 | Specs, loudness | PASS | qonsunun-qizi-A-nomusic-preview.mp4: 1080×1920 30/1 High yuv420p, AAC 48000 Hz, 42.07 s, -14.1 LUFS, TP -1.4 dBTP<br>qonsunun-qizi-A-preview.mp4: 1080×1920 30/1 High yuv420p, AAC 48000 Hz, 42.07 s, -14.1 LUFS, TP -1.3 dBTP | measured |
| 12 | Comfort (flashes) | PASS | at most 2 large brightness jumps in any second (limit 3) | measured |

**Needs your ears:** Azerbaijani pronunciation of every take; the mix balance on a phone speaker.
**Needs your eyes:** continuity pairs, the stills, the phone flow at full size.
