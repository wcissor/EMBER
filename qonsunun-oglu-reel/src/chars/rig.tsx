// Character rig (section 3 "Characters", section 4 "Acting"). Original silhouettes in the shadow colour with a 2 px rim
// light, two white eye dots and no mouths. Figure units (fu): feet at 0,0, head top near -100, y down is positive.
import React from 'react';
import {random} from 'remotion';
import {C} from '../theme';
import {act, clamp01, springAt, noise1D, lerp} from '../motion';

export type EyeState = 'open' | 'wide' | 'squint' | 'smile' | 'smug' | 'closed';
export type Pose = {
  x: number;
  y: number;
  rot: number; // whole body, around the hips (deg)
  lean: number; // torso (deg, + leans to screen right)
  sx: number;
  sy: number;
  headTilt: number;
  headTurn: number; // -1 profile left … 0 front … 1 profile right
  lookX: number; // side-eye (-1..1)
  lookY: number;
  eyes: EyeState;
  eyeOpen: number; // 0..1 lid (scaleY)
  armL: [number, number];
  armR: [number, number];
  legL: [number, number];
  legR: [number, number];
  profile: number; // 0 front … 1 profile (limbs swing in the picture plane)
  facing: 1 | -1;
};

export const BASE: Pose = {
  x: 0, y: 0, rot: 0, lean: 0, sx: 1, sy: 1, headTilt: 0, headTurn: 0, lookX: 0, lookY: 0, eyes: 'open', eyeOpen: 1,
  armL: [8, 6], armR: [8, 6], legL: [3, 0], legR: [3, 0], profile: 0, facing: 1,
};

export type Build = {
  id: string;
  hipY: number;
  torso: number;
  shoulderW: number;
  hipW: number;
  upperArm: number;
  foreArm: number;
  armW: number;
  handR: number;
  thigh: number;
  shin: number;
  legW: number;
  foot: number;
  headR: number;
  neck: number;
  /** torso silhouette, given hips H and neck N (fu, pose-space) */
  body: (j: Joints, p: Pose, sec: Secondary) => React.ReactNode;
  head: (j: Joints, p: Pose, sec: Secondary) => React.ReactNode;
  /** drawn behind the body (apron strings, hood back) */
  back?: (j: Joints, p: Pose, sec: Secondary) => React.ReactNode;
  eyeScale?: number;
};

export type Pt = {x: number; y: number};
export type Joints = {
  H: Pt; N: Pt; head: Pt; headAng: number;
  sL: Pt; sR: Pt; eL: Pt; eR: Pt; wL: Pt; wR: Pt; wLang: number; wRang: number;
  hL: Pt; hR: Pt; kL: Pt; kR: Pt; aL: Pt; aR: Pt;
};
/** Secondary motion (lags 2–3 frames): swing in degrees, breathe scale. */
export type Secondary = {swing: number; breathe: number; t: number};

const rad = (d: number) => (d * Math.PI) / 180;
const add = (a: Pt, b: Pt): Pt => ({x: a.x + b.x, y: a.y + b.y});
const mul = (a: Pt, k: number): Pt => ({x: a.x * k, y: a.y * k});
const rotv = (v: Pt, deg: number): Pt => {
  const r = rad(deg);
  return {x: v.x * Math.cos(r) - v.y * Math.sin(r), y: v.x * Math.sin(r) + v.y * Math.cos(r)};
};

