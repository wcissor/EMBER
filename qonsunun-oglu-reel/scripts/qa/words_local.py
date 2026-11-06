#!/usr/bin/env python3
"""Gate 5, local: cut each placed line out of the final mix and decode it against a grammar of every script line
(pocketsphinx; Azerbaijani via scripts/voice/az_g2p.py). Prints JSON rows {id, expected, heard, ok}.
Usage: python3 scripts/qa/words_local.py <final.mp4> <lang>"""
import json, subprocess, sys
from pathlib import Path
from pocketsphinx import Decoder, get_model_path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts' / 'voice'))
from identify import load_lines, cmu, phones  # noqa: E402

M = Path(get_model_path())
SR = 16000
final, lang = sys.argv[1], sys.argv[2]
pl = json.loads((ROOT / 'build' / f'placement-{lang}.json').read_text())
lines = load_lines(lang)
d = cmu() if lang == 'en' else {}
dec = Decoder(samprate=SR, hmm=str(M / 'en-us' / 'en-us'), dict=str(M / 'en-us' / 'cmudict-en-us.dict'), lm=None, loglevel='ERROR')
word2line, rules, k = {}, [], 0
for l in lines:
    ids = []
    for w in l['text'].replace('-', ' ').split():
        ph = phones(w, lang, d)
        if not ph:
            continue
        key = f'w{k}'
        k += 1
        dec.add_word(key, ph, False)
        word2line[key] = l['id']
        ids.append(key)
    rules.append(f"<l{l['id']}> = {' '.join(ids)} ;")
gram = '#JSGF V1.0;\ngrammar g;\npublic <s> = ( ' + ' | '.join(f"<l{l['id']}>" for l in lines) + ' ) ;\n' + '\n'.join(rules) + '\n'
dec.add_jsgf_string('lines', gram)
dec.activate_search('lines')
def pcm(path):
    return subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], check=True, capture_output=True).stdout


def decode(raw, a, b):
    chunk = raw[int(a * SR) * 2:int(b * SR) * 2]
    dec.start_utt()
    dec.process_raw(chunk, full_utt=True)
    dec.end_utt()
    h = dec.hyp()
    return word2line.get(h.hypstr.split()[0], '?') if h and h.hypstr else '?'


mix = pcm(final)
stems = {}
rows = []
text = {l['id']: l['text'] for l in lines}
for L in pl['lines']:
    if L['source'] != 'take':
        continue
    a, b = max(0, L['start'] - 0.08), L['end'] + 0.12
    v = L['voice']
    if v not in stems:
        stems[v] = pcm(ROOT / 'public' / 'audio' / 'stems' / lang / f'{v}.wav')
    in_mix = decode(mix, a, b)
    in_stem = decode(stems[v], a, b)
    rows.append({'id': L['id'], 'expected': text[L['id']], 'heard': f"L{in_mix}: {text.get(in_mix, '—')}", 'stem': f"L{in_stem}", 'ok': in_stem == L['id'], 'mixOk': in_mix == L['id']})
print(json.dumps(rows, ensure_ascii=False))
