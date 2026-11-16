import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {useBeat, useT} from './components';
import {CX, H, W} from './layout';
import {ease, enter, mix, prog} from './motion';
import {colors} from './theme';
import logo from '../public/img/ruta-logo.json';

/**
 * End card. The closing shot (the golden field with the question) closes onto its own horizon: two black bars
 * with olive edges meet on the horizon line. The line then settles into a short olive rule at the centre, and
 * the RUTA logo rises above it. The reel ends on the logo.
 */
export const HORIZON_Y = 665; // the field's horizon on the last frame of B1-c in B8 (measured)
const CLOSE = 0.45; // s
const RULE = {y: 846, w: 140};
const LOGO_W = 520;
const LOGO_GAP = 44;

const Edge: React.FC<{y: number; w?: number}> = ({y, w = W}) => (
  <>
    <div style={{position: 'absolute', left: CX - w / 2, top: y - 3, width: w, height: 6, background: colors.black, opacity: 0.5, zIndex: 6}} />
    <div style={{position: 'absolute', left: CX - w / 2, top: y - 1, width: w, height: 2, background: colors.olive, zIndex: 6}} />
  </>
);

export const EndCard: React.FC<{prev: React.ReactNode}> = ({prev}) => {
  const {qa} = useBeat();
  const t = useT();
  const close = prog(t, 0, CLOSE, ease.inOut);
  const merged = close >= 1;
  const settle = prog(t, CLOSE, 0.5, ease.inOut);
  const top = close * HORIZON_Y;
  const bottom = close * (H - HORIZON_Y);
  const ruleY = mix(HORIZON_Y, RULE.y, settle);
  const ruleW = mix(W, RULE.w, settle);
  const logoH = (LOGO_W * logo.h) / logo.w;
  const lp = enter(t, CLOSE + 0.15, 0.45);
  const drift = 1 + 0.012 * prog(t, CLOSE + 0.15, 1.2, ease.out); // a slow settle, so the last frames are not frozen
  return (
    <AbsoluteFill style={{backgroundColor: qa.textOnly ? '#808080' : colors.black}}>
      {/* text-only QA: the closing frame's text is checked in its own beat (B8), so here only the logo counts */}
      {merged || qa.textOnly ? null : <AbsoluteFill style={{zIndex: 0}}>{prev}</AbsoluteFill>}
      {qa.textOnly ? null : (
        <>
          <div style={{position: 'absolute', left: 0, top: 0, width: W, height: top, background: colors.black, zIndex: 5}} />
          <div style={{position: 'absolute', left: 0, top: H - bottom, width: W, height: bottom, background: colors.black, zIndex: 5}} />
          {close > 0 && !merged ? (
            <>
              <Edge y={top} />
              <Edge y={H - bottom} />
            </>
          ) : null}
          {merged ? <Edge y={ruleY} w={ruleW} /> : null}
        </>
      )}
      <Img
        data-text="logo"
        src={staticFile('img/ruta-logo.png')}
        style={{
          position: 'absolute', left: CX - LOGO_W / 2, top: RULE.y - LOGO_GAP - logoH, width: LOGO_W, height: logoH,
          opacity: lp, transform: `translateY(${(1 - lp) * 16}px) scale(${drift})`, transformOrigin: '50% 100%', zIndex: 7,
        }}
      />
    </AbsoluteFill>
  );
};
