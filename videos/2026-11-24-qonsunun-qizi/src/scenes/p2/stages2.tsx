// Part 2: what plays inside the daughter's windows (stage units 1000×871, floor at 830), the kid at his window, and the
// two mothers on their balconies (world units). VolunTrack-tagged: her blue rooms and the kid's blue room.
import React from 'react';
import {C} from '../../theme';
import {mix} from '../../color';
import {clamp01, lerp, springAt, noise1D} from '../../motion';
import {ANA, QONSU, CHILD, RUNNER, QIZ, SON, makeKid, BASE, Figure, joints, poseAt, secondary, withBlink, idle, type Key, type Pose, type Build} from '../../chars/rig';
import {TeaGlass, Phone} from '../../chars/props';
import {walkCycle} from '../../chars/gait';
import {BlueRoom, Halo, VT_RIM, VT_CORE} from '../../chars/vtbits';
import {Broom, BookBox, Book, Clipboard, Glove} from './props2';

export const FLOOR = 830;
export const KID_HAIR = makeKid(() => false, {id: 'kidHair'});

/** A posed figure (same as part 1's stage actor). */
export const Actor: React.FC<{
  b: Build; base: Partial<Pose>; keys: Key[]; f: number; seed: string; x: number; y?: number; s?: number; zpx: number;
  rim: string; rimDir?: [number, number]; holdL?: React.ReactNode; holdR?: React.ReactNode; overlay?: (p: Pose) => React.ReactNode;
  mod?: (p: Pose) => Pose; point?: 'L' | 'R'; idleAmt?: number;
}> = ({b, base, keys, f, seed, x, y = FLOOR, s = 6.2, zpx, rim, rimDir = [-1, -0.8], holdL, holdR, overlay, mod, point, idleAmt = 0.6}) => {
  const b0 = {...BASE, ...base};
  let p = poseAt(b0, keys, f);
  p = {...p, headTilt: p.headTilt + idle(seed, f, idleAmt)};
  p = withBlink(p, seed, f);
  if (mod) p = mod(p);
  const sec = secondary(b0, keys, f);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Figure b={b} p={p} rim={{color: rim, dx: rimDir[0], dy: rimDir[1]}} unitPx={zpx * s} sec={sec} holdL={holdL} holdR={holdR} overlay={overlay?.(p)} point={point} />
    </g>
  );
};

/** Voice beats: the speaking figure's head nods on every word start (≈2 frames ahead of the sound), so the delivery
 * reads in a style with no mouths. Returns a head-tilt offset in degrees. */
export const talk = (words: {start: number; end: number}[], f: number, amt = 5) => {
  let v = 0;
  for (const w of words) {
    const t = f - (w.start - 2);
    if (t >= 0 && t < 8) v = Math.max(v, Math.sin((t / 8) * Math.PI));
  }
  return v * amt;
};

const Shelf: React.FC<{x: number; y: number; w: number; n: number; seed: string}> = ({x, y, w, n, seed}) => {
  let cx = x + 8;
  return (
    <g fill={C.shadow}>
      <rect x={x} y={y} width={w} height={12} />
      {Array.from({length: n}, (_, i) => {
        const bw = 18 + ((i * 7 + seed.length) % 9);
        const bh = 46 + ((i * 13 + seed.length * 3) % 28);
        const el = <rect key={i} x={cx} y={y - bh} width={bw} height={bh} transform={i === n - 1 ? `rotate(12 ${cx} ${y})` : undefined} />;
        cx += bw + 5;
        return el;
      })}
    </g>
  );
};

// ───────────────────────────── Her room (floor 5): she is home, then her whole column lights up ─────────────────────────────
export const HerRoomStage: React.FC<{f: number; zpx: number; level: number; on: number}> = ({f, zpx, level, on}) => {
  const base: Partial<Pose> = {armL: [40, -112], armR: [40, -112], headTurn: -0.35, lookX: -0.6};
  const keys: Key[] = [
    {at: on + 3, pose: {headTurn: -0.7, lookX: -1, headTilt: 6}, kind: 'pose'},
    {at: on + 16, pose: {armR: [150, -20], headTilt: -4}, antic: 3},
    {at: on + 30, pose: {armR: [40, -112], headTilt: 0}, kind: 'settle'},
  ];
  return (
    <g>
      <BlueRoom id="rm-qz5" level={level} />
      <Shelf x={90} y={360} w={240} n={7} seed="qz5" />
      <rect x={760} y={640} width={150} height={190} fill={C.shadow} />
      <Actor b={QIZ} base={base} keys={keys} f={f} seed="qz-room" x={520} zpx={zpx} rim={VT_RIM} />
    </g>
  );
};

