import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import type {CSSProperties} from 'react';

// Colours. Black, white and grey are the brief's values. The olive is RUTA's own, from the RUTA
// website: #B4BD92 (the R in the logo, links) carries the accent on dark pictures, and #59643F
// (RUTA's buttons) carries the same accent where the text sits on a bright sky.
export const colors = {
  black: '#0B0C0A',
  olive: '#B4BD92',
  oliveDark: '#59643F',
  white: '#F2F1EC',
  grey: '#8B8A82',
} as const;

// Geist and Geist Mono (SIL OFL 1.1). Both cover every Azerbaijani letter (Ə ə Ğ ğ İ ı Ş ş Ç ç Ö ö Ü ü).
export const fonts = {sans: 'Geist', mono: 'Geist Mono'} as const;

export const fontsReady = Promise.all([
  loadFont({family: fonts.sans, url: staticFile('fonts/Geist-SemiBold.woff2'), weight: '600'}),
  loadFont({family: fonts.sans, url: staticFile('fonts/Geist-Bold.woff2'), weight: '700'}),
  loadFont({family: fonts.mono, url: staticFile('fonts/GeistMono-Medium.woff2'), weight: '500'}),
]);

/** Text sits on a dark picture (white text, light olive accent) or on a bright sky (black text, dark olive accent). */
export type Tone = 'dark' | 'bright';
export const ink = (tone: Tone) => (tone === 'dark' ? colors.white : colors.black);
export const accent = (tone: Tone) => (tone === 'dark' ? colors.olive : colors.oliveDark);

export const type: Record<'caption' | 'big' | 'head' | 'question' | 'label' | 'source', CSSProperties> = {
  // Captions: bold 64 px.
  caption: {fontFamily: fonts.sans, fontWeight: 700, fontSize: 64, lineHeight: 1.08, letterSpacing: '-0.015em'},
  // Big words and numbers: 160-200 px bold, tracking -3%.
  big: {fontFamily: fonts.sans, fontWeight: 700, fontSize: 184, lineHeight: 0.9, letterSpacing: '-0.03em'},
  // Second line under a big number.
  head: {fontFamily: fonts.sans, fontWeight: 700, fontSize: 60, lineHeight: 1.05, letterSpacing: '-0.02em'},
  // The closing question.
  question: {fontFamily: fonts.sans, fontWeight: 700, fontSize: 92, lineHeight: 1.02, letterSpacing: '-0.025em'},
  // Labels on drawings (ILLUSTRATION, place names): mono 26 px.
  label: {fontFamily: fonts.mono, fontWeight: 500, fontSize: 26, lineHeight: 1.2, letterSpacing: '0.04em', whiteSpace: 'nowrap'},
  // Source tags: mono 24 px, 60% white.
  source: {fontFamily: fonts.mono, fontWeight: 500, fontSize: 24, lineHeight: 1.25, letterSpacing: '0.03em'},
};

export const stroke = 2;
