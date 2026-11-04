// Render the one composition in shot ranges (muted, identical settings), join with the concat demuxer (-c copy),
// verify 2,040 frames, then add the audio without re-encoding the video. Every output is written as .tmp first.
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition, openBrowser} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, rmSync} from 'node:fs';
import path from 'node:path';

const TL = JSON.parse(readFileSync('build/timeline.json', 'utf8'));
const B = TL.beats;
const LAST = 2039;
const shots = [
  ['s1', 0, B.youthStart - 4],
  ['s2', B.youthStart - 3, B.freeze],
  ['s3', B.freeze + 1, B.stackIn - 1],
  ['s4', B.stackIn, B.applyTap - 1],
  ['s5', B.applyTap, B.flip - 1],
  ['s6', B.flip, B.logoRise - 1],
  ['s7', B.logoRise, LAST],
];
const only = process.argv.slice(2).filter((a) => /^s\d$/.test(a));
const concurrency = Number(process.env.CONCURRENCY ?? 3);
mkdirSync('out/parts', {recursive: true});
const executable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome', {browserExecutable: executable, chromiumOptions: {gl: 'swangle'}});
const composition = await selectComposition({serveUrl, id: 'Main', inputProps: {}, puppeteerInstance: browser, browserExecutable: executable});
const log = [];
for (const [name, a, b] of shots) {
  if (only.length && !only.includes(name)) continue;
  const tmp = `out/parts/${name}.tmp.mp4`;
  const fin = `out/parts/${name}.mp4`;
  if (process.env.RESUME === '1' && existsSync(fin)) { console.log(`${name}: kept (exists)`); log.push({name, a, b, frames: b - a + 1, sec: 0}); continue; }
  const t0 = Date.now();
  await renderMedia({
    composition, serveUrl, codec: 'h264', crf: 18, pixelFormat: 'yuv420p', muted: true, frameRange: [a, b],
    outputLocation: tmp, puppeteerInstance: browser, browserExecutable: executable, concurrency,
    imageFormat: 'jpeg', jpegQuality: 95, x264Preset: 'medium', timeoutInMilliseconds: 240000,
    onProgress: ({progress}) => { if (Math.round(progress * 100) % 25 === 0) process.stdout.write(`\r${name} ${Math.round(progress * 100)}%   `); },
  });
  const frames = parseInt(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', tmp]).toString().trim());
  if (frames !== b - a + 1) throw new Error(`${name}: expected ${b - a + 1} frames, got ${frames}`);
  renameSync(tmp, fin);
  const sec = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\r${name}: frames ${a}–${b} (${frames}) in ${sec}s`);
  log.push({name, a, b, frames, sec: Number(sec)});
}
await browser.close({silent: true});
writeFileSync('build/render_log.json', JSON.stringify(log, null, 1));

if (only.length) process.exit(0);
// join
const list = shots.map(([n]) => `file '${path.resolve(`out/parts/${n}.mp4`)}'`).join('\n') + '\n';
writeFileSync('out/parts/list.txt', list);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'out/parts/list.txt', '-c', 'copy', 'out/video.tmp.mp4']);
const total = parseInt(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', 'out/video.tmp.mp4']).toString().trim());
if (total !== 2040) throw new Error(`joined video has ${total} frames, expected 2040`);
renameSync('out/video.tmp.mp4', 'out/video.mp4');
console.log('joined: 2040 frames → out/video.mp4');
// audio
if (!existsSync('public/audio/mix.wav')) throw new Error('public/audio/mix.wav missing');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', 'out/video.mp4', '-i', 'public/audio/mix.wav', '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', '-shortest', 'out/voluntrack-deadline-passed.tmp.mp4']);
renameSync('out/voluntrack-deadline-passed.tmp.mp4', 'out/voluntrack-deadline-passed.mp4');
console.log('final → out/voluntrack-deadline-passed.mp4');
