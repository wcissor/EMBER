// Voice envelopes for the light that breathes with the voice (±8%, attack 2 frames, release 6).
// With stems: visualizeAudio on public/audio/stems/<lang>/<voice>.wav (src/scenes/useStems.ts feeds STEM_ENV).
// Without: the measured word timings.
import type {Timeline} from '../timeline';
import type {Voice} from '../config';

type EnvFn = (voice: Voice, f: number) => number;
let STEM_ENV: EnvFn | null = null;
export const setStemEnv = (fn: EnvFn | null) => {
  STEM_ENV = fn;
};

const ATTACK = 2;
const RELEASE = 6;

/** 0..1 envelope of `voice` at frame f. */
export const voiceEnv = (TL: Timeline, voice: Voice, f: number): number => {
  if (STEM_ENV) {
    const v = STEM_ENV(voice, f);
    if (!Number.isNaN(v)) return v;
  }
  let best = 0;
  for (const l of TL.lines) {
    if (l.voice !== voice) continue;
    for (const w of l.words) {
      const s = w.start * 30;
      const e = w.end * 30;
      let v = 0;
      if (f >= s - ATTACK && f < s) v = (f - (s - ATTACK)) / ATTACK;
      else if (f >= s && f <= e) v = 1;
      else if (f > e && f < e + RELEASE) v = 1 - (f - e) / RELEASE;
      if (v > best) best = v;
    }
  }
  return best;
};
