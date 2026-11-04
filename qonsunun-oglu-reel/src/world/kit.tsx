// The world kit (section 3): windows, balconies, dishes and light. World units; no outlines, only shapes and light.
import React from 'react';
import {random} from 'remotion';
import {C} from '../theme';
import {mix, rgba, scale} from '../color';
import {noise1D} from '../motion';
import type {Box} from '../layout';
import type {BalcProps, WinProps} from './seed';

// ───────────────────────────── Light definitions ─────────────────────────────
export const AMBER_VARIANTS = [0, 0.5, 1].map((w) => ({
  id: `amb${Math.round(w * 10)}`,
  core: mix(C.amber, '#FFE2B0', 0.18 * (1 - w)),
  edge: mix(C.amberEdge, '#7A3410', 0.35 + 0.2 * w),
}));
export const amberId = (warm: number) => AMBER_VARIANTS[Math.min(2, Math.floor(warm * 3))].id;

/** Room light: a radial gradient (core up and centre, falloff to the edge colour). */
export const RoomGradient: React.FC<{id: string; core: string; edge: string}> = ({id, core, edge}) => (
  <radialGradient id={id} cx="50%" cy="34%" r="78%">
    <stop offset="0%" stopColor={core} />
    <stop offset="52%" stopColor={mix(core, edge, 0.55)} />
    <stop offset="100%" stopColor={scale(edge, 0.62)} />
  </radialGradient>
);
/** Facade spill: radial, 1.6× the window. */
export const GlowGradient: React.FC<{id: string; color: string; a?: number}> = ({id, color, a = 0.5}) => (
  <radialGradient id={id}>
    <stop offset="0%" stopColor={color} stopOpacity={a} />
    <stop offset="38%" stopColor={color} stopOpacity={a * 0.55} />
    <stop offset="70%" stopColor={color} stopOpacity={a * 0.16} />
    <stop offset="100%" stopColor={color} stopOpacity={0} />
  </radialGradient>
);

export const LightDefs: React.FC = () => (
  <defs>
    {AMBER_VARIANTS.map((v) => (
      <RoomGradient key={v.id} id={v.id} core={v.core} edge={v.edge} />
    ))}
    <RoomGradient id="tvRoom" core={C.tvWarm} edge="#8A5A2A" />
    <RoomGradient id="balcRoom" core={mix(C.amber, C.curtain, 0.25)} edge="#6E3A16" />
    <GlowGradient id="glowAmber" color={C.amber} />
    <GlowGradient id="glowEdge" color={C.amberEdge} a={0.55} />
    <GlowGradient id="glowTv" color={C.tvWarm} />
    <GlowGradient id="bloomWarm" color={C.amber} a={0.22} />
    <pattern id="tulle" width="7" height="40" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="3.2" height="40" fill="#FFFFFF" opacity="0.16" />
      <rect x="3.6" y="0" width="1.2" height="40" fill="#FFFFFF" opacity="0.07" />
    </pattern>
    <pattern id="lace" width="6" height="6" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="2" r="2.1" fill="#FFFFFF" opacity="0.18" />
    </pattern>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
      <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0" />
      <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.06" />
      <stop offset="62%" stopColor="#FFFFFF" stopOpacity="0" />
    </linearGradient>
    <linearGradient id="skyReflect" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={C.skyHorizon} stopOpacity="0.55" />
      <stop offset="100%" stopColor={C.skyTop} stopOpacity="0.2" />
    </linearGradient>
  </defs>
);

/** Facade spill + soft bloom around a light. */
export const Spill: React.FC<{r: Box; level: number; glowId?: string; bloom?: number}> = ({r, level, glowId = 'glowAmber', bloom = 0}) => {
  if (level <= 0.01) return null;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  return (
    <>
      {bloom > 0 && <ellipse cx={cx} cy={cy} rx={r.w * 1.45} ry={r.h * 1.4} fill="url(#bloomWarm)" opacity={Math.min(1, level * bloom)} />}
      <ellipse cx={cx} cy={cy + r.h * 0.04} rx={r.w * 0.8} ry={r.h * 0.8} fill={`url(#${glowId})`} opacity={Math.min(1, level)} />
    </>
  );
};

