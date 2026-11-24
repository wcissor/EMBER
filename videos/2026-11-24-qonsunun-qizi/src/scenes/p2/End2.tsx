// 8 · Dusk to night over the neighbourhood: the evening's warm windows come on, and the windows inside a bigger
// VolunTrack star than part 1's turn blue ring by ring (one note of part 1's motif per ring); the logo resolves around
// it. Then the camera comes back down to the exact wide of frame 0 (Main draws the yard rising back into place).
// VolunTrack-tagged file.
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {C} from '../../theme';
import {mix} from '../../color';
import {FPS, type Lang} from '../../config';
import {clamp01, lerp, springAt, ease, EASE, blueOn, noise1D} from '../../motion';
import {timelineFor} from '../../data';
import {VT} from '../../vt';
import {LOGO, LOGO_DIAMONDS, LOGO_MONOGRAM, LOGO_POINTS} from '../../logoData';

export const STAR2 = {cx: 540, cy: 560, size: 820};
const CELL = {w: 36, h: 44};
const R = STAR2.size / 2;
const D = LOGO.innerStar * R * Math.SQRT1_2;
const STAR_POLY: [number, number][] = [[0, -R], [D, -D], [R, 0], [D, D], [0, R], [-D, D], [-R, 0], [-D, -D]];
const inside = (x: number, y: number) => {
  let c = false;
  for (let i = 0, j = STAR_POLY.length - 1; i < STAR_POLY.length; j = i++) {
    const [xi, yi] = STAR_POLY[i];
    const [xj, yj] = STAR_POLY[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const COLS = {from: -14, to: 44};
const ROWS = 23;
const MID = 11;
const cx = (c: number) => STAR2.cx + CELL.w * (c - 15);
const cy = (r: number) => STAR2.cy + CELL.h * (r - MID);
type Win = {c: number; r: number; x: number; y: number; on: number; lit: number; star: boolean; ring: number; warm: number};
const WINDOWS: Win[] = (() => {
  const out: Win[] = [];
  for (let c = COLS.from; c <= COLS.to; c++)
    for (let r = 0; r < ROWS; r++) {
      const x = cx(c);
      const y = cy(r);
      const s = random(`ew-${c}-${r}`);
      const star = inside(x - STAR2.cx, y - STAR2.cy);
      const ring = Math.round(Math.hypot((c - 15) * CELL.w, (r - MID) * CELL.h) / (CELL.w * 1.4));
      out.push({c, r, x, y, on: random(`eo-${c}-${r}`), lit: s < 0.3 ? 0 : 0.3 + 0.6 * random(`el-${c}-${r}`), star, ring, warm: random(`ewm-${c}-${r}`)});
    }
  return out;
})();
export const STAR2_RINGS = Math.max(...WINDOWS.filter((w) => w.star).map((w) => w.ring));
/** frames between rings (each ring = one note) */
export const RING_GAP = 3;

const BLOCK_JOINTS = [-7, 2, 11, 20, 29, 38];

const LogoAround: React.FC<{f: number; at: number}> = ({f, at}) => {
  const k = R / LOGO.tip;
  const disc = ease(f, at - 2, 14, EASE.out);
  const pts = ease(f, at + 2, 12, EASE.inOut);
  const draw = ease(f, at, 14, EASE.inOut);
  const inner = ease(f, at + 6, 10, EASE.inOut);
  const mono = springAt(f, at + 12, 'hero');
  const mid = (LOGO.ringIn + LOGO.ringOut) / 2;
  const w = LOGO.ringOut - LOGO.ringIn;
  const per = 2 * Math.PI * mid;
  if (disc <= 0) return null;
  return (
    <g transform={`translate(${STAR2.cx} ${STAR2.cy}) scale(${k})`}>
      <g opacity={pts * 0.88}>
        <path d={LOGO_POINTS} fill="#FFFFFF" />
      </g>
      <circle r={mid} fill="none" stroke="#FFFFFF" strokeWidth={w} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} transform="rotate(-90)" />
      <circle r={LOGO.ringIn * inner} fill={LOGO.navy} />
      {LOGO_DIAMONDS.map((d, i) => (
        <path key={i} d={d} fill="#FFFFFF" fillRule="evenodd" opacity={clamp01(springAt(f, at + 4 + i * 3, 'settle') * 1.4)} />
      ))}
      {f >= at + 12 && <path d={LOGO_MONOGRAM} fill="#FFFFFF" fillRule="evenodd" transform={`translate(0 ${(8 / k) * (1 - mono)})`} opacity={clamp01(mono * 2)} />}
    </g>
  );
};

export const End2: React.FC<{lang: Lang}> = ({lang}) => {
  const f = useCurrentFrame();
  const B = timelineFor(lang).beats;
  const t = f / FPS;
  // dusk → night over 40 frames
  const night = ease(f, B.dusk, 40, EASE.inOut);
  const top = mix('#3A2C5C', C.skyTop, night);
  const mid = mix('#B0617A', mix(C.skyTop, C.skyHorizon, 0.6), night);
  const hor = mix('#F09A5C', C.skyHorizon, night);
  const facade = mix('#2A2A3E', C.facade, night);
  // a slow rise, then a held drift
  const u = ease(f, B.dusk, 30, EASE.out);
  const s = lerp(1.12, 1, u) * (1 + 0.0005 * Math.max(0, f - B.dusk - 30));
  const dy = lerp(80, 0, u);
  const top0 = cy(0) - CELL.h / 2 - 10;
  const bottom = cy(ROWS - 1) + CELL.h / 2 + 8;
  const x0 = cx(COLS.from) - CELL.w / 2;
  const x1 = cx(COLS.to) + CELL.w / 2;
  const blueLv = (w: Win) => {
    if (!w.star) return 0;
    const on = B.starOn + w.ring * RING_GAP;
    return f < on ? 0 : blueOn(f, on);
  };
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${top} 0%, ${mid} 26%, ${hor} 44%, #0B1022 48%)`}} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="ewBlue" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor={VT.core} />
            <stop offset="100%" stopColor={VT.blue} />
          </radialGradient>
          <radialGradient id="ewBlueGlow">
            <stop offset="0%" stopColor={VT.blue} stopOpacity={0.55} />
            <stop offset="100%" stopColor={VT.blue} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="ewAmberGlow">
            <stop offset="0%" stopColor={C.amber} stopOpacity={0.4} />
            <stop offset="100%" stopColor={C.amber} stopOpacity={0} />
          </radialGradient>
        </defs>
        <g transform={`translate(0 ${dy}) translate(${STAR2.cx} ${STAR2.cy}) scale(${s}) translate(${-STAR2.cx} ${-STAR2.cy})`}>
          <rect x={x0} y={top0} width={x1 - x0} height={bottom - top0 + 600} fill={facade} />
          <rect x={x0} y={top0 - 6} width={x1 - x0} height={8} fill={mix('#3A3A52', '#18203A', night)} />
          {BLOCK_JOINTS.map((c) => (
            <g key={c}>
              <rect x={cx(c) + CELL.w / 2 - 2} y={top0} width={4} height={bottom - top0} fill={C.shadow} opacity={0.55} />
              <rect x={cx(c) - 40} y={top0 - 34} width={70} height={30} fill={mix('#2A2A3E', '#111829', night)} />
            </g>
          ))}
          {Array.from({length: ROWS + 1}, (_, r) => (
            <rect key={r} x={x0} y={cy(r) - CELL.h / 2 - 1} width={x1 - x0} height={2} fill={mix('#34344C', C.seam, night)} />
          ))}
          {WINDOWS.map((w) => {
            const b = blueLv(w);
            // evening: warm windows come on one by one as it gets dark
            const warmOn = clamp01((f - (B.dusk + w.on * 40)) / 6);
            const warm = w.lit * warmOn * (w.star && b > 0 ? 0 : 1);
            const flick = 0.92 + 0.08 * noise1D(`ef-${w.c}-${w.r}`, t * 0.6);
            return (
              <g key={`${w.c}-${w.r}`}>
                {b > 0 ? (
                  <>
                    <circle cx={w.x} cy={w.y} r={30} fill="url(#ewBlueGlow)" opacity={Math.min(1, b)} />
                    <rect x={w.x - 11} y={w.y - 14} width={22} height={28} fill="url(#ewBlue)" opacity={Math.min(1, b)} />
                    {b > 1 && <rect x={w.x - 11} y={w.y - 14} width={22} height={28} fill={VT.core} opacity={(b - 1) * 2} />}
                  </>
                ) : warm > 0 ? (
                  <>
                    <circle cx={w.x} cy={w.y} r={26} fill="url(#ewAmberGlow)" opacity={warm * flick} />
                    <rect x={w.x - 11} y={w.y - 14} width={22} height={28} fill={mix(C.amberEdge, C.amber, w.warm)} opacity={warm * flick} />
                  </>
                ) : (
                  <rect x={w.x - 11} y={w.y - 14} width={22} height={28} fill={mix('#3C3C56', '#0A0E1A', night)} />
                )}
                <rect x={w.x - 1} y={w.y - 14} width={2} height={28} fill={facade} opacity={0.8} />
              </g>
            );
          })}
          <rect x={x0 - 400} y={bottom} width={x1 - x0 + 800} height={1400} fill="#070A14" />
          {/* the logo resolves around the window star */}
          {(() => {
            const disc = ease(f, B.logo - 2, 14, EASE.out);
            return disc > 0 ? <circle cx={STAR2.cx} cy={STAR2.cy} r={100 * (R / LOGO.tip) * (0.94 + 0.06 * disc)} fill={LOGO.navy} opacity={disc} /> : null;
          })()}
          {f >= B.logo - 2 &&
            WINDOWS.filter((w) => w.star).map((w) => {
              const b = blueLv(w);
              if (b <= 0) return null;
              return (
                <g key={`s${w.c}-${w.r}`}>
                  <circle cx={w.x} cy={w.y} r={34} fill="url(#ewBlueGlow)" opacity={Math.min(1, b)} />
                  <rect x={w.x - 11} y={w.y - 14} width={22} height={28} fill="url(#ewBlue)" opacity={Math.min(1, b)} />
                </g>
              );
            })}
          <LogoAround f={f} at={B.logo} />
        </g>
      </svg>
    </div>
  );
};
