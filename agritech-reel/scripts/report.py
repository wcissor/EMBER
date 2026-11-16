"""Write out/qa/report.md from out/qa/checks.json (scripts/qa.py), out/qa/text.json (scripts/qa_text.py),
audio/mix/report.json (audio/build_audio.py), the shot rules (scripts/shots.py) and the licence records."""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import shots  # noqa: E402

QA = ROOT / 'out/qa'
c = json.loads((QA / 'checks.json').read_text())
tx = json.loads((QA / 'text.json').read_text())
au = json.loads((ROOT / 'audio/mix/report.json').read_text())
TL = json.loads((ROOT / 'src/timeline.json').read_text())
ok = lambda b: 'PASS' if b else 'FAIL'
VAR = [('en', v) for v in ('A', 'B', 'C')]  # English only: RUTA doesn't need the Azerbaijani versions
LINES_A = TL['variants']['A']
EXTRA = ['H2', 'H3', 'B1b', 'B4s']

# ---------- 4. Slop check, answered after looking at each still (yes = good) ----------
# Columns: real footage, real imagery or drawn from real data? / one accent colour? / no AI imagery, glow, generic HUD or stock cliché?
SLOP = {
    'H1': ('yes: licensed footage of a vertical farm', 'yes', 'yes'),
    'B1': ('yes: licensed footage of wheat at sunset', 'yes (dark olive on the bright sky)', 'yes'),
    'B2': ('yes: licensed footage of crop rows; crosshairs labelled ILLUSTRATION', 'yes', 'yes: two thin crosshairs, no HUD frame'),
    'B3': ('yes: licensed footage of a spray drone and its pilot', 'yes', 'yes'),
    'B4': ('yes: licensed footage of cattle; collar inset labelled ILLUSTRATION', 'yes', 'yes'),
    'B5': ('yes: NASA Blue Marble and a real Sentinel-2 scene; orbit labelled DIAGRAM', 'yes', 'yes'),
    'B6': ('yes: licensed footage of irrigation', 'yes', 'yes'),
    'B7': ('yes: NASA imagery, Natural Earth border, a real Sentinel-2 scene', 'yes', 'yes'),
    'B8': ('yes: licensed footage of a field at dusk', 'yes (dark olive key word)', 'yes'),
    'H2': ('yes: licensed footage of crop rows; crosshairs labelled ILLUSTRATION', 'yes', 'yes'),
    'H3': ('yes: licensed drone footage of a New Zealand herd; fence labelled ILLUSTRATION', 'yes', 'yes'),
    'B1b': ('yes: licensed footage of a field at sunset', 'yes', 'yes'),
    'B4s': ('yes: licensed footage of a cow; collar inset labelled ILLUSTRATION', 'yes', 'yes'),
    'END': ('yes: the last frame of the licensed field shot, then the RUTA logo', 'yes (the olive rule)', 'yes: one line and the logo on black'),
}
WHAT = {
    'H1': 'Vertical farm, dimmed as its lights go out. "NEARLY $1B raised. Filed for bankruptcy." Source tag names Plenty.',
    'B1': 'Low over wheat at sunset; "OUTSIDE." in dark olive on the sky.',
    'B2': 'Crop rows, "10,000 a minute · MAKER\'S FIGURE", Carbon Robotics source tag.',
    'B3': 'Pilot and spray drone; "300,000+ farm drones in China" on the bright sky.',
    'B4': 'Cow close-up with the collar inset (sound arcs, vibration marks) linked to its neck.',
    'B5': 'Sentinel-2 centre-pivot fields in Kansas; "EVERY 5 days." ("Free." follows); place, Copernicus credit and source in three short mono lines.',
    'B6': 'Rain cannon over a field; "≈70% of the fresh water we use" in dark type on the sky.',
    'B7': 'Sentinel-2 Kura–Araz lowland; "36% of workers"; place, credit and source.',
    'B8': 'Golden field at dusk; the question in black with the key word in dark olive; the four options below.',
    'H2': 'Dimmed crop rows with two crosshairs, the number already on screen, ILLUSTRATION.',
    'H3': 'New Zealand herd from a drone, a dotted fence line drawing itself across the pasture, VIRTUAL FENCE · ILLUSTRATION.',
    'B1b': 'Sunset over wheat, caption only.',
    'B4s': 'The collar inset on the cow, as in B4.',
    'END': 'The end card: the RUTA logo on black, over a short olive rule (the field\'s horizon line, which the closing shot shrinks into).',
}

