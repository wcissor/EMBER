// After-world choreography: camera and the star's journey (section 3 "Its jobs, in order").
import {interpolate} from 'remotion';
import {B} from '../data';
import {COLUMN, END, FEED, ROLE_CARD, SHEET_PARTS, SPEAKER_TAG, feedCardY} from '../layout';
import {EASE, clamp01, ease, springAt} from '../motion';
import {LOGO} from '../logoData';

export type Cam = {s: number; ox: number; oy: number};
const ORIGIN = {x: 540, y: COLUMN.y + COLUMN.h / 2};

/** Stage → screen. */
export const toScreen = (cam: Cam, x: number, y: number) => ({x: cam.ox + cam.s * (x - cam.ox), y: cam.oy + cam.s * (y - cam.oy)});
export const toStage = (cam: Cam, x: number, y: number) => ({x: cam.ox + (x - cam.ox) / cam.s, y: cam.oy + (y - cam.oy) / cam.s});

/** Apply pill centre on the eco card (feed slot 0), stage coordinates. */
export const ECO_PILL = {
  x: FEED.x + ROLE_CARD.apply.x + ROLE_CARD.apply.w / 2,
  y: feedCardY(0) + ROLE_CARD.apply.y + ROLE_CARD.apply.h / 2,
};
export const ECO_GLYPH = {x: ECO_PILL.x - 38, y: ECO_PILL.y};

export const arcStart = () => B.applyTap - 24;

/** The camera pushes 1.00 → 1.02 across each shot; it eases toward the eco card before Apply. */
export const afterCam = (frame: number): Cam => {
  const push = (a: number, b: number) => 1 + 0.02 * clamp01((frame - a) / Math.max(1, b - a));
  const a0 = B.split;
  const camIn = B.applyTap - 26;
  const sheetDone = B.sheetExpand + 30;
  if (frame < camIn) return {s: push(a0, camIn), ox: ORIGIN.x, oy: ORIGIN.y};
  if (frame < B.sheetExpand) {
    const t = EASE.vtInOut(clamp01((frame - camIn) / 26));
    return {s: interpolate(t, [0, 1], [1.02, 1.08]), ox: interpolate(t, [0, 1], [ORIGIN.x, ECO_PILL.x - 120]), oy: interpolate(t, [0, 1], [ORIGIN.y, ECO_PILL.y])};
  }
  if (frame < sheetDone) {
    const t = EASE.vtInOut(clamp01((frame - B.sheetExpand) / 30));
    return {s: interpolate(t, [0, 1], [1.08, 1.0]), ox: interpolate(t, [0, 1], [ECO_PILL.x - 120, ORIGIN.x]), oy: interpolate(t, [0, 1], [ECO_PILL.y, ORIGIN.y])};
  }
  if (frame < B.flip) return {s: push(sheetDone, B.flip), ox: ORIGIN.x, oy: ORIGIN.y};
  if (frame < B.flip + 24) {
    const t = EASE.vtInOut(clamp01((frame - B.flip) / 24));
    return {s: interpolate(t, [0, 1], [1.02, 1.0]), ox: ORIGIN.x, oy: ORIGIN.y};
  }
  if (frame < B.logoRise) return {s: push(B.flip + 24, B.logoRise), ox: ORIGIN.x, oy: ORIGIN.y};
  const t = EASE.vtInOut(clamp01((frame - B.logoRise) / 40));
  return {s: interpolate(t, [0, 1], [1.02, 1.0]), ox: ORIGIN.x, oy: ORIGIN.y};
};

export type StarPose = {x: number; y: number; size: number; flare: number; squashY: number; glint: number; opacity: number};

const HOME = {x: SPEAKER_TAG.x, y: SPEAKER_TAG.y};
// tip-to-tip size of the star inside the end-card logo (tips at LOGO.tip% of the disc radius)
const LOGO_STAR = END.logo.h * (LOGO.tip / 100);

