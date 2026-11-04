// The courtyard set as a 2.5D camera over layers: sky 0.1×, far blocks 0.3×, courtyard 0.7×, near facades 1×,
// a foreground laundry line 1.3×. Story places are slots the scenes fill (light + interior + actors).
import React from 'react';
import {random, staticFile} from 'remotion';
import {C} from '../theme';
import {mix, rgba, scale} from '../color';
import {noise1D} from '../motion';
import {
  BLOCKS, CAM_REF, GAP, PARALLAX, PLACES, STAGE, WORLD, balconyRect, blockWidth, colCenter, floorBottom, floorTop,
  roofY, stageScale, windowRect, type BlockDef, type Box, type PlaceId,
} from '../layout';
import {camTransform, layerCam, viewRect, type Cam} from '../camera';
import {BalconyView, Dish, LightDefs, Spill, STARS, WindowFrame, WindowView, windowLevel} from './kit';
import {CELLS, balcProps, winProps, type BalcProps} from './seed';
import {ASSETS} from '../data';

export type Slot = {
  /** Interior in stage units (1000×871) for windows. */
  stage?: React.ReactNode;
  /** Light level (drives the facade spill). */
  level?: number;
  /** Spill gradient id (define it in `defs`). */
  glowId?: string;
  bloom?: number;
  defs?: React.ReactNode;
  /** Balconies: actor (world units) inside the balcony, and contents behind the glass. */
  actor?: React.ReactNode;
  inside?: React.ReactNode;
  /** Something in world units drawn in front of the window (behind a railing). */
  front?: React.ReactNode;
  /** Balcony room gradient id (warm by default). */
  roomGradient?: string;
  dark?: boolean;
};
export type Slots = Partial<Record<PlaceId, Slot>>;

type Rect = {x0: number; x1: number; y0: number; y1: number};
const hit = (r: Box, v: Rect, pad = 0) => r.x + r.w + pad >= v.x0 && r.x - pad <= v.x1 && r.y + r.h + pad >= v.y0 && r.y - pad <= v.y1;

const placeAt = (b: BlockDef, c: number, k: number): PlaceId | undefined =>
  (Object.keys(PLACES) as PlaceId[]).find((id) => PLACES[id].b === b.id && PLACES[id].c === c && PLACES[id].k === k);

/** Fixed props for the two story balconies. */
const STORY_BALC: Partial<Record<PlaceId, BalcProps>> = {
  anaBalcony: {key: 'ana', kind: 'pvc', parapet: 'ribs', lit: true, level: 0.95, content: 'none', dish: true, dishSide: 'left', panes: 3, tone: 0.4},
  qonsuBalcony: {key: 'qq', kind: 'wood', parapet: 'panel', lit: true, level: 0.9, content: 'none', dish: false, dishSide: 'right', panes: 4, tone: 0.7},
};

