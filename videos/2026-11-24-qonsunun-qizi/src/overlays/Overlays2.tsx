// Part 2 screen layers: the comment bubbles (the comment's exact text only: no names, no photos), the title stamp and
// the end card. Same type and glass as part 1.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT, GLASS, SCRIM, TYPE} from '../theme';
import {TEXT} from '../config';
import {END, TITLE} from '../layout';
import {clamp01, ease, EASE, lerp, springAt} from '../motion';

/** A comment, drawn in the film's glass: a speech-bubble tail, a small comment glyph, the text. */
export const CommentBubble: React.FC<{text: string; at: number; until: number; y?: number}> = ({text, at, until, y = 300}) => {
  const f = useCurrentFrame();
  if (f < at - 1 || f > until + 8) return null;
  const k = springAt(f, at, 'hero');
  const out = ease(f, until, 8, EASE.inOut);
  const s = lerp(0.6, 1, k) * (1 - 0.12 * out);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', pointerEvents: 'none', opacity: clamp01(k * 2) * (1 - out)}}>
      <div style={{position: 'relative', transform: `scale(${s}) translateY(${-out * 30}px)`, transformOrigin: '30% 100%'}}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 22, padding: '26px 40px 26px 30px', borderRadius: GLASS.radius, background: 'rgba(14,22,48,0.86)',
            border: `2px solid ${GLASS.stroke}`, boxShadow: GLASS.shadow, maxWidth: 900,
          }}
        >
          <svg width={60} height={60} viewBox="0 0 52 52" style={{flex: 'none'}}>
            <path d="M8 10 h36 a6 6 0 0 1 6 6 v18 a6 6 0 0 1 -6 6 h-22 l-10 9 v-9 h-4 a6 6 0 0 1 -6 -6 v-18 a6 6 0 0 1 6 -6 z" fill="none" stroke={C.muted} strokeWidth={3.5} strokeLinejoin="round" />
          </svg>
          <div style={{fontFamily: FONT.ui, fontWeight: 600, fontSize: 56, color: C.eye, whiteSpace: 'nowrap', letterSpacing: '-0.01em'}}>{text}</div>
        </div>
        {/* the tail */}
        <svg width={60} height={40} style={{position: 'absolute', left: 70, bottom: -34}}>
          <path d="M0 0 L46 0 L8 36 Z" fill="rgba(14,22,48,0.86)" />
        </svg>
      </div>
    </div>
  );
};

/** The real comment (a screenshot from the post, as the team asked): a white card that pops in and floats. */
export const CommentShot: React.FC<{src: string; w: number; h: number; at: number; until: number; y?: number}> = ({src, w, h, at, until, y = 300}) => {
  const f = useCurrentFrame();
  if (f < at - 1 || f > until + 8) return null;
  const k = springAt(f, at, 'hero');
  const out = ease(f, until, 8, EASE.inOut);
  const scale = Math.min(1.3, 900 / w) * lerp(0.6, 1, k) * (1 - 0.12 * out);
  const float = Math.sin((f - at) / 14) * 3;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', pointerEvents: 'none', opacity: clamp01(k * 2) * (1 - out)}}>
      <div style={{transform: `translateY(${float - out * 30}px) scale(${scale}) rotate(${lerp(-5, -1.5, k)}deg)`, transformOrigin: '20% 100%', background: '#FFFFFF', borderRadius: 34, padding: '14px 10px 10px 18px', boxShadow: '0 26px 60px rgba(0,0,0,0.55)'}}>
        <Img src={staticFile(src)} style={{display: 'block', width: w, height: h}} />
      </div>
    </div>
  );
};

