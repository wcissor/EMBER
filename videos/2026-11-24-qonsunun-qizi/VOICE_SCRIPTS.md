# Qonşunun qızı — voice takes

**Done (generated here, 334 credits on Eleven v3):** Mən (Abbas), Qonşunun oğlu (Arif), Qonşunun qızı (Amalya).
"İndi qonşunun oğlu mənəm." reuses part 1's recording (the callback).

**Still needed: 2 takes in your Sona voice** (this session's safety check does not allow me to generate with a cloned
voice, so please make these two in the ElevenLabs app, as you did for part 1, and send me the MP3s):

| file | voice | characters |
|---|---|---|
| `ana.mp3` | Sona | 266 |
| `qq.mp3` | Sona (I lift it 2 semitones in the mix, as in part 1) | 48 |

- **Model:** Eleven v3, Azerbaijani. One generation per take. Paste each block exactly as it is, one line per line.
- **Tags** in brackets are directions, never spoken.

### ana.mp3
```
[shouting] Necə yəni olmur?!
[shouting] Qonşunun qızına bax!
[proudly] Həyəti təmizlətdi.
Uşaqlara kitab yığdı.
Bütün bina onun dalınca gedir.
[incredulous] Cəmi on beş yaşı var!
[dryly] Qonşunun qızı başqa səviyyədir.
[proudly] Oğluma bax!
[softly] …Həyətimizə bax.
```

### qq.mp3
```
[shouting] Qızıma bax!
[softly] …Həyətimizə bax.
```

When they arrive: `align_takes.py` → `place.py` → `export-timeline.mjs` → `synth2.py` → `mix2.py` → `render2.mjs A Areply B C`.