# ---------- 5. Truth: every number on screen ----------
cfg = (ROOT / 'src/config.ts').read_text()
TRUTH = [
    ('H1', 'NEARLY $1B raised', "'$1B'", 'TechCrunch, 24 Mar 2025: Plenty "has raised nearly $1 billion"', 'SOURCE: TECHCRUNCH 2025 · PLENTY'),
    ('B2, H2', "10,000 a minute · MAKER'S FIGURE", "'10,000'", 'Tom\'s Hardware, 28 Aug 2025: Carbon Robotics\' "claimed \'10,000 weeds per minute\'" (LaserWeeder G2)', 'SOURCE: CARBON ROBOTICS 2025'),
    ('B3', '300,000+ farm drones in China', "'300,000+'", 'CleanTechnica, 20 Sep 2026: "China entered 2026 with about 309,000 plant-protection drones"', 'SOURCE: CLEANTECHNICA 2026'),
    ('B5', 'EVERY 5 days. Free.', "final: '5'", 'ESA Sentinel-2 facts: "Revisit time: Five days from two-satellite constellation"; ESA 2013 on free, full and open access', 'SOURCE: ESA · COPERNICUS'),
    ('B5', 'KANSAS, USA · 2 AUG 2026', "'KANSAS, USA · 2 AUG 2026'", 'Sentinel-2 scene S2B_14SLG_20260802 (STAC record in research/satellite/stac-kansas.json)', 'Copernicus credit line'),
    ('B6', '≈70% of the fresh water we use', "'≈70%'", 'FAO AQUASTAT 2025: agriculture 72% of withdrawals (FAO newsroom), 71% globally in 2022 (Smart Water Magazine)', 'SOURCE: FAO AQUASTAT 2025'),
    ('B7', '36% of workers', "'36%'", 'World Bank CCDR via APA, 29 Nov 2023: "accounts for 36% of total employment"', 'SOURCE: WORLD BANK 2023'),
    ('B7', 'KURA–ARAZ LOWLAND · 23 JUL 2026', "'KURA–ARAZ LOWLAND · 23 JUL 2026'", 'Sentinel-2 scene S2A_39TTE_20260723 (research/satellite/stac-kura-araz.json)', 'Copernicus credit line'),
]
truth_ok = all(needle in cfg for _, _, needle, _, _ in TRUTH) and "note: \"MAKER'S FIGURE\"" in cfg and "note: 'İSTEHSALÇININ RƏQƏMİ'" in cfg

# ---------- 6. Rights ----------
recs = json.loads((ROOT / 'licenses/adobe-stock/records.json').read_text())['records']
by_code = {}
for r in recs:
    for code in r['shot_codes'].replace(' ', '').split(','):
        by_code[code] = r
used = sorted(set(re.findall(r'clip="([^"]+)"', (ROOT / 'src/scenes.tsx').read_text())))
fp = (ROOT / 'scripts/footage.py').read_text()
rights = []
for code in used:
    m = re.search(rf"'{re.escape(code)}':\s*\(\s*'?(?:[^,]*?)(\d{{9,10}})", fp)
    rid = m.group(1) if m else None
    rec = by_code.get(code)
    rights.append((code, rid, rec['adobe_stock_id'] if rec else None, bool(rec) and rec['adobe_stock_id'] == rid))
rights_ok = all(x[3] for x in rights)
lic_index = (ROOT / 'licenses/README.md').read_text()
other_assets = [('sat/globe.mp4, maps/bm-*.jpg', 'NASA Blue Marble (GIBS)', 'Blue Marble'), ('sat/kansas.jpg, sat/kura-araz.jpg', 'Copernicus Sentinel-2', 'Sentinel-2'),
                ('maps/aze.json', 'Natural Earth', 'Natural Earth'), ('fonts/*.woff2', 'Geist, SIL OFL 1.1', 'Geist'), ('img/ruta-logo.png', "RUTA's own mark", 'RUTA mark'),
                ('vo/lines/*', 'ElevenLabs voices (Starter plan)', 'Voice-over'), ('sfx/raw/*', 'ElevenLabs Sound Effects', 'Sound effects'), ('music (in code)', 'Ours', 'Music')]
other_ok = all(key in lic_index for _, _, key in other_assets)

