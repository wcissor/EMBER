Put the natural-sound cues here (ElevenLabs Sound Effects), then run
`npm run render -- --audio-only` to re-mix and re-mux without re-rendering video.

| File | Main (start) | Sting (start) |
| --- | --- | --- |
| room-tone.mp3 (loop) | 0.0 s, to the end, fade in 1.5 s / out 1.2 s | 0.0 s, to the end |
| water-drop.mp3 | 2.4 s | not used |
| brush.mp3 | 3.0 s | 0.8 s |
| brush-lift.mp3 | 5.2 s | 1.7 s |
| brush-long.mp3 | 7.0 s (fitted to 3 s) | 2.6 s (time-stretched to 2 s) |
| bell.mp3 | 11.2 s | 4.7 s |

Any missing file is skipped and listed. Levels are set automatically: bell
peaks at -6 dBFS, brushes and the water drop at -13 dBFS, room tone at
-38 dBFS RMS; master ~-22 LUFS, <= -3 dBTP, linear gain only.
