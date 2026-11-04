// QA gate 2: every Azerbaijani letter in every font used (no fallback glyphs, no empty boxes).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ensureFonts} from './fonts';
import {C} from './theme';

ensureFonts();
const LETTERS = 'Ə ə Ğ ğ I ı İ Ö ö Ü ü Ç ç Ş ş';
const ROWS: {label: string; family: string; weight: number; size: number}[] = [
  {label: 'Barlow Condensed 800 (titles)', family: "'Barlow Condensed'", weight: 800, size: 96},
  {label: 'Inter 700 (captions, digits)', family: "'Inter'", weight: 700, size: 64},
  {label: 'Inter 600 (tags, UI, URL, CTA)', family: "'Inter'", weight: 600, size: 64},
  {label: 'Inter Tight 800 (fallback title face)', family: "'Inter Tight'", weight: 800, size: 80},
  {label: 'Fallback reference (monospace — must look different)', family: 'monospace', weight: 400, size: 56},
];
export const GlyphTest: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: C.skyTop, padding: 60}}>
    {ROWS.map((r) => (
      <div key={r.label} style={{marginBottom: 54}}>
        <div style={{fontFamily: "'Inter'", fontWeight: 600, fontSize: 26, color: C.muted, letterSpacing: '0.08em'}}>{r.label}</div>
        <div style={{fontFamily: r.family, fontWeight: r.weight, fontSize: r.size, color: C.eye, lineHeight: 1.25}}>{LETTERS}</div>
        <div style={{fontFamily: r.family, fontWeight: r.weight, fontSize: r.size * 0.62, color: C.eye}}>QONŞUNUN OĞLU · Müraciət et · İngiliscə · Yaşın</div>
      </div>
    ))}
  </AbsoluteFill>
);
