// S4 · The investigation: a cutaway stairwell of zigzag flights, a dim bulb on each landing, mailboxes, peeling paint,
// a sleeping cat. The son's phone floods the stairwell with VolunTrack blue (VolunTrack-tagged file).
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {C} from '../theme';
import {mix, rgba} from '../color';
import {FPS, type Lang} from '../config';
import {clamp01, lerp, springAt, noise1D} from '../motion';
import {timelineFor} from '../data';
import {SON, makeKid, BASE, Figure, poseAt, secondary, withBlink, idle, joints, type Key, type Pose, type Build} from '../chars/rig';
import {Phone, Cat} from '../chars/props';
import {Halo, VT_RIM, VT_CORE, VT_BLUE} from '../chars/vtbits';
import {EASES} from '../camera';

const KID = makeKid(() => true);
const STEP = {w: 30, h: 25};
// geometry (stairwell units = screen px at camera scale 1)
const T = {y: 420, x0: 600, x1: 1080}; // top landing (the apartment door)
const HA = {y: 720, x0: -40, x1: 300}; // half-landing (the cat)
const FL_A = {x0: 600, y0: 420, n: 12}; // flight A: from T down-left to HA
const FL_B = {x0: 300, y0: 720, n: 12}; // flight B: from HA down-right
const BOTTOM = {y: 1020};

/** a point on flight A after s steps (feet position) */
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
  const d = `M${pts.join(' L')} L${xe} ${ye + 60} L${x0} ${y0 + 60} Z`;
  return (
    <g>
      <path d={d} fill={tone} />
      {/* banister */}
      <path d={`M${x0} ${y0 - 70} L${xe} ${ye - 70}`} stroke="#2A1E16" strokeWidth={7} fill="none" />
      {Array.from({length: n / 2}, (_, i) => {
        const x = x0 + dir * (i * 2 + 1) * STEP.w;
        const y = y0 + (i * 2 + 1) * STEP.h;
        return <rect key={i} x={x - 1.5} y={y - 70} width={3} height={70} fill="#1A1410" />;
      })}
    </g>
  );
};

const Bulb: React.FC<{x: number; y: number; t: number; seed: string; blue: number}> = ({x, y, t, seed, blue}) => {
  const fl = 0.85 + 0.15 * noise1D(seed, t * 1.3);
  return (
    <g>
      <line x1={x} y1={y - 90} x2={x} y2={y - 8} stroke="#1A1612" strokeWidth={2} />
      <circle cx={x} cy={y} r={170} fill="url(#bulbGlow)" opacity={0.75 * fl * (1 - 0.6 * blue)} />
      <circle cx={x} cy={y} r={9} fill="#FFE2B0" opacity={fl} />
    </g>
  );
};

