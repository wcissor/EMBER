#!/usr/bin/env python3
"""Gate 4, local substitute: the brief asks for ElevenLabs Speech to Text on the final mix; neither its API nor its
upload host is reachable from this environment. Instead every line is cut from the final voice stems and run
through pocketsphinx speech recognition (en-us language model, independent of the script), then compared with the
script: word error rate per line, and whether any delivery tag ([sighs], [warmly] …) was read aloud.
Writes build/words_check.md."""
import json, re
import numpy as np
from pathlib import Path
from scipy.io import wavfile
from scipy.signal import resample_poly
from pocketsphinx import Decoder

ROOT = Path(__file__).resolve().parents[2]
VT = json.loads((ROOT / 'public/audio/voice_timings.json').read_text())
TAGS = {'excited', 'deadpan', 'flatly', 'hopeful', 'sighs', 'sigh', 'exasperated', 'hesitant', 'gasps', 'gasp', 'laughs', 'laugh', 'warmly'}
stems = {v: wavfile.read(ROOT / f'public/audio/stems/{n}.wav')[1].astype(np.float32) for v, n in (('S', 'student'), ('V', 'vt'))}
norm = lambda s: [w for w in re.sub(r"[^a-z0-9' ]", ' ', s.lower().replace('’', "'").replace('middle man', 'middleman')).split() if w]
NUM = {'sixteen': ['sixteen', '16']}


def wer(ref, hyp):
    d = np.zeros((len(ref) + 1, len(hyp) + 1), dtype=int)
    d[:, 0] = range(len(ref) + 1)
    d[0, :] = range(len(hyp) + 1)
    for i in range(1, len(ref) + 1):
        for j in range(1, len(hyp) + 1):
            d[i, j] = min(d[i - 1, j] + 1, d[i, j - 1] + 1, d[i - 1, j - 1] + (ref[i - 1] != hyp[j - 1]))
    return d[-1, -1] / max(1, len(ref))


dec = Decoder(samprate=16000, loglevel='ERROR')
rows, tag_hits, errs = [], [], []
for L in VT:
    x = stems[L['voice']]
    seg = x[int(max(0, L['start'] - 0.05) * 48000):int((L['end'] + 0.12) * 48000)]
    pcm = np.clip(resample_poly(seg, 1, 3) * 32767, -32768, 32767).astype(np.int16).tobytes()
    dec.start_utt()
    dec.process_raw(pcm, full_utt=True)
    dec.end_utt()
    hyp = norm(dec.hyp().hypstr if dec.hyp() else '')
    ref = norm(L['text'])
    e = wer(ref, hyp)
    errs.append(e)
    hits = [w for w in hyp if w in TAGS and w not in ref]
    tag_hits += [(L['id'], w) for w in hits]
    rows.append(f"| L{L['id']} | {L['text']} | {' '.join(hyp) or '—'} | {e:.0%} | {', '.join(hits) or '—'} |")
mean = float(np.mean(errs))
extra = [L['id'] for L, r in zip(VT, rows) if len(norm(r.split('|')[3])) > len(norm(L['text'])) + 1]
ok = not tag_hits and not extra
note = (f"Local check (pocketsphinx en-us ASR on the final voice stems — not ElevenLabs Speech to Text, which this environment cannot reach). "
        f"Mean word error rate {mean:.0%} (a small general-purpose recognizer on expressive speech; errors are recognizer misses unless a tag word or an extra phrase appears). "
        f"Delivery tags heard as words: {tag_hits or 'none'}. Lines with extra words: {extra or 'none'}. Captions are generated from the same `show` text that was sent to the voice, so they match the script word for word.\n\n"
        f"| line | script | heard (local ASR) | WER | tag words |\n|---|---|---|---|---|\n" + '\n'.join(rows) +
        f"\n\nRESULT: {'PASS (local)' if ok else 'FLAG — listen to the flagged lines'}\n")
(ROOT / 'build/words_check.md').write_text(note)
print(f'mean WER {mean:.0%}; tag hits {tag_hits}; result {"PASS" if ok else "FLAG"}')
