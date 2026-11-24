// Colours, type and light (section 3). Blue and blueCore belong to VolunTrack only (gate 9 checks their use).

export const C = {
  skyTop: '#080D1C',
  skyHorizon: '#16204A',
  facade: '#121A2E',
  seam: '#1C2540', // facade, 8% lighter
  shadow: '#05070F',
  amber: '#FFB45C',
  amberEdge: '#FF8A2B',
  blue: '#2F6BFF',
  blueCore: '#CFE0FF',
  eye: '#F5F7FF',
  muted: '#8D9AC0',
  // warm neutrals for ordinary life (never blue)
  tvWarm: '#FFD9A0',
  phoneWhite: '#F2F0EA',
  curtain: '#FFE7C2',
  pvc: '#C9CBD2',
  wood: '#5A4636',
  alu: '#8E96A6',
};

export const FONT = {
  title: "'Barlow Condensed', 'Inter Tight', sans-serif",
  ui: "'Inter', system-ui, sans-serif",
};

export const TYPE = {
  title: {fontFamily: FONT.title, fontWeight: 800, fontSize: 132, letterSpacing: '-0.01em', lineHeight: 0.95, textTransform: 'uppercase' as const},
  endLine: {fontFamily: FONT.title, fontWeight: 800, fontSize: 100, letterSpacing: '-0.01em', lineHeight: 0.95},
  caption: {fontFamily: FONT.ui, fontWeight: 700, fontSize: 60, lineHeight: 1.15},
  speaker: {fontFamily: FONT.ui, fontWeight: 600, fontSize: 28, letterSpacing: '0.14em', textTransform: 'uppercase' as const},
  url: {fontFamily: FONT.ui, fontWeight: 600, fontSize: 52},
  sub: {fontFamily: FONT.ui, fontWeight: 600, fontSize: 32},
  roleTitle: {fontFamily: FONT.ui, fontWeight: 600, fontSize: 40},
  chip: {fontFamily: FONT.ui, fontWeight: 600, fontSize: 28},
  digits: {fontFamily: FONT.ui, fontWeight: 700, fontSize: 96, fontFeatureSettings: '"tnum" 1'},
};

export const GLASS = {
  radius: 36,
  fill: 'rgba(14,22,48,0.62)',
  backdrop: 'blur(24px) saturate(140%)',
  stroke: 'rgba(255,255,255,0.10)',
  shadow: '0 30px 70px rgba(0,0,0,0.5)',
};

/** Caption scrim: soft feathered navy at 55%. */
export const SCRIM = 'rgba(8,13,28,0.55)';
