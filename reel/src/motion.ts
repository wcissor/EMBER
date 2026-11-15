import {Easing, interpolate} from 'remotion';

// Motion tokens from the brief.
export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // things arriving
  inOut: Easing.bezier(0.65, 0, 0.35, 1), // moves and morphs
  linear: (x: number) => x, // packets and signals: constant speed
};

export const dur = {
  out: 0.5,
  inOut: 0.6,
  draw: 0.8,
  word: 0.18, // one caption word arriving
  keyword: 0.25, // a keyword turning olive
  wipe: 0.6, // the olive hairline sweeping down
} as const;

export const STREAM = {packets: 160, signal: 120} as const; // px per second, constant

// 0..1 progress of a timed move. t, start and length in seconds.
export const prog = (t: number, start: number, length: number, easing: (x: number) => number = ease.inOut) =>
  interpolate(t, [start, start + length], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

// Camera: still, or a slow push from 1.00 to 1.03 across a scene.
export const push = (t: number, sceneLength: number) => 1 + 0.03 * Math.min(1, Math.max(0, t / sceneLength));
