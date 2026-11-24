// What plays inside the story windows (stage units 1000×871, floor at 830) and on the story balconies (world units).
// VolunTrack-tagged: the son's windows, the deed windows and the kid's blue room use VolunTrack light.
import React from 'react';
import {C} from '../theme';
import {mix, rgba} from '../color';
import {clamp01, lerp, springAt, noise1D, ease, EASE, blueOn} from '../motion';
import {ANA, SON, QONSU, CHILD, RUNNER, makeKid, BASE, Figure, joints, poseAt, secondary, withBlink, idle, type Key, type Pose, type Build} from '../chars/rig';
import {Phone, TeaGlass, Cup, Sapling, Modem, Board} from '../chars/props';
import {runCycle} from '../chars/gait';
import {BlueRoom, Halo, VT_RIM, VT_CORE} from '../chars/vtbits';
import {WINDOW_D_SUBTITLE} from '../config';

export type SP = {f: number; t: number; B: Record<string, number>; zpx: number; env?: number};

const FLOOR = 830;
const S_ADULT = 6.2;
const KID_HOOD = makeKid(() => true);
const KID_HAIR = makeKid(() => false, {id: 'kidHair'});
const Q_KID = makeKid(() => false, {id: 'qkid', hairOnly: true});

/** A posed figure on a stage. */
const Actor: React.FC<{
  b: Build; base: Partial<Pose>; keys: Key[]; f: number; seed: string; x: number; y?: number; s?: number; zpx: number;
  rim: string; rimDir?: [number, number]; holdL?: React.ReactNode; holdR?: React.ReactNode; overlay?: (p: Pose) => React.ReactNode;
  mod?: (p: Pose) => Pose; point?: 'L' | 'R';
}> = ({b, base, keys, f, seed, x, y = FLOOR, s = S_ADULT, zpx, rim, rimDir = [-1, -0.8], holdL, holdR, overlay, mod, point}) => {
  const b0 = {...BASE, ...base};
  let p = poseAt(b0, keys, f);
  p = {...p, headTilt: p.headTilt + idle(seed, f, 0.6)};
  p = withBlink(p, seed, f);
  if (mod) p = mod(p);
  const sec = secondary(b0, keys, f);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Figure b={b} p={p} rim={{color: rim, dx: rimDir[0], dy: rimDir[1]}} unitPx={zpx * s} sec={sec} holdL={holdL} holdR={holdR} overlay={overlay?.(p)} point={point} />
    </g>
  );
};

/** Halo above a figure's head, in the figure's pose space (it tilts with the head, lagging 3 frames). */
const haloFor = (b: Build, base: Partial<Pose>, keys: Key[], f: number, opacity = 1, sparkle = -1) => (p: Pose) => {
  const lagged = poseAt({...BASE, ...base}, keys, f - 3);
  const tilt = lagged.headTilt * 1.4 + lagged.lean * 0.4;
  const j = joints(b, p);
  const a = (j.headAng * Math.PI) / 180;
  const d = b.headR + 7.5;
  return (
    <g transform={`translate(${j.head.x + Math.sin(a) * d} ${j.head.y - Math.cos(a) * d})`}>
      <Halo tilt={tilt} opacity={opacity} sparkle={sparkle} />
    </g>
  );
};

const Books: React.FC<{x: number; y: number; n?: number; fill?: string}> = ({x, y, n = 7, fill = C.shadow}) => {
  let cx = x;
  return (
    <g fill={fill}>
      <rect x={x - 12} y={y} width={n * 26 + 10} height={10} />
      {Array.from({length: n}, (_, i) => {
        const w = 16 + ((i * 7) % 9);
        const h = 50 + ((i * 13) % 26);
        const el = <rect key={i} x={cx} y={y - h} width={w} height={h} transform={i === n - 1 ? `rotate(14 ${cx} ${y})` : undefined} />;
        cx += w + 5;
        return el;
      })}
    </g>
  );
};

// ───────────────────────────── The son's own window (S1, S2, S6) ─────────────────────────────
export const SonStage: React.FC<SP & {level: number}> = ({f, t, B, zpx, level}) => {
  const base: Partial<Pose> = {armL: [18, 52], armR: [18, 52], headTurn: -0.55, lookX: -0.6};
  const keys: Key[] = [
    {at: B.sonTurn, pose: {headTurn: 0, lookX: 0}},
    {at: B.sonTurn + 14, pose: {headTilt: 7}, kind: 'pose'},
    {at: B.sonTurn + 26, pose: {headTilt: 0}, kind: 'settle'},
    {at: B.whipBack - 10, pose: {headTurn: -0.7, lookX: -1}},
  ];
  return (
    <g>
      <BlueRoom id="rm-son" level={level} />
      <Books x={90} y={360} n={6} />
      <g fill={C.shadow}>
        <rect x={810} y={700} width={70} height={130} />
        <ellipse cx={845} cy={650} rx={70} ry={60} />
        <ellipse cx={800} cy={690} rx={40} ry={34} />
      </g>
      <Actor b={SON} base={base} keys={keys} f={f} seed="son" x={500} zpx={zpx} rim={VT_RIM} overlay={haloFor(SON, base, keys, f)} />
    </g>
  );
};

