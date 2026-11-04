// Bake the grain tiles (feTurbulence rendered once by Chrome) into public/grain/gNN.png.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const exe = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome', {browserExecutable: exe, chromiumOptions: {gl: 'swangle'}});
mkdirSync('public/grain', {recursive: true});
const comp = await selectComposition({serveUrl, id: 'GrainBake', inputProps: {}, puppeteerInstance: browser, browserExecutable: exe});
for (let f = 0; f < comp.durationInFrames; f++) {
  await renderStill({composition: comp, serveUrl, frame: f, output: `public/grain/g${String(f).padStart(2, '0')}.png`, imageFormat: 'png', puppeteerInstance: browser, browserExecutable: exe});
}
await browser.close({silent: true});
execFileSync('node', ['scripts/assets.mjs'], {stdio: 'inherit'});
console.log('baked', comp.durationInFrames, 'grain tiles');
// concrete texture
{
  const {bundle: b2} = await import('@remotion/bundler');
  const {renderStill: rs, selectComposition: sc, openBrowser: ob} = await import('@remotion/renderer');
  const url = await b2({entryPoint: path.resolve('src/index.ts')});
  const br = await ob('chrome', {browserExecutable: exe, chromiumOptions: {gl: 'swangle'}});
  mkdirSync('public/tex', {recursive: true});
  const c = await sc({serveUrl: url, id: 'ConcreteBake', inputProps: {}, puppeteerInstance: br, browserExecutable: exe});
  await rs({composition: c, serveUrl: url, frame: 0, output: 'public/tex/concrete.png', imageFormat: 'png', puppeteerInstance: br, browserExecutable: exe});
  await br.close({silent: true});
  execFileSync('node', ['scripts/assets.mjs'], {stdio: 'inherit'});
  console.log('baked concrete texture');
}
