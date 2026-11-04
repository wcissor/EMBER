import React from 'react';
import {AbsoluteFill} from 'remotion';
import {READABLE, SAFE, RAIL, STAGE, SPEAKER_TAG} from '../layout';

/** QA overlay: the Reels safe box (x 65–1015, y 269–1248) and the zones. */
export const SafeBox: React.FC<{boxes?: boolean}> = ({boxes = false}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <svg width="1080" height="1920">
      <rect x={0} y={0} width={1080} height={SAFE.y0} fill="rgba(255,0,128,0.12)" />
      <rect x={0} y={SAFE.y1} width={1080} height={1920 - SAFE.y1} fill="rgba(255,0,128,0.12)" />
      <rect x={0} y={SAFE.y0} width={SAFE.x0} height={SAFE.y1 - SAFE.y0} fill="rgba(255,0,128,0.12)" />
      <rect x={SAFE.x1} y={SAFE.y0} width={1080 - SAFE.x1} height={SAFE.y1 - SAFE.y0} fill="rgba(255,0,128,0.12)" />
      <rect x={SAFE.x0} y={SAFE.y0} width={SAFE.x1 - SAFE.x0} height={SAFE.y1 - SAFE.y0} fill="none" stroke="#FF0080" strokeWidth={3} strokeDasharray="14 8" />
      <line x1={SAFE.x0} x2={SAFE.x1} y1={STAGE.y0} y2={STAGE.y0} stroke="#00E0FF" strokeWidth={1.5} strokeDasharray="6 6" />
      <line x1={SAFE.x0} x2={SAFE.x1} y1={STAGE.y1} y2={STAGE.y1} stroke="#00E0FF" strokeWidth={1.5} strokeDasharray="6 6" />
      <rect x={RAIL.x0} y={RAIL.y0} width={RAIL.x1 - RAIL.x0} height={RAIL.y1 - RAIL.y0} fill="none" stroke="#FFD000" strokeWidth={1.5} strokeDasharray="6 6" />
      <circle cx={SPEAKER_TAG.x} cy={SPEAKER_TAG.y} r={6} fill="#FFD000" />
      {boxes &&
        Object.entries(READABLE).map(([k, b]) => (
          <rect key={k} x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} fill="none" stroke="#7CFF00" strokeWidth={1} />
        ))}
    </svg>
  </AbsoluteFill>
);
