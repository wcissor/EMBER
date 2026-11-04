// The world camera (section 4): keyframed moves resolved from the beats, plus drift and push so held shots never
// freeze. Pure functions (the QA scripts import them to find where world-anchored text and jokes land on screen).
import {spring} from 'remotion';
import {FPS} from './config.ts';
import {CAM_REF, FOCUS, placeCenter, colCenter, block, floorBottom} from './layout.ts';

export type Cam = {x: number; y: number; z: number};
type Ease = 'settle' | 'whip' | 'inOut' | 'crane' | 'ui' | 'cut';
type Key = {f: number; x: number; y: number; z: number; ease?: Ease};

const bez = (x1: number, y1: number, x2: number, y2: number) => (t: number) => {
  // cubic-bezier solve (Newton + bisection)
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sy = (u: number) => ((ay * u + by) * u + cy) * u;
  let u = t;
  for (let i = 0; i < 8; i++) {
    const x = sx(u) - t;
    const d = (3 * ax * u + 2 * bx) * u + cx;
    if (Math.abs(x) < 1e-6 || Math.abs(d) < 1e-6) break;
    u -= x / d;
  }
  u = Math.max(0, Math.min(1, u));
  return sy(u);
};
export const EASES: Record<Ease, (t: number) => number> = {
  whip: bez(0.7, 0, 0.3, 1),
  inOut: bez(0.65, 0, 0.35, 1),
  crane: bez(0.65, 0, 0.35, 1),
  ui: bez(0.16, 1, 0.3, 1),
  settle: (t: number) => t, // replaced by the real spring in evalKeys (needs the duration)
  cut: (t: number) => (t >= 1 ? 1 : 0),
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const evalKeys = (keys: Key[], f: number): Cam => {
  if (f <= keys[0].f) return {x: keys[0].x, y: keys[0].y, z: keys[0].z};
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (f <= b.f) {
      const t = clamp01((f - a.f) / Math.max(1e-6, b.f - a.f));
      const ease = b.ease ?? 'inOut';
      const e =
        ease === 'settle'
          ? spring({frame: f - a.f, fps: FPS, config: {damping: 200, stiffness: 120, mass: 1}, durationInFrames: Math.max(1, b.f - a.f)})
          : EASES[ease](t);
      return {x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), e))};
    }
  }
  const l = keys[keys.length - 1];
  return {x: l.x, y: l.y, z: l.z};
};

const hold = (k: Key, f: number): Key => ({...k, f, ease: 'cut'});

/** World shots: the frame ranges in which the courtyard set is on screen, with their keyframes. */
export const worldTrack = (B: Record<string, number>) => {
  const L = block('L');
  const ana = {x: colCenter(L, 6) - 20, y: 1290};
  const son = placeCenter('son');
  const A = placeCenter('winA'), Bw = placeCenter('winB'), Cw = placeCenter('winC'), D = placeCenter('winD');
  const kid = placeCenter('kidRoom');
  const d1 = placeCenter('deed1'), d2 = placeCenter('deed2'), d3 = placeCenter('deed3');
  const qonsu = {x: colCenter(block('R'), 0) - 8, y: floorBottom(5) - 82};

  const s1: Key[] = [
    {f: 0, x: ana.x + 18, y: ana.y - 8, z: 4.3},
    {f: B.whipStart, x: ana.x + 24, y: ana.y - 8, z: 4.32, ease: 'settle'},
    {f: B.whipLand, x: son.x, y: son.y - 30, z: 3.95, ease: 'whip'},
  ];
  const s2: Key[] = [
    {f: B.winA - 3, x: son.x, y: son.y - 30, z: 3.95},
    {f: B.winA + 13, x: A.x, y: A.y, z: 4.0, ease: 'settle'},
    {f: B.winB - 12, x: A.x, y: A.y, z: 4.0, ease: 'cut'},
    {f: B.winB + 3, x: Bw.x, y: Bw.y, z: 4.0, ease: 'settle'},
    {f: B.winC - 12, x: Bw.x, y: Bw.y, z: 4.0, ease: 'cut'},
    {f: B.winC + 3, x: Cw.x, y: Cw.y, z: 4.0, ease: 'settle'},
    {f: B.winD - 12, x: Cw.x, y: Cw.y, z: 4.0, ease: 'cut'},
    {f: B.winD + 3, x: D.x, y: D.y, z: 4.0, ease: 'settle'},
    {f: B.rays2, x: D.x, y: D.y, z: 4.0, ease: 'cut'},
    {f: B.rays2 + 26, x: son.x, y: (A.y + D.y) / 2, z: 1.05, ease: 'inOut'},
  ];
  const s3: Key[] = [
    {f: B.whipBack, x: son.x, y: (A.y + D.y) / 2, z: 1.05},
    {f: B.whipBack + 12, x: kid.x, y: kid.y - 1.5, z: 6.25, ease: 'whip'},
    {f: B.push, x: kid.x, y: kid.y - 1.5, z: 6.25, ease: 'cut'},
    // the push through the door (the room's door, stage x 890 / 1000, y 500 / 871)
    {f: B.push + 9, x: kid.x - 62 + 110, y: kid.y - 54 + 62, z: 60, ease: 'inOut'},
  ];
  const s5: Key[] = [
    {f: B.cardLand - 2, x: d1.x, y: d1.y, z: 4.0},
    {f: B.deed2 - 9, x: d1.x, y: d1.y, z: 4.0, ease: 'cut'},
    {f: B.deed2 + 4, x: d2.x, y: d2.y, z: 4.0, ease: 'settle'},
    {f: B.deed3 - 9, x: d2.x, y: d2.y, z: 4.0, ease: 'cut'},
    {f: B.deed3 + 4, x: d3.x, y: d3.y, z: 4.0, ease: 'settle'},
    {f: B.bedroomBlue - 8, x: d3.x, y: d3.y, z: 4.0, ease: 'cut'},
    {f: B.bedroomBlue + 4, x: kid.x, y: kid.y + 10, z: 3.4, ease: 'settle'},
    {f: B.wide - 14, x: kid.x, y: kid.y + 10, z: 3.4, ease: 'cut'},
    {f: B.wide, x: CAM_REF.x, y: CAM_REF.y, z: 1.05, ease: 'inOut'},
  ];
  const s6: Key[] = [
    {f: B.wide, x: CAM_REF.x, y: CAM_REF.y, z: 1.05},
    {f: B.qqPoint + 2, x: CAM_REF.x, y: CAM_REF.y, z: 1.05, ease: 'cut'},
    {f: B.qqPoint + 16, x: qonsu.x, y: qonsu.y, z: 3.1, ease: 'inOut'},
    {f: B.anaBurst - 7, x: qonsu.x - 6, y: qonsu.y, z: 3.2, ease: 'settle'},
    {f: B.anaBurst + 6, x: colCenter(L, 6) - 85, y: 1282, z: 2.4, ease: 'whip'},
    {f: B.kidStep, x: colCenter(L, 6) - 85, y: 1282, z: 2.4, ease: 'cut'},
    {f: B.crane, x: colCenter(L, 5) + 30, y: 1270, z: 3.0, ease: 'inOut'},
  ];
  return {s1, s2, s3, s5, s6};
};

