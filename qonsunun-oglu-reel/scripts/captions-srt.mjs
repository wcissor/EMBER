// out/captions-<lang>.srt from voice_timings-<lang>.json: one cue per line, "SPEAKER: text", tags never shown.
import {readFileSync, writeFileSync, mkdirSync, renameSync} from 'node:fs';
import {SPEAKERS} from '../src/config.ts';
const ts = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(sec)},${p(r, 3)}`;
};
mkdirSync('out', {recursive: true});
for (const lang of process.argv.slice(2).length ? process.argv.slice(2) : ['az', 'en']) {
  const lines = JSON.parse(readFileSync(`public/audio/voice_timings-${lang}.json`, 'utf8'));
  const cues = lines.map((l, i) => {
    const start = l.words[0].start - 4 / 30;
    const next = lines[i + 1];
    const end = Math.min(l.end + 6 / 30, next ? next.words[0].start - 4 / 30 - 0.001 : l.end + 0.5);
    if (/\[[^\]]*\]/.test(l.text)) throw new Error(`tag in caption ${l.id}`);
    return `${i + 1}\n${ts(start)} --> ${ts(end)}\n${SPEAKERS[lang][l.voice]}: ${l.text}\n`;
  });
  writeFileSync(`out/captions-${lang}.tmp.srt`, cues.join('\n'));
  renameSync(`out/captions-${lang}.tmp.srt`, `out/captions-${lang}.srt`);
  console.log(`out/captions-${lang}.srt: ${cues.length} cues`);
}
