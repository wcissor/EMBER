import {Easing, interpolate} from 'remotion';

// Motion tokens from the brief.
export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // entrances, 0.35-0.5 s
  inOut: Easing.bezier(0.65, 0, 0.35, 1), // moves
  linear: (x: number) => x,
};

export const dur = {
  enter: 0.42,
  word: 0.14, // one caption word arriving
  counter: 0.6, // counters count up over 0.6 s and stop on the number
  draw: 0.7, // drawn lines
  punch: 0.0, // punch-in cuts are cuts
} as const;

/** 0..1 progress of a timed move (seconds). */
export const prog = (t: number, start: number, length: number, easing: (x: number) => number = ease.inOut) =>
  length <= 0 ? (t >= start ? 1 : 0) : interpolate(t, [start, start + length], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

/** Entrance: opacity and a small rise, 0..1. */
export const enter = (t: number, start: number, length: number = dur.enter) => prog(t, start, length, ease.out);
