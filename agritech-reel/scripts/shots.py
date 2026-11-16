"""Shots per line, from the same cut rules as src/scenes.tsx (word anchors, snapped to frames).
CLIPS names what each shot shows; python3 scripts/shots.py prints every shot length (* = over 2.5 s)."""
import json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parents[1]
TL = json.loads((ROOT / 'src/timeline.json').read_text())
FPS = TL['fps']
src = (ROOT / 'src/config.ts').read_text()
blk = src[src.index('export const ANCHORS'):]
blk = blk[: blk.index('\n};') + 3]
ANCH = {}
for lang in ('en', 'az'):
    part = blk[blk.index(f'  {lang}: {{'):]
    part = part[: part.index('\n  },')]
    ANCH[lang] = {lid: {k: int(v) for k, v in re.findall(r'(\w+):\s*(\d+)', body)} for lid, body in re.findall(r'^\s{4}(\w+):\s*\{([^}]*)\}', part, re.M)}


def cuts(lang, lid):
    m = TL['lines'][lang][lid]
    words, D = m['words'], m['frames'] / FPS
    A = ANCH[lang][lid]
    w = lambda i: words[min(i, len(words) - 1)]['start']
    f = lambda s: round(s * FPS) / FPS
    c = lambda k, off=0.1: f(w(A[k]) - off)
    table = {
        'H1': lambda: [c('cut1'), c('cut2')], 'H2': lambda: [c('cut1'), c('cut2')], 'H3': lambda: [c('cut1')],
        'B1': lambda: [c('cut1')], 'B1b': lambda: [c('cut1')],
        'B2': lambda: [c('spot'), c('cut1'), c('cut2'), c('cut3')], 'B3': lambda: [c('cut1', 0.12)],
        'B4': lambda: [c('cut1'), c('sound'), c('cut3')], 'B4s': lambda: [c('sound'), c('cut2')],
        'B5': lambda: [c('cut1'), c('cut2')], 'B6': lambda: [c('cut1'), c('cut2')], 'B7': lambda: [c('cut1'), c('cut2')], 'B8': lambda: [], 'END': lambda: [],
    }
    return [0.0] + table[lid]() + [D]


CLIPS = {
    'H1': ['H1-a racks', 'H1-c lettuce channels', 'H1-a racks, lights out'], 'H2': ['B2-a rows', 'B2-a punch-in', 'B2-a rows'],
    'H3': ['B4-a2 NZ herd', 'B4-a1 NZ herd'], 'B1': ['B1-a wheat', 'B1-a punch-in'], 'B1b': ['B1-b tractor from above', 'B1-a wheat at sunset'],
    'B2': ['B2-a rows', 'B2-a punch-in, detections', 'B2-b corn, crosshairs', 'B2-a rows, 10,000', 'B2-a punch-in'],
    'B3': ['B3-a spray drone', 'B3-d pilot and drone'], 'B4': ['B4-a1 NZ herd', 'B4-b cow, collar inset', 'B4-b punch-in, sound', 'B4-c herd from above, fence'],
    'B4s': ['B4-b cow, collar inset', 'B4-b punch-in, sound', 'B4-c herd from above, fence'],
    'B5': ['globe, orbit diagram', 'Sentinel-2 Kansas, capture frame', 'Sentinel-2 Kansas, punch-in'],
    'B6': ['B6-a sprinklers', 'B6-b rain cannon', 'B6-b punch-in'], 'B7': ['map zoom to Azerbaijan', 'Sentinel-2 Kura-Araz', 'Sentinel-2 Kura-Araz, punch-in'],
    'B8': ['B1-c golden field, the question'],
    'END': ['the field closes onto its horizon; RUTA logo'],
}


def shots(lang, lid):
    cs = cuts(lang, lid)
    return [(a, round(b - a, 3)) for a, b in zip(cs, cs[1:])]


if __name__ == '__main__':
    for lang in ('en', 'az'):
        for lid in TL['lines'][lang]:
            s = shots(lang, lid)
            flag = [f'{d:.2f}' + ('*' if d > 2.5 and lid != 'B8' else '') for _, d in s]
            print(lang, lid.ljust(4), ' '.join(flag))
