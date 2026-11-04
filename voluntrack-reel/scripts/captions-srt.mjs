// out/captions.srt from voice_timings.json: one cue per line, no tags.
import {readFileSync, writeFileSync, mkdirSync, renameSync} from 'node:fs';
const lines = JSON.parse(readFileSync('public/audio/voice_timings.json', 'utf8'));
const ts = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(sec)},${p(r, 3)}`;
};
const cues = lines.map((l, i) => {
  const start = l.words.length ? l.words[0].start : l.start;
  const next = lines[i + 1];
  const end = Math.min(l.end + 8 / 60, next ? (next.words[0]?.start ?? next.start) - 0.001 : l.end + 0.4);
  if (/\[[^\]]*\]/.test(l.text)) throw new Error(`tag in caption ${l.id}`);
  return `${i + 1}\n${ts(start)} --> ${ts(end)}\n${l.text}\n`;
});
mkdirSync('out', {recursive: true});
writeFileSync('out/captions.tmp.srt', cues.join('\n'));
renameSync('out/captions.tmp.srt', 'out/captions.srt');
console.log(`out/captions.srt: ${cues.length} cues`);
