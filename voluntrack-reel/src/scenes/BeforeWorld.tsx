// S1 · Hook and S2 · The noise (section 6). Paper chaos: cards pile up and never leave.
import React from 'react';
import {AbsoluteFill, Freeze, interpolate, useCurrentFrame} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {B, TL} from '../data';
import {BARRAGE, FPS, POSTS, STAMPS, type PostDef} from '../config';
import {BEFORE_CARDS, DM_CARD, POST_CARD} from '../layout';
import {C} from '../theme';
import {PaperBackground, Grain} from '../components/Paper';
import {PostCard} from '../components/PostCard';
import {DMCard} from '../components/DMCard';
import {Stamp, stampRotation} from '../components/Stamp';
import {PERF} from '../perf';
import {EASE, SPRING, clamp01, dampedSpring, handheld, rand, springAt} from '../motion';

type Pose = {x: number; y: number; r: number; s: number};
type StampSpec = {text: string; hit: number; x: number; y: number; rot: number; fontSize?: number};
type CardSpec = {
  key: string;
  kind: 'post' | 'dm' | 'hook';
  def?: PostDef;
  start: number;
  from: Pose;
  to: Pose;
  stamp?: StampSpec;
  pre?: Omit<StampSpec, 'hit'>;
};

const P = (x: number, y: number, r: number, s = 1): Pose => ({x, y, r, s});

// ── the hook card: rises from the bottom edge across the loop seam and lands at −3° by f12 ──
const HOOK_TO = P(BEFORE_CARDS.hook.to[0], BEFORE_CARDS.hook.to[1], BEFORE_CARDS.hook.to[2]);
const RISE_A = 1740; // card top at the bottom edge
const RISE_0 = 1090; // offset at f0
const V0 = (-2 * (RISE_A - RISE_0)) / 14; // px/frame at f0
/** u: frames relative to f0 (negative = the loop tail, f2026–2039). */
export const hookPose = (u: number): Pose => {
  let dy: number;
  if (u < 0) {
    const k = clamp01((u + 14) / 14);
    dy = RISE_A - (RISE_A - RISE_0) * k * k;
  } else {
    dy = dampedSpring(u, RISE_0, V0, SPRING.snap);
  }
  return {x: HOOK_TO.x + dy * 0.035, y: HOOK_TO.y + dy, r: HOOK_TO.r - 5 * (dy / RISE_0), s: 1};
};

const deadlineHit = B.stampDeadline;
const barrage = TL.barrage;

const P3 = (p: [number, number, number]) => P(p[0], p[1], p[2]);
const BARRAGE_POSES: [Pose, Pose][] = BEFORE_CARDS.barrage.map(([a, b]) => [P3(a), P3(b)]);
const BARRAGE_DEFS = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'];

const WALL_TO: Pose[] = BEFORE_CARDS.wall.map(P3);
const WALL_STAMPS = ['CLOSED', 'FULL', STAMPS.deadline, STAMPS.adultsOnly, STAMPS.linkExpired, 'CLOSED', 'FULL', 'CLOSED', STAMPS.deadline, 'CLOSED', STAMPS.adultsOnly, 'CLOSED'];
const WALL_DEFS = ['w3', 'w6', 'w1', 'w5', 'w2', 'w4', 'w7', 'w1', 'w6', 'w3', 'w5', 'w2'];
const edgeFrom = (i: number, to: Pose): Pose => {
  const a = rand(`wall-edge-${i}`) * Math.PI * 2;
  return P(540 + Math.cos(a) * 1500, 960 + Math.sin(a) * 1900, to.r + (rand(`wall-r-${i}`) * 2 - 1) * 28);
};
const fontFor = (t: string) => (t === STAMPS.deadline || t === STAMPS.linkExpired ? 100 : t.length <= 4 ? 160 : t === STAMPS.adultsOnly ? 124 : 140);

