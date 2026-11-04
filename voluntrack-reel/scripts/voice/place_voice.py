#!/usr/bin/env python3
"""Place the voice lines on the film timeline (section 5, "Placing the voice").

Inputs : build/config.json (exported from src/config.ts), voice_src/alignment.json (word timings per take),
         optional voice_src/refined.json (speech boundaries measured on the audio by analyze_takes.py).
Outputs: public/audio/voice_timings.json  — spec format, film timeline, seconds
         build/placement.json             — per-line edits (segment, cuts, tempo), music grid, violations

Rules applied, in order:
  * every line starts at its target time;
  * if the previous line runs long, first the pause before this line is used up (down to the minimum gap the
    visuals need between the two lines), then this line moves later (allowed: up to 12 frames);
  * lines that push later ones are sped up, never more than 6% (pitch preserved), never cutting a word;
  * performed sounds ([sighs] [gasps] [laughs]) and pauses inside a line are capped (config PLACEMENT);
  * the music grid is locked: S5's "Apply" sits 5 bars after the entry, the logo/L22 10 bars after it.
Anything that still cannot meet the rules is listed under "violations" and reported in the QA report.
"""
import json, re, sys, math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CFG = json.loads((ROOT / 'build/config.json').read_text())
ALIGN = json.loads((ROOT / 'voice_src/alignment.json').read_text())
REFINED_PATH = ROOT / 'voice_src/refined.json'
REFINED = json.loads(REFINED_PATH.read_text()) if REFINED_PATH.exists() else None

FPS = CFG['FPS']
P = CFG['PLACEMENT']
M = CFG['MUSIC']
PERFORMED = {'[sighs]', '[gasps]', '[laughs]'}


def norm(w):
    return re.sub(r"[^\w’']+", '', w.lower())


def syllables(word):
    w = re.sub(r'[^a-z]', '', word.lower())
    if not w:
        return 0
    groups = re.findall(r'[aeiouy]+', w)
    n = len(groups)
    if w.endswith('e') and n > 1 and not w.endswith(('le', 'ee')):
        n -= 1
    return max(1, n)


def take_key(voice):
    return 'student' if voice == 'S' else 'vt'


def split_lines():
    """Map every line to its tokens in its voice's take."""
    out = {}
    for voice in ('S', 'V'):
        toks = ALIGN['takes'][take_key(voice)]['words']
        k = 0
        for L in [l for l in CFG['LINES'] if l['voice'] == voice]:
            cap_words = ' '.join(L['caption']).split()
            tags = re.findall(r'\[[^\]]+\]', L['show'])
            line_toks = []
            # leading tags
            while k < len(toks) and toks[k]['text'].startswith('['):
                if toks[k]['text'] not in tags:
                    sys.exit(f"line {L['id']}: unexpected tag {toks[k]['text']}")
                line_toks.append(dict(toks[k], kind='performed' if toks[k]['text'] in PERFORMED else 'tag'))
                k += 1
            for cw in cap_words:
                t = toks[k]
                if norm(t['text']) != norm(cw):
                    sys.exit(f"line {L['id']}: expected {cw!r}, got {t['text']!r}")
                kind = 'word' if re.search(r'\w', cw) else 'punct'
                line_toks.append(dict(t, kind=kind, caption=cw))
                k += 1
            out[L['id']] = line_toks
        if k != len(toks):
            sys.exit(f'voice {voice}: {len(toks) - k} tokens left over')
    return out


def refine(lid, toks):
    """Speech segment and per-word ends. Uses audio measurements when available, else a syllable estimate
    for the line-final word (the aligner pads it with the following pause)."""
    words = [t for t in toks if t['kind'] in ('word', 'punct')]
    perf = [t for t in toks if t['kind'] == 'performed']
    first = perf[0] if perf else words[0]
    seg_start = first['start']
    ends = {}
    for i, w in enumerate(words):
        ends[i] = w['end']
    last = words[-1]
    if ALIGN.get('accurate_ends'):
        # forced alignment on the audio: word ends are real; keep a 40 ms release after the last word
        seg_end = last['end'] + 0.02
        ends[len(words) - 1] = last['end']
        source = 'measured'
    elif REFINED and lid in REFINED.get('lines', {}):
        r = REFINED['lines'][lid]
        seg_start = r['start']
        seg_end = r['end']
        ends[len(words) - 1] = min(last['end'], seg_end)
        source = 'measured'
    else:
        est = 0.14 + 0.17 * syllables(last['text'])
        seg_end = min(last['end'], last['start'] + est)
        ends[len(words) - 1] = seg_end
        source = 'estimated'
    return seg_start, seg_end, words, perf, ends, source


