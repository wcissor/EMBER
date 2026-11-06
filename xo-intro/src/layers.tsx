import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {CANVAS_H, CANVAS_W, DRIP, laneTip, STROKE_MASKS, StrokeKey, STROKES, taperSegments, wetTip} from './geometry';
import {
	BLACK,
	BRUSH_BLUR,
	BRUSH_DISPLACEMENT,
	BRUSH_TURBULENCE,
	GRAIN_HOLD_FRAMES,
	GRAIN_SIGMA,
	KOMOREBI_PAPER,
	LIGHT_BAND_FWHM,
	LIGHT_LOGO,
	LIGHT_PAPER,
	VIGNETTE,
	WARM,
	WET_BOOST,
	WET_LENGTH,
	WET_STEPS,
} from './look';
import {hash32, mulberry32} from './random';
import type {DripState, StrokePhase} from './timeline';
import {smooth} from './timeline';

export const ASSETS = {
	washi: staticFile('washi.png'),
	komorebi: staticFile('komorebi.png'),
	full: staticFile('layers/full.png'),
	x1: staticFile('layers/x1.png'),
	x2: staticFile('layers/x2.png'),
	o: staticFile('layers/o.png'),
	x2shade: staticFile('layers/x2-shade.png'),
};

const abs: React.CSSProperties = {position: 'absolute', left: 0, top: 0};

const imageCache = new Map<string, HTMLImageElement>();

/** Hold the render until every texture is decoded (SVG <image>, CSS masks and
 * canvas draws are not tracked by Remotion, so they must use a warm cache).
 * Returns true once ready; continueRender fires after that commit. */
