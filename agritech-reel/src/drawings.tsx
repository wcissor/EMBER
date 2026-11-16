import React from 'react';
import {Img, OffthreadVideo, Sequence, staticFile} from 'remotion';
import geo from './geo.json';
import globe from '../public/sat/globe.json';
import {FPS, Line, Svg, keyStyle, lineStyle, olive, useBeat, useT} from './components';
import {colors, type} from './theme';
import {CX, H, W} from './layout';
import {ease, enter, mix, prog} from './motion';

const bracket = (x: number, y: number, s: number, c: number) =>
  `M${x - s},${y - s + c} V${y - s} H${x - s + c} M${x + s - c},${y - s} H${x + s} V${y - s + c} M${x + s},${y + s - c} V${y + s} H${x + s - c} M${x - s + c},${y + s} H${x - s} V${y + s - c}`;

// ---------- Laser weeder (illustration) ----------
/** Small square brackets marking weeds, each shown briefly (short enough that the moving picture doesn't matter). */
export const Detections: React.FC<{points: [number, number][]; at: number; every?: number; life?: number}> = ({points, at, every = 0.2, life = 0.6}) => {
  const t = useT();
  return (
    <Svg>
      {points.map(([x, y], i) => {
        const t0 = at + i * every;
        const a = enter(t, t0, 0.18) * (1 - prog(t, t0 + life, 0.15, ease.out));
        if (a <= 0) return null;
        return <Line key={i} d={bracket(x, y, mix(36, 26, enter(t, t0, 0.3)), 11)} opacity={a} />;
      })}
    </Svg>
  );
};

/** Crosshair that slides in and locks on a weed; a tiny laser tick fires at `fire`. */
export const Crosshair: React.FC<{x: number; y: number; at: number; fire?: number; from?: [number, number]; until?: number}> = ({x, y, at, fire, from, until = 1e9}) => {
  const t = useT();
  const a = enter(t, at, 0.25) * (1 - prog(t, until, 0.2, ease.out));
  if (a <= 0) return null;
  const m = prog(t, at, 0.45, ease.out);
  const sx = from ? mix(from[0], x, m) : x;
  const sy = from ? mix(from[1], y, m) : y;
  const r = mix(60, 36, prog(t, at + 0.2, 0.3, ease.out));
  const tick = fire !== undefined ? t - fire : -1;
  const ring = `M${sx + r},${sy} A${r},${r} 0 1 1 ${sx - r},${sy} A${r},${r} 0 1 1 ${sx + r},${sy}`;
  const ticks = `M${sx - r - 16},${sy} H${sx - r + 10} M${sx + r - 10},${sy} H${sx + r + 16} M${sx},${sy - r - 16} V${sy - r + 10} M${sx},${sy + r - 10} V${sy + r + 16}`;
  return (
    <Svg>
      <Line d={ring} opacity={a} />
      <Line d={ticks} opacity={a} />
      {tick >= 0 && tick < 0.4 ? (
        <g>
          <circle cx={x} cy={y} r={mix(4, 28, tick / 0.4)} fill="none" stroke={olive} strokeWidth={2} opacity={1 - tick / 0.4} />
          {tick < 0.13 ? <circle cx={x} cy={y} r={7} fill={colors.white} /> : null}
        </g>
      ) : null}
    </Svg>
  );
};

// ---------- Collar (illustration) ----------
/**
 * A line drawing of a solar collar (band, unit with a small solar panel, counterweight) inside a dark circular inset,
 * with a leader to the cow's neck. It is a diagram next to the cow, not something composited onto it.
 */
