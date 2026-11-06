import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {DRIP, Format, layoutFor, logoTransform, StrokeKey, STROKES} from './geometry';
import {
	ASSETS,
	dripFill,
	Fade,
	Grain,
	LightPass,
	LogoReveal,
	PaperCanvas,
	RevealState,
	usePreload,
	Vignette,
	WetInk,
} from './layers';
import {
	GROUND,
	KOMOREBI_DRIFT_DIR,
	KOMOREBI_DRIFT_PX,
	KOMOREBI_PARALLAX,
	KOMOREBI_SWAY_DIR,
	KOMOREBI_SWAY_PERIOD_S,
	KOMOREBI_SWAY_PX,
} from './look';
import {Cut, dripState, fadeAmount, lightProgress, PUSH_IN, pushProgress, strokePhase, TIMELINES} from './timeline';

export type XOProps = {
	format: Format;
	cut: Cut;
	/** QA switches. Defaults are the delivered film. */
	reveal?: 'animate' | 'full';
	hide?: StrokeKey[];
	komorebi?: boolean;
	light?: boolean;
	vignette?: boolean;
	grain?: boolean;
	fade?: boolean;
	wet?: boolean;
	pushIn?: boolean;
	showMask?: StrokeKey | null;
	/** the drop of fresh ink after the ensō (added at the client's request) */
	drip?: boolean;
};

const ALL_ASSETS = Object.values(ASSETS);

export const XO: React.FC<XOProps> = ({
	format,
	cut,
	reveal = 'animate',
	hide = [],
	komorebi = true,
	light = true,
	vignette = true,
	grain = true,
	fade = true,
	wet = true,
	pushIn = true,
	showMask = null,
	drip = true,
}) => {
	const ready = usePreload(ALL_ASSETS);
	const frame = useCurrentFrame();
	const {width, height, fps, durationInFrames} = useVideoConfig();
	const tl = TIMELINES[cut];
	const {pivot} = layoutFor(format);

	// One continuous push-in, 1.000 -> 1.035, pivoting on the logo's optical centre.
	const e = pushIn ? pushProgress(frame, durationInFrames) : 0;
	const push = 1 + PUSH_IN * e;
	const {k, tx, ty} = logoTransform(format, push);

	// Komorebi: 1.3x the paper's motion (parallax), a 24 px drift over the piece
	// and a +-10 px sway with a 7 s period. Already drifting on frame 0.
	const kScale = 1 + PUSH_IN * KOMOREBI_PARALLAX * e;
	const drift = (KOMOREBI_DRIFT_PX * frame) / (durationInFrames - 1);
	const sway = KOMOREBI_SWAY_PX * Math.sin((2 * Math.PI * frame) / (KOMOREBI_SWAY_PERIOD_S * fps));
	const kdx = KOMOREBI_DRIFT_DIR[0] * drift + KOMOREBI_SWAY_DIR[0] * sway;
	const kdy = KOMOREBI_DRIFT_DIR[1] * drift + KOMOREBI_SWAY_DIR[1] * sway;

	const state = Object.fromEntries(
		STROKES.map((s) => [s, strokePhase(frame, tl.strokes[s], tl.dry)]),
	) as RevealState;
	const full = reveal === 'full';
	const logo = {width, height, k, tx, ty, state, hide};
	const lp = light ? lightProgress(frame, tl) : null;
	const ds = drip && !hide.includes('o') ? dripState(frame, tl) : null;
	const dripProps = ds ? {state: ds, fill: dripFill(ds, lp, width, tx + k * DRIP.x)} : null;

	return (
		<AbsoluteFill style={{backgroundColor: GROUND, overflow: 'hidden'}}>
			<PaperCanvas
				width={width}
				height={height}
				frame={frame}
				ready={ready}
				pivot={pivot}
				push={push}
				komorebi={komorebi ? {scale: kScale, dx: kdx, dy: kdy} : null}
				light={lp}
			/>
			<LogoReveal {...logo} full={full} showMask={showMask} drip={dripProps} />
			{wet && !full ? <WetInk {...logo} /> : null}
			{light ? <LightPass width={width} height={height} progress={lp} k={k} tx={tx} ty={ty} /> : null}
			{vignette ? <Vignette width={width} height={height} /> : null}
			{grain ? <Grain width={width} height={height} frame={frame} /> : null}
			{fade ? <Fade amount={fadeAmount(frame, tl)} /> : null}
		</AbsoluteFill>
	);
};
