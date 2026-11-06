import geo from './geometry.json';
import {mulberry32} from './random';

export type StrokeKey = 'x1' | 'x2' | 'o';
export type Format = 'vertical' | 'horizontal';

export const STROKES: StrokeKey[] = ['x1', 'x2', 'o'];
export const CANVAS_W = geo.canvas[0];
export const CANVAS_H = geo.canvas[1];
export const OPTICAL = {x: geo.opticalCentre[0], y: geo.opticalCentre[1]};
/** Logo is 600 px wide (ink bbox 737 px) in both formats: 0.814. */
export const CANVAS_SCALE = geo.logoWidthPx / (geo.inkBBox[2] - geo.inkBBox[0]);

export const layoutFor = (format: Format) => {
	const l = geo.layout[format];
	return {width: l.width, height: l.height, pivot: {x: l.pivot[0], y: l.pivot[1]}};
};

/** Logo canvas -> screen: X = pivot + k * (q - opticalCentre). */
export const logoTransform = (format: Format, push: number) => {
	const {pivot} = layoutFor(format);
	const k = CANVAS_SCALE * push;
	return {k, tx: pivot.x - k * OPTICAL.x, ty: pivot.y - k * OPTICAL.y};
};

// ---------------------------------------------------------------------------
// Bristled reveal masks (brief section 5).
//
// Each stroke mask is the brief's path stroked white at 110 px (X) / 130 px
// (O), butt caps, pathLength 1, dasharray "1 1", dashoffset = 1 - progress.
// So the leading edge reads as bristles rather than a wipe, the stroke is cut
// into fine parallel lanes (concentric arcs for the ensō). Their tips form
// pointed bristle clumps of different lengths on a rounded brush belly, and
// each tip tapers. The lanes overlap and tile the full width, so at
// progress 1 every lane is solid end to end: the exact stroke, the exact logo.
// The brush-edge filter (turbulence, displacement, blur) runs on top.
// ---------------------------------------------------------------------------

export type Lane = {d: string; width: number; lag: number; taper: number};
/** Coarser lanes for the wet-ink mask; their tip is the slowest member's. */
export type WetLane = {d: string; width: number; members: number[]};
export type StrokeMask = {
	key: StrokeKey;
	lanes: Lane[];
	wet: WetLane[];
	/** lag + taper headroom so every lane is complete at progress 1 */
	reach: number;
	region: {x: number; y: number; width: number; height: number};
};

const LANE_OVERLAP = 1.2; // px, hides anti-aliasing seams between lanes
const WET_GROUP = 6; // fine lanes per wet lane
const FILTER_MARGIN = 26;

type Bristle = {offset: number; width: number; lagPx: number; taperPx: number};

/** Smooth 1-D value noise, `cell` px per lattice step. */
const noise1d = (rng: () => number, span: number, cell: number) => {
	const g = Array.from({length: Math.ceil(span / cell) + 3}, () => rng());
	return (x: number) => {
		const t = x / cell;
		const i = Math.floor(t);
		const f = t - i;
		const s = f * f * (3 - 2 * f);
		return g[i] * (1 - s) + g[i + 1] * s;
	};
};

const bristles = (maskWidth: number, seed: number): Bristle[] => {
	const rng = mulberry32(seed);
	const half = maskWidth / 2;
	const lanes: {offset: number; width: number}[] = [];
	for (let pos = -half; pos < half - 0.01; ) {
		let w = 1.1 + 0.8 * rng();
		if (pos + w > half - 0.8) w = half - pos; // no sliver at the edge
		lanes.push({offset: pos + w / 2, width: w});
		pos += w;
	}
	// Bristle clumps: pointed tips every 3-9 px, mostly short, a few long.
	const clumps: {c: number; lead: number; hw: number}[] = [];
	for (let c = -half + 4 * rng(); c < half + 4; c += 2.4 + 6.5 * rng() ** 1.4) {
		clumps.push({c, lead: maskWidth * (0.02 + 0.3 * rng() ** 2.6), hw: 1.8 + 3.2 * rng()});
	}
	const leadMax = Math.max(...clumps.map((k) => k.lead));
	const wave = noise1d(rng, maskWidth + 8, 14);
	const tip = noise1d(rng, maskWidth + 8, 5);
	return lanes.map((l) => {
		const u = l.offset / half;
		let spike = 0;
		for (const k of clumps) spike = Math.max(spike, k.lead * Math.max(0, 1 - Math.abs(l.offset - k.c) / k.hw));
		const belly = 0.22 * maskWidth * u * u; // the brush belly leads, edges trail
		return {
			...l,
			lagPx: belly + 0.05 * maskWidth * wave(l.offset + half) + (leadMax - spike) + 0.8 * rng(),
			taperPx: 3 + 0.08 * maskWidth * tip(l.offset + half),
		};
	});
};

const fmt = (v: number) => v.toFixed(2);

