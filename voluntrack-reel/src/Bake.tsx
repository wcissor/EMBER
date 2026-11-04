// Bake compositions: render the browser's own feTurbulence output once, so the film can reuse it per frame.
//   GrainBake  — 24 seeded grain tiles (540×960, transparent) → public/grain/gNN.png
//   StampBake  — every stamp's inked texture (transparent, unrotated) → public/stamps/<seed>.png
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ensureFonts} from './fonts';
import {STAMP_BAKE_SIZE, StampGraphic} from './components/Stamp';
import {CARDS} from './scenes/BeforeWorld';
import {STAMPS} from './config';

ensureFonts();

export const GRAIN_TILES = 24;

export const GrainBake: React.FC = () => {
  const seed = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: 'transparent'}}>
      <svg width="540" height="960" viewBox="0 0 540 960">
        <filter id={`gb-${seed}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed + 1} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.4 0 0 0 -0.95" />
        </filter>
        <rect width="540" height="960" filter={`url(#gb-${seed})`} fill="#000" />
      </svg>
    </AbsoluteFill>
  );
};

export type BakeStamp = {seed: string; text: string; fontSize?: number};
export const STAMP_BAKES: BakeStamp[] = [
  ...CARDS.flatMap((c): BakeStamp[] => [
    ...(c.stamp ? [{seed: c.key, text: c.stamp.text, fontSize: c.stamp.fontSize}] : []),
    ...(c.pre ? [{seed: c.key, text: c.pre.text, fontSize: c.pre.fontSize}] : []),
  ]),
  {seed: 'seen', text: STAMPS.seen, fontSize: 130},
  {seed: 'cover', text: STAMPS.deadline, fontSize: 118},
];

export const StampBake: React.FC<{seeds?: string[]}> = () => {
  const i = useCurrentFrame();
  const s = STAMP_BAKES[i];
  return (
    <AbsoluteFill style={{backgroundColor: 'transparent'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: STAMP_BAKE_SIZE.w, height: STAMP_BAKE_SIZE.h}}>
        <StampGraphic text={s.text} fontSize={s.fontSize} seed={s.seed} />
      </div>
    </AbsoluteFill>
  );
};
