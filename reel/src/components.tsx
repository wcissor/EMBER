import React, {createContext, useContext} from 'react';
import {AbsoluteFill, interpolateColors, useCurrentFrame} from 'remotion';
import timeline from './timeline.json';
import {CAPTIONS, LABELS} from './config';
import {colors, stroke, type} from './theme';
import {CAPTION, GRID, H, SAFE, STRIP, W, col} from './layout';
import {dur, ease, prog} from './motion';

// ---------- QA switches (stills and checks only; the reel renders with all false) ----------
export type QA = {textOnly: boolean; showSafeBox: boolean; hideCaptions: boolean};
export const QAContext = createContext<QA>({textOnly: false, showSafeBox: false, hideCaptions: false});
export const useQA = () => useContext(QAContext);

// ---------- Time ----------
export const FPS = timeline.fps;
export const EV = timeline.events;
export const sceneStart = (i: number) => timeline.sceneStarts[i] / FPS;
export const sceneEnd = (i: number) =>
  (i + 1 < timeline.sceneStarts.length ? timeline.sceneStarts[i + 1] : timeline.durationInFrames) / FPS;
/** Seconds since the start of the enclosing <Sequence>. */
export const useLocalTime = () => useCurrentFrame() / FPS;
/** Start/end (seconds, whole reel) of word k of voice line `line` (1-based). */
export const wordAt = (line: number, k: number) => timeline.words.filter((w) => w.line === line)[k];

// ---------- Layers ----------
/** Drawings, hidden in the text-only QA pass. */
export const Draw: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {textOnly} = useQA();
  return textOnly ? null : <>{children}</>;
};

export const Svg: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', ...style}}>
    {children}
  </svg>
);

/** Camera push around the frame centre (drawings only; captions never move). */
export const Camera: React.FC<{scale: number; children: React.ReactNode}> = ({scale, children}) => (
  <AbsoluteFill style={{transform: `scale(${scale})`, transformOrigin: '50% 50%'}}>{children}</AbsoluteFill>
);

// ---------- Type ----------
type Align = 'left' | 'center' | 'right';
export const Label: React.FC<{x: number; y: number; text: string; align?: Align; opacity?: number; color?: string}> = ({
  x,
  y,
  text,
  align = 'left',
  opacity = 1,
  color,
}) => {
  const tx = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
  return (
    <div
      data-text="label"
      style={{position: 'absolute', left: x, top: y, transform: `translateX(${tx})`, opacity, ...type.label, ...(color ? {color} : {})}}
    >
      {text}
    </div>
  );
};

// ---------- Captions: word by word, in time with the voice ----------
type Tok = {text: string; key: boolean; start: number};
type Chunk = {lines: Tok[][]; start: number; end: number};

const buildChunks = (): Chunk[] => {
  const words = timeline.words;
  const out: Chunk[] = [];
  let wi = 0;
  CAPTIONS.forEach((lineChunks, li) => {
    const lineWordCount = words.filter((w) => w.line === li + 1).length;
    const tokenCount = lineChunks.flat(2).length;
    if (lineChunks.length === 0) {
      wi += lineWordCount;
      return;
    }
    if (tokenCount !== lineWordCount) throw new Error(`Caption line ${li + 1}: ${tokenCount} words, voice has ${lineWordCount}`);
    const chunks: Chunk[] = lineChunks.map((chunk) => {
      const lines = chunk.map((ln) =>
        ln.map((raw) => {
          const w = words[wi++];
          const key = raw.startsWith('^');
          return {text: key ? raw.slice(1) : raw, key, start: w.start};
        }),
      );
      return {lines, start: lines[0][0].start, end: 0};
    });
    // A chunk stays until the next chunk of the same line starts, or until the cut to the next scene.
    chunks.forEach((c, k) => {
      c.end = k + 1 < chunks.length ? chunks[k + 1].start : sceneEnd(li);
    });
    out.push(...chunks);
  });
  return out;
};
export const CHUNKS = buildChunks();