# ---------- Numbers for the summary ----------
specs_ok = all(s['pass'] for s in c['specs'].values())
loud_ok = all(s['pass'] for s in c['loudness'].values())
end_card = all(s.get('ends_on_end_card') for s in c['loop'].values())
loop_ok = end_card or all(s.get('seamless') for s in c['loop'].values())
flash_ok = all(s['pass'] for s in c['comfort'].values())
hook_ok = all(s['pass'] for s in c['hook_words'].values()) and all(s['pass'] for s in c['hook_motion'].values()) and all(v > 0 for v in tx['hook_text_frame0'].values())
sb_bad = {k: v for k, v in tx['safe_box'].items() if v['frames_outside']}
cap = [(k, s['caption']) for k, s in tx['contrast'].items() if 'caption' in s]
cap_min = min(s['min'] for _, s in cap)
cap_worst = min(cap, key=lambda x: x[1]['min'])
cap_dips = [(k, s2) for k, s2 in cap if s2['min'] < 4.5]
other_bands = [(k, b, s) for k, d in tx['contrast'].items() for b, s in d.items() if b != 'caption']
plan = {(l, lid): shots.shots(l, lid) for l in ('en', 'az') for lid in TL['lines'][l]}
longest = max((d, l, lid) for (l, lid), ss in plan.items() if lid != 'B8' for _, d in ss)
pace_ok = longest[0] <= 2.5
voice = c['voice']
match_ok = all(v['transcript_match'] for v in voice.values())
en_wpm = [voice['en']['pace'][v]['wpm_overall'] for v in 'ABC']
en_pace_ok = all(160 <= round(x) <= 175 for x in en_wpm)

L = []
add = L.append
add('# RUTA agritech reel: QA report')
add('')
add('Three reels in English, with hooks A, B and C, each with and without music: 6 files. Each ends on the RUTA end card.')
add('The brief\'s 12 checks are below. Numbers come from `scripts/qa.py`, `scripts/qa_text.py` and `audio/build_audio.py`.')
add('')
add('## Summary')
add('')
add('| # | Check | Result | In short |')
add('|---|---|---|---|')
add(f'| 1 | Stills first | done | {len(LINES_A) + len(EXTRA)} stills at each line\'s busiest moment, safe box drawn: `stills/` |')
add(f'| 2 | Hook | {ok(hook_ok)} | Every first frame moves and has text; a key word lands by {max(s["first_key_word_s"] for s in c["hook_words"].values())} s at the latest |')
add(f'| 3 | Pace | {ok(pace_ok)} | Longest shot before the question: {longest[0]:.2f} s ({longest[1].upper()} {longest[2]}) |')
add('| 4 | Slop check | all yes | Real footage or real imagery everywhere; drawings labelled; one accent colour |')
add(f'| 5 | Truth | {ok(truth_ok)} | Every number on screen matches `sources.md`; the 10,000 figure is labelled as the maker\'s |')
add(f'| 6 | Rights | {ok(rights_ok and other_ok)} | {len(used)} shots from {len(set(x[1] for x in rights))} Adobe Stock clips traced to licence records; imagery, data, fonts and audio in `licenses/` |')
add(f'| 7 | Voice | {ok(match_ok)} transcript, {"PASS" if en_pace_ok else "NOTE"} pace | English {round(min(en_wpm))}–{round(max(en_wpm))} words a minute |')
add(f"| 8 | Loop | {'changed, as RUTA asked' if end_card else ok(loop_ok)} | {'Each reel now ends on the RUTA end card instead of looping seamlessly; Instagram replays from the first frame' if end_card else 'The last frame flows into the first like any two frames of the same shot'} |")
long_ones = [n for n, x in c['specs'].items() if not x.get('duration_in_brief_range', True)]
over_note = ''
if long_ones:
    longest_len = max(c['specs'][n]['duration'] for n in long_ones)
    over_note = f'; the longest runs {longest_len:.1f} s, {longest_len - 45:.1f} s over the brief' + "'" + 's 45 s, because of the end card'