// ───────────────────────────── Sky ─────────────────────────────
export const Sky: React.FC<{cam: Cam; t: number; lift?: number}> = ({cam, t, lift = 0}) => {
  const c = layerCam(cam, PARALLAX.sky);
  const off = -(c.y - CAM_REF.y) * 0.35 + lift;
  return (
    <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${C.skyTop} ${Math.round(-10 + off / 19)}%, ${mix(C.skyTop, C.skyHorizon, 0.55)} ${Math.round(48 + off / 19)}%, ${C.skyHorizon} ${Math.round(92 + off / 19)}%)`}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y + off * 0.3} r={s.r} fill={C.eye} opacity={s.a * (0.7 + 0.3 * Math.sin(t * 0.9 + s.tw))} />
        ))}
      </svg>
    </div>
  );
};

// ───────────────────────────── Far blocks (0.3×) ─────────────────────────────
const FAR = Array.from({length: 22}, (_, i) => {
  const w = 230 + random(`fb-w-${i}`) * 120;
  const x = -1600 + i * 300 + random(`fb-x-${i}`) * 40;
  const top = 1230 + random(`fb-t-${i}`) * 300;
  return {i, x, w, top};
});
const FarBlocks: React.FC<{cam: Cam; t: number}> = ({cam}) => {
  const c = layerCam(cam, PARALLAX.far);
  const v = viewRect(c, 60);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <g transform={camTransform(c)}>
        {FAR.filter((b) => b.x + b.w >= v.x0 && b.x <= v.x1).map((b) => {
          const cols = Math.floor(b.w / 30);
          const rows = Math.floor((WORLD.ground - b.top) / 36);
          const wins: React.ReactNode[] = [];
          for (let r = 0; r < rows - 1; r++)
            for (let k = 0; k < cols; k++) {
              const s = random(`fw-${b.i}-${r}-${k}`);
              if (s < 0.55) continue;
              wins.push(<rect key={`${r}-${k}`} x={b.x + 9 + k * 30} y={b.top + 12 + r * 36} width={13} height={14} fill={s > 0.93 ? C.tvWarm : C.amber} opacity={0.18 + 0.5 * (s - 0.55)} />);
            }
          return (
            <g key={b.i}>
              <rect x={b.x} y={b.top} width={b.w} height={WORLD.ground - b.top + 400} fill="#0C1224" />
              <rect x={b.x} y={b.top} width={b.w} height={6} fill="#141C34" />
              {wins}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

// ───────────────────────────── Courtyard (0.7×) ─────────────────────────────
const TREE = {x: 1450, ground: WORLD.ground, cx: 1450, cy: 1400, rx: 300, ry: 235};
const CLUMPS = Array.from({length: 46}, (_, i) => {
  const a = random(`tc-a-${i}`) * Math.PI * 2;
  const d = Math.sqrt(random(`tc-d-${i}`));
  return {
    i,
    x: TREE.cx + Math.cos(a) * d * TREE.rx * 0.82,
    y: TREE.cy + Math.sin(a) * d * TREE.ry * 0.8,
    r: 48 + random(`tc-r-${i}`) * 52,
    tone: random(`tc-t-${i}`),
  };
}).sort((a, b) => a.y - b.y);

const OldMan: React.FC<{x: number; y: number; flip?: boolean; lift: number}> = ({x, y, flip, lift}) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`} fill={C.shadow}>
    <path d="M-9 0 v-26 q0 -9 9 -9 q8 0 9 8 l2 27 z" />
    <rect x={-12} y={-4} width={22} height={6} rx={2} />
    <path d="M10 -2 l10 0 v18 h-5 v-14 h-5 z" />
    <circle cx={1} cy={-43} r={8.5} />
    <path d="M-9 -46 q10 -9 20 -1 l4 2 h-25 z" />
    <path d={`M6 -30 q10 ${-4 - lift * 10} 16 ${-2 - lift * 14}`} stroke={C.shadow} strokeWidth={5.5} strokeLinecap="round" fill="none" />
    <circle cx={4.5} cy={-44} r={1.4} fill={C.eye} opacity={0.9} />
  </g>
);

