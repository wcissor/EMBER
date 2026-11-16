import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {Lang, TEXT} from './config';
import {RutaMark} from './components';
import {SAFE} from './layout';
import {colors, type} from './theme';

/**
 * Cover for the grid: the hook claim in big type over the vertical farm with its lights going out.
 * Instagram's grid shows the middle 1080x1440 (y 240-1680) of a 9:16 cover, so all text sits inside it.
 * "*word" turns olive, as in the captions.
 */
const COPY: Record<Lang, {paras: string[]; size: number}> = {
  en: {paras: ['Investors poured *billions into indoor farms.', 'Many of the biggest went *bust.'], size: 116},
  az: {paras: ['İnvestorlar qapalı fermalara *milyardlarla *dollar qoydu.', 'Ən böyüklərinin bir çoxu *iflas *etdi.'], size: 100},
};

export type CoverProps = {lang: Lang};

export const Cover: React.FC<CoverProps> = ({lang}) => {
  const {paras, size} = COPY[lang];
  return (
    <AbsoluteFill style={{backgroundColor: colors.black, overflow: 'hidden'}}>
      <Img src={staticFile('img/cover-h1a.jpg')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} />
      {/* lights out: the farm dimmed, darker still behind the words */}
      <AbsoluteFill style={{backgroundColor: colors.black, opacity: 0.62}} />
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(11,12,10,0.55) 0%, rgba(11,12,10,0.35) 30%, rgba(11,12,10,0.35) 62%, rgba(11,12,10,0.7) 100%)`}} />
      <div style={{position: 'absolute', left: SAFE.x0, width: SAFE.x1 - SAFE.x0, top: 420}}>
        {paras.map((p, i) => (
          <div key={i} data-text="big" style={{...type.big, fontSize: size, lineHeight: 0.98, letterSpacing: '-0.03em', color: colors.white, marginBottom: i === 0 ? size * 0.42 : 0}}>
            {p.split(' ').map((w, j) => (
              <span key={j} style={{color: w.startsWith('*') ? colors.olive : colors.white}}>
                {w.replace('*', '')}
                {j < p.split(' ').length - 1 ? ' ' : ''}
              </span>
            ))}
          </div>
        ))}
        <div data-text="source" style={{...type.source, color: colors.white, opacity: 0.6, marginTop: 56}}>{TEXT[lang].srcH1}</div>
      </div>
      <RutaMark />
    </AbsoluteFill>
  );
};
