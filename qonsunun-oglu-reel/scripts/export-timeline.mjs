// Dumps the resolved timeline per language for the Python audio/QA scripts: build/timeline-<lang>.json
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolveTimeline} from '../src/timeline.ts';
import {LINES, LANGS} from '../src/config.ts';
import {worldShots, blurRanges} from '../src/camera.ts';
mkdirSync('build', {recursive: true});
for (const lang of process.argv.slice(2).length ? process.argv.slice(2) : LANGS) {
  const timings = JSON.parse(readFileSync(`public/audio/voice_timings-${lang}.json`, 'utf8'));
  const TL = resolveTimeline(timings, lang);
  const B = TL.beats;
  const placement = JSON.parse(readFileSync(`build/placement-${lang}.json`, 'utf8'));
  const out = {
    lang,
    beats: B,
    lines: timings,
    placement: placement.lines,
    shots: worldShots(B).map((s) => ({id: s.id, from: s.from, to: s.to})),
    scenes: {stairs: [B.push + 7, B.uiIn], ui: [B.uiIn, B.cardLand - 2], end: [B.crane, 1200]},
    blur: [...blurRanges(B), [B.catStep + 2, B.tumbleLand], [B.tap + 4, B.cardLand - 2], [B.crane, B.crane + 42]],
    shout: Object.fromEntries(LINES.filter((l) => l.shout).map((l) => [l.id, l.shout[lang]])),
  };
  writeFileSync(`build/timeline-${lang}.json`, JSON.stringify(out, null, 1));
  console.log('timeline', lang, Object.keys(B).length, 'beats');
}
