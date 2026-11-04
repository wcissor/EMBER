import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {ASSETS} from '../data';
import {C} from '../theme';

/** Paper ground with a soft light from the top left. */
export const PaperBackground: React.FC<{dx?: number; dy?: number}> = ({dx = 0, dy = 0}) => (
  <AbsoluteFill style={{backgroundColor: C.paper}}>
    <AbsoluteFill
      style={{
        transform: `translate(${dx}px, ${dy}px) scale(1.06)`,
        background:
          'radial-gradient(1400px 1200px at 8% 2%, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%), radial-gradient(1600px 1400px at 100% 100%, rgba(80,64,40,0.10), rgba(0,0,0,0) 70%)',
      }}
    />
  </AbsoluteFill>
);

/** Live paper grain: SVG feTurbulence at 4%, reseeded every 2 frames.
 *  The browser's feTurbulence output is baked into 24 seeded tiles (Bake.tsx) and cycled, for render speed. */
export const Grain: React.FC<{frame: number; opacity?: number}> = ({frame, opacity = 0.04}) => {
  const seed = Math.floor(frame / 2) % 997;
  if (ASSETS.grain) {
    const n = Math.floor(frame / 2) % 24;
    return (
      <AbsoluteFill style={{pointerEvents: 'none', opacity, mixBlendMode: 'multiply'}}>
        <Img src={staticFile(`grain/g${String(n).padStart(2, '0')}.png`)} style={{width: 540, height: 960, transform: 'scale(2)', transformOrigin: '0 0'}} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity, mixBlendMode: 'multiply'}}>
      {/* computed at half resolution and scaled 2× (2 px grain survives H.264; 4× cheaper to rasterize) */}
      <svg width="540" height="960" viewBox="0 0 540 960" style={{transform: 'scale(2)', transformOrigin: '0 0'}}>
        <filter id={`grain-${seed}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.4 0 0 0 -0.95" />
        </filter>
        <rect width="540" height="960" filter={`url(#grain-${seed})`} fill="#000" />
      </svg>
    </AbsoluteFill>
  );
};
