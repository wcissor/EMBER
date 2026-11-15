import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import type {CSSProperties} from 'react';

// RUTA's colours, from the RUTA website: background #151612, text #F2EFE5, olive #59643F (buttons)
// and light olive #B4BD92 (the R in the logo, links, focus). #59643F is too dark for words on black
// (about 3:1), so the light olive carries keywords and the active path, and #59643F the dim paths.
export const colors = {
  black: '#151612',
  olive: '#B4BD92',
  oliveDim: '#59643F',
  text: '#F2EFE5',
  grey: '#9A998E',
  hairline: '#34362F',
} as const;

// RUTA's website font ("Ruta Sans") is DejaVu Sans renamed, not a brand typeface, so the brief's
// fallback applies: Geist and Geist Mono (SIL OFL 1.1).
export const fonts = {sans: 'Geist', mono: 'Geist Mono'} as const;

export const fontsReady = Promise.all([
  loadFont({family: fonts.sans, url: staticFile('fonts/Geist-Medium.woff2'), weight: '500'}),
  loadFont({family: fonts.sans, url: staticFile('fonts/Geist-SemiBold.woff2'), weight: '600'}),
  loadFont({family: fonts.mono, url: staticFile('fonts/GeistMono-Medium.woff2'), weight: '500'}),
]);

export const type: Record<'display' | 'caption' | 'label', CSSProperties> = {
  // Name and end card: Semibold 120 px, tracking -3%.
  display: {fontFamily: fonts.sans, fontWeight: 600, fontSize: 120, lineHeight: 1, letterSpacing: '-0.03em', color: colors.text},
  // Captions: Medium 54 px, leading 1.15, tracking -1%.
  caption: {fontFamily: fonts.sans, fontWeight: 500, fontSize: 54, lineHeight: 1.15, letterSpacing: '-0.01em', color: colors.text},
  // Labels: mono, caps, 26 px, tracking +6%, grey.
  label: {fontFamily: fonts.mono, fontWeight: 500, fontSize: 26, lineHeight: 1, letterSpacing: '0.06em', textTransform: 'uppercase', color: colors.grey, whiteSpace: 'nowrap'},
};

export const stroke = {main: 2, secondary: 1} as const;