// ───────────────────────────── Window A: he plants a sapling ─────────────────────────────
export const PlantStage: React.FC<SP & {start: number; level: number; who: 'son' | 'kid'}> = ({f, B, zpx, start, level, who}) => {
  const kneel: Partial<Pose> = {profile: 1, facing: 1, y: 24.5, lean: 26, legR: [88, -88], legL: [-6, -84], armR: [38, 14], armL: [28, 22], headTilt: 10, lookY: 0.6};
  const keys: Key[] = [
    {at: start - 6, pose: {armR: [52, 8], armL: [44, 14]}, kind: 'settle'},
    {at: start - 2, pose: {armR: [34, 16], armL: [26, 22]}, kind: 'pose', antic: 2},
    {at: start + 5, pose: {lean: -2, armR: [70, -30], armL: [60, -20], headTilt: -6, lookY: -0.3}},
    {at: start + 20, pose: {headTurn: who === 'son' ? 0.2 : 0.35, lookX: -0.2, lookY: 0, eyes: 'smile'}, kind: 'pose'},
  ];
  const g = springAt(f, start + 4, 'pose', 12);
  const b = who === 'son' ? SON : KID_HAIR;
  return (
    <g>
      <BlueRoom id={`rm-plant-${who}`} level={level} floorY={790} />
      <path d="M520 830 q110 -70 220 0 z" fill={C.shadow} />
      <g transform="translate(630 800)">
        <Sapling g={g} h={430} />
      </g>
      <Actor b={b} base={kneel} keys={keys} f={f} seed={`plant-${who}`} x={360} zpx={zpx} rim={VT_RIM} rimDir={[1, -0.8]}
        overlay={who === 'son' ? haloFor(SON, kneel, keys, f) : undefined} />
    </g>
  );
};

// ───────────────────────────── Window B: a little board, three small kids raise their hands ─────────────────────────────
export const TeachStage: React.FC<SP & {start: number; level: number; who: 'son' | 'kid'}> = ({f, zpx, start, level, who}) => {
  const b = who === 'son' ? SON : KID_HAIR;
  const base: Partial<Pose> = {armL: [150, -10], armR: [14, 20], headTurn: 0.45, lookX: 0.8, lean: 3};
  const keys: Key[] = [{at: start + 3, pose: {armL: [128, -24], lean: 6}}, {at: start + 20, pose: {headTurn: 0.6, eyes: 'smile'}}];
  return (
    <g>
      <BlueRoom id={`rm-teach-${who}`} level={level} />
      <g transform="translate(200 540)">
        <Board w={300} h={200} />
      </g>
      <Actor b={b} base={base} keys={keys} f={f} seed={`teach-${who}`} x={405} zpx={zpx} rim={VT_RIM} rimDir={[1, -0.8]}
        overlay={who === 'son' ? haloFor(SON, base, keys, f) : undefined} />
      {[0, 1, 2].map((i) => {
        const at = start + 6 + i * 6;
        const kb: Partial<Pose> = {profile: 1, facing: -1, armR: [20, 30], armL: [16, 30], y: 13, legL: [86, -86], legR: [80, -80], lean: -4};
        const kk: Key[] = [{at, pose: {armR: [152, 6], armL: [10, 30], lean: -8, eyes: 'wide', headTilt: -8}}];
        return (
          <g key={i}>
            <rect x={600 + i * 122} y={FLOOR - 70} width={66} height={70} fill={C.shadow} />
            <Actor b={CHILD} base={kb} keys={kk} f={f} seed={`ch-${i}`} x={630 + i * 122} y={FLOOR - 70} s={5} zpx={zpx} rim={VT_RIM} rimDir={[1, -0.8]} />
          </g>
        );
      })}
    </g>
  );
};

/** A running pose at phase ph (radians): see src/chars/gait.ts. */
const runPose = (ph: number, facing: 1 | -1): Partial<Pose> => runCycle(RUNNER, ph, facing);

