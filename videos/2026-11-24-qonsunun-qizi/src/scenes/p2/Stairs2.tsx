// 4 · The stairwell (part 1's set): the cat sits on the same step; he steps over it with exaggerated care ("Bu dəfə
// yox."), walks into the daughter coming up with a box of books ("Sənin sirrin nədir?"); she nods up the stairs, where
// the neighbour's son rubs his neck on the landing ("Etiraf edirəm… VolunTrack-i mənə o göstərib.").
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {C} from '../../theme';
import {mix} from '../../color';
import {FPS, type Lang} from '../../config';
import {clamp01, lerp, springAt, noise1D} from '../../motion';
import {timelineFor} from '../../data';
import {SON, QIZ, makeKid, BASE, Figure, poseAt, secondary, withBlink, idle, joints, type Key, type Pose, type Build} from '../../chars/rig';
import {Cat} from '../../chars/props';
import {Halo, VT_RIM, VT_CORE, VT_BLUE} from '../../chars/vtbits';
import {EASES} from '../../camera';
import {walkCycle, tiptoeCycle} from '../../chars/gait';
import {BookBox} from './props2';
import {talk} from './stages2';

const KID = makeKid(() => true);
const STEP = {w: 30, h: 25};
const T = {y: 420, x0: 600, x1: 1080};
const HA = {y: 720, x0: -40, x1: 300};
const FL_A = {x0: 600, y0: 420, n: 12};
const FL_B = {x0: 300, y0: 720, n: 12};
const BOTTOM = {y: 1020};
const onA = (s: number) => ({x: FL_A.x0 - s * STEP.w, y: FL_A.y0 + s * STEP.h});
const onB = (s: number) => ({x: FL_B.x0 + s * STEP.w, y: FL_B.y0 + s * STEP.h});

const Flight: React.FC<{x0: number; y0: number; n: number; dir: 1 | -1; tone: string}> = ({x0, y0, n, dir, tone}) => {
  const pts: string[] = [`${x0} ${y0}`];
  for (let i = 0; i < n; i++) {
    const x = x0 + dir * i * STEP.w;
    const y = y0 + i * STEP.h;
    pts.push(`${x + dir * STEP.w} ${y}`, `${x + dir * STEP.w} ${y + STEP.h}`);
  }
  const xe = x0 + dir * n * STEP.w;
  const ye = y0 + n * STEP.h;
  return (
    <g>
      <path d={`M${pts.join(' L')} L${xe} ${ye + 60} L${x0} ${y0 + 60} Z`} fill={tone} />
      <path d={`M${x0} ${y0 - 70} L${xe} ${ye - 70}`} stroke="#2A1E16" strokeWidth={7} fill="none" />
      {Array.from({length: n / 2}, (_, i) => {
        const x = x0 + dir * (i * 2 + 1) * STEP.w;
        const y = y0 + (i * 2 + 1) * STEP.h;
        return <rect key={i} x={x - 1.5} y={y - 70} width={3} height={70} fill="#1A1410" />;
      })}
    </g>
  );
};

const Bulb: React.FC<{x: number; y: number; t: number; seed: string}> = ({x, y, t, seed}) => {
  const fl = 0.85 + 0.15 * noise1D(seed, t * 1.3);
  return (
    <g>
      <line x1={x} y1={y - 90} x2={x} y2={y - 8} stroke="#1A1612" strokeWidth={2} />
      <circle cx={x} cy={y} r={170} fill="url(#bulbGlow2)" opacity={0.75 * fl} />
      <circle cx={x} cy={y} r={9} fill="#FFE2B0" opacity={fl} />
    </g>
  );
};

/** Camera keys (focus point in set units and scale). */
const camAt = (B: Record<string, number>, f: number) => {
  const keys = [
    {f: B.stairs, x: 300, y: 620, s: 1.75},
    {f: B.catOver + 22, x: 300, y: 650, s: 1.8},
    {f: B.bump + 6, x: 420, y: 740, s: 1.85},
    {f: B.nodUp + 4, x: 430, y: 740, s: 1.85},
    {f: B.nodUp + 20, x: 600, y: 600, s: 1.15},
    {f: B.phoneIn, x: 740, y: 520, s: 1.45},
  ];
  if (f <= keys[0].f) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (f <= b.f) {
      const u = EASES.inOut(clamp01((f - a.f) / Math.max(1, b.f - a.f)));
      return {x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), s: lerp(a.s, b.s, u)};
    }
  }
  return keys[keys.length - 1];
};