export const CollarDrawing: React.FC<{
  cx: number; cy: number; R: number; at: number; to: [number, number]; label: string;
  sound?: number; vib?: number; soundLabel: string; vibLabel: string;
}> = ({cx, cy, R, at, to, label, sound, vib, soundLabel, vibLabel}) => {
  const t = useT();
  const o = enter(t, at, 0.35);
  if (o <= 0) return null;
  const d = prog(t, at + 0.15, 0.7, ease.inOut);
  const x = cx;
  const y = cy + 22;
  const rx = 112;
  const ry = 36;
  const per = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2);
  const unitW = 64;
  const unitH = 40;
  const ux = x - unitW / 2;
  const uy = y - ry - unitH + 6;
  const ang = Math.atan2(to[1] - cy, to[0] - cx);
  const ex = cx + R * Math.cos(ang);
  const ey = cy + R * Math.sin(ang);
  const lead = prog(t, at + 0.45, 0.4, ease.inOut);
  const sA = sound !== undefined ? t - sound : -1;
  const vA = vib !== undefined ? t - vib : -1;
  return (
    <>
      <Svg>
        <g opacity={o}>
          <circle cx={cx} cy={cy} r={R} fill={colors.black} fillOpacity={0.88} />
          <circle cx={cx} cy={cy} r={R} {...lineStyle} />
        </g>
        <g {...lineStyle}>
          <ellipse cx={x} cy={y} rx={rx} ry={ry} strokeDasharray={per} strokeDashoffset={per * (1 - d)} />
          <ellipse cx={x} cy={y + 14} rx={rx} ry={ry} strokeDasharray={per} strokeDashoffset={per * (1 - d)} opacity={0.5} />
          <g opacity={prog(t, at + 0.4, 0.3, ease.out)}>
            <rect x={ux} y={uy} width={unitW} height={unitH} rx={4} />
            <path d={`M${ux + unitW / 3},${uy} V${uy + unitH} M${ux + (2 * unitW) / 3},${uy} V${uy + unitH} M${ux},${uy + unitH / 2} H${ux + unitW}`} strokeWidth={1.5} />
            <rect x={x - 15} y={y + ry - 2} width={30} height={22} rx={4} />
          </g>
        </g>
        {lead > 0 ? (
          <g>
            <Line d={`M${ex},${ey} L${mix(ex, to[0], lead)},${mix(ey, to[1], lead)}`} />
            {lead >= 1 ? <circle cx={to[0]} cy={to[1]} r={6} fill={olive} stroke={colors.black} strokeOpacity={0.5} strokeWidth={3} /> : null}
          </g>
        ) : null}
        {sA >= 0
          ? [0, 1, 2].map((k) => {
              const a = enter(t, sound! + k * 0.12, 0.3);
              const r = 28 + k * 18;
              const ax = ux + unitW;
              const ay = uy + unitH / 2;
              return <path key={k} d={`M${ax + r * Math.cos(-0.75)},${ay + r * Math.sin(-0.75)} A${r},${r} 0 0 1 ${ax + r * Math.cos(0.75)},${ay + r * Math.sin(0.75)}`} {...lineStyle} opacity={a} />;
            })
          : null}
        {vA >= 0
          ? [-1, 1].map((sgn) => {
              const a = enter(t, vib!, 0.3);
              const bx = x + sgn * (rx + 22);
              const zz = [0, 1, 2, 3, 4].map((k) => `${bx + (k % 2 ? 8 : -8)},${y - 24 + k * 12}`).join(' L');
              return <path key={sgn} d={`M${zz}`} {...lineStyle} opacity={a} />;
            })
          : null}
      </Svg>
      <div data-text="label" style={{position: 'absolute', left: cx - 130, width: 260, top: cy - R + 44, textAlign: 'center', color: colors.white, opacity: o, ...type.label, whiteSpace: 'normal', zIndex: 2}}>
        {label}
      </div>
      {sA >= 0 ? (
        <div data-text="label" style={{position: 'absolute', left: ux + unitW + 70, top: uy - 34, color: colors.white, opacity: enter(t, sound!, 0.3), ...type.label, zIndex: 2}}>
          {soundLabel}
        </div>
      ) : null}
      {vA >= 0 ? (
        <div data-text="label" style={{position: 'absolute', left: x, top: y + ry + 34, transform: 'translateX(-50%)', color: colors.white, opacity: enter(t, vib!, 0.3), ...type.label, zIndex: 2}}>
          {vibLabel}
        </div>
      ) : null}
    </>
  );
};

/** Dotted virtual fence: draws from left to right; optionally moves to a second line. */
export const DottedFence: React.FC<{a: [number, number][]; b?: [number, number][]; at: number; move?: number; drawDur?: number; id: string}> = ({a, b, at, move, drawDur = 0.8, id}) => {
  const t = useT();
  const d = prog(t, at, drawDur, ease.inOut);
  if (d <= 0) return null;
  const m = b && move !== undefined ? prog(t, move, 0.6, ease.inOut) : 0;
  const pts = a.map(([x, y], i) => (b ? [mix(x, b[i][0], m), mix(y, b[i][1], m)] : [x, y]));
  const path = pts.reduce((acc, p, i, arr) => {
    if (i === 0) return `M${p[0]},${p[1]}`;
    const p0 = arr[Math.max(0, i - 2)];
    const p1 = arr[i - 1];
    const p3 = arr[Math.min(arr.length - 1, i + 1)];
    const c1 = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6];
    const c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6];
    return `${acc} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p[0]},${p[1]}`;
  }, '');
  const xs = pts.map((p) => p[0]);
  const clipW = Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * d;
  return (
    <Svg>
      <defs>
        <clipPath id={`fence-${id}`}>
          <rect x={-60} y={0} width={clipW + 60} height={H} />
        </clipPath>
      </defs>
      <g clipPath={`url(#fence-${id})`}>
        <path d={path} stroke={colors.black} strokeOpacity={0.55} strokeWidth={13} strokeLinecap="round" strokeDasharray="0.1 26" fill="none" />
        <path d={path} stroke={olive} strokeWidth={8} strokeLinecap="round" strokeDasharray="0.1 26" fill="none" />
      </g>
    </Svg>
  );
};