const Laundry: React.FC<{x0: number; x1: number; y: number; sag: number; t: number; seed: string; items: number}> = ({x0, x1, y, sag, t, seed, items}) => {
  const pts: string[] = [];
  const at = (u: number) => ({x: x0 + (x1 - x0) * u, y: y + sag * 4 * u * (1 - u)});
  for (let i = 0; i <= 20; i++) {
    const p = at(i / 20);
    pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  const colors = [C.curtain, '#C98A5A', '#8E7A6A', C.phoneWhite, '#A86B4A', '#6E6A78'];
  return (
    <g>
      <polyline points={pts.join(' ')} fill="none" stroke="#2E3650" strokeWidth={1.6} />
      {Array.from({length: items}, (_, i) => {
        const u = 0.08 + (i + random(`${seed}-u-${i}`) * 0.5) * (0.84 / items);
        const p = at(u);
        const w = 22 + random(`${seed}-w-${i}`) * 26;
        const h = 26 + random(`${seed}-h-${i}`) * 34;
        const sw = noise1D(`${seed}-s-${i}`, t * 0.7) * 6;
        const kind = random(`${seed}-k-${i}`);
        const col = colors[Math.floor(random(`${seed}-c-${i}`) * colors.length)];
        const shade = scale(col, 0.32 + random(`${seed}-l-${i}`) * 0.12);
        return (
          <g key={i} transform={`rotate(${sw} ${p.x} ${p.y})`}>
            {kind < 0.4 ? (
              <path d={`M${p.x - w / 2} ${p.y} h${w} l4 9 l-6 3 v${h * 0.7} h${-(w - 4)} v${-h * 0.7} l-6 -3 z`} fill={shade} />
            ) : (
              <rect x={p.x - w / 2} y={p.y} width={w} height={h} fill={shade} />
            )}
            <rect x={p.x - w / 2 + 2} y={p.y - 2} width={2} height={5} fill="#3A4058" />
            <rect x={p.x + w / 2 - 4} y={p.y - 2} width={2} height={5} fill="#3A4058" />
          </g>
        );
      })}
    </g>
  );
};

export const Courtyard: React.FC<{cam: Cam; t: number; frame: number}> = ({cam, t, frame}) => {
  const c = layerCam(cam, PARALLAX.yard);
  const v = viewRect(c, 120);
  const g = WORLD.ground;
  // nərd: one of the old men rolls every few seconds
  const roll = (() => {
    const period = 3.4;
    const ph = (t % period) / period;
    return ph < 0.12 ? Math.sin((ph / 0.12) * Math.PI) : 0;
  })();
  const lampX = 1290;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <defs>
        <radialGradient id="sodium">
          <stop offset="0%" stopColor={C.amberEdge} stopOpacity={0.42} />
          <stop offset="55%" stopColor={C.amberEdge} stopOpacity={0.12} />
          <stop offset="100%" stopColor={C.amberEdge} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="lampHalo">
          <stop offset="0%" stopColor="#FFD08A" stopOpacity={0.9} />
          <stop offset="25%" stopColor={C.amberEdge} stopOpacity={0.35} />
          <stop offset="100%" stopColor={C.amberEdge} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="leafLit" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A2A18" />
          <stop offset="45%" stopColor="#0D1626" />
          <stop offset="100%" stopColor="#080E1A" />
        </linearGradient>
      </defs>
      <g transform={camTransform(c)}>
        {/* ground */}
        <rect x={v.x0 - 50} y={g - 12} width={v.x1 - v.x0 + 100} height={900} fill="#0A0F1D" />
        <rect x={v.x0 - 50} y={g - 12} width={v.x1 - v.x0 + 100} height={3} fill="#151C30" />
        <ellipse cx={lampX + 40} cy={g + 10} rx={320} ry={60} fill="url(#sodium)" />
        {/* streetlight (sodium, warm) */}
        <rect x={lampX - 3} y={g - 420} width={6} height={420} fill="#141A2C" />
        <path d={`M${lampX} ${g - 418} q0 -30 40 -30 h22`} stroke="#141A2C" strokeWidth={5} fill="none" />
        <path d={`M${lampX + 46} ${g - 452} h30 l-4 10 h-22 z`} fill="#1B2236" />
        <ellipse cx={lampX + 61} cy={g - 441} rx={70} ry={70} fill="url(#lampHalo)" />
        <path d={`M${lampX + 50} ${g - 442} L${lampX - 70} ${g} L${lampX + 200} ${g} L${lampX + 72} ${g - 442} z`} fill={C.amberEdge} opacity={0.05} />
        {/* tree */}
        <path
          d={`M${TREE.x - 22} ${g} q8 -120 -4 -250 q-30 -60 -90 -110 l12 -8 q50 30 82 80 q4 -70 -16 -130 l16 -4 q22 60 18 140 q30 -60 92 -96 l8 12 q-64 40 -86 110 q-8 120 8 248 z`}
          fill="#070B15"
        />
        {CLUMPS.map((k) => {
          const sw = noise1D(`tw-${k.i}`, t * 0.5) * 2.2;
          return (
            <g key={k.i} transform={`rotate(${sw} ${k.x} ${k.y + k.r})`}>
              <circle cx={k.x} cy={k.y} r={k.r} fill={k.tone > 0.55 ? 'url(#leafLit)' : mix('#0A1222', '#0E1830', k.tone)} />
            </g>
          );
        })}
        {/* laundry lines across the yard */}
        <Laundry x0={1100} x1={1820} y={1480} sag={60} t={t} seed="ly1" items={7} />
        <Laundry x0={1080} x1={1840} y={1330} sag={46} t={t + 3} seed="ly2" items={5} />
        {/* bench + nərd */}
        <g>
          <rect x={1392} y={g - 34} width={120} height={7} fill="#1A2134" />
          <rect x={1398} y={g - 27} width={5} height={27} fill="#141A2C" />
          <rect x={1500} y={g - 27} width={5} height={27} fill="#141A2C" />
          <rect x={1430} y={g - 40} width={44} height={6} fill="#3A2C1E" />
          <rect x={1440 + roll * 6} y={g - 44 - roll * 9} width={3.2} height={3.2} fill={C.phoneWhite} opacity={0.85} />
          <rect x={1447 - roll * 4} y={g - 44 - roll * 6} width={3.2} height={3.2} fill={C.phoneWhite} opacity={0.85} />
          <OldMan x={1410} y={g - 34} lift={roll} />
          <OldMan x={1494} y={g - 34} flip lift={0} />
        </g>
        {/* parked car */}
        <g transform={`translate(1560 ${g})`}>
          <path d="M0 -10 v-26 q0 -8 10 -10 l40 -6 l26 -26 q6 -6 16 -6 h70 q12 0 20 8 l22 22 l44 6 q12 2 12 14 v24 z" fill="#0E1426" />
          <path d="M84 -66 l-22 22 h44 v-22 z M112 -66 v22 h48 l-20 -20 q-4 -2 -10 -2 z" fill={rgba(C.amber, 0.12)} />
          <circle cx={50} cy={-10} r={15} fill="#06080F" />
          <circle cx={206} cy={-10} r={15} fill="#06080F" />
        </g>
        {/* a cat? no: the cat sleeps on the stairwell landing */}
        <rect x={v.x0} y={v.y0} width={0} height={0} fill="none" data-frame={frame} />
      </g>
    </svg>
  );
};

