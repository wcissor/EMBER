import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {LABELS} from '../config';
import {S1} from '../layout';
import {dur, ease, prog, push} from '../motion';
import {colors, stroke} from '../theme';
import {Camera, Draw, EV, Label, Packet, Svg, sceneEnd, sceneStart, useLocalTime} from '../components';

// S1 Hook: crop rows draw in; a sensor pulses and sends a packet up the frame; halfway it flickers
// and is gone, leaving a gap in its path. A real dusk field photo sits behind for the first 1.5 s.
export const S1Hook: React.FC = () => {
  const local = useLocalTime();
  const t0 = sceneStart(0);
  const t = t0 + local;
  const scale = push(local, sceneEnd(0) - t0);

  const photo = 0.25 * (1 - prog(t, EV.s1_photo_out - 0.5, 0.5));
  const rows = S1.rows.map((_, k) => prog(t, k * 0.02, dur.draw));
  const guide = prog(t, 0.1, dur.draw);
  const ring = (start: number) => {
    const p = prog(t, start, 0.9, ease.out);
    return {r: 7 + 37 * p, o: p > 0 && p < 1 ? 0.6 * (1 - p) : 0};
  };
  const rings = [ring(EV.s1_pulse1), ring(EV.s1_pulse2)];

  // The packet moves at a constant speed. It flickers from s1_flicker and is gone at s1_vanish.
  const speed = 380;
  const sensorTop = S1.sensor.y - 8;
  const flown = Math.max(0, Math.min(t, EV.s1_vanish) - EV.s1_launch);
  const py = S1.packetStart - speed * flown;
  const alive = t >= EV.s1_launch && t < EV.s1_vanish;
  const flickerOn = t < EV.s1_flicker || Math.floor(((t - EV.s1_flicker) * 30) / 2) % 2 === 1;
  const sensorIn = prog(t, 0, dur.out, ease.out);

  return (
    <AbsoluteFill>
      <Draw>
        <AbsoluteFill style={{opacity: photo}}>
          <Img src={staticFile('img/field-duotone.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </AbsoluteFill>
      </Draw>
      <Camera scale={scale}>
        <Draw>
          <Svg>
            {/* crop rows, parallel hairlines drawn from the ground up */}
            {S1.rows.map((x, k) => (
              <line key={k} x1={x} y1={S1.rowBottom} x2={x} y2={S1.rowBottom - (S1.rowBottom - S1.rowTop) * rows[k]} stroke={colors.hairline} strokeWidth={stroke.secondary} opacity={rows[k] > 0 ? 1 : 0} />
            ))}
            {/* the route the packet should take, and where it should arrive */}
            <line x1={S1.sensor.x} y1={sensorTop} x2={S1.sensor.x} y2={sensorTop - (sensorTop - S1.pathTop) * guide} stroke={colors.grey} strokeWidth={stroke.secondary} strokeDasharray="2 10" opacity={guide > 0 ? 0.7 : 0} />
            <line x1={S1.sensor.x - 12} y1={S1.pathTop} x2={S1.sensor.x + 12} y2={S1.pathTop} stroke={colors.grey} strokeWidth={stroke.secondary} opacity={guide >= 1 ? 1 : 0} />
            {/* the path it actually made: solid, then nothing */}
            {t >= EV.s1_launch ? <line x1={S1.sensor.x} y1={sensorTop} x2={S1.sensor.x} y2={py + 4} stroke={colors.olive} strokeWidth={stroke.secondary} /> : null}
            {alive && flickerOn ? <Packet x={S1.sensor.x} y={py} /> : null}
            {/* sensor and its pulse */}
            {rings.map((r, i) => (r.o > 0 ? <circle key={i} cx={S1.sensor.x} cy={S1.sensor.y} r={r.r} fill="none" stroke={colors.text} strokeWidth={stroke.secondary} opacity={r.o} /> : null))}
            <circle cx={S1.sensor.x} cy={S1.sensor.y} r={7} fill={colors.text} opacity={sensorIn} />
          </Svg>
        </Draw>
        <Label x={S1.label.x} y={S1.label.y} text={LABELS.sensor} opacity={prog(t, 0.1, dur.out, ease.out)} />
      </Camera>
    </AbsoluteFill>
  );
};
