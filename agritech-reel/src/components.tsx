import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import timeline from './timeline.json';
import {CAPTIONS, Lang, LineId, Num} from './config';
import {accent, colors, ink, stroke, Tone, type} from './theme';
import {BOTTOM_SHADE, CAPTION, CX, H, LABEL_Y, MARK, SAFE, SOURCE_Y, W} from './layout';
import {dur, ease, enter, mix, prog} from './motion';

export const FPS = timeline.fps;
type LineTiming = {frames: number; audioOffset: number; speechStart: number; speechEnd: number; words: {text: string; start: number; end: number}[]};

// ---------- Beat context ----------
// shift: frames added to the beat's own clock. 0 for a beat; -TAIL for the loop tail, which shows the
// hook's first shot just before its first frame.
export type QA = {textOnly: boolean; safeBox: boolean};
type Ctx = {lang: Lang; line: LineId; shift: number; qa: QA; timing: LineTiming};
const BeatContext = createContext<Ctx | null>(null);
export const BeatProvider = BeatContext.Provider;
/** Frames between the beat's start and the enclosing <Sequence>'s start (0 outside shots). */
const OffsetContext = createContext(0);
export const useBeat = () => {
  const c = useContext(BeatContext);
  if (!c) throw new Error('No beat context');
  return c;
};
export const timingOf = (lang: Lang, line: LineId) => (timeline.lines as Record<string, Record<string, LineTiming>>)[lang][line];

/** Beat time in seconds (negative inside the loop tail). */
export const useT = () => {
  const {shift} = useBeat();
  const offset = useContext(OffsetContext);
  return (useCurrentFrame() + offset + shift) / FPS;
};
/** Start time (s) of voice word i of this line. */
export const useWords = () => {
  const {timing, lang, line} = useBeat();
  const w = (i: number) => timing.words[Math.min(i, timing.words.length - 1)].start;
  const we = (i: number) => timing.words[Math.min(i, timing.words.length - 1)].end;
  const f = (s: number) => Math.round(s * FPS) / FPS; // snap to a frame
  return {w, we, f, S: timing.speechStart, E: timing.speechEnd, D: timing.frames / FPS, lang, line};
};

// ---------- Layers ----------
/** Pictures (footage, maps, drawings). Hidden in the text-only QA pass. */
export const Pic: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {qa} = useBeat();
  return qa.textOnly ? null : <>{children}</>;
};

export const Svg: React.FC<{children: React.ReactNode; opacity?: number}> = ({children, opacity = 1}) => {
  const {qa} = useBeat();
  return qa.textOnly ? null : (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity, zIndex: 2}}>
      {children}
    </svg>
  );
};

/**
 * One shot of footage. start/end: beat seconds (snapped to frames). inSec: proxy time at the shot's first frame.
 * scale and pan (px) move from the first value to the second across the shot. dim: 0..1 extra darkening over time.
 */
export const Clip: React.FC<{
  clip: string;
  start: number;
  end: number;
  inSec: number;
  scale?: [number, number];
  pan?: [[number, number], [number, number]];
  origin?: [number, number];
  dim?: (t: number) => number;
}> = ({clip, start, end, inSec, scale = [1.0, 1.04], pan = [[0, 0], [0, 0]], origin = [CX, H / 2], dim}) => {
  const {shift, qa} = useBeat();
  const sf = Math.round(start * FPS);
  const ef = Math.round(end * FPS);
  const first = sf === 0;
  // In the loop tail, the hook's first shot starts TAIL frames earlier in its source.
  const from = first ? 0 : sf - shift;
  const trim = Math.round(inSec * FPS) + (first ? shift : 0);
  const len = first ? ef - shift : ef - sf;
  if (qa.textOnly || len <= 0) return null;
  return (
    <Sequence from={from} durationInFrames={len} layout="none">
      <OffsetContext.Provider value={from}>
      <ClipInner clip={clip} trim={Math.max(0, trim)} len={ef - sf} scale={scale} pan={pan} origin={origin} dim={dim} frameOffset={first ? shift : 0} />
      </OffsetContext.Provider>
    </Sequence>
  );
};