/** The title stamp: QONŞUNUN QIZI, "(o da var)", "2-ci hissə". In 6 frames from 135% to 100% with a jolt. */
export const Title2: React.FC<{at: number; until: number}> = ({at, until}) => {
  const f = useCurrentFrame();
  if (f < at - 1 || f > until + 12) return null;
  const k = springAt(f, at, 'hero');
  const stamp = clamp01((f - at) / 6);
  const scale = lerp(1.35, 1, 1 - Math.pow(1 - stamp, 3)) * (f >= at + 6 && f < at + 9 ? 0.985 : 1);
  const rot = lerp(-4, -1.5, stamp);
  const out = 1 - ease(f, until, 12, EASE.inOut);
  const sub = ease(f, at + 7, 9, EASE.ui) * out;
  const part = springAt(f, at + 12, 'hero') * out;
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 60, right: 60, top: TITLE.y - 30, height: TITLE.h + 190, background: SCRIM, filter: 'blur(28px)', borderRadius: 80, opacity: Math.min(1, k * 1.5) * out}} />
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: TITLE.y, height: TITLE.h, display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...TYPE.title, fontSize: 132, color: C.eye, opacity: Math.min(1, stamp * 3) * out, transform: `scale(${scale}) rotate(${rot}deg)`, whiteSpace: 'nowrap',
        }}
      >
        {TEXT.title}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: TITLE.sub.y + 6, height: TITLE.sub.h, textAlign: 'center', ...TYPE.sub, color: C.muted, opacity: sub, transform: `translateY(${(1 - sub) * 10}px)`}}>
        {TEXT.titleSub}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: TITLE.sub.y + 62, display: 'flex', justifyContent: 'center', opacity: clamp01(part * 1.5)}}>
        <div style={{fontFamily: FONT.ui, fontWeight: 700, fontSize: 34, color: '#0A0E19', background: C.eye, borderRadius: 999, padding: '8px 26px', transform: `scale(${0.7 + 0.3 * part}) rotate(-2deg)`, letterSpacing: '0.02em'}}>
          {TEXT.part}
        </div>
      </div>
    </div>
  );
};

/** End card: "Qonşunun qızı ol." · voluntrack.site · "Qonşunun qızını teq et ↓" (fades out as the film loops). */
export const EndCard2: React.FC<{line: number; cta: number; fadeFrom: number; fadeTo: number}> = ({line, cta, fadeFrom, fadeTo}) => {
  const f = useCurrentFrame();
  if (f < line || f > fadeTo) return null;
  const fade = 1 - clamp01((f - fadeFrom) / Math.max(1, fadeTo - fadeFrom));
  const a = ease(f, line, 11, EASE.ui) * fade;
  const c = ease(f, cta, 10, EASE.ui) * fade;
  const nudge = (at: number) => (f >= at && f < at + 10 ? Math.sin(((f - at) / 10) * Math.PI) : 0);
  const n = nudge(cta + 14) + nudge(cta + 28);
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 40, right: 40, top: END.line.y0 - 30, height: END.cta.y1 - END.line.y0 + 60, background: SCRIM, filter: 'blur(26px)', borderRadius: 70, opacity: a}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: END.line.y0, height: END.line.y1 - END.line.y0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...TYPE.endLine, color: C.eye, opacity: a, transform: `translateY(${(1 - a) * 10}px)`, whiteSpace: 'nowrap'}}>
        {TEXT.endLine}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: END.url.y0, height: END.url.y1 - END.url.y0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...TYPE.url, color: C.eye, opacity: a, transform: `translateY(${(1 - a) * 10}px)`}}>
        {TEXT.url}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: END.cta.y0, height: END.cta.y1 - END.cta.y0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, opacity: c, transform: `translateY(${(1 - c) * 10}px)`}}>
        <span style={{fontFamily: FONT.ui, fontWeight: 600, fontSize: END.cta.size, color: C.eye, whiteSpace: 'nowrap'}}>{TEXT.cta}</span>
        <svg width={44} height={70} viewBox="0 0 44 70" style={{transform: `translateY(${n * 12}px)`, overflow: 'visible'}}>
          <path d="M22 6 L22 58" stroke={C.eye} strokeWidth={6} fill="none" strokeLinecap="round" />
          <path d="M6 42 L22 60 L38 42" stroke={C.eye} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};
