import {Easing} from 'remotion';
import type {StrokeKey} from './geometry';
import tempo from './tempo.json';

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
};

// Brush easings from the brief (section 6). The Sting uses the same hands.
const X1_EASE: Bezier = [0.4, 0, 0.6, 0.85]; // press, glide, still moving at the lift
const X2_EASE: Bezier = [0.5, 0, 0.9, 0.6]; // speeds up into the quick lift
const O_EASE: Bezier = [0.45, 0, 0.75, 0.85]; // one breath; leaves the paper moving

// The brief's timeline (section 6), in frames at 60 fps, at the brief's pace.
const BRIEF: Record<Cut, Timeline> = {
	main: {
		duration: 1080, // 18.0 s at tempo 1
		fadeIn: [0, 90],
		fadeOut: [1008, 1080],
		strokes: {
			x1: {start: 180, end: 228, easing: X1_EASE},
			x2: {start: 312, end: 354, easing: X2_EASE},
			o: {start: 420, end: 600, easing: O_EASE},
		},
		light: [660, 840],
		dry: 48,
	},
	sting: {
		duration: 480, // 8.0 s at tempo 1, no fade-out: ends on the logo
		fadeIn: [0, 48],
		fadeOut: null,
		strokes: {
			x1: {start: 48, end: 90, easing: X1_EASE},
			x2: {start: 102, end: 138, easing: X2_EASE},
			o: {start: 156, end: 276, easing: O_EASE},
		},
		light: [276, 396],
		dry: 48,
	},
};

/** Pace of the whole film (src/tempo.json): every beat of the brief's timeline
 * is divided by it, so the rhythm is kept and only the speed changes. */
export const TEMPO = tempo.tempo;

const at = (f: number) => Math.round(f / TEMPO);
const scale = (tl: Timeline): Timeline => {
	const duration = at(tl.duration);
	return {
		duration,
		fadeIn: [at(tl.fadeIn[0]), at(tl.fadeIn[1])],
		// the fade-out always lands fully dark on the very last frame
		fadeOut: tl.fadeOut ? [at(tl.fadeOut[0]), duration - 1] : null,
		strokes: Object.fromEntries(
			Object.entries(tl.strokes).map(([k, s]) => [k, {...s, start: at(s.start), end: at(s.end)}]),
		) as Timeline['strokes'],
		light: [at(tl.light[0]), at(tl.light[1])],
		dry: at(tl.dry),
	};
};

export const TIMELINES: Record<Cut, Timeline> = {main: scale(BRIEF.main), sting: scale(BRIEF.sting)};

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