// ---------- Satellites ----------
/** Orthographic projection matching scripts/maps.py (degrees in, globe px out). */
const project = (lon: number, lat: number, lam0: number, phi0: number) => {
  const r = Math.PI / 180;
  const c = Math.sin(phi0 * r) * Math.sin(lat * r) + Math.cos(phi0 * r) * Math.cos(lat * r) * Math.cos((lon - lam0) * r);
  const x = globe.radius * Math.cos(lat * r) * Math.sin((lon - lam0) * r);
  const y = -globe.radius * (Math.cos(phi0 * r) * Math.sin(lat * r) - Math.sin(phi0 * r) * Math.cos(lat * r) * Math.cos((lon - lam0) * r));
  return {x, y, visible: c > 0};
};

/** Point at angular distance d (deg) from P along azimuth az (deg). */
const along = (lat: number, lon: number, az: number, d: number) => {
  const r = Math.PI / 180;
  const la = Math.asin(Math.sin(lat * r) * Math.cos(d * r) + Math.cos(lat * r) * Math.sin(d * r) * Math.cos(az * r));
  const lo = lon * r + Math.atan2(Math.sin(az * r) * Math.sin(d * r) * Math.cos(lat * r), Math.cos(d * r) - Math.sin(lat * r) * Math.sin(la));
  return [lo / r, la / r] as [number, number];
};

/**
 * The real Blue Marble globe (pre-rendered in scripts/maps.py) turning toward Kansas, with the ground track of one
 * descending Sentinel-2 pass drawn on top (a diagram: a great circle at the orbit's 98.6 deg inclination) and the
 * satellite moving down it.
 */
