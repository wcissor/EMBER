// Bake feTurbulence-based textures once: 24 grain tiles and every stamp's inked texture (transparent PNGs).
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';
import {mkdirSync, renameSync, rmSync, existsSync} from 'node:fs';
import path from 'node:path';
const exe = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
// bake against the vector path (no previous bakes in the bundle)
for (const d of ['public/stamps', 'public/grain']) if (existsSync(d)) rmSync(d, {recursive: true});
const {execFileSync} = await import('node:child_process');
execFileSync('node', ['scripts/assets.mjs']);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome', {browserExecutable: exe, chromiumOptions: {gl: 'swangle'}});
let seeds = [];
for (const id of ['GrainBake', 'StampBake']) {
  const comp = await selectComposition({serveUrl, id, inputProps: {}, puppeteerInstance: browser, browserExecutable: exe});
  if (id === 'StampBake') seeds = comp.props.seeds;
  const dir = id === 'GrainBake' ? 'build/bake/grain' : 'build/bake/stamps';
  mkdirSync(dir, {recursive: true});
  for (let f = 0; f < comp.durationInFrames; f++) {
    await renderStill({composition: comp, serveUrl, frame: f, output: `${dir}/${f}.png`, imageFormat: 'png', puppeteerInstance: browser, browserExecutable: exe});
  }
  console.log(id, comp.durationInFrames, 'frames');
}
await browser.close({silent: true});
// name the outputs
const STAMP_BAKES = seeds;
mkdirSync('public/grain', {recursive: true});
mkdirSync('public/stamps', {recursive: true});
for (let i = 0; i < 24; i++) renameSync(`build/bake/grain/${i}.png`, `public/grain/g${String(i).padStart(2, '0')}.png`);
STAMP_BAKES.forEach((seed, i) => renameSync(`build/bake/stamps/${i}.png`, `public/stamps/${seed}.png`));
execFileSync('node', ['scripts/assets.mjs']);
console.log('baked', STAMP_BAKES.length, 'stamps and 24 grain tiles');
