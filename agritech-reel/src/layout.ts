// Canvas and positions (px). Instagram Reels safe box: 14% top, 35% bottom, 6% sides.
export const W = 1080;
export const H = 1920;
export const SAFE = {x0: 65, x1: 1015, y0: 269, y1: 1248} as const;
export const CX = W / 2;

// Captions: centred, inside y 1100-1240.
export const CAPTION = {top: 1100, bottom: 1240, maxW: 950} as const;
// Source tag sits just above the captions; labels (ILLUSTRATION, place names) just above it.
export const SOURCE_Y = 1056;
export const LABEL_Y = 1014;
// Big words and numbers: upper half of the safe box.
export const BIG = {top: 300, bottom: 758} as const;
// RUTA mark: top-left inside the safe box, 40% opacity.
export const MARK = {x: SAFE.x0, y: SAFE.y0, h: 34, opacity: 0.4} as const;
// Soft black gradient behind the captions (bottom third and the caption band above it).
export const BOTTOM_SHADE = {from: 820, to: H} as const;
