// Every position in the film (section 3). Pure data; scripts/qa/safe-box.ts asserts the readable boxes.

export type Box = {x0: number; y0: number; x1: number; y1: number};
export const box = (x: number, y: number, w: number, h: number): Box => ({x0: x, y0: y, x1: x + w, y1: y + h});

/** Instagram Reels safe zone: 14% top, 35% bottom, 6% sides. */
export const SAFE: Box = {x0: 65, y0: 269, x1: 1015, y1: 1248};
export const STAGE = {y0: 300, y1: 1000};
export const SPEAKER_TAG = {x: 540, y: 1020, size: 72};
export const RAIL: Box = {x0: 65, y0: 1060, x1: 1015, y1: 1240};
export const RAIL_BIG: Box = {x0: 65, y0: 1036, x1: 1015, y1: 1240}; // the L07 "big ink pill"

// ── Before world ──
export const POST_CARD = {cx: 540, cy: 655, w: 760, h: 950};
/** Card-local anatomy (0..760 × 0..950). */
export const POST = {
  header: {h: 112, avatar: {cx: 60, cy: 58, r: 30}, bars: [{x: 108, y: 38, w: 210, h: 18}, {x: 108, y: 68, w: 130, h: 14}]},
  image: {x: 24, y: 112, w: 712, h: 588, r: 18},
  poster: {x: 56, y: 146, w: 648, size: 104},
  sub: {x: 56, y: 372, size: 40},
  button: {x: 56, y: 382, w: 360, h: 92},
  art: {cx: 380, cy: 556, size: 250},
  footer: {heart: {x: 40, y: 742, s: 44}, bars: [{x: 104, y: 750, w: 420, h: 18}, {x: 104, y: 782, w: 290, h: 14}, {x: 40, y: 836, w: 640, h: 14}, {x: 40, y: 866, w: 520, h: 14}]},
};
/** Readable before-world boxes on the hook card at rest (film coordinates). */
export const HOOK_TEXT: Box = box(160 + 56, 180 + 146, 648, 280);
export const HERO_STAMP_BOX: Box = box(190, 470, 700, 330);
export const DM_CARD = {cx: 540, cy: 640, w: 760, h: 560};
export const DM_TEXT: Box = box(250, 520, 600, 220);

// ── After world ──
export const COLUMN = {x: 80, y: 300, w: 920, h: 700, r: 36};
export const CHECK_BADGE = {cx: 540, cy: 300, r: 30};
export const FILTER_BAR = {y0: 300, y1: 380, ageChip: box(96, 312, 172, 56), categoryChip: box(284, 312, 300, 56), toggle: box(708, 312, 276, 56)};
export const FEED = {x: 80, y0: 410, y1: 1000, cardW: 920, cardH: 176, gap: 16, maskFrom: 930, maskTo: 1004};
export const feedCardY = (i: number) => FEED.y0 + i * (FEED.cardH + FEED.gap);
export const ROLE_CARD = {
  pad: 28,
  title: {x: 28, y: 22},
  chips: {x: 28, y: 80, h: 44, gap: 10},
  status: {x: 28, y: 136},
  apply: {x: 920 - 28 - 168, y: (176 - 60) / 2, w: 168, h: 60},
};
export const AGE_FIELD = {cx: 540, cy: 650, w: 760, h: 128, labelY: 556};
export const SHEET = {x: 80, y: 300, w: 920, h: 700};
export const SHEET_PARTS = {
  header: {x: 152, y: 336},
  diagram: {y: 470, youX: 220, formX: 860, middleX: 540},
  fields: {x: 120, y0: 560, step: 132, w: 840, h: 72},
};
export const ORG_CARD = {x: 80, y: 300, w: 920, h: 700};
export const ORG_PARTS = {
  title: {x: 128, y: 334},
  fields: {x: 128, y0: 420, step: 88},
  footer: {y: 900},
};
export const DOTS = {cx: 540, cy: 640, ringR: 150, labelY: 880};

// ── End card ──
export const END = {
  logo: {cx: 540, cy: 370, h: 140},
  headline: box(65, 470, 950, 213),
  url: box(65, 720, 950, 60),
  qr: {cx: 540, y0: 810, size: 300},
  cta: box(65, 1135, 950, 105),
};

/** Readable boxes, asserted against SAFE by scripts/qa/safe-box.ts. */
export const READABLE: Record<string, Box> = {
  captionRail: RAIL,
  captionRailBig: RAIL_BIG,
  speakerTag: box(SPEAKER_TAG.x - 48, SPEAKER_TAG.y - 48, 96, 96),
  hookPosterText: HOOK_TEXT,
  heroStamp: HERO_STAMP_BOX,
  dmText: DM_TEXT,
  filterAgeChip: FILTER_BAR.ageChip,
  filterCategoryChip: FILTER_BAR.categoryChip,
  filterToggle: FILTER_BAR.toggle,
  feedCard0: box(FEED.x, feedCardY(0), FEED.cardW, FEED.cardH),
  feedCard1: box(FEED.x, feedCardY(1), FEED.cardW, FEED.cardH),
  feedCard2: box(FEED.x, feedCardY(2), FEED.cardW, FEED.cardH),
  ageFieldLabel: box(AGE_FIELD.cx - 380, AGE_FIELD.labelY - 28, 760, 56),
  ageField: box(AGE_FIELD.cx - AGE_FIELD.w / 2, AGE_FIELD.cy - AGE_FIELD.h / 2, AGE_FIELD.w, AGE_FIELD.h),
  sheet: box(SHEET.x, SHEET.y, SHEET.w, SHEET.h),
  orgCard: box(ORG_CARD.x, ORG_CARD.y, ORG_CARD.w, ORG_CARD.h),
  dotsLabel: box(DOTS.cx - 360, DOTS.labelY - 30, 720, 60),
  endLogo: box(END.logo.cx - 70, END.logo.cy - 70, 140, 140),
  endHeadline: END.headline,
  endUrl: END.url,
  endQr: box(END.qr.cx - END.qr.size / 2, END.qr.y0, END.qr.size, END.qr.size),
  endCta: END.cta,
};

/** Before-world card flights: [x, y, rotation°]. Shared by the composition and the audio mixer (pans). */
export type Pose3 = [number, number, number];
export const BEFORE_CARDS = {
  hook: {to: [540, 655, -3] as Pose3},
  youth: {from: [1380, 360, 18] as Pose3, to: [568, 690, 4] as Pose3},
  apply: {from: [-430, 1010, -22] as Pose3, to: [515, 632, -5] as Pose3},
  dm: {from: [1540, 640, 10] as Pose3, to: [540, 640, 2] as Pose3},
  barrage: [
    [[540, -760, -20], [310, 430, -8]],
    [[1680, 760, 25], [810, 500, 7]],
    [[480, 2700, 15], [330, 1430, 5]],
    [[-640, 1150, -25], [240, 960, -6]],
    [[1650, 1350, 20], [860, 1180, 8]],
    [[1500, 2650, 30], [790, 1580, -4]],
    [[-560, -480, -30], [560, 300, 3]],
  ] as [Pose3, Pose3][],
  wall: [
    [200, 1760, 6], [880, 250, -5], [150, 300, 4], [930, 1000, -7], [540, 1850, 3], [180, 1240, -3],
    [900, 1780, 5], [560, 1090, -2], [380, 700, 6], [720, 820, -6], [520, 1550, 4], [300, 1010, -5],
  ] as Pose3[],
};
