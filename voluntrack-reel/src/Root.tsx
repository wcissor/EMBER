import React from 'react';
import {Composition} from 'remotion';
import {DURATION_FRAMES, FPS, HEIGHT, WIDTH} from './config';
import {Lab} from './Lab';
import {Main} from './Main';
import {Cover} from './Cover';
import {GrainBake, StampBake, STAMP_BAKES, GRAIN_TILES} from './Bake';
import {STAMP_BAKE_SIZE} from './components/Stamp';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={DURATION_FRAMES} defaultProps={{safeBox: false}} />
    <Composition id="Cover" component={Cover} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={1} />
    <Composition id="GrainBake" component={GrainBake} width={540} height={960} fps={FPS} durationInFrames={GRAIN_TILES} />
    <Composition id="StampBake" component={StampBake} width={STAMP_BAKE_SIZE.w} height={STAMP_BAKE_SIZE.h} fps={FPS} durationInFrames={STAMP_BAKES.length} defaultProps={{seeds: STAMP_BAKES.map((s) => s.seed)}} />
    <Composition id="Lab" component={Lab} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={60} />
  </>
);
