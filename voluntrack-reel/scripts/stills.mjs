// Render many stills with one bundle and one browser.
// Usage: node scripts/stills.mjs OUTDIR [--safe] [--both] [--props JSON] [--comp ID] f1 f2 ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const outDir = args.shift();
let safe = false, both = false, comp = 'Main', extra = {};
const frames = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--safe') safe = true;
  else if (a === '--both') both = true;
  else if (a === '--comp') comp = args[++i];
  else if (a === '--props') extra = JSON.parse(args[++i]);
  else frames.push(Number(a));
}
mkdirSync(outDir, {recursive: true});
const executable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), webpackOverride: (c) => c});
const browser = await openBrowser('chrome', {browserExecutable: executable, chromiumOptions: {gl: 'swangle'}});
const variants = both ? [false, true] : [safe];
for (const sb of variants) {
  const inputProps = {...extra, safeBox: sb};
  const composition = await selectComposition({serveUrl, id: comp, inputProps, puppeteerInstance: browser, browserExecutable: executable});
  for (const f of frames) {
    const name = `${comp === 'Main' ? '' : comp + '-'}f${String(f).padStart(4, '0')}${sb ? '-safe' : ''}.png`;
    const t0 = Date.now();
    await renderStill({composition, serveUrl, frame: f, output: path.join(outDir, name), inputProps, puppeteerInstance: browser, browserExecutable: executable, imageFormat: 'png', timeoutInMilliseconds: 120000});
    console.log(name, `${Date.now() - t0}ms`);
  }
}
await browser.close({silent: true});