/** A blue room in her column with no story in it (neighbours' windows taking the light). */
export const ColumnStage: React.FC<{id: string; level: number; seed: number}> = ({id, level, seed}) => (
  <g>
    <BlueRoom id={id} level={level} />
    {seed % 3 === 0 && <Shelf x={120} y={420} w={220} n={6} seed={id} />}
    {seed % 3 === 1 && (
      <g fill={C.shadow}>
        <rect x={700} y={690} width={70} height={140} />
        <ellipse cx={735} cy={640} rx={70} ry={60} />
      </g>
    )}
    {seed % 3 === 2 && <rect x={140} y={560} width={260} height={270} fill={C.shadow} />}
  </g>
);

// ───────────────────────────── Deed 1: she sweeps the courtyard (a broom, leaves gathering into a heap) ─────────────────────────────
export const SweepStage: React.FC<{f: number; zpx: number; level: number; start: number}> = ({f, zpx, level, start}) => {
  const t = f - start;
  const swing = Math.sin(Math.max(0, t) * 0.42) * 16;
  const base: Partial<Pose> = {profile: 1, facing: 1, lean: 14, armR: [42, -40], armL: [30, -20], legL: [-8, 6], legR: [12, -6], headTilt: 8, lookY: 0.5, headTurn: 0.6};
  const keys: Key[] = [{at: start + 18, pose: {headTurn: 0, lookX: 0, lookY: 0, eyes: 'smile', lean: 6}, kind: 'pose'}];
  const heap = clamp01(t / 30);
  return (
    <g>
      <BlueRoom id="rm-sweep" level={level} floorY={790} />
      {/* leaves: scattered on the floor, swept toward the heap on the right */}
      {Array.from({length: 11}, (_, i) => {
        const x0 = 150 + i * 46;
        const u = clamp01((t - i * 1.6) / 16);
        const x = lerp(x0, 760 + (i % 4) * 18, u);
        const y = FLOOR - 8 - (u > 0 && u < 1 ? Math.sin(u * Math.PI) * 26 : 0) - (u >= 1 ? (i % 3) * 9 : 0);
        return <ellipse key={i} cx={x} cy={y} rx={13} ry={6} fill={mix('#3A2A18', C.shadow, 0.4)} transform={`rotate(${(i * 37) % 60 - 30} ${x} ${y})`} />;
      })}
      <path d={`M700 ${FLOOR} q70 ${-40 * heap} 140 0 z`} fill={C.shadow} />
      {/* dust puff on each stroke */}
      {t > 0 && <circle cx={560 + swing * 6} cy={FLOOR - 20} r={18 + 10 * Math.abs(Math.sin(t * 0.42))} fill="#FFFFFF" opacity={0.08} />}
      <Actor b={QIZ} base={base} keys={keys} f={f} seed="qz-sweep" x={360} zpx={zpx} rim={VT_RIM} rimDir={[1, -0.8]}
        holdR={<Broom angle={-24 + swing} len={64} />} holdL={<Glove />} />
    </g>
  );
};