/** The current brightness of an ordinary window (old bulbs flicker slowly, TVs flicker). */
export const windowLevel = (p: WinProps, t: number) => {
  if (!p.lit) return 0;
  if (p.flicker) {
    const n = noise1D(`fl-${p.key}`, t * 0.9);
    const dip = noise1D(`fd-${p.key}`, t * 2.3) > 0.72 ? 0.45 : 1;
    return p.level * (0.72 + 0.28 * n) * dip;
  }
  if (p.thing === 'tv') return p.level * (0.6 + 0.25 * noise1D(`tv-${p.key}`, t * 5) + 0.15 * noise1D(`tv2-${p.key}`, t * 13));
  return p.level;
};

const FRAME: Record<string, string> = {pvc: '#2B303D', wood: '#1E1812', alu: '#262B35'};
const ink = (a = 0.86) => rgba(C.shadow, a);

/** A still interior shape: plant, lamp, shelf or the back of an armchair (TV). No people in ordinary windows. */
const Thing: React.FC<{r: Box; p: WinProps; core: string}> = ({r, p, core}) => {
  const bx = r.x + 8 + p.thingSide * (r.w - 40);
  const by = r.y + r.h;
  switch (p.thing) {
    case 'plant':
      return (
        <g fill={ink()}>
          <path d={`M${bx} ${by - 16} h18 l-2.5 16 h-13 z`} />
          {[-50, -22, 0, 24, 48].map((a, i) => (
            <ellipse key={i} cx={bx + 9} cy={by - 26} rx={3.6} ry={12 - Math.abs(a) / 12} transform={`rotate(${a} ${bx + 9} ${by - 16})`} />
          ))}
        </g>
      );
    case 'lamp':
      return (
        <g>
          <rect x={bx + 9} y={by - 58} width={2.4} height={58} fill={ink()} />
          <rect x={bx + 2} y={by - 3} width={16} height={3} fill={ink()} />
          <path d={`M${bx} ${by - 58} l5 -15 h10 l5 15 z`} fill={mix(core, '#FFFFFF', 0.35)} />
        </g>
      );
    case 'shelf': {
      const y = r.y + r.h * 0.3;
      const books = [5, 4, 6, 3.5, 5, 4.5, 3, 5.5];
      let x = r.x + 10 + p.thingSide * 30;
      return (
        <g fill={ink(0.8)}>
          <rect x={r.x + 6} y={y} width={r.w * 0.62} height={2.6} />
          {books.map((w, i) => {
            const h = 9 + ((i * 37) % 7);
            const el = <rect key={i} x={x} y={y - h} width={w} height={h} />;
            x += w + 0.8;
            return el;
          })}
        </g>
      );
    }
    case 'tv':
      return (
        <g fill={ink(0.9)}>
          <path d={`M${bx - 4} ${by} v-26 q0 -7 7 -7 h24 q7 0 7 7 v26 z`} />
        </g>
      );
    default:
      return null;
  }
};

