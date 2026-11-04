// out/cover.png: the hook as a poster. Ana points across the courtyard at the blue window in its god rays, under the
// title. Everything sits inside the middle 1080×1440 (y 240–1680) so the 3:4 profile grid never crops it.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ensureFonts} from './fonts';
import {C, SCRIM, TYPE} from './theme';
import {TEXT, type Lang} from './config';
import {TITLE} from './layout';
import {timelineFor} from './data';
import {World, type Slots} from './world/World';
import {SonStage, AnaOnBalcony} from './scenes/stages';
import {BlueGlowDefs} from './chars/vtbits';
import {balconyRect, block, placeCenter} from './layout';
import {project} from './camera';

ensureFonts();

export const Cover: React.FC<{lang?: Lang}> = ({lang = 'az'}) => {
  const B = timelineFor(lang).beats;
  const f = 14; // Ana's point has landed
  // two planes: the far block with the blue window (background) and Ana's balcony up close (foreground)
  const cam = {x: 1800, y: 1225, z: 1.9};
  const fg = {x: 1180, y: 1200, z: 3.3};
  const ab = balconyRect(block('L'), 6, 4);
  const slots: Slots = {
    son: {level: 1.05, glowId: 'glowBlue', bloom: 1.2, stage: <SonStage f={60} t={2} B={B} zpx={cam.z * 0.124} level={1.05} />},
  };
  const fgSlots: Slots = {
    anaBalcony: {level: 0.95, actor: <AnaOnBalcony f={f} B={B} zpx={fg.z} x={ab.x + 58} y={ab.y + ab.h - 30} mode="s1" />},
  };
  const son = project(cam, placeCenter('son').x, placeCenter('son').y);
  const a0 = project(fg, ab.x - 14, ab.y - 10);
  const a1 = project(fg, ab.x + ab.w + 14, ab.y + ab.h + 16);
  const T = TEXT[lang];
  const rays = [-25, -16.67, -8.33, 0, 8.33, 16.67, 25];
  return (
    <AbsoluteFill style={{backgroundColor: C.skyTop}}>
      <World cam={cam} t={2} frame={60} slots={slots} nearExtra={<defs><BlueGlowDefs /></defs>} />
      <div style={{position: 'absolute', inset: 0, clipPath: `inset(${a0.y}px ${1080 - a1.x}px ${1920 - a1.y}px ${a0.x}px round 10px)`, filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.6))'}}>
        <World cam={fg} t={2} frame={60} slots={fgSlots} hideSky hideFar />
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, mixBlendMode: 'screen'}}>
        <defs>
          <linearGradient id="cr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF3DC" stopOpacity={0.9} />
            <stop offset="75%" stopColor="#FFF3DC" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#FFF3DC" stopOpacity={0} />
          </linearGradient>
        </defs>
        <g opacity={0.2}>
          {rays.map((d, i) =>
            [2.2, 4.4, 7.2].map((w, k) => {
              const len = son.y + 520;
              const half = Math.tan((w * Math.PI) / 360) * len;
              return <path key={`${i}-${k}`} d={`M-1.5 0 L${-half} ${len} L${half} ${len} L1.5 0 Z`} fill="url(#cr)" opacity={[0.55, 0.32, 0.18][k]} transform={`translate(${son.x} ${-120}) rotate(${d})`} />;
            }),
          )}
        </g>
      </svg>
      <div style={{position: 'absolute', left: 60, right: 60, top: TITLE.y - 34, height: TITLE.h + 118, background: SCRIM, filter: 'blur(28px)', borderRadius: 80}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: TITLE.y, height: TITLE.h, display: 'flex', alignItems: 'center', justifyContent: 'center', ...TYPE.title, fontSize: TITLE.size[lang], color: C.eye, whiteSpace: 'nowrap'}}>
        {T.title}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: TITLE.sub.y, height: TITLE.sub.h, textAlign: 'center', ...TYPE.sub, color: C.muted}}>{T.titleSub}</div>
    </AbsoluteFill>
  );
};
