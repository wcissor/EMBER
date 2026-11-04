#!/usr/bin/env python3
"""Measure the real speech boundaries of every line on the take audio (replaces the syllable estimate the
placement solver uses for line-final words, whose aligned end includes the following pause).
Writes voice_src/refined.json: {lines: {id: {start, end}}}, take-relative seconds."""
import json, re, subprocess, sys
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SR = 48000
ALIGN = json.loads((ROOT / 'voice_src/alignment.json').read_text())
CFG = json.loads((ROOT / 'build/config.json').read_text())
PERFORMED = {'[sighs]', '[gasps]', '[laughs]'}


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def frames_db(x, hop=0.005, win=0.02):
    h, w = int(hop * SR), int(win * SR)
    n = max(1, (len(x) - w) // h)
    idx = np.arange(n) * h
    e = np.array([np.sqrt(np.mean(x[i:i + w] ** 2) + 1e-12) for i in idx])
    return 20 * np.log10(e + 1e-9), hop


def main():
    out = {'lines': {}}
    for take in ('student', 'vt'):
        path = ROOT / f'voice_src/takes/{take}.mp3'
        if not path.exists():
            sys.exit(f'missing {path}')
        x = decode(path)
        db, hop = frames_db(x)
        words = ALIGN['takes'][take]['words']
        voice = 'S' if take == 'student' else 'V'
        lines = [l for l in CFG['LINES'] if l['voice'] == voice]
        k = 0
        spans = []
        for L in lines:
            n_words = len(' '.join(L['caption']).split())
            toks = []
            while k < len(words) and words[k]['text'].startswith('['):
                toks.append(words[k]); k += 1
            toks += words[k:k + n_words]; k += n_words
            spans.append((L['id'], toks))
        for i, (lid, toks) in enumerate(spans):
            audible = [t for t in toks if not t['text'].startswith('[') or t['text'] in PERFORMED]
            a0 = audible[0]['start']
            last = toks[-1]
            nxt = spans[i + 1][1][0]['start'] if i + 1 < len(spans) else len(x) / SR
            # speech end: last frame above (peak - 38 dB) before the next line begins
            seg0, seg1 = int(a0 / hop), int(min(nxt - 0.03, last['end'] + 0.25) / hop)
            seg = db[seg0:seg1]
            peak = np.max(seg) if len(seg) else -90
            thr = max(peak - 38, -62)
            above = np.where(seg > thr)[0]
            end = (seg0 + above[-1]) * hop + 0.03 if len(above) else last['end']
            end = max(end, last['start'] + 0.08)
            # speech start: first frame above threshold within 120 ms before the first audible token
            s0 = int(max(0, a0 - 0.12) / hop)
            pre = db[s0:int(a0 / hop) + 4]
            ab = np.where(pre > thr)[0]
            start = (s0 + ab[0]) * hop - 0.01 if len(ab) else a0
            out['lines'][lid] = {'start': round(max(0, start), 4), 'end': round(end, 4), 'aligned_end': last['end']}
    (ROOT / 'voice_src/refined.json').write_text(json.dumps(out, indent=1))
    for lid, r in sorted(out['lines'].items()):
        print(f"L{lid}: {r['start']:.3f}–{r['end']:.3f}  (aligned end {r['aligned_end']:.3f}, trimmed {r['aligned_end'] - r['end']:+.3f}s)")


if __name__ == '__main__':
    main()
