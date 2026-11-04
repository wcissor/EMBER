// VolunTrack interface primitives (section 3, after world): glass, chips, icons.
import React from 'react';
import {C, FONT, GLASS, TYPE} from '../theme';
import {starPath} from './Star';

export const Glass: React.FC<{
  style?: React.CSSProperties;
  radius?: number;
  children?: React.ReactNode;
  blur?: boolean;
}> = ({style, radius = GLASS.radius, children, blur = true}) => (
  <div
    style={{
      position: 'absolute',
      borderRadius: radius,
      background: GLASS.fill,
      backdropFilter: blur ? GLASS.backdrop : undefined,
      WebkitBackdropFilter: blur ? GLASS.backdrop : undefined,
      boxShadow: `inset 0 0 0 1px ${GLASS.stroke}, ${GLASS.shadow}`,
      overflow: 'hidden',
      ...style,
    }}
  >
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 40, background: `linear-gradient(${GLASS.highlightTop}, rgba(255,255,255,0))`, pointerEvents: 'none'}} />
    {children}
  </div>
);

export const Chip: React.FC<{
  label: string;
  filled?: boolean;
  height?: number;
  style?: React.CSSProperties;
  tabular?: boolean;
  dim?: number;
}> = ({label, filled = false, height = 44, style, tabular = false, dim = 1}) => (
  <div
    style={{
      height,
      padding: `0 ${Math.round(height * 0.42)}px`,
      borderRadius: height / 2,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      whiteSpace: 'nowrap',
      background: filled ? C.blue : 'rgba(255,255,255,0.02)',
      boxShadow: filled ? 'none' : `inset 0 0 0 1.5px rgba(141,154,192,${0.55 * dim})`,
      color: filled ? '#FFFFFF' : C.white,
      ...TYPE.chip,
      ...(tabular ? TYPE.ages : {}),
      ...style,
    }}
  >
    {label}
  </div>
);

export const CheckIcon: React.FC<{size: number; color: string; stroke?: number; progress?: number}> = ({size, color, stroke = 3, progress = 1}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{display: 'inline-block', verticalAlign: 'middle'}}>
    <path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} />
  </svg>
);

export const StarGlyph: React.FC<{size: number; color?: string}> = ({size, color = '#FFFFFF'}) => (
  <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} style={{display: 'inline-block', verticalAlign: 'middle'}}>
    <path d={starPath(size / 2, size / 2, size / 2)} fill={color} />
  </svg>
);

export const ArrowUR: React.FC<{size: number; color: string; stroke?: number}> = ({size, color, stroke = 2.6}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{display: 'inline-block', verticalAlign: 'middle'}}>
    <path d="M7 17 L17 7 M9 7 H17 V15" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowDR: React.FC<{size: number; color: string; stroke?: number}> = ({size, color, stroke = 2.6}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{display: 'inline-block', verticalAlign: 'middle'}}>
    <path d="M7 7 L17 17 M17 9 V17 H9" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const FormIcon: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <rect x="9" y="5" width="30" height="38" rx="5" fill="none" stroke={color} strokeWidth="3" />
    <path d="M16 16 H32 M16 24 H32 M16 32 H26" stroke={color} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const uiText = (size: number, weight = 500, color: string = C.white): React.CSSProperties => ({
  fontFamily: FONT.ui,
  fontWeight: weight,
  fontSize: size,
  color,
});
