#!/usr/bin/env python3
"""Places every line on the film timeline (section 5, "Placing the voice").

Each line starts at its target time. If a line runs long, the time comes out of the pause before the next line first,
then the next line moves later by up to 9 frames; a line is never sped up by more than 6% and no word is cut.
The silences after lines 08 and 14 are the jokes: they are never shortened (the next line moves instead).
Lines whose take has not arrived keep their target times (placeholder; flagged).

Usage: python3 scripts/voice/place.py [az|en ...]
Writes public/audio/voice_timings-<lang>.json and build/placement-<lang>.json.
"""
import json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FPS = 30


def config():
    out = subprocess.run(['node', '--no-warnings', '-e', f"""
      import('{ROOT}/src/config.ts').then(async (c) => {{
        const t = await import('{ROOT}/src/timeline.ts');
        const L = c.LINES.map(l => ({{id: l.id, voice: l.voice, target: l.target,
          text: {{az: t.stripTags(l.az.show), en: t.stripTags(l.en.show)}},
          tokens: {{az: t.lineTokens(l.id, 'az').map(x => x.text), en: t.lineTokens(l.id, 'en').map(x => x.text)}}}}));
        console.log(JSON.stringify({{lines: L, placement: c.PLACEMENT}}));
      }})"""], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def syl(w):
    import re
    return max(1, len(re.findall(r'[aeəıioöuüy]+', w.lower())))


def placeholder_words(tokens, start, end):
    gap = 0.05
    total = end - start - gap * (len(tokens) - 1)
    s = [syl(t) for t in tokens]
    tot = sum(s)
    t, out = start, []
    for tk, n in zip(tokens, s):
        d = total * n / tot
        out.append({'word': tk, 'start': round(t, 3), 'end': round(t + d, 3)})
        t += d + gap
    return out


def place(lang):
    cfg = config()
    rules = cfg['placement']
    max_shift = rules['maxShiftFrames'] / FPS
    max_speed = rules['maxSpeedup']
    keep = set(rules['keepPauseAfter'])
    min_gap = 0.12
    takes = {}
    for v in ('ana', 'men', 'qo', 'qq'):
        p = ROOT / 'build' / 'takes' / f'{lang}-{v}.json'
        if p.exists():
            j = json.loads(p.read_text())
            for l in j['lines']:
                takes[l['id']] = {**l, 'file': j['file'], 'voice': v}
    lines = cfg['lines']
    placed, violations = [], []
    prev_end = -1.0
    for i, L in enumerate(lines):
        t0, t1 = L['target']
        take = takes.get(L['id'])
        dur = (take['end'] - take['start']) if take else (t1 - t0)
        tempo = 1.0
        start = t0
        # the protected comic pause after the previous line (target gap) is kept whole
        if i > 0 and lines[i - 1]['id'] in keep:
            want_gap = t0 - lines[i - 1]['target'][1]
            start = max(start, prev_end + want_gap)
        else:
            start = max(start, prev_end + max(min_gap, rules['minGapBeforeSec'].get(L['id'], 0)))
        shift = start - t0
        if shift > max_shift + 1e-6:
            violations.append(f"L{L['id']} would move {round(shift * FPS)} frames (> {rules['maxShiftFrames']})")
        # the line itself: if it would run into the next line's target, speed it up (≤6%) before anything else moves
        nxt = lines[i + 1]['target'][0] if i + 1 < len(lines) else 40.0
        room = nxt - min_gap - start
        if take and dur > room and L['id'] not in keep:
            need = dur / max(room, 1e-3)
            tempo = min(need, 1 + max_speed)
        end = start + dur / tempo
        words = []
        if take:
            for w in take['words']:
                a = start + (w['start'] - take['start']) / tempo
                b = start + (w['end'] - take['start']) / tempo
                words.append({'word': w['word'], 'start': round(a, 3), 'end': round(b, 3)})
            # the caption tokens are the show text; the aligned words carry the same tokens
            tokens = L['tokens'][lang]
            if [w['word'] for w in words] != tokens:
                violations.append(f"L{L['id']} word mismatch")
        else:
            words = placeholder_words(L['tokens'][lang], start, end)
        placed.append({
            'id': L['id'], 'voice': L['voice'], 'text': L['text'][lang], 'start': round(start, 3), 'end': round(end, 3), 'words': words,
            'source': 'take' if take else 'placeholder',
            'src': {'file': take['file'], 'start': take['start'], 'end': take['end']} if take else None,
            'tempo': round(tempo, 4), 'shiftFrames': round(shift * FPS),
        })
        prev_end = end
    timings = [{k: p[k] for k in ('id', 'voice', 'text', 'start', 'end', 'words')} for p in placed]
    (ROOT / 'public' / 'audio' / f'voice_timings-{lang}.json').write_text(json.dumps(timings, ensure_ascii=False, indent=1))
    (ROOT / 'build' / f'placement-{lang}.json').write_text(json.dumps({'lang': lang, 'lines': placed, 'violations': violations}, ensure_ascii=False, indent=1))
    meta_p = ROOT / 'build' / 'voice-meta.json'
    meta = json.loads(meta_p.read_text()) if meta_p.exists() else {}
    real = sorted({p['voice'] for p in placed if p['source'] == 'take'})
    missing = sorted({p['voice'] for p in placed if p['source'] != 'take'})
    meta[lang] = {'source': 'takes' if not missing else ('partial' if real else 'placeholder'), 'voices': real, 'missing': missing,
                  'aligner': 'pocketsphinx-local' if real else None}
    meta_p.write_text(json.dumps(meta, indent=1))
    print(f"{lang}: {len(placed)} lines, takes for {real or 'none'}, placeholders for {missing or 'none'}")
    for p in placed:
        if p['source'] == 'take':
            print(f"  L{p['id']} {p['voice']:4s} {p['start']:6.2f}-{p['end']:6.2f}  tempo {p['tempo']:.3f}  shift {p['shiftFrames']:+d} f")
    for v in violations:
        print('  VIOLATION', v)


if __name__ == '__main__':
    for lang in (sys.argv[1:] or ['az', 'en']):
        place(lang)
