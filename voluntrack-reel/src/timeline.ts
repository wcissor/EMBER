// Resolves every beat anchor in config.ts against the measured voice (voice_timings.json + placement.json).
// Pure functions: used by the Remotion composition (src/data.ts) and by the Node QA/audio scripts.
import {BEATS, BARRAGE_OFFSETS, WALL_EVERY, FPS, DURATION_FRAMES, LINES, type Anchor} from './config.ts';

export type Word = {word: string; start: number; end: number};
export type TimedLine = {id: string; voice: 'S' | 'V'; text: string; start: number; end: number; words: Word[]};
export type Placement = {
  lines: {id: string; tempo: number; shift_frames: number; start: number; end: number}[];
  music: {entryFrame: number; raysFrame: number; resolveFrame: number; logoFrame: number; applyFrame: number};
  violations: string[];
  boundaries: string;
};

export const toFrame = (sec: number) => Math.round(sec * FPS);

const clean = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}’']/gu, '');

export type Timeline = ReturnType<typeof resolveTimeline>;

export const resolveTimeline = (timings: TimedLine[], placement: Placement) => {
  const byId = new Map(timings.map((l) => [l.id, l]));
  const line = (id: string) => {
    const l = byId.get(id);
    if (!l) throw new Error(`line ${id} missing from voice_timings.json`);
    return l;
  };
  const word = (id: string, w: string) => {
    const l = line(id);
    const hit = l.words.find((x) => clean(x.word) === clean(w));
    if (!hit) throw new Error(`word "${w}" not in line ${id}`);
    return hit;
  };
  const beats: Record<string, number> = {};
  const resolve = (a: Anchor): number => {
    if ('abs' in a) return a.abs;
    if ('max' in a) return Math.max(...a.max.map(resolve));
    if ('min' in a) return Math.min(...a.min.map(resolve));
    if ('ref' in a) return resolveBeat(a.ref) + (a.off ?? 0);
    if ('music' in a) {
      const m = placement.music;
      const base = a.music === 'rays' ? m.raysFrame : a.music === 'entry' ? m.entryFrame : m.resolveFrame;
      return base + (a.off ?? 0);
    }
    if ('w' in a) {
      const w = word(a.w[0], a.w[1]);
      if (a.frac !== undefined) return toFrame(w.start + (w.end - w.start) * a.frac);
      return toFrame(a.edge === 'e' ? w.end : w.start) + (a.off ?? 0);
    }
    const l = line(a.line);
    return toFrame(a.edge === 'e' ? l.end : l.start) + (a.off ?? 0);
  };
  const resolveBeat = (name: string): number => {
    if (beats[name] !== undefined) return beats[name];
    const a = BEATS[name];
    if (!a) throw new Error(`unknown beat ${name}`);
    beats[name] = resolve(a);
    return beats[name];
  };
  Object.keys(BEATS).forEach(resolveBeat);

  const barrage = BARRAGE_OFFSETS.map((o) => beats.barrageStart + o);
  const wall: number[] = [];
  for (let f = barrage[barrage.length - 1] + WALL_EVERY; f <= beats.freeze - 4; f += WALL_EVERY) wall.push(f);

  const lineFrames = (id: string) => {
    const l = line(id);
    return {start: toFrame(l.start), end: toFrame(l.end)};
  };
  const wordFrames = (id: string) => line(id).words.map((w) => ({word: w.word, start: toFrame(w.start), end: toFrame(w.end)}));

  return {
    beats,
    barrage,
    wall,
    lines: timings,
    line,
    word,
    lineFrames,
    wordFrames,
    music: placement.music,
    violations: placement.violations,
    duration: DURATION_FRAMES,
    lineIds: LINES.map((l) => l.id),
  };
};
