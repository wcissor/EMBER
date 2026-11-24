// out/cover.png: beat 2 as a poster — the kid at his blue window, and across the yard her whole column lit — with
// "QONŞUNUN QIZI · 2-ci hissə" in the middle (inside the 1080×1440 grid crop, y 240–1680).
import React from 'react';
import {AbsoluteFill, Freeze} from 'remotion';
import {ensureFonts} from './fonts';
import {C, FONT, SCRIM, TYPE} from './theme';
import {TEXT} from './config';
import {timelineFor} from './data';
import {WorldScene2} from './scenes/p2/World2';

ensureFonts();

export const Cover2: React.FC = () => {
  const B = timelineFor('az').beats;
  const at = B.column + 40;
  return (
    <AbsoluteFill style={{backgroundColor: '#080D1C'}}>
      <Freeze frame={at}>
        <WorldScene2 lang="az" at={at} cam={{x: 1540, y: 1150, z: 0.86}} />
      </Freeze>
      <div style={{position: 'absolute', left: 50, right: 50, top: 760, height: 330, background: SCRIM, filter: 'blur(30px)', borderRadius: 90}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 800, textAlign: 'center', ...TYPE.title, fontSize: 132, color: C.eye, whiteSpace: 'nowrap', transform: 'rotate(-1.5deg)'}}>{TEXT.title}</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 960, display: 'flex', justifyContent: 'center'}}>
        <div style={{fontFamily: FONT.ui, fontWeight: 700, fontSize: 44, color: '#0A0E19', background: C.eye, borderRadius: 999, padding: '10px 34px', transform: 'rotate(-2deg)'}}>{TEXT.part}</div>
      </div>
    </AbsoluteFill>
  );
};