export const StairwellScene: React.FC<{lang: Lang}> = ({lang}) => {
  const f = useCurrentFrame();
  const TL = timelineFor(lang);
  const B = TL.beats;
  const t = f / FPS;
  const start = B.push + 7;

  // ── blue: the phone turns toward the kid, the walls take the blue, the bloom grows; then the light fills the frame
  const blue = clamp01((f - B.phoneTurn) / 12);
  const fill = clamp01((f - B.flood) / Math.max(10, B.uiIn - B.flood));
  const fillE = EASES.inOut(fill);

  // ── camera: arrive through the door (scale 0.86 → 1), then drift down; push in on the two after the tumble
  const arrive = springAt(f, start, 'settle');
  const camS0 = lerp(0.86, 1, arrive);
  const push = EASES.inOut(clamp01((f - (B.tumbleLand + 6)) / 22));
  const camS = camS0 * lerp(1, 1.55, push) * (1 + 0.04 * clamp01((f - start) / (B.uiIn - start)));
  const focus = {x: lerp(540, 380, push), y: lerp(640 + (f - start) * 0.25, 745, push)};
  const tr = `translate(540 670) scale(${camS}) translate(${-focus.x} ${-focus.y})`;

  // ── the son: walks down flight B slowly, stops 4 steps down, checks his phone (glowing softly blue)
  const sonSteps = Math.min(4.8, Math.max(0, (f - start + 6) / 6.5));
  const sonPos = onB(sonSteps);
  const walking = f < start + 24;
  const ph = (f - start) * 0.45;
  const sonBase: Partial<Pose> = {profile: 1, facing: 1, armR: [60, -60], armL: [8, 10], headTilt: 10, lookY: 0.6, headTurn: 0.5};
  const sonWalk = walking
    ? {legL: [-18 * Math.sin(ph), 10 + 10 * Math.max(0, Math.sin(ph))] as [number, number], legR: [18 * Math.sin(ph), 10 + 10 * Math.max(0, -Math.sin(ph))] as [number, number]}
    : {legL: [-4, 2] as [number, number], legR: [6, 4] as [number, number]};
  const sonKeys: Key[] = [
    {at: B.catStep + 3, pose: {headTurn: -0.6, lookX: -1, lookY: -0.3, headTilt: -8, eyes: 'wide'}, kind: 'snap'},
    {at: B.catStep + 10, pose: {eyes: 'open'}, kind: 'settle'},
    // L12: he turns and offers a hand
    {at: B.offerHand - 2, pose: {facing: -1, profile: 0.4, armL: [70, -10], armR: [30, -40], headTurn: -0.5, lookX: -0.6, lookY: 0.8, headTilt: 14, lean: -6}, antic: 4},
    // L14: he smiles; the halo tilts
    {at: B.smile, pose: {eyes: 'smile', headTilt: 22, armL: [30, 20]}, kind: 'pose'},
    {at: B.smile + 12, pose: {headTilt: 8}, kind: 'settle'},
    // he turns his phone toward the kid
    {at: B.phoneTurn - 2, pose: {armR: [96, -10], eyes: 'open', headTilt: 6}, antic: 3},
  ];
  const sonP0 = {...BASE, ...sonBase, ...sonWalk} as Pose;
  let sonP = poseAt(sonP0, sonKeys, f);
  sonP = withBlink({...sonP, headTilt: sonP.headTilt + idle('son-st', f, 0.5)}, 'son-st', f);
  const sonSec = secondary(sonP0, sonKeys, f);
  const sonScale = 2.05;
  const sonLag = poseAt(sonP0, sonKeys, f - 3);
  const sparkle = clamp01((f - B.offerHand - 6) / 14);
  const sj = joints(SON, sonP);
  const ha = (sj.headAng * Math.PI) / 180;
  const haloPos = {x: sj.head.x + Math.sin(ha) * 16, y: sj.head.y - Math.cos(ha) * 16};

  // ── the kid: tiptoes down flight A, steps on the cat's tail at catStep, tumbles three steps, lands at his feet
  const tipU = clamp01((f - start) / Math.max(1, B.catStep - start));
  const kidSteps = 12 * tipU;
  const tumbleU = clamp01((f - B.catStep - 2) / Math.max(1, B.tumbleLand - B.catStep - 2));
  const tumbling = f >= B.catStep + 2 && f < B.tumbleLand;
  const landed = f >= B.tumbleLand;
  const kidPosA = onA(kidSteps);
  const kidTumble = {x: lerp(onA(12).x - 10, onB(1.3).x, tumbleU), y: lerp(onA(12).y, onB(1.6).y, tumbleU) - Math.sin(tumbleU * Math.PI) * 60};
  const kidPos = f < B.catStep + 2 ? (f < B.catStep ? kidPosA : {x: onA(12).x - 6, y: onA(12).y}) : landed ? {x: onB(1.3).x, y: onB(1.6).y} : kidTumble;
  const tp = (f - start) * 0.5;
  const tiptoe: Partial<Pose> = {
    profile: 1, facing: -1, lean: -14, armL: [120 + 10 * Math.sin(tp), -70], armR: [110 - 10 * Math.sin(tp), -80],
    legL: [-30 * Math.sin(tp) - 10, 40 + 30 * Math.max(0, Math.sin(tp))], legR: [30 * Math.sin(tp) - 10, 40 + 30 * Math.max(0, -Math.sin(tp))],
    lookX: -0.8, lookY: 0.6, headTurn: -0.7, sy: 1 + 0.03 * Math.sin(tp * 2),
  };
  const kidBase = {...BASE, ...tiptoe} as Pose;
  const kidKeys: Key[] = [
    {at: B.catStep, pose: {eyes: 'wide', lookY: -0.5, sy: 1.1, sx: 0.94, armL: [160, -10], armR: [160, -10]}, kind: 'snap'},
    // landed in a heap at his feet, on his knees
    {at: B.tumbleLand, pose: {rot: 0, lean: 18, sy: 0.9, sx: 1.08, legL: [86, -86], legR: [80, -80], y: 22, armL: [40, 10], armR: [50, 10], eyes: 'closed', facing: 1, headTurn: 0.3, lookX: 0.5}, kind: 'snap'},
    {at: B.tumbleLand + 3, pose: {sy: 1, sx: 1}, kind: 'settle'},
    {at: B.tumbleLand + 10, pose: {eyes: 'open', lookY: -0.6, headTilt: -16}, kind: 'snap'},
    // L13: grabs his sleeve, eyes wide
    {at: B.grab - 2, pose: {armR: [150, -40], armL: [120, -30], lean: 6, eyes: 'wide', headTilt: -20, lookX: 0.6, lookY: -1}, antic: 3},
    // L15: lit blue, eyes wide
    {at: B.vtLit, pose: {eyes: 'wide', headTilt: -24, lean: 2}, kind: 'pose'},
  ];
  let kidP = poseAt(kidBase, kidKeys, f);
  if (tumbling) kidP = {...kidP, rot: -tumbleU * 540, sy: 0.92, sx: 1.06, profile: 1, facing: -1, eyes: 'wide'};
  kidP = withBlink(kidP, 'kid-st', f);
  const kidSec = secondary(kidBase, kidKeys, f);
  const kidScale = 2.0;
  const kidRimColor = blue > 0.3 ? VT_RIM : '#FFD9A0';

  // ── the cat: asleep on the half-landing; yowl + leap at catStep
  const catU = clamp01((f - B.catStep) / 10);
  const catLeap = clamp01((f - B.catStep - 3) / 12);
  const catX = 226;

  const wallTone = mix('#3A3326', VT_BLUE, blue * 0.55);
  const lowerTone = mix('#24301F', VT_BLUE, blue * 0.45);
  const stepTone = mix('#1A1712', '#0A0F24', blue * 0.5);
  return (
    <div style={{position: 'absolute', inset: 0, backgroundColor: '#07080D'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="bulbGlow">
            <stop offset="0%" stopColor="#FFD08A" stopOpacity={0.55} />
            <stop offset="35%" stopColor={C.amberEdge} stopOpacity={0.22} />
            <stop offset="100%" stopColor={C.amberEdge} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="shaftFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#07080D" stopOpacity={0} />
            <stop offset="100%" stopColor="#07080D" stopOpacity={0.92} />
          </linearGradient>
          <radialGradient id="phoneBloom">
            <stop offset="0%" stopColor={VT_CORE} stopOpacity={0.9} />
            <stop offset="30%" stopColor={VT_BLUE} stopOpacity={0.45} />
            <stop offset="100%" stopColor={VT_BLUE} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="floodFill">
            <stop offset="0%" stopColor={VT_CORE} />
            <stop offset="60%" stopColor={mix(VT_CORE, VT_BLUE, 0.5)} />
            <stop offset="100%" stopColor={VT_BLUE} />
          </radialGradient>
        </defs>
        <g transform={tr}>
          {/* the shaft: upper wall whitewash, lower wall painted, peeling patches */}
          <rect x={-400} y={-200} width={1900} height={2400} fill={wallTone} />
          <rect x={-400} y={520} width={1900} height={1700} fill={lowerTone} />
          {Array.from({length: 14}, (_, i) => (
            <path key={i} d={`M${random(`pp-x-${i}`) * 1100 - 20} ${100 + random(`pp-y-${i}`) * 1000} q${20 + random(`pp-a-${i}`) * 40} -12 ${40 + random(`pp-b-${i}`) * 50} 4 q-6 ${16 + random(`pp-c-${i}`) * 20} -34 10 z`} fill="#000000" opacity={0.18} />
          ))}
          {/* mailboxes on the half-landing wall (no numbers) */}
          <g transform="translate(-10 560)">
            {Array.from({length: 4}, (_, r) =>
              Array.from({length: 5}, (_, c) => (
                <g key={`${r}-${c}`}>
                  <rect x={c * 46} y={r * 34} width={42} height={30} fill={mix('#3E4250', VT_BLUE, blue * 0.35)} />
                  <rect x={c * 46 + 8} y={r * 34 + 8} width={26} height={4} fill="#14161D" />
                </g>
              )),
            )}
          </g>
          {/* apartment door on the top landing */}
          <rect x={860} y={T.y - 250} width={150} height={250} fill="#2A1C12" />
          <rect x={850} y={T.y - 262} width={170} height={12} fill="#1A120C" />
          {/* landings */}
          <rect x={T.x0} y={T.y} width={T.x1 - T.x0 + 200} height={40} fill={stepTone} />
          <rect x={HA.x0 - 200} y={HA.y} width={HA.x1 - HA.x0 + 200} height={40} fill={stepTone} />
          <Flight x0={FL_A.x0} y0={FL_A.y0} n={FL_A.n} dir={-1} tone={stepTone} />
          <Flight x0={FL_B.x0} y0={FL_B.y0} n={FL_B.n} dir={1} tone={stepTone} />
          {/* lower floors continue down the shaft, out of the bulbs' reach */}
          <rect x={FL_B.x0 + FL_B.n * STEP.w} y={BOTTOM.y} width={600} height={40} fill={stepTone} />
          <Flight x0={FL_B.x0 + FL_B.n * STEP.w} y0={BOTTOM.y} n={12} dir={-1} tone={stepTone} />
          <rect x={-300} y={BOTTOM.y + 300} width={640} height={40} fill={stepTone} />
          <Flight x0={300} y0={BOTTOM.y + 300} n={12} dir={1} tone={stepTone} />
          <rect x={-400} y={BOTTOM.y + 60} width={1900} height={1200} fill="#000000" opacity={0.0} />
          <rect x={-400} y={1100} width={1900} height={900} fill="url(#shaftFade)" />
          <Bulb x={820} y={T.y - 300} t={t} seed="b1" blue={blue} />
          <Bulb x={120} y={HA.y - 290} t={t} seed="b2" blue={blue} />
          <Bulb x={820} y={1010} t={t} seed="b3" blue={blue} />
          {/* the cat */}
          {f < B.catStep + 22 && (
            <g transform={`translate(${catX} ${HA.y}) scale(2.2)`}>
              <Cat state={catU > 0 ? 1 : 0} leap={catLeap} facing={-1} t={t} />
            </g>
          )}
          {/* the son, glowing softly blue */}
          <g transform={`translate(${sonPos.x} ${sonPos.y}) scale(${sonScale})`}>
            <circle cx={sj.wR.x} cy={sj.wR.y} r={60 + 140 * blue} fill="url(#phoneBloom)" opacity={0.35 + 0.65 * blue} />
            <Figure b={SON} p={sonP} rim={{color: VT_RIM, dx: 1, dy: -0.6}} unitPx={camS * sonScale} sec={sonSec}
              holdR={<Phone screen={VT_CORE} angle={sonP.armR[0] > 80 ? -90 : 20} glow={0.8} />} />
            <g transform={`translate(${haloPos.x} ${haloPos.y})`}>
              <Halo tilt={sonLag.headTilt * 1.4} sparkle={f >= B.offerHand + 6 && sparkle < 1 ? sparkle : -1} />
            </g>
          </g>
          {/* the kid */}
          <g transform={`translate(${kidPos.x} ${kidPos.y}) scale(${kidScale})`}>
            <Figure b={KID as Build} p={kidP} rim={{color: kidRimColor, dx: 1, dy: -0.6}} unitPx={camS * kidScale} sec={kidSec} />
          </g>
          {/* blue light on the kid's face */}
          {f >= B.vtLit - 4 && (
            <circle cx={onB(1.3).x} cy={onB(1.6).y - 70} r={120} fill="url(#phoneBloom)" opacity={0.5 * clamp01((f - B.vtLit + 4) / 6)} />
          )}
        </g>
        {/* the light fills the frame (ramps over ≥10 frames: no flash) */}
        {fill > 0 && (
          <g>
            <circle cx={540 + (sonPos.x - 380) * 0.5} cy={700} r={lerp(120, 1500, fillE)} fill="url(#floodFill)" opacity={clamp01(fillE * 1.4)} />
            <rect x={0} y={0} width={1080} height={1920} fill={VT_BLUE} opacity={fillE * fillE * 0.9} />
          </g>
        )}
        {/* fills the rest of the frame below the shaft */}
        <rect x={0} y={0} width={1080} height={1920} fill={rgba(C.shadow, 0)} />
      </svg>
    </div>
  );
};