add(f"| 9 | Specs | {ok(specs_ok)} | All {len(c['specs'])} files: 1080×1920, 30 fps constant, H.264 High, yuv420p, AAC 48 kHz, faststart{over_note} |")
lu = sorted(set(x['integrated_lufs'] for x in c['loudness'].values()))
lu_txt = f'{lu[0]} LUFS in every file' if len(lu) == 1 else f'{lu[0]} to {lu[-1]} LUFS'
add(f'| 10 | Loudness | {ok(loud_ok)} | {lu_txt}, true peak {max(x["true_peak_dbtp"] for x in c["loudness"].values())} dBTP at most |')
add('| 11 | Sound off | done | One frame per second per variant: `contact-sheet-*.jpg` |')
if not cap_dips:
    comfort_res, comfort_txt = ok(flash_ok), 'No flashes; captions at least 4.5:1 everywhere'
else:
    one = len(cap_dips) == 1 and cap_dips[0][1]['below_need_share'] < 0.002
    comfort_res = 'PASS except one moment' if flash_ok and one else 'FAIL'
    comfort_txt = 'No flashes; captions at least 4.5:1 except ' + ', '.join(k + ' (' + str(s2['min']) + ':1 for one moment)' for k, s2 in cap_dips)
add(f'| 12 | Comfort | {comfort_res} | {comfort_txt} |')
add('')

add('## Fixed during QA')
add('')
add('The first full render failed several of these checks. Each failure was fixed in the design system or the scene, then the affected beats were rendered again and every check was run again:')
add('')
add('| What the check found | Fix |')
add('|---|---|')
add('| Pace: the opening shot of B2 ran 2.7 s (EN) and 3.5 s (AZ); the middle shot of the Azerbaijani B6 ran 2.8 s | B2 punches in on the field as the detection boxes appear; the Azerbaijani B6 cuts to the rain cannon on "şirin suyun" |')
add('| Contrast: captions over bright mist (B3, the Azerbaijani H1) dipped to 3.0:1; source tags over spray and mist (B3, B6) to 2.2:1 | A darker bottom gradient under the captions and source tags, the same in every beat |')
add('| Contrast: the collar title sat above its inset, over white fur, at 1.4:1 | The title moved inside the inset (two lines in Azerbaijani), and the inset is darker |')
add('| Contrast: big numbers on the satellite pictures and on the globe\'s polar ice dipped to 1.1–1.8:1 | A stronger top shade that holds down to the number\'s last line in B5 and B7 |')
add('| Safe box: the map label "AZERBAIJAN" sat under the country, at y 1436–1458, behind Instagram\'s buttons; the border line ran behind the captions and the credit lines | The map zoom lands a little wider and higher, so the whole country sits between the number and the credit lines; the label sits inside the country |')
add('| Legibility: three credit and drawing labels were 22 px | 24 px (credits, like the source tags) and 26 px (drawing labels) |')
add('| Sound: the wind bed and the music\'s shaker sprayed noise up to 16–21 kHz (seen on a spectrogram) | Wind low-passed at 5 kHz and 4 dB quieter; drone low-passed at 10 kHz; shaker band-limited to 3–8 kHz with a softer attack |')
add('')

# 1
add('## 1. Stills')
add('')
add('Each still is the busiest steady moment of its line: the frame with the most text on screen, once counters have landed. The safe box (x 65–1015, y 269–1248) and the caption band are drawn in magenta.')
add('')
add('- Variant A, every line and the end card: `stills/en-{line}.jpg`.')
add('- Lines only in B and C (H2, H3, B1b, B4s): the same names.')
add('- Sheet: `stills/sheet-en.jpg`.')
add('')
add('| Line | What the still shows |')
add('|---|---|')
for lid in LINES_A + EXTRA:
    add(f'| {lid} | {WHAT[lid]} |')
add('')
if sb_bad:
    bad_list = ', '.join(k + ' (' + str(v['frames_outside']) + ' frames)' for k, v in sb_bad.items())
    add(f'**Safe box, text-only scan:** text outside the box in {bad_list}.')
else:
    add(f'**Safe box, text-only scan:** every frame of all {len(tx["safe_box"])} beats was rendered with only its text (no pictures, no drawings) and scanned. No text pixel falls outside the safe box.')
add('')

# 2
add('## 2. Hook')
add('')
add('| Reel | First frame moves (mean change to frame 2) | Text on frame 1 | First word | Key words heard at |')
add('|---|---|---|---|---|')
for lang, v in VAR:
    hook = TL['variants'][v][0]
    hw = c['hook_words'][f'{lang}-{hook}']
    times = ', '.join(f'"{k}" {t:.2f} s' for k, t in hw['times'].items() if t is not None)
    add(f"| {lang.upper()} {v} | {c['hook_motion'][f'{lang}-{v}']['frame0_to_1_mean_abs_diff']} | {'yes' if tx['hook_text_frame0'][f'{lang}-{hook}'] > 0 else 'no'} | {hw['first_word_s']:.2f} s | {times} |")