/** An ordinary window: room light, a still shape, tulle, curtains, frame and mullions, sill. */
export const WindowView: React.FC<{r: Box; p: WinProps; level: number}> = ({r, p, level}) => {
  const variant = p.thing === 'tv' ? 'tvRoom' : amberId(p.warm);
  const core = p.thing === 'tv' ? C.tvWarm : C.amber;
  const fc = FRAME[p.frame];
  const lit = level > 0.01;
  return (
    <g>
      <rect x={r.x - 5} y={r.y + r.h + 1} width={r.w + 10} height={5} fill={lit ? mix('#26304A', C.amberEdge, 0.18 * level) : '#222B44'} />
      <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#090C17" />
      {lit ? (
        <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={`url(#${variant})`} opacity={level} />
      ) : (
        <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#skyReflect)" />
      )}
      {lit && p.thing !== 'none' && <Thing r={r} p={p} core={core} />}
      {lit && p.tulle && (
        <g opacity={0.55 + 0.45 * level}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#tulle)" />
          <rect x={r.x} y={r.y} width={r.w} height={7} fill="#FFFFFF" opacity={0.08} />
          <rect x={r.x} y={r.y + 7} width={r.w} height={5} fill="url(#lace)" />
        </g>
      )}
      {lit && p.curtain !== 'none' && (
        <g fill={C.curtain} opacity={0.32 * level + 0.08}>
          {(p.curtain === 'left' || p.curtain === 'both') && <path d={`M${r.x} ${r.y} h22 q-6 ${r.h * 0.5} 2 ${r.h} h-24 z`} />}
          {(p.curtain === 'right' || p.curtain === 'both') && <path d={`M${r.x + r.w} ${r.y} h-22 q6 ${r.h * 0.5} -2 ${r.h} h24 z`} />}
        </g>
      )}
      {!lit && <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#sheen)" />}
      <WindowFrame r={r} color={fc} mullion={p.mullion} glow={lit ? level : 0} core={core} />
    </g>
  );
};

/** Frame + mullions (backlit, so they read as dark bars with a faint lit inner edge). */
export const WindowFrame: React.FC<{r: Box; color: string; mullion: 0 | 1 | 2; glow: number; core: string; thin?: number}> = ({r, color, mullion, glow, core, thin = 1}) => {
  const t = 4.5 * thin;
  const m = 3 * thin;
  const bars: Box[] = [];
  if (mullion === 0) {
    bars.push({x: r.x + r.w * 0.5 - m / 2, y: r.y, w: m, h: r.h});
    bars.push({x: r.x, y: r.y + r.h * 0.3, w: r.w, h: m});
  } else if (mullion === 1) {
    bars.push({x: r.x + r.w * 0.34 - m / 2, y: r.y, w: m, h: r.h});
    bars.push({x: r.x + r.w * 0.66 - m / 2, y: r.y, w: m, h: r.h});
    bars.push({x: r.x + r.w * 0.34, y: r.y + r.h * 0.26, w: r.w * 0.32, h: m});
  } else {
    bars.push({x: r.x + r.w * 0.5 - m / 2, y: r.y, w: m, h: r.h});
    bars.push({x: r.x, y: r.y + r.h * 0.27, w: r.w, h: m});
    bars.push({x: r.x + r.w * 0.5, y: r.y + r.h * 0.62, w: r.w * 0.5, h: m * 0.8});
  }
  return (
    <g>
      <path
        d={`M${r.x - t} ${r.y - t} h${r.w + 2 * t} v${r.h + 2 * t} h${-(r.w + 2 * t)} z M${r.x} ${r.y} v${r.h} h${r.w} v${-r.h} z`}
        fill={color}
        fillRule="evenodd"
      />
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={color} />
      ))}
      {glow > 0 && (
        <path d={`M${r.x} ${r.y + r.h} v${-r.h} h${r.w}`} fill="none" stroke={core} strokeWidth={0.9 * thin} opacity={0.22 * glow} />
      )}
    </g>
  );
};

/** Satellite dish: they all point the same way, at the same satellite. */
export const Dish: React.FC<{x: number; y: number; s?: number; mirror?: boolean}> = ({x, y, s = 1, mirror = false}) => (
  <g transform={`translate(${x} ${y}) scale(${(mirror ? -1 : 1) * s} ${s})`}>
    <rect x={-1.2} y={0} width={2.4} height={10} fill="#1B2133" />
    <g transform={`scale(${mirror ? -1 : 1} 1) rotate(-38)`}>
      <ellipse cx={0} cy={0} rx={11.5} ry={4.2} fill="#3B4560" />
      <ellipse cx={0.6} cy={-0.8} rx={9.5} ry={2.8} fill="#4A5570" />
      <line x1={0} y1={0} x2={0} y2={-15} stroke="#2A3248" strokeWidth={1.2} />
      <circle cx={0} cy={-15.5} r={1.8} fill="#2A3248" />
    </g>
  </g>
);