export const usePreload = (urls: string[]) => {
	const [handle] = useState(() => delayRender('Decoding XO textures'));
	const [ready, setReady] = useState(false);
	useEffect(() => {
		Promise.all(
			urls.map(
				(u) =>
					new Promise<void>((resolve, reject) => {
						const img = new Image();
						img.onload = () =>
							img.decode().then(
								() => {
									imageCache.set(u, img);
									resolve();
								},
								() => {
									imageCache.set(u, img);
									resolve();
								},
							);
						img.onerror = () => reject(new Error(`Could not load ${u} — run \`npm run prep\` first.`));
						img.src = u;
					}),
			),
		)
			.then(() => setReady(true))
			.catch((err) => cancelRender(err));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	useEffect(() => {
		if (ready) continueRender(handle);
	}, [ready, handle]);
	return ready;
};

// ---------------------------------------------------------------------------
// Paper: washi (camera push-in) x komorebi (its own parallax drift and sway),
// plus the paper's share of the light pass — composited in float, dithered.
// ---------------------------------------------------------------------------
type Pivot = {x: number; y: number};

export const PaperCanvas: React.FC<{
	width: number;
	height: number;
	frame: number;
	ready: boolean;
	pivot: Pivot;
	push: number;
	komorebi: {scale: number; dx: number; dy: number} | null;
	light: number | null;
}> = ({width, height, frame, ready, pivot, push, komorebi, light}) => {
	const ref = useRef<HTMLCanvasElement>(null);
	const work = useMemo(() => {
		const c = document.createElement('canvas');
		c.width = width;
		c.height = height;
		return c;
	}, [width, height]);
	const kKey = komorebi ? `${komorebi.scale},${komorebi.dx},${komorebi.dy}` : 'off';
	useLayoutEffect(() => {
		const canvas = ref.current;
		const washi = imageCache.get(ASSETS.washi);
		const kom = imageCache.get(ASSETS.komorebi);
		if (!canvas || !ready || !washi || !kom) return;
		const ctx = canvas.getContext('2d', {willReadFrequently: true})!;
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		ctx.setTransform(push, 0, 0, push, pivot.x - 1200 * push, pivot.y - 1200 * push);
		ctx.drawImage(washi, 0, 0);
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		if (!komorebi && light === null) return;
		const img = ctx.getImageData(0, 0, width, height);
		const d = img.data;
		let k: Uint8ClampedArray | null = null;
		if (komorebi) {
			const kc = work.getContext('2d', {willReadFrequently: true})!;
			kc.setTransform(1, 0, 0, 1, 0, 0);
			kc.clearRect(0, 0, width, height);
			kc.imageSmoothingEnabled = true;
			kc.imageSmoothingQuality = 'high';
			kc.setTransform(komorebi.scale, 0, 0, komorebi.scale, pivot.x + komorebi.dx - 1200 * komorebi.scale, pivot.y + komorebi.dy - 1200 * komorebi.scale);
			kc.drawImage(kom, 0, 0);
			kc.setTransform(1, 0, 0, 1, 0, 0);
			k = kc.getImageData(0, 0, width, height).data;
		}
		// light band profile (columns), in levels per channel
		let band: Float32Array | null = null;
		if (light !== null) {
			const sigma = (LIGHT_BAND_FWHM * width) / 2.3548;
			const c = -2.5 * sigma + light * (width + 5 * sigma);
			band = new Float32Array(width);
			for (let x = 0; x < width; x++) band[x] = LIGHT_PAPER * Math.exp(-0.5 * ((x + 0.5 - c) / sigma) ** 2);
		}
		const rnd = mulberry32(hash32(frame * 7919 + 17));
		const shade = KOMOREBI_PAPER / 255;
		for (let y = 0, i = 0; y < height; y++) {
			for (let x = 0; x < width; x++, i += 4) {
				const a = k ? k[i + 3] : 0;
				const b = band ? band[x] : 0;
				if (a === 0 && b < 1e-4) continue; // untouched paper stays exact
				const v = d[i] * (1 - shade * a);
				const n = rnd() - 0.5; // unbiased dither (Uint8ClampedArray rounds)
				d[i] = v + WARM[0] * b + n;
				d[i + 1] = v + WARM[1] * b + n;
				d[i + 2] = v + WARM[2] * b + n;
			}
		}
		ctx.putImageData(img, 0, 0);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [frame, ready, width, height, push, pivot.x, pivot.y, kKey, light]);
	return <canvas ref={ref} width={width} height={height} style={abs} />;
};

// ---------------------------------------------------------------------------
// Logo reveal (SVG masks over the real logo pixels — never redrawn)
// ---------------------------------------------------------------------------
export type RevealState = Record<StrokeKey, StrokePhase>;

const BrushFilter: React.FC<{id: string; k: StrokeKey}> = ({id, k}) => {
	const r = STROKE_MASKS[k].region;
	return (
		<filter
			id={id}
			filterUnits="userSpaceOnUse"
			x={r.x}
			y={r.y}
			width={r.width}
			height={r.height}
			colorInterpolationFilters="sRGB"
		>
			<feTurbulence
				type="fractalNoise"
				baseFrequency={BRUSH_TURBULENCE.baseFrequency}
				numOctaves={BRUSH_TURBULENCE.numOctaves}
				seed={BRUSH_TURBULENCE.seed}
				result="noise"
			/>
			<feDisplacementMap
				in="SourceGraphic"
				in2="noise"
				scale={BRUSH_DISPLACEMENT}
				xChannelSelector="R"
				yChannelSelector="G"
				result="frayed"
			/>
			<feGaussianBlur in="frayed" stdDeviation={BRUSH_BLUR} />
		</filter>
	);
};

const strokeProgress = (s: StrokePhase) => (s.phase === 'drawing' ? s.progress : 1);

/** Reveal mask: brief's path, butt caps, pathLength 1, dasharray "1 1",
 * dashoffset = 1 - progress — one per bristle lane. */
const RevealMask: React.FC<{id: string; filterId: string; k: StrokeKey; state: StrokePhase}> = ({
	id,
	filterId,
	k,
	state,
}) => {
	const m = STROKE_MASKS[k];
	const p = strokeProgress(state);
	const settle = state.phase === 'drying' ? smooth(state.t) : 0;
	return (
		<mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={CANVAS_W} height={CANVAS_H}>
			<g filter={`url(#${filterId})`}>
				{m.lanes.map((lane, i) =>
					taperSegments(laneTip(p, lane, m.reach), lane.taper).map((seg, j) => (
						<path
							key={`${i}-${j}`}
							d={lane.d}
							fill="none"
							stroke="white"
							strokeOpacity={seg.opacity}
							strokeWidth={lane.width}
							strokeLinecap="butt"
							pathLength={1}
							strokeDasharray="1 1"
							strokeDashoffset={1 - seg.end}
						/>
					)),
				)}
			</g>
			{/* Once the brush has left, the mask settles to solid while the ink dries. */}
			{settle > 0 ? <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="white" opacity={settle} /> : null}
		</mask>
	);
};

const WET_SEGMENTS = Array.from({length: WET_STEPS}, (_, j) => ({
	len: (WET_LENGTH * (WET_STEPS - j)) / WET_STEPS,
	opacity: 1 / (WET_STEPS - j), // longest first: coverage ramps linearly 1 -> 0
}));

/** Wet mask: the last 12 % of each lane's drawn path, ramping from the brush. */
const WetMask: React.FC<{id: string; filterId: string; k: StrokeKey; state: StrokePhase}> = ({
	id,
	filterId,
	k,
	state,
}) => {
	const m = STROKE_MASKS[k];
	const p = strokeProgress(state);
	return (
		<mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={CANVAS_W} height={CANVAS_H}>
			<g filter={`url(#${filterId})`}>
				{m.wet.map((w, i) => {
					// wet zone sits on the solid ink behind the bristle tips (never ahead of the reveal);
					// pinned at the path end once the brush has left
					const f = wetTip(p, m, w);
					if (f <= 0) return null;
					return WET_SEGMENTS.map((seg, j) => (
						<path
							key={`${i}-${j}`}
							d={w.d}
							fill="none"
							stroke="white"
							strokeOpacity={seg.opacity}
							strokeWidth={w.width}
							strokeLinecap="butt"
							pathLength={1}
							strokeDasharray={`${seg.len} 2`}
							strokeDashoffset={-(f - seg.len)}
						/>
					));
				})}
			</g>
		</mask>
	);
};

const isActive = (s: StrokePhase) => s.phase === 'drawing' || s.phase === 'drying';

type LogoProps = {
	width: number;
	height: number;
	k: number;
	tx: number;
	ty: number;
	state: RevealState;
	full: boolean;
	hide: StrokeKey[];
	showMask: StrokeKey | null;
	drip?: {state: DripState; fill: string} | null;
};

// ---------------------------------------------------------------------------
// One drop of fresh ink: once the ensō is complete it gathers at the lowest
// solid point near the end of the stroke, runs a short way and stops (canvas
// coordinates; drawn under the logo so its neck tucks beneath the stroke).
// ---------------------------------------------------------------------------
const GOFUN = [230, 220, 209];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const smoothstep = (a: number, b: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

/** One closed outline: a neck that flares into the stroke, a column that
 * tapers as it runs, and a bead it swells into (smooth union, no hard neck). */
const DripShape: React.FC<{state: DripState; fill: string}> = ({state, fill}) => {
	const {x: x0, y: y0, inset, length, neck, column, bead} = DRIP;
	const s = state.swell;
	const rx = bead * s * (1 - 0.06 * state.speed);
	const ry = bead * s * (1 + 0.24 * state.speed);
	const len = lerp(1.6 * bead * s, length, state.run);
	const yb = y0 + len - ry; // bead centre
	const yTop = y0 - inset;
	const yBot = yb + ry;
	const top = (column[0] / 2) * Math.min(1, s * 1.25);
	const bot = (column[1] / 2) * Math.min(1, s * 1.25);
	const flare = (neck / 2) * Math.sqrt(s);
	const half = (y: number) => {
		const t = Math.min(1, Math.max(0, (y - y0) / Math.max(yb - y0, 1e-3)));
		let wc = lerp(top, bot, t) + (flare - top) * (1 - smoothstep(y0 - 1, y0 + 6, y));
		if (y > yb) wc *= 1 - smoothstep(yb, yBot, y);
		// pear-shaped bead: round below its centre, tapering up into the column above
		const q = (y - yb) / Math.max(ry, 1e-3);
		const up = 2.4; // the bead's shoulder reaches this many radii up the column
		const wb =
			q >= 0
				? q < 1
					? rx * Math.sqrt(1 - q * q)
					: 0
				: -q < up
					? rx * Math.pow(1 - Math.pow(-q / up, 1.7), 1.15)
					: 0;
		const w = Math.pow(wc ** 3 + wb ** 3, 1 / 3);
		return w * (1 + 0.045 * Math.sin(0.42 * (y - y0) + 1.3));
	};
	const xc = (y: number) => x0 + 0.35 * Math.sin((y - y0) / 11);
	// dense where the outline turns: the neck and the bead
	const ys: number[] = [];
	const nCol = 28;
	const yBead = Math.max(yTop, yb - 2.4 * ry);
	for (let i = 0; i < nCol; i++) ys.push(lerp(yTop, yBead, i / nCol));
	for (let i = 0; i <= 24; i++) ys.push(lerp(yBead, yBot, 0.5 - 0.5 * Math.cos((Math.PI * i) / 24)));
	const f = (v: number) => v.toFixed(2);
	const right = ys.map((y) => `${f(xc(y) + half(y))} ${f(y)}`);
	const left = ys
		.slice()
		.reverse()
		.map((y) => `${f(xc(y) - half(y))} ${f(y)}`);
	const d = `M ${right.join(' L ')} L ${left.join(' L ')} Z`;
	return <path d={d} fill={fill} />;
};

/** Fresh-ink colour for the drop: gofun cream, 108 % while wet, plus the warm
 * light band where it crosses (the drop is not in the logo-alpha light mask). */
export const dripFill = (state: DripState, light: number | null, width: number, screenX: number) => {
	let g = 0;
	if (light !== null) {
		const sigma = (LIGHT_BAND_FWHM * width) / 2.3548;
		const c = -2.5 * sigma + light * (width + 5 * sigma);
		g = Math.exp(-0.5 * ((screenX - c) / sigma) ** 2);
	}
	// wet sheen + warm light, scaled together so the brightest channel stays at
	// 250: a fresh drop catching the light, never clipped to flat white
	const boost = GOFUN.map((c, i) => c * WET_BOOST * state.wet + WARM[i] * LIGHT_LOGO * g);
	const k = Math.min(1, (250 - GOFUN[0]) / Math.max(boost[0], 1e-6));
	const ch = (i: number) => Math.round(GOFUN[i] + boost[i] * k);
	return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
};

export const LogoReveal: React.FC<LogoProps> = ({width, height, k, tx, ty, state, full, hide, showMask, drip}) => (
	<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={abs}>
		<defs>
			{full
				? null
				: STROKES.filter((s) => isActive(state[s])).map((s) => (
						<React.Fragment key={s}>
							<BrushFilter id={`brush-${s}`} k={s} />
							<RevealMask id={`reveal-${s}`} filterId={`brush-${s}`} k={s} state={state[s]} />
						</React.Fragment>
					))}
		</defs>
		<g transform={`matrix(${k} 0 0 ${k} ${tx} ${ty})`}>
			{drip ? <DripShape state={drip.state} fill={drip.fill} /> : null}
			{/* The three layers partition the logo's alpha, so adding them (plus-lighter)
			    in an isolated group rebuilds the exact logo — no seams where they meet. */}
			<g style={{isolation: 'isolate'}}>
				{STROKES.map((s) => {
					const visible = !hide.includes(s) && (full || state[s].phase !== 'hidden');
					const masked = !full && isActive(state[s]);
					if (showMask === s) {
						return masked ? (
							<rect key={s} x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="white" mask={`url(#reveal-${s})`} />
						) : null;
					}
					return (
						<image
							key={s}
							href={ASSETS[s]}
							x={0}
							y={0}
							width={CANVAS_W}
							height={CANVAS_H}
							preserveAspectRatio="none"
							visibility={visible ? 'visible' : 'hidden'}
							mask={visible && masked ? `url(#reveal-${s})` : undefined}
							style={{mixBlendMode: 'plus-lighter'}}
						/>
					);
				})}
			</g>
			{/* X2's dark edge lines where it lies over X1: X1 stays continuous on its
			    own; X2 brings this ground-coloured shade with its own mask. */}
			{(() => {
				const visible = !hide.includes('x2') && showMask !== 'x2' && (full || state.x2.phase !== 'hidden');
				const masked = !full && isActive(state.x2);
				return (
					<image
						href={ASSETS.x2shade}
						x={0}
						y={0}
						width={CANVAS_W}
						height={CANVAS_H}
						preserveAspectRatio="none"
						visibility={visible ? 'visible' : 'hidden'}
						mask={visible && masked ? 'url(#reveal-x2)' : undefined}
					/>
				);
			})()}
		</g>
	</svg>
);

/** Fresh ink at 108 %: the same layer pixels at 8 % added light (plus-lighter),
 * masked to the trailing 12 % of the path; dries over 48 frames. */
export const WetInk: React.FC<Omit<LogoProps, 'full' | 'showMask' | 'drip'>> = ({width, height, k, tx, ty, state, hide}) => {
	const wetness = (s: StrokePhase) =>
		s.phase === 'drawing' ? 1 : s.phase === 'drying' ? 1 - smooth(s.t) : 0;
	return (
		<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{...abs, mixBlendMode: 'plus-lighter'}}>
			<defs>
				{STROKES.filter((s) => isActive(state[s]) && !hide.includes(s)).map((s) => (
					<React.Fragment key={s}>
						<BrushFilter id={`brushw-${s}`} k={s} />
						<WetMask id={`wet-${s}`} filterId={`brushw-${s}`} k={s} state={state[s]} />
					</React.Fragment>
				))}
			</defs>
			<g transform={`matrix(${k} 0 0 ${k} ${tx} ${ty})`}>
				{STROKES.map((s) => {
					const w = hide.includes(s) ? 0 : wetness(state[s]);
					return (
						<image
							key={s}
							href={ASSETS[s]}
							x={0}
							y={0}
							width={CANVAS_W}
							height={CANVAS_H}
							preserveAspectRatio="none"
							visibility={w > 0 ? 'visible' : 'hidden'}
							opacity={WET_BOOST * w}
							mask={w > 0 ? `url(#wet-${s})` : undefined}
						/>
					);
				})}
			</g>
		</svg>
	);
};

// ---------------------------------------------------------------------------
// Light pass, vignette, grain (screen space). Gradients are dithered so the
// 8-bit result never bands.
// ---------------------------------------------------------------------------
const useCanvas = (draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, deps: unknown[]) => {
	const ref = useRef<HTMLCanvasElement>(null);
	useLayoutEffect(() => {
		const c = ref.current;
		if (!c) return;
		const ctx = c.getContext('2d', {willReadFrequently: false});
		if (!ctx) return;
		draw(ctx, c.width, c.height);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);
	return ref;
};

const drawBand = (ctx: CanvasRenderingContext2D, w: number, h: number, amp: number, sigma: number, seed: number) => {
	const img = ctx.createImageData(w, h);
	const d = img.data;
	const rnd = mulberry32(seed);
	const prof = new Float32Array(w);
	for (let x = 0; x < w; x++) prof[x] = amp * 255 * Math.exp(-0.5 * ((x + 0.5 - w / 2) / sigma) ** 2);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			d[i] = WARM[0];
			d[i + 1] = WARM[1];
			d[i + 2] = WARM[2];
			d[i + 3] = Math.floor(prof[x] + rnd());
		}
	}
	ctx.putImageData(img, 0, 0);
};

const BandCanvas: React.FC<{width: number; height: number; amp: number; sigma: number; seed: number; style: React.CSSProperties}> = ({
	width,
	height,
	amp,
	sigma,
	seed,
	style,
}) => {
	const ref = useCanvas((ctx, w, h) => drawBand(ctx, w, h, amp, sigma, seed), [width, height, amp, sigma, seed]);
	return <canvas ref={ref} width={width} height={height} style={style} />;
};

/** The logo's share of the light pass: a warm band (plus-lighter) masked by
 * the full logo alpha (the pass only runs once the logo is complete). */
export const LightPass: React.FC<{
	width: number;
	height: number;
	progress: number | null;
	k: number;
	tx: number;
	ty: number;
}> = ({width, height, progress, k, tx, ty}) => {
	const sigma = (LIGHT_BAND_FWHM * width) / 2.3548;
	const bandW = Math.ceil(6 * sigma);
	const centre = -2.5 * sigma + (progress ?? 0) * (width + 5 * sigma);
	const left = centre - bandW / 2;
	const mask = `url(${ASSETS.full})`;
	return (
		<div
			style={{
				...abs,
				width,
				height,
				visibility: progress !== null ? 'visible' : 'hidden',
				mixBlendMode: 'plus-lighter',
				maskImage: mask,
				WebkitMaskImage: mask,
				maskSize: `${CANVAS_W * k}px ${CANVAS_H * k}px`,
				WebkitMaskSize: `${CANVAS_W * k}px ${CANVAS_H * k}px`,
				maskPosition: `${tx}px ${ty}px`,
				WebkitMaskPosition: `${tx}px ${ty}px`,
				maskRepeat: 'no-repeat',
				WebkitMaskRepeat: 'no-repeat',
			}}
		>
			<BandCanvas
				width={bandW}
				height={height}
				amp={LIGHT_LOGO}
				sigma={sigma}
				seed={13}
				style={{...abs, transform: `translateX(${left}px)`}}
			/>
		</div>
	);
};

export const Vignette: React.FC<{width: number; height: number}> = ({width, height}) => {
	const ref = useCanvas(
		(ctx, w, h) => {
			const img = ctx.createImageData(w, h);
			const d = img.data;
			const rnd = mulberry32(5);
			for (let y = 0; y < h; y++) {
				const dy = (y + 0.5 - h / 2) / (h / 2);
				for (let x = 0; x < w; x++) {
					const dx = (x + 0.5 - w / 2) / (w / 2);
					const r = Math.sqrt(dx * dx + dy * dy) / Math.SQRT2; // 0 centre, 1 corners
					const t = Math.min(1, Math.max(0, (r - 0.3) / 0.7));
					const v = VIGNETTE * t * t * (3 - 2 * t);
					d[(y * w + x) * 4 + 3] = Math.floor(v * 255 + rnd());
				}
			}
			ctx.putImageData(img, 0, 0);
		},
		[width, height],
	);
	return <canvas ref={ref} width={width} height={height} style={abs} />;
};

export const Grain: React.FC<{width: number; height: number; frame: number}> = ({width, height, frame}) => {
	const seed = Math.floor(frame / GRAIN_HOLD_FRAMES);
	const buf = useMemo(() => ({a: new Float32Array(width * height), b: new Float32Array(width * height)}), [width, height]);
	const ref = useCanvas(
		(ctx, w, h) => {
			const rnd = mulberry32(hash32(seed + 0x51ed));
			const {a, b} = buf;
			const n = w * h;
			for (let i = 0; i < n; i++) a[i] = rnd() + rnd() - 1; // triangular, sd 0.408
			// [1 2 1] x [1 2 1] / 16: grain clumps of ~1.2 px, like film
			for (let y = 0; y < h; y++) {
				const o = y * w;
				b[o] = (3 * a[o] + a[o + 1]) / 4;
				for (let x = 1; x < w - 1; x++) b[o + x] = (a[o + x - 1] + 2 * a[o + x] + a[o + x + 1]) / 4;
				b[o + w - 1] = (a[o + w - 2] + 3 * a[o + w - 1]) / 4;
			}
			for (let x = 0; x < w; x++) {
				a[x] = (3 * b[x] + b[x + w]) / 4;
				a[(h - 1) * w + x] = (b[(h - 2) * w + x] + 3 * b[(h - 1) * w + x]) / 4;
			}
			for (let y = 1; y < h - 1; y++) {
				const o = y * w;
				for (let x = 0; x < w; x++) a[o + x] = (b[o + x - w] + 2 * b[o + x] + b[o + x + w]) / 4;
			}
			const scale = GRAIN_SIGMA / (0.408 * 0.375);
			const img = ctx.createImageData(w, h);
			const d = img.data;
			for (let i = 0, j = 0; i < n; i++, j += 4) {
				// Uint8ClampedArray clamps and rounds: mean stays at 127.5 (overlay-neutral)
				d[j] = d[j + 1] = d[j + 2] = 127.5 + a[i] * scale;
				d[j + 3] = 255;
			}
			ctx.putImageData(img, 0, 0);
		},
		[seed, width, height],
	);
	return <canvas ref={ref} width={width} height={height} style={{...abs, mixBlendMode: 'overlay'}} />;
};

export const Fade: React.FC<{amount: number}> = ({amount}) =>
	amount > 0 ? <div style={{...abs, right: 0, bottom: 0, backgroundColor: BLACK, opacity: amount}} /> : null;
