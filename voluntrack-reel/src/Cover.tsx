// out/cover.png (section 7): the frozen wall, the hook card on top with DEADLINE PASSED across it, the ink pill
// "Is ANYTHING actually open?!" and the small star glowing at the end of the pill. Important content stays inside
// the middle 1080×1440 (y 240–1680) so the 3:4 profile grid does not crop it.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {ensureFonts} from './fonts';
import {ASSETS} from './data';
import {LINES, POSTS, STAMPS} from './config';
import {C, TYPE} from './theme';
import {PostCard} from './components/PostCard';
import {Stamp} from './components/Stamp';
import {Grain, PaperBackground} from './components/Paper';
import {Star} from './components/Star';

ensureFonts();

const L07 = LINES.find((l) => l.id === '07')!;

const Pill: React.FC = () => {
  const emph = new Set(L07.emphasis ?? []);
  const base: React.CSSProperties = {...TYPE.caption, fontSize: 76, color: C.white, whiteSpace: 'pre'};
  const cond: React.CSSProperties = {...TYPE.emphasis, fontSize: 104, color: C.white, textTransform: 'uppercase', whiteSpace: 'pre'};
  return (
    <div style={{display: 'inline-flex', alignItems: 'center', gap: 26, padding: '28px 44px 30px 36px', borderRadius: 26, background: C.ink, transform: 'rotate(-1.5deg)', boxShadow: '0 18px 40px rgba(0,0,0,0.28)'}}>
      <svg width={118} height={56} viewBox="0 0 118 56">
        {new Array(24).fill(0).map((_, i) => {
          const h = 6 + 44 * Math.abs(Math.sin(i * 1.7)) * Math.sin((Math.PI * (i + 0.5)) / 24);
          return <rect key={i} x={i * 5} y={(56 - h) / 2} width={3} height={h} rx={1.5} fill={C.white} />;
        })}
      </svg>
      <div style={{display: 'flex', flexDirection: 'column', gap: 2}}>
        {L07.caption.map((row, ri) => (
          <div key={ri} style={{display: 'flex', alignItems: 'baseline', gap: 20, lineHeight: 0.98}}>
            {row.split(' ').map((w, wi) =>
              emph.has(w) ? (
                <span key={wi} style={{position: 'relative', display: 'inline-block'}}>
                  {[{o: 0.4, y: 10}, {o: 0.22, y: 20}, {o: 0.1, y: 30}].map((g, gi) => (
                    <span key={gi} style={{...cond, position: 'absolute', left: 0, top: 0, color: C.stamp, opacity: g.o, transform: `translateY(${g.y}px) scale(${1 + g.y / 300})`, transformOrigin: 'center bottom'}}>
                      {w.toUpperCase()}
                    </span>
                  ))}
                  <span style={{...cond, position: 'relative'}}>{w.toUpperCase()}</span>
                </span>
              ) : (
                <span key={wi} style={base}>
                  {w}
                </span>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Cover: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: C.paper}}>
    {ASSETS.wall ? <Img src={staticFile('frames/wall.png')} style={{width: 1080, height: 1920}} /> : <PaperBackground />}
    <AbsoluteFill style={{background: 'radial-gradient(900px 1200px at 50% 45%, rgba(0,0,0,0), rgba(0,0,0,0.18))'}} />
    <div style={{position: 'absolute', left: 540 - 380, top: 300, width: 760, height: 950, transform: 'rotate(-3deg) scale(1.02)'}}>
      <PostCard def={POSTS.hook}>
        <Stamp text={STAMPS.deadline} frame={0} hit={0} x={390} y={560} rot={-8} fontSize={118} seed="cover" pre />
      </PostCard>
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, top: 1290, display: 'flex', justifyContent: 'center'}}>
      <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
        <Pill />
        <div style={{position: 'relative', width: 0, height: 0}}>
          <Star x={-6} y={0} size={70} frame={0} flare={0.7} onPaper />
        </div>
      </div>
    </div>
    <Grain frame={0} />
  </AbsoluteFill>
);
