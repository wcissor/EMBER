// Builds VOICE_SCRIPTS.md (the 8 takes to paste into ElevenLabs) from src/config.ts and prints the character count.
// One take per voice per language: that voice's lines in order, one per line. Text = `say` when set, else `show`.
import {writeFileSync, existsSync} from 'node:fs';
import {LINES, LANGS} from '../../src/config.ts';

const BUDGET = 1177; // the user's ElevenLabs credits (eleven_v3: 1 credit per character)
const VOICES = [
  ['ana', 'Ana', 'An Azerbaijani woman in her 50s. Warm and theatrical, loud enough to cross a courtyard, Baku intonation. Loving exasperation, never mean.'],
  ['men', 'Mən', 'An Azerbaijani boy, 16–18. Deadpan and low-energy, close mic.'],
  ['qo', 'Qonşunun oğlu', 'An Azerbaijani boy, 16–18. Soft, kind, impossibly polite, a smile in the voice. The calmest voice.'],
  ['qq', 'Qonşu', 'An Azerbaijani woman in her 40s, sharp and proud, clearly different timbre from Ana.'],
];
const chars = (s) => [...s].length;

const takes = {};
let total = 0;
const sub = {};
const done = (k) => existsSync(new URL(`../../public/audio/takes/${k.replace('-', '/')}.mp3`, import.meta.url));
const CAST = {
  ana: 'Sona (your Azerbaijani female voice)',
  men: 'Abbas (the same voice as the Azerbaijani kid)',
  qo: 'a third voice: a calm, soft young male, clearly not Abbas',
  qq: 'a fourth voice: a sharp, proud woman in her 40s, clearly not Sona',
};
for (const lang of LANGS) {
  sub[lang] = 0;
  for (const [v] of VOICES) {
    const text = LINES.filter((l) => l.voice === v).map((l) => l[lang].say ?? l[lang].show).join('\n');
    takes[`${lang}-${v}`] = text;
    sub[lang] += chars(text);
  }
  total += sub[lang];
}

const name = {az: 'Azerbaijani', en: 'English'};
const keys = Object.keys(takes);
const remaining = keys.filter((k) => !done(k));
const left = remaining.reduce((a, k) => a + chars(takes[k]), 0);
let md = `# Qonşunun oğlu — voice takes

**Still to generate: ${remaining.length} takes, ${left.toLocaleString('en-US')} characters = ${left.toLocaleString('en-US')} credits on Eleven v3** (your budget ${BUDGET.toLocaleString('en-US')} → ${BUDGET - left} left for a retake).
Done: ${keys.filter(done).map((k) => `\`${k}\` ✓`).join(', ') || 'none'}. All 8 takes together: ${total.toLocaleString('en-US')} characters.

| take | voice | characters | status |
|---|---|---|---|
${keys.map((k) => `| \`${k}\` | ${CAST[k.split('-')[1]]} | ${chars(takes[k])} | ${done(k) ? 'done ✓' : '**to do**'} |`).join('\n')}

- **Model:** Eleven v3 (\`eleven_v3\`, supports Azerbaijani). Paste each block as it is: one line per line, in order.
- **One generation per take.** If your flow or app makes 2 takes per generation, set it to 1, or each take costs double.
- **Stability:** Ana, Mən, Qonşu = 0.0 (Creative) · Qonşunun oğlu = 0.5 (Natural).
- **Tags** in brackets are delivery directions, never spoken. They are trimmed to save credits; every spoken word is exactly the script.
- **File names:** \`az-ana.mp3, az-qo.mp3, az-qq.mp3, en-ana.mp3, en-men.mp3, en-qo.mp3, en-qq.mp3\` (any names are fine if you say which is which).
- **Four different voices.** The story needs four voices you can tell apart with your eyes closed: two women (Mom, the other mom) and two boys (the kid, the neighbor's son).
- **Pronunciation** (voice text only; captions keep the real spelling): "Reels" → **Rils**, "VolunTrack" → **Voləntrek** in the Azerbaijani takes.

**Voices:** four original voices, not clones of real people. Best: ElevenLabs **Voice Design** with these prompts (check the credit cost the app shows for previews before you generate):
${VOICES.map(([, n, p]) => `- **${n}** — ${p}`).join('\n')}

---
`;
for (const lang of LANGS) {
  md += `\n## ${name[lang]} (${sub[lang]} characters)\n`;
  for (const [v] of VOICES) {
    const k = `${lang}-${v}`;
    md += `\n### ${k} (${chars(takes[k])})${done(k) ? ' — done ✓' : ''}\n${done(k) ? '' : `Voice: ${CAST[v]}\n`}\`\`\`\n${takes[k]}\n\`\`\`\n`;
  }
}
writeFileSync(new URL('../../VOICE_SCRIPTS.md', import.meta.url), md);
for (const [k, t] of Object.entries(takes)) console.log(k.padEnd(8), String(chars(t)).padStart(4));
console.log('remaining', remaining.join(' '), '=', left, 'chars; budget', BUDGET, '→', BUDGET - left, 'spare; all 8 =', total);
if (left > BUDGET) process.exit(1);
