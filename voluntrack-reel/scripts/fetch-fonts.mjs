// Downloads the exact Google Fonts files that @remotion/google-fonts references, so renders need no network.
import {getInfo as barlowInfo} from '@remotion/google-fonts/BarlowCondensed';
import {getInfo as interInfo} from '@remotion/google-fonts/Inter';
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
mkdirSync('public/fonts', {recursive: true});
const want = [
  {info: barlowInfo(), family: 'Barlow Condensed', file: 'barlow-condensed', weights: ['800']},
  {info: interInfo(), family: 'Inter', file: 'inter', weights: ['500', '600', '700']},
];
const manifest = [];
for (const {info, family, file, weights} of want) {
  for (const w of weights) {
    const url = info.fonts.normal[w].latin;
    const out = `public/fonts/${file}-${w}-latin.woff2`;
    execFileSync('curl', ['-sS', '-f', '-m', '60', '-o', out, url]);
    manifest.push({family, weight: w, file: out.replace('public/', ''), source: url});
    console.log(family, w, '<-', url);
  }
}
writeFileSync('public/fonts/manifest.json', JSON.stringify(manifest, null, 2));