// ───────────────────────────── Near facades (1×) ─────────────────────────────
const PANEL_SEAM = C.seam;
export type Power = (x: number, y: number) => number;
const Facade: React.FC<{b: BlockDef; v: Rect; t: number; slots: Slots; power?: Power}> = ({b, v, t, slots, power}) => {
  const pw = (r: Box) => (power ? power(r.x + r.w / 2, r.y + r.h / 2) : 1);
  const x1 = b.x0 + blockWidth(b);
  const top = roofY() - WORLD.parapet;
  if (x1 < v.x0 || b.x0 > v.x1) return null;
  const panels: React.ReactNode[] = [];
  for (let k = 1; k <= WORLD.floors; k++) {
    const yT = floorTop(k);
    if (yT > v.y1 || yT + WORLD.floorH < v.y0) continue;
    for (let c = 0; c < b.cols; c++) {
      const x = b.x0 + WORLD.margin + c * WORLD.colW;
      if (x > v.x1 || x + WORLD.colW < v.x0) continue;
      const tone = random(`pn-${b.id}-${c}-${k}`);
      panels.push(<rect key={`p${c}-${k}`} x={x + 1} y={yT + 1} width={WORLD.colW - 2} height={WORLD.floorH - 2} fill={mix(C.facade, '#17203A', tone * 0.55)} />);
    }
  }
  const seams: React.ReactNode[] = [];
  for (let k = 0; k <= WORLD.floors; k++) {
    const y = floorBottom(k + 1);
    seams.push(<rect key={`h${k}`} x={b.x0} y={y - 1.5} width={blockWidth(b)} height={3} fill={PANEL_SEAM} />);
  }
  for (let c = 0; c <= b.cols; c++) {
    const x = b.x0 + WORLD.margin + c * WORLD.colW;
    seams.push(<rect key={`v${c}`} x={x - 1.5} y={top + WORLD.parapet} width={3} height={WORLD.ground - top} fill={PANEL_SEAM} />);
  }
  // cells in view
  const cells = CELLS.filter((cell) => cell.b.id === b.id).map((cell) => {
    const place = cell.story ? placeAt(b, cell.c, cell.k) : undefined;
    const isBalc = cell.type === 'balcony';
    const r = isBalc ? balconyRect(b, cell.c, cell.k) : windowRect(b, cell.c, cell.k);
    return {cell, place, isBalc, r};
  }).filter((x) => hit(x.r, v, 160));

  // entrance (podyezd) at column 3, floor 1
  const ent = windowRect(b, 3, 1);
  return (
    <g>
      <rect x={b.x0} y={top} width={blockWidth(b)} height={WORLD.ground - top + 20} fill={C.facade} />
      {panels}
      {ASSETS.concrete && <rect x={b.x0} y={top} width={blockWidth(b)} height={WORLD.ground - top + 20} fill="url(#concrete)" opacity={0.5} />}
      {seams}
      {/* roof */}
      <rect x={b.x0 - 6} y={top} width={blockWidth(b) + 12} height={WORLD.parapet} fill="#18203A" />
      <rect x={b.x0 - 6} y={top} width={blockWidth(b) + 12} height={3} fill="#232C4A" />
      <rect x={b.x0 + 380} y={top - 70} width={150} height={70} fill="#121A2E" />
      <line x1={b.x0 + 260} y1={top} x2={b.x0 + 260} y2={top - 120} stroke="#1E2640" strokeWidth={3} />
      <line x1={b.x0 + 240} y1={top - 90} x2={b.x0 + 280} y2={top - 90} stroke="#1E2640" strokeWidth={2} />
      <Dish x={b.x0 + 700} y={top - 12} s={1.6} />
      <Dish x={b.x0 + 760} y={top - 12} s={1.6} />
      {/* plinth */}
      <rect x={b.x0} y={floorBottom(1)} width={blockWidth(b)} height={WORLD.plinth + 30} fill="#0C1222" />
      {/* spills first, so slabs and frames sit on top of the light */}
      {cells.map(({cell, place, isBalc, r}) => {
        if (cell.k === 1 && cell.c === 3) return null;
        const slot = place ? slots[place] : undefined;
        if (place) {
          const lvl = slot?.level ?? 0;
          return <Spill key={`s-${cell.c}-${cell.k}`} r={r} level={lvl} glowId={slot?.glowId ?? 'glowAmber'} bloom={slot?.bloom ?? 0} />;
        }
        if (isBalc) {
          const p = balcProps(b, cell.c, cell.k);
          return p.lit ? <Spill key={`s-${cell.c}-${cell.k}`} r={{...r, y: r.y + 4, h: r.h * 0.6}} level={p.level * 0.7 * pw(r)} /> : null;
        }
        const p = winProps(b, cell.c, cell.k);
        const lvl = windowLevel(p, t) * pw(r);
        return <Spill key={`s-${cell.c}-${cell.k}`} r={r} level={lvl * 0.85} glowId={p.thing === 'tv' ? 'glowTv' : 'glowAmber'} bloom={lvl > 0.75 ? 0.6 : 0} />;
      })}
      {/* entrance */}
      <g>
        <rect x={ent.x + 20} y={floorBottom(1) - 150} width={ent.w - 40} height={150 + WORLD.plinth} fill="#0A0E19" />
        <rect x={ent.x + 26} y={floorBottom(1) - 144} width={ent.w - 52} height={144 + WORLD.plinth - 6} fill="#1A1410" />
        <rect x={ent.x} y={floorBottom(1) - 166} width={ent.w} height={14} fill="#28304C" />
        <ellipse cx={ent.x + ent.w / 2} cy={floorBottom(1) - 140} rx={70} ry={60} fill="url(#glowEdge)" opacity={0.75} />
        <circle cx={ent.x + ent.w / 2} cy={floorBottom(1) - 146} r={4} fill="#FFD08A" />
      </g>
      {cells.map(({cell, place, isBalc, r}) => {
        if (cell.k === 1 && cell.c === 3) return null;
        const key = `c-${cell.c}-${cell.k}`;
        const slot = place ? slots[place] : undefined;
        if (isBalc) {
          const p = (place && STORY_BALC[place]) || balcProps(b, cell.c, cell.k);
          const lvl = place ? slot?.level ?? p.level : p.lit ? p.level * pw(r) : 0;
          return (
            <BalconyView key={key} r={r} p={p} level={lvl} t={t} actor={slot?.actor} inside={slot?.inside} roomGradient={slot?.roomGradient} openSash={!!place} />
          );
        }
        if (place) {
          // a story window: the scene draws the interior in stage units
          return (
            <g key={key}>
              {slot?.defs && <defs>{slot.defs}</defs>}
              <rect x={r.x - 5} y={r.y + r.h + 1} width={r.w + 10} height={5} fill="#26304A" />
              <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#090C17" />
              {slot?.stage ? (
                <g transform={`translate(${r.x} ${r.y}) scale(${stageScale})`}>
                  <svg x={0} y={0} width={STAGE.w} height={STAGE.h} viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} overflow="hidden">
                    {slot.stage}
                  </svg>
                </g>
              ) : (
                <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#skyReflect)" />
              )}
              <StoryFrame r={r} />
              {slot?.front}
            </g>
          );
        }
        const p = winProps(b, cell.c, cell.k);
        return <WindowView key={key} r={r} p={p} level={windowLevel(p, t) * pw(r)} />;
      })}
    </g>
  );
};

