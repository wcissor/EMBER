import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ensureFonts} from './fonts';
import {PaperBackground, Grain} from './components/Paper';
import {PostCard} from './components/PostCard';
import {Stamp} from './components/Stamp';
import {POSTS} from './config';

ensureFonts();

/** Design-system test sheet (not part of the film). */
export const Lab: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PaperBackground />
      <div style={{position: 'absolute', left: 160, top: 180, transform: 'rotate(-3deg)'}}>
        <PostCard def={POSTS.hook}>
          <Stamp text="DEADLINE PASSED" frame={frame} hit={10} x={390} y={590} rot={-8} fontSize={100} seed="lab1" />
        </PostCard>
      </div>
      <Grain frame={frame} />
    </AbsoluteFill>
  );
};
