// 6 · Morning, the same courtyard by day: she leads the clean-up (clipboard, gloves), both boys carry bags, the small
// kids carry books to a little shelf; the two mothers on their balconies. 7 · She looks into the camera.
// The yard-level shots render the set flat (no parallax) so the facades stand on the yard ground.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FPS, type Lang} from '../../config';
import {clamp01, lerp} from '../../motion';
import {balconyRect, block, CAM_REF} from '../../layout';
import {camAt, camTransform, setFlat, type Cam, type WorldShot} from '../../camera';
import {World, type Slots} from '../../world/World';
import {setDay} from '../../world/tod';
import {timelineFor} from '../../data';
import {QIZ, SON, CHILD, makeKid, BASE, Figure, poseAt, secondary, withBlink, idle, type Key, type Pose, type Build} from '../../chars/rig';
import {walkCycle} from '../../chars/gait';
import {Bag, Book, Clipboard, Glove, YardShelf} from './props2';
import {MomMorning, talk} from './stages2';

const KID = makeKid(() => false, {id: 'kidHair'});
const G = 2000; // the yard ground (world units)
const RIM = '#FFF1D8';
export const QIZ_X = 1420;

export const morningShots = (B: Record<string, number>): WorldShot[] => {
  const qb = balconyRect(block('R'), 0, 5);
  const ab = balconyRect(block('L'), 6, 4);
  const qq = {x: qb.x + 108, y: qb.y + qb.h - 30};
  const ana = {x: ab.x + 58, y: ab.y + ab.h - 30};
  return [
    {id: 'm1', from: B.morning, to: B.qqPoint - 3, drift: [6, 0], keys: [{f: B.morning, x: 1455, y: 1906, z: 2.2}, {f: B.qqPoint - 3, x: 1450, y: 1904, z: 2.28, ease: 'settle'}]},
    {id: 'm2', from: B.qqPoint - 3, to: B.anaPoint - 3, drift: [-4, 0], keys: [{f: B.qqPoint - 3, x: qq.x - 10, y: qq.y - 40, z: 3.0}]},
    {id: 'm3', from: B.anaPoint - 3, to: B.soften - 4, drift: [4, 0], keys: [{f: B.anaPoint - 3, x: ana.x + 10, y: ana.y - 40, z: 3.0}]},
    {id: 'm4', from: B.soften - 4, to: B.bubble2 - 2, drift: [0, 4], keys: [{f: B.soften - 4, x: (qq.x + ana.x) / 2, y: (qq.y + ana.y) / 2 - 30, z: 1.12}, {f: B.bubble2 - 2, x: (qq.x + ana.x) / 2, y: (qq.y + ana.y) / 2 - 10, z: 1.18, ease: 'inOut'}]},
    {id: 'm5', from: B.bubble2 - 2, to: B.dusk, drift: [0, 0], keys: [{f: B.bubble2 - 2, x: QIZ_X + 8, y: 1924, z: 5.2}, {f: B.dusk, x: QIZ_X + 6, y: 1921, z: 5.5, ease: 'inOut'}]},
  ] as WorldShot[];
};

export const morningCam = (lang: Lang, f: number): Cam => {
  const B = timelineFor(lang).beats;
  const shots = morningShots(B);
  const shot = shots.find((s) => f >= s.from && f < s.to) ?? shots[shots.length - 1];
  return camAt(shot, f);
};

/** A figure in the yard (world units, feet on the ground). */
const YardActor: React.FC<{b: Build; base: Partial<Pose>; keys: Key[]; f: number; seed: string; x: number; y?: number; s?: number; zpx: number; holdL?: React.ReactNode; holdR?: React.ReactNode; mod?: (p: Pose) => Pose}> = ({b, base, keys, f, seed, x, y = G, s = 1.12, zpx, holdL, holdR, mod}) => {
  const b0 = {...BASE, ...base} as Pose;
  let p = poseAt(b0, keys, f);
  p = withBlink({...p, headTilt: p.headTilt + idle(seed, f, 0.5)}, seed, f);
  if (mod) p = mod(p);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Figure b={b} p={p} rim={{color: RIM, dx: 1, dy: -0.8}} unitPx={zpx * s} sec={secondary(b0, keys, f)} holdL={holdL} holdR={holdR} />
    </g>
  );
};