export const joints = (b: Build, p: Pose, breathe = 1): Joints => {
  const H = {x: 0, y: -b.hipY};
  const up = rotv({x: 0, y: -1}, p.lean);
  const N = add(H, mul(up, b.torso * breathe));
  const perp = rotv({x: 1, y: 0}, p.lean);
  const headAng = p.lean + p.headTilt;
  const head = add(N, mul(rotv({x: 0, y: -1}, headAng), b.neck + b.headR));
  const sw = lerp(b.shoulderW, 2, p.profile);
  const sL = add(add(N, mul(perp, -sw)), mul(up, -3));
  const sR = add(add(N, mul(perp, sw)), mul(up, -3));
  const limb = (side: -1 | 1, a: number, e: number, l1: number, l2: number, origin: Pt, withLean: boolean) => {
    const dir = lerp(side, p.facing, p.profile);
    const s = Math.abs(dir) < 0.2 ? (dir < 0 ? -0.2 : 0.2) : dir;
    const v1 = {x: s * Math.sin(rad(a)), y: Math.cos(rad(a))};
    const v2 = {x: s * Math.sin(rad(a + e)), y: Math.cos(rad(a + e))};
    const r1 = withLean ? rotv(v1, p.lean) : v1;
    const r2 = withLean ? rotv(v2, p.lean) : v2;
    const mid = add(origin, mul(r1, l1));
    const end = add(mid, mul(r2, l2));
    return {mid, end, ang: Math.atan2(r2.y, r2.x)};
  };
  const aL = limb(-1, p.armL[0], p.armL[1], b.upperArm, b.foreArm, sL, true);
  const aR = limb(1, p.armR[0], p.armR[1], b.upperArm, b.foreArm, sR, true);
  const hw = lerp(b.hipW, 1.5, p.profile);
  const hL = {x: H.x - hw, y: H.y};
  const hR = {x: H.x + hw, y: H.y};
  const lL = limb(-1, p.legL[0], p.legL[1], b.thigh, b.shin, hL, false);
  const lR = limb(1, p.legR[0], p.legR[1], b.thigh, b.shin, hR, false);
  return {
    H, N, head, headAng, sL, sR, eL: aL.mid, eR: aR.mid, wL: aL.end, wR: aR.end, wLang: aL.ang, wRang: aR.ang,
    hL, hR, kL: lL.mid, kR: lR.mid, aL: lL.end, aR: lR.end,
  };
};

const P = (p: Pt) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
export const limbPath = (a: Pt, b: Pt, c: Pt) => `M${P(a)} L${P(b)} L${P(c)}`;

/** Eyes: blink (scaleY 0.1 for 3 frames), squint (flattened arcs), wide (1.4×), side-eye (dots shift), smile arcs. */
const Eyes: React.FC<{b: Build; j: Joints; p: Pose}> = ({b, j, p}) => {
  const R = b.headR;
  const es = b.eyeScale ?? 1;
  const turn = p.headTurn;
  const sep = R * 0.36 * (1 - 0.45 * Math.abs(turn));
  const cx = turn * R * 0.42 + p.lookX * R * 0.13;
  const cy = R * 0.06 + p.lookY * R * 0.1;
  const r = R * 0.17 * es * (p.eyes === 'wide' ? 1.4 : 1);
  const open = p.eyes === 'closed' ? 0.1 : p.eyeOpen;
  const pts = [-1, 1].map((s) => ({x: cx + s * sep, y: cy}));
  const col = C.eye;
  return (
    <g transform={`translate(${P(j.head)}) rotate(${j.headAng})`}>
      {pts.map((q, i) => {
        if (p.eyes === 'squint')
          return <path key={i} d={`M${q.x - r * 1.25} ${q.y} Q${q.x} ${q.y - r * 0.55} ${q.x + r * 1.25} ${q.y}`} stroke={col} strokeWidth={r * 0.75} strokeLinecap="round" fill="none" />;
        if (p.eyes === 'smile')
          return <path key={i} d={`M${q.x - r * 1.15} ${q.y + r * 0.35} Q${q.x} ${q.y - r * 1.15} ${q.x + r * 1.15} ${q.y + r * 0.35}`} stroke={col} strokeWidth={r * 0.7} strokeLinecap="round" fill="none" />;
        if (p.eyes === 'smug')
          return <path key={i} d={`M${q.x - r * 1.1} ${q.y - r * 0.1} L${q.x + r * 1.1} ${q.y - r * 0.1} A${r * 1.1} ${r * 0.85} 0 0 1 ${q.x - r * 1.1} ${q.y - r * 0.1} Z`} fill={col} />;
        return <ellipse key={i} cx={q.x} cy={q.y} rx={r} ry={r * Math.max(0.1, open)} fill={col} />;
      })}
    </g>
  );
};

export type Rim = {color: string; dx: number; dy: number; opacity?: number};

