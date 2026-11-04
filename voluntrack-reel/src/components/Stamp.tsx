import React from 'react';
import {Img, interpolate, random, staticFile} from 'remotion';
import {C, FONT} from '../theme';
import {EASE, clamp01} from '../motion';
import {ASSETS} from '../data';
import {PERF} from '../perf';

export const stampLines = (text: string): string[] => {
  if (text === 'DEADLINE PASSED') return ['DEADLINE', 'PASSED'];
  if (text === 'LINK EXPIRED') return ['LINK', 'EXPIRED'];
  return [text];
};

/** Seeded stamp rotation in [-9°, +7°]. */
export const stampRotation = (seed: string) => -9 + random(`rot-${seed}`) * 16;

/** Canvas the inked texture is baked on (stamp centred). */
export const STAMP_BAKE_SIZE = {w: 1000, h: 600};

export const stampMetrics = (text: string, fontSize?: number) => {
  const lines = stampLines(text);
  const fs = fontSize ?? (lines.length > 1 ? 112 : text.length <= 5 ? 150 : 128);
  const longest = Math.max(...lines.map((l) => l.length));
  const textW = longest * fs * 0.5 + (longest - 1) * fs * 0.06;
  const padX = fs * 0.42;
  const padY = fs * 0.3;
  const W = textW + padX * 2;
  const H = lines.length * fs * 0.93 + padY * 2;
  return {lines, fs, W, H, padY};
};

const RX = 22;
const INNER = 14;

/**
 * The stamp itself: a rounded rectangle with a double rule (10 px outer, 3 px inner) and Barlow Condensed 800
 * at +6% tracking, in stamp red. Ink texture: feTurbulence + feDisplacementMap (3 px), ~10% gaps, 1 px edge bleed.
 * Drawn centred in a STAMP_BAKE_SIZE box.
 */
export const StampGraphic: React.FC<{text: string; fontSize?: number; seed: string; ink?: boolean}> = ({text, fontSize, seed, ink = true}) => {
  const {lines, fs, W, H, padY} = stampMetrics(text, fontSize);
  const {w: BW, h: BH} = STAMP_BAKE_SIZE;
  const x0 = (BW - W) / 2;
  const y0 = (BH - H) / 2;
  const seedN = Math.floor(random(`ink-${seed}`) * 900) + 1;
  const id = `ink-${seed}`;
  return (
    <svg width={BW} height={BH} viewBox={`0 0 ${BW} ${BH}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <defs>
        <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={seedN} result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale={6} xChannelSelector="R" yChannelSelector="G" result="disp" />
          <feTurbulence type="fractalNoise" baseFrequency="0.075" numOctaves={3} seed={seedN + 7} result="speck" />
          <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -14 0 0 0 9.6" result="holes" />
          <feComposite in="disp" in2="holes" operator="in" result="inked" />
          <feMorphology in="inked" operator="dilate" radius={0.5} result="bleed" />
          <feGaussianBlur in="bleed" stdDeviation={0.7} result="soft" />
          <feComponentTransfer in="soft" result="softA">
            <feFuncA type="linear" slope={0.55} />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="softA" />
            <feMergeNode in="inked" />
          </feMerge>
        </filter>
      </defs>
      <g filter={ink && !PERF.noInk ? `url(#${id})` : undefined}>
        <rect x={x0} y={y0} width={W} height={H} rx={RX} fill="none" stroke={C.stamp} strokeWidth={10} />
        <rect x={x0 + INNER} y={y0 + INNER} width={W - INNER * 2} height={H - INNER * 2} rx={RX - 8} fill="none" stroke={C.stamp} strokeWidth={3} />
        {lines.map((l, i) => (
          <text key={i} x={BW / 2} y={y0 + padY + fs * 0.93 * (i + 1) - fs * 0.14} textAnchor="middle" fontFamily={FONT.condensed} fontWeight={800} fontSize={fs} letterSpacing={`${fs * 0.06}px`} fill={C.stamp}>
            {l}
          </text>
        ))}
      </g>
    </svg>
  );
};

type Props = {
  text: string;
  frame: number;
  /** Contact frame. */
  hit: number;
  x: number;
  y: number;
  rot: number;
  fontSize?: number;
  seed: string;
  /** Already stamped (no fall, no echoes). */
  pre?: boolean;
  scale?: number;
};

/** Rubber stamp with the hit behaviour from section 4: falls 5 frames on `slam` (scale 1.35 → 1.0, blur 4 → 0),
 *  the ink spreads through a mask in 3 frames, two echo outlines grow 1.0 → 1.22 and fade over 18 frames. */
export const Stamp: React.FC<Props> = ({text, frame, hit, x, y, rot, fontSize, seed, pre = false, scale = 1}) => {
  if (!pre && frame < hit - 5) return null;
  const {W, H} = stampMetrics(text, fontSize);
  const {w: BW, h: BH} = STAMP_BAKE_SIZE;
  const fallT = pre ? 1 : clamp01((frame - (hit - 5)) / 5);
  const k = EASE.slam(fallT);
  const fallScale = 1.35 - 0.35 * k;
  const blur = pre ? 0 : 4 * (1 - k);
  const contact = pre || frame >= hit;
  const spread = pre ? 1 : contact ? clamp01((frame - hit + 1) / 3) : 0;
  const maskR = interpolate(spread, [0, 1], [0.32, 1.25]) * Math.hypot(W, H) * 0.5;
  const opacity = contact ? 1 : 0.55 + 0.35 * k;
  const mask = contact && spread < 1 ? `radial-gradient(circle ${maskR}px at 50% 50%, #000 82%, rgba(0,0,0,0) 100%)` : undefined;
  const echoes = pre || !contact
    ? null
    : [0, 4].map((d) => {
        const t = clamp01((frame - hit - d) / 18);
        if (t <= 0 || t >= 1) return null;
        const s = 1 + 0.22 * EASE.vtOut(t);
        return <rect key={d} x={(BW - W) / 2} y={(BH - H) / 2} width={W} height={H} rx={RX} fill="none" stroke={C.stamp} strokeWidth={6} opacity={(1 - t) * 0.55} transform={`translate(${BW / 2} ${BH / 2}) scale(${s}) translate(${-BW / 2} ${-BH / 2})`} />;
      });
  const baked = ASSETS.stamps;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - BW / 2,
        top: y - BH / 2,
        width: BW,
        height: BH,
        transform: `rotate(${rot}deg) scale(${fallScale * scale})`,
        opacity,
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
      }}
    >
      {echoes && (
        <svg width={BW} height={BH} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          {echoes}
        </svg>
      )}
      <div style={{position: 'absolute', inset: 0, filter: blur > 0.05 ? `blur(${blur}px)` : undefined, WebkitMaskImage: mask, maskImage: mask}}>
        {baked ? (
          <Img src={staticFile(`stamps/${seed}.png`)} style={{position: 'absolute', left: 0, top: 0, width: BW, height: BH}} />
        ) : (
          <StampGraphic text={text} fontSize={fontSize} seed={seed} ink={contact} />
        )}
      </div>
    </div>
  );
};
