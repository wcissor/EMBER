#!/usr/bin/env python3
"""Local forced alignment of the supplied takes against the script (no network, no credits).
The brief's route for audio without timings is ElevenLabs Forced Alignment when an API key is set, otherwise
silences + syllable counts. Neither the API nor the upload host is reachable here, so this uses pocketsphinx's
bundled US-English acoustic model in forced-alignment mode (word boundaries ~10 ms), with the script as the text.
Writes voice_src/alignment.json in the format the placement solver reads."""
import json, re, subprocess, sys
import numpy as np
from pathlib import Path
from pocketsphinx import Decoder, get_model_path

ROOT = Path(__file__).resolve().parents[2]
CFG = json.loads((ROOT / 'build/config.json').read_text())
SR = 16000
PERFORMED = {'sighs', 'gasps', 'laughs'}
EXTRA = {  # pronunciations missing from CMUdict
    'voluntrack': 'V AA L AH N T R AE K',
    "dm'd": 'D IY EH M D',
    "one's": 'W AH N Z',
    "organizer's": 'AO R G AH N AY Z ER Z',
    'middleman': 'M IH D AH L M AE N',
}


def decode(path, sr):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'], check=True, capture_output=True).stdout
    return raw


def norm(w):
    return re.sub(r"[^a-z0-9']", '', w.lower().replace('’', "'"))


def load_dict():
    d = set()
    with open(Path(get_model_path()) / 'en-us' / 'cmudict-en-us.dict') as f:
        for line in f:
            d.add(line.split(' ', 1)[0])
    return d


def align(path, words):
    raw = decode(path, SR)
    dec = Decoder(samprate=SR, hmm=str(Path(get_model_path()) / 'en-us' / 'en-us'), dict=str(Path(get_model_path()) / 'en-us' / 'cmudict-en-us.dict'), lm=None, loglevel='ERROR')
    known = load_dict()
    for w in set(words):
        if w not in known:
            if w not in EXTRA:
                sys.exit(f'no pronunciation for {w!r}')
            dec.add_word(w, EXTRA[w], True)
    dec.set_align_text(' '.join(words))
    dec.start_utt()
    dec.process_raw(raw, full_utt=True)
    dec.end_utt()
    segs = [(s.word, s.start_frame / 100, (s.end_frame + 1) / 100) for s in dec.seg() if s.word not in ('<s>', '</s>', '<sil>', '(NULL)') and not s.word.startswith('+')]
    clean = [(re.sub(r'\(\d+\)$', '', w), a, b) for w, a, b in segs]
    if [w for w, _, _ in clean] != words:
        sys.exit(f'alignment word mismatch in {path.name}: got {[w for w, _, _ in clean][:12]}…')
    return clean, len(raw) / 2 / SR


def energy_onset(path, t0, t1):
    """start of the performed sound: the end of the first pause (>= 80 ms below -30 dB re. take RMS) after t0, before t1."""
    x = np.frombuffer(decode(path, SR), dtype=np.int16).astype(np.float32) / 32768
    w = int(0.01 * SR)
    seg = x[int(t0 * SR):int(t1 * SR)]
    if len(seg) < w * 10:
        return None
    fr = 20 * np.log10(np.array([np.sqrt(np.mean(seg[i:i + w] ** 2)) for i in range(0, len(seg) - w, w)]) + 1e-9)
    thr = 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9) - 30
    quiet = fr < thr
    run = 0
    for i, q in enumerate(quiet):
        run = run + 1 if q else 0
        if run >= 8:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            return t0 + j * 0.01 if j < len(quiet) else None
    return None


