// The courtyard shots (S1, S2, S3, S5 after the UI, S6): camera, story slots and light, per frame.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from '../theme';
import {FPS, type Lang} from '../config';
import {clamp01, lerp, blueOn, warmOn} from '../motion';
import {balconyRect, block, placeRect, placeCenter, type PlaceId} from '../layout';
import {camAt, worldShots, type Cam} from '../camera';
import {World, type Slots} from '../world/World';
import {timelineFor} from '../data';
import {BlueGlowDefs} from '../chars/vtbits';
import {voiceEnv} from './voice';
import {useStems} from './useStems';
import {
  SonStage, PlantStage, TeachStage, WaterStage, TranslateStage, KidRoomStage, AnaOnBalcony, QonsuOnBalcony, QonsuInside,
} from './stages';

const STAGE_SCALE = 0.124;

export const worldCam = (lang: Lang, f: number): Cam => {
  const B = timelineFor(lang).beats;
  const shots = worldShots(B);
  const shot = shots.find((s) => f >= s.from && f < s.to) ?? (f < shots[0].from ? shots[0] : shots[shots.length - 1]);
  return camAt(shot, f);
};

/** Light level of a blue story window that switches on at `on` (blueOn: 120% → 100% over 8 frames). */
const blueAt = (f: number, on: number, off = Infinity) => (f < on || f >= off ? 0 : blueOn(f, on));

/** After the UI card lands, the courtyard's lights come back on in a ripple from the new window (warmOn each). */
export const powerRipple = (lang: Lang, f: number) => {
  const B = timelineFor(lang).beats;
  if (f < B.tap || f >= B.wide) return undefined;
  const c = placeCenter('deed1');
  return (x: number, y: number) => warmOn(f, B.cardLand + Math.hypot(x - c.x, y - c.y) / 34);
};

