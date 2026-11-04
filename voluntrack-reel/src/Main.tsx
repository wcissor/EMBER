import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {ensureFonts} from './fonts';
import {C} from './theme';
import {ASSETS, B} from './data';
import {BeforeWorld, LoopCard} from './scenes/BeforeWorld';
import {Turn} from './scenes/Turn';
import {AfterBackground, AfterStage} from './scenes/AfterWorld';
import {EndCard, LogoTop} from './scenes/EndCard';
import {StarLayer} from './scenes/StarLayer';
import {Captions} from './components/Captions';
import {SafeBox} from './components/SafeBox';

ensureFonts();

export type MainProps = {safeBox?: boolean; layer?: 'all' | 'before'};

export const Main: React.FC<MainProps> = ({safeBox = false, layer = 'all'}) => {
  const frame = useCurrentFrame();
  if (layer === 'before') {
    // used to pre-render the frozen wall (public/frames/wall.png)
    return (
      <AbsoluteFill style={{backgroundColor: C.paper}}>
        <BeforeWorld />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{backgroundColor: C.navy}}>
      {frame >= B.split && <AfterBackground />}
      {frame >= B.split && <AfterStage />}
      {frame < B.freeze && <BeforeWorld />}
      <Turn />
      <EndCard />
      {frame >= B.loopStart && <LoopCard />}
      <StarLayer />
      <LogoTop />
      <Captions />
      {ASSETS.mix && <Audio src={staticFile('audio/mix.wav')} />}
      {safeBox && <SafeBox />}
    </AbsoluteFill>
  );
};
