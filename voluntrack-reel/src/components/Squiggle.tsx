import React from 'react';
import {useCurrentFrame} from 'remotion';
import {useVoiceFeatures} from '../audio';

/** The student's speaker tag: a small 24-bar waveform driven by the student stem only. */
export const Squiggle: React.FC<{color: string; height?: number; bounce?: number}> = ({color, height = 40, bounce = 0}) => {
  const frame = useCurrentFrame();
  const feat = useVoiceFeatures('S');
  const f = Math.max(0, Math.floor(frame));
  const bars = feat.bars[f];
  return (
    <svg width={24 * 3 + 23 * 2} height={height} viewBox={`0 0 ${24 * 3 + 23 * 2} ${height}`} style={{display: 'block', transform: `translateY(${-bounce}px)`}}>
      {new Array(24).fill(0).map((_, i) => {
        // symmetric envelope so the tag reads as a waveform even when quiet
        const shape = 0.35 + 0.65 * Math.sin((Math.PI * (i + 0.5)) / 24);
        const v = bars ? bars[(i * 7) % 24] * shape : 0;
        const h = Math.max(3, v * (height - 4) + 3);
        return <rect key={i} x={i * 5} y={(height - h) / 2} width={3} height={h} rx={1.5} fill={color} />;
      })}
    </svg>
  );
};
