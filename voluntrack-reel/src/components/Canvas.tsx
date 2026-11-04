// Canvas particle systems (seeded; no Math.random, no clock time).
import React, {useLayoutEffect, useRef} from 'react';
import {random} from 'remotion';
import {C} from '../theme';
import {EASE, clamp01} from '../motion';

const useCanvas = (draw: (ctx: CanvasRenderingContext2D) => void, deps: unknown[]) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    draw(ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
};

// 2-D value noise + curl (seeded lattice)
const lattice = (ix: number, iy: number, seed: number) => random(`n${seed}-${ix}-${iy}`);
const vnoise = (x: number, y: number, seed: number) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = lattice(ix, iy, seed);
  const b = lattice(ix + 1, iy, seed);
  const c = lattice(ix, iy + 1, seed);
  const d = lattice(ix + 1, iy + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const curl = (x: number, y: number, seed: number) => {
  const e = 0.01;
  const dx = (vnoise(x + e, y, seed) - vnoise(x - e, y, seed)) / (2 * e);
  const dy = (vnoise(x, y + e, seed) - vnoise(x, y - e, seed)) / (2 * e);
  return [dy, -dx];
};

export type Rect = {x: number; y: number; w: number; h: number};

/** ~600 blue particles: the 18+ card breaks up and streams into the star along curl-noise paths. */
export const CardParticles: React.FC<{frame: number; start: number; from: Rect; to: {x: number; y: number}; origin: {x: number; y: number}; count?: number}> = ({
  frame,
  start,
  from,
  to,
  origin,
  count = 600,
}) => {
  const ref = useCanvas(
    (ctx) => {
      const maxD = Math.hypot(from.w, from.h) + Math.hypot(from.x - origin.x, from.y - origin.y);
      for (let i = 0; i < count; i++) {
        const sx = from.x + random(`px${i}`) * from.w;
        const sy = from.y + random(`py${i}`) * from.h;
        const delay = (Math.hypot(sx - origin.x, sy - origin.y) / maxD) * 10 + random(`pd${i}`) * 4;
        const t = clamp01((frame - start - delay) / 26);
        if (frame - start - delay < 0) {
          continue;
        }
        if (t >= 1) continue;
        const e = EASE.vtInOut(t);
        const [cx, cy] = curl(sx / 160 + t * 1.6, sy / 160, 7);
        const amp = 120 * Math.sin(Math.PI * t);
        const x = sx + (to.x - sx) * e + cx * amp;
        const y = sy + (to.y - sy) * e + cy * amp;
        const shimmer = 0.55 + 0.45 * Math.sin(frame * 0.9 + i * 1.7);
        const a = shimmer * (t < 0.08 ? t / 0.08 : 1) * (1 - Math.pow(t, 3));
        const r = (1.2 + random(`pr${i}`) * 2.2) * (1 - 0.5 * t);
        ctx.globalAlpha = a;
        ctx.fillStyle = i % 3 === 0 ? C.glow : C.blue;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    [frame, start],
  );
  return <canvas ref={ref} width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, mixBlendMode: 'screen'}} />;
};

type DotPhase = {
  frame: number;
  collapse: number; // ring appears
  blowout: number; // ring blows out into the field ("students")
  drift: number; // dots start drifting up
  stream: number; // dots stream up into the logo star
  logo: {x: number; y: number};
  center: {x: number; y: number};
  ringR: number;
  /** hero spring progress for the blowout (0..1+, computed by the caller). */
  blow: number;
};

const FIELD = {x0: 96, x1: 984, y0: 316, y1: 990};
const DOTS_N = 600;

/** 36-dot "your followers" ring → ~600-dot field of "students who are looking" → streams into the logo. */
export const DotField: React.FC<DotPhase> = ({frame, collapse, blowout, drift, stream, logo, center, ringR, blow}) => {
  const ref = useCanvas(
    (ctx) => {
      const ringIn = EASE.vtOut(clamp01((frame - collapse - 10) / 14));
      const waveR = Math.max(0, (frame - blowout) * 26);
      for (let i = 0; i < DOTS_N; i++) {
        const isRing = i < 36;
        const ang = isRing ? (i / 36) * Math.PI * 2 : random(`fa${i}`) * Math.PI * 2;
        const rx = center.x + Math.cos(ang) * ringR;
        const ry = center.y + Math.sin(ang) * ringR;
        // field position
        const fx = FIELD.x0 + random(`fx${i}`) * (FIELD.x1 - FIELD.x0);
        const fy = FIELD.y0 + random(`fy${i}`) * (FIELD.y1 - FIELD.y0);
        let x: number;
        let y: number;
        let a: number;
        if (frame < blowout) {
          if (!isRing) continue;
          x = rx;
          y = ry;
          a = ringIn;
        } else {
          const stagger = clamp01((frame - blowout - (isRing ? 0 : random(`fs${i}`) * 6)) / 1);
          const b = blow * stagger;
          const sx = isRing ? rx : center.x;
          const sy = isRing ? ry : center.y;
          x = sx + (fx - sx) * b;
          y = sy + (fy - sy) * b;
          a = isRing ? 1 : clamp01(b * 1.5);
        }
        // drift upward
        if (frame > drift) {
          const dt = (frame - drift) / 60;
          y -= dt * (18 + random(`dv${i}`) * 26);
          x += Math.sin(dt * 2 + i) * 4;
        }
        // stream into the logo star
        let size = isRing ? 5 : 2.2 + random(`fr${i}`) * 2.2;
        if (frame > stream) {
          const d0 = random(`sd${i}`) * 18 + (1 - (y - FIELD.y0) / (FIELD.y1 - FIELD.y0)) * 6;
          const t = clamp01((frame - stream - d0) / 30);
          const e = EASE.vtInOut(t);
          x = x + (logo.x - x) * e;
          y = y + (logo.y - y) * e;
          size *= 1 - 0.8 * e;
          a *= 1 - Math.pow(t, 4);
          if (t >= 1) continue;
        }
        const dist = Math.hypot(x - center.x, y - center.y);
        const lit = frame >= blowout ? clamp01((waveR - dist) / 120) : 0;
        ctx.globalAlpha = a * (0.35 + 0.65 * lit);
        ctx.fillStyle = lit > 0.02 ? (i % 4 === 0 ? C.glow : C.blue) : C.white;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        if (lit > 0.5 && size > 2) {
          ctx.globalAlpha = a * 0.25 * lit;
          ctx.beginPath();
          ctx.arc(x, y, size * 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
    [frame, blow],
  );
  return <canvas ref={ref} width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}} />;
};

/** Paper flecks shed by the splitting wall (and the middleman puff). */
export const Flecks: React.FC<{frame: number; start: number; count: number; origin: (i: number) => {x: number; y: number; vx: number; vy: number}; color: string; dur?: number; seed: string}> = ({
  frame,
  start,
  count,
  origin,
  color,
  dur = 30,
  seed,
}) => {
  const ref = useCanvas(
    (ctx) => {
      const t0 = frame - start;
      if (t0 < 0) return;
      for (let i = 0; i < count; i++) {
        const o = origin(i);
        const t = t0 / dur;
        if (t > 1) continue;
        const x = o.x + o.vx * t0;
        const y = o.y + o.vy * t0 + 0.35 * t0 * t0;
        const s = 3 + random(`${seed}-s${i}`) * 7;
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.fillStyle = color;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(random(`${seed}-r${i}`) * 6 + t0 * 0.2);
        ctx.fillRect(-s / 2, -s / 3, s, (s * 2) / 3);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
    [frame, start],
  );
  return <canvas ref={ref} width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}} />;
};