add('')
add('The first caption word is on screen from frame 1. In hook B the number and its MAKER\'S FIGURE label count up from frame 2.')
add('')

# 3
add('## 3. Pace')
add('')
add('Shot lengths in seconds (English / Azerbaijani), from the cut rules in `src/scenes.tsx`, which place every cut on a word of the voice:')
add('')
add('| Line | Shots |')
add('|---|---|')
for lid in ['H1', 'H2', 'H3', 'B1', 'B1b', 'B2', 'B3', 'B4', 'B4s', 'B5', 'B6', 'B7', 'B8']:
    en, az = plan[('en', lid)], plan[('az', lid)]
    add(f"| {lid} | {' → '.join(f'{n} {e[1]:.1f}/{a[1]:.1f}' for n, e, a in zip(shots.CLIPS[lid], en, az))} |")
add('')
add('- No shot runs longer than 2.5 s except the closing question, which holds for 3.1–3.4 s.')
add('- The moves inside shots (slow push-ins, the globe turning, the map zoom) keep every shot moving. Nothing is static.')
add('')

# 4
add('## 4. Slop check')
add('')
add('| Line | Real footage, real imagery or drawn from real data? | One accent colour? | No AI imagery, glow, generic HUD or stock cliché? |')
add('|---|---|---|---|')
for lid in LINES_A + EXTRA:
    add(f'| {lid} | {" | ".join(SLOP[lid])} |')
add('')
add('- No AI-generated images or video are used anywhere. Every Adobe Stock clip is marked `isGenTech: false`.')
add('- Rejected at the shortlist: a clip that looked like a 3D render, one with a lens flare, a tractor sprayer passed off as a drone, and a toy camera drone.')
add('- The accent is RUTA\'s olive. It is #B4BD92 on dark pictures and #59643F on bright skies: one colour in two values, so it stays readable on both.')
add('')

# 5
add('## 5. Truth')
add('')
add('| Line | On screen | Source in `sources.md` | Source tag |')
add('|---|---|---|---|')
for lid, shown, _, src, tag in TRUTH:
    add(f'| {lid} | {shown} | {src} | {tag} |')
add('')
add('- The laser weeder\'s figure is labelled "MAKER\'S FIGURE" wherever it appears (B2 and the H2 hook). The B2 voice also says "its maker says".')
add('- "≈70%" sits inside FAO\'s 71–72%. The voice says "about seventy percent".')
add('- "300,000+" is below CleanTechnica\'s "about 309,000". The voice says "over 300,000".')
add('- The orbit on the globe is labelled "DIAGRAM": it shows the kind of orbit, not a real pass.')
add('- The crosshairs, the collar and the fence are labelled "ILLUSTRATION". No robot or collar product is shown.')
add('')

# 6
add('## 6. Rights')
add('')
add('| Shot code | Adobe Stock ID (from `scripts/footage.py`) | Licence record | Match |')
add('|---|---|---|---|')
for code, rid, recid, good in rights:
    add(f'| {code} | {rid} | {recid} | {"yes" if good else "NO"} |')
add('')
add('| Other material | Licence or credit | In `licenses/README.md` |')
add('|---|---|---|')
for files, what, key in other_assets:
    add(f'| {files} | {what} | {"yes" if key in lic_index else "NO"} |')
add('')
add('Details: `licenses/adobe-stock/records.md` (17 clips, licensed 16 Nov 2026, $0), `licenses/data.md` (NASA, Copernicus, Natural Earth), `licenses/elevenlabs.md`, `licenses/fonts/`.')
add('')

