// S5 · The UI moment (VolunTrack itself, ~3 s): the son's phone light becomes the screen. Deep navy with glass panels,
// the age field ("Yaşın"), three generic role cards, the thumb taps apply, and the card flies back to become a window.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, FONT, GLASS, TYPE} from '../theme';
import {mix, rgba} from '../color';
import {FPS, ROLES, TEXT, type Lang} from '../config';
import {UI} from '../layout';
import {clamp01, lerp, springAt, ease, EASE} from '../motion';
import {timelineFor} from '../data';
import {VT} from '../vt';
import {project} from '../camera';
import {worldCam} from './WorldScene';
import {placeRect} from '../layout';

/** Where the flying card lands: the first deed window, on screen at the landing frame. */
export const cardTarget = (lang: Lang) => {
  const B = timelineFor(lang).beats;
  const cam = worldCam(lang, B.cardLand - 2);
  const r = placeRect('deed1');
  const a = project(cam, r.x, r.y);
  const b = project(cam, r.x + r.w, r.y + r.h);
  return {x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y};
};

const Chip: React.FC<{label: string; filled?: boolean}> = ({label, filled}) => (
  <div
    style={{
      ...TYPE.chip,
      height: 48,
      padding: '0 20px',
      borderRadius: 24,
      display: 'flex',
      alignItems: 'center',
      color: filled ? '#FFFFFF' : C.eye,
      background: filled ? VT.blue : 'transparent',
      boxShadow: filled ? 'none' : `inset 0 0 0 2px ${rgba(C.eye, 0.32)}`,
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </div>
);

const Glass: React.FC<{style?: React.CSSProperties; children?: React.ReactNode}> = ({style, children}) => (
  <div
    style={{
      position: 'absolute',
      borderRadius: GLASS.radius,
      background: GLASS.fill,
      backdropFilter: GLASS.backdrop,
      WebkitBackdropFilter: GLASS.backdrop,
      boxShadow: `inset 0 0 0 1px ${GLASS.stroke}, ${GLASS.shadow}`,
      ...style,
    }}
  >
    {children}
  </div>
);

/** The kid's thumb, seen from behind as it touches the screen: the nail, the knuckle, the base widening into the
 *  palm and out of frame. Lit by the screen (VolunTrack blue rim). The pad's touch point is at 0,0. */
const THUMB = [
  'M -24 18 C -24 -6, 24 -6, 24 18',
  'C 25 40, 28 60, 27 78 C 26 92, 29 110, 31 140',
  'C 36 190, 60 240, 95 290 C 130 340, 190 380, 260 410',
  'L 260 760 L -170 760',
  'C -160 600, -126 430, -98 332 C -72 252, -37 200, -29 150',
  'C -27 120, -26 96, -27 80 C -28 60, -25 38, -24 18 Z',
].join(' ');
const Thumb: React.FC<{press: number}> = ({press}) => (
  <svg width={10} height={10} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
    <defs>
      <linearGradient id="thumbShade" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stopColor="#1B2442" />
        <stop offset="30%" stopColor="#0C1122" />
        <stop offset="100%" stopColor={C.shadow} />
      </linearGradient>
      <linearGradient id="nailShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={rgba(VT.core, 0.34)} />
        <stop offset="100%" stopColor={rgba(VT.core, 0.06)} />
      </linearGradient>
    </defs>
    <g transform={`rotate(-28) scale(${3.1 * (1 - 0.035 * press)}) translate(0 ${3 * press})`}>
      <path d={THUMB} fill={VT.rim} transform="translate(-1.6 -1.2)" opacity={0.9} />
      <path d={THUMB} fill="url(#thumbShade)" />
      {/* the nail and its cuticle */}
      <path d="M -14 4 C -14 -2, 16 -2, 16 4 L 15 30 C 15 38, -13 38, -13 30 Z" fill="url(#nailShade)" />
      <path d="M -12 33 C -4 37, 6 37, 14 33" stroke={rgba(VT.core, 0.14)} strokeWidth={1.2} fill="none" />
      {/* the knuckle crease */}
      <path d="M -20 82 C -8 87, 10 87, 22 81" stroke={rgba(C.eye, 0.07)} strokeWidth={1.4} fill="none" />
      <path d="M -18 90 C -6 94, 8 94, 20 89" stroke={rgba(C.eye, 0.05)} strokeWidth={1.1} fill="none" />
    </g>
  </svg>
);

/** A glass tap: a ring that spreads from the touch point. */
const TapRipple: React.FC<{f: number; at: number; x: number; y: number}> = ({f, at, x, y}) => {
  const u = (f - at) / 14;
  if (u < 0 || u > 1) return null;
  return (
    <div style={{position: 'absolute', left: x - 90, top: y - 90, width: 180, height: 180, pointerEvents: 'none'}}>
      <svg width={180} height={180}>
        <circle cx={90} cy={90} r={12 + 70 * (1 - Math.pow(1 - u, 3))} fill="none" stroke={VT.core} strokeWidth={4 * (1 - u)} opacity={0.75 * (1 - u)} />
        <circle cx={90} cy={90} r={10 + 18 * u} fill={VT.core} opacity={0.22 * (1 - u)} />
      </svg>
    </div>
  );
};

export const UIMoment: React.FC<{lang: Lang}> = ({lang}) => {
  const f = useCurrentFrame();
  const TL = timelineFor(lang);
  const B = TL.beats;
  const T = TEXT[lang];
  const t = f / FPS;

  // the UI forms out of the blue light (ui ease, 9–12 frames)
  const form = ease(f, B.uiIn, 12, EASE.ui);
  const blueVeil = 1 - ease(f, B.uiIn, 14, EASE.inOut);
  // typing
  const digits = (f >= B.type6 ? '16' : f >= B.type1 ? '1' : '');
  const pop = (at: number) => (f >= at ? 1 + 0.16 * (1 - ease(f, at, 8, EASE.ui)) : 1);
  const caretOn = Math.floor((f - B.uiIn) / 9) % 2 === 0;
  // cards snap in (hero, 3-frame stagger)
  const cardIn = (i: number) => springAt(f, B.cards + i * 3, 'hero');
  // tap + flight
  const tapPress = f >= B.tap - 2 && f < B.tap + 4 ? Math.sin(((f - (B.tap - 2)) / 6) * Math.PI) : 0;
  const lift = ease(f, B.tap + 1, 5, EASE.ui);
  const flyStart = B.tap + 4;
  const fly = clamp01((f - flyStart) / Math.max(1, B.cardLand - 2 - flyStart));
  const flyE = fly <= 0 ? 0 : 1 - Math.pow(1 - fly, 2.4);
  const others = ease(f, B.tap + 2, 9, EASE.ui);
  const bgFade = ease(f, flyStart + 2, Math.max(4, B.cardLand - 4 - flyStart), EASE.inOut);
  const target = cardTarget(lang);
  const from = {x: UI.x, y: UI.cards[0], w: UI.w, h: UI.cardH};
  const card0 = {
    x: lerp(from.x, target.x, flyE),
    y: lerp(from.y - 10 * lift, target.y, flyE),
    w: lerp(from.w * (1 + 0.03 * lift), target.w, flyE),
    h: lerp(from.h * (1 + 0.03 * lift), target.h, flyE),
  };
  // thumb path: types at type1/type6, then taps apply at tap
  const thumbIn = ease(f, B.type1 - 12, 12, EASE.ui);
  const thumbOut = ease(f, B.tap + 4, 10, EASE.inOut);
  const digitX = UI.x + 64 + (digits.length >= 1 ? 58 : 0);
  const pillX = UI.x + UI.w - 150;
  const pillY = UI.cards[0] + UI.cardH / 2 + 8;
  const press = (at: number) => (f >= at - 3 && f < at + 4 ? Math.sin(((f - (at - 3)) / 7) * Math.PI) : 0);
  const thumbTarget =
    f < B.type6 - 6 ? {x: digitX + 20, y: 470} : f < B.cards ? {x: digitX + 70, y: 470} : {x: pillX, y: pillY};
  const thumbPrev = f < B.type6 - 6 ? {x: digitX + 20, y: 470} : f < B.cards ? {x: digitX + 20, y: 470} : {x: digitX + 70, y: 470};
  const moveU = f < B.type6 - 6 ? 1 : f < B.cards ? ease(f, B.type6 - 10, 6, EASE.ui) : ease(f, B.tap - 12, 9, EASE.ui);
  const pressNow = Math.max(press(B.type1), press(B.type6), press(B.tap));
  const tx = lerp(thumbPrev.x, thumbTarget.x, moveU) + lerp(260, 0, thumbIn) + 340 * thumbOut;
  const ty = lerp(thumbPrev.y, thumbTarget.y, moveU) + lerp(700, 0, thumbIn) + 800 * thumbOut + 10 * pressNow;

  const ageScale = lerp(0.94, 1, form);
  const vis = (i: number) => (i === 0 ? 1 : 1 - others);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      {/* deep navy screen, glowing from where the phone was */}
      <div style={{position: 'absolute', inset: 0, background: C.skyTop, opacity: 1 - bgFade}} />
      <div style={{position: 'absolute', inset: 0, opacity: (1 - bgFade) * (0.55 + 0.45 * blueVeil), background: `radial-gradient(70% 48% at 50% 40%, ${rgba(VT.blue, 0.42)} 0%, ${rgba(VT.blue, 0.12)} 55%, transparent 100%)`}} />
      <div style={{position: 'absolute', inset: 0, opacity: blueVeil, background: `radial-gradient(90% 70% at 50% 40%, ${VT.core} 0%, ${mix(VT.core, VT.blue, 0.5)} 50%, ${VT.blue} 100%)`}} />
      {/* age field */}
      <Glass style={{left: UI.x, top: UI.age.y, width: UI.w, height: UI.age.h, opacity: form * vis(1), transform: `scale(${ageScale}) translateY(${others * 30}px)`}}>
        <div style={{position: 'absolute', left: 64, top: 34, ...TYPE.sub, color: C.muted}}>{T.ageLabel}</div>
        <div style={{position: 'absolute', left: 60, top: 70, display: 'flex', alignItems: 'center', height: 110}}>
          {digits.split('').map((d, i) => (
            <span key={i} style={{...TYPE.digits, color: C.eye, display: 'inline-block', transform: `scale(${pop(i === 0 ? B.type1 : B.type6)})`, transformOrigin: '50% 80%', lineHeight: 1}}>
              {d}
            </span>
          ))}
          <span style={{display: 'inline-block', width: 5, height: 84, marginLeft: 8, borderRadius: 3, background: VT.blue, opacity: caretOn ? 1 : 0}} />
        </div>
      </Glass>
      {/* role cards */}
      {ROLES.map((r, i) => {
        const k = cardIn(i);
        if (k <= 0.001 && f < B.cards + i * 3) return null;
        const geo = i === 0 && f >= flyStart ? card0 : {x: UI.x, y: UI.cards[i] - (i === 0 ? 10 * lift : 0), w: UI.w * (i === 0 ? 1 + 0.03 * lift : 1), h: UI.cardH * (i === 0 ? 1 + 0.03 * lift : 1)};
        const L = r[lang];
        const contentFade = i === 0 ? 1 - clamp01(flyE * 1.8) : 1;
        const toWindow = i === 0 ? clamp01(flyE * 1.3) : 0;
        return (
          <div
            key={r.key}
            style={{
              position: 'absolute',
              left: geo.x,
              top: geo.y,
              width: geo.w,
              height: geo.h,
              opacity: Math.min(1, k * 1.2) * vis(i),
              transform: i === 0 && f >= flyStart ? 'none' : `translateY(${(1 - k) * 46 + (i > 0 ? others * 40 : 0)}px) scale(${lerp(0.94, 1, Math.min(1, k))})`,
            }}
          >
            <Glass style={{inset: 0, borderRadius: lerp(GLASS.radius, 2, toWindow), background: toWindow > 0 ? `radial-gradient(80% 90% at 50% 38%, ${rgba(VT.core, toWindow)} 0%, ${rgba(VT.blue, 0.62 + 0.38 * toWindow)} 100%)` : GLASS.fill}}>
              <div style={{position: 'absolute', inset: 0, opacity: contentFade}}>
                <div style={{position: 'absolute', left: 32, top: 26, ...TYPE.roleTitle, color: C.eye, whiteSpace: 'nowrap'}}>{L.title}</div>
                <div style={{position: 'absolute', left: 32, top: 100, display: 'flex', gap: 12}}>
                  <Chip label={r.age} filled />
                  <Chip label={L.format} />
                  <Chip label={L.category} />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    right: 28,
                    top: 56,
                    height: 64,
                    padding: '0 30px',
                    borderRadius: 32,
                    background: VT.blue,
                    color: '#FFFFFF',
                    ...TYPE.chip,
                    display: 'flex',
                    alignItems: 'center',
                    transform: i === 0 ? `scale(${1 - 0.06 * tapPress})` : undefined,
                    boxShadow: i === 0 && tapPress > 0 ? `0 0 0 ${10 * tapPress}px ${rgba(VT.core, 0.25 * tapPress)}` : 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {T.apply}
                </div>
              </div>
            </Glass>
          </div>
        );
      })}
      {/* glass taps */}
      <TapRipple f={f} at={B.type1} x={UI.x + 64 + 20} y={470} />
      <TapRipple f={f} at={B.type6} x={UI.x + 64 + 78} y={470} />
      <TapRipple f={f} at={B.tap} x={pillX} y={pillY} />
      {/* the thumb */}
      {thumbIn > 0 && thumbOut < 1 && (
        <div style={{position: 'absolute', left: tx, top: ty, width: 0, height: 0}}>
          <Thumb press={pressNow} />
        </div>
      )}
      <div style={{display: 'none'}}>{t.toFixed(2)}{FONT.ui}</div>
    </div>
  );
};
