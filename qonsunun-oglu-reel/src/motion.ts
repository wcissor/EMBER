// Motion tokens (section 4). Frames at 30 fps.
import {Easing, interpolate, random, spring} from 'remotion';
import {FPS} from './config';

export const EASE = {
  whip: Easing.bezier(0.7, 0, 0.3, 1),
  ui: Easing.bezier(0.16, 1, 0.3, 1),
  crane: Easing.bezier(0.65, 0, 0.35, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
};

export const SPRING = {
  pose: {damping: 14, stiffness: 220, mass: 0.8},
  settle: {damping: 200, stiffness: 120, mass: 1},
  hero: {damping: 19, stiffness: 170, mass: 1},
};

export const springAt = (frame: number, start: number, name: keyof typeof SPRING, durationInFrames?: number) =>
  spring({frame: frame - start, fps: FPS, config: SPRING[name], durationInFrames});

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (frame: number, start: number, dur: number, fn: (t: number) => number = EASE.out) =>
  interpolate(frame, [start, start + dur], [0, 1], {easing: fn, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** Seeded uniform in [a, b). */
export const rand = (seed: string, a = 0, b = 1) => a + random(seed) * (b - a);

export const noise1D = (seed: string, t: number) => {
  const i = Math.floor(t);
  const f = t - i;
  const a = random(`${seed}-${i}`) * 2 - 1;
  const b = random(`${seed}-${i + 1}`) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
};

/** warmOn: a 2-frame flicker, then a 6-frame ramp to full. Returns 0..1. */
export const warmOn = (frame: number, start: number) => {
  const t = frame - start;
  if (t < 0) return 0;
  if (t < 1) return 0.55;
  if (t < 2) return 0.15;
  return clamp01((t - 2) / 6) * 0.85 + 0.15;
};

/** blueOn: instantly to 120%, settling to 100% over 8 frames. Returns 0..1.2. */
export const blueOn = (frame: number, start: number) => {
  const t = frame - start;
  if (t < 0) return 0;
  return 1 + 0.2 * (1 - clamp01(t / 8));
};

/**
 * Pose-to-pose acting: anticipation (3–4 frames the other way), the move on the `pose` spring, follow-through.
 * Returns the blend 0→1 (overshooting ~14%), with a small negative dip before `start`.
 */
export const act = (frame: number, start: number, anticipation = 4, amount = 0.12) => {
  if (frame < start - anticipation) return 0;
  if (frame < start) return -amount * Math.sin(((frame - (start - anticipation)) / anticipation) * Math.PI * 0.5);
  return springAt(frame, start, 'pose');
};

/** Secondary motion (hood, apron strings, hair, lanyard) lags 2–3 frames. */
export const lagged = (fn: (f: number) => number, frame: number, lag = 3) => fn(frame - lag);
