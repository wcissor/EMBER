// Render a batch of stills with one bundle and one browser (used by qa.py).
//   node scripts/stills.mjs jobs.json
// jobs.json: [{"comp": "XO-Main-16x9", "frame": 204, "props": {...}, "out": "path.png"}, ...]
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const jobs = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

const serveUrl = await bundle({entryPoint: resolve(root, 'src/index.ts'), publicDir: resolve(root, 'public')});
const browser = await openBrowser('chrome', {browserExecutable, chromeMode: 'headless-shell'});
const comps = new Map();
try {
	for (const job of jobs) {
		const key = `${job.comp}:${JSON.stringify(job.props ?? {})}`;
		let composition = comps.get(key);
		if (!composition) {
			composition = await selectComposition({serveUrl, id: job.comp, inputProps: job.props ?? {}, puppeteerInstance: browser, browserExecutable});
			comps.set(key, composition);
		}
		const t0 = Date.now();
		await renderStill({
			composition,
			serveUrl,
			frame: job.frame,
			output: job.out,
			inputProps: {...composition.defaultProps, ...(job.props ?? {})},
			imageFormat: 'png',
			puppeteerInstance: browser,
			browserExecutable,
			overwrite: true,
		});
		console.log(`still ${job.comp} f${job.frame} -> ${job.out} (${Date.now() - t0} ms)`);
	}
} finally {
	await browser.close({silent: true});
}
