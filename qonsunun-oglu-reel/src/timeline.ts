// Resolves every beat anchor in config.ts against the measured voice (voice_timings-<lang>.json).
// Pure functions: used by the composition (src/data.ts) and by the Node QA / audio scripts.
import {BEATS, FPS, DURATION_FRAMES, LINES, type Anchor, type Lang, type Voice} from './config.ts';

export type Word = {word: string; start: number; end: number};
export type TimedLine = {id: string; voice: Voice; text: string; start: number; end: number; words: Word[]};

export const toFrame = (sec: number) => Math.round(sec * FPS);

/** The caption text: the line's show text without its delivery tags. */
export const stripTags = (s: string) => s.replace(/\[[^\]]*\]\s*/g, '').replace(/\s+/g, ' ').trim();

export type Token = {text: string; joinNext: boolean};
const bare = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
/** Words as captioned and timed. Repeats joined by hyphens ("Yox-yox-yox!") are separate spoken words. */
export const tokenize = (s: string): Token[] => {
  const out: Token[] = [];
  for (const t of s.split(/\s+/).filter(Boolean)) {
    const parts = t.split('-');
    const repeat = parts.length > 1 && parts.every((p) => bare(p) === bare(parts[0]) && bare(p).length > 0);
    if (repeat) parts.forEach((p, i) => out.push({text: i < parts.length - 1 ? `${p}-` : p, joinNext: i < parts.length - 1}));
    else out.push({text: t, joinNext: false});
  }
  return out;
};

/** Caption lines → tokens per caption row (same order as the timed words). */
export const captionRows = (id: string, lang: Lang) => {
  const def = LINES.find((l) => l.id === id)!;
  return def[lang].caption.map((row) => tokenize(row));
};
export const lineTokens = (id: string, lang: Lang) => captionRows(id, lang).flat();

export type Timeline = ReturnType<typeof resolveTimeline>;

export const resolveTimeline = (timings: TimedLine[], lang: Lang) => {
  const byId = new Map(timings.map((l) => [l.id, l]));
  const line = (id: string) => {
    const l = byId.get(id);
    if (!l) throw new Error(`line ${id} missing from voice_timings-${lang}.json`);
    return l;
  };
  const beats: Record<string, number> = {};
  const resolve = (a: Anchor): number => {
    if ('abs' in a) return a.abs;
    if ('max' in a) return Math.max(...a.max.map(resolve));
    if ('min' in a) return Math.min(...a.min.map(resolve));
    if ('ref' in a) return resolveBeat(a.ref) + (a.off ?? 0);
    if ('w' in a) {
      const l = line(a.w[0]);
      const w = l.words[a.w[1]];
      if (!w) throw new Error(`word ${a.w[1]} missing in line ${a.w[0]}`);
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

  const lineFrames = (id: string) => {
    const l = line(id);
    return {start: toFrame(l.start), end: toFrame(l.end)};
  };
  const wordFrames = (id: string) => line(id).words.map((w) => ({word: w.word, start: toFrame(w.start), end: toFrame(w.end)}));

  return {lang, beats, lines: timings, line, lineFrames, wordFrames, duration: DURATION_FRAMES};
};
