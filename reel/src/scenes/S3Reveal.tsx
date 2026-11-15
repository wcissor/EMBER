import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {BY, NAME} from '../config';
import {CX, S3} from '../layout';
import {dur, ease, prog} from '../motion';
import {type} from '../theme';
import {Device, Draw, EV, Svg, sceneStart, useLocalTime} from '../components';
import logo from '../../public/img/ruta-logo.json';

// S3 Reveal (after the line wipe): the AgLink device draws itself in the centre, then the name,
// then "by" with the real RUTA logo.
export const S3Reveal: React.FC = () => {
  const local = useLocalTime();
  const t0 = sceneStart(2);
  const t = t0 + local;
  const d = EV.s3_draw;
  const draw = {
    body: prog(t, d, dur.draw),
    antA: prog(t, d + 0.45, 0.5),
    antB: prog(t, d + 0.55, 0.5),
    details: prog(t, d + 0.7, 0.4),
    pole: prog(t, d + 0.8, 0.5),
    chip: prog(t, d + 0.95, 0.4),
  };
  const nameIn = prog(t, t0 + 1.0, dur.out, ease.out);
  const byIn = prog(t, EV.s3_by, dur.out, ease.out);
  const logoW = (S3.by.logoH * logo.w) / logo.h;
  const dev = S3.device;

  return (
    <AbsoluteFill>
      <Draw>
        <Svg>
          <Device cx={dev.cx} top={dev.top} w={dev.w} h={dev.h} antennaTop={dev.antennaTop} poleTo={dev.poleTo} draw={draw} />
        </Svg>
      </Draw>
      <div
        data-text="display"
        style={{position: 'absolute', left: 0, width: '100%', top: S3.name.y, textAlign: 'center', opacity: nameIn, transform: `translateY(${(1 - nameIn) * 16}px)`, ...type.display}}
      >
        {NAME}
      </div>
      <div
        data-text="by"
        style={{position: 'absolute', left: CX, top: S3.by.y, transform: `translate(-50%, ${(1 - byIn) * 12}px)`, opacity: byIn, display: 'flex', alignItems: 'center', gap: 16}}
      >
        <span style={{...type.caption, fontSize: 44, lineHeight: 1}}>{BY}</span>
        <Img src={staticFile('img/ruta-logo.png')} style={{height: S3.by.logoH, width: logoW}} />
      </div>
    </AbsoluteFill>
  );
};