// ───────────────────────────── Deed 2: she shelves books for the kids ─────────────────────────────
export const BooksStage: React.FC<{f: number; zpx: number; level: number; start: number}> = ({f, zpx, level, start}) => {
  const t = f - start;
  const base: Partial<Pose> = {facing: -1, profile: 0.6, armL: [150, -30], armR: [30, 30], headTurn: -0.5, lookX: -0.4, lookY: -0.6, lean: -4};
  const keys: Key[] = [
    {at: start + 6, pose: {armL: [120, -10]}, kind: 'settle'},
    {at: start + 14, pose: {headTurn: 0.5, lookX: 0.8, lookY: 0.4, eyes: 'smile', armL: [40, 20], lean: 2}, kind: 'pose'},
  ];
  const shelved = clamp01(t / 18);
  return (
    <g>
      <BlueRoom id="rm-books" level={level} />
      {/* the shelf on the left wall fills up */}
      <g fill={C.shadow}>
        <rect x={110} y={250} width={250} height={12} />
        <rect x={110} y={430} width={250} height={12} />
        <rect x={100} y={230} width={12} height={600} />
        <rect x={358} y={230} width={12} height={600} />
        {Array.from({length: 14}, (_, i) => {
          if (i / 14 > shelved + 0.4) return null;
          const row = i < 7 ? 0 : 1;
          const x = 122 + (i % 7) * 33;
          const h = 52 + ((i * 11) % 22);
          return <rect key={i} x={x} y={(row ? 430 : 250) - h} width={26} height={h} />;
        })}
      </g>
      <g transform={`translate(440 ${FLOOR}) scale(5)`}>
        <BookBox />
      </g>
      <Actor b={QIZ} base={base} keys={keys} f={f} seed="qz-books" x={520} zpx={zpx} rim={VT_RIM} holdL={<Book color="#B88A3A" angle={-20} />} />
      {[0, 1].map((i) => {
        const at = start + 8 + i * 7;
        const kb: Partial<Pose> = {facing: -1, profile: 0.5, armR: [20, 30], armL: [16, 30], headTurn: -0.6, lookX: -0.8, lookY: -0.6};
        const kk: Key[] = [{at, pose: {armR: [150, 0], armL: [130, 10], eyes: 'wide', headTilt: -8}}, {at: at + 14, pose: {eyes: 'smile'}, kind: 'pose'}];
        return (
          <Actor key={i} b={CHILD} base={kb} keys={kk} f={f} seed={`bk-${i}`} x={700 + i * 120} s={5} zpx={zpx} rim={VT_RIM}
            holdR={i === 0 && t > 20 ? <Book color="#2E5C4A" angle={10} /> : undefined} />
        );
      })}
    </g>
  );
};

// ───────────────────────────── Deed 3: the whole building follows her down the stairs ─────────────────────────────
const STEP3 = {w: 60, h: 44};
export const FollowersStage: React.FC<{f: number; zpx: number; level: number; start: number}> = ({f, zpx, level, start}) => {
  const t = Math.max(0, f - start);
  // a flight down from upper left to lower right
  const steps = 9;
  const x0 = 60;
  const y0 = 430;
  const stairY = (x: number) => y0 + Math.floor(Math.max(0, x - x0) / STEP3.w) * STEP3.h;
  const people: {b: Build; delay: number; s: number; rim: string; hold?: 'clip' | 'bag'}[] = [
    {b: QIZ, delay: 0, s: 4.1, rim: VT_RIM, hold: 'clip'},
    {b: ANA, delay: 0, s: 3.9, rim: VT_RIM},
    {b: RUNNER, delay: 0, s: 4.0, rim: VT_RIM},
    {b: CHILD, delay: 0, s: 3.6, rim: VT_RIM},
    {b: QONSU, delay: 0, s: 3.9, rim: VT_RIM},
  ];
  return (
    <g>
      <BlueRoom id="rm-follow" level={level} />
      <path
        d={`M0 ${y0} ${Array.from({length: steps}, (_, i) => `L${x0 + i * STEP3.w} ${y0 + i * STEP3.h} L${x0 + i * STEP3.w} ${y0 + (i + 1) * STEP3.h}`).join(' ')} L1000 ${y0 + steps * STEP3.h} L1000 871 L0 871 Z`}
        fill={C.shadow}
      />
      <path d={`M20 ${y0 - 120} L${x0 + steps * STEP3.w} ${y0 + steps * STEP3.h - 120}`} stroke={C.shadow} strokeWidth={10} />
      {people.map((pp, i) => {
        const u = t - pp.delay;
        const x = 330 - i * 150 + u * 6.2;
        if (x > 1060 || x < -60) return null;
        const phi = u * 0.42;
        const walk = walkCycle(pp.b, phi, 1);
        const base: Partial<Pose> = {...walk, profile: 1, facing: 1, headTurn: 0.4, lookY: 0.4, ...(pp.b === QIZ ? {armL: [70, -60] as [number, number]} : {})};
        const yy = stairY(x) + (walk.y ?? 0) * pp.s;
        return (
          <Actor key={i} b={pp.b} base={base} keys={[]} f={f} seed={`fol-${i}`} x={x} y={yy} s={pp.s} zpx={zpx} rim={pp.rim} rimDir={[1, -0.8]} idleAmt={0}
            holdL={pp.hold === 'clip' ? <Clipboard angle={-30} /> : undefined} />
        );
      })}
    </g>
  );
};

