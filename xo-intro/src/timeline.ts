import {Easing} from 'remotion';
import type {StrokeKey} from './geometry';

export type Cut = 'main' | 'sting';

type Bezier = [number, number, number, number];

export type StrokeTiming = {start: number; end: number; easing: Bezier};

export type Timeline = {
	/** Total length in frames (60 fps). */
	duration: number;
	/** #0D0D0D -> paper. Fully dark on the first frame, clear on the last. */
	fadeIn: [number, number];
	/** Paper -> #0D0D0D, fully dark on the last frame. Null: ends on the logo. */
	fadeOut: [number, number] | null;
	strokes: Record<StrokeKey, StrokeTiming>;
	/** Warm light pass, left to right. */
	light: [number, number];
	/** Wet ink dries to the base over this many frames after each stroke. */
	dry: number;
	/** One drop of fresh ink after the ensō: forms (swell), runs, then dries. */
	drip: {start: number; swell: number; run: number; dry: number};
};

// Brush easings from the brief (section 6). The Sting uses the same hands.
const X1_EASE: Bezier = [0.4, 0, 0.6, 0.85]; // press, glide, still moving at the lift
const X2_EASE: Bezier = [0.5, 0, 0.9, 0.6]; // speeds up into the quick lift
const O_EASE: Bezier = [0.45, 0, 0.75, 0.85]; // one breath; leaves the paper moving

export const TIMELINES: Record<Cut, Timeline> = {
	main: {
		duration: 1080, // 18.0 s
		fadeIn: [0, 90],
		fadeOut: [1008, 1079],
		strokes: {
			x1: {start: 180, end: 228, easing: X1_EASE},
			x2: {start: 312, end: 354, easing: X2_EASE},
			o: {start: 420, end: 600, easing: O_EASE},
		},
		light: [660, 840],
		dry: 48,
		drip: {start: 612, swell: 24, run: 100, dry: 60},
	},
	sting: {
		duration: 480, // 8.0 s, no fade-out: ends on the logo
		fadeIn: [0, 48],
		fadeOut: null,
		strokes: {
			x1: {start: 48, end: 90, easing: X1_EASE},
			x2: {start: 102, end: 138, easing: X2_EASE},
			o: {start: 156, end: 276, easing: O_EASE},
		},
		light: [276, 396],
		dry: 48,
		drip: {start: 282, swell: 18, run: 72, dry: 48},
	},
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ramp = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
const sineInOut = Easing.inOut(Easing.sin);

/** Eased 1.000 -> 1.035 over the whole piece (camera push-in). */
export const PUSH_IN = 0.035;
const pushEase = Easing.bezier(0.45, 0, 0.55, 1);
export const pushProgress = (frame: number, duration: number) =>
	pushEase(clamp01(frame / (duration - 1)));

/** 0 = clear, 1 = #0D0D0D. */
export const fadeAmount = (frame: number, tl: Timeline) => {
	let dark = 1 - sineInOut(ramp(frame, tl.fadeIn[0], tl.fadeIn[1]));
	if (tl.fadeOut) {
		dark = Math.max(dark, sineInOut(ramp(frame, tl.fadeOut[0], tl.fadeOut[1])));
	}
	return dark;
};

export type StrokePhase =
	| {phase: 'hidden'}
	| {phase: 'drawing'; progress: number}
	| {phase: 'drying'; t: number}
	| {phase: 'done'};

const easings = new Map<string, (t: number) => number>();
const bezier = (b: Bezier) => {
	const k = b.join(',');
	let e = easings.get(k);
	if (!e) {
		e = Easing.bezier(...b);
		easings.set(k, e);
	}
	return e;
};

export const strokePhase = (frame: number, s: StrokeTiming, dry: number): StrokePhase => {
	if (frame <= s.start) return {phase: 'hidden'};
	if (frame < s.end) {
		return {phase: 'drawing', progress: bezier(s.easing)(ramp(frame, s.start, s.end))};
	}
	if (frame < s.end + dry) return {phase: 'drying', t: (frame - s.end) / dry};
	return {phase: 'done'};
};

/** Light-band centre progress 0..1 while the pass is on screen, else null. */
export const lightProgress = (frame: number, tl: Timeline) => {
	const [a, b] = tl.light;
	if (frame <= a || frame >= b) return null;
	return sineInOut(ramp(frame, a, b));
};

export const smooth = sineInOut;

export type DripState = {
	/** 0..1 bead size while it forms at the edge */
	swell: number;
	/** 0..1 of the full run length */
	run: number;
	/** speed, 0..1, for the bead's slight stretch while it moves */
	speed: number;
	/** 1 fresh -> 0 dry */
	wet: number;
};

const dripRun = Easing.bezier(0.33, 0, 0.18, 1); // eases away, slows as the ink runs out
const dripSwell = Easing.out(Easing.cubic);

export const dripState = (frame: number, tl: Timeline): DripState | null => {
	const d = tl.drip;
	const t = frame - d.start;
	if (t <= 0) return null;
	const swell = dripSwell(Math.min(1, t / d.swell));
	const r = ramp(t, d.swell, d.swell + d.run);
	const run = dripRun(r);
	const speed = r > 0 && r < 1 ? Math.min(1, (dripRun(Math.min(1, r + 0.02)) - run) / 0.02 / 1.6) : 0;
	const wet = 1 - sineInOut(ramp(t, d.swell + d.run, d.swell + d.run + d.dry));
	return {swell, run, speed, wet};
};
