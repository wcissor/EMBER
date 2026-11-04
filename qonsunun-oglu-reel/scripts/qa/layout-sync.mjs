// Gates 3 and 4.
//  3 · every text box (measured with the real font files) sits inside the safe box x 65–1015, y 269–1248, and every
//      joke-carrying pose or window sits inside y 300–1040 at its beat (world places projected through the camera).
//  4 · every anchor (line, word, target frame, actual frame) lands within ±1 frame.
// Usage: node scripts/qa/layout-sync.mjs <lang>   → build/qa-layout-<lang>.json
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {LINES, TEXT, ROLES, SPEAKERS, BEATS, WINDOW_D_SUBTITLE} from '../../src/config.ts';
import {SAFE, ACTION, TITLE, CAPTION, END, UI, placeRect, balconyRect, block, STAGE} from '../../src/layout.ts';
import {resolveTimeline, captionRows, toFrame} from '../../src/timeline.ts';
import {worldShots, camAt, project} from '../../src/camera.ts';

const lang = process.argv[2] ?? 'az';
const timings = JSON.parse(readFileSync(`public/audio/voice_timings-${lang}.json`, 'utf8'));
const TL = resolveTimeline(timings, lang);
const B = TL.beats;
const T = TEXT[lang];

// measure every string with the font files
const spec = [];
const add = (id, text, font, size, wght, tracking = 0) => spec.push({id, text, font, size, wght, tracking});
add('title', T.title, 'barlow800', TITLE.size[lang]);
add('titleSub', T.titleSub, 'inter', TITLE.sub.size, 600);
add('endLine', T.endLine, 'barlow800', END.line.size);
add('url', T.url, 'inter', END.url.size, 600);
add('cta', T.cta, 'inter', END.cta.size, 600);
for (const l of LINES) {
  add(`tag-${l.id}`, SPEAKERS[lang][l.voice], 'inter', 28, 600, 0.14);
  captionRows(l.id, lang).forEach((row, i) => add(`cap-${l.id}-${i}`, row.map((t) => t.text).join(' '), 'inter', CAPTION.size, 700));
}
ROLES.forEach((r, i) => add(`role-${i}`, r[lang].title, 'inter', 40, 600));
add('ageLabel', T.ageLabel, 'inter', 32, 600);
add('apply', T.apply, 'inter', 28, 600);
const widths = Object.fromEntries(JSON.parse(execFileSync('python3', ['scripts/text/measure.py'], {input: JSON.stringify(spec)}).toString()).map((m) => [m.id, m.width]));

const boxes = [];
const centred = (id, y, h, w) => boxes.push({id, x: 540 - w / 2, y, w, h});
centred('title', TITLE.y, TITLE.h, widths.title);
centred('titleSub', TITLE.sub.y, TITLE.sub.h, widths.titleSub);
centred('endLine', END.line.y0, END.line.y1 - END.line.y0, widths.endLine);
centred('url', END.url.y0, END.url.y1 - END.url.y0, widths.url);
centred('cta (+ arrow)', END.cta.y0, END.cta.y1 - END.cta.y0, widths.cta + 18 + 64 + 20);
for (const l of LINES) {
  const rows = captionRows(l.id, lang);
  centred(`L${l.id} tag`, CAPTION.tagY, CAPTION.tagH, widths[`tag-${l.id}`]);
  rows.forEach((_, i) => centred(`L${l.id} row ${i + 1}`, CAPTION.lineY + i * CAPTION.lineH, CAPTION.lineH, widths[`cap-${l.id}-${i}`]));
}
boxes.push({id: 'UI age field', x: UI.x, y: UI.age.y, w: UI.w, h: UI.age.h});
UI.cards.forEach((y, i) => boxes.push({id: `UI card ${i + 1} (${ROLES[i][lang].title}: ${Math.round(widths[`role-${i}`])} px title)`, x: UI.x, y, w: UI.w, h: UI.cardH}));
// window D's typed subtitle, projected at its visible frames (world-anchored text)
const shots = worldShots(B);
const camF = (f) => camAt(shots.find((s) => f >= s.from && f < s.to) ?? shots[shots.length - 1], f);
const r = placeRect('winD');
const k = r.w / STAGE.w;
let worstSub = null;
for (let f = B.winD + 6; f < B.allFour; f += 3) {
  const a = project(camF(f), r.x + 150 * k, r.y + 700 * k);
  const b = project(camF(f), r.x + 850 * k, r.y + 818 * k);
  const box = {id: `window D subtitle "${WINDOW_D_SUBTITLE.from} → ${WINDOW_D_SUBTITLE.to}" @f${f}`, x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y};
  if (!worstSub || box.y + box.h > worstSub.y + worstSub.h || box.y < worstSub.y) worstSub = box;
}
boxes.push(worstSub);
const inSafe = (b) => b.x >= SAFE.x0 - 0.5 && b.x + b.w <= SAFE.x1 + 0.5 && b.y >= SAFE.y0 - 0.5 && b.y + b.h <= SAFE.y1 + 0.5;
const textRows = boxes.map((b) => ({...b, ok: inSafe(b)}));
const minCaption = CAPTION.size;

