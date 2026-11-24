// Render part 2 in parts (muted, identical settings, .tmp → renamed on success), join each version with the concat
// demuxer (-c copy) and add its mix (-c:v copy). Usage: node scripts/render2.mjs [A Areply B C] [--preview]
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition, openBrowser} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const TL = JSON.parse(readFileSync('build/timeline-az.json', 'utf8'));
const B = TL.beats;
const [fl0, fl1] = [TL.segments.C[0][1], TL.segments.C[0][2]];
const s2x = B.s2 + 30;
// part name → [composition, from, to) in that composition's frames
const PARTS = {
  A1: ['MainA', 0, s2x], R1: ['MainAreply', 0, s2x], S2: ['MainA', s2x, B.deed1 - 9],
  b3: ['MainA', B.deed1 - 9, B.stairs], b4: ['MainA', B.stairs, B.phoneIn], b5: ['MainA', B.phoneIn, B.morning],
  b6: ['MainA', B.morning, B.dusk], b8: ['MainA', B.dusk, B.end],
  BO: ['MainB', 0, 30], T: ['MainB', B.deed1 - 9 - B.s2, B.deed1 - 9 - B.s2 + TL.titleLen], FL: ['MainC', 0, fl1 - fl0],
};
const TAIL = ['S2', 'b3', 'b4', 'b5', 'b6', 'b8'];
const ORDER = {A: ['A1', ...TAIL], Areply: ['R1', ...TAIL], B: ['BO', 'S2', 'T', ...TAIL.slice(1)], C: ['FL', 'T', 'BO', ...TAIL]};
const args = process.argv.slice(2);
const versions = args.filter((a) => ORDER[a]);
const preview = args.includes('--preview');
const need = [...new Set(versions.flatMap((v) => ORDER[v]))];
mkdirSync('out/parts', {recursive: true});
const executable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome', {browserExecutable: executable, chromiumOptions: {gl: 'swangle'}});
const count = (f) => parseInt(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', f]).toString().trim());
const comps = {};
for (const name of need) {
  const [comp, a, b] = PARTS[name];
  const fin = `out/parts/${name}.mp4`;
  if (process.env.RESUME === '1' && existsSync(fin) && count(fin) === b - a) {
    console.log(`${name}: kept`);
    continue;
  }
  comps[comp] ??= await selectComposition({serveUrl, id: comp, inputProps: {}, puppeteerInstance: browser, browserExecutable: executable});
  const tmp = `out/parts/${name}.tmp.mp4`;
  const t0 = Date.now();
  await renderMedia({
    composition: comps[comp], serveUrl, codec: 'h264', crf: 16, pixelFormat: 'yuv420p', muted: true, frameRange: [a, b - 1], inputProps: {},
    outputLocation: tmp, puppeteerInstance: browser, browserExecutable: executable, concurrency: 3, imageFormat: 'jpeg', jpegQuality: 95,
    colorSpace: 'bt709', x264Preset: 'medium', timeoutInMilliseconds: 240000,
    onProgress: ({progress}) => process.stdout.write(`\r${name} ${Math.round(progress * 100)}%   `),
  });
  const n = count(tmp);
  if (n !== b - a) throw new Error(`${name}: expected ${b - a} frames, got ${n}`);
  renameSync(tmp, fin);
  console.log(`\r${name}: ${comp} ${a}–${b - 1} (${n} frames) in ${Math.round((Date.now() - t0) / 1000)} s`);
}
await browser.close({silent: true});
const dir = preview ? 'out/preview' : 'out';
mkdirSync(dir, {recursive: true});
for (const v of versions) {
  const list = ORDER[v].map((p) => `file '${path.resolve(`out/parts/${p}.mp4`)}'`).join('\n') + '\n';
  writeFileSync(`out/parts/list-${v}.txt`, list);
  const vid = `out/parts/video-${v}.mp4`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `out/parts/list-${v}.txt`, '-c', 'copy', `out/parts/video-${v}.tmp.mp4`]);
  renameSync(`out/parts/video-${v}.tmp.mp4`, vid);
  const frames = count(vid);
  for (const suffix of ['', '-nomusic']) {
    const name = `qonsunun-qizi-${v === 'Areply' ? 'A-reply' : v}${suffix}${preview ? '-preview' : ''}`;
    const tmp = `${dir}/${name}.tmp.mp4`;
    // the picture sets the length (no -shortest: AAC padding would cost the last frames and break the loop)
    const secs = (frames / 30).toFixed(6);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', vid, '-i', `public/audio/mix-${v}${suffix}.wav`, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', 'apad', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-t', secs, '-movflags', '+faststart', tmp]);
    renameSync(tmp, `${dir}/${name}.mp4`);
    console.log(`${dir}/${name}.mp4 (${frames} frames)`);
  }
}