export const Morning2: React.FC<{lang: Lang}> = ({lang}) => {
  const f = useCurrentFrame();
  const TL = timelineFor(lang);
  const B = TL.beats;
  const t = f / FPS;
  setDay(1);
  setFlat(true);
  const cam = morningCam(lang, f);
  const words = (id: string) => TL.wordFrames(id);
  const ab = balconyRect(block('L'), 6, 4);
  const qb = balconyRect(block('R'), 0, 5);
  const slots: Slots = {
    anaBalcony: {level: 0.2, actor: <MomMorning who="ana" f={f} B={B} zpx={cam.z} x={ab.x + 58} y={ab.y + ab.h - 30} nod={talk(words('P18'), f, 4) + talk(words('P19'), f, 3)} />},
    qonsuBalcony: {level: 0.2, actor: <MomMorning who="qq" f={f} B={B} zpx={cam.z} x={qb.x + 108} y={qb.y + qb.h - 30} nod={talk(words('P17'), f, 4) + talk(words('P19b'), f, 3)} />},
  };
  const m = f - B.morning;
  // the boys cross the yard with bags (left → right), the kids carry books to the shelf
  const kidX = 1490 + m * 2.0;
  const sonX = 1452 + m * 1.6;
  const walkK = walkCycle(KID as Build, m * 0.34, 1);
  const walkS = walkCycle(SON, m * 0.3 + 1.2, 1);
  const shelfFill = clamp01(0.35 + m / 220);
  // the daughter: directs with the clipboard, nods; in 7 she turns to the camera
  const qBase: Partial<Pose> = {facing: -1, profile: 0.35, armL: [64, -78], armR: [24, 16], headTurn: -0.45, lookX: -0.7, lookY: 0.2};
  const qKeys: Key[] = [
    {at: B.morning + 8, pose: {armR: [120, -10], headTurn: -0.6, lookX: -1}, antic: 3},
    {at: B.morning + 26, pose: {armR: [30, 20], headTurn: -0.2, lookX: -0.4}, kind: 'settle'},
    // 7: to the camera, for the first time
    {at: B.toCam, pose: {facing: 1, profile: 0, headTurn: 0, lookX: 0, lookY: 0, headTilt: 3, armL: [40, -96], armR: [16, 14]}, antic: 4},
    {at: B.toCam + 40, pose: {eyes: 'smile', headTilt: 8}, kind: 'pose'},
  ];
  const yardTr = camTransform(cam);
  const showYard = f < B.qqPoint - 3 || f >= B.bubble2 - 2;
  const close = f >= B.bubble2 - 2;
  return (
    <>
      <World cam={cam} t={t} frame={f} slots={slots} />
      {showYard && (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g transform={yardTr}>
            <g transform={`translate(1292 ${G})`}>
              <YardShelf fill={shelfFill} />
            </g>
            {!close && (
              <>
                {[0, 1].map((i) => {
                  const ph = ((m + i * 40) % 80) / 80;
                  const toShelf = ph < 0.5;
                  const u = toShelf ? ph * 2 : (1 - ph) * 2;
                  const x = lerp(1212, 1262, u) - i * 22;
                  const w = walkCycle(CHILD, m * 0.5 + i, toShelf ? 1 : -1);
                  return (
                    <YardActor key={i} b={CHILD} base={{...w, headTurn: toShelf ? 0.5 : -0.5}} keys={[]} f={f} seed={`yk-${i}`} x={x} s={0.95} zpx={cam.z}
                      holdR={toShelf ? <Book color={i ? '#2E5C4A' : '#B88A3A'} angle={-10} /> : undefined} />
                  );
                })}
                <YardActor b={SON} base={{...walkS, headTurn: 0.4}} keys={[]} f={f} seed="y-son" x={sonX} zpx={cam.z} holdL={<Bag swing={Math.sin(m * 0.3) * 6} />} holdR={<Bag swing={-Math.sin(m * 0.3) * 6} />} />
                <YardActor b={KID as Build} base={{...walkK, headTurn: 0.3, eyes: 'squint'}} keys={[]} f={f} seed="y-kid" x={kidX} zpx={cam.z} holdR={<Bag swing={Math.sin(m * 0.34) * 8} />} />
              </>
            )}
            <YardActor b={QIZ} base={qBase} keys={qKeys} f={f} seed="y-qiz" x={QIZ_X} zpx={cam.z}
              mod={(p) => ({...p, headTilt: p.headTilt + talk(words('P20'), f, 4)})}
              holdL={<g><Glove /><g transform="translate(0 -2)"><Clipboard angle={-14} /></g></g>} holdR={<Glove />} />
          </g>
        </svg>
      )}
    </>
  );
};

export {CAM_REF};