const build = (
	key: StrokeKey,
	maskWidth: number,
	total: number,
	seed: number,
	pathAt: (offset: number) => string,
	region: StrokeMask['region'],
): StrokeMask => {
	const b = bristles(maskWidth, seed);
	const lanes: Lane[] = b.map((x) => ({
		d: pathAt(x.offset),
		width: x.width + LANE_OVERLAP,
		lag: x.lagPx / total,
		taper: x.taperPx / total,
	}));
	const wet: WetLane[] = [];
	for (let i = 0; i < b.length; i += WET_GROUP) {
		const m = b.slice(i, i + WET_GROUP);
		const lo = m[0].offset - m[0].width / 2;
		const hi = m[m.length - 1].offset + m[m.length - 1].width / 2;
		wet.push({d: pathAt((lo + hi) / 2), width: hi - lo + LANE_OVERLAP, members: m.map((_, j) => i + j)});
	}
	const reach = Math.max(...lanes.map((l) => l.lag)) + Math.max(...lanes.map((l) => l.taper));
	return {key, lanes, wet, reach, region};
};

const lineMask = (key: 'x1' | 'x2', seed: number): StrokeMask => {
	const s = geo.strokes[key];
	const [ax, ay] = s.from;
	const [bx, by] = s.to;
	const L = Math.hypot(bx - ax, by - ay);
	const ux = (bx - ax) / L;
	const uy = (by - ay) / L;
	const nx = -uy;
	const ny = ux;
	const pathAt = (o: number) =>
		`M ${fmt(ax - ux * s.startPad + nx * o)} ${fmt(ay - uy * s.startPad + ny * o)} L ${fmt(bx + nx * o)} ${fmt(by + ny * o)}`;
	const h = s.maskWidth / 2 + FILTER_MARGIN;
	const xs = [ax - ux * s.startPad, bx];
	const ys = [ay - uy * s.startPad, by];
	const x = Math.min(...xs) - h;
	const y = Math.min(...ys) - h;
	return build(key, s.maskWidth, L + s.startPad, seed, pathAt, {
		x,
		y,
		width: Math.max(...xs) + h - x,
		height: Math.max(...ys) + h - y,
	});
};

const circleMask = (seed: number): StrokeMask => {
	const s = geo.strokes.o;
	const [cx, cy] = s.centre;
	const r = s.radius;
	const th0 = Math.atan2(s.start[1] - cy, s.start[0] - cx); // ~8 o'clock
	// tangent for increasing screen angle = clockwise on screen
	const tx = -Math.sin(th0);
	const ty = Math.cos(th0);
	const pathAt = (o: number) => {
		const rho = r + o;
		const P = (t: number) => `${fmt(cx + rho * Math.cos(t))} ${fmt(cy + rho * Math.sin(t))}`;
		const pad = (s.startPad * rho) / r; // same angular pad on every lane
		const sx = cx + rho * Math.cos(th0);
		const sy = cy + rho * Math.sin(th0);
		const arc = `A ${fmt(rho)} ${fmt(rho)} 0 0 1`;
		return (
			`M ${fmt(sx - tx * pad)} ${fmt(sy - ty * pad)} L ${fmt(sx)} ${fmt(sy)} ` +
			`${arc} ${P(th0 + (2 * Math.PI) / 3)} ${arc} ${P(th0 + (4 * Math.PI) / 3)} ${arc} ${fmt(sx)} ${fmt(sy)}`
		);
	};
	const R = r + s.maskWidth / 2 + FILTER_MARGIN;
	return build('o', s.maskWidth, 2 * Math.PI * r + s.startPad, seed, pathAt, {
		x: cx - R,
		y: cy - R,
		width: 2 * R,
		height: 2 * R,
	});
};

export const STROKE_MASKS: Record<StrokeKey, StrokeMask> = {
	x1: lineMask('x1', 1101),
	x2: lineMask('x2', 2202),
	o: circleMask(3303),
};

/** Position of a lane's bristle tip at stroke progress p (path fraction).
 * <= 0 at p = 0 (nothing drawn); >= 1 + taper at p = 1 (solid, exact logo). */
export const laneTip = (p: number, lane: Lane, reach: number) => p * (1 + reach) - lane.lag;

/** Tapered tip: TAPER_STEPS dashes [0, tip - taper*j/N] with opacities
 * 1/(N-j) composite to a linear ramp from solid to the tip. */
export const TAPER_STEPS = 3;
export const taperSegments = (tip: number, taper: number) => {
	const out: {end: number; opacity: number}[] = [];
	for (let j = 0; j < TAPER_STEPS; j++) {
		const end = Math.min(1, tip - (taper * j) / TAPER_STEPS);
		if (end > 0) out.push({end, opacity: 1 / (TAPER_STEPS - j)});
	}
	return out;
};

/** Wet-lane tip: the slowest member's solid part, pinned at the path end. */
export const wetTip = (p: number, m: StrokeMask, w: WetLane) => {
	let f = Infinity;
	for (const i of w.members) {
		const l = m.lanes[i];
		f = Math.min(f, laneTip(p, l, m.reach) - l.taper);
	}
	return Math.min(1, f);
};
