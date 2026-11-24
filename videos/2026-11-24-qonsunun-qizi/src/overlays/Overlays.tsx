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
  const ids = LINES.filter((l) => !l.silentCaption).map((l) => l.id);
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

/** minFrom: show only lines whose caption starts at or after this frame (C's flash-forward opens clean). */
export const Captions: React.FC<{lang: Lang; minFrom?: number}> = ({lang, minFrom}) => {
  const f = useCurrentFrame();
  const TL = timelineFor(lang);
  const win = captionWindows(lang).find((w) => f >= w.from && f < w.to && (minFrom === undefined || w.from >= minFrom));
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
        {def.speaker ?? SPEAKERS[lang][def.voice]}
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
