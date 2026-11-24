# Qonşunun qızı — voice takes (all generated, Eleven v3, Azerbaijani)

| character | voice | take | credits |
|---|---|---|---|
| Ana | "Ana (Qonşunun qızı)", a designed Azerbaijani voice (bDw1r0j3ONDv091JeHMt) | `public/audio/takes/az/ana.mp3` | 266 |
| Qonşu | "Qonşu (Qonşunun qızı)", a designed Azerbaijani voice (38pWf41HCuSkz4G9rfuD) | `qq.mp3` | 48 |
| Mən | Abbas (library voice, as in part 1) | `men.mp3` (+ part 1's "İndi qonşunun oğlu mənəm." in `men-p1.mp3`) | 149 |
| Qonşunun oğlu | Arif (library voice, as in part 1) | `qo.mp3` | 53 |
| Qonşunun qızı | Amalya (library voice) | `qz.mp3` | 132 |

Voice design previews: two rounds of three (Ana, Qonşu), picked by pitch and by a word-for-word transcription check.

Part 1's Mom was Sona (a clone in the account). This session's safety check does not allow generating with a cloned
voice, so Mom and Qonşu have new designed voices. To put Sona back, make `ana.mp3` and `qq.mp3` in the ElevenLabs app
with the text below and run: align_takes → place → export-timeline → synth2 → mix2 → render2.

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
