// Resolves all beats (src/timeline.ts) and writes build/timeline.json for the audio mixer and QA.
import {readFileSync, writeFileSync} from 'node:fs';
const {resolveTimeline} = await import('../src/timeline.ts');
const timings = JSON.parse(readFileSync('public/audio/voice_timings.json', 'utf8'));
const placement = JSON.parse(readFileSync('build/placement.json', 'utf8'));
const t = resolveTimeline(timings, placement);
const layout = await import('../src/layout.ts');
const out = {cards: layout.BEFORE_CARDS, beats: t.beats, barrage: t.barrage, wall: t.wall, music: t.music, lines: Object.fromEntries(t.lineIds.map((id) => [id, t.lineFrames(id)]))};
writeFileSync('build/timeline.json', JSON.stringify(out, null, 1));
if (process.argv.includes('--print')) {
  for (const [k, v] of Object.entries(t.beats)) console.log(k.padEnd(16), v);
  console.log('barrage', t.barrage.join(' '), '| wall', t.wall.join(' '));
}
