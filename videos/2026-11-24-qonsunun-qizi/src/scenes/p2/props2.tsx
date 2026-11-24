// Part 2 props (figure units at the wrist unless noted). Warm and neutral colours only.
import React from 'react';
import {C} from '../../theme';
import {mix, rgba} from '../../color';

/** A broom: the handle runs from the hand down to the floor at `angle` (deg from vertical), bristles at the foot. */
export const Broom: React.FC<{angle: number; len?: number}> = ({angle, len = 62}) => (
  <g transform={`rotate(${angle})`}>
    <rect x={-1.2} y={-14} width={2.4} height={len + 14} fill={mix(C.wood, '#000000', 0.25)} />
    <path d={`M-7 ${len} h14 l3 11 h-20 z`} fill={mix(C.wood, C.amber, 0.25)} />
    {[-6, -3, 0, 3, 6].map((x) => (
      <rect key={x} x={x - 0.4} y={len + 10} width={0.8} height={3} fill={mix(C.wood, '#000000', 0.4)} />
    ))}
  </g>
);

/** A cardboard box of books, held in front with both arms (drawn centred on the hands). */
export const BookBox: React.FC<{tilt?: number}> = ({tilt = 0}) => (
  <g transform={`rotate(${tilt})`}>
    {[[-10, 7, '#8E3B2E'], [-4, 10, '#2E5C4A'], [2, 8, '#B88A3A'], [7, 9, '#5B4A7A']].map(([x, h, c], i) => (
      <rect key={i} x={x as number} y={-5 - (h as number)} width={5} height={(h as number) + 4} fill={mix(c as string, '#000000', 0.3)} />
    ))}
    <rect x={-13} y={-6} width={26} height={17} fill="#8A6A44" />
    <rect x={-13} y={-6} width={26} height={2.4} fill="#A3814F" />
    <path d="M-13 -6 l-4 -4 h6 z M13 -6 l4 -4 h-6 z" fill="#7A5C3A" />
  </g>
);

/** A clipboard with a sheet (held up, facing her). */
export const Clipboard: React.FC<{angle?: number}> = ({angle = 0}) => (
  <g transform={`rotate(${angle})`}>
    <rect x={-5.5} y={-15} width={11} height={15} rx={1} fill="#6E5236" />
    <rect x={-4.4} y={-13.4} width={8.8} height={12.6} fill={C.phoneWhite} opacity={0.92} />
    <rect x={-2.2} y={-16.4} width={4.4} height={2.6} rx={0.6} fill={C.alu} />
    {[0, 1, 2, 3].map((i) => (
      <rect key={i} x={-3.4} y={-11 + i * 2.6} width={i === 3 ? 4 : 6.8} height={0.8} fill="#5A5F6E" opacity={0.7} />
    ))}
  </g>
);

/** A full rubbish bag hanging from the hand (tied top). */
export const Bag: React.FC<{swing?: number}> = ({swing = 0}) => (
  <g transform={`rotate(${swing})`}>
    <path d="M-1.6 0 l-1 3 q-9 2 -9 13 q0 9 11.6 9 q11.6 0 11.6 -9 q0 -11 -9 -13 l-1 -3 z" fill="#2B3039" />
    <path d="M-2.6 3.4 q2.6 1.4 5.2 0" stroke="#4A505C" strokeWidth={0.8} fill="none" />
    <path d="M-6 10 q-1 6 2 10" stroke={rgba('#FFFFFF', 0.12)} strokeWidth={1.2} fill="none" />
  </g>
);

/** Work gloves: drawn over the hands (a slightly bigger, warm-yellow hand and cuff). */
export const Glove: React.FC<{r?: number}> = ({r = 3.3}) => (
  <g>
    <circle cx={0} cy={0} r={r} fill="#C9A13A" />
    <circle cx={0} cy={-r * 0.55} r={r * 0.75} fill="#B08A2E" />
  </g>
);

/** A small book in a hand (a kid carrying it to the shelf). */
export const Book: React.FC<{color?: string; angle?: number}> = ({color = '#8E3B2E', angle = 0}) => (
  <g transform={`rotate(${angle})`}>
    <rect x={-4.5} y={-6} width={9} height={7} fill={mix(color, '#000000', 0.2)} />
    <rect x={-4.5} y={-6} width={1.4} height={7} fill={mix(color, '#000000', 0.45)} />
  </g>
);

/** The yard's little book shelf (world units, feet at 0,0), filling up as `fill` goes 0 → 1. */
export const YardShelf: React.FC<{fill: number}> = ({fill}) => {
  const books = ['#8E3B2E', '#2E5C4A', '#B88A3A', '#5B4A7A', '#3E5E8E', '#9A5A2A', '#4A6A3A', '#7A3A5A', '#B07A3A', '#3A4A6A', '#8A4A3A', '#5A7A4A'];
  const shown = Math.round(fill * books.length);
  return (
    <g>
      <rect x={-34} y={-62} width={68} height={62} fill="#7A5A3A" />
      <rect x={-31} y={-59} width={62} height={56} fill="#4E3826" />
      <rect x={-31} y={-31} width={62} height={3} fill="#7A5A3A" />
      <path d="M-38 -62 h76 l-4 -7 h-68 z" fill="#8E6A44" />
      {books.slice(0, shown).map((c, i) => {
        const row = i < 6 ? 0 : 1;
        const x = -29 + (i % 6) * 10;
        const h = 18 + ((i * 7) % 6);
        return <rect key={i} x={x} y={(row === 0 ? -31 : -3) - h} width={8.4} height={h} fill={c} />;
      })}
    </g>
  );
};