// joke-carrying windows and poses at their beats (screen y range of the place)
const jokes = [
  ['the son turns to camera', 'son', B.sonTurn], ['window A: the sapling', 'winA', B.winA + 10], ['window B: hands up', 'winB', B.winB + 18],
  ['window C: the cup', 'winC', B.winC + 30], ['window D: Hello → Salam', 'winD', B.winD + 20], ['the kid upside down + Ana', 'kidRoom', B.anaDoor + 8],
  ['eyes slide (L08)', 'kidRoom', B.eyesSlide], ['the silence: Ana eyes the modem', 'kidRoom', B.silence + 8], ['hand to the plug', 'kidRoom', B.plugReach + 20],
  ['the flip', 'kidRoom', B.flip + 8], ['the door slam', 'kidRoom', B.doorSlam], ['deed 1', 'deed1', B.deed1 + 6], ['deed 2', 'deed2', B.deed2 + 6],
  ['deed 3', 'deed3', B.deed3 + 6], ['bedroom turns blue', 'kidRoom', B.bedroomBlue + 4], ['Qonşu points (L19)', 'qonsuBalcony', B.qqPoint + 18],
  ['Ana bursts out (L20)', 'anaBalcony', B.anaBurst + 8], ['the smug squint (L21)', 'kidRoom', B.kidStep + 30],
];
const zoneRows = jokes.map(([what, place, f]) => {
  const rr = place === 'anaBalcony' ? balconyRect(block('L'), 6, 4) : place === 'qonsuBalcony' ? balconyRect(block('R'), 0, 5) : placeRect(place);
  const c = camF(f);
  const a = project(c, rr.x, rr.y);
  const b = project(c, rr.x + rr.w, rr.y + rr.h);
  return {what, place, frame: f, y0: Math.round(a.y), y1: Math.round(b.y), ok: a.y >= ACTION.y0 - 1 && b.y <= ACTION.y1 + 1};
});
// stairwell, UI and constellation are laid out in screen space inside the action zone by construction (Stairwell.tsx, layout.ts)

// gate 4 · sync: every anchor that names a line or a word
const brief = {whipStart: 18, whipLand: 33, sonTurn: 50, title: 70, winA: 99, winB: 129, winC: 171, winD: 216, allFour: 266, rays2: 270, whipBack: 300,
  anaDoor: 305, eyesSlide: 339, silence: 390, plugReach: 411, flip: 452, bolt: 486, doorSlam: 500, push: 504, tiptoe: 510, catStep: 552, tumbleLand: 572,
  offerHand: 582, grab: 630, smile: 663, phoneTurn: 690, vtLit: 699, flood: 726, uiIn: 738, type1: 765, type6: 777, cards: 792, tap: 819, cardLand: 840,
  deed1: 843, deed2: 873, deed3: 900, bedroomBlue: 930, wide: 960, qqPoint: 963, anaBurst: 999, kidStep: 1032, kidRays: 1062, crane: 1080, ripple: 1086,
  logo: 1110, endLine: 1110, cta: 1125, resolve: 1170};
const wordOf = (a) => {
  if ('w' in a) {
    const l = TL.line(a.w[0]);
    const w = l.words[a.w[1]];
    return {line: a.w[0], word: w.word, frame: toFrame(a.edge === 'e' ? w.end : w.start) + (a.off ?? 0)};
  }
  if ('line' in a) {
    const l = TL.line(a.line);
    const w = a.edge === 'e' ? l.words[l.words.length - 1] : l.words[0];
    return {line: a.line, word: `${w.word} (${a.edge === 'e' ? 'end' : 'start'})`, frame: toFrame(a.edge === 'e' ? l.end : l.start) + (a.off ?? 0)};
  }
  return null;
};
const syncRows = Object.entries(BEATS).map(([name, a]) => {
  const w = wordOf(a);
  return {beat: name, line: w?.line ?? '—', word: w?.word ?? ('ref' in a ? `after ${a.ref}` : 'abs' in a ? 'fixed' : 'max/min'), target: brief[name], anchor: w ? w.frame : null, actual: B[name], delta: w ? B[name] - w.frame : null};
});
const syncOk = syncRows.every((r) => r.delta === null || Math.abs(r.delta) <= 1);
const out = {lang, textRows, zoneRows, syncRows, ok3: textRows.every((r) => r.ok) && zoneRows.every((r) => r.ok), ok4: syncOk, minCaption};
writeFileSync(`build/qa-layout-${lang}.json`, JSON.stringify(out, null, 1));
console.log(`gate 3 (${lang}): text ${textRows.filter((r) => r.ok).length}/${textRows.length} in safe box; jokes ${zoneRows.filter((r) => r.ok).length}/${zoneRows.length} in the action zone`);
for (const r of [...textRows, ...zoneRows].filter((x) => !x.ok)) console.log('  ✗', JSON.stringify(r));
console.log(`gate 4 (${lang}): ${syncRows.filter((r) => r.delta !== null).length} word anchors, all within ±1 frame: ${syncOk}`);