/** Story windows keep the stage clear: a narrow sash on the left (mullion + transom), the rest one pane. */
const StoryFrame: React.FC<{r: Box}> = ({r}) => {
  const t = 4.2;
  const mx = r.x + r.w * 0.2;
  const col = '#1A1F2C';
  return (
    <g fill={col}>
      <path d={`M${r.x - t} ${r.y - t} h${r.w + 2 * t} v${r.h + 2 * t} h${-(r.w + 2 * t)} z M${r.x} ${r.y} v${r.h} h${r.w} v${-r.h} z`} fillRule="evenodd" />
      <rect x={mx - 1.4} y={r.y} width={2.8} height={r.h} />
      <rect x={r.x} y={r.y + r.h * 0.24} width={mx - r.x} height={2.6} />
    </g>
  );
};

export const NearLayer: React.FC<{cam: Cam; t: number; slots: Slots; extra?: React.ReactNode; power?: Power}> = ({cam, t, slots, extra, power}) => {
  const v = viewRect(cam, 40);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <LightDefs />
      {ASSETS.concrete && (
        <defs>
          <pattern id="concrete" width={300} height={300} patternUnits="userSpaceOnUse">
            <image href={staticFile('tex/concrete.png')} width={300} height={300} />
          </pattern>
        </defs>
      )}
      <g transform={camTransform(cam)}>
        {BLOCKS.map((b) => (
          <Facade key={b.id} b={b} v={v} t={t} slots={slots} power={power} />
        ))}
        {extra}
      </g>
    </svg>
  );
};