/** A glazed (or open) balcony box. `actor` is drawn inside, behind the parapet. */
export const BalconyView: React.FC<{
  r: Box;
  p: BalcProps;
  level: number;
  roomGradient?: string;
  actor?: React.ReactNode;
  inside?: React.ReactNode;
  t: number;
  openSash?: boolean;
}> = ({r, p, level, roomGradient = 'balcRoom', actor, inside, t, openSash = false}) => {
  const parapetH = r.h * 0.44;
  const glassY = r.y + 6;
  const glassH = r.h - parapetH - 6;
  const frameC = p.kind === 'pvc' ? '#C9CBD2' : p.kind === 'wood' ? C.wood : C.alu;
  const frameShade = scale(frameC, 0.32 + 0.12 * p.tone);
  const lit = level > 0.01;
  const panes = p.panes;
  const paneW = r.w / panes;
  const parapetC = mix('#1A2236', '#242E48', p.tone);
  const sway = Math.sin(t * 1.3 + p.tone * 6) * 1.2;
  return (
    <g>
      {/* slab shadow on the facade below */}
      <rect x={r.x + 4} y={r.y + r.h} width={r.w - 8} height={9} fill={rgba(C.shadow, 0.55)} />
      {/* the room behind */}
      <rect x={r.x} y={glassY} width={r.w} height={r.h - 6} fill="#080B15" />
      {lit && <rect x={r.x} y={glassY} width={r.w} height={r.h - 6} fill={`url(#${roomGradient})`} opacity={level} />}
      {/* contents behind the glass */}
      {inside}
      {!inside && p.content === 'laundry' && (
        <g fill={ink(0.82)}>
          <line x1={r.x + 4} y1={glassY + 10} x2={r.x + r.w - 4} y2={glassY + 10} stroke={ink(0.7)} strokeWidth={0.8} />
          {[0.12, 0.3, 0.52, 0.74].map((u, i) => (
            <rect key={i} x={r.x + r.w * u} y={glassY + 10} width={11 + (i % 2) * 6} height={14 + (i % 3) * 5} rx={1} transform={`rotate(${sway * (i % 2 ? 1 : -1)} ${r.x + r.w * u} ${glassY + 10})`} />
          ))}
        </g>
      )}
      {!inside && p.content === 'bike' && (
        <g fill="none" stroke={ink(0.85)} strokeWidth={2.2}>
          <circle cx={r.x + r.w * 0.3} cy={r.y + r.h - parapetH - 9} r={12} />
          <circle cx={r.x + r.w * 0.66} cy={r.y + r.h - parapetH - 9} r={12} />
          <path d={`M${r.x + r.w * 0.3} ${r.y + r.h - parapetH - 9} l14 -16 h16 l-6 16 M${r.x + r.w * 0.44} ${r.y + r.h - parapetH - 25} l-3 -6 h7`} />
        </g>
      )}
      {!inside && p.content === 'jars' && (
        <g fill={ink(0.8)}>
          <rect x={r.x + 4} y={r.y + r.h - parapetH - 2} width={r.w - 8} height={2} />
          {Array.from({length: 7}, (_, i) => (
            <rect key={i} x={r.x + 8 + i * ((r.w - 20) / 7)} y={r.y + r.h - parapetH - 12 - (i % 2) * 3} width={9} height={10 + (i % 2) * 3} rx={2} />
          ))}
        </g>
      )}
      {!inside && p.content === 'plants' && (
        <g fill={ink(0.85)}>
          {[0.2, 0.5, 0.8].map((u, i) => (
            <g key={i}>
              <rect x={r.x + r.w * u - 5} y={r.y + r.h - parapetH - 10} width={10} height={10} />
              <ellipse cx={r.x + r.w * u} cy={r.y + r.h - parapetH - 18} rx={8} ry={9} />
            </g>
          ))}
        </g>
      )}
      {!inside && p.content === 'boxes' && (
        <g fill={ink(0.85)}>
          <rect x={r.x + 8} y={r.y + r.h - parapetH - 22} width={30} height={22} />
          <rect x={r.x + 40} y={r.y + r.h - parapetH - 14} width={22} height={14} />
        </g>
      )}
      {actor}
      {/* glazing */}
      {p.kind !== 'open' && (
        <g>
          <rect x={r.x} y={glassY} width={r.w} height={glassH} fill="url(#sheen)" />
          {Array.from({length: panes + 1}, (_, i) =>
            openSash && i > 0 && i < panes ? null : (
              <rect key={i} x={r.x + i * paneW - (i === 0 ? 0 : i === panes ? 3.2 : 1.6)} y={glassY} width={3.2} height={glassH} fill={frameShade} />
            ),
          )}
          <rect x={r.x} y={glassY} width={r.w} height={3.4} fill={frameShade} />
          {!openSash && <rect x={r.x} y={glassY + glassH * 0.22} width={r.w} height={2.2} fill={frameShade} />}
          {lit && <rect x={r.x} y={glassY + 3.4} width={r.w} height={0.9} fill={C.amber} opacity={0.18 * level} />}
        </g>
      )}
      {/* parapet */}
      <rect x={r.x} y={r.y + r.h - parapetH} width={r.w} height={parapetH} fill={parapetC} />
      {p.parapet === 'ribs' &&
        Array.from({length: Math.floor(r.w / 7)}, (_, i) => (
          <rect key={i} x={r.x + 3 + i * 7} y={r.y + r.h - parapetH + 2} width={2.6} height={parapetH - 4} fill={scale(parapetC, 1.18)} />
        ))}
      {p.parapet === 'panel' && <rect x={r.x + 4} y={r.y + r.h - parapetH + 6} width={r.w - 8} height={4} fill={scale(parapetC, 1.3)} />}
      {p.parapet === 'brick' &&
        Array.from({length: 5}, (_, row) => (
          <rect key={row} x={r.x} y={r.y + r.h - parapetH + 4 + row * (parapetH / 5)} width={r.w} height={1.2} fill={scale(parapetC, 0.7)} />
        ))}
      {p.parapet === 'bars' && (
        <g>
          <rect x={r.x} y={r.y + r.h - parapetH} width={r.w} height={parapetH} fill="#0B0F1C" />
          {Array.from({length: Math.floor(r.w / 9)}, (_, i) => (
            <rect key={i} x={r.x + 2 + i * 9} y={r.y + r.h - parapetH} width={2.2} height={parapetH} fill={scale(parapetC, 1.1)} />
          ))}
          <rect x={r.x} y={r.y + r.h - parapetH} width={r.w} height={3} fill={scale(parapetC, 1.25)} />
        </g>
      )}
      {lit && <rect x={r.x} y={r.y + r.h - parapetH} width={r.w} height={2} fill={C.amber} opacity={0.12 * level} />}
      {/* slab edge */}
      <rect x={r.x - 4} y={r.y + r.h - 1} width={r.w + 8} height={7} fill="#2A3350" />
      <rect x={r.x - 4} y={r.y + r.h - 1} width={r.w + 8} height={1.4} fill="#36406A" opacity={0.6} />
      {p.dish && <Dish x={p.dishSide === 'left' ? r.x + 10 : r.x + r.w - 10} y={r.y + r.h - parapetH - 2} s={1} />}
    </g>
  );
};

/** Seeded star field (faint; it is blue hour). */
export const STARS = Array.from({length: 46}, (_, i) => ({
  x: random(`st-x-${i}`) * 1080,
  y: random(`st-y-${i}`) * 900,
  r: 0.6 + random(`st-r-${i}`) * 1.3,
  a: 0.18 + random(`st-a-${i}`) * 0.4,
  tw: random(`st-t-${i}`) * 6,
}));
