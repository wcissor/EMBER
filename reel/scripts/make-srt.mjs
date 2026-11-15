// captions.srt from the same caption chunks and voice timings the reel uses.
// Line 7 has no on-screen caption (the end card says it), but the SRT includes it.
import fs from 'node:fs';
import {CAPTIONS, SCRIPT} from '../src/config.ts';

const tl = JSON.parse(fs.readFileSync(new URL('../src/timeline.json', import.meta.url)));
const words = tl.words;
const sceneEnd = (i) => (i + 1 < tl.sceneStarts.length ? tl.sceneStarts[i + 1] : tl.durationInFrames) / tl.fps;
const stamp = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const cues = [];
let wi = 0;
SCRIPT.forEach((line, li) => {
  const lineWords = words.filter((w) => w.line === li + 1);
  const chunks = CAPTIONS[li].length ? CAPTIONS[li] : [[line.vo.split(' ')]];
  const built = chunks.map((chunk) => {
    const lines = chunk.map((ln) => ln.map((raw) => ({text: raw.replace(/^\^/, ''), w: words[wi++]})));
    return {lines, start: lines[0][0].w.start};
  });
  built.forEach((c, k) => {
    const last = c.lines.at(-1).at(-1).w;
    const end = k + 1 < built.length ? built[k + 1].start : Math.min(sceneEnd(li), last.end + 0.6);
    cues.push({start: c.start, end, text: c.lines.map((ln) => ln.map((t) => t.text).join(' ')).join('\n')});
  });
  if (wi !== words.indexOf(lineWords.at(-1)) + 1) throw new Error(`word count mismatch on line ${li + 1}`);
});
const srt = cues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n');
fs.mkdirSync(new URL('../out/', import.meta.url), {recursive: true});
fs.writeFileSync(new URL('../out/captions.srt', import.meta.url), srt);
console.log(srt);
