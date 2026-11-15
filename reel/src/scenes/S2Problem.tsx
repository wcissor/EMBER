import React from 'react';
import {AbsoluteFill} from 'remotion';
import {LABELS} from '../config';
import {CX, S2} from '../layout';
import {dur, ease, mix, prog} from '../motion';
import {colors, stroke} from '../theme';
import {Draw, EV, Label, Strip, StripLabel, Svg, sceneStart, useLocalTime, wordAt} from '../components';

// Expected packets that never arrive, in the "received" strip.
const GAPS = [4, 5, 11, 17, 18, 19, 24, 29, 30, 35];

// Fine rain: short diagonal hairlines drifting at a constant speed (deterministic positions).
const DROPS = Array.from({length: 26}, (_, i) => ({bx: 262 + ((i * 0.7548776662) % 1) * 738, phase: (i * 0.5698402910 + 0.13) % 1}));
const RAIN_SPEED = 150; // px/s
const SLANT = 0.36; // x per y

// S2 Problem: DISTANCE (the path stretches), CROPS (rows rise and block it), WEATHER (fine rain).
// The received strip fills with packets but keeps gaps. No numbers.
export const S2Problem: React.FC = () => {
  const local = useLocalTime();
  const t = sceneStart(1) + local;

  const stretch = prog(t, EV.s2_distance, dur.inOut);
  const xs = mix(S2.sensorX[0], S2.sensorX[1], stretch);
  const xr = mix(S2.receiverX[0], S2.receiverX[1], stretch);
  const fades = prog(t, wordAt(2, 5).start, dur.inOut); // "fades,"
  const pathOpacity = mix(0.9, 0.55, stretch) * mix(1, 0.4, fades);

  const rows = S2.rows.map((_, k) => prog(t, EV.s2_crops + k * 0.03, dur.inOut));
  const rain = prog(t, EV.s2_weather, dur.out, ease.out);
  const stripIn = prog(t, EV.s2_strip, dur.out, ease.out);
  const {x0, x1, y0, y1} = S2.rain;
  const fall = y1 - y0;

  return (
    <AbsoluteFill>
      <Draw>
        <Svg>
          {/* rain */}
          {rain > 0
            ? DROPS.map((d, i) => {
                const s = (d.phase * fall + RAIN_SPEED * (t - EV.s2_weather)) % fall;
                const y = y0 + s;
                const x = d.bx - SLANT * s;
                const edge = Math.min(1, s / 48, (fall - s) / 48);
                if (x < x0 - 40 || x > x1 + 40) return null;
                return <line key={i} x1={x} y1={y} x2={x + SLANT * 26} y2={y - 26} stroke={colors.grey} strokeWidth={stroke.secondary} opacity={0.5 * rain * edge} />;
              })
            : null}
          {/* the radio path between sensor and receiver */}
          <line x1={xs + 10} y1={S2.pathY} x2={xr - 12} y2={S2.pathY} stroke={colors.text} strokeWidth={stroke.secondary} opacity={pathOpacity} />
          {/* crop rows rise and cut the path: each has a ground-coloured core that blocks it */}
          {S2.rows.map((x, k) =>
            rows[k] > 0 ? (
              <g key={k}>
                <line x1={x} y1={S2.rowBase} x2={x} y2={mix(S2.rowBase, S2.rowTop, rows[k])} stroke={colors.black} strokeWidth={14} />
                <line x1={x} y1={S2.rowBase} x2={x} y2={mix(S2.rowBase, S2.rowTop, rows[k])} stroke={colors.grey} strokeWidth={stroke.secondary} opacity={0.8} />
              </g>
            ) : null,
          )}
          {/* sensor and receiver */}
          <circle cx={xs} cy={S2.pathY} r={7} fill={colors.text} />
          <rect x={xr - 8} y={S2.pathY - 8} width={16} height={16} fill={colors.black} stroke={colors.text} strokeWidth={stroke.main} />
        </Svg>
      </Draw>
      <Label x={xs - 8} y={S2.labels.ends.y} text={LABELS.sensor} />
      <Label x={xr + 8} y={S2.labels.ends.y} text={LABELS.receiver} align="right" />
      <Label x={CX} y={S2.labels.distance.y} text={LABELS.distance} align="center" opacity={prog(t, EV.s2_distance, dur.out, ease.out)} />
      <Label x={CX} y={S2.labels.crops.y} text={LABELS.crops} align="center" opacity={prog(t, EV.s2_crops, dur.out, ease.out)} />
      <Label x={CX} y={S2.labels.weather.y} text={LABELS.weather} align="center" opacity={rain} />
      <Strip t={t} start={EV.s2_strip} end={EV.s2_strip_end} gaps={GAPS} show={stripIn} />
      <StripLabel show={stripIn} />
    </AbsoluteFill>
  );
};
