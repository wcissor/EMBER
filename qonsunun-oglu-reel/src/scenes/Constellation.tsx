// S7 · The constellation: one long row of panel blocks fills y 300–940 (windows on a 36×44 grid). Windows inside the
// VolunTrack star (from logo.svg, 640 px at 540,620) turn blue in a ripple from our kid's window, 3 frames per ring;
// then the logo resolves around the window star. VolunTrack-tagged file.
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {C} from '../theme';
import {mix} from '../color';
import {FPS, type Lang} from '../config';
import {ROW, STAR} from '../layout';
import {clamp01, lerp, springAt, ease, EASE, blueOn, noise1D} from '../motion';
import {timelineFor} from '../data';
import {VT} from '../vt';
import {LOGO, LOGO_DIAMONDS, LOGO_MONOGRAM, LOGO_POINTS} from '../logoData';
import {EASES} from '../camera';

const R = STAR.size / 2;
const D = LOGO.innerStar * R * Math.SQRT1_2;
/** The star from logo.svg's geometry (tips + inner corners on the diagonals), centred at the origin. */
export const STAR_POLY: [number, number][] = [
  [0, -R], [D, -D], [R, 0], [D, D], [0, R], [-D, D], [-R, 0], [-D, -D],
];
const inside = (x: number, y: number) => {
  let c = false;
  for (let i = 0, j = STAR_POLY.length - 1; i < STAR_POLY.length; j = i++) {
    const [xi, yi] = STAR_POLY[i];
    const [xj, yj] = STAR_POLY[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

const COLS = {from: -14, to: 44}; // column index c → centre x = 540 + 36 (c − 15)
const ROWS = 15; // row r → centre y = 312 + 44 r (row 7 sits on the star centre)
const cx = (c: number) => STAR.cx + ROW.cellW * (c - 15);
const cy = (r: number) => STAR.cy + ROW.cellH * (r - 7);
const KID = {c: 15, r: 7};

type Win = {c: number; r: number; x: number; y: number; lit: number; star: boolean; ring: number; warm: number};
export const WINDOWS: Win[] = (() => {
  const out: Win[] = [];
  for (let c = COLS.from; c <= COLS.to; c++)
    for (let r = 0; r < ROWS; r++) {
      const x = cx(c);
      const y = cy(r);
      const s = random(`cw-${c}-${r}`);
      const star = inside(x - STAR.cx, y - STAR.cy);
      const ring = Math.round(Math.hypot((c - KID.c) * ROW.cellW, (r - KID.r) * ROW.cellH) / ROW.cellW);
      out.push({c, r, x, y, lit: s < 0.28 ? 0 : 0.28 + 0.62 * random(`cl-${c}-${r}`), star, ring, warm: random(`cwm-${c}-${r}`)});
    }
  return out;
})();
export const STAR_RINGS = Math.max(...WINDOWS.filter((w) => w.star).map((w) => w.ring));

const BLOCK_JOINTS = [-7, 2, 11, 20, 29, 38];

/** The row of blocks with its windows. `blueAt(w)` gives the blue level of a star window (0 = still warm). */
const Row: React.FC<{f: number; t: number; ripple: number; dimOutside: number}> = ({f, t, ripple, dimOutside}) => {
  const top = cy(0) - ROW.cellH / 2 - 10;
  const bottom = cy(ROWS - 1) + ROW.cellH / 2 + 8;
  const x0 = cx(COLS.from) - ROW.cellW / 2;
  const x1 = cx(COLS.to) + ROW.cellW / 2;
  const blueLv = (w: Win) => {
    if (!w.star) return 0;
    if (w.c === KID.c && w.r === KID.r) return 1;
    const on = ripple + w.ring * 3;
    return f < on ? 0 : blueOn(f, on);
  };
  return (
    <g>
      <defs>
        <radialGradient id="cwBlue" cx="50%" cy="40%" r="75%">
          <stop offset="0%" stopColor={VT.core} />
          <stop offset="100%" stopColor={VT.blue} />
        </radialGradient>
        <radialGradient id="cwBlueGlow">
          <stop offset="0%" stopColor={VT.blue} stopOpacity={0.55} />
          <stop offset="100%" stopColor={VT.blue} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="cwAmberGlow">
          <stop offset="0%" stopColor={C.amber} stopOpacity={0.4} />
          <stop offset="100%" stopColor={C.amber} stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* facade + roofline */}
      <rect x={x0} y={top} width={x1 - x0} height={bottom - top + 400} fill={C.facade} />
      <rect x={x0} y={top - 6} width={x1 - x0} height={8} fill="#18203A" />
      {BLOCK_JOINTS.map((c) => (
        <g key={c}>
          <rect x={cx(c) + ROW.cellW / 2 - 2} y={top} width={4} height={bottom - top} fill={C.shadow} opacity={0.55} />
          <rect x={cx(c) - 40} y={top - 34} width={70} height={30} fill="#111829" />
        </g>
      ))}
      {Array.from({length: ROWS + 1}, (_, r) => (
        <rect key={r} x={x0} y={cy(r) - ROW.cellH / 2 - 1} width={x1 - x0} height={2} fill={C.seam} />
      ))}
      {/* windows: warm life everywhere; inside the star they turn blue */}
      {WINDOWS.map((w) => {
        const b = blueLv(w);
        const warm = w.lit * (1 - dimOutside * (w.star ? 0 : 1));
        const flick = 0.92 + 0.08 * noise1D(`cf-${w.c}-${w.r}`, t * 0.6);
        return (
          <g key={`${w.c}-${w.r}`}>
            {b > 0 ? (
              <>
                <circle cx={w.x} cy={w.y} r={30} fill="url(#cwBlueGlow)" opacity={Math.min(1, b)} />
                <rect x={w.x - 11} y={w.y - 14} width={22} height={28} fill="url(#cwBlue)" opacity={Math.min(1, b)} />
                {b > 1 && <rect x={w.x - 11} y={w.y - 14} width={22} height={28} fill={VT.core} opacity={(b - 1) * 2} />}
              </>
            ) : warm > 0 ? (
              <>
                <circle cx={w.x} cy={w.y} r={26} fill="url(#cwAmberGlow)" opacity={warm * flick} />
                <rect x={w.x - 11} y={w.y - 14} width={22} height={28} fill={mix(C.amberEdge, C.amber, w.warm)} opacity={warm * flick} />
              </>
            ) : (
              <rect x={w.x - 11} y={w.y - 14} width={22} height={28} fill="#0A0E1A" />
            )}
            <rect x={w.x - 1} y={w.y - 14} width={2} height={28} fill={C.facade} opacity={0.8} />
          </g>
        );
      })}
      {/* ground */}
      <rect x={x0 - 400} y={bottom} width={x1 - x0 + 800} height={1400} fill="#070A14" />
    </g>
  );
};

/** The rest of the logo around the window star: disc behind, the white points, ring, inner disc, diamonds, monogram. */
const LogoAround: React.FC<{f: number; at: number}> = ({f, at}) => {
  const k = R / LOGO.tip; // px per logo unit
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
    <g transform={`translate(${STAR.cx} ${STAR.cy}) scale(${k})`}>
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

const LogoDisc: React.FC<{f: number; at: number}> = ({f, at}) => {
  const disc = ease(f, at - 2, 14, EASE.out);
  if (disc <= 0) return null;
  const k = R / LOGO.tip;
  return <circle cx={STAR.cx} cy={STAR.cy} r={100 * k * (0.94 + 0.06 * disc)} fill={LOGO.navy} opacity={disc} />;
};

/** The crane transform for the row: from large and high (behind the falling courtyard) to its place at y 300–940. */
export const craneT = (f: number, crane: number) => EASES.crane(clamp01((f - crane) / 42));

export const Constellation: React.FC<{lang: Lang}> = ({lang}) => {
  const f = useCurrentFrame();
  const B = timelineFor(lang).beats;
  const t = f / FPS;
  const u = craneT(f, B.crane);
  const s = lerp(1.55, 1, u);
  const dy = lerp(-520, 0, u);
  // held shot never freezes: a slow drift after the crane
  const drift = Math.max(0, f - (B.crane + 42)) * 0.12;
  const dimOutside = 0;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${C.skyTop} 0%, ${mix(C.skyTop, C.skyHorizon, 0.6)} 30%, ${C.skyHorizon} 48%, #0B1022 52%)`}} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(${-drift * 0.4} ${dy + drift * 0.2}) translate(${STAR.cx} ${STAR.cy}) scale(${s * (1 + 0.0006 * drift)}) translate(${-STAR.cx} ${-STAR.cy})`}>
          <Row f={f} t={t} ripple={B.ripple} dimOutside={dimOutside} />
          <LogoDisc f={f} at={B.logo} />
          {/* the window star stays visible over the disc */}
          <g>
            {WINDOWS.filter((w) => w.star).map((w) => {
              const on = w.c === KID.c && w.r === KID.r ? -999 : B.ripple + w.ring * 3;
              const b = f < on ? 0 : on < 0 ? 1 : blueOn(f, on);
              if (b <= 0 || f < B.logo - 2) return null;
              return (
                <g key={`s${w.c}-${w.r}`}>
                  <circle cx={w.x} cy={w.y} r={34} fill="url(#cwBlueGlow)" opacity={Math.min(1, b)} />
                  <rect x={w.x - 11} y={w.y - 14} width={22} height={28} fill="url(#cwBlue)" opacity={Math.min(1, b)} />
                </g>
              );
            })}
          </g>
          <LogoAround f={f} at={B.logo} />
        </g>
      </svg>
    </div>
  );
};
