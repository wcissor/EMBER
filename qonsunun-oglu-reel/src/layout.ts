// Positions (section 3). Pure data: imported by the film and by the QA scripts (scripts/qa/safe-box.mjs).
// Screen space is 1080×1920. World space is the courtyard set in world units (wu); the camera maps it to the screen.

export const W = 1080;
export const H = 1920;

/** Instagram Reels safe zone: everything a viewer must read stays inside it. */
export const SAFE = {x0: 65, y0: 269, x1: 1015, y1: 1248};
/** Every pose, gesture or window that carries a joke happens here, so captions never cover it. */
export const ACTION = {y0: 300, y1: 1040};
/** Caption rail: speaker tag + up to two lines. */
export const RAIL = {y0: 1080, y1: 1240};

export type Box = {x: number; y: number; w: number; h: number};

// ───────────────────────────── Text (screen space) ─────────────────────────────
/** Title: Barlow Condensed 800, y 380–510. English is set smaller so it fits the safe box (measured: 993 px at 132). */
export const TITLE = {y: 380, h: 130, size: {az: 132, en: 124}, sub: {y: 528, h: 40, size: 32}};

/** Captions: tag (Inter 600 28, caps) then up to two lines of Inter 700 60 / 1.15. Bottom of line 2 = 1242. */
export const CAPTION = {x0: 90, x1: 990, tagY: 1072, tagH: 28, lineY: 1104, size: 60, lineH: 69, maxLines: 2};

/** End card (section 3): headline y 980–1080, URL y 1095–1150, CTA y 1170–1240. */
export const END = {
  line: {y0: 980, y1: 1080, size: 100},
  url: {y0: 1095, y1: 1150, size: 52},
  cta: {y0: 1170, y1: 1240, size: 44},
  /** the site's QR code, under the CTA (231 px tile) */
  qr: {y0: 1262},
};

/** The UI moment (glass on deep navy). Cards 920×176. */
export const UI = {
  x: 80,
  w: 920,
  age: {y: 330, h: 200},
  cards: [560, 760, 960] as const,
  cardH: 176,
  radius: 36,
};

/** The constellation (S7): one long row of blocks y 300–940, windows on a 36×44 grid, star 640 px at (540, 620). */
export const ROW = {y0: 300, y1: 940, cellW: 36, cellH: 44};
export const STAR = {cx: 540, cy: 620, size: 640};

/** Every text box the film draws in screen space, per language (QA asserts each sits inside SAFE). */
export const textBoxes = (widths: Record<string, number>): {id: string; box: Box}[] => {
  const centred = (id: string, y: number, h: number) => {
    const w = widths[id] ?? 0;
    return {id, box: {x: W / 2 - w / 2, y, w, h}};
  };
  return [
    centred('title', TITLE.y, TITLE.h),
    centred('titleSub', TITLE.sub.y, TITLE.sub.h),
    {id: 'captionTag', box: {x: CAPTION.x0, y: CAPTION.tagY, w: CAPTION.x1 - CAPTION.x0, h: CAPTION.tagH}},
    {id: 'captionLines', box: {x: CAPTION.x0, y: CAPTION.lineY, w: CAPTION.x1 - CAPTION.x0, h: CAPTION.lineH * CAPTION.maxLines}},
    centred('endLine', END.line.y0, END.line.y1 - END.line.y0),
    centred('url', END.url.y0, END.url.y1 - END.url.y0),
    {id: 'cta', box: {x: W / 2 - (widths.cta ?? 0) / 2 - 40, y: END.cta.y0, w: (widths.cta ?? 0) + 80 + 60, h: END.cta.y1 - END.cta.y0}},
    {id: 'uiAge', box: {x: UI.x, y: UI.age.y, w: UI.w, h: UI.age.h}},
    ...UI.cards.map((y, i) => ({id: `uiCard${i}`, box: {x: UI.x, y, w: UI.w, h: UI.cardH}})),
  ];
};

