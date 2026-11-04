#!/usr/bin/env python3
"""Which script lines are in a supplied take? Decodes each speech segment against a grammar of the script's own
lines (Azerbaijani via scripts/voice/az_g2p.py, English via CMUdict) and prints the best match per segment.
Usage: python3 scripts/voice/identify.py <audio> <lang> [voice,...]"""
import json, re, subprocess, sys
from pathlib import Path
from pocketsphinx import Decoder, get_model_path

sys.path.insert(0, str(Path(__file__).parent))
from az_g2p import g2p  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
M = Path(get_model_path())
SR = 16000


def load_lines(lang):
    out = subprocess.run(['node', '--no-warnings', '-e', f"""
      import('{ROOT}/src/config.ts').then(async (c) => {{
        const t = await import('{ROOT}/src/timeline.ts');
        console.log(JSON.stringify(c.LINES.map(l => ({{id: l.id, voice: l.voice, text: t.stripTags(l['{lang}'].say ?? l['{lang}'].show)}}))));
      }})"""], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def cmu():
    d = {}
    with open(M / 'en-us' / 'cmudict-en-us.dict') as f:
        for line in f:
            w, p = line.strip().split(' ', 1)
            if '(' not in w:
                d[w] = p
    return d


EXTRA_EN = {'voluntrack': 'V AA L AH N T R AE K', "neighbor's": 'N EY B ER Z'}


def phones(word, lang, d):  # noqa: D103
    if lang == 'az':
        return ' '.join(g2p(word))
    w = re.sub(r"[^a-z']", '', word.lower().replace('’', "'"))
    if w in EXTRA_EN:
        return EXTRA_EN[w]
    if w in d:
        return d[w]
    return None


def speech_segments(path, noise='-38dB', d=0.18):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', f'silencedetect=noise={noise}:d={d}', '-f', 'null', '-'], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)], capture_output=True, text=True).stdout)
    segs, t = [], 0.0
    for s, e in zip(starts, ends + [dur]):
        if s - t > 0.12:
            segs.append((max(0, t - 0.05), s + 0.05))
        t = e
    if dur - t > 0.12:
        segs.append((t - 0.05, dur))
    return segs


def main():
    path, lang = sys.argv[1], sys.argv[2]
    voices = sys.argv[3].split(',') if len(sys.argv) > 3 else None
    lines = [l for l in load_lines(lang) if not voices or l['voice'] in voices]
    d = cmu()
    words = {}
    rules = []
    for l in lines:
        ids = []
        for w in l['text'].replace('-', ' ').split():
            ph = phones(w, lang, d)
            if not ph:
                continue
            key = f"w{len(words)}"
            words[key] = (w, ph)
            ids.append(key)
        rules.append(f"<l{l['id']}> = {' '.join(ids)} ;")
    alts = ' | '.join(f"<l{l['id']}>" for l in lines)
    gram = '#JSGF V1.0;\ngrammar g;\npublic <s> = ( ' + alts + ' )+ ;\n' + '\n'.join(rules) + '\n'
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], check=True, capture_output=True).stdout
    dec = Decoder(samprate=SR, hmm=str(M / 'en-us' / 'en-us'), dict=str(M / 'en-us' / 'cmudict-en-us.dict'), lm=None, loglevel='ERROR')
    for k, (w, ph) in words.items():
        dec.add_word(k, ph, False)
    dec.add_jsgf_string('lines', gram)
    dec.activate_search('lines')
    rev = {}
    for l in lines:
        for w in l['text'].replace('-', ' ').split():
            pass
    word2line = {}
    for l in lines:
        for k, (w, ph) in words.items():
            pass
    # map word id → line id
    idx = 0
    for l in lines:
        for w in l['text'].replace('-', ' ').split():
            if phones(w, lang, d):
                word2line[f'w{idx}'] = l['id']
                idx += 1
    for a, b in speech_segments(path):
        chunk = raw[int(a * SR) * 2:int(b * SR) * 2]
        dec.start_utt()
        dec.process_raw(chunk, full_utt=True)
        dec.end_utt()
        h = dec.hyp()
        seq = []
        if h:
            for k in h.hypstr.split():
                lid = word2line.get(k, '?')
                if not seq or seq[-1] != lid:
                    seq.append(lid)
        print(f'{a:6.2f}-{b:6.2f}  lines {" + ".join(seq):14s} score {h.score if h else 0}')


if __name__ == '__main__':
    main()
