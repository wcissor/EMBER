import React from 'react';
import {AbsoluteFill, interpolateColors} from 'remotion';
import {LABELS} from '../config';
import {S4} from '../layout';
import {STREAM, dur, ease, mix, prog} from '../motion';
import {colors, stroke} from '../theme';
import {Draw, EV, Label, Packet, Svg, sceneStart, useLocalTime} from '../components';

const LAMBDA = 96;
const AMP = 28;
const wave = (x0: number, x1: number, cy: number, amp: number, phase: number) => {
  let d = '';
  for (let x = x0; x <= x1; x += 4) d += `${x === x0 ? 'M' : 'L'}${x},${(cy + amp * Math.sin((2 * Math.PI * (x - x0)) / LAMBDA - phase)).toFixed(2)} `;
  return d;
};

// S4 Diversity: one path per antenna (RX A, RX B), each with a live waveform. A fades; the selector
// moves to B, which turns olive. The output stream never breaks.
export const S4Diversity: React.FC = () => {
  const local = useLocalTime();
  const t = sceneStart(3) + local;
  const phase = (2 * Math.PI * STREAM.signal * local) / LAMBDA;

  const fadeA = prog(t, EV.s4_fadeA, dur.inOut);
  const ampA = AMP * (1 - fadeA);
  const sw = prog(t, EV.s4_switch, dur.inOut);
  const lock = prog(t, EV.s4_lock - 0.3, 0.3);
  const colA = interpolateColors(fadeA, [0, 1], [colors.text, colors.grey]);
  const colB = interpolateColors(lock, [0, 1], [colors.text, colors.olive]);

  const {pivot, contactX, rowA, rowB} = S4;
  const aA = Math.atan2(rowA - pivot.y, contactX - pivot.x);
  const aB = Math.atan2(rowB - pivot.y, contactX - pivot.x) - 2 * Math.PI; // swing through the left side
  const ang = mix(aA, aB, sw);
  const len = Math.hypot(contactX - pivot.x, rowA - pivot.y) - 7;
  const arm = {x: pivot.x + len * Math.cos(ang), y: pivot.y + len * Math.sin(ang)};

  // Output packets: constant speed, constant spacing, from the first frame to the last.
  const span = 4 * 48; // a whole number of spacings, so the loop never bunches packets
  const outEnd = pivot.x + 16 + span;
  const packets = Array.from({length: 4}, (_, k) => pivot.x + 16 + ((k * 48 + STREAM.packets * local) % span));

  return (
    <AbsoluteFill>
      <Draw>
        <Svg>
          <rect x={S4.box.x0} y={S4.box.y0} width={S4.box.x1 - S4.box.x0} height={S4.box.y1 - S4.box.y0} rx={14} fill="none" stroke={colors.hairline} strokeWidth={stroke.secondary} />
          <path d={wave(S4.waveX0, S4.waveX1, rowA, ampA, phase)} fill="none" stroke={colA} strokeWidth={stroke.main} />
          <path d={wave(S4.waveX0, S4.waveX1, rowB, AMP, phase)} fill="none" stroke={colB} strokeWidth={stroke.main} />
          <line x1={S4.waveX1} y1={rowA} x2={contactX - 6} y2={rowA} stroke={colA} strokeWidth={stroke.secondary} />
          <line x1={S4.waveX1} y1={rowB} x2={contactX - 6} y2={rowB} stroke={colB} strokeWidth={stroke.secondary} />
          <circle cx={contactX} cy={rowA} r={6} fill={colors.black} stroke={colA} strokeWidth={stroke.main} />
          <circle cx={contactX} cy={rowB} r={6} fill={colors.black} stroke={colB} strokeWidth={stroke.main} />
          {/* the selector */}
          <line x1={pivot.x} y1={pivot.y} x2={arm.x} y2={arm.y} stroke={sw > 0.5 ? colB : colors.text} strokeWidth={stroke.main} strokeLinecap="square" />
          <circle cx={pivot.x} cy={pivot.y} r={5} fill={colors.text} />
          {/* output stream */}
          <line x1={pivot.x} y1={pivot.y} x2={S4.outX1} y2={pivot.y} stroke={colors.text} strokeWidth={stroke.secondary} />
          {packets.map((x, k) => (
            <Packet key={k} x={x} y={pivot.y} opacity={Math.max(0, Math.min(1, (x - pivot.x - 16) / 16, (outEnd - x) / 16))} />
          ))}
        </Svg>
      </Draw>
      <Label x={S4.labelX} y={rowA - 13} text={LABELS.rxA} color={colA} />
      <Label x={S4.labelX} y={rowB - 13} text={LABELS.rxB} color={lock > 0 ? colB : undefined} />
      <Label x={S4.box.x0 + 16} y={S4.box.y0 + 16} text={LABELS.aglink} />
      <Label x={S4.outX1} y={pivot.y - 48} text={LABELS.out} align="right" />
    </AbsoluteFill>
  );
};