// ───────────────────────────── Window C: water at the marathon; one cup flies, he catches it ─────────────────────────────
export const WaterStage: React.FC<SP & {start: number; level: number; who: 'son' | 'kid'}> = ({f, zpx, start, level, who}) => {
  const b = who === 'son' ? SON : KID_HAIR;
  const catchAt = start + 30;
  const base: Partial<Pose> = {profile: 1, facing: 1, armR: [78, -4], armL: [20, 30]};
  const keys: Key[] = [
    {at: start + 12, pose: {armR: [40, 20]}, kind: 'settle'},
    {at: start + 18, pose: {eyes: 'wide', headTilt: -12, lookY: -1}},
    {at: catchAt - 3, pose: {armL: [165, -6], lean: -6}},
    {at: catchAt + 6, pose: {eyes: 'smile', headTilt: 0, lookY: 0, headTurn: 0.3}},
  ];
  // the flying cup: from the table (x 520,y 610) up and over into his raised left hand
  const u = clamp01((f - (start + 16)) / (catchAt - (start + 16)));
  const cupX = lerp(560, 395, u);
  const cupY = 610 - Math.sin(u * Math.PI) * 330 - u * 60;
  const runners = [0, 1, 2, 3, 4].map((i) => {
    const t0 = start - 12 + i * 10;
    const x = -200 + (f - t0) * 68; // ~620 units per stride pair at 0.7 rad/frame: feet don't slide
    return {i, x, ph: (f - t0) * 0.7 + i * 1.3};
  });
  return (
    <g>
      <BlueRoom id={`rm-water-${who}`} level={level} />
      {/* table with cups */}
      <rect x={300} y={620} width={300} height={16} fill={C.shadow} />
      <rect x={315} y={636} width={12} height={194} fill={C.shadow} />
      <rect x={573} y={636} width={12} height={194} fill={C.shadow} />
      {[340, 380, 420, 460, 500].map((x, i) => (
        <g key={i} transform={`translate(${x} 620) scale(5)`}>
          <Cup />
        </g>
      ))}
      <Actor b={b} base={base} keys={keys} f={f} seed={`water-${who}`} x={250} zpx={zpx} rim={VT_RIM} rimDir={[1, -0.8]}
        holdR={f < start + 8 ? <Cup s={1} /> : undefined}
        overlay={who === 'son' ? haloFor(SON, base, keys, f) : undefined} />
      {f >= start + 16 && f < catchAt && (
        <g transform={`translate(${cupX} ${cupY}) rotate(${u * 300}) scale(5)`}>
          <Cup spill={u} />
        </g>
      )}
      {f >= catchAt && (() => {
        return null;
      })()}
      {runners.map((r) =>
        r.x > -150 && r.x < 1150 ? (
          <g key={r.i}>
            {[3, 2, 1].map((k) => (
              <g key={k} opacity={0.12 * (4 - k)}>
                <Actor b={RUNNER} base={runPose(r.ph - k * 0.23, 1)} keys={[]} f={f} seed={`rn-${r.i}`} x={r.x - k * 22} y={FLOOR + 20} s={5.6} zpx={zpx} rim={VT_RIM} rimDir={[-1, -0.8]} />
              </g>
            ))}
            <Actor b={RUNNER} base={runPose(r.ph, 1)} keys={[]} f={f} seed={`rn-${r.i}`} x={r.x} y={FLOOR + 20} s={5.6} zpx={zpx} rim={VT_RIM} rimDir={[-1, -0.8]}
              holdR={r.i === 0 && f > start + 8 ? <Cup s={1} /> : undefined} />
          </g>
        ) : null,
      )}
    </g>
  );
};

