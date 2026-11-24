// Dumps the resolved part 2 timeline for the Python audio/QA scripts: build/timeline-az.json
// (beats, placed lines, the star's ring count, the variant segment lists).
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolveTimeline} from '../src/timeline.ts';
import {LINES} from '../src/config.ts';
import {LOGO} from '../src/logoData.ts';
mkdirSync('build', {recursive: true});
const lang = 'az';
const timings = JSON.parse(readFileSync(`public/audio/voice_timings-${lang}.json`, 'utf8'));
const TL = resolveTimeline(timings, lang);
const B = TL.beats;
const placement = JSON.parse(readFileSync(`build/placement-${lang}.json`, 'utf8'));
// the star's ring count (same geometry as src/scenes/p2/End2.tsx)
const STAR2 = {cx: 540, cy: 560, size: 820};
const CELL = {w: 36, h: 44};
const R = STAR2.size / 2;
const D = LOGO.innerStar * R * Math.SQRT1_2;
const POLY = [[0, -R], [D, -D], [R, 0], [D, D], [0, R], [-D, D], [-R, 0], [-D, -D]];
const inside = (x, y) => {
  let c = false;
  for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    const [xi, yi] = POLY[i];
    const [xj, yj] = POLY[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
let rings = 0;
for (let c = -14; c <= 44; c++)
  for (let r = 0; r < 23; r++) {
    const x = STAR2.cx + CELL.w * (c - 15);
    const y = STAR2.cy + CELL.h * (r - 11);
    if (inside(x - STAR2.cx, y - STAR2.cy)) rings = Math.max(rings, Math.round(Math.hypot((c - 15) * CELL.w, (r - 11) * CELL.h) / (CELL.w * 1.4)));
  }
const p13 = TL.lineFrames('P13');
const TITLE_LEN = 45;
const segments = {
  A: [['film', 0, B.end]],
  Areply: [['film', 0, B.end]],
  B: [['film', B.s2, B.deed1 - 9], ['title', TITLE_LEN], ['film', B.deed1 - 9, B.end]],
  C: [['film', p13.start - 5, p13.end + 8], ['title', TITLE_LEN], ['film', B.s2, B.end]],
};
const out = {
  lang, beats: B, lines: timings, placement: placement.lines, starRings: rings, titleLen: TITLE_LEN, segments,
  shout: Object.fromEntries(LINES.filter((l) => l.shout).map((l) => [l.id, l.shout[lang]])),
};
writeFileSync(`build/timeline-${lang}.json`, JSON.stringify(out, null, 1));
console.log('timeline', lang, Object.keys(B).length, 'beats; star rings', rings, '; end', B.end);