def refine_onsets(path, toks):
    """Forced alignment can hand the leading silence to the first word after a pause; move such word starts to the
    energy onset (first 10 ms frame within 300 ms above the phrase peak -32 dB)."""
    x = np.frombuffer(decode(path, SR), dtype=np.int16).astype(np.float32) / 32768
    w = int(0.01 * SR)
    prev_end = -1.0
    for t in toks:
        if t['text'].startswith('[') or not re.search(r'\w', t['text']):
            prev_end = max(prev_end, t['end'])
            continue
        if t['start'] - prev_end >= 0.08 or prev_end < 0:
            a = int(t['start'] * SR)
            span = x[a:int(min(t['end'], t['start'] + 0.3) * SR)]
            look = x[a:int((t['start'] + 0.6) * SR)]
            if len(span) > w and len(look) > w:
                peak = 20 * np.log10(np.max(np.abs(look)) + 1e-9)
                fr = 20 * np.log10(np.array([np.sqrt(np.mean(span[i:i + w] ** 2)) for i in range(0, len(span) - w, w // 2)]) + 1e-9)
                idx = np.where(fr > peak - 32)[0]
                if len(idx):
                    t['start'] = round(t['start'] + idx[0] * 0.005, 3)
        prev_end = t['end']
    return toks


def main():
    out = {'accurate_ends': True, 'source': 'Takes supplied by the user (ElevenLabs downloads). Word timings: local forced alignment (pocketsphinx en-us) against the script text.', 'takes': {}}
    files = {'student': ROOT / 'voice_src/takes/student.mp3', 'vt': ROOT / 'voice_src/takes/vt.mp3'}
    for take, voice in (('student', 'S'), ('vt', 'V')):
        lines = [l for l in CFG['LINES'] if l['voice'] == voice]
        cap = [[w for w in ' '.join(l['caption']).split()] for l in lines]
        words = [norm(w) for ws in cap for w in ws if re.search(r'\w', w)]
        segs, dur = align(files[take], words)
        toks, k, prev_end = [], 0, 0.0
        for l, ws in zip(lines, cap):
            tags = [t.strip('[]') for t in re.findall(r'\[[^\]]+\]', l['show'])]
            first = segs[k][1]
            for t in tags:
                if t in PERFORMED:
                    on = energy_onset(files[take], prev_end, first)
                    if on is not None and first - on > 0.12:
                        toks.append({'text': f'[{t}]', 'start': round(on, 3), 'end': round(first - 0.02, 3)})
            for w in ws:
                if not re.search(r'\w', w):  # the dash: zero-length marker after the previous word
                    toks.append({'text': w, 'start': toks[-1]['end'], 'end': toks[-1]['end']})
                    continue
                _, a, b = segs[k]
                toks.append({'text': w, 'start': round(a, 3), 'end': round(b, 3)})
                prev_end = b
                k += 1
        toks = refine_onsets(files[take], toks)
        out['takes'][take] = {'file': f'voice_src/takes/{take}.mp3', 'duration': round(dur, 3), 'aligned_generation': files[take].name, 'words': toks}
        perf = [t for t in toks if t['text'].startswith('[')]
        print(f"{take}: {len(toks)} tokens, {dur:.2f}s, performed sounds: {[(t['text'], t['start'], t['end']) for t in perf]}")
    meta = {
        'student': {'voice': 'Laura (library voice, per file name)', 'stability': 0.0, 'file_name': '09c53ccd-ElevenLabs_2026-11-04T10_32_50_Laura_-_a_top_narration_voice_pvc_s0_sim75_v4.mp3'},
        'vt': {'voice': 'Will - Conversational Narrator (library voice, per file name)', 'stability': 0.0, 'file_name': '8e666d63-ElevenLabs_2026-11-04T10_35_11_Will_-_Conversational_Narrator_pvc_s0_sim75_v4.mp3'},
    }
    for k2, v in meta.items():
        out['takes'][k2].update(v)
    old = ROOT / 'voice_src/alignment.json'
    keep = ROOT / 'voice_src/alignment_flow_takes.json'
    if old.exists() and not keep.exists():
        old.replace(keep)
    (ROOT / 'voice_src/alignment.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