def build_line_models():
    toks_by_line = split_lines()
    models = {}
    for L in CFG['LINES']:
        lid = L['id']
        toks = toks_by_line[lid]
        seg_start, seg_end, words, perf, ends, source = refine(lid, toks)
        cuts = []
        # cap performed sounds: keep the onset, trim the tail
        for p in perf:
            dur = p['end'] - p['start']
            if dur > P['nonverbalMaxSec']:
                cuts.append([p['start'] + P['nonverbalMaxSec'], p['end']])
        # cap pauses inside the line (between consecutive words)
        for i in range(1, len(words)):
            prev_end = ends[i - 1] if words[i - 1]['kind'] == 'word' else words[i - 1]['end']
            gap = words[i]['start'] - prev_end
            if gap > P['internalPauseMaxSec']:
                excess = gap - P['internalPauseMaxSec']
                mid = prev_end + gap / 2
                cuts.append([mid - excess / 2, mid + excess / 2])
        cuts.sort()
        cut_total = sum(b - a for a, b in cuts)
        models[lid] = dict(
            id=lid, voice=L['voice'], target=L['target'], show=L['show'], caption=L['caption'],
            seg=[seg_start, seg_end], cuts=cuts, raw_dur=seg_end - seg_start, edit_dur=seg_end - seg_start - cut_total,
            words=words, ends=ends, perf=perf, source=source,
        )
    return models


def tmap(m, t, tempo):
    """Take time → seconds from the line's start after cuts and tempo."""
    a = m['seg'][0]
    removed = 0.0
    for c0, c1 in m['cuts']:
        if t >= c1:
            removed += c1 - c0
        elif t > c0:
            removed += t - c0
    return (t - a - removed) / tempo


def forward(models, order, tempos, extra_delay):
    starts, ends = {}, {}
    prev = None
    for lid in order:
        m = models[lid]
        d = m['edit_dur'] / tempos[lid]
        t = m['target'][0]
        if prev is not None:
            t = max(t, ends[prev] + P['minGapBeforeSec'].get(lid, 0.1))
        t += extra_delay.get(lid, 0.0)
        starts[lid], ends[lid] = t, t + d
        prev = lid
    return starts, ends


def word_start_film(models, lid, idx, starts, tempos):
    m = models[lid]
    return starts[lid] + tmap(m, m['words'][idx]['start'], tempos[lid])


