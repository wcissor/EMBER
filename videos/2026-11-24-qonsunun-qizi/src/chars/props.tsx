// Props held or used by the characters (figure units unless noted). Warm or neutral only: VolunTrack colours come in
// through the `screen` props from VolunTrack-tagged callers.
import React from 'react';
import {C} from '../theme';
import {rgba, mix} from '../color';
import {clamp01, noise1D} from '../motion';

/** A phone: the screen lights the face (white for reels; VolunTrack passes its own colour). */
export const Phone: React.FC<{screen: string; level?: number; angle?: number; glow?: number; s?: number}> = ({screen, level = 1, angle = 0, glow = 1, s = 1}) => (
  <g transform={`rotate(${angle}) scale(${s})`}>
    {glow > 0 && (
      <>
        <defs>
          <radialGradient id={`pg-${screen.replace('#', '')}`}>
            <stop offset="0%" stopColor={screen} stopOpacity={0.5} />
            <stop offset="45%" stopColor={screen} stopOpacity={0.16} />
            <stop offset="100%" stopColor={screen} stopOpacity={0} />
          </radialGradient>
        </defs>
        <ellipse cx={0} cy={-3} rx={22} ry={20} fill={`url(#pg-${screen.replace('#', '')})`} opacity={glow * level} />
      </>
    )}
    <rect x={-4.2} y={-7.5} width={8.4} height={14} rx={1.6} fill={C.shadow} />
    <rect x={-3.2} y={-6.4} width={6.4} height={11.6} rx={1} fill={screen} opacity={0.35 + 0.65 * level} />
  </g>
);

/** Armudu tea glass on a saucer, steam rising. */
export const TeaGlass: React.FC<{t: number; steam?: number; s?: number}> = ({t, steam = 1, s = 1}) => (
  <g transform={`scale(${s})`}>
    <ellipse cx={0} cy={1.5} rx={7.5} ry={1.8} fill={C.shadow} />
    <path d="M-3.4 0 C-5.6 -3 -2.4 -6 -3.2 -9.5 L-3.8 -12 h7.6 L3.2 -9.5 C2.4 -6 5.6 -3 3.4 0 Z" fill={mix('#B4502A', C.amber, 0.25)} opacity={0.92} />
    <path d="M-3.8 -12 h7.6 v-1.4 h-7.6 z" fill={rgba(C.phoneWhite, 0.55)} />
    <path d="M-2.2 -2.5 C-3.4 -4.5 -1.4 -6.5 -2 -9" stroke={rgba('#FFFFFF', 0.45)} strokeWidth={0.7} fill="none" />
    {steam > 0 &&
      [0, 1, 2].map((i) => {
        const ph = ((t * 0.55 + i / 3) % 1 + 1) % 1;
        const y = -14 - ph * 22;
        const x = noise1D(`steam-${i}`, t * 1.2 + i) * 3;
        return (
          <path
            key={i}
            d={`M${x} ${y} q3 -3 0 -6 q-3 -3 0 -6`}
            stroke={C.phoneWhite}
            strokeWidth={1.1}
            strokeLinecap="round"
            fill="none"
            opacity={steam * 0.42 * Math.sin(ph * Math.PI)}
          />
        );
      })}
  </g>
);

/** Paper cup (marathon water). */
export const Cup: React.FC<{s?: number; spill?: number}> = ({s = 1, spill = 0}) => (
  <g transform={`scale(${s})`}>
    <path d="M-3.4 -9 h6.8 l-1.1 9 h-4.6 z" fill={C.phoneWhite} opacity={0.88} />
    {spill > 0 && <circle cx={0} cy={-11 - spill * 4} r={0.9 + spill} fill={C.phoneWhite} opacity={0.5 * (1 - spill)} />}
  </g>
);

/** Sapling that grows (g 0..1) into a small tree. Stage units (base at 0,0, ~h tall when grown). */
export const Sapling: React.FC<{g: number; h?: number}> = ({g, h = 260}) => {
  const k = clamp01(g);
  const trunkH = h * (0.25 + 0.75 * k);
  const crown = h * 0.32 * Math.max(0.12, k);
  return (
    <g fill={C.shadow}>
      <path d={`M-5 0 L-3 ${-trunkH} L3 ${-trunkH} L5 0 Z`} />
      {k > 0.25 && <path d={`M0 ${-trunkH * 0.55} q${18 * k} ${-14 * k} ${30 * k} ${-30 * k}`} stroke={C.shadow} strokeWidth={4} fill="none" />}
      <circle cx={0} cy={-trunkH - crown * 0.4} r={crown} />
      <circle cx={-crown * 0.7} cy={-trunkH - crown * 0.05} r={crown * 0.72} />
      <circle cx={crown * 0.75} cy={-trunkH - crown * 0.1} r={crown * 0.7} />
      {k < 0.3 && [-1, 1].map((sd) => <ellipse key={sd} cx={sd * 9} cy={-trunkH - 4} rx={9} ry={4} transform={`rotate(${sd * -25} ${sd * 9} ${-trunkH - 4})`} />)}
    </g>
  );
};