const ClipInner: React.FC<{
  clip: string;
  trim: number;
  len: number;
  scale: [number, number];
  pan: [[number, number], [number, number]];
  origin: [number, number];
  dim?: (t: number) => number;
  frameOffset: number;
}> = ({clip, trim, len, scale, pan, origin, dim, frameOffset}) => {
  const fr = useCurrentFrame() + frameOffset;
  const t = useT();
  const p = Math.min(1, Math.max(0, fr / Math.max(1, len)));
  const s = mix(scale[0], scale[1], p);
  const x = mix(pan[0][0], pan[1][0], p);
  const y = mix(pan[0][1], pan[1][1], p);
  const d = dim ? dim(t) : 0;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo
        src={staticFile(`footage/${clip}.mp4`)}
        trimBefore={trim}
        muted
        style={{
          position: 'absolute',
          width: W,
          height: H,
          objectFit: 'cover',
          transformOrigin: `${origin[0]}px ${origin[1]}px`,
          transform: `translate(${x}px, ${y}px) scale(${s})`,
        }}
      />
      {d > 0 ? <AbsoluteFill style={{backgroundColor: colors.black, opacity: d}} /> : null}
    </AbsoluteFill>
  );
};

/** A still image (satellite) with a push. Same timing rules as Clip. */
export const Still: React.FC<{
  src: string;
  start: number;
  end: number;
  w: number;
  h: number;
  scale?: [number, number];
  center?: [[number, number], [number, number]]; // image px at the frame centre, start -> end
  children?: React.ReactNode; // drawings in image px
}> = ({src, start, end, w, h, scale = [1, 1.05], center, children}) => {
  const {shift, qa} = useBeat();
  const sf = Math.round(start * FPS);
  const ef = Math.round(end * FPS);
  const first = sf === 0;
  const from = first ? 0 : sf - shift;
  const len = first ? ef - shift : ef - sf;
  if (qa.textOnly || len <= 0) return null;
  return (
    <Sequence from={from} durationInFrames={len} layout="none">
      <OffsetContext.Provider value={from}>
      <StillInner src={src} len={ef - sf} w={w} h={h} scale={scale} center={center ?? [[w / 2, h / 2], [w / 2, h / 2]]} first={first} shift={shift}>
        {children}
      </StillInner>
      </OffsetContext.Provider>
    </Sequence>
  );
};