export const WorldScene: React.FC<{lang: Lang; hideSky?: boolean; hideFar?: boolean}> = ({lang, hideSky, hideFar}) => {
  const f = useCurrentFrame();
  useStems(lang);
  const TL = timelineFor(lang);
  const B = TL.beats;
  const t = f / FPS;
  const cam = worldCam(lang, f);
  const zpx = cam.z * STAGE_SCALE;
  const env = (v: 'ana' | 'men' | 'qo' | 'qq') => voiceEnv(TL, v, f);
  const breathe = (v: 'ana' | 'men' | 'qo' | 'qq') => 0.92 + 0.16 * env(v);
  const s2End = B.whipBack + 2;
  const s5Start = B.cardLand - 2;

  // ── the son's windows (right block)
  const sonLevel = (0.96 + 0.04 * Math.sin(t * 1.6)) * (f >= B.allFour && f < s2End ? 1 + 0.12 * Math.max(0, Math.sin((f - B.allFour) * 0.5)) : 1);
  const wins: [PlaceId, number][] = [['winA', B.winA], ['winB', B.winB], ['winC', B.winC], ['winD', B.winD]];
  const pulse = f >= B.allFour && f < s2End ? 1 + 0.14 * Math.max(0, Math.sin(((f - B.allFour) / 9) * Math.PI)) : 1;
  const slots: Slots = {
    son: {level: sonLevel, glowId: 'glowBlue', bloom: 0.9, stage: <SonStage f={f} t={t} B={B} zpx={zpx} level={sonLevel} />},
  };
  for (const [id, on] of wins) {
    const lv = blueAt(f, on, s2End) * pulse * (f < s2End ? breathe('ana') : 1);
    if (lv <= 0) {
      slots[id] = {level: 0, dark: true};
      continue;
    }
    const sp = {f, t, B, zpx, level: lv, start: on};
    slots[id] = {
      level: lv,
      glowId: 'glowBlue',
      bloom: 0.8,
      stage:
        id === 'winA' ? <PlantStage {...sp} who="son" /> : id === 'winB' ? <TeachStage {...sp} who="son" /> : id === 'winC' ? <WaterStage {...sp} who="son" /> : <TranslateStage {...sp} />,
    };
  }

  // ── the kid's room (left block)
  const phase: 's3' | 's5' | 's6' = f < s5Start ? 's3' : f < B.wide ? 's5' : 's6';
  const blueKid = phase === 's3' ? 0 : phase === 's5' ? blueAt(f, B.bedroomBlue) : 1;
  const amberKid = phase === 's3' ? 1 : phase === 's5' ? 1 - clamp01((f - B.bedroomBlue) / 2) : 0;
  const kidEnv = phase === 's6' && f >= B.kidStep ? breathe('men') : 1;
  const kidRect = placeRect('kidRoom');
  slots.kidRoom = {
    level: blueKid > 0 ? blueKid * kidEnv : 0.62,
    glowId: blueKid > 0 ? 'glowBlue' : 'glowAmber',
    bloom: blueKid > 0 ? 1.2 : 0.3,
    stage: <KidRoomStage f={f} t={t} B={B} zpx={zpx} blue={blueKid * kidEnv} amber={amberKid} phase={phase} />,
    front: (
      <g>
        <rect x={kidRect.x - 6} y={kidRect.y + kidRect.h + 48} width={kidRect.w + 12} height={6} fill="#2A3350" />
        <rect x={kidRect.x - 6} y={kidRect.y + kidRect.h - 2} width={kidRect.w + 12} height={3.2} fill="#141A2C" />
        {Array.from({length: 12}, (_, i) => (
          <rect key={i} x={kidRect.x - 4 + i * 11.4} y={kidRect.y + kidRect.h} width={1.8} height={48} fill="#141A2C" />
        ))}
      </g>
    ),
  };

  // ── our kid's deeds (S5): blue on cue, each on its line's first word
  const deeds: [PlaceId, number, 'plant' | 'teach' | 'water'][] = [['deed1', B.deed1, 'plant'], ['deed2', B.deed2, 'teach'], ['deed3', B.deed3, 'water']];
  for (const [id, on, kind] of deeds) {
    const visible = f >= B.tap + 4 && f < B.wide;
    const card = id === 'deed1' && f >= B.cardLand - 2 && f < on ? 0.7 : 0;
    const lv = visible ? Math.max(card, blueAt(f, on) * breathe('men')) : 0;
    if (lv <= 0) {
      slots[id] = {level: 0, dark: true};
      continue;
    }
    const sp = {f, t, B, zpx, level: lv, start: on};
    slots[id] = {
      level: lv,
      glowId: 'glowBlue',
      bloom: 0.8,
      stage: kind === 'plant' ? <PlantStage {...sp} who="kid" /> : kind === 'teach' ? <TeachStage {...sp} who="kid" /> : <WaterStage {...sp} who="kid" />,
    };
  }

  // ── balconies
  const ab = balconyRect(block('L'), 6, 4);
  const anaMode = f < B.whipLand + 30 ? 's1' : f >= B.wide ? 's6' : null;
  const shoutShake = (id: '01' | '19' | '20') => {
    const words = TL.wordFrames(id);
    const idx = id === '01' ? (lang === 'az' ? 2 : 4) : id === '19' ? (lang === 'az' ? 2 : 4) : 1;
    const w = words[idx];
    if (!w || f < w.start || f >= w.start + 6) return 0;
    return (f % 2 === 0 ? 1 : -1) * 0.8;
  };
  slots.anaBalcony = {
    level: 0.95,
    actor: anaMode ? (
      <AnaOnBalcony f={f} B={B} zpx={cam.z} x={ab.x + 58} y={ab.y + ab.h - 30} mode={anaMode} shake={anaMode === 's1' ? shoutShake('01') : shoutShake('20')} />
    ) : undefined,
  };
  const qb = balconyRect(block('R'), 0, 5);
  slots.qonsuBalcony = {
    level: 0.9,
    inside: <QonsuInside f={f} zpx={cam.z} r={qb} />,
    actor: f >= B.wide - 20 ? <QonsuOnBalcony f={f} B={B} zpx={cam.z} x={qb.x + 108} y={qb.y + qb.h - 30} shake={shoutShake('19')} /> : undefined,
  };

  return (
    <World
      cam={cam}
      t={t}
      frame={f}
      slots={slots}
      hideSky={hideSky}
      hideFar={hideFar}
      power={powerRipple(lang, f)}
      nearExtra={
        <defs>
          <BlueGlowDefs />
        </defs>
      }
    />
  );
};

export {lerp, C};
