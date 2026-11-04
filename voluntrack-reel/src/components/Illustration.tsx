import React from 'react';
import type {Illustration as Kind} from '../config';
import {C} from '../theme';

// Flat illustrations in sage, sand and clay rose (section 3). 250×250 artboard.
const SAGE_D = '#7F9A84';
const SAND_D = '#CDAF7F';
const ROSE_D = '#BF8A7E';

const Sapling = () => (
  <g>
    <circle cx="196" cy="56" r="24" fill={C.rose} />
    <path d="M125 170 C 124 140, 126 110, 125 78" stroke={SAGE_D} strokeWidth="8" strokeLinecap="round" fill="none" />
    <path d="M125 120 C 100 118, 78 100, 74 76 C 100 74, 120 92, 125 120 Z" fill={C.sage} />
    <path d="M125 104 C 150 102, 172 84, 176 58 C 150 58, 130 76, 125 104 Z" fill={SAGE_D} />
    <path d="M125 82 C 112 70, 110 52, 118 38 C 132 50, 134 68, 125 82 Z" fill={C.sage} />
    <path d="M78 168 H172 L160 236 Q158 244 150 244 H100 Q92 244 90 236 Z" fill={C.sand} />
    <rect x="70" y="158" width="110" height="22" rx="8" fill={SAND_D} />
  </g>
);

const Box = () => (
  <g>
    <path d="M125 30 C 125 30, 103 12, 92 26 C 82 40, 104 56, 125 70 C 146 56, 168 40, 158 26 C 147 12, 125 30, 125 30 Z" fill={C.rose} />
    <rect x="86" y="84" width="40" height="70" rx="5" transform="rotate(-10 106 119)" fill={C.rose} />
    <rect x="132" y="92" width="36" height="58" rx="10" fill={C.sage} />
    <rect x="138" y="84" width="24" height="12" rx="4" fill={SAGE_D} />
    <path d="M44 128 H206 V232 Q206 240 198 240 H52 Q44 240 44 232 Z" fill={C.sand} />
    <path d="M44 128 L24 158 H186 L206 128 Z" fill={SAND_D} />
    <rect x="100" y="176" width="54" height="30" rx="6" fill="#FFFFFF" opacity="0.75" />
  </g>
);

const Brush = () => (
  <g>
    <path d="M28 190 C 70 150, 120 214, 168 170 C 196 146, 214 168, 226 150" stroke={C.rose} strokeWidth="30" strokeLinecap="round" fill="none" />
    <ellipse cx="74" cy="88" rx="56" ry="40" fill={C.sand} />
    <circle cx="56" cy="78" r="9" fill={C.rose} />
    <circle cx="82" cy="70" r="9" fill={C.sage} />
    <circle cx="96" cy="96" r="12" fill="#FFFFFF" opacity="0.8" />
    <g transform="rotate(38 170 92)">
      <rect x="160" y="10" width="20" height="104" rx="10" fill={SAND_D} />
      <rect x="157" y="108" width="26" height="26" rx="4" fill={C.grey} />
      <path d="M157 132 H183 L178 168 Q170 182 162 168 Z" fill={ROSE_D} />
    </g>
  </g>
);

const Laptop = () => (
  <g>
    <rect x="46" y="54" width="158" height="112" rx="10" fill={SAGE_D} />
    <rect x="56" y="64" width="138" height="92" rx="5" fill={C.sage} />
    <path d="M125 96 C 125 96, 112 82, 103 92 C 95 101, 108 112, 125 126 C 142 112, 155 101, 147 92 C 138 82, 125 96, 125 96 Z" fill="#FFFFFF" />
    <path d="M30 172 H220 L208 196 Q205 202 198 202 H52 Q45 202 42 196 Z" fill={C.sand} />
    <rect x="104" y="176" width="42" height="8" rx="4" fill={SAND_D} />
    <circle cx="208" cy="40" r="16" fill={C.rose} />
  </g>
);

export const Illustration: React.FC<{kind: Kind; size: number}> = ({kind, size}) => (
  <svg width={size} height={size} viewBox="0 0 250 250">
    {kind === 'sapling' && <Sapling />}
    {kind === 'box' && <Box />}
    {kind === 'brush' && <Brush />}
    {kind === 'laptop' && <Laptop />}
  </svg>
);
