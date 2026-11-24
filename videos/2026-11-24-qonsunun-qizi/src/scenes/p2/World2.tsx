// Part 2 courtyard shots: the hook (1), the column (2), the deeds (3), the kid's window glowing after he applies
// (end of 5) and the night wide the film loops back to. Camera keys follow part 1's grammar: cut-and-settle between
// windows, whips across the yard, a slow push on held shots.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from '../../theme';
import {FPS, type Lang} from '../../config';
import {clamp01, blueOn, lerp} from '../../motion';
import {balconyRect, block, placeCenter, placeRect, colCenter, CAM_REF, type PlaceId} from '../../layout';
import {camAt, type Cam, type WorldShot} from '../../camera';
import {World, type Slots} from '../../world/World';
import {setDay} from '../../world/tod';
import {setFlat} from '../../camera';
import {timelineFor} from '../../data';
import {BlueGlowDefs, BlueRoom} from '../../chars/vtbits';
import {QonsuInside} from '../stages';
import {voiceEnv} from '../voice';
import {useStems} from '../useStems';
import {AnaBalcony2, BooksStage, ColumnStage, FollowersStage, HerRoomStage, KidWindowStage, SweepStage, talk} from './stages2';

export const STAGE_SCALE = 0.124;
export const WIDE: Cam = {x: CAM_REF.x, y: CAM_REF.y, z: 1.05};

/** The daughter's column, in the order it lights: her room first, then out from it, faster and faster. */
export const COLUMN_ORDER: PlaceId[] = ['qz5', 'qz6', 'qz4', 'qz7', 'qz3', 'qz8', 'qz2', 'qz9', 'qz1'];
const GAPS = [0, 5, 4, 4, 3, 3, 2, 2, 2];
export const columnOn = (B: Record<string, number>) => {
  const out: Record<string, number> = {qz5: B.herWin};
  let at = B.column;
  COLUMN_ORDER.slice(1).forEach((id, i) => {
    at += GAPS[i + 1];
    out[id] = at;
  });
  return out;
};

export const worldShots2 = (B: Record<string, number>): WorldShot[] => {
  const ana = {x: 1112, y: 1310};
  const kid = placeCenter('kidRoom');
  const her = placeCenter('qz5');
  const d1 = placeCenter('qz6'), d2 = placeCenter('qz7'), d3 = placeCenter('qz8');
  const colMid = {x: colCenter(block('R'), 2) - 40, y: (placeCenter('qz1').y + placeCenter('qz9').y) / 2 + 30};
  const b1 = {
    id: 'b1', from: 0, to: B.s2, drift: [0, 0] as [number, number],
    keys: [
      {f: 0, x: WIDE.x, y: WIDE.y, z: WIDE.z},
      {f: B.doorBang - 3, x: lerp(WIDE.x, ana.x, 0.35), y: lerp(WIDE.y, ana.y, 0.35), z: 1.45, ease: 'inOut' as const},
      {f: B.doorBang + 7, x: ana.x + 6, y: ana.y - 10, z: 2.45, ease: 'whip' as const},
      {f: B.s2, x: ana.x + 10, y: ana.y - 12, z: 2.6, ease: 'settle' as const},
    ],
  };
  const b2 = {
    id: 'b2', from: B.s2, to: B.deed1 - 9, drift: [0, -4] as [number, number],
    keys: [
      {f: B.s2, x: kid.x, y: kid.y - 1.5, z: 6.25},
      {f: B.whipToHer, x: kid.x, y: kid.y - 1.5, z: 6.25, ease: 'cut' as const},
      {f: B.herWin - 1, x: her.x, y: her.y, z: 4.0, ease: 'whip' as const},
      {f: B.herWin + 4, x: her.x, y: her.y, z: 4.0, ease: 'cut' as const},
      {f: B.column + 16, x: colMid.x, y: colMid.y, z: 1.2, ease: 'inOut' as const},
      {f: B.cutToKid, x: colMid.x, y: colMid.y, z: 1.2, ease: 'cut' as const},
      {f: B.cutToKid + 1, x: kid.x, y: kid.y + 4, z: 5.4, ease: 'cut' as const},
    ],
  };
  const b3 = {
    id: 'b3', from: B.deed1 - 9, to: B.stairs, drift: [0, -6] as [number, number],
    keys: [
      {f: B.deed1 - 9, x: d1.x, y: d1.y, z: 4.0},
      {f: B.deed2 - 9, x: d1.x, y: d1.y, z: 4.0, ease: 'cut' as const},
      {f: B.deed2 + 3, x: d2.x, y: d2.y, z: 4.0, ease: 'settle' as const},
      {f: B.deed3 - 9, x: d2.x, y: d2.y, z: 4.0, ease: 'cut' as const},
      {f: B.deed3 + 3, x: d3.x, y: d3.y, z: 4.0, ease: 'settle' as const},
      {f: B.count - 4, x: d3.x, y: d3.y, z: 4.0, ease: 'cut' as const},
      {f: B.count - 3, x: ana.x + 8, y: ana.y - 14, z: 3.1, ease: 'cut' as const},
      {f: B.whine - 3, x: ana.x + 8, y: ana.y - 14, z: 3.1, ease: 'cut' as const},
      {f: B.whine - 2, x: kid.x, y: kid.y + 4, z: 5.4, ease: 'cut' as const},
      // a punch-in on "…qonşunun oğluyam!" so the long whine is two images
      {f: B.whinePunch - 1, x: kid.x, y: kid.y + 4, z: 5.4, ease: 'cut' as const},
      {f: B.whinePunch, x: kid.x + 6, y: kid.y - 8, z: 7.4, ease: 'cut' as const},
      {f: B.level - 3, x: kid.x, y: kid.y + 4, z: 5.4, ease: 'cut' as const},
      {f: B.level - 2, x: ana.x + 8, y: ana.y - 18, z: 3.6, ease: 'cut' as const},
    ],
  };
  // end of 5: his window from outside, glowing brighter
  const glow = {
    id: 'glow', from: B.winGlow, to: B.morning, drift: [0, -10] as [number, number],
    keys: [{f: B.winGlow, x: kid.x, y: kid.y, z: 3.2}, {f: B.morning, x: kid.x, y: kid.y - 6, z: 2.6, ease: 'inOut' as const}],
  };
  return [b1, b2, b3, glow];
};