// ───────────────────────────── Window D: at a desk, typing a subtitle "Hello → Salam" ─────────────────────────────
// Side view: he sits on a chair (thighs level, shins straight down), hands on the laptop keyboard, eyes on the screen;
// he turns to us with a smile once the line is translated, then goes back to work.
export const TranslateStage: React.FC<SP & {start: number; level: number}> = ({f, zpx, start, level}) => {
  const typing = 1 - 0.8 * ease(f, start + 22, 6, EASE.inOut) + 0.8 * ease(f, start + 54, 8, EASE.inOut);
  const tap = Math.sin(f * 1.9) * 5 * typing;
  const base: Partial<Pose> = {
    profile: 1, facing: 1, y: 24.5, lean: 8,
    legL: [90, -90], legR: [86, -86],
    armL: [30, 70], armR: [27, 73],
    headTurn: 0.7, lookX: 0.6, lookY: 0.35, headTilt: 6,
  };
  const keys: Key[] = [
    {at: start + 24, pose: {headTurn: 0.12, lookX: 0, lookY: 0, eyes: 'smile', headTilt: -3, lean: 4}},
    {at: start + 54, pose: {headTurn: 0.7, lookX: 0.6, lookY: 0.35, eyes: 'open', headTilt: 6, lean: 8}},
  ];
  const nod = Math.sin(f * 0.45) * 1.5 * typing;
  const text = `${WINDOW_D_SUBTITLE.from}  ${WINDOW_D_SUBTITLE.to}`;
  const n = Math.max(0, Math.min(text.length, Math.floor((f - start - 4) / 2)));
  const shownFrom = WINDOW_D_SUBTITLE.from.slice(0, Math.min(n, WINDOW_D_SUBTITLE.from.length));
  const arrowOn = n > WINDOW_D_SUBTITLE.from.length;
  const shownTo = WINDOW_D_SUBTITLE.to.slice(0, Math.max(0, n - WINDOW_D_SUBTITLE.from.length - 2));
  const caret = Math.floor(f / 8) % 2 === 0;
  const glow = 0.75 + 0.25 * Math.sin(f * 0.3);
  return (
    <g>
      <BlueRoom id="rm-translate" level={level} />
      <defs>
        <linearGradient id="tr-screen" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor={VT_CORE} stopOpacity={0.55} />
          <stop offset="100%" stopColor={VT_CORE} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* chair: back, seat, two legs (behind him) */}
      <g fill={C.shadow}>
        <rect x={282} y={462} width={18} height={258} rx={6} />
        <rect x={282} y={704} width={170} height={16} rx={5} />
        <rect x={288} y={716} width={13} height={114} />
        <rect x={430} y={716} width={13} height={114} />
      </g>
      {/* desk: top and two legs clear of his feet */}
      <g fill={C.shadow}>
        <rect x={458} y={616} width={482} height={16} rx={3} />
        <rect x={586} y={630} width={14} height={200} />
        <rect x={912} y={630} width={14} height={200} />
      </g>
      <path d="M460 616.5 h478" stroke={VT_RIM} strokeWidth={2.5} opacity={0.55} />
      {/* the screen's light falling on his face and hands */}
      <path d="M662 606 L698 462 L390 360 L390 640 Z" fill="url(#tr-screen)" opacity={0.5 * glow * clamp01(level)} />
      <Actor b={SON} base={{...base, armL: [30, 70 + tap], armR: [27, 73 - tap], headTilt: 6 + nod}} keys={keys} f={f} seed="tr" x={360} zpx={zpx} rim={VT_RIM} rimDir={[1, -0.8]}
        overlay={haloFor(SON, base, keys, f)} />
      {/* laptop in profile: base on the desk, lid open toward him, the screen face lit */}
      <g>
        <rect x={478} y={604} width={190} height={12} rx={3} fill={C.shadow} />
        <path d="M660 610 L696 461 L708 464 L672 612 Z" fill={C.shadow} />
        <path d="M663 604 L697 466" stroke={VT_CORE} strokeWidth={5} strokeLinecap="round" opacity={0.95} />
        <path d="M480 604.5 h176" stroke={VT_RIM} strokeWidth={2} opacity={0.6} />
      </g>
      {n > 0 && (
        <g>
          <rect x={240} y={96} width={700} height={118} rx={18} fill={rgba(C.shadow, 0.72)} />
          <text x={316} y={182} fontFamily="Inter" fontWeight={700} fontSize={78} fill={C.eye}>
            {shownFrom}
            {caret && !arrowOn ? '|' : ''}
          </text>
          {arrowOn && <path d="M545 154 h80 m-26 -24 l26 24 l-26 24" stroke={C.eye} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
          <text x={656} y={182} fontFamily="Inter" fontWeight={700} fontSize={78} fill={C.eye}>
            {shownTo}
            {caret && arrowOn ? '|' : ''}
          </text>
        </g>
      )}
    </g>
  );
};

