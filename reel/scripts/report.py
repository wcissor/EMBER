"""Write out/qa/report.md from out/qa/checks.json, audio/audio_report.json and the stills."""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
QA = ROOT / 'out/qa'
c = json.loads((QA / 'checks.json').read_text())
a = json.loads((ROOT / 'audio/audio_report.json').read_text())
tl = json.loads((ROOT / 'src/timeline.json').read_text())
ok = lambda b: 'PASS' if b else 'FAIL'

STILLS = [
    ('S1 Hook', 'stills/s1.jpg', 'Crop rows, the sensor, its pulse, and the packet flickering halfway up its route; the solid olive trail stops and the dotted route continues without it.'),
    ('S2 Problem', 'stills/s2.jpg', 'DISTANCE (path stretched), CROPS (rows cut the path), WEATHER (rain); the received strip has gaps.'),
    ('S3 Reveal', 'stills/s3.jpg', 'AgLink drawn in front elevation (enclosure, two antennas, chip as a hidden line, pole), the name, "by" and the RUTA logo.'),
    ('S4 Diversity', 'stills/s4.jpg', 'RX A has faded to a flat line; the selector is moving to RX B; the output keeps streaming.'),
    ('S5 Edge AI', 'stills/s5.jpg', 'Signal now (solid) and forecast (dotted olive) with the predicted dip, FORECAST · LOSS, the chip lit ON-DEVICE, packets unbroken.'),
    ('S6 Result', 'stills/s6.jpg', 'Cloud outline crossed out with one hairline; the received strip fills with no gaps.'),
    ('S7 End', 'stills/s7.jpg', 'RUTA logo, AgLink, smart field modem. Holds still.'),
]
# Slop check, answered after looking at each still (yes = good).
SLOP = {
    'S1 Hook': ['yes', 'yes', 'yes (rows finishing, pulse ring, packet)', 'yes', 'yes'],
    'S2 Problem': ['yes', 'yes', 'yes (rain, strip filling, path fading)', 'yes', 'yes'],
    'S3 Reveal': ['yes', 'yes (logo R is the brand olive)', 'yes (drawing, name)', 'yes', 'yes'],
    'S4 Diversity': ['yes', 'yes', 'yes (wave B, selector, output packets)', 'yes', 'yes'],
    'S5 Edge AI': ['yes', 'yes', 'yes (time axis scrolling, packets, chip lighting)', 'yes', 'yes'],
    'S6 Result': ['yes', 'yes', 'yes (one at a time: cloud, strike, strip)', 'yes', 'yes'],
    'S7 End': ['yes', 'yes', 'yes (nothing after 1 s)', 'yes', 'yes'],
}

sp, sn = c['specs_reel'], c['specs_reel_nomusic']
lr, ln = c['loudness_reel'], c['loudness_reel_nomusic']
v = c['voice']
sb = c.get('safe_box', {})
cm = c['comfort']
ct = c['contrast']

lines = [
    '# RUTA AgLink reel: QA report',
    '',
    f"Length {sp['duration']} s ({sp['frames']} frames at 30 fps). Voice: ElevenLabs \"Andy Freeman - Neutral Sci-Fi Narration\", model eleven_v4, take A of 2.",
    '',
    '## Summary',
    '',
    '| Check | Result |',
    '|---|---|',
    f"| 1. Stills, one per scene, safe box drawn | done, see below |",
    f"| 2. Slop check | {'all yes' if all(x.startswith('yes') for r in SLOP.values() for x in r) else 'see table'} |",
    f"| 3. Facts | every claim traced to the brief or the RUTA website; open points listed |",
    f"| 4. Voice | {ok(v['pass'])}: transcript matches the script word for word, {v['wpm']} wpm |",
    f"| 5. Safe box | {ok(sb.get('pass', False))}: all text ink inside x {sb.get('ink_bbox', ['?'])[0]}-{sb.get('ink_bbox', ['?', '?', '?'])[2]}, y {sb.get('ink_bbox', ['?', '?'])[1]}-{sb.get('ink_bbox', ['?', '?', '?', '?'])[3]} in all {sb.get('frames', '?')} frames |",
    f"| 6. Specs (ffprobe) | {ok(sp['pass'] and sn['pass'])} |",
    f"| 7. Loudness | {ok(lr['pass'] and ln['pass'])}: {lr['integrated_lufs']} LUFS / {lr['true_peak_dbtp']} dBTP (with music), {ln['integrated_lufs']} LUFS / {ln['true_peak_dbtp']} dBTP (without) |",
    f"| 8. Sound off | contact sheet, one frame per second: `contact-sheet.png` |",
    f"| 9. Comfort | {ok(cm['pass_flashes'] and ct['pass'])}: no flashes, lowest text contrast {min(v2 for k2, v2 in ct.items() if k2 != 'pass')}:1 |",
    '',
    '## 1. Stills',
    '',
    'Each still is the busiest moment of its scene, with the safe box (x 65-1015, y 269-1248) and the 6-column grid drawn in magenta.',
    '',
]
for name, path, what in STILLS:
    lines += [f'- **{name}** `{path}`: {what}']
lines += [
    '',
    '## 2. Slop check',
    '',
    '| Scene | Explains something true? | One accent colour? | Three or fewer moving? | No measurement-like number? | Would Teenage Engineering sign it? |',
    '|---|---|---|---|---|---|',
]
for name, r in SLOP.items():
    lines.append(f"| {name} | {' | '.join(r)} |")
