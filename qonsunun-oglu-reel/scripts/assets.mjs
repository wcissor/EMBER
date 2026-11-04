// Records which generated assets exist, so the film can fall back cleanly (build/assets.json).
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
mkdirSync('build', {recursive: true});
const has = (p) => existsSync(`public/${p}`);
const voices = ['ana', 'men', 'qo', 'qq'];
const out = {
  grain: has('grain/g00.png'),
  concrete: has('tex/concrete.png'),
  mix: {az: has('audio/mix-az.wav'), en: has('audio/mix-en.wav')},
  stems: Object.fromEntries(['az', 'en'].map((l) => [l, Object.fromEntries(voices.map((v) => [v, has(`audio/stems/${l}/${v}.wav`)]))])),
};
writeFileSync('build/assets.json', JSON.stringify(out, null, 1));
if (!existsSync('build/voice-meta.json')) writeFileSync('build/voice-meta.json', JSON.stringify({az: {source: 'none'}, en: {source: 'none'}}, null, 1));
console.log('assets:', JSON.stringify(out));