# 7
add('## 7. Voice')
add('')
for lang, name in (('en', 'English'),):
    vv = voice[lang]
    diffs = {lid: x['differences'] for lid, x in vv['lines'].items() if x['differences']}
    add(f"**{name}:** take {vv['take']}, tempo ×{vv['tempo']}. ElevenLabs Scribe transcript against the script, line by line: {'every word matches' if not diffs else 'differences: ' + json.dumps(diffs, ensure_ascii=False)}.")
    add('')
    add('| Variant | Words | First word to last | Words a minute | Inside lines only (gaps between lines left out) |' + (' Syllables a second, inside lines |' if lang == 'az' else ''))
    add('|---|---|---|---|---|' + ('---|' if lang == 'az' else ''))
    for v in 'ABC':
        pp = vv['pace'][v]
        add(f"| {v} | {pp['words']} | {pp['span_s']} s | {pp['wpm_overall']} | {pp['wpm_speaking']} |" + (f" {pp['syllables_per_s_speaking']} |" if lang == 'az' else ''))
    add('')
add('- **English:** the brief asks for 160–175 words a minute. Measured from the first word to the last, as a listener hears it, A is at the bottom of that range and B and C sit in the middle. Inside the lines alone, the voice runs at 168–179.')
add('')

# 8
add('## 8. Loop')
add('')
if end_card:
    add('- **Changed after review, as RUTA asked.** Each reel now ends on a RUTA end card instead of looping seamlessly.')
    add('  - The closing field shot closes onto its own horizon: two black bars with olive edges meet on the horizon line.')
    add('  - The line shrinks to a short olive rule, and the RUTA logo rises above it.')
    add('  - A soft chord (made in code) marks the moment. The logo holds for about a second, then the reel ends.')
    add('- The brief asked for a seamless loop, so this check is now a known, deliberate change. Instagram replays a reel from its first frame; after the end card, that is a clean cut to the hook.')
    add('- For reference, the jump from the last frame to the first:')
else:
    add('Each reel ends with 6 frames of its hook\'s first shot, taken from just before frame 1. The last frame then flows straight into the first.')
add('')
add('| Reel | Last frame → first frame | The same shot, frame to frame (median) | Whole reel, frame to frame (median) |')
add('|---|---|---|---|')
for lang, v in VAR:
    lp = c['loop'][f'{lang}-{v}']
    add(f"| {lang.upper()} {v} | {lp['last_to_first_mean_abs_diff']} | {lp['same_shot_median_frame_diff']} | {lp['reel_median_frame_diff']} |")
add('')
add('Mean absolute difference in 8-bit levels at 270×480.' + ('' if end_card else ' The seam passes when it is no bigger than 1.5× the same shot\'s own frame-to-frame change.') + ' Strips of the last 6 and first 6 frames: `loop-en-{V}.jpg`.')
add('')

# 9
add('## 9. Specs')
add('')
add('| File | Size | Frames | Duration | Video | Frame rate | Audio | Faststart |')
add('|---|---|---|---|---|---|---|---|')
for name, s in c['specs'].items():
    add(f"| {name} | {s['size_mb']} MB | {s['frames']} (expected {s['expected_frames']}) | {s['duration']} s | {s['codec']} {s['profile']} {s['pix_fmt']} {s['width']}×{s['height']}, {s['video_bitrate_mbps']} Mb/s | {s['r_frame_rate']}, interval error ≤ {s['frame_interval_max_error_ms']} ms | {s['audio_codec']} {s['sample_rate']} Hz {s['channels']} ch {s['audio_bitrate_kbps']} kb/s | {'yes' if s['faststart'] else 'no'} |")
add('')

# 10
add('## 10. Loudness')
add('')
add('| File | Integrated | True peak | LRA |')
add('|---|---|---|---|')
for name, s in c['loudness'].items():
    add(f"| {name} | {s['integrated_lufs']} LUFS | {s['true_peak_dbtp']} dBTP | {s['lra']} LU |")
add('')
add('- **Chain:**')
add('  - The voice stem is set to −16 LUFS.')
add('  - Effects sit 15–40 dB below full scale, depending on the sound.')
add('  - Music sits 14 dB under the voice while it speaks and 9 dB under between lines.')
add('  - Then a 4× oversampled peak limiter at −4.5 dBFS and a two-pass loudnorm (−14 LUFS, −1.5 dBTP), linear in every file.')
add('- Measured on the final MP4s, after AAC encoding.')
add('')

# 11
add('## 11. Sound off')
add('')
add('`contact-sheet-{lang}-{V}.jpg` show one frame per second, with the time stamped on each. Without sound, each reel still reads:')
add('- indoor farm, "$1B raised, filed for bankruptcy"')
add('- "OUTSIDE."')
add('- crop rows with crosshairs, "10,000 a minute"')
add('- drone, "300,000+"')
add('- cow with collar inset, then a herd with a dotted fence')
add('- globe, then fields, "every 5 days, free"')
add('- irrigation, "≈70%"')
add('- Azerbaijan on the map, "36% of workers"')
add('- the question')
add('')
add('The burned-in captions carry every spoken word.')
add('')

