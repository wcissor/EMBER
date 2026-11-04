import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {LINES} from '../config';
import {TL} from '../data';
import {C, FONT, TYPE} from '../theme';
import {RAIL, RAIL_BIG} from '../layout';
import {EASE, clamp01, springAt} from '../motion';
import {Squiggle} from './Squiggle';

type Tok = {text: string; start: number; end: number; next: number; isWord: boolean};

const tokensFor = (lineId: string): Tok[][] => {
  const def = LINES.find((l) => l.id === lineId)!;
  const words = TL.wordFrames(lineId);
  const lf = TL.lineFrames(lineId);
  let wi = -1;
  return def.caption.map((row) =>
    row.split(' ').map((text) => {
      const isWord = /[\p{L}\p{N}]/u.test(text);
      if (isWord) wi++;
      const w = words[Math.max(0, wi)];
      const nxt = words[wi + 1];
      return {text, start: w.start, end: w.end, next: nxt ? nxt.start : lf.end, isWord};
    }),
  );
};

const ECHO = [
  {lag: 6, op: 0.4},
  {lag: 12, op: 0.22},
  {lag: 18, op: 0.1},
];

/** One caption word: rises 14 px and fades in over 6 frames (vtOut). Emphasis words carry echo type. */
const Word: React.FC<{tok: Tok; frame: number; emphasis: boolean; echoColor: string; style: React.CSSProperties; display?: string}> = ({
  tok,
  frame,
  emphasis,
  echoColor,
  style,
  display,
}) => {
  const text = display ?? tok.text;
  const t = frame - tok.start;
  if (t < 0) return <span style={{...style, opacity: 0, display: 'inline-block'}}>{text}</span>;
  const dur = emphasis ? 14 : 6;
  const rise = emphasis ? 44 : 14;
  const pose = (tt: number) => {
    const r = EASE.vtOut(clamp01(tt / dur));
    return {r, y: rise * (1 - r), s: emphasis ? 1.32 - 0.32 * r : 1};
  };
  const p = pose(t);
  const speaking = frame < Math.max(tok.end, tok.start + 6);
  const level = speaking ? 1 : 0.72;
  return (
    <span style={{position: 'relative', display: 'inline-block'}}>
      {emphasis &&
        ECHO.map(({lag, op}) => {
          const g = pose(t - lag);
          if (t - lag < 0 || (g.y < 0.5 && Math.abs(g.s - 1) < 0.004)) return null;
          return (
            <span
              key={lag}
              style={{
                ...style,
                position: 'absolute',
                left: 0,
                top: 0,
                color: echoColor,
                opacity: op,
                transform: `translateY(${g.y}px) scale(${g.s})`,
                transformOrigin: 'center bottom',
              }}
            >
              {text}
            </span>
          );
        })}
      <span
        style={{
          ...style,
          position: 'relative',
          display: 'inline-block',
          opacity: p.r * level,
          transform: `translateY(${p.y}px) scale(${p.s})`,
          transformOrigin: 'center bottom',
        }}
      >
        {text}
      </span>
    </span>
  );
};

const lineOrder = LINES.map((l) => l.id);

/** Caption visibility: from the first word until 8 frames after the line ends (6-frame fade),
 *  unless the next line replaces it first. */
const visibility = (lineId: string, frame: number) => {
  const lf = TL.lineFrames(lineId);
  const first = TL.wordFrames(lineId)[0].start;
  const i = lineOrder.indexOf(lineId);
  const nextId = lineOrder[i + 1];
  const nextFirst = nextId ? TL.wordFrames(nextId)[0].start : Infinity;
  const leave = lf.end + 8;
  if (frame < first) return 0;
  if (frame >= nextFirst) return 0;
  if (frame < leave) return 1;
  return clamp01(1 - (frame - leave) / 6);
};

/** L16 "That's it?": the squiggle bounces. */
const bounceFor = (frame: number) => {
  const lf = TL.lineFrames('16');
  if (frame < lf.start || frame > lf.end + 6) return 0;
  return Math.abs(Math.sin(((frame - lf.start) / 9) * Math.PI)) * 10;
};

