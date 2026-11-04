// Every colour and type setting (section 3). Pure data.

export const C = {
  // After world — VolunTrack
  navy: '#080D1C',
  panel: '#0E1630',
  line: '#1C2747',
  blue: '#2F6BFF',
  glow: '#8DB8FF',
  white: '#F5F7FF',
  muted: '#8D9AC0',
  // Before world — paper
  paper: '#E7E4DE',
  card: '#FFFFFF',
  ink: '#121212',
  grey: '#C9C5BD',
  stamp: '#E0322B',
  // Flat illustration inks (before world only)
  sage: '#9DB4A0',
  sand: '#E3C9A0',
  rose: '#D4A59A',
};

/** Pale grounds behind the post illustrations. */
export const TINT_BG: Record<'sage' | 'sand' | 'rose', string> = {
  sage: '#E4ECE3',
  sand: '#F4EBDC',
  rose: '#F2E3DE',
};

export const FONT = {
  condensed: "'Barlow Condensed', 'Arial Narrow', sans-serif",
  ui: "'Inter', system-ui, sans-serif",
};

export const TYPE = {
  headline: {fontFamily: FONT.condensed, fontWeight: 800, fontSize: 112, letterSpacing: '-0.01em', lineHeight: 0.92, textTransform: 'uppercase' as const},
  emphasis: {fontFamily: FONT.condensed, fontWeight: 800, fontSize: 80, letterSpacing: '-0.01em', lineHeight: 0.92},
  stamp: {fontFamily: FONT.condensed, fontWeight: 800, letterSpacing: '0.06em'},
  poster: {fontFamily: FONT.condensed, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 0.92},
  caption: {fontFamily: FONT.ui, fontWeight: 700, fontSize: 64, lineHeight: 1.12},
  roleTitle: {fontFamily: FONT.ui, fontWeight: 600, fontSize: 40},
  body: {fontFamily: FONT.ui, fontWeight: 500, fontSize: 32},
  chip: {fontFamily: FONT.ui, fontWeight: 600, fontSize: 28},
  ages: {fontFeatureSettings: '"tnum" 1, "lnum" 1'},
};

export const GLASS = {
  radius: 36,
  fill: 'rgba(14,22,48,0.62)',
  backdrop: 'blur(24px) saturate(140%)',
  stroke: 'rgba(255,255,255,0.10)',
  highlightTop: 'rgba(255,255,255,0.08)',
  shadow: '0 30px 70px rgba(0,0,0,0.5)',
};

export const PAPER_CARD = {
  w: 760,
  h: 950,
  radius: 28,
  shadow: '0 18px 40px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.20)',
};

export const STAR_BLOOM = [
  {blur: 8, opacity: 0.9},
  {blur: 24, opacity: 0.5},
  {blur: 64, opacity: 0.25},
];
