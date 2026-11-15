import React from 'react';
import {AbsoluteFill, Freeze, Sequence} from 'remotion';
import timeline from './timeline.json';
import {colors} from './theme';
import {Captions, Grain, LineWipe, QA, QAContext, SafeBox, Vignette} from './components';
import {S1Hook} from './scenes/S1Hook';
import {S2Problem} from './scenes/S2Problem';
import {S3Reveal} from './scenes/S3Reveal';
import {S4Diversity} from './scenes/S4Diversity';
import {S5EdgeAI} from './scenes/S5EdgeAI';
import {S6Result} from './scenes/S6Result';
import {S7End} from './scenes/S7End';

const SCENES = [S1Hook, S2Problem, S3Reveal, S4Diversity, S5EdgeAI, S6Result, S7End];
const WIPES = new Set([2, 6]); // olive line wipes at S2->S3 and S6->S7; every other cut is hard

const starts = timeline.sceneStarts;
const lengthOf = (i: number) => (i + 1 < starts.length ? starts[i + 1] : timeline.durationInFrames) - starts[i];

export const Reel: React.FC<QA> = (qa) => (
  <QAContext.Provider value={qa}>
    <AbsoluteFill style={{background: colors.black}}>
      {SCENES.map((Scene, i) => {
        const Prev = SCENES[i - 1];
        return (
          <Sequence key={i} from={starts[i]} durationInFrames={lengthOf(i)} name={`S${i + 1}`}>
            {WIPES.has(i) ? (
              <LineWipe
                prev={
                  <Freeze frame={lengthOf(i - 1) - 1}>
                    <Prev />
                  </Freeze>
                }
              >
                <Scene />
              </LineWipe>
            ) : (
              <Scene />
            )}
          </Sequence>
        );
      })}
      <Captions />
      <Vignette />
      <Grain />
      {qa.showSafeBox ? <SafeBox /> : null}
    </AbsoluteFill>
  </QAContext.Provider>
);
