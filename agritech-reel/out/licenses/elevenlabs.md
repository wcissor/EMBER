# ElevenLabs: voice-over and sound effects

- **Account plan:** Starter (paid). ElevenLabs paid plans include a commercial licence for generated audio. Checked through the ElevenLabs connector on 16 Nov 2026 (`tier: starter`).
- **Voice-over:** text-to-speech, model `eleven_v4`, two takes per language. The take used for each language is in `vo/takes/`, cut into one file per line in `vo/lines/`.
  - English: voice "Joe" (voice ID `5Xx8kcjjamcaKohQT5wv`), from the ElevenLabs voice library.
  - Azerbaijani: voice "Abbas" (voice ID `IVMbfLv3KqUc4qDj6Yif`), from the ElevenLabs voice library. Sped up 8% in post (Rubber Band, pitch kept).
  - Both voices were chosen from a three-voice audition per language, by measurement (pace, pauses, transcript match). Files: `vo/audition/`.
- **Word timings:** ElevenLabs Scribe speech-to-text on each final take. They drive the captions and the cuts.
- **Sound effects:** ElevenLabs Sound Effects v2 (`eleven_text_to_sound_v2`), two takes per sound, in `sfx/raw/`. `audio/build_audio.py` lists the take and trim used for each sound. The collar's vibration buzz is made in code.
- **Music:** not from ElevenLabs. The connected ElevenLabs connector cannot generate music, so the music is a placeholder made in code (`audio/build_audio.py`).