export const GlobeShot: React.FC<{start: number; end: number; target: [number, number]; arrive: number; cy?: number}> = ({start, end, target, arrive, cy = 820}) => {
  const {shift, qa} = useBeat();
  const t = useT();
  const sf = Math.round(start * FPS);
  const ef = Math.round(end * FPS);
  if (qa.textOnly) return null;
  const top = cy - globe.size / 2;
  const gf = Math.min(globe.frames.length - 1, Math.max(0, Math.round((t - start) * FPS)));
  const {lam0, phi0} = globe.frames[gf];
  const inc = 98.62;
  const az = 180 - (Math.asin(Math.cos((inc * Math.PI) / 180) / Math.cos((target[1] * Math.PI) / 180)) * 180) / Math.PI;
  const pts: string[] = [];
  let pen = false;
  for (let d = -70; d <= 40; d += 1) {
    const [lo, la] = along(target[1], target[0], az, d);
    const p = project(lo, la, lam0, phi0);
    if (!p.visible) {
      pen = false;
      continue;
    }
    pts.push(`${pen ? 'L' : 'M'}${(CX + p.x).toFixed(1)},${(cy + p.y).toFixed(1)}`);
    pen = true;
  }
  const k = prog(t, start + 0.1, arrive - start - 0.1, ease.inOut);
  const [slo, sla] = along(target[1], target[0], az, mix(-45, 0, k));
  const sp = project(slo, sla, lam0, phi0);
  const tp = project(target[0], target[1], lam0, phi0);
  const drawn = prog(t, start, 0.6, ease.out);
  const box = prog(t, arrive - 0.15, 0.3, ease.out);
  return (
    <>
      <Sequence from={sf === 0 ? 0 : sf - shift} durationInFrames={sf === 0 ? ef - shift : ef - sf} layout="none">
        <OffthreadVideo src={staticFile('sat/globe.mp4')} trimBefore={0} muted style={{position: 'absolute', left: 0, top, width: globe.size, height: globe.size}} />
      </Sequence>
      {t >= start && t < end ? (
        <>
          <Svg>
            <g opacity={drawn}>
              <path d={pts.join(' ')} {...keyStyle} strokeDasharray="6 7" />
              <path d={pts.join(' ')} stroke={olive} strokeWidth={2} fill="none" strokeDasharray="6 7" />
            </g>
            {sp.visible ? (
              <g>
                <circle cx={CX + sp.x} cy={cy + sp.y} r={9} fill={olive} stroke={colors.black} strokeOpacity={0.5} strokeWidth={3} />
                <circle cx={CX + sp.x} cy={cy + sp.y} r={18} fill="none" stroke={olive} strokeWidth={2} opacity={0.6} />
              </g>
            ) : null}
            {box > 0 && tp.visible ? <Line d={bracket(CX + tp.x, cy + tp.y, 18, 8)} opacity={box} /> : null}
          </Svg>
          {sp.visible ? (
            <div data-text="label" style={{position: 'absolute', left: CX + sp.x + 28, top: cy + sp.y - 14, color: colors.white, opacity: drawn, ...type.label, zIndex: 2}}>
              SENTINEL-2
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
};

/** Sentinel-2 field image with a thin olive frame closing on one field, like a photo being taken (image px). */
export const CaptureFrame: React.FC<{x: number; y: number; r: number; at: number; px?: number}> = ({x, y, r, at, px = 1.2}) => {
  const t = useT();
  if (t < at) return null;
  const p = prog(t, at, 0.5, ease.out);
  const s = mix(r * 5, r * 1.3, p);
  const c = Math.min(30, s * 0.3);
  return (
    <g>
      <path d={bracket(x, y, s, c)} {...keyStyle} strokeWidth={5 * px} />
      <path d={bracket(x, y, s, c)} {...lineStyle} strokeWidth={2.4 * px} />
    </g>
  );
};

// ---------- Map zoom to Azerbaijan ----------
type View = {cx: number; cy: number; w: number}; // km (see geo.json), view width in km
const km = (lon: number, lat: number) => [(lon - geo.ref[0]) * geo.kx, (geo.ref[1] - lat) * geo.ky] as [number, number];

/** NASA Blue Marble zooming in on Azerbaijan; Azerbaijan's border (Natural Earth) draws itself as a thin olive line. */
export const MapZoom: React.FC<{start: number; end: number; from: View; to: View; land: number; label: string; screenY?: number}> = ({start, end, from, to, land, label, screenY = 900}) => {
  const {qa} = useBeat();
  const t = useT();
  if (t < start || t >= end) return null;
  const p = prog(t, start, land - start, ease.out);
  const w = Math.exp(mix(Math.log(from.w), Math.log(to.w), p));
  const cx = mix(from.cx, to.cx, p);
  const cy = mix(from.cy, to.cy, p);
  const s = W / w; // px per km
  const toScreen = (x: number, y: number) => [CX + (x - cx) * s, screenY + (y - cy) * s];
  // The 500 m layer fades in once the whole view sits inside it (view width 800 -> 680 km).
  const fine = Math.min(1, Math.max(0, (800 - w) / 120));
  const draw = prog(t, land - 0.35, 0.9, ease.inOut);
  const [bx0, by0, bx1, by1] = geo.aze.bboxKm;
  const [lx, ly] = toScreen((bx0 + bx1) / 2, (by0 + by1) / 2); // the label sits inside the country
  return (
    <>
      {!qa.textOnly ? (
        <div style={{position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: colors.black}}>
          {geo.layers.map((L, i) => {
            const [x0, y0] = km(L.bounds[0], L.bounds[3]);
            const [x1, y1] = km(L.bounds[2], L.bounds[1]);
            const [sx0, sy0] = toScreen(x0, y0);
            const [sx1, sy1] = toScreen(x1, y1);
            return <Img key={L.src} src={staticFile(L.src)} style={{position: 'absolute', left: sx0, top: sy0, width: sx1 - sx0, height: sy1 - sy0, opacity: i === 0 ? 1 : fine}} />;
          })}
        </div>
      ) : null}
      {!qa.textOnly ? (
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', zIndex: 2}}>
          <g transform={`translate(${CX - cx * s}, ${screenY - cy * s}) scale(${s})`}>
            {geo.aze.paths.map((pth, i) => (
              <g key={i}>
                <path d={pth.d} fill="none" stroke={colors.black} strokeOpacity={0.5} strokeWidth={6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
                <path d={pth.d} fill="none" stroke={olive} strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
              </g>
            ))}
          </g>
        </svg>
      ) : null}
      <div data-text="label" style={{position: 'absolute', left: lx, top: ly - 18, transform: 'translateX(-50%)', color: colors.white, opacity: enter(t, land, 0.4), ...type.label, fontSize: 30, zIndex: 2}}>
        {label}
      </div>
    </>
  );
};
export {km};
