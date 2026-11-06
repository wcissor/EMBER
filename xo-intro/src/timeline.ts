import {Easing} from 'remotion';
import type {StrokeKey} from './geometry';
import data from './timeline.json';

export type Cut = 'main' | 'sting';

type Bezier = [number, number, number, number];
type Span = [number, number];

export type StrokeTiming = {start: number; end: number; easing: Bezier};

export type Timeline = {
	/** Total length in frames (60 fps). */
	duration: number;
	/** #0D0D0D -> paper. Fully dark on the first frame, clear on the last. */
	fadeIn: Span;
	/** Paper -> #0D0D0D, fully dark on the last frame. Null: ends on the logo. */
	fadeOut: Span | null;
	strokes: Record<StrokeKey, StrokeTiming>;
	/** Warm light pass, left to right. */
	light: Span;
	/** Wet ink dries to the base over this many frames after each stroke. */
	dry: number;
};

// Brush easings from the brief (section 6). The Sting uses the same hands.
const EASE: Record<StrokeKey, Bezier> = {
	x1: [0.4, 0, 0.6, 0.85], // press, glide, still moving at the lift
	x2: [0.5, 0, 0.9, 0.6], // speeds up into the quick lift
	o: [0.45, 0, 0.75, 0.85], // one breath; leaves the paper moving
};

// Frames live in src/timeline.json (shared with the Python scripts). The client's
// cut writes the whole logo between 1.0 s and 2.0 s.
type CutJson = {
	duration: number;
	fadeIn: number[];
	fadeOut: number[] | null;
	strokes: Record<StrokeKey, number[]>;
	light: number[];
	dry: number;
};
const span = (v: number[]): Span => [v[0], v[1]];
const build = (c: CutJson): Timeline => ({
	duration: c.duration,
	fadeIn: span(c.fadeIn),
	fadeOut: c.fadeOut ? span(c.fadeOut) : null,
	strokes: Object.fromEntries(
		(Object.keys(EASE) as StrokeKey[]).map((k) => [k, {start: c.strokes[k][0], end: c.strokes[k][1], easing: EASE[k]}]),
	) as Timeline['strokes'],
	light: span(c.light),
	dry: c.dry,
});
const json = data as unknown as Record<Cut, CutJson>;

export const TIMELINES: Record<Cut, Timeline> = {main: build(json.main), sting: build(json.sting)};

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
