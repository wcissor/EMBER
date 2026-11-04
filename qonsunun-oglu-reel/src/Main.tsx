import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {ensureFonts} from './fonts';
import {LangProvider} from './lang';
import type {Lang} from './config';
import {timelineFor} from './data';
import {blurRanges, project} from './camera';
import {placeCenter, placeRect} from './layout';
import {clamp01, lerp} from './motion';
import {WorldScene, worldCam} from './scenes/WorldScene';
import {StairwellScene} from './scenes/Stairwell';
import {UIMoment} from './scenes/UIMoment';
import {Constellation, craneT} from './scenes/Constellation';
import {Captions, EndCard, GodRays, Grain, SafeBoxOverlay, Title} from './overlays/Overlays';

ensureFonts();

export type SceneId = 'world1' | 'stairs' | 'ui' | 'world2' | 'end';
export const sceneAt = (lang: Lang, f: number): SceneId => {
  const B = timelineFor(lang).beats;
  if (f < B.push + 7) return 'world1';
  if (f < B.uiIn) return 'stairs';
  if (f < B.cardLand - 2) return 'ui';
  if (f < B.crane) return 'world2';
  return 'end';
};

/** Frames that get camera motion blur: whips, the push, the tumble, the card's flight, the crane. Never resting text. */
export const blurFrames = (lang: Lang): [number, number][] => {
  const B = timelineFor(lang).beats;
  return [...blurRanges(B), [B.catStep + 2, B.tumbleLand], [B.tap + 4, B.cardLand - 2], [B.crane, B.crane + 42]];
};
const inRanges = (f: number, rs: [number, number][]) => rs.some(([a, b]) => f >= a && f <= b);

/** The picture (everything that may blur). */
const Picture: React.FC<{lang: Lang}> = ({lang}) => {
  const f = useCurrentFrame();
  const B = timelineFor(lang).beats;
  const scene = sceneAt(lang, f);
  if (scene === 'world1' || scene === 'world2') return <WorldScene lang={lang} />;
  if (scene === 'stairs') return <StairwellScene lang={lang} />;
  if (scene === 'ui')
    return (
      <>
        {f >= B.tap + 4 && <WorldScene lang={lang} />}
        <UIMoment lang={lang} />
      </>
    );
  // the end: the courtyard falls away as the camera cranes up and back
  const u = craneT(f, B.crane);
  const fall = u <= 0 ? 0 : Math.pow(u, 1.15);
  return (
    <>
      <Constellation lang={lang} />
      {u < 0.92 && (
        <div style={{position: 'absolute', inset: 0, transformOrigin: '540px 560px', transform: `translateY(${fall * 1750}px) scale(${lerp(1, 0.4, fall)})`}}>
          <WorldScene lang={lang} hideSky hideFar />
        </div>
      )}
    </>
  );
};

const Rays: React.FC<{lang: Lang}> = ({lang}) => {
  const f = useCurrentFrame();
  const B = timelineFor(lang).beats;
  const son = project(worldCam(lang, f), placeCenter('son').x, placeCenter('son').y);
  const col = project(worldCam(lang, f), placeCenter('winB').x, placeCenter('winB').y);
  const kr = placeRect('kidRoom');
  const kid = project(worldCam(lang, f), kr.x + 50, kr.y + kr.h - 40);
  return (
    <>
      {f >= B.title && f < B.title + 40 && <GodRays at={B.title} x={son.x} y={son.y - 200} />}
      {f >= B.rays2 && f < B.rays2 + 40 && <GodRays at={B.rays2} x={col.x} y={col.y} hold={14} />}
      {f >= B.kidRays && f < B.crane && <GodRays at={B.kidRays} x={kid.x} y={kid.y} hold={12} />}
    </>
  );
};

export const Main: React.FC<{lang: Lang; safeBox?: boolean}> = ({lang, safeBox}) => {
  const frame = useCurrentFrame();
  const blur = inRanges(frame, blurFrames(lang));
  return (
    <LangProvider lang={lang}>
      <AbsoluteFill style={{backgroundColor: '#080D1C', overflow: 'hidden'}}>
        {blur ? (
          <CameraMotionBlur shutterAngle={180} samples={10}>
            <Picture lang={lang} />
          </CameraMotionBlur>
        ) : (
          <Picture lang={lang} />
        )}
        <Rays lang={lang} />
        <Title lang={lang} />
        <Captions lang={lang} />
        <EndCard lang={lang} />
        <Grain />
        {safeBox && <SafeBoxOverlay />}
      </AbsoluteFill>
    </LangProvider>
  );
};

export {clamp01};
