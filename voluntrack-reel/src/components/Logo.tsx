// The VolunTrack mark, layered so the film can build it: disc (behind the star) and ring + inner disc + diamonds +
// serif "VT" monogram (in front of the star, covering its centre). Paths come from logo.svg via src/logoData.ts.
import React from 'react';
import {LOGO, LOGO_DIAMONDS, LOGO_MONOGRAM} from '../logoData';
import {EASE, clamp01, springAt} from '../motion';

type P = {cx: number; cy: number; size: number; frame: number; resolve: number};

/** Outer navy disc — sits behind the star. */
export const LogoBack: React.FC<P> = ({cx, cy, size, frame, resolve}) => {
  const t = EASE.vtOut(clamp01((frame - (resolve - 24)) / 28));
  if (t <= 0) return null;
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{position: 'absolute', left: cx - size / 2, top: cy - size / 2, opacity: t, overflow: 'visible'}}>
      <circle r={100 * (0.92 + 0.08 * t)} fill={LOGO.navy} />
    </svg>
  );
};

/** Ring (draws itself in the 24 frames before the downbeat), inner disc, diamonds, and the monogram rising 8 px (hero). */
export const LogoFront: React.FC<P> = ({cx, cy, size, frame, resolve}) => {
  const draw = EASE.vtInOut(clamp01((frame - (resolve - 24)) / 24));
  if (draw <= 0) return null;
  const mid = (LOGO.ringIn + LOGO.ringOut) / 2;
  const w = LOGO.ringOut - LOGO.ringIn;
  const per = 2 * Math.PI * mid;
  const innerT = EASE.vtInOut(clamp01((frame - (resolve - 16)) / 16));
  const mono = springAt(frame, resolve, 'hero');
  const unit = size / 200; // px per logo unit
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{position: 'absolute', left: cx - size / 2, top: cy - size / 2, overflow: 'visible'}}>
      <circle r={LOGO.ringIn * innerT} fill={LOGO.navy} />
      <circle r={mid} fill="none" stroke="#FFFFFF" strokeWidth={w} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} transform="rotate(-90)" strokeLinecap="butt" />
      {LOGO_DIAMONDS.map((d, i) => {
        const s = springAt(frame, resolve - 10 + i * 3, 'settle');
        return <path key={i} d={d} fill="#FFFFFF" fillRule="evenodd" opacity={clamp01(s * 1.4)} />;
      })}
      {frame >= resolve && (
        <path d={LOGO_MONOGRAM} fill="#FFFFFF" fillRule="evenodd" transform={`translate(0 ${(8 / unit) * (1 - mono)})`} opacity={clamp01(mono * 2)} />
      )}
    </svg>
  );
};