export const CARDS: CardSpec[] = [
  {key: 'hook', kind: 'hook', def: POSTS.hook, start: -14, from: HOOK_TO, to: HOOK_TO, stamp: {text: STAMPS.deadline, hit: deadlineHit, x: 390, y: 590, rot: -8, fontSize: 100}},
  {key: 'youth', kind: 'post', def: POSTS.youth, start: B.youthStart, from: P3(BEFORE_CARDS.youth.from), to: P3(BEFORE_CARDS.youth.to), stamp: {text: STAMPS.adultsOnly, hit: B.stamp18, x: 390, y: 610, rot: stampRotation('18'), fontSize: 132}},
  {key: 'apply', kind: 'post', def: POSTS.applyHere, start: B.applyCardStart, from: P3(BEFORE_CARDS.apply.from), to: P3(BEFORE_CARDS.apply.to), stamp: {text: STAMPS.linkExpired, hit: B.stampLink, x: 300, y: 470, rot: -6, fontSize: 96}},
  {key: 'dm', kind: 'dm', start: B.dmStart, from: P3(BEFORE_CARDS.dm.from), to: P3(BEFORE_CARDS.dm.to)},
  ...BARRAGE.map((text, i): CardSpec => ({
    key: `b${i}`,
    kind: 'post',
    def: POSTS[BARRAGE_DEFS[i]],
    start: barrage[i] - 9,
    from: BARRAGE_POSES[i][0],
    to: BARRAGE_POSES[i][1],
    stamp: {text, hit: barrage[i], x: 380, y: 560, rot: stampRotation(`b${i}`), fontSize: fontFor(text)},
  })),
  ...TL.wall.map((f, i): CardSpec => {
    const to = WALL_TO[i % WALL_TO.length];
    return {key: `w${i}`, kind: 'post', def: POSTS[WALL_DEFS[i % WALL_DEFS.length]], start: f - 8, from: edgeFrom(i, to), to, pre: {text: WALL_STAMPS[i % WALL_STAMPS.length], x: 380, y: 570, rot: stampRotation(`w${i}`), fontSize: fontFor(WALL_STAMPS[i % WALL_STAMPS.length])}};
  }),
];

export const STAMP_HITS = [deadlineHit, B.stamp18, B.stampLink, B.seenStamp, ...barrage];

const poseAt = (spec: CardSpec, frame: number): Pose => {
  if (spec.kind === 'hook') return hookPose(frame);
  const p = springAt(frame, spec.start, 'snap');
  return {
    x: spec.from.x + (spec.to.x - spec.from.x) * p,
    y: spec.from.y + (spec.to.y - spec.from.y) * p,
    r: spec.from.r + (spec.to.r - spec.from.r) * p,
    s: spec.from.s + (spec.to.s - spec.from.s) * p,
  };
};

/** Moves faster than ~1,500 px/s get motion blur. */
const isFast = (spec: CardSpec, frame: number) => {
  const a = poseAt(spec, frame);
  const b = poseAt(spec, frame + 1);
  return Math.hypot(b.x - a.x, b.y - a.y) * FPS > 1500;
};

/** The card under a stamp dips 6 px and recovers (snap). */
const dip = (spec: CardSpec, frame: number) => {
  if (!spec.stamp || frame < spec.stamp.hit) return 0;
  return 6 * (1 - springAt(frame, spec.stamp.hit, 'snap'));
};

const TapRing: React.FC<{frame: number; at: number; x: number; y: number}> = ({frame, at, x, y}) => {
  const t = (frame - at) / 16;
  if (t < 0 || t > 1) return null;
  const s = 0.3 + 1.2 * EASE.vtOut(t);
  return (
    <>
      <div style={{position: 'absolute', left: x - 60, top: y - 60, width: 120, height: 120, borderRadius: '50%', border: `5px solid ${C.ink}`, opacity: 0.6 * (1 - t), transform: `scale(${s})`}} />
      <div style={{position: 'absolute', left: x - 26, top: y - 26, width: 52, height: 52, borderRadius: '50%', background: 'rgba(18,18,18,0.35)', opacity: 1 - t, transform: `scale(${1 - 0.5 * t})`}} />
    </>
  );
};