const BEFORE = new Set(['01', '02', '03', '04', '05', '06', '07']);
const END_CARD = new Set(['22', '23', '24']); // the end card's headline + CTA are these captions

export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const visible = lineOrder.filter((id) => !END_CARD.has(id) && visibility(id, frame) > 0);
  return (
    <>
      {visible.map((id) => (BEFORE.has(id) ? <PillCaption key={id} id={id} frame={frame} /> : <PlainCaption key={id} id={id} frame={frame} />))}
    </>
  );
};

const PillCaption: React.FC<{id: string; frame: number}> = ({id, frame}) => {
  const def = LINES.find((l) => l.id === id)!;
  const rows = tokensFor(id);
  const vis = visibility(id, frame);
  const first = rows[0][0].start;
  const enter = springAt(frame, first, 'snap');
  const rot = (random(`pill-${id}`) * 2 - 1) * 1.5;
  const big = id === '07';
  const emph = new Set(def.emphasis ?? []);
  const rail = big ? RAIL_BIG : RAIL;
  const base: React.CSSProperties = {...TYPE.caption, color: C.white, whiteSpace: 'pre'};
  const cond: React.CSSProperties = {...TYPE.emphasis, color: C.white, textTransform: 'uppercase', whiteSpace: 'pre'};
  return (
    <div
      style={{
        position: 'absolute',
        left: rail.x0,
        width: rail.x1 - rail.x0,
        top: rail.y0,
        height: rail.y1 - rail.y0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: vis,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          padding: big ? '22px 36px 22px 30px' : '18px 32px 18px 26px',
          borderRadius: 22,
          background: C.ink,
          transform: `rotate(${rot}deg) scale(${0.9 + 0.1 * enter})`,
          boxShadow: '0 12px 30px rgba(0,0,0,0.22)',
          maxWidth: rail.x1 - rail.x0,
        }}
      >
        <Squiggle color={C.white} height={big ? 52 : 40} />
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
          {rows.map((row, ri) => (
            <div key={ri} style={{display: 'flex', alignItems: 'baseline', gap: 17, lineHeight: big ? 0.98 : 1.12}}>
              {row.map((tok, ti) => {
                const isEmph = emph.has(tok.text);
                return (
                  <Word
                    key={ti}
                    tok={tok}
                    frame={frame}
                    emphasis={isEmph}
                    echoColor={C.stamp}
                    style={isEmph && big ? cond : base}
                    display={isEmph && big ? tok.text.toUpperCase() : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PlainCaption: React.FC<{id: string; frame: number}> = ({id, frame}) => {
  const def = LINES.find((l) => l.id === id)!;
  const rows = tokensFor(id);
  const vis = visibility(id, frame);
  const yes = id === '08';
  const emph = new Set(def.emphasis ?? []);
  const student = def.voice === 'S';
  const style: React.CSSProperties = {...TYPE.caption, fontSize: yes ? 64 * 1.6 : 64, color: C.white, whiteSpace: 'pre'};
  return (
    <div
      style={{
        position: 'absolute',
        left: RAIL.x0,
        width: RAIL.x1 - RAIL.x0,
        top: RAIL.y0,
        height: RAIL.y1 - RAIL.y0,
        display: 'flex',
        alignItems: yes ? 'flex-end' : 'center',
        justifyContent: 'center',
        paddingBottom: yes ? 6 : 0,
        opacity: vis,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 24, ...(yes ? {background: C.navy, borderRadius: 26, padding: '6px 40px 12px', boxShadow: '0 16px 40px rgba(8,13,28,0.35)'} : {})}}>
        {student && <Squiggle color={C.white} height={40} bounce={id === '16' ? bounceFor(frame) : 0} />}
        <div style={{display: 'flex', flexDirection: 'column', alignItems: student ? 'flex-start' : 'center'}}>
          {rows.map((row, ri) => (
            <div key={ri} style={{display: 'flex', alignItems: 'baseline', gap: yes ? 27 : 17, lineHeight: 1.12}}>
              {row.map((tok, ti) => (
                <Word key={ti} tok={tok} frame={frame} emphasis={emph.has(tok.text)} echoColor={C.blue} style={style} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export {FONT};
