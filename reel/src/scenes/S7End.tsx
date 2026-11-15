import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {END_CARD} from '../config';
import {CX, S7} from '../layout';
import {dur, ease, prog} from '../motion';
import {colors, type} from '../theme';
import {Label, sceneStart, useLocalTime} from '../components';
import logo from '../../public/img/ruta-logo.json';

// S7 End (after the line wipe): the RUTA logo, "AgLink — smart field modem" and, when there is one,
// the website or handle in mono. Then a hold where nothing moves.
export const S7End: React.FC = () => {
  const local = useLocalTime();
  const t0 = sceneStart(6);
  const t = t0 + local;
  const a = prog(t, t0 + 0.6, dur.out, ease.out);
  const b = prog(t, t0 + 0.7, dur.out, ease.out);
  const c = prog(t, t0 + 0.8, dur.out, ease.out);
  const logoH = (S7.logo.w * logo.h) / logo.w;
  const rise = (p: number) => `translateY(${(1 - p) * 16}px)`;

  return (
    <AbsoluteFill>
      <Img
        src={staticFile('img/ruta-logo.png')}
        style={{position: 'absolute', left: CX - S7.logo.w / 2, top: S7.logo.y, width: S7.logo.w, height: logoH, opacity: a, transform: rise(a)}}
      />
      <div data-text="display" style={{position: 'absolute', left: 0, width: '100%', top: S7.name.y, textAlign: 'center', opacity: b, transform: rise(b), ...type.display}}>
        {END_CARD.name}
      </div>
      <div data-text="caption" style={{position: 'absolute', left: 0, width: '100%', top: S7.line.y, textAlign: 'center', opacity: c, transform: rise(c), ...type.caption, color: colors.grey}}>
        {END_CARD.line}
      </div>
      {END_CARD.handle ? <Label x={CX} y={S7.handle.y} text={END_CARD.handle} align="center" opacity={c} /> : null}
    </AbsoluteFill>
  );
};
