import React from 'react';
import {Composition} from 'remotion';
import {FPS, HEIGHT, WIDTH} from './config';
import {Main, VARIANTS, durationFor, type Variant} from './Main';
import {GrainBake, GRAIN_TILES, ConcreteBake} from './Bake';
import {Cover2} from './Cover2';

export const RemotionRoot: React.FC = () => (
  <>
    {VARIANTS.map((v: Variant) => (
      <Composition key={v} id={`Main${v}`} component={Main} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={durationFor(v)} defaultProps={{variant: v, safeBox: false}} />
    ))}
    <Composition id="Main" component={Main} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={durationFor('A')} defaultProps={{variant: 'A' as Variant, safeBox: false}} />
    <Composition id="ConcreteBake" component={ConcreteBake} width={512} height={512} fps={FPS} durationInFrames={1} />
    <Composition id="GrainBake" component={GrainBake} width={540} height={960} fps={FPS} durationInFrames={GRAIN_TILES} />
    <Composition id="Cover" component={Cover2} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={1} />
  </>
);