def solve():
    models = build_line_models()
    order = [l['id'] for l in sorted(CFG['LINES'], key=lambda l: l['target'][0])]
    tempos = {lid: 1.0 for lid in order}
    extra = {}
    max_shift = P['maxShiftFrames'] / FPS
    max_tempo = 1.0 + P['maxSpeedup']

    # 1) speed up the lines that push later lines past their allowed shift
    for _ in range(5000):
        starts, ends = forward(models, order, tempos, extra)
        late = [lid for lid in order if starts[lid] - models[lid]['target'][0] > max_shift + 1e-6]
        moved = False
        for lid in late:
            i = order.index(lid)
            j = i - 1
            while j >= 0:
                pj = order[j]
                if tempos[pj] < max_tempo - 1e-9:
                    tempos[pj] = min(max_tempo, tempos[pj] + 0.0025)
                    moved = True
                if starts[pj] <= models[pj]['target'][0] + 1e-6:
                    break
                j -= 1
            if moved:
                break
        if not moved:
            break

    # 1b) the film is exactly 34.0 s: if the last line leaves less than the tail, speed up the remaining lines
    for _ in range(2000):
        starts, ends = forward(models, order, tempos, extra)
        over = ends[order[-1]] + P['tailSec'] - CFG['DURATION_FRAMES'] / FPS
        if over <= 0:
            break
        cand = [lid for lid in order if tempos[lid] < max_tempo - 1e-9]
        if not cand:
            break
        # prefer the lines nearest the end (they move the fewest beats)
        tempos[cand[-1]] = min(max_tempo, tempos[cand[-1]] + 0.0025)

    # 2) the music grid follows the voice (voice lines are never moved for the music): the cue is synthesized
    #    with its bar grid anchored so the logo lands on a downbeat.
    starts, ends = forward(models, order, tempos, extra)
    entry = ends['08'] + M['entryAfterLine08Frames'] / FPS
    entry_f = math.ceil(entry * FPS)
    # if Apply/logo landed later than their bars, the music entry moves later (never the voice)
    apply_f = round(word_start_film(models, '14', 0, starts, tempos) * FPS)
    logo_f = round(starts['22'] * FPS)
    # bar grid anchored on the logo downbeat; the cue enters on the first beat after the rays (never in the silence)
    grid0 = logo_f - M['logoBar'] * M['barFrames']
    beat = M['barFrames'] // 4
    music_entry_f = grid0 + max(0, -(-(entry_f - grid0) // beat)) * beat

    # 3) results + violations
    violations = []
    lines_out, place_out = [], []
    total_f = CFG['DURATION_FRAMES']
    for lid in order:
        m = models[lid]
        s, e, tempo = starts[lid], ends[lid], tempos[lid]
        shift_f = (s - m['target'][0]) * FPS
        if shift_f > P['maxShiftFrames'] + 0.5:
            violations.append(f"L{lid} starts {shift_f:.0f} frames after its target (rule: ≤ {P['maxShiftFrames']})")
        if shift_f < -0.5:
            violations.append(f"L{lid} starts {-shift_f:.0f} frames before its target")
        words = []
        for i, w in enumerate(m['words']):
            if w['kind'] != 'word':
                continue
            ws = s + tmap(m, w['start'], tempo)
            we = s + tmap(m, m['ends'][i], tempo)
            words.append({'word': w['caption'], 'start': round(ws, 3), 'end': round(max(we, ws + 0.04), 3)})
        text = re.sub(r'\[[^\]]+\]\s*', '', m['show']).strip()
        lines_out.append({'id': lid, 'voice': m['voice'], 'text': text, 'start': round(s, 3), 'end': round(e, 3), 'words': words})
        place_out.append({
            'id': lid, 'voice': m['voice'], 'take': take_key(m['voice']),
            'generation': ALIGN['takes'][take_key(m['voice'])]['aligned_generation'],
            'segment': [round(x, 4) for x in m['seg']], 'cuts': [[round(a, 4), round(b, 4)] for a, b in m['cuts']],
            'tempo': round(tempo, 4), 'start': round(s, 4), 'end': round(e, 4),
            'target': m['target'], 'shift_frames': round(shift_f, 1), 'boundaries': m['source'],
            'speedup_pct': round((tempo - 1) * 100, 1),
        })
    tail = total_f / FPS - ends['24']
    if tail < P['tailSec'] - 1e-6:
        violations.append(f"L24 ends {ends['24']:.2f}s, leaving {tail:.2f}s (< {P['tailSec']}s hold + loop)")
    resolve_f = grid0 + M['resolveBar'] * M['barFrames']
    music = {
        'gridOrigin': grid0, 'entryFrame': music_entry_f, 'raysFrame': entry_f,
        'applyFrame': apply_f, 'applyBarFrame': grid0 + M['applyBar'] * M['barFrames'],
        'logoFrame': logo_f, 'logoBarFrame': grid0 + M['logoBar'] * M['barFrames'],
        'resolveFrame': min(resolve_f, total_f - 24),
    }
    if music_entry_f != entry_f:
        violations.append(f"music enters {music_entry_f - entry_f} frames after the rays (first beat of the grid that lands the logo on a downbeat)")
    if abs(apply_f - music['applyBarFrame']) > 2:
        violations.append(f"Apply lands {apply_f - music['applyBarFrame']:+d} frames from its bar")

    out_dir = ROOT / 'public/audio'
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / 'voice_timings.json').write_text(json.dumps(lines_out, ensure_ascii=False, indent=1))
    (ROOT / 'build/placement.json').write_text(json.dumps({'lines': place_out, 'music': music, 'violations': violations,
                                                          'boundaries': 'measured' if REFINED else 'estimated'}, ensure_ascii=False, indent=1))
    # report
    print(f"{'line':5}{'voice':6}{'target':>8}{'start':>8}{'end':>8}{'shift f':>9}{'tempo':>8}{'cuts':>6}")
    for p in place_out:
        print(f"L{p['id']:4}{p['voice']:6}{p['target'][0]:8.2f}{p['start']:8.2f}{p['end']:8.2f}{p['shift_frames']:9.1f}{p['tempo']:8.3f}{len(p['cuts']):6}")
    print('music', music)
    print('violations:' if violations else 'no violations')
    for v in violations:
        print('  -', v)


if __name__ == '__main__':
    solve()