export const Captions: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const {hideCaptions} = useQA();
  if (hideCaptions) return null;
  const chunk = CHUNKS.find((c) => t >= c.start - 1e-6 && t < c.end);
  if (!chunk) return null;
  return (
    <div data-text="caption" style={{position: 'absolute', left: CAPTION.x, top: CAPTION.y, width: CAPTION.w, ...type.caption}}>
      {chunk.lines.map((ln, i) => (
        <div key={i} style={{whiteSpace: 'nowrap'}}>
          {ln.map((tok, j) => {
            const p = prog(t, tok.start, dur.word, ease.out);
            const k = tok.key ? prog(t, tok.start, dur.keyword, ease.inOut) : 0;
            return (
              <React.Fragment key={j}>
                <span
                  style={{
                    display: 'inline-block',
                    opacity: p,
                    transform: `translateY(${(1 - p) * 8}px)`,
                    color: tok.key ? interpolateColors(k, [0, 1], [colors.text, colors.olive]) : colors.text,
                  }}
                >
                  {tok.text}
                </span>
                {j < ln.length - 1 ? ' ' : null}
              </React.Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ---------- Finish: 6% vignette and fine grain (1.5% luminance, new pattern every 2 frames) ----------
export const Vignette: React.FC = () => {
  const {textOnly} = useQA();
  if (textOnly) return null;
  return (
    <AbsoluteFill
      style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.06) 100%)', pointerEvents: 'none'}}
    />
  );
};

export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const {textOnly} = useQA();
  if (textOnly) return null;
  const seed = Math.floor(frame / 2);
  const id = `grain-${seed}`;
  // Grey noise around 50%, blended with "overlay" at half strength: about +/-1.5% around any tone.
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, mixBlendMode: 'overlay', opacity: 0.5, pointerEvents: 'none'}}>
      <filter id={id} x={0} y={0} width={W} height={H} filterUnits="userSpaceOnUse">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={1} seed={seed} />
        <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
      </filter>
      <rect x={0} y={0} width={W} height={H} filter={`url(#${id})`} />
    </svg>
  );
};

export const SafeBox: React.FC = () => (
  <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
    {Array.from({length: GRID.cols}).map((_, i) => (
      <rect key={i} x={col(i)} y={0} width={GRID.colW} height={H} fill="rgba(255,0,170,0.05)" />
    ))}
    <rect x={SAFE.x0} y={SAFE.y0} width={SAFE.x1 - SAFE.x0} height={SAFE.y1 - SAFE.y0} fill="none" stroke="#ff00aa" strokeWidth={2} />
  </svg>
);

// ---------- Line wipe: one olive hairline sweeps down; the new scene is revealed above it ----------
export const LineWipe: React.FC<{prev: React.ReactNode; children: React.ReactNode}> = ({prev, children}) => {
  const t = useLocalTime();
  const {textOnly} = useQA();
  const p = prog(t, 0, dur.wipe, ease.inOut);
  if (p >= 1) return <>{children}</>;
  const y = p * H;
  return (
    <>
      <AbsoluteFill style={{clipPath: `inset(${y}px 0 0 0)`}}>{prev}</AbsoluteFill>
      <AbsoluteFill style={{clipPath: `inset(0 0 ${H - y}px 0)`}}>{children}</AbsoluteFill>
      {!textOnly && p > 0 ? <div style={{position: 'absolute', left: 0, top: y - 1, width: W, height: 2, background: colors.olive}} /> : null}
    </>
  );
};

// ---------- Drawing helpers ----------
/** Reveal a stroke drawn with pathLength={1}. */
export const drawn = (p: number) => ({pathLength: 1, strokeDasharray: `${p} 1`, opacity: p > 0.001 ? 1 : 0});

export const Packet: React.FC<{x: number; y: number; opacity?: number; color?: string}> = ({x, y, opacity = 1, color = colors.text}) => (
  <rect x={x - 4} y={y - 4} width={8} height={8} fill={color} opacity={opacity} />
);

/** AgLink, front elevation: enclosure, two antennas, internal chip (hidden line), glands, pole. A diagram, not a render. */
export const Device: React.FC<{
  cx: number;
  top: number;
  w: number;
  h: number;
  antennaTop: number;
  poleTo?: number;
  draw: {body: number; antA: number; antB: number; details: number; pole: number; chip: number};
  lit?: number;
}> = ({cx, top, w, h, antennaTop, poleTo, draw, lit = 0}) => {
  const x0 = cx - w / 2;
  const ax = [cx - w * 0.3, cx + w * 0.3];
  const antLen = top - antennaTop;
  const chipW = Math.round(w * 0.36);
  const chipH = Math.round(chipW * 0.78);
  const chipY = top + h * 0.5 - chipH / 2;
  const bottom = top + h;
  const chipStroke = interpolateColors(lit, [0, 1], [colors.grey, colors.olive]);
  return (
    <g fill="none" strokeLinecap="square">
      {/* enclosure */}
      <rect x={x0} y={top} width={w} height={h} rx={14} stroke={colors.text} strokeWidth={stroke.main} {...drawn(draw.body)} />
      {/* antennas, drawn upward from their connectors */}
      {[draw.antA, draw.antB].map((p, i) => (
        <g key={i} opacity={p > 0.001 ? 1 : 0}>
          <rect x={ax[i] - 10} y={top - 12} width={20} height={12} stroke={colors.text} strokeWidth={stroke.secondary} />
          <line x1={ax[i]} y1={top - 12} x2={ax[i]} y2={top - 12 - (antLen - 12) * p} stroke={colors.text} strokeWidth={stroke.main} />
        </g>
      ))}
      {/* lid seam and cable glands */}
      <g opacity={draw.details}>
        <line x1={x0} y1={top + 40} x2={x0 + w} y2={top + 40} stroke={colors.hairline} strokeWidth={stroke.secondary} />
        <line x1={cx - w * 0.2} y1={bottom} x2={cx - w * 0.2} y2={bottom + 16} stroke={colors.text} strokeWidth={stroke.main} />
        <line x1={cx + w * 0.2} y1={bottom} x2={cx + w * 0.2} y2={bottom + 16} stroke={colors.text} strokeWidth={stroke.main} />
      </g>
      {/* pole and clamp */}
      {poleTo ? (
        <g opacity={draw.pole > 0.001 ? 1 : 0}>
          <line x1={cx} y1={bottom} x2={cx} y2={bottom + (poleTo - bottom) * draw.pole} stroke={colors.text} strokeWidth={stroke.secondary} />
          <line x1={cx - 16} y1={bottom + 24} x2={cx + 16} y2={bottom + 24} stroke={colors.grey} strokeWidth={stroke.secondary} opacity={draw.pole} />
        </g>
      ) : null}
      {/* the chip that runs the model: a hidden line until it lights */}
      <rect
        x={cx - chipW / 2}
        y={chipY}
        width={chipW}
        height={chipH}
        stroke={chipStroke}
        strokeWidth={stroke.secondary}
        strokeDasharray={lit > 0.5 ? undefined : '6 6'}
        fill={colors.olive}
        fillOpacity={0.9 * lit}
        opacity={draw.chip}
      />
    </g>
  );
};

/** The "received" strip: one square per expected packet, filled left to right at a constant rate. */
export const Strip: React.FC<{t: number; start: number; end: number; gaps?: number[]; show: number}> = ({t, start, end, gaps = [], show}) => {
  const {x0, pitch, size, slots, y} = STRIP;
  const step = (end - start) / (slots - 1);
  return (
    <Draw>
      <Svg>
        <line x1={x0} y1={y + 16} x2={x0 + (slots - 1) * pitch + size} y2={y + 16} stroke={colors.hairline} strokeWidth={stroke.secondary} opacity={show} />
        {Array.from({length: slots}).map((_, i) => {
          if (gaps.includes(i)) return null;
          const p = prog(t, start + i * step, 0.1, ease.out);
          return p > 0 ? <rect key={i} x={x0 + i * pitch} y={y} width={size} height={size} fill={colors.text} opacity={p} /> : null;
        })}
      </Svg>
    </Draw>
  );
};

export const StripLabel: React.FC<{show: number}> = ({show}) => <Label x={72} y={STRIP.labelY} text={LABELS.received} opacity={show} />;