// ───────────────────────────── The kid at his blue window (part 1's ending pose, then the drop) ─────────────────────────────
export type KidMode = 'proud' | 'drop' | 'whine' | 'glow';
export const KidWindowStage: React.FC<{f: number; t: number; zpx: number; level: number; B: Record<string, number>; words: (id: string) => {start: number; end: number}[]}> = ({f, t, zpx, level, B, words}) => {
  // proud and leaning out (callback to part 1's last shot), tea in hand, halo on
  const base: Partial<Pose> = {x: 0, lean: -3, facing: 1, armR: [80, 131], armL: [42, -71], headTurn: 0, lookX: 0, lookY: 0, eyes: 'smug', headTilt: 7};
  const keys: Key[] = [
    // "Qonşunun qızına bax!": he looks across the yard
    {at: B.herWin - 10, pose: {headTurn: 0.75, lookX: 1, lookY: -0.2, eyes: 'open', headTilt: 0}, kind: 'pose'},
    // "Yenə?!": the face drops (eyes wide, head sinks, shoulders slump, the tea glass sags)
    {at: B.faceDrop, pose: {headTurn: 0, lookX: 0, lookY: 0.2, eyes: 'wide', headTilt: -10, lean: 4, armR: [40, 120]}, antic: 2},
    {at: B.faceDrop + 14, pose: {eyes: 'open', eyeOpen: 0.55, lookY: 0.6, headTilt: 12, lean: 8}, kind: 'slow', dur: 10},
    // "Ana, axı mən də qonşunun oğluyam!": arms up in protest
    {at: B.whine, pose: {armL: [150, -10], armR: [140, 40], eyes: 'wide', eyeOpen: 1, headTilt: -14, lean: -4, lookY: -0.4, headTurn: -0.4, lookX: -0.8}, antic: 3},
    {at: B.level, pose: {armL: [30, 10], armR: [40, 120], eyes: 'squint', headTilt: 6, lean: 6}, kind: 'pose'},
  ];
  const nod = talk(words('P02'), f, 4) + talk(words('P04'), f, 6) + talk(words('P09'), f, 5);
  const haloOn = clamp01(1 - (f - B.faceDrop) / 6);
  return (
    <g>
      <BlueRoom id="rm-kid2" level={level} />
      <rect x={0} y={FLOOR} width={1000} height={41} fill="#07080F" opacity={0.6} />
      <rect x={745} y={190} width={180} height={FLOOR - 190} fill="#06070C" />
      <rect x={40} y={560} width={110} height={270} fill={C.shadow} />
      <Actor b={KID_HAIR} base={base} keys={keys} f={f} seed="kid-win2" x={430} y={1312} s={9} zpx={zpx} rim={VT_RIM} rimDir={[-1, -0.7]}
        mod={(p) => ({...p, headTilt: p.headTilt + nod})}
        holdR={<TeaGlass t={t} s={1} steam={f < B.faceDrop ? 1 : 0.3} />}
        overlay={haloOn > 0 ? (p: Pose) => {
          const j = joints(KID_HAIR, p);
          const a = (j.headAng * Math.PI) / 180;
          const d = KID_HAIR.headR + 7.5;
          return (
            <g transform={`translate(${j.head.x + Math.sin(a) * d} ${j.head.y - Math.cos(a) * d})`}>
              <Halo tilt={p.headTilt * 1.4} opacity={haloOn} />
            </g>
          );
        } : undefined} />
    </g>
  );
};

