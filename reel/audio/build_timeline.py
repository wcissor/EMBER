"""Build the master timeline from the chosen VO take.

Reads vo/take-a.transcript.json (ElevenLabs Scribe word timings) and the take's own
silences, re-spaces the seven lines a little, snaps every scene cut to a frame
0.2 s before its voice line, and writes:
  src/timeline.json   frames, scene starts, word times, visual/SFX event times
  audio/vo_plan.json  where each slice of the take goes in the final timeline
"""
import json, subprocess, re, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
FPS = 30
LEAD = 0.2           # each scene starts 0.2 s before its voice line
HOLD = 1.6           # end card holds at least 1.5 s after the voice ends
TAKE = ROOT / 'vo/takes/take-a.mp3'
tr = json.loads((ROOT / 'vo/take-a.transcript.json').read_text())
words = [{'text': w[0], 'start': w[1], 'end': w[2]} for w in tr['words']]
counts = [len(line.split()) for line in tr['text'].split('\n')]
assert sum(counts) == len(words) == 67, counts
lines, i = [], 0
for n in counts:
    lines.append(list(range(i, i + n))); i += n

# Real speech gaps between lines, from the take itself (Scribe word ends include some tail).
out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(TAKE), '-af', 'silencedetect=n=-40dB:d=0.18', '-f', 'null', '-'], capture_output=True, text=True).stderr
sil = [(float(a), float(b)) for a, b in zip(re.findall(r'silence_start: ([0-9.]+)', out), re.findall(r'silence_end: ([0-9.]+)', out))]
take_len = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(TAKE)]).decode())
cuts, speech_end = [0.0], []
for li in range(1, len(lines)):
    prev_end, nxt_start = words[lines[li - 1][-1]]['end'], words[lines[li][0]]['start']
    gap = [s for s in sil if s[0] <= prev_end + 0.05 and s[1] >= nxt_start - 0.05]
    assert gap, f'no silence between line {li} and {li + 1}'
    cuts.append((gap[0][0] + gap[0][1]) / 2)
    speech_end.append(gap[0][0])
tail = [s for s in sil if s[0] > words[-1]['start']]
speech_end.append(tail[0][0] if tail else words[-1]['end'])
cuts.append(take_len)

# Extra silence added before each line (index = line number - 1). Small, so the pace stays 130-155 wpm.
EXTRA = [0.0, 0.10, 0.25, 0.10, 0.20, 0.15, 0.35]
line_start_take = [words[l[0]]['start'] for l in lines]
final_start, scene_frame = [], []
for li in range(len(lines)):
    if li == 0:
        t = LEAD
    else:
        t = final_start[-1] + (line_start_take[li] - line_start_take[li - 1]) + EXTRA[li]
    f = round((t - LEAD) * FPS)
    scene_frame.append(f)
    final_start.append(f / FPS + LEAD)
offset = [final_start[li] - line_start_take[li] for li in range(len(lines))]
for li in range(1, len(lines)):
    assert offset[li] >= offset[li - 1] - 1e-9, 'slices would overlap'

vo_end = speech_end[-1] + offset[-1]
duration_frames = round((vo_end + HOLD) * FPS + 0.5)
plan = [{'line': li + 1, 'take_from': cuts[li], 'take_to': cuts[li + 1], 'place_at': cuts[li] + offset[li]} for li in range(len(lines))]

def W(li, k):  # word k (0-based) of line li (1-based), in final time
    idx = lines[li - 1][k]
    return {'start': round(words[idx]['start'] + offset[li - 1], 3), 'end': round(words[idx]['end'] + offset[li - 1], 3)}

S = [f / FPS for f in scene_frame]
ev = {
    's1_pulse1': S[0] + 0.30, 's1_pulse2': S[0] + 1.30, 's1_launch': S[0] + 0.45, 's1_flicker': S[0] + 1.29, 's1_vanish': S[0] + 1.55, 's1_photo_out': 1.5,
    's2_distance': W(2, 0)['start'], 's2_crops': W(2, 1)['start'], 's2_weather': W(2, 2)['start'], 's2_strip': W(2, 3)['start'], 's2_strip_end': W(2, 9)['end'],
    's3_draw': S[2] + 0.25, 's3_name': W(3, 0)['start'], 's3_by': W(3, 6)['start'],
    's4_fadeA': W(4, 5)['start'], 's4_switch': W(4, 9)['start'],
    's5_dip': W(5, 6)['start'], 's5_label': W(5, 7)['start'], 's5_chip': W(5, 9)['start'], 's5_adapt': W(5, 15)['start'],
    's6_strike': W(6, 3)['start'], 's6_fill': W(6, 4)['start'], 's6_fill_end': W(6, 7)['end'],
    's7_card': S[6] + 0.20,
}
ev['s4_lock'] = ev['s4_switch'] + 0.6
# S5: the forecast dip reaches "now" just after "adapt in time".
ev['s5_pass'] = W(5, 17)['start'] + 0.10
ev = {k: round(v, 3) for k, v in ev.items()}

timeline = {
    'fps': FPS, 'durationInFrames': duration_frames, 'durationSec': round(duration_frames / FPS, 3),
    'sceneStarts': scene_frame, 'lineStarts': [round(t, 3) for t in final_start],
    'voEnd': round(vo_end, 3),
    'words': [{'text': words[idx]['text'], 'start': round(words[idx]['start'] + offset[li], 3), 'end': round(words[idx]['end'] + offset[li], 3), 'line': li + 1}
              for li in range(len(lines)) for idx in lines[li]],
    'events': ev,
}
(ROOT / 'src/timeline.json').write_text(json.dumps(timeline, indent=1))
(ROOT / 'audio/vo_plan.json').write_text(json.dumps({'take': str(TAKE.relative_to(ROOT)), 'slices': plan}, indent=1))
span = vo_end - final_start[0]
print('scene frames', scene_frame)
print('line starts', [round(t, 2) for t in final_start])
print('vo span %.2fs, pace %.1f wpm, duration %d frames = %.2fs, hold after VO %.2fs' % (span, 67 / span * 60, duration_frames, duration_frames / FPS, duration_frames / FPS - vo_end))
print(json.dumps(ev))
