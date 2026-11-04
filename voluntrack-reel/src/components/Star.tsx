import React from 'react';
import {C, STAR_BLOOM} from '../theme';
import {FPS} from '../config';
import {noise1D} from '../motion';
import {LOGO} from '../logoData';

/**
 * The VolunTrack compass star, from logo.svg's measured geometry (src/logoData.ts): four straight-sided points
 * (N, E, S, W) with rounded tips; extended to the centre the sides meet on the diagonals at 37% of the tip radius.
 * rh / rv: horizontal / vertical tip radii (the audio stretches them); base: nominal tip radius. Centred at 0,0.
 */
export const starPath = (rh: number, rv: number, base: number) => {
  const d = LOGO.innerStar * base * Math.SQRT1_2;
  const inner: [number, number][] = [
    [d, -d],
    [d, d],
    [-d, d],
    [-d, -d],
  ];
  const tips: [number, number][] = [
    [0, -rv],
    [rh, 0],
    [0, rv],
    [-rh, 0],
  ];
  const round = (LOGO.tipRound / LOGO.tip) * base * 2.2; // where the tip rounding starts along each side
  const fmt = (p: [number, number]) => `${p[0].toFixed(3)} ${p[1].toFixed(3)}`;
  const toward = (from: [number, number], to: [number, number], dist: number): [number, number] => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const L = Math.hypot(dx, dy) || 1;
    return [from[0] + (dx / L) * dist, from[1] + (dy / L) * dist];
  };
  let p = `M ${fmt(inner[3])}`;
  for (let i = 0; i < 4; i++) {
    const tip = tips[i];
    const prev = inner[(i + 3) % 4];
    const next = inner[i];
    p += ` L ${fmt(toward(tip, prev, round))} Q ${fmt(tip)} ${fmt(toward(tip, next, round))} L ${fmt(next)}`;
  }
  return p + ' Z';
};

export type StarDrive = {low: number; high: number; loud: number};

type Props = {
  x: number;
  y: number;
  /** Star width/height in px (tip to tip). */
  size: number;
  frame: number;
  drive?: StarDrive;
  /** Extra bloom (0..1+) for the flare. */
  flare?: number;
  /** Vertical squash for the wink (1 = none). */
  squashY?: number;
  opacity?: number;
  glint?: number;
  /** Optional path override from logo.svg (normalized to a 100×100 box centred on 0,0). */
  pathOverride?: string;
  /** Over the paper wall additive blending vanishes on white; use normal blending there. */
  onPaper?: boolean;
};

export const Star: React.FC<Props> = ({x, y, size, frame, drive = {low: 0, high: 0, loud: 0}, flare = 0, squashY = 1, opacity = 1, glint = 1, pathOverride, onPaper = false}) => {
  const blend = onPaper ? 'normal' : 'screen';
  if (size <= 0.5 || opacity <= 0) return null;
  const t = frame / FPS;
  const breathe = 1 + 0.02 * Math.sin(2 * Math.PI * 0.25 * t);
  const R = (size / 2) * breathe;
  const rh = R * (1 + 0.35 * drive.low);
  const rv = R * (1 + 0.35 * drive.high);
  const path = pathOverride ?? starPath(rh, rv, R);
  const bloomGain = Math.min(1.8, 0.55 + 0.45 * drive.loud + flare);
  const pad = 64 * 3 + size * 2.5;
  const box = size + pad * 2;
  const glintAngle = noise1D('glint', t * 0.4) * 3;
  const glintLen = size * 4 * (1 + 0.25 * flare);
  const sx = pathOverride ? rh / 50 : 1;
  const sy = (pathOverride ? rv / 50 : 1) * squashY;
  const shape = (fill: string) => <path d={path} fill={fill} transform={`scale(${sx} ${sy})`} />;
  return (
    <div style={{position: 'absolute', left: x - box / 2, top: y - box / 2, width: box, height: box, opacity, pointerEvents: 'none'}}>
      {/* over the paper wall: a soft navy halo so the light reads as cutting through it */}
      {onPaper && (
        <div
          style={{
            position: 'absolute',
            left: box / 2 - size * 1.1,
            top: box / 2 - size * 1.1,
            width: size * 2.2,
            height: size * 2.2,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(8,13,28,0.55) 0%, rgba(8,13,28,0.28) 38%, rgba(8,13,28,0) 70%)',
          }}
        />
      )}
      {/* bloom: three blurred copies in blue */}
      {STAR_BLOOM.map((b, i) => (
        <svg
          key={i}
          width={box}
          height={box}
          viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`}
          style={{position: 'absolute', left: 0, top: 0, filter: `blur(${b.blur * Math.max(0.6, size / 72)}px)`, opacity: Math.min(1, b.opacity * bloomGain * (onPaper ? 1.15 : 1)), mixBlendMode: blend}}
        >
          {shape(C.blue)}
          {i === 2 && <circle r={size * 0.5} fill={C.blue} />}
        </svg>
      ))}
      {/* compass glint: two thin cross streaks, 4× the star's width, 30% */}
      <svg
        width={box}
        height={box}
        viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`}
        style={{position: 'absolute', left: 0, top: 0, opacity: (onPaper ? 0.6 : 0.3) * glint, transform: `rotate(${glintAngle}deg)`, mixBlendMode: blend}}
      >
        <defs>
          <linearGradient id="glintH" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={C.glow} stopOpacity="0" />
            <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="1" stopColor={C.glow} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="glintV" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={C.glow} stopOpacity="0" />
            <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="1" stopColor={C.glow} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x={-glintLen / 2} y={-1.2} width={glintLen} height={2.4} fill="url(#glintH)" />
        <rect x={-1.2} y={-glintLen / 2} width={2.4} height={glintLen} fill="url(#glintV)" />
      </svg>
      {/* body: white core, white-to-glow */}
      <svg width={box} height={box} viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <radialGradient id="starBody" cx="0" cy="0" r={size * 0.62} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.45" stopColor="#FFFFFF" />
            <stop offset="1" stopColor={C.glow} />
          </radialGradient>
        </defs>
        {shape('url(#starBody)')}
      </svg>
    </div>
  );
};
