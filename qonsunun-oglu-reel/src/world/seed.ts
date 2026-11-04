// Seeded properties for every ordinary window and balcony (Remotion `random()` only).
import {random} from 'remotion';
import {BLOCKS, PLACES, WORLD, type BlockDef} from '../layout';

export type FrameKind = 'pvc' | 'wood' | 'alu';
export type Thing = 'none' | 'plant' | 'lamp' | 'shelf' | 'tv';
export type WinProps = {
  key: string;
  lit: boolean;
  level: number; // 0.4–1.0
  warm: number; // 0 = amber core, 1 = towards amberEdge
  tulle: boolean;
  curtain: 'none' | 'left' | 'right' | 'both';
  thing: Thing;
  thingSide: number; // 0..1
  frame: FrameKind;
  mullion: 0 | 1 | 2;
  flicker: boolean;
};
export type BalcKind = 'pvc' | 'wood' | 'alu' | 'open';
export type BalcProps = {
  key: string;
  kind: BalcKind;
  parapet: 'ribs' | 'panel' | 'bars' | 'brick';
  lit: boolean;
  level: number;
  content: 'none' | 'laundry' | 'bike' | 'jars' | 'plants' | 'boxes';
  dish: boolean;
  dishSide: 'left' | 'right';
  panes: number;
  tone: number;
};

const r = (s: string) => random(s);

/** Balcony columns per block (glazed balconies stack in columns, floors 2–9). */
export const BALCONY_COLS: Record<'L' | 'R', number[]> = {L: [1, 3, 6], R: [0, 3, 5]};

const isPlace = (b: BlockDef, c: number, k: number) =>
  Object.values(PLACES).some((p) => p.b === b.id && p.c === c && p.k === k);

/** Old bulbs that flicker slowly (two of them). */
const FLICKER = new Set(['L-2-6', 'R-4-3']);
/** Windows with a TV glow (warm). */
const TV = new Set(['L-0-5', 'R-6-7', 'R-2-2', 'L-4-8']);

export const winProps = (b: BlockDef, c: number, k: number): WinProps => {
  const key = `${b.id}-${c}-${k}`;
  const s = (n: string) => r(`${key}-${n}`);
  const lit = TV.has(key) || FLICKER.has(key) || s('lit') > 0.16;
  const thingRoll = s('thing');
  const thing: Thing = TV.has(key) ? 'tv' : thingRoll < 0.1 ? 'plant' : thingRoll < 0.2 ? 'lamp' : thingRoll < 0.3 ? 'shelf' : 'none';
  const cr = s('curtain');
  return {
    key,
    lit,
    level: 0.4 + 0.6 * s('level'),
    warm: s('warm'),
    tulle: s('tulle') > 0.25,
    curtain: cr < 0.12 ? 'left' : cr < 0.24 ? 'right' : cr < 0.3 ? 'both' : 'none',
    thing,
    thingSide: s('side'),
    frame: s('frame') < 0.55 ? 'pvc' : s('frame') < 0.8 ? 'wood' : 'alu',
    mullion: (Math.floor(s('mullion') * 3) as 0 | 1 | 2),
    flicker: FLICKER.has(key),
  };
};

export const balcProps = (b: BlockDef, c: number, k: number): BalcProps => {
  const key = `${b.id}-${c}-${k}-b`;
  const s = (n: string) => r(`${key}-${n}`);
  const kr = s('kind');
  const cr = s('content');
  return {
    key,
    kind: kr < 0.4 ? 'pvc' : kr < 0.65 ? 'wood' : kr < 0.85 ? 'alu' : 'open',
    parapet: (['ribs', 'panel', 'bars', 'brick'] as const)[Math.floor(s('parapet') * 4)],
    lit: s('lit') > 0.35,
    level: 0.35 + 0.5 * s('level'),
    content: cr < 0.22 ? 'laundry' : cr < 0.34 ? 'bike' : cr < 0.5 ? 'jars' : cr < 0.62 ? 'plants' : cr < 0.72 ? 'boxes' : 'none',
    dish: s('dish') > 0.6,
    dishSide: s('dishSide') > 0.5 ? 'left' : 'right',
    panes: 3 + Math.floor(s('panes') * 2),
    tone: s('tone'),
  };
};

export type Cell =
  | {type: 'window'; b: BlockDef; c: number; k: number; story: boolean}
  | {type: 'balcony'; b: BlockDef; c: number; k: number; story: boolean};

/** Every window/balcony cell of both blocks. */
export const CELLS: Cell[] = BLOCKS.flatMap((b) => {
  const out: Cell[] = [];
  for (let k = 1; k <= WORLD.floors; k++)
    for (let c = 0; c < b.cols; c++) {
      const balcony = k >= 2 && BALCONY_COLS[b.id].includes(c);
      out.push({type: balcony ? 'balcony' : 'window', b, c, k, story: isPlace(b, c, k)});
    }
  return out;
});