const StillInner: React.FC<{
  src: string; len: number; w: number; h: number; scale: [number, number]; center: [[number, number], [number, number]];
  first: boolean; shift: number; children?: React.ReactNode;
}> = ({src, len, w, h, scale, center, first, shift, children}) => {
  const fr = useCurrentFrame() + (first ? shift : 0);
  const p = Math.min(1, Math.max(0, fr / Math.max(1, len)));
  const pe = ease.inOut(p) * 0.5 + p * 0.5;
  const base = Math.max(W / w, H / h); // cover
  const s = base * mix(scale[0], scale[1], pe);
  const cx = mix(center[0][0], center[1][0], pe);
  const cy = mix(center[0][1], center[1][1], pe);
  const tx = CX - cx * s;
  const ty = H / 2 - cy * s;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})`}}>
        <Img src={staticFile(src)} style={{width: w, height: h, display: 'block'}} />
        {children ? (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
            {children}
          </svg>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Shades ----------
/** Soft black gradient behind the captions. */
export const BottomShade: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: BOTTOM_SHADE.from,
      width: W,
      height: BOTTOM_SHADE.to - BOTTOM_SHADE.from,
      background: `linear-gradient(to bottom, rgba(11,12,10,0) 0%, rgba(11,12,10,0.45) 12%, rgba(11,12,10,0.8) 24%, rgba(11,12,10,0.88) 30%, rgba(11,12,10,0.9) 100%)`,
      zIndex: 1,
    }}
  />
);
/** Soft darkening at the top, behind big words on a dark picture. strength 0..1. */
export const TopShade: React.FC<{strength?: number; to?: number; hold?: number}> = ({strength = 0.45, to = 900, hold}) => {
  const {qa} = useBeat();
  if (qa.textOnly) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: W,
        height: to,
        background: hold
          ? `linear-gradient(to bottom, rgba(11,12,10,${strength}) 0%, rgba(11,12,10,${strength * 0.92}) ${hold}%, rgba(11,12,10,0) 100%)`
          : `linear-gradient(to bottom, rgba(11,12,10,${strength}) 0%, rgba(11,12,10,${strength * 0.7}) 45%, rgba(11,12,10,0) 100%)`,
        zIndex: 1,
      }}
    />
  );
};

// ---------- Type ----------
/** The RUTA mark, top-left, 40% opacity, the whole time. */
export const RutaMark: React.FC = () => (
  <Img
    data-text="mark"
    src={staticFile('img/ruta-logo.png')}
    style={{position: 'absolute', left: MARK.x, top: MARK.y, height: MARK.h, opacity: MARK.opacity, zIndex: 3}}
  />
);

/** Source tag: mono 24 px, 60% white, just above the captions. */
export const SourceTag: React.FC<{text: string; at: number; until?: number}> = ({text, at, until = 1e9}) => {
  const t = useT();
  const o = enter(t, at, 0.35) * (1 - prog(t, until, 0.25, ease.out));
  if (o <= 0) return null;
  return (
    <div data-text="source" style={{position: 'absolute', left: SAFE.x0, width: SAFE.x1 - SAFE.x0, top: SOURCE_Y, textAlign: 'center', color: colors.white, opacity: 0.6 * o, ...type.source, zIndex: 2}}>
      {text}
    </div>
  );
};

/** Small mono label in the label row (ILLUSTRATION, place names). */
export const RowLabel: React.FC<{text: string; at: number; until?: number; color?: string}> = ({text, at, until = 1e9, color = colors.white}) => {
  const t = useT();
  const o = enter(t, at, 0.35) * (1 - prog(t, until, 0.2, ease.out));
  if (o <= 0) return null;
  return (
    <div data-text="label" style={{position: 'absolute', left: SAFE.x0, width: SAFE.x1 - SAFE.x0, top: LABEL_Y, textAlign: 'center', color, opacity: 0.85 * o, ...type.label, zIndex: 2}}>
      {text}
    </div>
  );
};

/** Free-standing mono label. */
export const Tag: React.FC<{text: string; x: number; y: number; at: number; until?: number; color?: string; align?: 'left' | 'center' | 'right'; size?: number}> = ({
  text, x, y, at, until = 1e9, color = colors.white, align = 'left', size,
}) => {
  const t = useT();
  const o = enter(t, at, 0.35) * (1 - prog(t, until, 0.2, ease.out));
  if (o <= 0) return null;
  const tx = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
  return (
    <div data-text="label" style={{position: 'absolute', left: x, top: y, transform: `translateX(${tx})`, color, opacity: o, ...type.label, ...(size ? {fontSize: size} : {}), zIndex: 2}}>
      {text}
    </div>
  );
};

/** Format a counter value in the language's style. */
const fmt = (v: number, lang: Lang) => {
  const s = Math.round(v).toString();
  const sep = lang === 'en' ? ',' : ' ';
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
};

/**
 * Big number that counts up over 0.6 s and stops exactly on its final text (unless count is false).
 * Kicker above (mono), lines below (bold), an optional extra line later (e.g. "Filed for bankruptcy."), and a small note.
 */
export const BigNumber: React.FC<{
  num: Num; at: number; tone: Tone; top?: number; subAt?: number[]; extra?: {text: string; at: number; accent?: boolean};
  until?: number; size?: number;
}> = ({num, at, tone, top = 320, subAt = [], extra, until = 1e9, size}) => {
  const t = useT();
  const {lang} = useBeat();
  const o = enter(t, at, 0.3) * (1 - prog(t, until, 0.2, ease.out));
  if (o <= 0) return null;
  const p = num.count === false ? 1 : prog(t, at, dur.counter, ease.out);
  const shown = p >= 1 ? num.final : `${num.prefix ?? ''}${fmt(num.value * p, lang)}${num.suffix ?? ''}`;
  const rise = (1 - enter(t, at, 0.4)) * 24;
  const lines = [...(num.sub ?? []).map((text, i) => ({text, at: subAt[i] ?? at + 0.2, accent: false})), ...(extra ? [{text: extra.text, at: extra.at, accent: !!extra.accent}] : [])];
  return (
    <div style={{position: 'absolute', left: SAFE.x0, width: SAFE.x1 - SAFE.x0, top: top + rise, textAlign: 'center', opacity: o, zIndex: 2}}>
      {num.kicker ? <div data-text="label" style={{...type.label, color: ink(tone), opacity: 0.8, marginBottom: 16, whiteSpace: 'normal'}}>{num.kicker}</div> : null}
      <div data-text="big" style={{...type.big, ...(size ? {fontSize: size} : {}), color: accent(tone), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>{shown}</div>
      {lines.map((l, i) => {
        const so = enter(t, l.at, 0.35);
        return so > 0 ? (
          <div key={i} data-text="head" style={{...type.head, color: l.accent ? accent(tone) : ink(tone), marginTop: i === 0 ? 20 : 8, opacity: so, transform: `translateY(${(1 - so) * 14}px)`}}>
            {l.text}
          </div>
        ) : null;
      })}
      {num.note ? (
        <div data-text="label" style={{...type.label, color: ink(tone), opacity: 0.8 * enter(t, at + 0.35, 0.35), marginTop: 18}}>
          {num.note}
        </div>
      ) : null}
    </div>
  );
};

/** Big word(s), one line each, upper half of the safe box. */
export const BigWord: React.FC<{lines: string[]; at: number; tone: Tone; top?: number; color?: string; size?: number; until?: number}> = ({
  lines, at, tone, top = 360, color, size, until = 1e9,
}) => {
  const t = useT();
  const o = enter(t, at, 0.35) * (1 - prog(t, until, 0.2, ease.out));
  if (o <= 0) return null;
  const rise = (1 - enter(t, at, 0.45)) * 28;
  return (
    <div style={{position: 'absolute', left: SAFE.x0, width: SAFE.x1 - SAFE.x0, top: top + rise, textAlign: 'center', opacity: o, zIndex: 2}}>
      {lines.map((l, i) => (
        <div key={i} data-text="big" style={{...type.big, ...(size ? {fontSize: size} : {}), color: color ?? accent(tone)}}>
          {l}
        </div>
      ))}
    </div>
  );
};

// ---------- Captions: word by word on the voice timestamps ----------
type Tok = {text: string; key: boolean; n: number};
const parseChunk = (s: string): Tok[] =>
  s.split(' ').map((raw) => {
    let text = raw;
    let n = 1;
    const m = text.match(/\+(\d)$/);
    if (m) {
      n = Number(m[1]);
      text = text.slice(0, -2);
    }
    const key = text.startsWith('*');
    if (key) text = text.slice(1);
    return {text, key, n};
  });

export const Captions: React.FC<{hold?: number}> = ({hold = 0.35}) => {
  const {lang, line, timing} = useBeat();
  const t = useT();
  const chunks = CAPTIONS[lang][line].map(parseChunk);
  if (chunks.length === 0) return null;
  const total = chunks.flat().reduce((a, k) => a + k.n, 0);
  if (total !== timing.words.length) throw new Error(`${lang} ${line}: captions cover ${total} words, voice has ${timing.words.length}`);
  // word index of each token
  let wi = 0;
  const placed = chunks.map((c) =>
    c.map((tok) => {
      const at = timing.words[wi].start;
      wi += tok.n;
      return {...tok, at};
    }),
  );
  const isHook = line.startsWith('H');
  const starts = placed.map((c) => c[0].at);
  let ci = -1;
  for (let i = 0; i < placed.length; i++) if (t >= starts[i] - 0.06) ci = i;
  if (isHook && ci < 0) ci = 0; // the hook's first word is on screen from the first frame
  if (ci < 0) return null;
  const lastEnd = timing.speechEnd + hold;
  if (ci === placed.length - 1 && t > lastEnd) return null;
  const c = placed[ci];
  return (
    <div
      data-text="caption"
      style={{
        position: 'absolute',
        left: CX - CAPTION.maxW / 2,
        width: CAPTION.maxW,
        top: CAPTION.top,
        height: CAPTION.bottom - CAPTION.top,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        zIndex: 2,
      }}
    >
      <div style={{...type.caption, color: colors.white}}>
        {c.map((tok, i) => {
          const first = isHook && ci === 0 && i === 0;
          const p = first ? 1 : prog(t, tok.at - 0.03, dur.word, ease.out);
          return (
            <span key={i} style={{display: 'inline-block', marginRight: i < c.length - 1 ? '0.26em' : 0, opacity: p, transform: `translateY(${(1 - p) * 10}px)`, color: tok.key ? colors.olive : colors.white}}>
              {tok.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------- QA ----------
export const SafeBox: React.FC = () => (
  <Svg>
    <rect x={SAFE.x0} y={SAFE.y0} width={SAFE.x1 - SAFE.x0} height={SAFE.y1 - SAFE.y0} fill="none" stroke="#FF00FF" strokeWidth={3} />
    <line x1={0} y1={CAPTION.top} x2={W} y2={CAPTION.top} stroke="#FF00FF" strokeWidth={1} strokeDasharray="8 8" />
    <line x1={0} y1={CAPTION.bottom} x2={W} y2={CAPTION.bottom} stroke="#FF00FF" strokeWidth={1} strokeDasharray="8 8" />
  </Svg>
);

// ---------- Drawing helpers ----------
export const olive = colors.olive;
export const lineStyle = {stroke: olive, strokeWidth: stroke, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
/** Dark keyline drawn under an olive line so it reads over green fields (same path, wider, 50% black). */
export const keyStyle = {stroke: colors.black, strokeOpacity: 0.5, strokeWidth: stroke + 3, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
/** Draw `d` as an olive line with its keyline. */
export const Line: React.FC<{d: string; opacity?: number; width?: number}> = ({d, opacity = 1, width = stroke}) => (
  <g opacity={opacity}>
    <path d={d} {...keyStyle} strokeWidth={width + 3} />
    <path d={d} {...lineStyle} strokeWidth={width} />
  </g>
);
