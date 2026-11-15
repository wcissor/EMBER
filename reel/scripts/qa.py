"""Checks for the rendered reel. Writes out/qa/checks.json and the contact sheet; report.md is written from it.

Run with:  python3 -I scripts/qa.py
"""
import json, pathlib, re, subprocess
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'out'
QA = OUT / 'qa'
QA.mkdir(parents=True, exist_ok=True)
REEL = OUT / 'ruta-aglink-reel.mp4'
NOMUSIC = OUT / 'ruta-aglink-reel-nomusic.mp4'
TL = json.loads((ROOT / 'src/timeline.json').read_text())
W, H = 1080, 1920
res = {}


def probe(path):
    j = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]))
    v = next(s for s in j['streams'] if s['codec_type'] == 'video')
    a = next(s for s in j['streams'] if s['codec_type'] == 'audio')
    data = path.read_bytes()
    moov, mdat = data.find(b'moov'), data.find(b'mdat')
    frames = int(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', str(path)]).decode().strip())
    spec = {
        'width': v['width'], 'height': v['height'], 'codec': v['codec_name'], 'profile': v.get('profile'), 'pix_fmt': v['pix_fmt'],
        'r_frame_rate': v['r_frame_rate'], 'avg_frame_rate': v['avg_frame_rate'], 'frames': frames,
        'duration': round(float(j['format']['duration']), 3),
        'audio_codec': a['codec_name'], 'sample_rate': int(a['sample_rate']), 'channels': a['channels'], 'audio_bitrate': int(a.get('bit_rate', 0)),
        'faststart': 0 <= moov < mdat,
    }
    spec['pass'] = (spec['width'] == W and spec['height'] == H and spec['codec'] == 'h264' and spec['profile'] == 'High'
                    and spec['pix_fmt'] == 'yuv420p' and spec['r_frame_rate'] == '30/1' and spec['avg_frame_rate'] == '30/1'
                    and spec['audio_codec'] == 'aac' and spec['sample_rate'] == 48000 and spec['channels'] == 2 and spec['faststart']
                    and 28 <= spec['duration'] <= 34)
    return spec


def loud(path):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    i = float(re.findall(r'I:\s+(-?[0-9.]+) LUFS', err)[-1])
    tp = float(re.findall(r'Peak:\s+(-?[0-9.inf]+) dBFS', err)[-1])
    lra = float(re.findall(r'LRA:\s+(-?[0-9.]+) LU', err)[-1])
    return {'integrated_lufs': i, 'true_peak_dbtp': tp, 'lra': lra, 'pass': abs(i + 14) <= 1 and tp <= -1.0}


for name, path in (('reel', REEL), ('reel_nomusic', NOMUSIC)):
    res[f'specs_{name}'] = probe(path)
    res[f'loudness_{name}'] = loud(path)

# Sound off: one frame per second, tiled.
n = int(float(res['specs_reel']['duration']))
cols = 8
rows = -(-n // cols)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(REEL), '-vf', f'fps=1,scale=270:480,tile={cols}x{rows}:padding=6:color=0x151612', '-frames:v', '1', str(QA / 'contact-sheet.png')], check=True)
res['contact_sheet'] = {'frames': n, 'file': 'out/qa/contact-sheet.png'}


# Comfort: flashes. Relative luminance per 270x480 block (1/16 of the frame) per frame; a flash is a
# pair of opposing changes of 10% or more within one second. WCAG allows at most 3 per second.
def rel_lum(rgb):
    c = rgb / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]


proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', str(REEL), '-vf', 'scale=270:480', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
blocks = []
while True:
    buf = proc.stdout.read(270 * 480 * 3)
    if len(buf) < 270 * 480 * 3:
        break
    f = np.frombuffer(buf, np.uint8).reshape(480, 270, 3).astype(np.float64)
    L = rel_lum(f)
    blocks.append(L.reshape(4, 120, 4, 67)[:, :, :, :].mean(axis=(1, 3)) if False else np.array([L[r * 120:(r + 1) * 120, c * 67:(c + 1) * 67].mean() for r in range(4) for c in range(4)]))
B = np.array(blocks)
dL = np.diff(B, axis=0)
big = np.abs(dL) >= 0.10
max_flash_per_sec = 0
for k in range(B.shape[1]):
    ev = np.nonzero(big[:, k])[0]
    signs = np.sign(dL[ev, k])
    for s0 in range(0, len(dL), 1):
        window = [(e, sg) for e, sg in zip(ev, signs) if s0 <= e < s0 + 30]
        transitions = sum(1 for (e1, s1), (e2, s2) in zip(window, window[1:]) if s1 != s2)
        max_flash_per_sec = max(max_flash_per_sec, (transitions + 1) // 2 if window else 0)
res['comfort'] = {
    'max_block_luminance_change_per_frame': round(float(np.abs(dL).max()), 4),
    'max_mean_luminance': round(float(B.mean(axis=1).max()), 4),
    'flashes_per_second_max': int(max_flash_per_sec),
    'pass_flashes': max_flash_per_sec <= 3,
}


# Text contrast (WCAG 2.x) of every text colour on the reel's background.
def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def contrast(a, b):
    la, lb = rel_lum(hexrgb(a)), rel_lum(hexrgb(b))
    hi, lo = max(la, lb), min(la, lb)
    return round(float((hi + 0.05) / (lo + 0.05)), 2)


theme = (ROOT / 'src/theme.ts').read_text()
cols_ = dict(re.findall(r"(\w+): '(#[0-9A-Fa-f]{6})'", theme))
bg = cols_['black']
res['contrast'] = {k: contrast(cols_[k], bg) for k in ('text', 'olive', 'grey')}
res['contrast']['logo_cream'] = contrast('#F0ECE3', bg)
res['contrast']['logo_sage'] = contrast('#AEB78E', bg)
res['contrast']['pass'] = all(v >= 4.5 for k, v in res['contrast'].items() if k != 'pass')

# Safe box (from the text-only render made earlier).
sb = QA / 'safebox.json'
if sb.exists():
    res['safe_box'] = json.loads(sb.read_text())
    res['safe_box']['pass'] = res['safe_box']['count_outside'] == 0

# Voice: transcript vs script, word by word; pace.
script = ' '.join(l.strip() for l in [
    'Out in the field, sensor data goes missing.', 'Distance, crops, weather. The signal fades, and readings never arrive.',
    'AgLink is a smart field modem, made by RUTA.', 'Two antennas listen at once, and it takes the stronger signal.',
    'An AI model on the device predicts packet loss before it happens, so it can adapt in time.',
    'No cloud round trip. The data gets through.', 'AgLink. By RUTA.'])
norm = lambda s: [re.sub(r'[^a-z0-9]', '', w.lower()) for w in s.split()]
tr = json.loads((ROOT / 'vo/take-a.transcript.json').read_text())
sw, tw = norm(script), norm(' '.join(w[0] for w in tr['words']))
diffs = [(i, a, b) for i, (a, b) in enumerate(zip(sw, tw)) if a != b]
span = TL['voEnd'] - TL['lineStarts'][0]
res['voice'] = {
    'script_words': len(sw), 'transcript_words': len(tw), 'differences': diffs + ([('length', len(sw), len(tw))] if len(sw) != len(tw) else []),
    'speech_span_s': round(span, 2), 'wpm': round(len(sw) / span * 60, 1), 'pass': not diffs and len(sw) == len(tw) and 130 <= len(sw) / span * 60 <= 155,
}

(QA / 'checks.json').write_text(json.dumps(res, indent=1))
print(json.dumps(res, indent=1))