export type WorldShot = {id: string; from: number; to: number; keys: Key[]; drift: [number, number]};

/** The world shots in order (frames are inclusive-exclusive). */
export const worldShots = (B: Record<string, number>): WorldShot[] => {
  const t = worldTrack(B);
  return [
    {id: 's1', from: 0, to: 96, keys: t.s1, drift: [7, -3]},
    {id: 's2', from: 96, to: B.whipBack, keys: t.s2, drift: [0, -8]},
    {id: 's3', from: B.whipBack, to: B.push + 9, keys: t.s3, drift: [-6, 2]},
    {id: 's5', from: B.cardLand - 2, to: B.wide, keys: t.s5, drift: [0, 6]},
    {id: 's6', from: B.wide, to: B.crane + 1, keys: t.s6, drift: [5, -2]},
  ];
};

/** Camera at frame f (fractional allowed) for a world shot. Drift 6–12 px/s and a push 1.00 → 1.04 per shot. */
export const camAt = (shot: WorldShot, f: number): Cam => {
  const c = evalKeys(shot.keys, f);
  const u = clamp01((f - shot.from) / Math.max(1, shot.to - shot.from));
  const secs = (f - shot.from) / FPS;
  const push = 1 + 0.04 * u;
  const z = c.z * push;
  return {x: c.x + (shot.drift[0] * secs) / z, y: c.y + (shot.drift[1] * secs) / z, z};
};

/** Layer camera for parallax factor p (uniform zoom; translation scaled by p around CAM_REF). */
export const layerCam = (cam: Cam, p: number): Cam => ({x: CAM_REF.x + p * (cam.x - CAM_REF.x), y: CAM_REF.y + p * (cam.y - CAM_REF.y), z: cam.z});

/** World point → screen point for a layer camera. */
export const project = (cam: Cam, wx: number, wy: number) => ({x: (wx - cam.x) * cam.z + FOCUS.x, y: (wy - cam.y) * cam.z + FOCUS.y});

/** The visible world rect for a layer camera (with margin in screen px). */
export const viewRect = (cam: Cam, marginPx = 0) => ({
  x0: cam.x + (-FOCUS.x - marginPx) / cam.z,
  x1: cam.x + (1080 - FOCUS.x + marginPx) / cam.z,
  y0: cam.y + (-FOCUS.y - marginPx) / cam.z,
  y1: cam.y + (1920 - FOCUS.y + marginPx) / cam.z,
});

/** SVG transform for a layer camera. */
export const camTransform = (cam: Cam) => `translate(${FOCUS.x} ${FOCUS.y}) scale(${cam.z}) translate(${-cam.x} ${-cam.y})`;

/** Frames where the world gets camera motion blur (whips, the push, the crane). */
export const blurRanges = (B: Record<string, number>): [number, number][] => [
  [B.whipStart + 1, B.whipLand + 1],
  [B.whipBack + 1, B.whipBack + 13],
  [B.push + 1, B.push + 10],
  [B.anaBurst - 6, B.anaBurst + 7],
];
