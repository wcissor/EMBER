"""Caption files for each variant: out/captions-{lang}-{V}.srt.

The cues are the on-screen caption chunks (src/config.ts), timed from the ElevenLabs word timings in
src/timeline.json, so the SRT matches what the video shows. The closing question, shown big on screen
instead of as a caption, gets its own cues. "*" and "+n" markers are stripped.
"""
import json, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
TL = json.loads((ROOT / 'src/timeline.json').read_text())
FPS, TAIL = TL['fps'], TL['tail']
SRC = (ROOT / 'src/config.ts').read_text()


def block(name):
    b = SRC[SRC.index(f'export const {name}'):]
    return b[: b.index('\n};') + 3]


def captions():
    b = block('CAPTIONS')
    out = {}
    for lang in ('en', 'az'):
        part = b[b.index(f'  {lang}: {{'):]
        part = part[: part.index('\n  },')]
        out[lang] = {lid: re.findall(r"'([^']*)'|\"([^\"]*)\"", body) for lid, body in re.findall(r'^\s{4}(\w+):\s*\[(.*)\],?\s*$', part, re.M)}
        out[lang] = {k: [a or b for a, b in v] for k, v in out[lang].items()}
    return out


def question():
    b = block('TEXT')
    out = {}
    for lang in ('en', 'az'):
        part = b[b.index(f'  {lang}: {{'):]
        m = re.search(r"question:\s*\[([^\]]*)\]", part)
        out[lang] = re.findall(r"'([^']*)'", m.group(1))
    return out


CAP, Q = captions(), question()


def ts(s):
    ms = int(round(s * 1000))
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


def cues_for_line(lang, lid, t0):
    line = TL['lines'][lang][lid]
    words = line['words']
    chunks = CAP[lang][lid]
    if lid == 'END':  # the end card: no words
        return []
    if not chunks:  # the question: shown big on screen, captioned here in one or two cues
        q = Q[lang]
        half = (len(q) + 1) // 2 if len(q) > 6 else len(q)
        chunks = [' '.join(q[:half])] + ([' '.join(q[half:])] if half < len(q) else [])
    out, i = [], 0
    for c in chunks:
        n = 0
        for w in c.split(' '):
            m = re.search(r'\+(\d+)$', w)
            n += int(m.group(1)) if m else 1
        a, b = words[i], words[min(i + n, len(words)) - 1]
        text = re.sub(r'\+\d+', '', c.replace('*', ''))
        out.append([t0 + a['start'], t0 + b['end'], text])
        i += n
    if i != len(words):
        raise SystemExit(f'{lang} {lid}: captions cover {i} words, the voice has {len(words)}')
    return out


for lang in (sys.argv[1:] or ['en']):  # English by default; pass az for Azerbaijani
    for v, seq in TL['variants'].items():
        t, cues = 0, []
        line_ends = []
        for lid in seq:
            start = t / FPS
            cues += cues_for_line(lang, lid, start)
            t += TL['lines'][lang][lid]['frames']
            line_ends.append(t / FPS)
        total = (t + TAIL) / FPS
        # Hold each cue until the next one starts (at most 0.6 s past its last word), never past the video.
        for k, c in enumerate(cues):
            nxt = cues[k + 1][0] if k + 1 < len(cues) else total
            c[1] = min(max(c[1], c[0] + 0.5), nxt - 0.001, c[1] + 0.6, total)
        srt = '\n'.join(f'{k + 1}\n{ts(a)} --> {ts(b)}\n{text}\n' for k, (a, b, text) in enumerate(cues))
        (ROOT / f'out/captions-{lang}-{v}.srt').write_text(srt, encoding='utf-8')
        print(lang, v, len(cues), 'cues', f'{total:.2f} s')
