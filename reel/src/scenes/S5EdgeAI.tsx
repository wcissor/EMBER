import React from 'react';
import {AbsoluteFill, interpolateColors} from 'remotion';
import {LABELS} from '../config';
import {CONTENT, S5} from '../layout';
import {STREAM, dur, ease, prog, push} from '../motion';
import {colors, stroke} from '../theme';
import {Camera, Device, Draw, EV, Label, Packet, Svg, sceneEnd, sceneStart, useLocalTime} from '../components';

// A gentle signal level (screen y) along world position tau. No values are shown.
const level = (tau: number) => S5.graph.level + 10 * Math.sin(tau / 70) + 6 * Math.sin(tau / 23 + 1.3);

// S5 Edge AI: a time axis with the signal now (solid) and the forecast ahead of it (dotted olive).
// A dip appears in the forecast first ("FORECAST · LOSS"); the chip in the device lights olive
// ("ON-DEVICE"); the device adapts; the signal passes the dip and the packets never stop.
export const S5EdgeAI: React.FC = () => {
  const local = useLocalTime();
  const t0 = sceneStart(4);
  const t = t0 + local;
  const scale = push(local, sceneEnd(4) - t0);

  const scroll = STREAM.signal * local; // time moves left at a constant speed
  const tauDip = S5.now + STREAM.signal * (EV.s5_pass - t0); // the dip reaches "now" just after "adapt in time"
  const dipIn = prog(t, EV.s5_dip, dur.inOut);
  const dip = (tau: number) => S5.graph.dip * Math.exp(-(((tau - tauDip) / 44) ** 2));

  let hist = '';
  for (let x = CONTENT.x0; x <= S5.now; x += 4) hist += `${x === CONTENT.x0 ? 'M' : 'L'}${x},${(level(x + scroll) + dip(x + scroll)).toFixed(2)} `;
  let fc = '';
  for (let x = S5.now; x <= CONTENT.x1; x += 4) fc += `${x === S5.now ? 'M' : 'L'}${x},${(level(x + scroll) + dipIn * dip(x + scroll)).toFixed(2)} `;
  const dipX = tauDip - scroll;
  const ticks = Array.from({length: 11}, (_, k) => CONTENT.x0 + ((k * 96 - scroll) % 1056 + 1056) % 1056).filter((x) => x <= CONTENT.x1);

  const lit = prog(t, EV.s5_chip, dur.out, ease.out);
  const adapt = prog(t, EV.s5_adapt, 0.3);
  const outCol = interpolateColors(adapt, [0, 1], [colors.text, colors.olive]);
  const dev = S5.device;
  const outX0 = dev.cx + dev.w / 2;
  const packetSpan = 14 * 48; // a whole number of spacings, so the loop never bunches packets
  const packetEnd = outX0 + 16 + packetSpan;
  const packets = Array.from({length: 14}, (_, k) => outX0 + 16 + ((k * 48 + STREAM.packets * local) % packetSpan));
  const g = S5.graph;

  return (
    <AbsoluteFill>
      <Camera scale={scale}>
        <Draw>
          <Svg>
            {/* forecast area */}
            <rect x={S5.now} y={g.top} width={CONTENT.x1 - S5.now} height={g.axis - g.top} fill={colors.oliveDim} opacity={0.14} />
            {/* time axis */}
            <line x1={CONTENT.x0} y1={g.axis} x2={CONTENT.x1} y2={g.axis} stroke={colors.hairline} strokeWidth={stroke.secondary} />
            {ticks.map((x, k) => (
              <line key={k} x1={x} y1={g.axis} x2={x} y2={g.axis + 8} stroke={colors.hairline} strokeWidth={stroke.secondary} />
            ))}
            {/* now */}
            <line x1={S5.now} y1={g.top} x2={S5.now} y2={g.axis} stroke={colors.grey} strokeWidth={stroke.secondary} />
            {/* signal now, and the forecast ahead of it */}
            <path d={hist} fill="none" stroke={colors.text} strokeWidth={stroke.main} />
            <path d={fc} fill="none" stroke={colors.olive} strokeWidth={stroke.main} strokeDasharray="2 8" strokeLinecap="square" />
            {/* the device and its output */}
            <Device cx={dev.cx} top={dev.top} w={dev.w} h={dev.h} antennaTop={dev.antennaTop} draw={{body: 1, antA: 1, antB: 1, details: 1, pole: 0, chip: 1}} lit={lit} />
            <line x1={outX0} y1={S5.outY} x2={CONTENT.x1} y2={S5.outY} stroke={outCol} strokeWidth={stroke.main} />
            {packets.map((x, k) => (
              <Packet key={k} x={x} y={S5.outY} opacity={Math.max(0, Math.min(1, (x - outX0 - 16) / 16, (packetEnd - x) / 16))} />
            ))}
          </Svg>
        </Draw>
        <Label x={S5.now + 8} y={g.top - 40} text={LABELS.now} />
        <Label x={dipX} y={g.axis + 24} text={LABELS.forecastLoss} align="center" opacity={prog(t, EV.s5_label, dur.out, ease.out)} />
        <Label x={outX0 + 16} y={dev.top + 8} text={LABELS.onDevice} opacity={lit} />
      </Camera>
    </AbsoluteFill>
  );
};
