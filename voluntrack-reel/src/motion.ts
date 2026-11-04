// Motion tokens (section 4). All timings in frames at 60 fps.
import {Easing, interpolate, spring, random} from 'remotion';
import {FPS} from './config';

export const EASE = {
  slam: Easing.bezier(0.55, 0, 1, 0.45),
  vtOut: Easing.bezier(0.16, 1, 0.3, 1),
  vtInOut: Easing.bezier(0.65, 0, 0.35, 1),
};

export const SPRING = {
  snap: {damping: 20, stiffness: 380, mass: 0.7},
  settle: {damping: 200, stiffness: 120, mass: 1},
  hero: {damping: 19, stiffness: 170, mass: 1},
};

export type SpringName = keyof typeof SPRING;

/** Spring from `start` (frame) — 0 before it. */
export const springAt = (frame: number, start: number, name: SpringName, durationInFrames?: number) =>
  spring({frame: frame - start, fps: FPS, config: SPRING[name], durationInFrames});

/** Eased 0→1 progress over [start, start+dur]. */
export const ease = (frame: number, start: number, dur: number, easing: (t: number) => number = EASE.vtOut) =>
  interpolate(frame, [start, start + dur], [0, 1], {easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mix = lerp;

/** Smooth 1-D value noise from Remotion's seeded random (no Math.random). Returns roughly -1..1. */
export const noise1D = (seed: string, t: number) => {
  const i = Math.floor(t);
  const f = t - i;
  const a = random(`${seed}-${i}`) * 2 - 1;
  const b = random(`${seed}-${i + 1}`) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
};

/** Two-octave handheld noise in px for time t (seconds) at base frequency hz. */
export const handheld = (seed: string, tSec: number, hz: number) =>
  noise1D(seed, tSec * hz) * 0.7 + noise1D(`${seed}-o2`, tSec * hz * 2.13) * 0.3;

/** Seeded uniform in [a, b). */
export const rand = (seed: string, a = 0, b = 1) => a + random(seed) * (b - a);

/**
 * Analytic damped spring (same physics as Remotion's spring) with an initial velocity, for moves that must
 * continue an earlier motion seamlessly (the hook card rising across the loop seam).
 * Returns displacement from the target at time u (frames) given x0 (px) and v0 (px/frame).
 */
export const dampedSpring = (u: number, x0: number, v0: number, cfg: {damping: number; stiffness: number; mass: number}) => {
  const w0 = Math.sqrt(cfg.stiffness / cfg.mass) / FPS; // rad/frame
  const zeta = cfg.damping / (2 * Math.sqrt(cfg.stiffness * cfg.mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const B = (v0 + zeta * w0 * x0) / wd;
    return Math.exp(-zeta * w0 * u) * (x0 * Math.cos(wd * u) + B * Math.sin(wd * u));
  }
  const r = -w0;
  return (x0 + (v0 - r * x0) * u) * Math.exp(r * u);
};