export const Stairs2: React.FC<{lang: Lang}> = ({lang}) => {
  const f = useCurrentFrame();
  const TL = timelineFor(lang);
  const B = TL.beats;
  const t = f / FPS;
  const words = (id: string) => TL.wordFrames(id);
  const cam = camAt(B, f);
  const camS = cam.s * (1 + 0.02 * clamp01((f - B.stairs) / Math.max(1, B.phoneIn - B.stairs)));
  const tr = `translate(540 670) scale(${camS}) translate(${-cam.x} ${-cam.y})`;

  // ── the kid: tiptoes down flight A, steps over the cat with great care, walks down flight B, bumps into her
  const A0 = 7.6; // step on flight A where the shot finds him
  const reachCat = B.catOver;
  const overEnd = B.catOver + 16;
  const bumpAt = B.bump;
  let kidPos: {x: number; y: number};
  let kidPose: Partial<Pose>;
  if (f < reachCat) {
    const u = clamp01((f - B.stairs) / Math.max(1, reachCat - B.stairs));
    const s = lerp(A0, 11.7, u);
    const phi = (s - A0) * Math.PI;
    kidPos = onA(s);
    kidPose = {...tiptoeCycle(KID as Build, phi, -1), lookX: -0.6, lookY: 0.8, headTurn: -0.5};
  } else if (f < overEnd) {
    // the step over: a giant slow stride, arms out for balance, eyes on the cat
    const u = clamp01((f - reachCat) / (overEnd - reachCat));
    kidPos = {x: lerp(onA(11.7).x, 214, u), y: HA.y - Math.sin(u * Math.PI) * 10};
    kidPose = {profile: 1, facing: -1, lean: -6, armL: [92, 8], armR: [96, 4], legL: [lerp(-10, 70, u), lerp(-20, -110, Math.sin(u * Math.PI))], legR: [lerp(40, -16, u), -20], headTilt: 22, lookY: 1, eyes: 'squint', sy: 1.04};
  } else if (f < bumpAt) {
    // down flight B with a little swagger
    const u = clamp01((f - overEnd) / Math.max(1, bumpAt - overEnd));
    const s = lerp(-0.6, 4.4, u);
    const phi = u * 5 * Math.PI;
    kidPos = s < 0 ? {x: lerp(214, onB(0).x, s + 1), y: HA.y} : onB(s);
    kidPose = {...walkCycle(KID as Build, phi, 1, {lean: -4}), eyes: 'smug', headTilt: -6, headTurn: 0.3, lookX: 0.6};
  } else {
    // bounced back half a step by the box
    const k = springAt(f, bumpAt, 'pose');
    kidPos = onB(lerp(4.4, 3.7, clamp01(k)));
    kidPose = {profile: 0.6, facing: 1, legL: [6, -4], legR: [-4, -2], armL: [30, 30], armR: [24, 20], headTurn: 0.5, lookX: 0.8, lookY: -0.6, eyes: 'wide', headTilt: -10};
  }
  const kidKeys: Key[] = [
    {at: bumpAt + 1, pose: {sy: 0.9, sx: 1.08, eyes: 'wide'}, kind: 'snap'},
    {at: bumpAt + 5, pose: {sy: 1, sx: 1}, kind: 'settle'},
    {at: B.nodUp + 2, pose: {headTurn: -0.2, lookX: -0.3, lookY: -1, headTilt: -22, eyes: 'open'}, kind: 'pose'},
    {at: B.sting + 2, pose: {eyes: 'wide', headTilt: -26}, kind: 'snap'},
  ];
  const kidBase = {...BASE, ...kidPose} as Pose;
  let kidP = f >= bumpAt ? poseAt(kidBase, kidKeys, f) : kidBase;
  kidP = withBlink({...kidP, headTilt: kidP.headTilt + talk(words('P11'), f, 5) + talk(words('P12'), f, 5)}, 'kid2-st', f);
  const kidSec = secondary(kidBase, kidKeys, f);

  // ── the daughter: up flight B with the box; the bump; she nods up the stairs
  const QIZ_FROM = 11.5;
  const QIZ_TO = 5.4;
  const upU = clamp01((f - B.stairs) / Math.max(1, bumpAt - B.stairs));
  const qs = lerp(QIZ_FROM, QIZ_TO, upU);
  const qPos = onB(qs);
  const qWalk = f < bumpAt ? walkCycle(QIZ, upU * 6 * Math.PI, -1, {lean: 6}) : {profile: 1, facing: -1 as const, legL: [4, -2] as [number, number], legR: [-6, -4] as [number, number]};
  const qBase = {...BASE, ...qWalk, armL: [74, -58], armR: [70, -54], headTurn: -0.4, lookX: -0.6, lookY: 0.2} as Pose;
  const qKeys: Key[] = [
    {at: bumpAt, pose: {lean: 8, eyes: 'wide', headTilt: 8}, kind: 'snap'},
    {at: bumpAt + 6, pose: {lean: 0, eyes: 'open', headTilt: 0}, kind: 'settle'},
    // the nod up the stairs (toward the landing where he stands)
    {at: B.nodUp, pose: {headTurn: 0.2, lookX: 0.6, lookY: -1, headTilt: -24}, antic: 3},
    {at: B.nodUp + 8, pose: {headTilt: -12}, kind: 'pose'},
    {at: B.nodUp + 16, pose: {headTilt: -20}, kind: 'pose'},
    {at: B.sting, pose: {headTurn: -0.4, lookX: -0.7, lookY: 0.3, headTilt: 4, eyes: 'smile'}, kind: 'pose'},
  ];
  let qP = poseAt(qBase, qKeys, f);
  qP = withBlink({...qP, headTilt: qP.headTilt + idle('qz-st', f, 0.4)}, 'qz-st', f);
  const qSec = secondary(qBase, qKeys, f);
  const boxTilt = f >= bumpAt && f < bumpAt + 10 ? Math.sin(((f - bumpAt) / 10) * Math.PI * 2) * 8 : 0;

  // ── the son on the top landing: out of his door, rubbing his neck, halo a little crooked
  const sonIn = springAt(f, B.nodUp - 8, 'settle');
  const sonBase: Partial<Pose> = {facing: -1, profile: 0.5, armR: [150, 120], armL: [10, 14], headTilt: 10, headTurn: -0.4, lookX: -0.6, lookY: 0.4, eyes: 'squint'};
  const rub = Math.sin(f * 0.6) * 10;
  const sonKeys: Key[] = [
    {at: B.sting, pose: {eyes: 'smile', headTilt: 16, lookY: 0.9}, kind: 'pose'},
  ];
  let sonP = poseAt({...BASE, ...sonBase} as Pose, sonKeys, f);
  sonP = withBlink({...sonP, armR: [sonP.armR[0] + rub * 0.3, sonP.armR[1] + rub] as [number, number], headTilt: sonP.headTilt + talk(words('P13'), f, 5)}, 'son2-st', f);
  const sonSec = secondary({...BASE, ...sonBase} as Pose, sonKeys, f);
  const sonPos = {x: lerp(1000, 820, sonIn), y: T.y};
  const sj = joints(SON, sonP);
  const ha = (sj.headAng * Math.PI) / 180;
  const haloPos = {x: sj.head.x + Math.sin(ha) * 16, y: sj.head.y - Math.cos(ha) * 16};

  // ── the cat: sitting on the step, it watches him go over; one ear flick, a meow
  const catAlert = clamp01((f - B.catOver + 4) / 6) * (1 - clamp01((f - overEnd - 10) / 8));

  const wallTone = '#3A3326';
  const lowerTone = '#24301F';
  const stepTone = '#1A1712';
  return (
    <div style={{position: 'absolute', inset: 0, backgroundColor: '#07080D'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="bulbGlow2">
            <stop offset="0%" stopColor="#FFD08A" stopOpacity={0.55} />
            <stop offset="35%" stopColor={C.amberEdge} stopOpacity={0.22} />
            <stop offset="100%" stopColor={C.amberEdge} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="shaftFade2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#07080D" stopOpacity={0} />
            <stop offset="100%" stopColor="#07080D" stopOpacity={0.92} />
          </linearGradient>
          <radialGradient id="sonBloom2">
            <stop offset="0%" stopColor={VT_CORE} stopOpacity={0.6} />
            <stop offset="35%" stopColor={VT_BLUE} stopOpacity={0.25} />
            <stop offset="100%" stopColor={VT_BLUE} stopOpacity={0} />
          </radialGradient>
        </defs>
        <g transform={tr}>
          <rect x={-400} y={-200} width={1900} height={2400} fill={wallTone} />
          <rect x={-400} y={520} width={1900} height={1700} fill={lowerTone} />
          {Array.from({length: 14}, (_, i) => (
            <path key={i} d={`M${random(`pp-x-${i}`) * 1100 - 20} ${100 + random(`pp-y-${i}`) * 1000} q${20 + random(`pp-a-${i}`) * 40} -12 ${40 + random(`pp-b-${i}`) * 50} 4 q-6 ${16 + random(`pp-c-${i}`) * 20} -34 10 z`} fill="#000000" opacity={0.18} />
          ))}
          <g transform="translate(-10 560)">
            {Array.from({length: 4}, (_, r) =>
              Array.from({length: 5}, (_, c) => (
                <g key={`${r}-${c}`}>
                  <rect x={c * 46} y={r * 34} width={42} height={30} fill="#3E4250" />
                  <rect x={c * 46 + 8} y={r * 34 + 8} width={26} height={4} fill="#14161D" />
                </g>
              )),
            )}
          </g>
          {/* his apartment door on the top landing, ajar */}
          <rect x={860} y={T.y - 250} width={150} height={250} fill="#2A1C12" />
          <rect x={860} y={T.y - 250} width={34} height={250} fill={mix('#FFD9A0', '#2A1C12', 0.55)} opacity={sonIn} />
          <rect x={850} y={T.y - 262} width={170} height={12} fill="#1A120C" />
          <rect x={T.x0} y={T.y} width={T.x1 - T.x0 + 200} height={40} fill={stepTone} />
          <rect x={HA.x0 - 200} y={HA.y} width={HA.x1 - HA.x0 + 200} height={40} fill={stepTone} />
          <Flight x0={FL_A.x0} y0={FL_A.y0} n={FL_A.n} dir={-1} tone={stepTone} />
          <Flight x0={FL_B.x0} y0={FL_B.y0} n={FL_B.n} dir={1} tone={stepTone} />
          <rect x={FL_B.x0 + FL_B.n * STEP.w} y={BOTTOM.y} width={600} height={40} fill={stepTone} />
          <Flight x0={FL_B.x0 + FL_B.n * STEP.w} y0={BOTTOM.y} n={12} dir={-1} tone={stepTone} />
          <rect x={-400} y={1100} width={1900} height={900} fill="url(#shaftFade2)" />
          <Bulb x={820} y={T.y - 300} t={t} seed="b1" />
          <Bulb x={120} y={HA.y - 290} t={t} seed="b2" />
          <Bulb x={820} y={1010} t={t} seed="b3" />
          {/* the cat, on the same step as in part 1 */}
          <g transform={`translate(${250} ${HA.y}) scale(2.2)`}>
            <Cat state={0} leap={0} facing={-1} t={t} />
            {catAlert > 0 && (
              <g fill={C.eye}>
                <circle cx={-11.6} cy={-9.6} r={1.5 * catAlert} />
                <circle cx={-16.4} cy={-9.6} r={1.5 * catAlert} />
              </g>
            )}
          </g>
          {/* the son on the landing (VolunTrack's light around his phone pocket) */}
          {sonIn > 0.01 && (
            <g transform={`translate(${sonPos.x} ${sonPos.y}) scale(2.05)`}>
              <circle cx={0} cy={-60} r={90} fill="url(#sonBloom2)" opacity={0.5 * sonIn} />
              <Figure b={SON} p={sonP} rim={{color: VT_RIM, dx: -1, dy: -0.6}} unitPx={camS * 2.05} sec={sonSec} />
              <g transform={`translate(${haloPos.x} ${haloPos.y})`}>
                <Halo tilt={sonP.headTilt * 1.4 - 10} />
              </g>
            </g>
          )}
          {/* the daughter with the box */}
          <g transform={`translate(${qPos.x} ${qPos.y}) scale(2.05)`}>
            <Figure b={QIZ} p={qP} rim={{color: '#FFD9A0', dx: 1, dy: -0.6}} unitPx={camS * 2.05} sec={qSec}
              holdR={<g transform="translate(-6 -2)"><BookBox tilt={boxTilt} /></g>} />
          </g>
          {/* the kid */}
          <g transform={`translate(${kidPos.x} ${kidPos.y}) scale(2.0)`}>
            <Figure b={KID as Build} p={kidP} rim={{color: '#FFD9A0', dx: 1, dy: -0.6}} unitPx={camS * 2} sec={kidSec} />
          </g>
        </g>
      </svg>
    </div>
  );
};