const CardInner: React.FC<{spec: CardSpec; freeze: number}> = ({spec, freeze}) => {
  const frame = Math.min(useCurrentFrame(), freeze);
  const pose = poseAt(spec, frame);
  const w = spec.kind === 'dm' ? DM_CARD.w : POST_CARD.w;
  const h = spec.kind === 'dm' ? DM_CARD.h : POST_CARD.h;
  const dy = dip(spec, frame);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: w,
        height: h,
        transform: `translate(${pose.x - w / 2}px, ${pose.y - h / 2 + dy}px) rotate(${pose.r}deg) scale(${pose.s})`,
        willChange: 'transform',
      }}
    >
      {spec.kind === 'dm' ? (
        <DMCard frame={frame} send={B.bubbleSend} seen={B.seenLabel} seenStamp={B.seenStamp} />
      ) : (
        <PostCard def={spec.def!}>
          {spec.key === 'apply' && <TapRing frame={frame} at={B.tapRing} x={276} y={452} />}
          {spec.stamp && <Stamp {...spec.stamp} frame={frame} seed={spec.key} />}
          {spec.pre && <Stamp {...spec.pre} hit={0} frame={frame} seed={spec.key} pre />}
        </PostCard>
      )}
    </div>
  );
};

const CardLayer: React.FC<{spec: CardSpec; freeze: number}> = ({spec, freeze}) => {
  const frame = Math.min(useCurrentFrame(), freeze);
  if (frame < spec.start) return null;
  if (frame < freeze && !PERF.noBlur && isFast(spec, frame)) {
    return (
      <CameraMotionBlur shutterAngle={180} samples={8}>
        <CardInner spec={spec} freeze={freeze} />
      </CameraMotionBlur>
    );
  }
  return <CardInner spec={spec} freeze={freeze} />;
};

/** Camera: handheld noise (3 px at 0.8 Hz → 12 px in the barrage) + a punch on every stamp hit. */
export const cameraAt = (frame: number) => {
  const amp = interpolate(frame, [B.barrageStart, B.barrageStart + 30], [3, 12], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t = frame / FPS;
  const x = handheld('cam-x', t, 0.8) * amp;
  const y = handheld('cam-y', t, 0.8) * amp;
  let punch = 0;
  for (const h of STAMP_HITS) {
    const d = frame - h;
    if (d < 0 || d > 17) continue;
    punch += d < 3 ? 0.045 * ((d + 1) / 3) : 0.045 * (1 - EASE.vtOut((d - 2) / 15));
  }
  return {x, y, s: 1 + Math.min(punch, 0.08)};
};

const World: React.FC<{freeze: number; cards: CardSpec[]}> = ({freeze, cards}) => {
  const frame = Math.min(useCurrentFrame(), freeze);
  const cam = cameraAt(frame);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <PaperBackground dx={cam.x * 0.3} dy={cam.y * 0.3} />
      <AbsoluteFill style={{transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`, transformOrigin: '540px 960px', willChange: 'transform'}}>
        {cards.map((c) => (
          <CardLayer key={c.key} spec={c} freeze={freeze} />
        ))}
      </AbsoluteFill>
      {!PERF.noGrain && <Grain frame={frame} />}
    </AbsoluteFill>
  );
};

/** The whole before world; frozen hard at the end of "open" (f514 in the shot list). */
export const BeforeWorld: React.FC<{cards?: CardSpec[]}> = ({cards = CARDS}) => {
  const frame = useCurrentFrame();
  if (frame >= B.freeze) {
    return (
      <Freeze frame={B.freeze}>
        <World freeze={B.freeze} cards={cards} />
      </Freeze>
    );
  }
  return <World freeze={B.freeze} cards={cards} />;
};

/** The hook card alone, for the loop tail (f2026–2039): rises from the bottom edge, stays below y 1300. */
export const LoopCard: React.FC = () => {
  const frame = useCurrentFrame();
  const u = frame - TL.duration; // −14..−1
  const pose = hookPose(u);
  return (
    <CameraMotionBlur shutterAngle={180} samples={8}>
      <LoopCardInner />
    </CameraMotionBlur>
  );
};

const LoopCardInner: React.FC = () => {
  const frame = useCurrentFrame();
  const pose = hookPose(frame - TL.duration);
  return (
    <div style={{position: 'absolute', left: pose.x - POST_CARD.w / 2, top: pose.y - POST_CARD.h / 2, width: POST_CARD.w, height: POST_CARD.h, transform: `rotate(${pose.r}deg)`}}>
      <PostCard def={POSTS.hook} />
    </div>
  );
};