lines += [
    '',
    'Fixed during the stills pass: labels crossed by crop rows (S2), the FORECAST · LOSS label crossing the NOW line (S5), packets bunching where the output stream loops (S4, S5), pairs of rain drops (S2).',
    '',
    '## 3. Facts',
    '',
    '| Claim on screen or in the voice | Source |',
    '|---|---|',
    '| Sensor data goes missing; distance, crops and weather weaken the signal | General radio behaviour, as framed in the brief. No figures shown. |',
    '| AgLink is a smart field modem, made by RUTA | The brief |',
    '| Two antennas | RUTA website: "Two antennas. A compact body." |',
    '| It takes the stronger signal (diversity reception) | The brief. **Not confirmed:** selection versus combining. |',
    '| An AI model on the device predicts packet loss | The brief. **Not confirmed:** whether it runs on the prototype today. The website only says "a demonstration of signal-change analysis" exists. |',
    '| "so it can adapt in time"; no specific action shown | The brief keeps this general until RUTA says what AgLink does (switch antenna, resend, change timing). |',
    '| Device drawing: enclosure, two antennas, pole mount | RUTA website (pole-mounted concept). Drawn as a diagram, not a product render; the solar panel is left out. |',
    '| No numbers, results, customers, partners or awards | None appear anywhere in the reel. |',
    '',
    '## 4. Voice',
    '',
    f"- Script {v['script_words']} words, transcript {v['transcript_words']} words, differences: {v['differences'] or 'none'}.",
    f"- Pace: {v['script_words']} words over {v['speech_span_s']} s of voice = {v['wpm']} words a minute (target 130-155).",
    '- Pronunciation: the voice was sent "Ruta" (not "RUTA", which v4 reads as emphasis) and "AgLink" as written; Scribe returned "Ruta" and "AgLink".',
    '  Caveat: the transcription ran on the generation node, and it reproduced the script\'s line breaks, so ElevenLabs probably used the script as a hint.',
    '  It confirms timing more than pronunciation. Nobody has listened to the take yet: RUTA should confirm ROO-tah and AG-link by ear.',
    f"- The take was re-spaced only between lines (+{round(sum([0.0, 0.10, 0.25, 0.10, 0.20, 0.15, 0.35]), 2)} s in total) so each cut lands 0.2 s before its line; no word was edited.",
    '',
    '## 5. Safe box',
    '',
    f"A text-only render (captions, labels, display type, logo; drawings off) was scanned frame by frame: {sb.get('count_outside', '?')} frames had any text pixel outside the safe box.",
    '',
    '## 6. Specs',
    '',
    '| | with music | without music |',
    '|---|---|---|',
]
for k in ('width', 'height', 'codec', 'profile', 'pix_fmt', 'r_frame_rate', 'avg_frame_rate', 'frames', 'duration', 'audio_codec', 'sample_rate', 'channels', 'audio_bitrate', 'faststart'):
    lines.append(f'| {k} | {sp[k]} | {sn[k]} |')
lines += [
    '',
    '## 7. Loudness',
    '',
    f"- With music: {lr['integrated_lufs']} LUFS integrated, {lr['true_peak_dbtp']} dBTP true peak, LRA {lr['lra']} LU.",
    f"- Without music: {ln['integrated_lufs']} LUFS integrated, {ln['true_peak_dbtp']} dBTP true peak, LRA {ln['lra']} LU.",
    '- Chain: 4x-oversampled peak limiter at -4.5 dBFS, then two-pass loudnorm (I -14, TP -1.5). The second pass used loudnorm\'s dynamic mode for the last part of the gain.',
    '- Levels: voice stem -16 LUFS; music 18 dB under the voice while it speaks and 10 dB under in the gaps; effects in between.',
    '',
    '## 8. Sound off',
    '',
    '`contact-sheet.png` shows one frame per second. The captions carry the words, and the drawings show the problem (packet lost, gaps), the device, the two antennas, the forecast and the unbroken stream.',
    '',
    '## 9. Comfort',
    '',
    f"- Largest luminance change between frames in any 1/16 of the frame: {cm['max_block_luminance_change_per_frame']} (a flash needs 0.10 or more). Flashes per second: {cm['flashes_per_second_max']}.",
    f"- Text contrast on #151612: text {ct['text']}:1, olive {ct['olive']}:1, grey labels {ct['grey']}:1, logo cream {ct['logo_cream']}:1, logo sage {ct['logo_sage']}:1.",
    '',
    '## Sound effects used',
    '',
    '| Sound | ElevenLabs file | At (s) | Length (s) |',
    '|---|---|---|---|',
]
for q in a['cues']:
    lines.append(f"| {q['sound']} | `{q['file']}` | {q['at']} | {q['length']} |")
lines += [
    '',
    'I cannot listen to audio, so each effect was chosen from two takes by measurement: length, envelope and pitch. RUTA should play the reel once with sound before posting.',
    '',
    '## Music',
    '',
    'The connected ElevenLabs connector has no music generation, so the bed is a placeholder made in code (`audio/build_audio.py`):',
    'a soft 96 BPM bass pulse (A, A, F, G), sparse off-beat clock ticks, no drums, ending on a held A-minor chord under the end card.',
    'To use ElevenLabs Music instead, add the full ElevenLabs connector and check that the plan allows business use.',
    '',
    '## Credits',
    '',
    '- Opening photo: Jack Stapleton on Unsplash (Unsplash License).',
    '- Fonts: Geist and Geist Mono (SIL Open Font License 1.1).',
    '',
]
(QA / 'report.md').write_text('\n'.join(lines))
print('\n'.join(lines))
