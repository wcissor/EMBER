#!/usr/bin/env python3
"""Forced alignment of supplied takes against the script's own words (no network, no credits).

The brief's route for audio without timings is ElevenLabs Forced Alignment (or Scribe) when an API key is set,
otherwise silences + syllable counts. No key or upload route is available here, so this aligns locally with
pocketsphinx's acoustic model: English words from CMUdict, Azerbaijani words through scripts/voice/az_g2p.py.
Word boundaries are then snapped to the take's measured silences. Flagged as local in the QA report.

Usage: python3 scripts/voice/align_takes.py <take.mp3> <lang> <voice>
Writes build/takes/<lang>-<voice>.json: {file, lang, voice, duration, lines: [{id, start, end, words: [{word, start, end}]}]}
"""
import json, re, subprocess, sys
from pathlib import Path
from pocketsphinx import Decoder, get_model_path

sys.path.insert(0, str(Path(__file__).parent))
from az_g2p import g2p  # noqa: E402
from identify import cmu, EXTRA_EN, speech_segments  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
M = Path(get_model_path())
SR = 16000


def script(lang, voice):
    out = subprocess.run(['node', '--no-warnings', '-e', f"""
      import('{ROOT}/src/config.ts').then(async (c) => {{
        const t = await import('{ROOT}/src/timeline.ts');
        const rows = c.LINES.filter(l => l.voice === '{voice}').map(l => ({{
          id: l.id,
          say: t.tokenize(t.stripTags(l['{lang}'].say ?? l['{lang}'].show)).map(x => x.text),
          show: t.lineTokens(l.id, '{lang}').map(x => x.text),
        }}));
        console.log(JSON.stringify(rows));
      }})"""], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def phones(word, lang, d):
    if lang == 'az':
        return ' '.join(g2p(word))
    w = re.sub(r"[^a-z']", '', word.lower().replace('’', "'").replace('…', ''))
    if w in EXTRA_EN:
        return EXTRA_EN[w]
    if w in d:
        return d[w]
    raise SystemExit(f'no pronunciation for {word!r}')


def main():
    path, lang, voice = Path(sys.argv[1]).resolve(), sys.argv[2], sys.argv[3]
    rows = script(lang, voice)
    d = cmu() if lang == 'en' else {}
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], check=True, capture_output=True).stdout
    dur = len(raw) / 2 / SR
    dec = Decoder(samprate=SR, hmm=str(M / 'en-us' / 'en-us'), dict=str(M / 'en-us' / 'cmudict-en-us.dict'), lm=None, loglevel='ERROR')
    ids, owner = [], []
    for r in rows:
        for i, w in enumerate(r['say']):
            k = f'w{len(ids)}'
            dec.add_word(k, phones(w, lang, d), False)
            ids.append(k)
            owner.append((r['id'], i))
    dec.set_align_text(' '.join(ids))
    dec.start_utt()
    dec.process_raw(raw, full_utt=True)
    dec.end_utt()
    segs = [(s.word, s.start_frame / 100, (s.end_frame + 1) / 100) for s in dec.seg() if re.match(r'^w\d+', s.word)]
    got = [re.sub(r'\(\d+\)$', '', w) for w, _, _ in segs]
    if got != ids:
        raise SystemExit(f'alignment failed for {path.name}: {len(got)} of {len(ids)} words')
    speech = speech_segments(path)

    def snap_start(t):
        best = min(speech, key=lambda s: abs(s[0] + 0.05 - t))
        return best[0] + 0.05 if abs(best[0] + 0.05 - t) < 0.12 else t

    def snap_end(t):
        # inside a silence → back to where the speech stopped; else the nearest speech end within 0.12 s
        for a, b in speech:
            if a <= t <= b:
                return min(t, b - 0.05) if abs(b - 0.05 - t) < 0.12 else t
        ends = [b - 0.05 for a, b in speech if b - 0.05 <= t]
        return max(ends) if ends else t

    lines = []
    for r in rows:
        ws = [(segs[j][1], segs[j][2]) for j, (lid, _) in enumerate(owner) if lid == r['id']]
        words = [{'word': r['show'][i], 'start': round(a, 3), 'end': round(b, 3)} for i, (a, b) in enumerate(ws)]
        words[0]['start'] = round(snap_start(words[0]['start']), 3)
        words[-1]['end'] = round(snap_end(words[-1]['end']), 3)
        lines.append({'id': r['id'], 'start': words[0]['start'], 'end': words[-1]['end'], 'words': words})
    out = {'file': str(path.relative_to(ROOT)), 'lang': lang, 'voice': voice, 'duration': round(dur, 3), 'aligner': 'pocketsphinx-local', 'lines': lines}
    dest = ROOT / 'build' / 'takes' / f'{lang}-{voice}.json'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    for l in lines:
        print(f"{l['id']}  {l['start']:6.2f}-{l['end']:6.2f}  " + ' '.join(f"{w['word']}@{w['start']:.2f}" for w in l['words']))


if __name__ == '__main__':
    main()
