import React from 'react';
import type {PostDef} from '../config';
import {C, FONT, PAPER_CARD, TINT_BG, TYPE} from '../theme';
import {POST} from '../layout';
import {Illustration} from './Illustration';
import {PERF} from '../perf';

export const ArrowUpRight: React.FC<{size: number; color: string; stroke?: number}> = ({size, color, stroke = 3}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{display: 'inline-block', verticalAlign: 'middle'}}>
    <path d="M7 17 L17 7 M9 7 H17 V15" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const OutlineHeart: React.FC<{s: number}> = ({s}) => (
  <svg width={s} height={s} viewBox="0 0 24 24">
    <path d="M12 20 C 12 20, 3 14, 3 8.5 C 3 5.5, 5.4 3.5, 8 3.5 C 9.9 3.5, 11.2 4.6, 12 6 C 12.8 4.6, 14.1 3.5, 16 3.5 C 18.6 3.5, 21 5.5, 21 8.5 C 21 14, 12 20, 12 20 Z" fill="none" stroke={C.grey} strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const Bar: React.FC<{x: number; y: number; w: number; h: number}> = (b) => (
  <div style={{position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: b.h / 2, background: C.grey}} />
);

/** A fake, anonymous post (section 3, before world). Children are drawn in card-local space (760×950). */
export const PostCard: React.FC<{def: PostDef; children?: React.ReactNode; posterSize?: number}> = ({def, children, posterSize}) => {
  const size = posterSize ?? (def.poster.length > 18 ? 92 : def.poster.length > 12 ? 104 : 120);
  const hasButton = Boolean(def.button);
  const artSize = hasButton ? 200 : 250;
  const artCx = hasButton ? 580 : POST.art.cx;
  const artCy = hasButton ? 590 : POST.art.cy + (def.poster.length > 18 ? 14 : 0);
  return (
    <div style={{position: 'absolute', width: PAPER_CARD.w, height: PAPER_CARD.h}}>
    <div
      style={{
        position: 'absolute',
        width: PAPER_CARD.w,
        height: PAPER_CARD.h,
        borderRadius: PAPER_CARD.radius,
        background: C.card,
        boxShadow: PERF.noShadow ? undefined : PAPER_CARD.shadow,
        overflow: 'hidden',
      }}
    >
      {/* header: grey avatar + two grey bars (no names, no handles) */}
      <div style={{position: 'absolute', left: POST.header.avatar.cx - POST.header.avatar.r, top: POST.header.avatar.cy - POST.header.avatar.r, width: POST.header.avatar.r * 2, height: POST.header.avatar.r * 2, borderRadius: '50%', background: C.grey}} />
      {POST.header.bars.map((b, i) => (
        <Bar key={i} {...b} />
      ))}
      {/* image */}
      <div style={{position: 'absolute', left: POST.image.x, top: POST.image.y, width: POST.image.w, height: POST.image.h, borderRadius: POST.image.r, background: TINT_BG[def.tint], overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: artCx - artSize / 2 - POST.image.x, top: artCy - artSize / 2 - POST.image.y}}>
          <Illustration kind={def.art} size={artSize} />
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: POST.poster.x,
          top: POST.poster.y,
          width: POST.poster.w,
          ...TYPE.poster,
          fontSize: size,
          color: C.ink,
          textTransform: 'uppercase',
        }}
      >
        {def.poster}
      </div>
      {def.sub && (
        <div
          style={{
            position: 'absolute',
            left: POST.sub.x,
            top: POST.sub.y,
            padding: '8px 18px',
            borderRadius: 12,
            background: C.card,
            fontFamily: FONT.ui,
            fontWeight: 700,
            fontSize: POST.sub.size,
            color: C.ink,
            boxShadow: '0 2px 0 rgba(0,0,0,0.06)',
          }}
        >
          {def.sub}
        </div>
      )}
      {def.button && (
        <div
          style={{
            position: 'absolute',
            left: POST.button.x,
            top: POST.button.y + 18,
            width: POST.button.w + 40,
            height: POST.button.h + 8,
            borderRadius: 50,
            background: C.ink,
            color: C.card,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            ...TYPE.poster,
            fontSize: 64,
            letterSpacing: '0.02em',
          }}
        >
          {def.button}
          <ArrowUpRight size={52} color={C.card} stroke={3.2} />
        </div>
      )}
      {/* footer: outline heart + grey bars, no counts */}
      <div style={{position: 'absolute', left: POST.footer.heart.x, top: POST.footer.heart.y}}>
        <OutlineHeart s={POST.footer.heart.s} />
      </div>
      {POST.footer.bars.map((b, i) => (
        <Bar key={i} {...b} />
      ))}
    </div>
      {children}
    </div>
  );
};