// ───────────────────────────── The kid's room (S3; S5 end; S6) ─────────────────────────────
export const KidRoomStage: React.FC<SP & {blue: number; amber: number; phase: 's3' | 's5' | 's6'}> = ({f, t, B, zpx, blue, amber, phase}) => {
  const lampGlow = amber;
  // door: open from Ana's arrival until the slam
  const openT = phase === 's3' ? clamp01((f - (B.anaDoor - 6)) / 5) : 0;
  const slam = phase === 's3' ? clamp01((f - (B.doorSlam - 3)) / 3) : 0;
  const doorOpen = phase === 's3' ? openT * (1 - slam) + (f > B.doorSlam ? Math.max(0, Math.sin((f - B.doorSlam) * 1.4) * 0.06 * Math.exp(-(f - B.doorSlam) * 0.35)) : 0) : 0;
  const hall = doorOpen;
  // modem nerves: faster and faster through L09, calm after he's gone
  const rate = phase !== 's3' ? 0.8 : f < B.plugReach ? 1 : f < B.flip ? lerp(1.5, 11, clamp01((f - B.plugReach) / (B.flip - B.plugReach))) : f < B.bolt + 4 ? 12 : lerp(12, 1, clamp01((f - B.bolt - 4) / 14));

  // the kid
  const flip = B.flip;
  // S3: on his back across the bed, legs straight up the wall (the tall headboard), phone held up over his face
  const LIE: Partial<Pose> = {profile: 1, facing: -1, rot: 90, x: -27, y: 36, lean: 0, legL: [92, 0], legR: [86, -6], armL: [116, -22], armR: [110, -30], headTilt: 20, headTurn: 0, lookX: -0.6, lookY: 0.1};
  const STAND = {rot: 0, x: -12.5, y: 31.8, profile: 0, facing: 1 as const};
  const kidBase: Partial<Pose> = phase === 's3'
    ? LIE
    : {profile: 1, facing: 1, y: 43, lean: -6, legL: [140, -100], legR: [134, -96], armR: [8, 96], armL: [12, 90], headTilt: 16, headTurn: 0.55, lookX: 0.5, lookY: 0.6};
  const kidKeys: Key[] = phase === 's3'
    ? [
        // on "Mən?.." his eyes slide toward her (the door), then back to the phone
        {at: B.eyesSlide, pose: {lookY: -1, lookX: 0.25}, kind: 'snap'},
        {at: B.eyesSlide + 12, pose: {lookY: 0.1, lookX: -0.6}, kind: 'settle'},
        {at: B.plugReach + 22, pose: {lookY: -1, lookX: 0.2, eyes: 'wide'}, kind: 'snap'},
        // flip upright in one move: stretch on the way up, squash on landing (f452–464)
        {at: flip, pose: {...STAND, legL: [6, 0], legR: [6, 0], armL: [140, 10], armR: [150, 10], sy: 1.15, sx: 0.92, headTilt: 0, eyes: 'wide', lookX: 0.4, lookY: -0.7}, antic: 3},
        {at: flip + 9, pose: {sy: 0.9, sx: 1.08, legL: [22, -38], legR: [20, -36]}, kind: 'pose', antic: 1},
        {at: flip + 13, pose: {sy: 1, sx: 1, legL: [4, 0], legR: [4, 0], armR: [150, -20], lookY: -0.9}, kind: 'settle'},
        {at: B.bolt - 6, pose: {armR: [40, 40], armL: [30, 30], lookY: 0, lookX: 1, headTurn: 0.6, eyes: 'open'}},
      ]
    : phase === 's5'
      ? [{at: B.bedroomBlue + 2, pose: {eyes: 'smile', headTurn: 0.15, lookX: 0, lookY: 0, headTilt: -2, lean: -4}}]
      : [];
  const phoneScreen = phase === 's3' ? C.phoneWhite : C.phoneWhite;
  // phone flies up on the flip and he catches it
  const phoneFly = phase === 's3' ? clamp01((f - flip) / 14) : 0;
  const kidVisible = phase !== 's6' && !(phase === 's3' && f >= B.bolt);
  // the dash out of the door: a real run cycle, from where he landed to beyond the doorway before the slam
    const boltModAt = (ff: number) => (p: Pose): Pose => {
    if (phase !== 's3' || ff < B.bolt) return p;
    const u = clamp01((ff - B.bolt) / Math.max(4, B.doorSlam - B.bolt));
    const run = runCycle(KID_HOOD, (ff - B.bolt) * 0.85, 1, {lean: 20, reach: 1.15});
    return {...p, ...run, x: lerp(STAND.x, 118, u * u * (3 - 2 * u)), y: STAND.y + (run.y ?? 0), rot: 0, sx: 1, sy: 1, headTurn: 0.6} as Pose;
  };
  const boltMod = boltModAt(f);

  // Ana in the doorway
  const anaBase: Partial<Pose> = {x: 0, armL: [40, -112], armR: [40, -112], facing: -1, headTurn: -0.3, lookX: -0.5};
  const anaKeys: Key[] = [
    {at: B.anaDoor, pose: {x: 0}, kind: 'snap'},
    {at: B.anaDoor + 22, pose: {lean: -5, armL: [70, -60], headTilt: -8}, kind: 'pose'},
    {at: B.anaDoor + 36, pose: {lean: 0, armL: [40, -112], headTilt: 0}, kind: 'settle'},
    // the silence: eyes narrow, the head turns slowly toward the modem
    {at: B.silence, pose: {eyes: 'squint'}, kind: 'snap'},
    {at: B.silence + 2, pose: {headTurn: -0.95, lookX: -1, headTilt: 6}, kind: 'slow', dur: 16},
    // her hand moves slowly to the plug (and she takes one slow step)
    {at: B.plugReach, pose: {x: -24, armL: [84, -10], lean: -5}, kind: 'slow', dur: 30},
    {at: B.flip + 2, pose: {eyes: 'wide', headTurn: 0, lookX: 0.3}, kind: 'snap'},
    {at: B.bolt + 2, pose: {headTurn: 0.8, lookX: 1, armL: [40, -112], lean: 6}, kind: 'pose'},
    {at: B.bolt + 16, pose: {eyes: 'squint', headTilt: -6}, kind: 'settle'},
  ];
  const anaVisible = phase === 's3' && f >= B.anaDoor - 2;
  const anaSlideIn = phase === 's3' ? lerp(80, 0, springAt(f, B.anaDoor - 3, 'pose')) : 0;

  const roomId = `rm-kid-${phase}`;
  return (
    <g>
      <defs>
        <radialGradient id={`${roomId}-a`} cx="22%" cy="46%" r="85%">
          <stop offset="0%" stopColor={mix(C.amber, '#FFE2B0', 0.2)} />
          <stop offset="40%" stopColor={mix(C.amber, C.amberEdge, 0.6)} />
          <stop offset="100%" stopColor="#3A1A08" />
        </radialGradient>
        <linearGradient id={`${roomId}-h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD9A0" />
          <stop offset="100%" stopColor={C.amberEdge} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={1000} height={871} fill="#0A0B12" />
      <rect x={0} y={0} width={1000} height={871} fill={`url(#${roomId}-a)`} opacity={0.62 * lampGlow} />
      {blue > 0 && <BlueRoom id={`${roomId}-b`} level={blue} />}
      {/* wallpaper stripes */}
      {Array.from({length: 20}, (_, i) => (
        <rect key={i} x={i * 50 + 12} y={0} width={14} height={FLOOR} fill="#000000" opacity={0.05} />
      ))}
      <rect x={0} y={FLOOR} width={1000} height={41} fill="#07080F" opacity={0.7} />
      {/* door + hallway light */}
      <rect x={745} y={190} width={180} height={FLOOR - 190} fill="#06070C" />
      {hall > 0 && <rect x={755} y={200} width={160} height={FLOOR - 200} fill={`url(#${roomId}-h)`} opacity={0.85 * hall} />}
      {hall > 0 && <path d={`M755 ${FLOOR} L915 ${FLOOR} L980 871 L690 871 Z`} fill={C.amber} opacity={0.18 * hall} />}
      <path d={`M755 200 L${755 + 160 * (1 - doorOpen)} ${200 + 18 * doorOpen} L${755 + 160 * (1 - doorOpen)} ${FLOOR - 18 * doorOpen} L755 ${FLOOR} Z`} fill={mix('#2A1C12', '#120C08', doorOpen)} />
      <circle cx={755 + 160 * (1 - doorOpen) - 18} cy={520} r={7} fill={C.shadow} />
      <rect x={735} y={180} width={200} height={14} fill={C.shadow} />
      {/* the shelf with the modem, left of the door */}
      <rect x={560} y={420} width={170} height={12} fill={C.shadow} />
      <g transform="translate(640 420) scale(0.95)">
        <Modem t={t} rate={rate} />
      </g>
      <rect x={700} y={398} width={34} height={22} rx={4} fill={C.shadow} />
      {/* lamp */}
      <rect x={40} y={560} width={110} height={270} fill={C.shadow} />
      <rect x={88} y={470} width={8} height={90} fill={C.shadow} />
      <path d="M60 470 l18 -60 h28 l18 60 z" fill={mix(C.amber, '#FFE2B0', 0.5)} opacity={0.4 + 0.6 * lampGlow} />
      {/* bed */}
      <rect x={150} y={230} width={74} height={600} fill="#4A2E1A" />
      <rect x={150} y={230} width={74} height={600} fill={`url(#${roomId}-a)`} opacity={0.35} />
      <rect x={218} y={230} width={6} height={600} fill="#7A4E2C" opacity={0.7} />
      <rect x={146} y={222} width={82} height={12} fill={C.shadow} />
      <rect x={180} y={650} width={470} height={60} rx={10} fill={C.shadow} />
      <rect x={190} y={710} width={14} height={120} fill={C.shadow} />
      <rect x={624} y={710} width={14} height={120} fill={C.shadow} />
      <rect x={470} y={620} width={130} height={34} rx={16} fill={C.shadow} />
      {/* the kid */}
      {kidVisible && (
        <Actor
          b={phase === 's3' ? KID_HOOD : KID_HAIR}
          base={kidBase}
          keys={kidKeys}
          f={f}
          seed="kid"
          x={phase === 's3' ? 400 : 290}
          y={phase === 's3' ? 652 : 652}
          s={5.6}
          zpx={zpx}
          rim={phase === 's5' && blue > 0.5 ? VT_RIM : mix(C.amber, '#FFFFFF', 0.25)}
          rimDir={[-1, -0.6]}
          mod={boltMod}
          holdR={phoneFly > 0 && phoneFly < 1 ? undefined : <Phone screen={phase === 's5' && blue > 0.5 ? VT_CORE : phoneScreen} glow={1} angle={phase === 's3' && f < flip ? -90 : 0} />}
        />
      )}
      {phase === 's6' && f >= B.kidStep - 6 && <KidAtWindow f={f} t={t} B={B} zpx={zpx} />}
      {phase === 's3' && phoneFly > 0 && phoneFly < 1 && (
        <g transform={`translate(${lerp(432, 487, phoneFly)} ${lerp(415, 262, phoneFly) - Math.sin(phoneFly * Math.PI) * 200}) rotate(${phoneFly * 540}) scale(5.6)`}>
          <Phone screen={phoneScreen} glow={0.6} />
        </g>
      )}
      {/* Ana */}
      {anaVisible && (
        <g transform={`translate(${anaSlideIn} 0)`}>
          <Actor b={ANA} base={anaBase} keys={anaKeys} f={f} seed="ana-room" x={845} s={5.2} zpx={zpx} rim={'#FFD9A0'} rimDir={[-1, -0.4]} />
        </g>
      )}
      {/* the dash past her: drawn in front, with a smear */}
      {phase === 's3' && f >= B.bolt && f <= B.doorSlam &&
        [3, 2, 1, 0].map((k) => (
          <g key={k} opacity={k === 0 ? 1 : 0.16 * (4 - k)}>
            <Actor b={KID_HOOD} base={kidBase} keys={kidKeys} f={f - k * 0.5} seed="kid" x={400} y={652} s={5.6} zpx={zpx}
              rim={mix(C.amber, '#FFFFFF', 0.25)} rimDir={[-1, -0.6]} mod={boltModAt(f - k * 0.5)}
              holdR={k === 0 ? <Phone screen={phoneScreen} glow={0.6} angle={0} /> : undefined} />
          </g>
        ))}
    </g>
  );
};

// ───────────────────────────── Balcony actors (world units) ─────────────────────────────
/** S1: Ana mid-swing into a point, then holding it across the courtyard. S6: she bursts out, chest out, arms wide. */
export const AnaOnBalcony: React.FC<{f: number; B: Record<string, number>; zpx: number; x: number; y: number; mode: 's1' | 's6'; shake?: number}> = ({f, B, zpx, x, y, mode, shake = 0}) => {
  if (mode === 's1') {
    const base: Partial<Pose> = {facing: 1, armR: [78, -30], armL: [36, -100], lean: 2, headTurn: 0.55, lookX: 1, headTilt: -4};
    const keys: Key[] = [
      {at: 2, pose: {armR: [118, -4], lean: 9}, antic: 0},
      {at: B.whipStart - 3, pose: {armR: [114, -2], lean: 12, headTilt: -9}, kind: 'pose', antic: 3},
    ];
    return (
      <g transform={`translate(${shake} 0)`}>
        <Actor b={ANA} base={base} keys={keys} f={f} seed="ana-b1" x={x} y={y} s={1.12} zpx={zpx} rim={mix(C.amber, '#FFFFFF', 0.2)} rimDir={[-1, -0.7]} point="R" />
      </g>
    );
  }
  const burst = B.anaBurst;
  if (f < burst - 4) return null;
  const base: Partial<Pose> = {x: -40, facing: 1, armL: [20, 30], armR: [20, 30], lean: 10, eyes: 'open'};
  const keys: Key[] = [
    {at: burst - 2, pose: {x: 0, lean: -9, armL: [128, 12], armR: [128, 12], eyes: 'wide', headTilt: -10}, antic: 2},
    {at: burst + 18, pose: {eyes: 'smile', headTilt: -6}, kind: 'pose'},
    {at: B.kidStep + 6, pose: {headTurn: -0.7, lookX: -1, armL: [40, 80], armR: [40, 80], lean: -3}, kind: 'pose'},
  ];
  return (
    <g transform={`translate(${shake} 0)`}>
      <Actor b={ANA} base={base} keys={keys} f={f} seed="ana-b6" x={x} y={y} s={1.12} zpx={zpx} rim={mix(C.amber, '#FFFFFF', 0.2)} rimDir={[-1, -0.7]} />
    </g>
  );
};

/** S6: Qonşu points at our kid's blue window and talks to her own kid, upside down on the sofa behind her. */
export const QonsuOnBalcony: React.FC<{f: number; B: Record<string, number>; zpx: number; x: number; y: number; shake?: number}> = ({f, B, zpx, x, y, shake = 0}) => {
  const base: Partial<Pose> = {facing: -1, armL: [40, -110], armR: [40, -110], headTurn: -0.3};
  const keys: Key[] = [
    {at: B.qqPoint - 2, pose: {armL: [102, -4], lean: -8, headTurn: -0.6, lookX: -1}, antic: 4},
    {at: B.qqPoint + 14, pose: {headTurn: 0.75, lookX: 1, lookY: 0.4, headTilt: 8}, kind: 'pose'},
  ];
  return (
    <g transform={`translate(${shake} 0)`}>
      <Actor b={QONSU} base={base} keys={keys} f={f} seed="qq" x={x} y={y} s={1.1} zpx={zpx} rim={mix(C.amber, '#FFFFFF', 0.2)} rimDir={[1, -0.7]} point="L" />
    </g>
  );
};

export const QonsuInside: React.FC<{f: number; zpx: number; r: {x: number; y: number; w: number; h: number}}> = ({f, zpx, r}) => {
  const sofaY = r.y + r.h * 0.56 - 4; // the seat sits just above the parapet so the upside-down kid reads
  const base: Partial<Pose> = {profile: 1, facing: -1, rot: 90, x: -52, y: 34.2, legL: [92, 0], legR: [86, -6], armL: [116, -22], armR: [110, -30], headTilt: 20, lookX: -0.6, lookY: 0.1};
  return (
    <g>
      <rect x={r.x + 6} y={sofaY - 24} width={70} height={30} rx={6} fill={C.shadow} />
      <rect x={r.x + 4} y={sofaY - 46} width={14} height={52} rx={5} fill={C.shadow} />
      <rect x={r.x + 3} y={sofaY - 60} width={6} height={66} fill={C.shadow} />
      <Actor b={Q_KID} base={base} keys={[]} f={f} seed="qkid" x={r.x + 40} y={sofaY} s={0.5} zpx={zpx} rim={C.phoneWhite} rimDir={[-1, -0.6]}
        holdR={<Phone screen={C.phoneWhite} angle={-90} glow={1} />} />
    </g>
  );
};

/** S6: our kid comes to his window with an armudu tea glass (from the door side), one hand on the sill; turns to camera;
 * smug squint; the halo fades in. He stands at the window, so the sill cuts him at the waist (stage units). */
const KidAtWindow: React.FC<{f: number; t: number; B: Record<string, number>; zpx: number}> = ({f, t, B, zpx}) => {
  const step = B.kidStep;
  const base: Partial<Pose> = {x: 41, lean: -8, facing: 1, armR: [19, -133], armL: [14, 10], headTurn: -0.5, lookX: -0.6, lookY: 0.1};
  const keys: Key[] = [
    {at: step - 2, pose: {x: 0, lean: 0}, antic: 3},
    {at: step + 2, pose: {armL: [42, -71]}, kind: 'settle'},
    {at: step + 16, pose: {headTurn: 0, lookX: 0, lookY: 0}, kind: 'pose'},
    {at: step + 26, pose: {eyes: 'smug', headTilt: 7, lean: -3}, kind: 'pose'},
    {at: B.kidRays + 4, pose: {armR: [80, 131]}, kind: 'settle'},
  ];
  const haloOn = clamp01((f - B.kidRays) / 12);
  return (
    <Actor b={KID_HAIR} base={base} keys={keys} f={f} seed="kid-win" x={430} y={1312} s={9} zpx={zpx} rim={VT_RIM} rimDir={[-1, -0.7]}
      holdR={<TeaGlass t={t} s={1} />}
      overlay={haloOn > 0 ? haloFor(KID_HAIR, base, keys, f, haloOn) : undefined} />
  );
};

export {KID_HOOD, KID_HAIR, S_ADULT, blueOn, ease, EASE, noise1D};