const bez = (t: number, a: {x: number; y: number}, c: {x: number; y: number}, b: {x: number; y: number}) => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});

export const HEADER_STAR = {x: SHEET_PARTS.header.x + 20, y: SHEET_PARTS.header.y + 30};

export const starPose = (frame: number): StarPose => {
  const base: StarPose = {x: HOME.x, y: HOME.y, size: 72, flare: 0, squashY: 1, glint: 1, opacity: 1};
  if (frame < B.lightPoint) return {...base, opacity: 0, size: 0};
  if (frame < B.yes) {
    const t = EASE.vtOut(clamp01((frame - B.lightPoint) / 12));
    return {...base, size: 4 + 8 * t, flare: 0.1, glint: 0.4 * t};
  }
  if (frame < B.gridFade) {
    const s = springAt(frame, B.yes, 'hero');
    return {...base, size: 12 + 128 * s, flare: 0.9 * s, glint: 1.4};
  }
  if (frame < arcStart()) {
    const t = EASE.vtInOut(clamp01((frame - B.gridFade) / 40));
    return {...base, size: interpolate(t, [0, 1], [140, 72]), flare: 0.9 * (1 - t)};
  }
  const cam = afterCam(frame);
  if (frame < B.applyTap) {
    const t = EASE.vtInOut(clamp01((frame - arcStart()) / 24));
    const end = toScreen(cam, ECO_GLYPH.x, ECO_GLYPH.y);
    const ctrl = {x: HOME.x + 260, y: Math.min(HOME.y, end.y) - 160};
    const p = bez(t, HOME, ctrl, end);
    return {...base, ...p, size: interpolate(t, [0, 1], [72, 30]), glint: 1 - 0.6 * t};
  }
  if (frame < B.sheetExpand) {
    const p = toScreen(cam, ECO_GLYPH.x, ECO_GLYPH.y);
    return {...base, ...p, size: 30, glint: 0.4};
  }
  if (frame < B.flip) {
    const t = EASE.vtInOut(clamp01((frame - B.sheetExpand) / 30));
    const from = toScreen(cam, ECO_GLYPH.x, ECO_GLYPH.y);
    const to = toScreen(cam, HEADER_STAR.x, HEADER_STAR.y);
    const wink = frame >= B.wink && frame < B.wink + 8 ? 1 - 0.45 * Math.sin((Math.PI * (frame - B.wink)) / 8) : 1;
    return {...base, x: interpolate(t, [0, 1], [from.x, to.x]), y: interpolate(t, [0, 1], [from.y, to.y]), size: interpolate(t, [0, 1], [30, 52]), glint: 0.4 + 0.3 * t, squashY: wink};
  }
  if (frame < B.logoRise) {
    const t = EASE.vtInOut(clamp01((frame - B.flip) / 24));
    const from = toScreen(afterCam(B.flip), HEADER_STAR.x, HEADER_STAR.y);
    return {...base, x: interpolate(t, [0, 1], [from.x, HOME.x]), y: interpolate(t, [0, 1], [from.y, HOME.y]), size: interpolate(t, [0, 1], [52, 72]), glint: 0.7 + 0.3 * t};
  }
  const t = EASE.vtInOut(clamp01((frame - B.logoRise) / 40));
  const pulse = frame >= B.vtWord ? Math.exp(-(frame - B.vtWord) / 10) * Math.sin(clamp01((frame - B.vtWord) / 6) * Math.PI) : 0;
  return {
    ...base,
    x: HOME.x,
    y: interpolate(t, [0, 1], [HOME.y, END.logo.cy]),
    size: interpolate(t, [0, 1], [72, LOGO_STAR]) * (1 + 0.14 * pulse),
    flare: 0.25 * pulse,
    glint: 1 - 0.7 * clamp01((frame - B.logoResolve + 24) / 24),
  };
};

export {ease};
