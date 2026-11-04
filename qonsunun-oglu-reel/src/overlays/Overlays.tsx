// Screen-space layers above the picture: title, god rays, captions, end card, grain, safe box.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT, SCRIM, TYPE} from '../theme';
import {rgba} from '../color';
import {LINES, SPEAKERS, TEXT, type Lang} from '../config';
import {ACTION, CAPTION, END, RAIL, SAFE, TITLE} from '../layout';
import {clamp01, ease, EASE, springAt, lerp} from '../motion';
import {timelineFor, ASSETS} from '../data';
import {captionRows} from '../timeline';

// ───────────────────────────── Title (S1) ─────────────────────────────
export const Title: React.FC<{lang: Lang}> = ({lang}) => {
  const f = useCurrentFrame();
  const B = timelineFor(lang).beats;
  const T = TEXT[lang];
  if (f < B.title - 1 || f > 112) return null;
  const k = springAt(f, B.title, 'hero');
  const scale = lerp(1.08, 1, clamp01(k));
  const out = 1 - ease(f, 96, 14, EASE.inOut);
  const sub = ease(f, B.title + 8, 9, EASE.ui) * out;
  const size = TITLE.size[lang];
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 60, right: 60, top: TITLE.y - 30, height: TITLE.h + 110, background: SCRIM, filter: 'blur(28px)', borderRadius: 80, opacity: Math.min(1, k * 1.5) * out}} />
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: TITLE.y, height: TITLE.h, display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...TYPE.title, fontSize: size, color: C.eye, opacity: Math.min(1, k * 1.6) * out, transform: `scale(${scale})`, whiteSpace: 'nowrap',
        }}
      >
        {T.title}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: TITLE.sub.y, height: TITLE.sub.h, textAlign: 'center', ...TYPE.sub, color: C.muted, opacity: sub, transform: `translateY(${(1 - sub) * 10}px)`}}>
        {T.titleSub}
      </div>
    </div>
  );
};

// ───────────────────────────── God rays ─────────────────────────────
/** Seven soft rays from above, fanning ±25°, 20% opacity; in over 6 frames, out over 18. */
export const GodRays: React.FC<{at: number; x: number; y: number; hold?: number}> = ({at, x, y, hold = 10}) => {
  const f = useCurrentFrame();
  const a = f < at ? 0 : f < at + 6 ? (f - at) / 6 : f < at + 6 + hold ? 1 : 1 - clamp01((f - at - 6 - hold) / 18);
  if (a <= 0) return null;
  const ox = x;
  const oy = -260;
  const len = y - oy + 380;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen'}}>
      <defs>
        <linearGradient id={`rayFade-${at}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF3DC" stopOpacity={0.95} />
          <stop offset="70%" stopColor="#FFF3DC" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#FFF3DC" stopOpacity={0} />
        </linearGradient>
      </defs>
      <g opacity={0.2 * a}>
        {[-25, -16.67, -8.33, 0, 8.33, 16.67, 25].map((deg, i) =>
          [2.2, 4.4, 7.2].map((w, k) => {
            const half = (Math.tan((w * Math.PI) / 360) * len) | 0;
            return (
              <path
                key={`${i}-${k}`}
                d={`M${-1.5} 0 L${-half} ${len} L${half} ${len} L1.5 0 Z`}
                fill={`url(#rayFade-${at})`}
                opacity={[0.55, 0.32, 0.18][k]}
                transform={`translate(${ox} ${oy}) rotate(${deg})`}
              />
            );
          }),
        )}
      </g>
    </svg>
  );
};

// ───────────────────────────── Captions ─────────────────────────────
type CapWin = {id: string; from: number; to: number};
export const captionWindows = (lang: Lang): CapWin[] => {
  const TL = timelineFor(lang);
  const ids = LINES.map((l) => l.id);
  const wins = ids.map((id) => {
    const w = TL.wordFrames(id);
    return {id, from: w[0].start - 4, end: TL.lineFrames(id).end};
  });
  return wins.map((w, i) => {
    const next = wins[i + 1];
    let to = w.end + 6;
    if (next && next.from < to) to = next.from;
    return {id: w.id, from: w.from, to};
  });
};