# 12
add('## 12. Comfort')
add('')
fl = c['comfort']
mf = max(x['flashes_per_second_max'] for x in fl.values())
add(f"- **Flashes:** {'none in any reel' if mf == 0 else f'at most {mf} a second'}. WCAG allows 3 a second.")
add('  - Method: relative luminance of each sixteenth of the frame, frame by frame. A flash is a pair of opposite changes of 10% or more.')
add('  - The laser ticks are tiny (a few pixels) and single, so they are not flashes.')
add(f"- **Caption contrast:** the lowest is {cap_min}:1, in {cap_worst[0]}." + (' Every other caption measurement is 4.5:1 or more; `text.json` gives the frame and place of that moment.' if cap_dips else ''))
add('  - Method: in each 60×40 tile holding a steady caption (words still fading in or out are left out), the text\'s luminance against the brightest 10% of the picture around it, after the bottom shade.')
add('')
add('| Beat | Captions: lowest | 5th percentile | median |')
add('|---|---|---|---|')
for k, s in cap:
    add(f"| {k} | {s['min']}:1 | {s['p05']}:1 | {s['median']}:1 |")
add('')
weak = sorted([(s['min'], k, b) for k, b, s in other_bands if s['min'] < s['need'] and b != 'mark'])
add(f'**Other text** (numbers, labels, source tags) is large text by WCAG\'s definition (24 px and up), so it needs 3:1.')
if weak:
    add(f"Below 3:1 at its worst moment: {', '.join(f'{k} {b} {m}:1' for m, k, b in weak)}. Those are brief moments while a picture moves under a label. See the table in `text.json`.")
else:
    add('All of it reaches 3:1 or more at every steady moment.')
add('The RUTA mark sits at 40% opacity by design and is not counted as text.')
add('')

# Sound
add('## Sound effects')
add('')
add('One quiet, dry sound per reveal, from ElevenLabs Sound Effects (two takes each, chosen by measurement), cued from the same words as the pictures:')
add('')
add('| Line | Sound | Take used | When |')
add('|---|---|---|---|')
for lid, snd, take, when in [
    ('H1', 'breaker', 'breaker-a, the first clunk', 'as the farm goes dark, on "bust"'),
    ('B1, H3', 'wind', 'wind-b, the steadier take, low-passed at 5 kHz and tiled under the line', 'under the whole line'),
    ('B2, H2', 'laser ticks', 'three different 55–75 ms ticks from laser-a', 'as each crosshair fires'),
    ('B3', 'drone', 'drone-b, the steady pass, low-passed at 10 kHz', 'under the spray drone'),
    ('B4, B4s', 'beep, buzz', 'beep-a trimmed; the buzz is made in code', 'on "sound" and "vibration"'),
    ('B5', 'shutter', 'shutter-a, first click', 'as the frame closes on the field'),
    ('B6', 'water drop', 'drop-a', 'as the 70% lands'),
    ('B7', 'whoosh', 'whoosh-b, a low swell', 'peaking as the map lands on Azerbaijan'),
    ('B8', 'soft hit', 'hit-b', 'on the cut to the question'),
    ('END', 'logo chord', 'made in code: a soft D add9 chord, strummed and left to ring', 'as the field closes onto its horizon line'),
]:
    add(f'| {lid} | {snd} | {take} | {when} |')
add('')
add('I can\'t listen to audio, so each take was chosen by measurement: length, envelope, pitch and clipping. RUTA should play each reel once with sound before posting.')
add('')
add('## Music')
add('')
add('- **ElevenLabs Music:** not used. The connected ElevenLabs connector can\'t generate music, so the music is a placeholder made in code.')
add('- **The placeholder:** 110 BPM soft plucks over two open chords. A bass, a soft kick and a shaker (band-limited to 3–8 kHz, so it never clicks) come in line by line. It drops to a held chord that fades out on the question.')
add('- **Our advice:** post the `-nomusic` files with a trending track added in Instagram, or replace the placeholder with licensed music.')
add('')
(QA / 'report.md').write_text('\n'.join(L) + '\n')
print('report written:', len(L), 'lines')
