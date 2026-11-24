// Section 7 "Render and export": render Main in shot ranges (muted, identical settings, one file per shot, .tmp →
// renamed only when it succeeds), join with the concat demuxer (-c copy), check 1,200 frames, then add the mix with
// -c:v copy. Usage: node scripts/render-parts.mjs <az|en> [s1 s2 …]   (RESUME=1 keeps finished parts)
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition, openBrowser} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const lang = process.argv[2];
if (!['az', 'en'].includes(lang)) throw new Error('usage: render-parts.mjs <az|en> [shots]');
const TL = JSON.parse(readFileSync(`build/timeline-${lang}.json`, 'utf8'));
const B = TL.beats;
const LAST = 1199;
const shots = [
  ['s1', 0, 95],
  ['s2', 96, B.whipBack - 1],
  ['s3', B.whipBack, B.push - 1],
  ['s4', B.push, B.uiIn - 1],
  ['s5', B.uiIn, B.wide - 1],
  ['s6', B.wide, B.crane - 1],
  ['s7', B.crane, LAST],
];
const only = process.argv.slice(3).filter((a) => /^s\d$/.test(a));
const concurrency = Number(process.env.CONCURRENCY ?? 3);
mkdirSync('out/parts', {recursive: true});
const executable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome', {browserExecutable: executable, chromiumOptions: {gl: 'swangle'}});
const inputProps = {lang, safeBox: false};
const composition = await selectComposition({serveUrl, id: 'Main', inputProps, puppeteerInstance: browser, browserExecutable: executable});
const count = (f) => parseInt(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', f]).toString().trim());
const logPath = `build/render_log-${lang}.json`;
const log = existsSync(logPath) ? JSON.parse(readFileSync(logPath, 'utf8')) : [];
for (const [name, a, b] of shots) {
  if (only.length && !only.includes(name)) continue;
  const tmp = `out/parts/${lang}-${name}.tmp.mp4`;
  const fin = `out/parts/${lang}-${name}.mp4`;
  if (process.env.RESUME === '1' && existsSync(fin) && count(fin) === b - a + 1) {
    console.log(`${name}: kept (exists)`);
    continue;
  }
  const t0 = Date.now();
  await renderMedia({
    composition, serveUrl, codec: 'h264', crf: 18, pixelFormat: 'yuv420p', muted: true, frameRange: [a, b], inputProps,
    outputLocation: tmp, puppeteerInstance: browser, browserExecutable: executable, concurrency,
    imageFormat: 'jpeg', jpegQuality: 95, colorSpace: 'bt709', x264Preset: 'medium', timeoutInMilliseconds: 240000,
    onProgress: ({progress}) => process.stdout.write(`\r${lang} ${name} ${Math.round(progress * 100)}%   `),
  });
  const frames = count(tmp);
  if (frames !== b - a + 1) throw new Error(`${name}: expected ${b - a + 1} frames, got ${frames}`);
  renameSync(tmp, fin);
  const sec = Math.round((Date.now() - t0) / 1000);
  console.log(`\r${lang} ${name}: frames ${a}–${b} (${frames}) in ${sec}s`);
  const i = log.findIndex((x) => x.name === name);
  const row = {name, a, b, frames, sec, tmp, renamedTo: fin};
  if (i >= 0) log[i] = row; else log.push(row);
  writeFileSync(logPath, JSON.stringify(log, null, 1));
}
await browser.close({silent: true});
if (only.length) process.exit(0);

// join with the concat demuxer
const list = shots.map(([n]) => `file '${path.resolve(`out/parts/${lang}-${n}.mp4`)}'`).join('\n') + '\n';
writeFileSync(`out/parts/${lang}-list.txt`, list);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `out/parts/${lang}-list.txt`, '-c', 'copy', `out/video-${lang}.tmp.mp4`]);
const total = count(`out/video-${lang}.tmp.mp4`);
if (total !== 1200) throw new Error(`joined video has ${total} frames, expected 1200`);
renameSync(`out/video-${lang}.tmp.mp4`, `out/video-${lang}.mp4`);
console.log(`joined: 1200 frames → out/video-${lang}.mp4`);
// add the audio without re-encoding the video
const mix = `public/audio/mix-${lang}.wav`;
if (!existsSync(mix)) throw new Error(`${mix} missing`);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', `out/video-${lang}.mp4`, '-i', mix, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', '-shortest', `out/qonsunun-oglu-${lang}.tmp.mp4`]);
renameSync(`out/qonsunun-oglu-${lang}.tmp.mp4`, `out/qonsunun-oglu-${lang}.mp4`);
console.log(`final → out/qonsunun-oglu-${lang}.mp4`);