export const Captions: React.FC<{lang: Lang}> = ({lang}) => {
  const f = useCurrentFrame();
  const TL = timelineFor(lang);
  const win = captionWindows(lang).find((w) => f >= w.from && f < w.to);
  if (!win) return null;
  const def = LINES.find((l) => l.id === win.id)!;
  const rows = captionRows(win.id, lang);
  const words = TL.wordFrames(win.id);
  const tagIn = ease(f, win.from, 4, EASE.ui);
  const exitSoon = win.to - f <= 3 ? clamp01((win.to - f) / 3) : 1;
  // the shake: 2 px for 6 frames on the loudest word of a shouted line
  let shake = 0;
  if (def.shout) {
    const w = words[def.shout[lang]];
    if (w && f >= w.start && f < w.start + 6) shake = (f % 2 === 0 ? 2 : -2);
  }
  let idx = 0;
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity: exitSoon}}>
      <div style={{position: 'absolute', left: 30, right: 30, top: CAPTION.tagY - 34, height: CAPTION.lineY - CAPTION.tagY + CAPTION.lineH * rows.length + 58, background: SCRIM, filter: 'blur(22px)', borderRadius: 60}} />
      <div style={{position: 'absolute', left: CAPTION.x0, right: 1080 - CAPTION.x1, top: CAPTION.tagY, height: CAPTION.tagH, textAlign: 'center', ...TYPE.speaker, color: C.muted, lineHeight: `${CAPTION.tagH}px`, opacity: tagIn}}>
        {SPEAKERS[lang][def.voice]}
      </div>
      <div style={{position: 'absolute', left: CAPTION.x0, right: 1080 - CAPTION.x1, top: CAPTION.lineY, transform: `translateX(${shake}px)`}}>
        {rows.map((row, ri) => (
          <div key={ri} style={{height: CAPTION.lineH, textAlign: 'center', whiteSpace: 'nowrap', ...TYPE.caption, color: C.eye, lineHeight: `${CAPTION.lineH}px`}}>
            {row.map((tok, ti) => {
              const w = words[idx++];
              const st = w?.start ?? 0;
              const en = w?.end ?? 0;
              const k = ease(f, st, 4, EASE.ui);
              const speaking = f >= st && f <= en + 2;
              const op = f < st ? 0 : speaking ? k : 0.75;
              return (
                <span key={ti} style={{display: 'inline-block', opacity: op, transform: `translateY(${(1 - k) * 10}px)`, marginRight: tok.joinNext ? 0 : '0.26em'}}>
                  {tok.text}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// ───────────────────────────── End card ─────────────────────────────
export const EndCard: React.FC<{lang: Lang}> = ({lang}) => {
  const f = useCurrentFrame();
  const B = timelineFor(lang).beats;
  const T = TEXT[lang];
  if (f < B.endLine) return null;
  const a = ease(f, B.endLine, 11, EASE.ui);
  const c = ease(f, B.cta, 10, EASE.ui);
  // the arrow nudges twice toward the Reels comment button (bottom right)
  const nudge = (at: number) => (f >= at && f < at + 10 ? Math.sin(((f - at) / 10) * Math.PI) : 0);
  const n = nudge(B.cta + 16) + nudge(B.cta + 30);
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 40, right: 40, top: END.line.y0 - 30, height: END.cta.y1 - END.line.y0 + 60, background: SCRIM, filter: 'blur(26px)', borderRadius: 70, opacity: a}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: END.line.y0, height: END.line.y1 - END.line.y0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...TYPE.endLine, color: C.eye, opacity: a, transform: `translateY(${(1 - a) * 10}px)`, whiteSpace: 'nowrap'}}>
        {T.endLine}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: END.url.y0, height: END.url.y1 - END.url.y0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...TYPE.url, color: C.eye, opacity: a, transform: `translateY(${(1 - a) * 10}px)`}}>
        {T.url}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: END.cta.y0, height: END.cta.y1 - END.cta.y0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, opacity: c, transform: `translateY(${(1 - c) * 10}px)`}}>
        <span style={{fontFamily: FONT.ui, fontWeight: 600, fontSize: END.cta.size, color: C.eye, whiteSpace: 'nowrap'}}>{T.cta}</span>
        <svg width={64} height={70} viewBox="0 0 64 70" style={{transform: `translate(${n * 10}px, ${n * 12}px)`, overflow: 'visible'}}>
          <path d="M10 6 C 14 30, 26 44, 46 54" stroke={C.eye} strokeWidth={6} fill="none" strokeLinecap="round" />
          <path d="M30 58 L 48 56 L 44 38" stroke={C.eye} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

// ───────────────────────────── Grain + safe box ─────────────────────────────
export const Grain: React.FC = () => {
  const f = useCurrentFrame();
  if (!ASSETS.grain) return null;
  const i = Math.floor(f) % 24;
  // 3% grain: grey noise tiles in overlay at low opacity
  return <Img src={staticFile(`grain/g${String(i).padStart(2, '0')}.png`)} style={{position: 'absolute', inset: 0, width: 1080, height: 1920, opacity: 0.09, mixBlendMode: 'overlay', pointerEvents: 'none'}} />;
};

export const SafeBoxOverlay: React.FC = () => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
    <rect x={SAFE.x0} y={SAFE.y0} width={SAFE.x1 - SAFE.x0} height={SAFE.y1 - SAFE.y0} fill="none" stroke="#00FF88" strokeWidth={3} />
    <rect x={0} y={ACTION.y0} width={1080} height={ACTION.y1 - ACTION.y0} fill="none" stroke="#FF3D7F" strokeWidth={2} strokeDasharray="14 10" />
    <rect x={0} y={RAIL.y0} width={1080} height={RAIL.y1 - RAIL.y0} fill="none" stroke="#FFD000" strokeWidth={2} strokeDasharray="6 8" />
  </svg>
);

export {rgba};