// ───────────────────────────── World (courtyard set, wu) ─────────────────────────────
// Two 9-storey panel blocks face each other across a courtyard. The camera's focus point sits at FOCUS on screen.
export const FOCUS = {x: 540, y: 670};

export const WORLD = {
  ground: 2000,
  plinth: 70,
  floorH: 180,
  floors: 9,
  colW: 170,
  margin: 25,
  parapet: 26,
  win: {w: 124, h: 108, sill: 50},
};

export type BlockDef = {id: 'L' | 'R'; x0: number; cols: number};
export const BLOCKS: BlockDef[] = [
  {id: 'L', x0: 0, cols: 7},
  {id: 'R', x0: 1660, cols: 7},
];
export const GAP = {x0: 1240, x1: 1660};

export const blockWidth = (b: BlockDef) => b.cols * WORLD.colW + 2 * WORLD.margin;
export const colCenter = (b: BlockDef, c: number) => b.x0 + WORLD.margin + WORLD.colW * c + WORLD.colW / 2;
/** Floor k (1..9): top and bottom y. */
export const floorBottom = (k: number) => WORLD.ground - WORLD.plinth - (k - 1) * WORLD.floorH;
export const floorTop = (k: number) => floorBottom(k) - WORLD.floorH;
export const roofY = () => floorTop(WORLD.floors);
/** Window opening rect for block b, column c, floor k. */
export const windowRect = (b: BlockDef, c: number, k: number): Box => {
  const cx = colCenter(b, c);
  const bottom = floorBottom(k) - WORLD.win.sill;
  return {x: cx - WORLD.win.w / 2, y: bottom - WORLD.win.h, w: WORLD.win.w, h: WORLD.win.h};
};
export const block = (id: 'L' | 'R') => BLOCKS.find((b) => b.id === id)!;

/** Story places: block, column, floor. */
export const PLACES = {
  anaBalcony: {b: 'L', c: 6, k: 4},
  kidRoom: {b: 'L', c: 5, k: 4},
  deed1: {b: 'L', c: 5, k: 7},
  deed2: {b: 'L', c: 5, k: 6},
  deed3: {b: 'L', c: 5, k: 5},
  son: {b: 'R', c: 1, k: 4},
  winA: {b: 'R', c: 1, k: 5},
  winB: {b: 'R', c: 1, k: 6},
  winC: {b: 'R', c: 1, k: 7},
  winD: {b: 'R', c: 1, k: 8},
  qonsuBalcony: {b: 'R', c: 0, k: 5},
} as const;
export type PlaceId = keyof typeof PLACES;
export const placeRect = (p: PlaceId) => {
  const pl = PLACES[p];
  return windowRect(block(pl.b), pl.c, pl.k);
};
export const placeCenter = (p: PlaceId) => {
  const r = placeRect(p);
  return {x: r.x + r.w / 2, y: r.y + r.h / 2};
};

/** Interior stage coordinates: every story window is drawn in a 1000×871 local box, scaled into the opening. */
export const STAGE = {w: 1000, h: 871};
export const stageScale = WORLD.win.w / STAGE.w; // 0.124 wu per stage unit

/** Balcony box (in front of the facade) for a column/floor: x, y, w, h in wu. */
export const balconyRect = (b: BlockDef, c: number, k: number): Box => {
  const cx = colCenter(b, c);
  const w = WORLD.colW - 18;
  const top = floorTop(k) + 14;
  const bottom = floorBottom(k) + 10;
  return {x: cx - w / 2, y: top, w, h: bottom - top};
};

/** Parallax factors (section 4). */
export const PARALLAX = {sky: 0.1, far: 0.3, yard: 0.7, near: 1, fore: 1.3};
/** The camera position where every layer lines up as designed (the S6 wide). */
export const CAM_REF = {x: 1365, y: 1250};
