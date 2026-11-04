// VolunTrack-tagged drawing: blue rooms, the halo, VolunTrack screens. (QA gate 9 allowlists this file.)
import React from 'react';
import {VT} from '../vt';
import {mix} from '../color';
import {clamp01} from '../motion';

/** A room lit by VolunTrack: blueCore at the centre, blue to the edges. Stage units (1000×871). */
export const BlueRoom: React.FC<{id: string; level: number; floorY?: number}> = ({id, level, floorY = 830}) => (
  <g>
    <defs>
      <radialGradient id={id} cx="50%" cy="38%" r="80%">
        <stop offset="0%" stopColor={VT.core} />
        <stop offset="45%" stopColor={mix(VT.core, VT.blue, 0.62)} />
        <stop offset="100%" stopColor={VT.deep} />
      </radialGradient>
    </defs>
    <rect x={0} y={0} width={1000} height={871} fill="#06091A" />
    <rect x={0} y={0} width={1000} height={871} fill={`url(#${id})`} opacity={clamp01(level)} />
    {level > 1 && <rect x={0} y={0} width={1000} height={871} fill={VT.core} opacity={clamp01(level - 1) * 0.6} />}
    <rect x={0} y={floorY} width={1000} height={871 - floorY} fill={VT.deep} opacity={0.55 * clamp01(level)} />
  </g>
);

/** Facade spill gradient for a blue window (define once per layer). */
export const BlueGlowDefs: React.FC<{id?: string}> = ({id = 'glowBlue'}) => (
  <>
    <radialGradient id={id}>
      <stop offset="0%" stopColor={VT.blue} stopOpacity={0.62} />
      <stop offset="38%" stopColor={VT.blue} stopOpacity={0.34} />
      <stop offset="70%" stopColor={VT.blue} stopOpacity={0.1} />
      <stop offset="100%" stopColor={VT.blue} stopOpacity={0} />
    </radialGradient>
    <radialGradient id={`${id}Bloom`}>
      <stop offset="0%" stopColor={VT.core} stopOpacity={0.35} />
      <stop offset="100%" stopColor={VT.blue} stopOpacity={0} />
    </radialGradient>
  </>
);

/** The thin halo ring above a head (figure units, centred on 0,0). Tilts with the head; `sparkle` 0..1 crosses it. */
export const Halo: React.FC<{tilt: number; opacity?: number; sparkle?: number; w?: number}> = ({tilt, opacity = 1, sparkle = -1, w = 13}) => {
  const sp = sparkle >= 0 && sparkle <= 1;
  const a = Math.PI * (1 - sparkle);
  const sx = Math.cos(a) * w;
  const sy = -Math.sin(a) * w * 0.26;
  return (
    <g transform={`rotate(${tilt})`} opacity={opacity}>
      <ellipse cx={0} cy={0} rx={w} ry={w * 0.26} fill="none" stroke={VT.blue} strokeWidth={3.4} opacity={0.35} />
      <ellipse cx={0} cy={0} rx={w} ry={w * 0.26} fill="none" stroke={VT.core} strokeWidth={1.3} />
      {sp && (
        <g transform={`translate(${sx} ${sy}) scale(${0.6 + Math.sin(sparkle * Math.PI) * 0.9})`}>
          <path d="M0 -4 L0.9 -0.9 L4 0 L0.9 0.9 L0 4 L-0.9 0.9 L-4 0 L-0.9 -0.9 Z" fill="#FFFFFF" />
          <circle r={2.4} fill={VT.core} opacity={0.5} />
        </g>
      )}
    </g>
  );
};

export const VT_RIM = VT.rim;
export const VT_CORE = VT.core;
export const VT_BLUE = VT.blue;
