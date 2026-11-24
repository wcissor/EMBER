// out/captions-az.srt (version A timing) from the placed lines: one cue per line, "SPEAKER: text", tags never shown.
import {readFileSync, writeFileSync, mkdirSync, renameSync} from 'node:fs';
import {LINES, SPEAKERS} from '../src/config.ts';
const ts = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(sec)},${p(r, 3)}`;
};
mkdirSync('out', {recursive: true});
const all = JSON.parse(readFileSync('public/audio/voice_timings-az.json', 'utf8'));
const lines = all.filter((l) => !LINES.find((d) => d.id === l.id)?.silentCaption);
const cues = lines.map((l, i) => {
  const def = LINES.find((d) => d.id === l.id);
  const start = l.words[0].start - 4 / 30;
  const next = lines[i + 1];
  const end = Math.min(l.end + 6 / 30, next ? next.words[0].start - 4 / 30 - 0.001 : l.end + 0.5);
  if (/\[[^\]]*\]/.test(l.text)) throw new Error(`tag in caption ${l.id}`);
  return `${i + 1}\n${ts(start)} --> ${ts(end)}\n${def.speaker ?? SPEAKERS.az[l.voice]}: ${l.text}\n`;
});
writeFileSync('out/captions-az.tmp.srt', cues.join('\n'));
renameSync('out/captions-az.tmp.srt', 'out/captions-az.srt');
console.log(`out/captions-az.srt: ${cues.length} cues`);