// ───────────────────────────── Ana on her balcony (world units) ─────────────────────────────
export type AnaMode = 'burst' | 'point' | 'count' | 'dry' | 'morning';
export const AnaBalcony2: React.FC<{f: number; B: Record<string, number>; zpx: number; x: number; y: number; shake?: number; nod?: number; rim?: string}> = ({f, B, zpx, x, y, shake = 0, nod = 0, rim}) => {
  // the door bangs open and she bursts out, pointing up at the comment ("Necə yəni olmur?!")
  const base: Partial<Pose> = {x: -46, facing: 1, armL: [20, 30], armR: [20, 30], lean: 8, headTurn: 0.3};
  const keys: Key[] = [
    {at: B.doorBang + 2, pose: {x: 0, lean: -6, armR: [150, -20], armL: [40, -100], eyes: 'wide', headTilt: -16, headTurn: 0, lookY: -1}, antic: 2},
    {at: B.title + 2, pose: {headTilt: -10, eyes: 'squint'}, kind: 'settle'},
    // "Qonşunun qızına bax!": she swings round and points across the yard
    {at: B.herWin - 26, pose: {armR: [104, -6], armL: [36, -100], lean: 9, headTurn: 0.55, lookX: 1, headTilt: -4, eyes: 'open', lookY: 0}, antic: 3},
    // counting on her fingers: one hand up, the other taps it, deed by deed
    {at: B.deed1, pose: {armL: [118, -70], armR: [80, -90], headTurn: 0.2, lookX: 0.3, eyes: 'smile', lean: 2}, kind: 'pose'},
    {at: B.count, pose: {armL: [150, 0], armR: [150, 0], eyes: 'wide', headTilt: -12, lean: -6}, antic: 3},
    // "başqa səviyyədir": arms folded, chin up, squint
    {at: B.level, pose: {armL: [62, -120], armR: [62, -120], eyes: 'squint', headTilt: -8, lean: -3, headTurn: 0.35, lookX: 0.6}, kind: 'pose'},
  ];
  // the counting taps (3 deeds)
  const tap = (at: number) => (f >= at && f < at + 6 ? Math.sin(((f - at) / 6) * Math.PI) : 0);
  const taps = tap(B.deed1 + 2) + tap(B.deed2) + tap(B.deed3);
  return (
    <g transform={`translate(${shake} 0)`}>
      <Actor b={ANA} base={base} keys={keys} f={f} seed="ana2" x={x} y={y} s={1.12} zpx={zpx} rim={rim ?? mix(C.amber, '#FFFFFF', 0.2)} rimDir={[-1, -0.7]}
        mod={(p) => ({...p, armR: [p.armR[0] - taps * 14, p.armR[1]] as [number, number], headTilt: p.headTilt + nod})} />
    </g>
  );
};

/** Morning: the two mothers. Qonşu points down at her daughter, Ana at her son; then both soften. */
export const MomMorning: React.FC<{who: 'ana' | 'qq'; f: number; B: Record<string, number>; zpx: number; x: number; y: number; nod: number; shake?: number}> = ({who, f, B, zpx, x, y, nod, shake = 0}) => {
  const point = who === 'qq' ? B.qqPoint : B.anaPoint;
  const facing: 1 | -1 = who === 'qq' ? -1 : 1;
  const base: Partial<Pose> = {facing, armL: [40, -110], armR: [40, -110], headTurn: 0.4 * facing, lookX: 0.6 * facing, lookY: 0.5};
  const keys: Key[] = [
    {at: point, pose: {armL: [104, 20], lean: -6 * facing, headTurn: 0.6 * facing, lookX: facing, lookY: 0.8, eyes: 'wide', headTilt: -6 * facing}, antic: 3},
    {at: point + 16, pose: {eyes: 'open'}, kind: 'settle'},
    // "…Həyətimizə bax.": both lower their arms, heads tilt, the eyes smile
    {at: B.soften, pose: {armL: [24, 20], armR: [24, 20], lean: 0, eyes: 'smile', headTilt: 10 * facing, lookY: 0.9, headTurn: 0.2 * facing}, kind: 'slow', dur: 18},
  ];
  return (
    <g transform={`translate(${shake} 0)`}>
      <Actor b={who === 'qq' ? QONSU : ANA} base={base} keys={keys} f={f} seed={`mm-${who}`} x={x} y={y} s={1.12} zpx={zpx}
        rim={mix('#FFE2B0', '#FFFFFF', 0.4)} rimDir={[1, -0.8]} point="L" mod={(p) => ({...p, headTilt: p.headTilt + nod})} />
    </g>
  );
};

export {SON, QIZ, Phone, VT_CORE, noise1D, springAt};
