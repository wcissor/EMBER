"""Beat timing for every line in both languages -> src/timeline.json.

A beat is one voice line plus its pictures. The picture cut lands LEAD s before the first word
(hooks start almost at once), and each beat ends GAP s after its last word, so lines are 0.24 s apart.
B8 (the question) holds HOLD s after the last word. TAIL frames of the hook's first shot end each
variant, so the last frame runs straight into the first when the reel loops.
"""
import json, math, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from lines import ORDER, VARIANTS
ROOT = pathlib.Path(__file__).resolve().parents[1]
FPS = 30
LEAD, LEAD_HOOK, GAP, HOLD, TAIL = 0.18, 0.05, 0.06, 1.0, 0  # TAIL 0: the reel ends on the end card, not a loop
END_FRAMES = 54  # the RUTA end card, 1.8 s
out = {'fps': FPS, 'tail': TAIL, 'variants': VARIANTS, 'lines': {}}
for lang in ('en', 'az'):
    meta = json.load(open(ROOT / f'vo/lines/{lang}/lines.json'))
    out['lines'][lang] = {}
    for lid in ORDER:
        m = meta['lines'][lid]
        lead = LEAD_HOOK if lid.startswith('H') else LEAD
        offset = lead - m['speech_on']            # where the line's wav starts inside the beat (s)
        end = lead + (m['speech_off'] - m['speech_on']) + (HOLD if lid == 'B8' else GAP)
        frames = math.ceil(end * FPS - 1e-6)
        words = [{'text': w['text'], 'start': round(w['start'] + offset, 3), 'end': round(w['end'] + offset, 3)} for w in m['words']]
        out['lines'][lang][lid] = {'frames': frames, 'audioOffset': round(offset, 3), 'audioFile': m['file'],
                                   'speechStart': lead, 'speechEnd': round(lead + m['speech_off'] - m['speech_on'], 3), 'words': words}
    out['lines'][lang]['END'] = {'frames': END_FRAMES, 'audioOffset': 0, 'audioFile': None, 'speechStart': 0, 'speechEnd': 0, 'words': []}
    for v, seq in VARIANTS.items():
        total = sum(out['lines'][lang][l]['frames'] for l in seq) + TAIL
        print(lang, v, f'{total} frames = {total / FPS:.2f} s')
(ROOT / 'src').mkdir(exist_ok=True)
json.dump(out, open(ROOT / 'src/timeline.json', 'w'), indent=1, ensure_ascii=False)
