## Status: voice

| voice | Azerbaijani | English |
|---|---|---|
| Mən (the kid) | **take supplied** (“Abbas – Engaging Delivery”, ElevenLabs library voice), aligned and placed | missing: `public/audio/takes/en/men.mp3` |
| Ana | missing: `public/audio/takes/az/ana.mp3` | missing: `public/audio/takes/en/ana.mp3` |
| Qonşunun oğlu | missing: `public/audio/takes/az/qo.mp3` | missing: `public/audio/takes/en/qo.mp3` |
| Qonşu | missing: `public/audio/takes/az/qq.mp3` | missing: `public/audio/takes/en/qq.mp3` |

Lines without a take sit on their target times as silent placeholders (section 5, option 4); their captions, beats and
acting are already timed and will re-lock to the measured voice when the takes arrive (align → place → mix → render).
The supplied “Sona (Azerbaijan, female)” file is a 30-second voice sample, not the script: none of its phrases decode as
any script line, so it is not used.

## Deviations from the brief (and why)

- **Voice clone.** “Abbas” is a library PVC (a professional clone of a consenting voice actor). The brief excludes voice
  clones of real people; the user chose this voice, so it is used and noted here.
- **Alignment and the words gate are local.** No ElevenLabs key or upload route is available in this environment, so
  word timings come from local forced alignment (pocketsphinx; Azerbaijani words through a letter-to-phone map), and
  gate 5 decodes each placed line against the script instead of a full Speech-to-Text transcript.
- **Delivery tags trimmed in the voice text** to fit the user's 1,177 ElevenLabs credits (`[shouting across the courtyard]`
  → `[shouting]`, `[quietly, slowly]` → `[quietly]`, `[whispering]` → `[whispers]`, `[warmly]` dropped; one line per line).
  Every spoken word is the script; `config.ts` keeps `show` (captions) and `say` (voice).
- **UI labels not checked against the live site.** voluntrack.site is not reachable from this environment (the proxy
  refuses the host), so the UI uses the brief's labels.
- **English title at 124 px.** At 132 px “THE NEIGHBOR’S SON” measures 993 px, wider than the safe box.
- **Placement.** To keep the silence after L08 whole, L09 starts 8 frames late; L10 follows (+8) and L11 waits 7 frames
  so the bolt, the door slam and the push into the stairwell fit before the whisper; L13 is sped up 3.9%. All within
  the brief's limits (≤ 9 frames, ≤ 6%).
- **The “16” callback** needs Ana's L06; it is wired (sliced by L06's word timings, −10 dB, long reverb) and plays as
  soon as her take exists.
- **Music level.** The music sits ~18 dB under the dialogue and ducks a further 8 dB under speech; in long stretches with
  no line (the UI moment, the end card) it comes up to lead, so the choir hits and the resolve land.