/** Modem on a shelf: little warm LEDs that blink at `rate` Hz (stage units). */
export const Modem: React.FC<{t: number; rate: number; s?: number}> = ({t, rate, s = 1}) => {
  const leds = [0, 1, 2, 3].map((i) => {
    const ph = t * rate * (1 + i * 0.37) + i * 0.31;
    return Math.sin(ph * Math.PI * 2) > 0.1 ? 1 : 0.18;
  });
  return (
    <g transform={`scale(${s})`}>
      <rect x={-46} y={-26} width={92} height={26} rx={6} fill={C.shadow} />
      <rect x={-30} y={-62} width={5} height={38} rx={2} fill={C.shadow} transform="rotate(-10 -28 -26)" />
      <rect x={25} y={-62} width={5} height={38} rx={2} fill={C.shadow} transform="rotate(10 28 -26)" />
      {leds.map((on, i) => (
        <g key={i}>
          <circle cx={-27 + i * 18} cy={-12} r={4.2} fill={i === 3 ? '#FF6A3D' : C.amber} opacity={on} />
          <circle cx={-27 + i * 18} cy={-12} r={11} fill={C.amber} opacity={on * 0.18} />
        </g>
      ))}
      <path d="M46 -8 q30 4 34 40 v60" stroke={C.shadow} strokeWidth={5} fill="none" />
    </g>
  );
};

/** Little board (window B / deed 2): chalk scribbles only, no letters or numbers. */
export const Board: React.FC<{w?: number; h?: number}> = ({w = 300, h = 190}) => (
  <g>
    <rect x={-w / 2 - 10} y={-h - 10} width={w + 20} height={h + 20} rx={6} fill={C.shadow} />
    <rect x={-w / 2} y={-h} width={w} height={h} rx={3} fill="#16241C" />
    <g stroke={rgba(C.phoneWhite, 0.75)} strokeWidth={5} fill="none" strokeLinecap="round">
      <circle cx={-w * 0.22} cy={-h * 0.62} r={h * 0.16} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r1 = h * 0.22, r2 = h * 0.3;
        const x0 = -w * 0.22, y0 = -h * 0.62;
        const c = Math.cos((a * Math.PI) / 180), sn = Math.sin((a * Math.PI) / 180);
        return <line key={a} x1={x0 + c * r1} y1={y0 + sn * r1} x2={x0 + c * r2} y2={y0 + sn * r2} />;
      })}
      <path d={`M${w * 0.05} ${-h * 0.28} l${w * 0.12} ${-h * 0.42} l${w * 0.12} ${h * 0.42} z`} />
      <path d={`M${-w * 0.4} ${-h * 0.16} q${w * 0.2} ${-h * 0.12} ${w * 0.8} 0`} />
    </g>
  </g>
);

/** Laptop (open), screen colour from the caller. */
export const Laptop: React.FC<{screen: string; level?: number}> = ({screen, level = 1}) => (
  <g>
    <path d="M-120 0 h240 l-14 -14 h-212 z" fill={C.shadow} />
    <rect x={-96} y={-150} width={192} height={136} rx={8} fill={C.shadow} />
    <rect x={-86} y={-140} width={172} height={116} rx={4} fill={screen} opacity={0.55 + 0.45 * level} />
  </g>
);

/** The stairwell cat: asleep (curled) → startled (arched, tail up, eyes wide) → leap. Units ~ fu. */
export const Cat: React.FC<{state: number; leap: number; facing?: 1 | -1; t: number; tailPinned?: number}> = ({state, leap, facing = 1, t}) => {
  const st = clamp01(state);
  const breathe = 1 + 0.03 * Math.sin(t * 2.2);
  if (st < 0.05)
    return (
      <g transform={`scale(${facing} 1)`} fill={C.shadow}>
        <ellipse cx={0} cy={-7 * breathe} rx={17} ry={8 * breathe} />
        <circle cx={13} cy={-9} r={6.2} />
        <path d="M9 -13 l2 -6 l3 5 z M15 -14 l3 -5 l1 6 z" />
        <path d="M-16 -3 q-10 2 -14 -2 q8 6 18 4 z" />
        <path d="M11 -9 q2 1 4 0" stroke={C.eye} strokeWidth={0.9} fill="none" opacity={0.85} />
        <path d="M16 -9 q2 1 4 0" stroke={C.eye} strokeWidth={0.9} fill="none" opacity={0.85} />
      </g>
    );
  // startled: arched back, tail up, fur out
  const up = -leap * 46;
  const fwd = leap * 34;
  const arch = 1 - leap * 0.6;
  return (
    <g transform={`translate(${fwd * facing} ${up}) scale(${facing} 1)`} fill={C.shadow}>
      <path d={`M-16 0 L-14 -12 Q0 ${-30 * arch - 6} 14 -14 L16 0 l-4 0 l-1 -8 q-11 ${8 * arch} -22 0 l-1 8 z`} />
      {Array.from({length: 7}, (_, i) => (
        <path key={i} d={`M${-12 + i * 4} ${-14 - 12 * arch * Math.sin(((i + 1) / 8) * Math.PI)} l1.5 -4 l1.5 4 z`} />
      ))}
      <circle cx={17} cy={-18} r={6.4} />
      <path d="M13 -22 l1 -7 l4 5 z M19 -23 l4 -6 l0 7 z" />
      <path d={`M-15 -10 q-6 -10 -2 -24 q2 -4 4 0 q-3 12 1 22 z`} />
      <circle cx={15.4} cy={-18.5} r={1.7} fill={C.eye} />
      <circle cx={19.6} cy={-18.5} r={1.7} fill={C.eye} />
    </g>
  );
};
