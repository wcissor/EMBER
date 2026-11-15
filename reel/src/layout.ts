// Canvas, safe box, grid and every position in the reel. All y values sit on the 8 px baseline.
export const W = 1080;
export const H = 1920;
export const CX = W / 2;

// Instagram Reels safe box: 14% top, 35% bottom, 6% sides. Everything a viewer must read stays inside.
export const SAFE = {x0: 65, y0: 269, x1: 1015, y1: 1248} as const;

// 6 columns, 72 px margins, 24 px gutters, 8 px baseline.
export const GRID = {margin: 72, gutter: 24, cols: 6, colW: 136, baseline: 8} as const;
export const col = (i: number) => GRID.margin + i * (GRID.colW + GRID.gutter);
export const span = (n: number) => n * GRID.colW + (n - 1) * GRID.gutter;
export const CONTENT = {x0: 72, x1: 1008, w: 936} as const;

// Captions: top-anchored block, two lines at most (54 px x 1.15 leading = 124 px tall).
export const CAPTION = {x: 72, y: 1088, w: 936} as const;

// The "received" strip (S2 and S6 share it, so it returns in the same place).
export const STRIP = {y: 944, labelY: 904, x0: 80, pitch: 24, size: 8, slots: 39} as const;

export const S1 = {
  rows: Array.from({length: 10}, (_, k) => 72 + k * 104),
  rowTop: 296,
  rowBottom: 1040,
  sensor: {x: 540, y: 952},
  pathTop: 336,
  packetStart: 936,
  label: {x: 568, y: 940},
} as const;

export const S2 = {
  pathY: 600,
  sensorX: [296, 120] as const, // before / after the path stretches
  receiverX: [784, 960] as const,
  rows: [264, 352, 440, 528, 616, 704, 792],
  rowBase: 760,
  rowTop: 520,
  rain: {x0: 120, x1: 960, y0: 336, y1: 864},
  labels: {distance: {y: 472}, crops: {y: 784}, weather: {y: 304}, ends: {y: 632}},
} as const;

export const S3 = {
  device: {cx: CX, top: 440, w: 208, h: 264, antennaTop: 312, poleTo: 792},
  name: {y: 824},
  by: {y: 968, logoH: 44},
} as const;

export const S4 = {
  rowA: 480,
  rowB: 720,
  labelX: 72,
  waveX0: 192,
  waveX1: 640,
  contactX: 672,
  pivot: {x: 800, y: 600},
  outX1: 1008,
  box: {x0: 648, y0: 400, x1: 936, y1: 800},
} as const;

export const S5 = {
  now: 432,
  graph: {top: 352, axis: 624, level: 448, dip: 128},
  device: {cx: 216, top: 760, w: 160, h: 200, antennaTop: 696},
  outY: 880,
} as const;

export const S6 = {
  cloud: {c1: [430, 500, 60], c2: [540, 455, 100], c3: [655, 495, 65], base: 560},
  strike: {x0: 330, y0: 640, x1: 750, y1: 336},
  label: {y: 584},
} as const;

export const S7 = {
  logo: {w: 480, y: 560},
  name: {y: 744},
  line: {y: 888},
  handle: {y: 984},
} as const;
