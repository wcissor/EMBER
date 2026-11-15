import React from 'react';
import {AbsoluteFill} from 'remotion';
import {LABELS} from '../config';
import {CX, S6} from '../layout';
import {dur, ease, prog} from '../motion';
import {colors, stroke} from '../theme';
import {Draw, EV, Label, Strip, StripLabel, Svg, drawn, sceneStart, useLocalTime} from '../components';

type C = readonly [number, number, number];
// Upper intersection of two circles.
const meet = ([x1, y1, r1]: C, [x2, y2, r2]: C) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.hypot(dx, dy);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(r1 * r1 - a * a);
  const xm = x1 + (a * dx) / d;
  const ym = y1 + (a * dy) / d;
  const p1 = [xm + (h * dy) / d, ym - (h * dx) / d];
  const p2 = [xm - (h * dy) / d, ym + (h * dx) / d];
  return p1[1] < p2[1] ? p1 : p2;
};

// One outline: three arcs and a flat base.
const cloudPath = () => {
  const {c1, c2, c3, base} = S6.cloud;
  const a = meet(c1, c2);
  const b = meet(c2, c3);
  return `M${c1[0]},${base} A${c1[2]},${c1[2]} 0 1 1 ${a[0].toFixed(2)},${a[1].toFixed(2)} A${c2[2]},${c2[2]} 0 0 1 ${b[0].toFixed(2)},${b[1].toFixed(2)} A${c3[2]},${c3[2]} 0 1 1 ${c3[0]},${base} Z`;
};
const CLOUD = cloudPath();

// S6 Result: a cloud outline appears and is crossed out with one hairline (no cloud round trip).
// The received strip from S2 returns and fills with no gaps.
export const S6Result: React.FC = () => {
  const local = useLocalTime();
  const t0 = sceneStart(5);
  const t = t0 + local;
  const cloud = prog(t, t0 + 0.05, dur.draw);
  const strike = prog(t, EV.s6_strike, 0.5);
  const stripIn = prog(t, EV.s6_fill - 0.2, dur.out, ease.out);
  const s = S6.strike;

  return (
    <AbsoluteFill>
      <Draw>
        <Svg>
          <path d={CLOUD} fill="none" stroke={colors.text} strokeWidth={stroke.main} strokeLinejoin="round" {...drawn(cloud)} />
          <line x1={s.x0} y1={s.y0} x2={s.x0 + (s.x1 - s.x0) * strike} y2={s.y0 + (s.y1 - s.y0) * strike} stroke={colors.text} strokeWidth={stroke.secondary + 0.5} opacity={strike > 0 ? 1 : 0} />
        </Svg>
      </Draw>
      <Label x={CX} y={S6.label.y} text={LABELS.cloud} align="center" opacity={prog(t, t0 + 0.4, dur.out, ease.out)} />
      <Strip t={t} start={EV.s6_fill} end={EV.s6_fill_end} show={stripIn} />
      <StripLabel show={stripIn} />
    </AbsoluteFill>
  );
};
