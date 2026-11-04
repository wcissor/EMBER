import React from 'react';
import {Composition} from 'remotion';
import {DURATION_FRAMES, FPS, HEIGHT, WIDTH} from './config';
import {Main} from './Main';
import {Lab} from './Lab';
import {Cover} from './Cover';
import {GlyphTest} from './GlyphTest';
import {GrainBake, GRAIN_TILES, ConcreteBake} from './Bake';
import {Lab2} from './Lab2';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={DURATION_FRAMES} defaultProps={{lang: 'az' as const, safeBox: false}} />
    <Composition id="Lab" component={Lab} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={30} />
    <Composition id="Lab2" component={Lab2} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={300} />
    <Composition id="ConcreteBake" component={ConcreteBake} width={512} height={512} fps={FPS} durationInFrames={1} />
    <Composition id="GrainBake" component={GrainBake} width={540} height={960} fps={FPS} durationInFrames={GRAIN_TILES} />
    <Composition id="Cover" component={Cover} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={1} defaultProps={{lang: 'az' as const}} />
    <Composition id="GlyphTest" component={GlyphTest} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={1} />
  </>
);
