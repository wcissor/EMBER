// Section 5, option 4 ("Nothing at all"): voice timings on the target times, words spread by syllables.
// Writes public/audio/voice_timings-<lang>.json and marks the source in build/voice-meta.json.
// Usage: node scripts/voice/placeholder.mjs [az|en ...]   (default: both)
import {writeFileSync, readFileSync, existsSync} from 'node:fs';
import {LINES, LANGS} from '../../src/config.ts';
import {stripTags, lineTokens} from '../../src/timeline.ts';

const langs = process.argv.slice(2).length ? process.argv.slice(2) : LANGS;
const syllables = (w) => Math.max(1, (w.toLowerCase().match(/[aeəıioöuüy]+/g) ?? []).length);
const r3 = (x) => Math.round(x * 1000) / 1000;

const metaPath = 'build/voice-meta.json';
const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};
for (const lang of langs) {
  const out = LINES.map((l) => {
    const [start, end] = l.target;
    const toks = lineTokens(l.id, lang);
    const text = stripTags(l[lang].show);
    const gap = 0.05;
    const total = end - start - gap * (toks.length - 1);
    const syl = toks.map((t) => syllables(t.text));
    const sum = syl.reduce((a, b) => a + b, 0);
    let t = start;
    const words = toks.map((tk, i) => {
      const d = (total * syl[i]) / sum;
      const w = {word: tk.text, start: r3(t), end: r3(t + d)};
      t += d + gap;
      return w;
    });
    return {id: l.id, voice: l.voice, text, start, end, words};
  });
  writeFileSync(`public/audio/voice_timings-${lang}.json`, JSON.stringify(out, null, 1));
  meta[lang] = {source: 'placeholder', note: 'target times; words spread by syllable count; no audio'};
  console.log(lang, out.length, 'lines (placeholder)');
}
writeFileSync(metaPath, JSON.stringify(meta, null, 1));