/** Renders a build in a pose. `unitPx` = screen px per fu (sets the 2 px rim). */
export const Figure: React.FC<{
  b: Build;
  p: Pose;
  rim: Rim;
  unitPx: number;
  sec?: Secondary;
  holdL?: React.ReactNode;
  holdR?: React.ReactNode;
  overlay?: React.ReactNode;
  under?: React.ReactNode;
  point?: 'L' | 'R';
}> = ({b, p, rim, unitPx, sec = {swing: 0, breathe: 1, t: 0}, holdL, holdR, overlay, under, point}) => {
  const j = joints(b, p, sec.breathe);
  const k = 2 / Math.max(0.05, unitPx);
  const fill = C.shadow;
  const shape = (f: string) => (
    <g fill={f} stroke="none" color={f}>
      {b.back?.(j, p, sec)}
      <path d={limbPath(j.hL, j.kL, j.aL)} stroke={f} strokeWidth={b.legW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={limbPath(j.hR, j.kR, j.aR)} stroke={f} strokeWidth={b.legW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {[j.aL, j.aR].map((a, i) => (
        <ellipse key={i} cx={a.x + p.facing * b.foot * 0.28} cy={a.y - b.legW * 0.15} rx={b.foot * 0.62} ry={b.legW * 0.62} />
      ))}
      {b.body(j, p, sec)}
      <path d={limbPath(j.sL, j.eL, j.wL)} stroke={f} strokeWidth={b.armW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={limbPath(j.sR, j.eR, j.wR)} stroke={f} strokeWidth={b.armW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={j.wL.x} cy={j.wL.y} r={b.handR} />
      <circle cx={j.wR.x} cy={j.wR.y} r={b.handR} />
      {point && (() => {
        const w = point === 'L' ? j.wL : j.wR;
        const ang = point === 'L' ? j.wLang : j.wRang;
        const L = b.handR * 2.3;
        return <path d={`M${P(w)} L${(w.x + Math.cos(ang) * L).toFixed(2)} ${(w.y + Math.sin(ang) * L).toFixed(2)}`} stroke={f} strokeWidth={b.handR * 0.9} strokeLinecap="round" />;
      })()}
      <circle cx={j.N.x} cy={j.N.y} r={b.armW * 0.9} />
      {b.head(j, p, sec)}
    </g>
  );
  const hipX = j.H.x;
  const hipY = j.H.y;
  return (
    <g transform={`translate(${p.x} ${p.y}) translate(${hipX} ${hipY}) rotate(${p.rot}) translate(${-hipX} ${-hipY}) scale(${p.sx} ${p.sy})`}>
      {under}
      <g transform={`translate(${rim.dx * k} ${rim.dy * k})`} opacity={rim.opacity ?? 1}>
        {shape(rim.color)}
      </g>
      {shape(fill)}
      {holdL && <g transform={`translate(${P(j.wL)})`}>{holdL}</g>}
      {holdR && <g transform={`translate(${P(j.wR)})`}>{holdR}</g>}
      <Eyes b={b} j={j} p={p} />
      {overlay && <g>{overlay}</g>}
    </g>
  );
};

/** Hand positions in pose space (for props held by a figure that are drawn elsewhere). */
export const handAt = (b: Build, p: Pose, side: 'L' | 'R') => {
  const j = joints(b, p);
  return side === 'L' ? j.wL : j.wR;
};

// ───────────────────────────── Builds ─────────────────────────────
const torsoPath = (j: Joints, wTop: number, wHip: number, belly = 0, lean = 0, profile = 0) => {
  const k = 1 - 0.28 * profile;
  wTop *= k;
  wHip *= k;
  belly *= k;
  const up = rotv({x: 0, y: -1}, lean);
  const perp = rotv({x: 1, y: 0}, lean);
  const a = add(j.H, mul(perp, -wHip));
  const b2 = add(j.H, mul(perp, wHip));
  const c = add(j.N, mul(perp, wTop));
  const d = add(j.N, mul(perp, -wTop));
  const mid = add(add(j.H, mul(up, (j.N.y - j.H.y) * -0.5)), mul(perp, wHip + belly));
  const midL = add(add(j.H, mul(up, (j.N.y - j.H.y) * -0.5)), mul(perp, -(wHip + belly)));
  return `M${P(a)} Q${P(midL)} ${P(d)} L${P(c)} Q${P(mid)} ${P(b2)} Z`;
};

/** Ana: a round, warm shape with a bun, an apron (its bow and strings fly behind her) and house slippers. */
export const ANA: Build = {
  id: 'ana', hipY: 38, torso: 32, shoulderW: 12.5, hipW: 6.5, upperArm: 15.5, foreArm: 14.5, armW: 7.4, handR: 3.9,
  thigh: 19, shin: 19, legW: 7.6, foot: 12.5, headR: 10.2, neck: 1.5, eyeScale: 1.05,
  back: (j, p, sec) => {
    const side = -p.facing;
    const w = add(j.H, rotv({x: side * 15, y: -12}, p.lean));
    const s = sec.swing;
    const tip1 = {x: w.x + side * (15 + Math.abs(s) * 0.25), y: w.y + 13 - s * 0.35};
    const tip2 = {x: w.x + side * (10 + Math.abs(s) * 0.15), y: w.y + 19 + s * 0.25};
    return (
      <g>
        <ellipse cx={w.x + side * 4} cy={w.y - 2} rx={5.2} ry={3.4} transform={`rotate(${-25 * side} ${w.x + side * 4} ${w.y - 2})`} />
        <ellipse cx={w.x + side * 4} cy={w.y + 3} rx={4.6} ry={3} transform={`rotate(${30 * side} ${w.x + side * 4} ${w.y + 3})`} />
        <path d={`M${P(w)} Q${w.x + side * 9} ${w.y + 5} ${P(tip1)}`} stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" fill="none" />
        <path d={`M${P(w)} Q${w.x + side * 5} ${w.y + 9} ${P(tip2)}`} stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" fill="none" />
      </g>
    );
  },
  body: (j, p) => {
    const perp = rotv({x: 1, y: 0}, p.lean);
    const up = rotv({x: 0, y: -1}, p.lean);
    const at = (u: number, w: number) => add(add(j.H, mul(up, (u * 32))), mul(perp, w));
    const hem = {y: j.H.y + 25};
    // egg: sloped shoulders, full middle, a bell skirt to mid-calf
    const d = [
      `M${P(at(1.02, -6))}`,
      `C${P(at(1.04, -13))} ${P(at(0.9, -15.5))} ${P(at(0.62, -18))}`,
      `C${P(at(0.3, -20))} ${P(at(0.0, -21.5))} ${j.H.x - 20.5} ${hem.y - 8}`,
      `Q${j.H.x - 20} ${hem.y} ${j.H.x - 16} ${hem.y}`,
      `L${j.H.x + 16} ${hem.y}`,
      `Q${j.H.x + 20} ${hem.y} ${j.H.x + 20.5} ${hem.y - 8}`,
      `C${P(at(0.0, 21.5))} ${P(at(0.3, 20))} ${P(at(0.62, 18))}`,
      `C${P(at(0.9, 15.5))} ${P(at(1.04, 13))} ${P(at(1.02, 6))}`,
      'Z',
    ].join(' ');
    return <path d={d} />;
  },
  head: (j) => {
    const up = rotv({x: 0, y: -1}, j.headAng);
    const bun = add(j.head, mul(up, 12));
    return (
      <g>
        <circle cx={j.head.x} cy={j.head.y} r={10.2} />
        <circle cx={bun.x} cy={bun.y} r={6.2} />
        <ellipse cx={j.head.x} cy={j.head.y - 2.6} rx={11.2} ry={9.4} transform={`rotate(${j.headAng} ${P(j.head)})`} />
      </g>
    );
  },
};

/** The kid (Mən, 16): a hoodie (often hood up), a slouch and a phone. */
export const makeKid = (hood: () => boolean, opts: {id?: string; hairOnly?: boolean} = {}): Build => ({
  id: opts.id ?? 'kid', hipY: 47, torso: 31, shoulderW: 12.5, hipW: 5.5, upperArm: 16, foreArm: 15, armW: 6.6, handR: 3.3,
  thigh: 23, shin: 23, legW: 7.4, foot: 11.5, headR: 9, neck: 3,
  back: (j, p, sec) => {
    if (!hood() || opts.hairOnly) return null;
    // hood: wider than the head, a peak at the top-back that trails the motion (lag), draping onto the shoulders
    const f = p.facing;
    const h = j.head;
    const a = j.headAng;
    const lag = Math.max(-12, Math.min(12, sec.swing * 0.5));
    const pts = [
      {x: -12.5 * f, y: 13}, {x: -13.8 * f, y: 1}, {x: -11 * f, y: -10},
      {x: (-5 - lag * 0.25) * f, y: -16.5 - Math.abs(lag) * 0.1}, {x: 3 * f, y: -13}, {x: 11.5 * f, y: -5},
      {x: 12.6 * f, y: 6}, {x: 10.5 * f, y: 14},
    ].map((q) => add(h, rotv(q, a)));
    const d = `M${P(pts[0])} C${P(pts[1])} ${P(pts[2])} ${P(pts[2])} Q${P(pts[3])} ${P(pts[4])} C${P(pts[5])} ${P(pts[6])} ${P(pts[7])} Z`;
    return <path d={d} />;
  },
  body: (j, p) => (
    <g>
      <path d={torsoPath(j, 12.8, 11.5, 2, p.lean, p.profile)} />
      <path d={`M${P(add(j.N, rotv({x: -8, y: 1}, p.lean)))} q8 5 16 0 l-2 6 h-12 z`} />
    </g>
  ),
  head: (j, p) => {
    const up = rotv({x: 0, y: -1}, j.headAng);
    if (hood() && !opts.hairOnly) return <circle cx={j.head.x} cy={j.head.y} r={9} />;
    // messy hair
    const t = add(j.head, mul(up, 6));
    return (
      <g>
        <circle cx={j.head.x} cy={j.head.y} r={9} />
        <path d={`M${j.head.x - 10} ${j.head.y - 1} Q${t.x - 9} ${t.y - 7} ${t.x} ${t.y - 6} Q${t.x + 10} ${t.y - 8} ${j.head.x + 10} ${j.head.y - 2} l-3 -2 l-2 3 l-3 -3 l-3 2 l-3 -2 l-3 3 z`} transform={`rotate(${j.headAng} ${P(j.head)})`} />
        <path d={`M${t.x - 2} ${t.y - 6} l${-4 * p.facing} -5 l${6 * p.facing} 3 z`} />
      </g>
    );
  },
});

/** Qonşunun oğlu (16): upright, neat haircut, a volunteer lanyard and a thin halo ring (drawn by the scene). */
export const SON: Build = {
  id: 'son', hipY: 48, torso: 32, shoulderW: 11.5, hipW: 5, upperArm: 16, foreArm: 15, armW: 6.2, handR: 3.1,
  thigh: 23.5, shin: 23.5, legW: 6.9, foot: 11, headR: 8.8, neck: 3.4,
  body: (j, p, sec) => {
    // the volunteer lanyard: a strap from the collar to a card on the chest, swinging a beat behind the body
    const down = rotv({x: 0, y: 1}, p.lean);
    const perp = rotv({x: 1, y: 0}, p.lean);
    const sw = Math.max(-6, Math.min(6, sec.swing * 0.12));
    const card = add(add(j.N, mul(down, 14)), mul(perp, sw * 0.6 + p.headTurn * 1.2));
    return (
      <g>
        <path d={torsoPath(j, 11.6, 9.6, 0.6, p.lean, p.profile)} />
        <path d={`M${P(add(j.N, rotv({x: -5, y: -1}, p.lean)))} l5 4 l5 -4 l-1 3 l-4 3 l-4 -3 z`} />
        <path d={`M${P(add(j.N, mul(perp, -3.6)))} L${P(card)} L${P(add(j.N, mul(perp, 3.6)))}`} stroke="#2A3352" strokeWidth={0.9} fill="none" />
        <rect x={card.x - 2.6} y={card.y} width={5.2} height={6.6} rx={0.8} fill="#9AA6C8" transform={`rotate(${p.lean + sw} ${card.x} ${card.y})`} />
        <rect x={card.x - 1.6} y={card.y + 1.4} width={3.2} height={1.1} fill="#2A3352" transform={`rotate(${p.lean + sw} ${card.x} ${card.y})`} />
      </g>
    );
  },
  head: (j, p) => {
    const R = 8.8;
    // neat side-parted haircut
    return (
      <g>
        <circle cx={j.head.x} cy={j.head.y} r={R} />
        <path
          d={`M${j.head.x - R - 0.6} ${j.head.y - 0.5} Q${j.head.x - R} ${j.head.y - R - 3.2} ${j.head.x + p.facing * 1} ${j.head.y - R - 2.6} Q${j.head.x + R + 1} ${j.head.y - R - 1.6} ${j.head.x + R + 0.6} ${j.head.y - 1.5} Z`}
          transform={`rotate(${j.headAng} ${P(j.head)})`}
        />
      </g>
    );
  },
};

/** Qonşu qadın: curly hair, hands on hips. */
export const QONSU: Build = {
  id: 'qonsu', hipY: 44, torso: 33, shoulderW: 12, hipW: 6, upperArm: 16, foreArm: 15, armW: 6.6, handR: 3.4,
  thigh: 22, shin: 22, legW: 7, foot: 11, headR: 9.5, neck: 3,
  body: (j, p) => {
    const up = rotv({x: 0, y: -1}, p.lean);
    const top = add(j.H, mul(up, 4));
    const hem = j.H.y + 26;
    return (
      <g>
        <path d={torsoPath(j, 11.5, 10.5, 2.4, p.lean, p.profile)} />
        <path d={`M${top.x - 11} ${top.y} L${j.H.x - 17} ${hem} L${j.H.x + 17} ${hem} L${top.x + 11} ${top.y} Z`} />
      </g>
    );
  },
  head: (j) => {
    const curls = Array.from({length: 11}, (_, i) => {
      const a = rad(-200 + i * 22);
      return {x: j.head.x + Math.cos(a) * 10.5, y: j.head.y - 1.5 + Math.sin(a) * 10.5};
    });
    return (
      <g>
        <circle cx={j.head.x} cy={j.head.y} r={9.5} />
        {curls.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={4.2 + (i % 3) * 0.6} />
        ))}
      </g>
    );
  },
};

/** Small kids (window B, the deed windows). */
export const CHILD: Build = {
  id: 'child', hipY: 26, torso: 19, shoulderW: 8, hipW: 3.6, upperArm: 12.5, foreArm: 11.5, armW: 4.6, handR: 2.4,
  thigh: 12.5, shin: 12.5, legW: 5, foot: 7, headR: 8.2, neck: 1.5, eyeScale: 1.1,
  body: (j, p) => <path d={torsoPath(j, 8, 8.5, 1.5, p.lean, p.profile)} />,
  head: (j) => (
    <g>
      <circle cx={j.head.x} cy={j.head.y} r={8.2} />
      <path d={`M${j.head.x - 8.6} ${j.head.y - 1} q2 -10 9 -9.6 q7 0 8 8 z`} />
    </g>
  ),
};

/** Runners (window C, deed 3). */
export const RUNNER: Build = {
  id: 'runner', hipY: 47, torso: 31, shoulderW: 10, hipW: 4, upperArm: 15, foreArm: 14, armW: 5.8, handR: 2.8,
  thigh: 23, shin: 23, legW: 6.6, foot: 10, headR: 8.4, neck: 3,
  body: (j, p) => <path d={torsoPath(j, 10.5, 9, 0.5, p.lean, p.profile)} />,
  head: (j) => <circle cx={j.head.x} cy={j.head.y} r={8.4} />,
};

// ───────────────────────────── Acting ─────────────────────────────
export type Key = {at: number; pose: Partial<Pose>; kind?: 'pose' | 'settle' | 'snap' | 'slow'; antic?: number; dur?: number};

const NUM_FIELDS: (keyof Pose)[] = ['x', 'y', 'rot', 'lean', 'sx', 'sy', 'headTilt', 'headTurn', 'lookX', 'lookY', 'eyeOpen', 'profile'];
const PAIR_FIELDS: (keyof Pose)[] = ['armL', 'armR', 'legL', 'legR'];

const weight = (k: Key, f: number) => {
  switch (k.kind ?? 'pose') {
    case 'snap':
      return f >= k.at ? 1 : 0;
    case 'settle':
      return springAt(f, k.at, 'settle');
    case 'slow': {
      const d = k.dur ?? 24;
      const t = clamp01((f - k.at) / d);
      return t * t * (3 - 2 * t);
    }
    default:
      return act(f, k.at, k.antic ?? 4, 0.12);
  }
};

const blendInto = (cur: Pose, target: Partial<Pose>, w: number, fields: (keyof Pose)[]) => {
  const out = {...cur} as Pose & Record<string, unknown>;
  for (const f of fields) {
    if (!(f in target)) continue;
    if (PAIR_FIELDS.includes(f)) {
      const a = cur[f] as [number, number];
      const b = target[f] as [number, number];
      (out as Record<string, unknown>)[f] = [lerp(a[0], b[0], w), lerp(a[1], b[1], w)];
    } else if (NUM_FIELDS.includes(f)) {
      (out as Record<string, unknown>)[f] = lerp(cur[f] as number, target[f] as number, w);
    } else if (w >= 0.5) {
      (out as Record<string, unknown>)[f] = target[f];
    }
  }
  return out as Pose;
};

const evalAt = (base: Pose, keys: Key[], f: number, fields: (keyof Pose)[]) => {
  let cur = base;
  for (const k of keys) {
    const w = weight(k, f);
    if (w === 0) continue;
    cur = blendInto(cur, k.pose, w, fields);
  }
  return cur;
};

const HEAD_FIELDS: (keyof Pose)[] = ['headTilt', 'headTurn'];
const EYE_FIELDS: (keyof Pose)[] = ['lookX', 'lookY', 'eyes', 'eyeOpen'];
const BODY_FIELDS: (keyof Pose)[] = [...NUM_FIELDS.filter((f) => !HEAD_FIELDS.includes(f) && !EYE_FIELDS.includes(f)), ...PAIR_FIELDS, 'facing'];

/** Pose at frame f: the eyes lead by 2 frames, the head by 2 more (section 4). */
export const poseAt = (base: Pose, keys: Key[], f: number): Pose => {
  const body = evalAt(base, keys, f, BODY_FIELDS);
  const head = evalAt(base, keys, f + 2, HEAD_FIELDS);
  const eyes = evalAt(base, keys, f + 4, EYE_FIELDS);
  return {...body, headTilt: head.headTilt, headTurn: head.headTurn, lookX: eyes.lookX, lookY: eyes.lookY, eyes: eyes.eyes, eyeOpen: eyes.eyeOpen};
};

/** Blink: scaleY to 0.1 for 3 frames every 2–4 s (seeded). */
export const blink = (seed: string, f: number) => {
  let t = 10 + random(`${seed}-b0`) * 50;
  let i = 0;
  while (t + 3 <= f && i < 60) {
    t += 60 + random(`${seed}-b${++i}`) * 60;
  }
  return f >= t && f < t + 3 ? 0.1 : 1;
};

/** Secondary motion: swing from the body's own motion 3 frames ago; shoulders breathe ±1% over 2 s. */
export const secondary = (base: Pose, keys: Key[], f: number, fps = 30): Secondary => {
  const now = evalAt(base, keys, f, BODY_FIELDS);
  const then = evalAt(base, keys, f - 3, BODY_FIELDS);
  const swing = (now.lean - then.lean) * 1.6 + (now.x - then.x) * 0.9 + (now.rot - then.rot) * 0.15;
  return {swing: Math.max(-30, Math.min(30, swing)), breathe: 1 + 0.01 * Math.sin((2 * Math.PI * f) / (2 * fps)), t: f / fps};
};

/** Idle life: small head tilts. */
export const idle = (seed: string, f: number, amt = 1) => noise1D(`${seed}-idle`, f / 45) * 2.2 * amt;

export const withBlink = (p: Pose, seed: string, f: number): Pose => (p.eyes === 'open' || p.eyes === 'wide' ? {...p, eyeOpen: p.eyeOpen * blink(seed, f)} : p);
