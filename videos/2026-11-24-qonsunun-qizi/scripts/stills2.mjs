// Render many stills of one composition with one bundle and one browser.
// Usage: node scripts/stills2.mjs OUTDIR [--comp MainA] [--safe] f1 f2 ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
const outDir = args.shift();
let comp = 'MainA', safe = false;
const frames = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--comp') comp = args[++i];
  else if (args[i] === '--safe') safe = true;
  else frames.push(Number(args[i]));
}
mkdirSync(outDir, {recursive: true});
const executable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome', {browserExecutable: executable, chromiumOptions: {gl: 'swangle'}});
const inputProps = {safeBox: safe};
const composition = await selectComposition({serveUrl, id: comp, inputProps, puppeteerInstance: browser, browserExecutable: executable});
for (const f of frames) {
  const name = `${comp}-f${String(f).padStart(4, '0')}${safe ? '-safe' : ''}.png`;
  await renderStill({composition, serveUrl, frame: f, output: path.join(outDir, name), inputProps, puppeteerInstance: browser, browserExecutable: executable, imageFormat: 'png', timeoutInMilliseconds: 120000});
  process.stdout.write(name + ' ');
}
await browser.close({silent: true});
console.log('\ndone', composition.durationInFrames, 'frames');
