// Bake feTurbulence textures once so the film can reuse them every frame:
//   GrainBake — 24 seeded grain tiles (540×960, grey noise around 50%) → public/grain/gNN.png
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';

export const GRAIN_TILES = 24;

export const GrainBake: React.FC = () => {
  const seed = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: '#808080'}}>
      <svg width="540" height="960" viewBox="0 0 540 960">
        <filter id={`gb-${seed}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed + 1} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0.9 0.9 0.9 0 -0.85  0.9 0.9 0.9 0 -0.85  0.9 0.9 0.9 0 -0.85  0 0 0 0 1" />
        </filter>
        <rect width="540" height="960" filter={`url(#gb-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Concrete: low-frequency mottling + fine speckle, transparent (dark and light flecks) → public/tex/concrete.png */
export const ConcreteBake: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: 'transparent'}}>
    <svg width="512" height="512" viewBox="0 0 512 512">
      <filter id="cc" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves={4} seed={7} stitchTiles="stitch" result="lo" />
        <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves={2} seed={11} stitchTiles="stitch" result="hi" />
        <feComposite in="lo" in2="hi" operator="arithmetic" k1="0" k2="0.75" k3="0.35" k4="-0.05" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.6  0 0 0 0 0.75  1.8 0 0 0 -0.75" />
      </filter>
      <rect width="512" height="512" filter="url(#cc)" />
    </svg>
  </AbsoluteFill>
);