export const worldCam2 = (lang: Lang, f: number): Cam => {
  const B = timelineFor(lang).beats;
  const shots = worldShots2(B);
  if (f <= 0 || f >= B.loopBack) return WIDE;
  const shot = shots.find((s) => f >= s.from && f < s.to) ?? shots[0];
  return camAt(shot, f);
};

/** The night courtyard of part 2. `at` overrides the frame (the loop renders the yard at frame-0 time). */
export const WorldScene2: React.FC<{lang: Lang; at?: number; cam?: Cam}> = ({lang, at, cam: camOverride}) => {
  const cur = useCurrentFrame();
  const f = at ?? cur;
  useStems(lang);
  setDay(0);
  setFlat(false);
  const TL = timelineFor(lang);
  const B = TL.beats;
  const t = f / FPS;
  const cam = camOverride ?? worldCam2(lang, f);
  const zpx = cam.z * STAGE_SCALE;
  const words = (id: string) => TL.wordFrames(id);
  const story = f >= 0 && f < B.loopBack; // the loop's yard is the frame-0 yard
  const on = columnOn(B);

  const slots: Slots = {};
  // the son's window: blue since part 1 (he is out on the stairs in this film)
  slots.son = {level: 0.96 + 0.04 * Math.sin(t * 1.6), glowId: 'glowBlue', bloom: 0.9, stage: <BlueRoom id="rm-son2" level={0.96} />};
  // her column
  for (const id of COLUMN_ORDER) {
    const lit = story && f >= on[id];
    if (!lit) {
      slots[id] = {level: 0, dark: true};
      continue;
    }
    const lv = blueOn(f, on[id]) * (id === 'qz5' ? 1 : 0.92);
    const seed = parseInt(id.slice(2), 10);
    slots[id] = {
      level: lv,
      glowId: 'glowBlue',
      bloom: 0.8,
      stage:
        id === 'qz5' ? <HerRoomStage f={f} zpx={zpx} level={lv} on={on.qz5} /> :
        id === 'qz6' && f >= B.deed1 - 9 ? <SweepStage f={f} zpx={zpx} level={lv} start={B.deed1} /> :
        id === 'qz7' && f >= B.deed2 - 9 ? <BooksStage f={f} zpx={zpx} level={lv} start={B.deed2} /> :
        id === 'qz8' && f >= B.deed3 - 9 ? <FollowersStage f={f} zpx={zpx} level={lv} start={B.deed3} /> :
        <ColumnStage id={`rm-${id}`} level={lv} seed={seed} />,
    };
  }
  // the kid's window: blue, he leans out of it
  const glowBoost = f >= B.winGlow && f < B.morning ? 1 + 0.35 * clamp01((f - B.winGlow) / 10) : 1;
  const kidLevel = (story && f >= B.s2 ? 0.92 + 0.12 * voiceEnv(TL, 'men', f) : 0.95) * glowBoost;
  slots.kidRoom = {
    level: kidLevel,
    glowId: 'glowBlue',
    bloom: 1.2 * glowBoost,
    stage: <KidWindowStage f={story ? f : 0} t={t} zpx={zpx} level={kidLevel} B={B} words={words} />,
  };
  // Ana's balcony: the door bangs open, she bursts out
  const ab = balconyRect(block('L'), 6, 4);
  const shout = (id: string, idx: number) => {
    const w = TL.wordFrames(id)[idx];
    if (!w || f < w.start || f >= w.start + 6) return 0;
    return (f % 2 === 0 ? 1 : -1) * 0.8;
  };
  const anaNod = talk(words('P01'), f, 4) + talk(words('P03'), f, 4) + ['P05', 'P06', 'P07', 'P08', 'P10'].reduce((a, id) => a + talk(words(id), f, 3), 0);
  slots.anaBalcony = {
    level: story && f >= B.doorBang ? 1.05 : 0.95,
    actor: story && f >= B.doorBang - 1 ? (
      <AnaBalcony2 f={f} B={B} zpx={cam.z} x={ab.x + 58} y={ab.y + ab.h - 30} shake={shout('P01', 2) + shout('P03', 2)} nod={anaNod} />
    ) : undefined,
  };
  const qb = balconyRect(block('R'), 0, 5);
  slots.qonsuBalcony = {level: 0.9, inside: <QonsuInside f={f} zpx={cam.z} r={qb} />};

  // the door bang: a burst of warm light from the balcony door for 4 frames
  const bang = story && f >= B.doorBang && f < B.doorBang + 5 ? 1 - (f - B.doorBang) / 5 : 0;
  return (
    <>
      <World cam={cam} t={t} frame={f} slots={slots} nearExtra={<defs><BlueGlowDefs /></defs>} />
      {bang > 0 && <div style={{position: 'absolute', inset: 0, background: `radial-gradient(420px 380px at 46% 38%, rgba(255,214,160,${0.35 * bang}) 0%, rgba(255,214,160,0) 70%)`}} />}
    </>
  );
};

export {placeRect, C};