// ───────────────────────────── Foreground line (1.3×) ─────────────────────────────
const ForeLine: React.FC<{cam: Cam; t: number}> = ({cam, t}) => {
  const c = layerCam(cam, PARALLAX.fore);
  const v = viewRect(c, 200);
  if (v.x1 < 1180 || v.x0 > 1780 || v.y1 < 1150 || v.y0 > 1400) return null;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <g transform={camTransform(c)}>
        <Laundry x0={1180} x1={1780} y={1200} sag={34} t={t + 7} seed="fore" items={6} />
      </g>
    </svg>
  );
};

export type WorldProps = {cam: Cam; t: number; frame: number; slots: Slots; hideSky?: boolean; hideFar?: boolean; nearExtra?: React.ReactNode; power?: Power};

/** All five layers. */
export const World: React.FC<WorldProps> = ({cam, t, frame, slots, hideSky, hideFar, nearExtra, power}) => (
  <>
    {!hideSky && <Sky cam={cam} t={t} />}
    {!hideFar && <FarBlocks cam={cam} t={t} />}
    <Courtyard cam={cam} t={t} frame={frame} />
    <NearLayer cam={cam} t={t} slots={slots} extra={nearExtra} power={power} />
    <ForeLine cam={cam} t={t} />
  </>
);

export {GAP, colCenter};
