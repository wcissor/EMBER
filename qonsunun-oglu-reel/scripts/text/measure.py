# Measures on-screen strings with the real font files (advance widths + kerning-free), for layout and QA.
# Usage: python3 scripts/text/measure.py  -> writes build/text-metrics.json
import json, sys, io, os
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONTS = {
    'barlow800': ['public/fonts/barlow-condensed-800-latin.woff2', 'public/fonts/barlow-condensed-800-latin-ext.woff2'],
    'interTight800': ['public/fonts/inter-tight-800-latin.woff2', 'public/fonts/inter-tight-800-latin-ext.woff2'],
    'inter': ['public/fonts/inter-var-latin.woff2', 'public/fonts/inter-var-latin-ext.woff2'],
}

def load(paths):
    fonts = []
    for p in paths:
        f = TTFont(os.path.join(ROOT, p))
        fonts.append(f)
    return fonts

def instance(f, wght):
    if 'fvar' not in f:
        return f
    from fontTools.varLib.instancer import instantiateVariableFont
    return instantiateVariableFont(f, {'wght': wght}, inplace=False)

_cache = {}
def faces(key, wght=None):
    k = (key, wght)
    if k in _cache:
        return _cache[k]
    fs = load(FONTS[key])
    if wght is not None:
        fs = [instance(f, wght) for f in fs]
    _cache[k] = fs
    return fs

def width(text, key, size, wght=None, tracking_em=0.0):
    fs = faces(key, wght)
    total = 0.0
    missing = []
    for ch in text:
        cp = ord(ch)
        for f in fs:
            cmap = f.getBestCmap()
            if cp in cmap:
                g = cmap[cp]
                adv = f['hmtx'][g][0]
                total += adv / f['head'].unitsPerEm
                break
        else:
            missing.append(ch)
    n = len(text)
    return size * (total + tracking_em * n), missing

if __name__ == '__main__':
    spec = json.loads(sys.stdin.read())
    out = []
    for item in spec:
        w, miss = width(item['text'], item['font'], item['size'], item.get('wght'), item.get('tracking', 0.0))
        out.append({**item, 'width': round(w, 1), 'missing': miss})
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
