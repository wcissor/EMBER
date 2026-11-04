// S3 (after the split) → S6: the VolunTrack world. Calm, aligned, one thing at a time. Nothing rotates.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {B} from '../data';
import {CATEGORIES, ROLES, UI} from '../config';
import {C, FONT, GLASS, TYPE} from '../theme';
import {AGE_FIELD, COLUMN, CHECK_BADGE, DOTS, FEED, FILTER_BAR, ORG_CARD, ORG_PARTS, SHEET, SHEET_PARTS, SPEAKER_TAG, feedCardY} from '../layout';
import {EASE, clamp01, springAt} from '../motion';
import {Glass, Chip, CheckIcon, ArrowUR, FormIcon, uiText} from '../components/UI';
import {RoleCard} from '../components/RoleCard';
import {CardParticles, DotField, Flecks} from '../components/Canvas';
import {afterCam, starPose, toStage, ECO_PILL, HEADER_STAR} from './choreo';

// ── background: navy, soft blue glow behind the star, 32 px dot grid at 3% drifting 4 px/s ──
export const AfterBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const up = EASE.vtOut(clamp01((frame - B.gridFade) / 40));
  const star = starPose(frame);
  const drift = (frame / 60) * 4;
  const breathe = 1 + 0.32 * Math.sin(2 * Math.PI * 0.25 * (frame / 60));
  return (
    <AbsoluteFill style={{backgroundColor: C.navy}}>
      <AbsoluteFill
        style={{
          opacity: up,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1.8px, rgba(255,255,255,0) 2.2px)',
          backgroundSize: '32px 32px',
          backgroundPosition: `${drift * 0.3}px ${-drift}px`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: up,
          background: `radial-gradient(${900 * (0.96 + 0.04 * breathe)}px ${900 * (0.96 + 0.04 * breathe)}px at ${star.x}px ${star.y}px, rgba(47,107,255,${(0.18 * breathe).toFixed(4)}), rgba(47,107,255,0) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ── S4 helpers ──
const STACK_ORDER = ['adult', 'eco', 'science', 'translate', 'subtitle'];
const STACK_OFF = [-12, 14, -16, 10, -6];
const FEED_ORDER = ['eco', 'science', 'translate', 'subtitle'];
const role = (k: string) => ROLES.find((r) => r.key === k)!;
const stackY = (i: number) => 316 + i * 126;

const Column: React.FC<{frame: number}> = ({frame}) => {
  const draw = EASE.vtInOut(clamp01((frame - B.columnDraw) / 30));
  const fill = EASE.vtOut(clamp01((frame - B.columnDraw - 20) / 24));
  const gone = 1 - clamp01((frame - B.sheetExpand) / 20);
  if (frame < B.columnDraw || gone <= 0) return null;
  const per = 2 * (COLUMN.w + COLUMN.h);
  return (
    <div style={{position: 'absolute', left: COLUMN.x, top: COLUMN.y, width: COLUMN.w, height: COLUMN.h, opacity: gone}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: COLUMN.r, background: 'rgba(14,22,48,0.38)', opacity: fill}} />
      <svg width={COLUMN.w + 4} height={COLUMN.h + 4} style={{position: 'absolute', left: -2, top: -2}}>
        <rect x={2} y={2} width={COLUMN.w} height={COLUMN.h} rx={COLUMN.r} fill="none" stroke="rgba(245,247,255,0.5)" strokeWidth={2} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} opacity={1 - 0.6 * fill} />
      </svg>
    </div>
  );
};

const CheckBadge: React.FC<{frame: number}> = ({frame}) => {
  if (frame < B.checkBadge) return null;
  const s = springAt(frame, B.checkBadge, 'hero');
  const out = 1 - EASE.vtOut(clamp01((frame - B.stackIn) / 16));
  if (out <= 0) return null;
  const r = CHECK_BADGE.r;
  return (
    <div style={{position: 'absolute', left: CHECK_BADGE.cx - r, top: CHECK_BADGE.cy - r, width: r * 2, height: r * 2, borderRadius: r, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${s * out})`, boxShadow: `0 0 28px rgba(47,107,255,0.6)`}}>
      <CheckIcon size={36} color="#FFFFFF" stroke={3.4} progress={clamp01((frame - B.checkBadge - 2) / 10)} />
    </div>
  );
};

/** Feed card state through S4. */
const FeedCard: React.FC<{frame: number; k: string}> = ({frame, k}) => {
  const si = STACK_ORDER.indexOf(k);
  const fi = FEED_ORDER.indexOf(k);
  const appear = EASE.vtOut(clamp01((frame - B.stackIn - si * 3) / 30));
  const snap = fi >= 0 ? springAt(frame, B.hero + fi * 3, 'hero') : 0;
  const sharp = fi >= 0 ? clamp01(springAt(frame, B.hero + fi * 3, 'settle')) : 0;
  // 18+ card breaks up when the ripple hits it
  const dissolve = k === 'adult' ? clamp01((frame - B.rippleHit) / 10) : 0;
  if (k === 'adult' && dissolve >= 1) return null;
  // filters down to the eco card
  const filtered = k !== 'eco' ? clamp01(springAt(frame, B.categoryGlide + 6, 'settle')) : 0;
  if (filtered >= 0.995) return null;
  const x0 = FEED.x + STACK_OFF[si];
  const y0 = stackY(si);
  const x1 = FEED.x;
  const y1 = fi >= 0 ? feedCardY(fi) : y0;
  const x = x0 + (x1 - x0) * snap;
  const y = y0 + (y1 - y0) * snap + 40 * filtered;
  const blur = 18 * (1 - sharp);
  const opacity = appear * (0.4 + 0.6 * sharp) * (1 - dissolve) * (1 - filtered);
  const scale = 0.96 + 0.04 * sharp;
  const openLit = fi >= 0 ? clamp01((frame - (B.openLights + fi * 4)) / 6) : 0;
  const applyFill = fi >= 0 ? clamp01((frame - (B.applyFill + fi * 4)) / 10) : 0;
  const landed = k === 'eco' && frame >= B.applyTap;
  // feed mask: the fourth card fades under a mask
  const mask = 'linear-gradient(to bottom, #000 0px, #000 ' + (FEED.maskFrom - y) + 'px, rgba(0,0,0,0) ' + (FEED.maskTo - y) + 'px)';
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: FEED.cardW,
        height: FEED.cardH,
        opacity,
        transform: `scale(${scale})`,
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        WebkitMaskImage: snap > 0.5 ? mask : undefined,
        maskImage: snap > 0.5 ? mask : undefined,
      }}
    >
      <RoleCard role={role(k)} openLit={openLit} applyFill={applyFill} hideGlyph={landed} blur={blur < 1} />
    </div>
  );
};

const ToggleAndCategory: React.FC<{frame: number}> = ({frame}) => {
  const appear = EASE.vtOut(clamp01((frame - B.stackIn) / 24));
  if (frame < B.stackIn) return null;
  // category chips glide through the bar; the highlight lands on Environment
  const target = CATEGORIES.indexOf('Environment');
  const glide = clamp01(springAt(frame, B.categoryGlide, 'settle'));
  const cc = FILTER_BAR.categoryChip;
  const tg = FILTER_BAR.toggle;
  const chipW = 236;
  const items = [UI.categoryAll, ...CATEGORIES];
  const offset = -(target + 1) * (chipW + 12) * glide;
  const highlight = clamp01((frame - B.categoryGlide - 16) / 8);
  // toggle: both formats active → flips to Baku only
  const flip = clamp01(springAt(frame, B.toggleFlip, 'settle'));
  const half = (tg.x1 - tg.x0 - 8) / 2;
  const hlX = 4 + half * flip;
  const hlW = (tg.x1 - tg.x0 - 8) * (1 - flip) + half * flip;
  return (
    <div style={{opacity: appear}}>
      <div style={{position: 'absolute', left: cc.x0, top: cc.y0, width: cc.x1 - cc.x0 + 100, height: cc.y1 - cc.y0, overflow: 'hidden', WebkitMaskImage: 'linear-gradient(to right, #000 85%, rgba(0,0,0,0))'}}>
        <div style={{position: 'absolute', left: offset, top: 0, display: 'flex', gap: 12}}>
          {items.map((label, i) => {
            const isTarget = i === target + 1;
            return (
              <div key={label} style={{width: chipW, display: 'flex'}}>
                <Chip label={label} height={cc.y1 - cc.y0} filled={isTarget && highlight > 0.5} style={{minWidth: chipW, opacity: isTarget ? 1 : 0.85}} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{position: 'absolute', left: tg.x0, top: tg.y0, width: tg.x1 - tg.x0, height: tg.y1 - tg.y0, borderRadius: (tg.y1 - tg.y0) / 2, boxShadow: 'inset 0 0 0 1.5px rgba(141,154,192,0.55)'}}>
        <div style={{position: 'absolute', left: hlX, top: 4, width: hlW, height: tg.y1 - tg.y0 - 8, borderRadius: (tg.y1 - tg.y0 - 8) / 2, background: C.blue}} />
        <div style={{position: 'absolute', inset: 0, display: 'flex'}}>
          {[UI.formatOnline, UI.formatBaku].map((l, i) => (
            <div key={l} style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', ...TYPE.chip, color: i === 0 ? `rgba(245,247,255,${1 - 0.45 * flip})` : C.white}}>
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/** Age field: large and centred, then shrinks into the "Age 16" chip (settle). */
const AgeField: React.FC<{frame: number}> = ({frame}) => {
  if (frame < B.fieldRise) return null;
  const rise = EASE.vtOut(clamp01((frame - B.fieldRise) / 24));
  const m = clamp01(springAt(frame, B.hero, 'settle'));
  const pulse = frame >= B.fieldPulse && frame < B.fieldPulse + 10 ? Math.sin((Math.PI * (frame - B.fieldPulse)) / 10) * 0.035 : 0;
  const F = {x: AGE_FIELD.cx - AGE_FIELD.w / 2, y: AGE_FIELD.cy - AGE_FIELD.h / 2, w: AGE_FIELD.w, h: AGE_FIELD.h, r: 28};
  const ch = FILTER_BAR.ageChip;
  const T = {x: ch.x0, y: ch.y0, w: ch.x1 - ch.x0, h: ch.y1 - ch.y0, r: (ch.y1 - ch.y0) / 2};
  const lerp = (a: number, b: number) => a + (b - a) * m;
  const box = {x: lerp(F.x, T.x), y: lerp(F.y, T.y) + 60 * (1 - rise), w: lerp(F.w, T.w), h: lerp(F.h, T.h), r: lerp(F.r, T.r)};
  const caretOn = Math.floor((frame - B.fieldRise) / 32) % 2 === 0;
  const has1 = frame >= B.digit1;
  const has6 = frame >= B.digit6;
  const digitsOut = clamp01(m * 2.2);
  const chipIn = clamp01((m - 0.45) * 2.2);
  const digitStyle: React.CSSProperties = {fontFamily: FONT.ui, fontWeight: 700, fontSize: 76, color: C.white, ...TYPE.ages, display: 'inline-block'};
  const Digit: React.FC<{ch: string; at: number}> = ({ch: d, at}) => {
    const t = frame - at;
    const pose = (tt: number) => {
      const r = EASE.vtOut(clamp01(tt / 12));
      return {y: -56 * (1 - r), o: r};
    };
    const p = pose(t);
    return (
      <span style={{position: 'relative', display: 'inline-block'}}>
        {[{lag: 6, op: 0.4}, {lag: 12, op: 0.22}, {lag: 18, op: 0.1}].map(({lag, op}) => {
          const g = pose(t - lag);
          if (t - lag < 0 || g.y > -0.5) return null;
          return (
            <span key={lag} style={{...digitStyle, position: 'absolute', left: 0, top: 0, color: C.blue, opacity: op, transform: `translateY(${g.y}px)`}}>
              {d}
            </span>
          );
        })}
        <span style={{...digitStyle, position: 'relative', opacity: p.o, transform: `translateY(${p.y}px)`}}>{d}</span>
      </span>
    );
  };
  return (
    <>
      <div style={{position: 'absolute', left: 0, width: 1080, top: AGE_FIELD.labelY - 22, textAlign: 'center', ...uiText(32, 600, C.muted), opacity: rise * (1 - clamp01(m * 3))}}>{UI.ageLabel}</div>
      <div
        style={{
          position: 'absolute',
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          borderRadius: box.r,
          opacity: rise,
          transform: `scale(${1 + pulse})`,
          background: m > 0.5 ? `rgba(47,107,255,${chipIn})` : GLASS.fill,
          backdropFilter: GLASS.backdrop,
          boxShadow: m > 0.5 ? 'none' : `inset 0 0 0 1.5px rgba(141,154,192,0.6), 0 0 0 ${6 * pulse * 20}px rgba(47,107,255,${0.25 * (pulse > 0 ? 1 : 0)}), ${GLASS.shadow}`,
          overflow: 'hidden',
        }}
      >
        <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1 - digitsOut}}>
          {has1 && <Digit ch={UI.ageTyped[0]} at={B.digit1} />}
          {has6 && <Digit ch={UI.ageTyped[1]} at={B.digit6} />}
          <span style={{width: 4, height: 64, marginLeft: has1 ? 6 : 0, background: C.white, borderRadius: 2, opacity: caretOn ? 1 : 0}} />
        </div>
        <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...TYPE.chip, ...TYPE.ages, color: '#FFFFFF', opacity: chipIn}}>{UI.ageChip}</div>
      </div>
    </>
  );
};

const Ripple: React.FC<{frame: number}> = ({frame}) => {
  const t = (frame - B.fieldPulse) / 40;
  if (t < 0 || t > 1) return null;
  const r = 1400 * EASE.vtOut(t);
  return (
    <svg width="1080" height="1920" style={{position: 'absolute', left: 0, top: 0}}>
      <circle cx={AGE_FIELD.cx} cy={AGE_FIELD.cy} r={r} fill="none" stroke={C.glow} strokeWidth={3} opacity={0.6 * (1 - t)} />
      <circle cx={AGE_FIELD.cx} cy={AGE_FIELD.cy} r={r * 0.94} fill="none" stroke={C.blue} strokeWidth={8} opacity={0.25 * (1 - t)} style={{filter: 'blur(4px)'}} />
    </svg>
  );
};

// ── S5 · Apply sheet ──
const ApplySheet: React.FC<{frame: number}> = ({frame}) => {
  if (frame < B.sheetExpand) return null;
  const t = EASE.vtInOut(clamp01((frame - B.sheetExpand) / 30));
  const from = {x: ECO_PILL.x - 84, y: ECO_PILL.y - 30, w: 168, h: 60, r: 30};
  const to = {x: SHEET.x, y: SHEET.y, w: SHEET.w, h: SHEET.h, r: GLASS.radius};
  const L = (a: number, b: number) => a + (b - a) * t;
  const box = {x: L(from.x, to.x), y: L(from.y, to.y), w: L(from.w, to.w), h: L(from.h, to.h), r: L(from.r, to.r)};
  const content = clamp01((frame - B.sheetExpand - 22) / 12);
  const fieldIn = (i: number) => EASE.vtOut(clamp01((frame - B.sheetExpand - 28 - i * 3) / 18));
  // diagram: You → (middleman) → their form
  const D = SHEET_PARTS.diagram;
  const dIn = EASE.vtOut(clamp01((frame - B.diagram) / 14));
  const line = EASE.vtInOut(clamp01((frame - B.diagram - 6) / 44));
  const popT = clamp01((frame - B.middlemanPop) / 10);
  const popped = frame >= B.middlemanPop + 10;
  const boxScale = frame < B.middlemanPop ? 1 : popT < 0.3 ? 1 + 0.15 * (popT / 0.3) : Math.max(0, 1.15 * (1 - (popT - 0.3) / 0.7));
  const blueT = clamp01((frame - B.middlemanPop - 4) / 8);
  const lineColor = `rgba(${Math.round(141 + (47 - 141) * blueT)}, ${Math.round(154 + (107 - 154) * blueT)}, ${Math.round(192 + (255 - 192) * blueT)}, 1)`;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920}}>
      <div style={{position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: box.r, background: t < 0.25 ? C.blue : GLASS.fill, backdropFilter: GLASS.backdrop, boxShadow: `inset 0 0 0 1px ${GLASS.stroke}, ${GLASS.shadow}`, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, background: C.blue, opacity: 1 - clamp01(t * 3)}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 40, background: `linear-gradient(${GLASS.highlightTop}, rgba(255,255,255,0))`}} />
      </div>
      <div style={{position: 'absolute', left: HEADER_STAR.x + 44, top: SHEET_PARTS.header.y + 8, display: 'flex', alignItems: 'center', gap: 12, opacity: content, ...uiText(40, 600)}}>
        {UI.sheetTitle}
        <ArrowUR size={40} color={C.white} stroke={2.6} />
      </div>
      {/* diagram */}
      <div style={{opacity: dIn * content}}>
        <svg width="1080" height="1920" style={{position: 'absolute', left: 0, top: 0}}>
          <line x1={D.youX + 26} y1={D.y} x2={D.youX + 26 + (D.formX - 34 - D.youX - 26) * line} y2={D.y} stroke={lineColor} strokeWidth={4} strokeLinecap="round" />
          <circle cx={D.youX} cy={D.y} r={22} fill={C.white} />
        </svg>
        <div style={{position: 'absolute', left: D.youX - 60, width: 120, top: D.y + 32, textAlign: 'center', ...uiText(28, 600)}}>{UI.diagramYou}</div>
        <div style={{position: 'absolute', left: D.formX - 30, top: D.y - 30, opacity: clamp01((line - 0.8) * 5)}}>
          <FormIcon size={60} color={C.white} />
        </div>
        {!popped && (
          <div style={{position: 'absolute', left: D.middleX - 78, top: D.y - 38, width: 156, height: 76, borderRadius: 18, border: '3px dashed rgba(141,154,192,0.85)', background: C.navy, transform: `scale(${boxScale})`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: clamp01((line - 0.35) * 6)}}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{width: 12, height: 12, borderRadius: 6, background: 'rgba(141,154,192,0.9)'}} />
            ))}
          </div>
        )}
        <Flecks frame={frame} start={B.middlemanPop + 3} count={22} seed="puff" color="rgba(141,154,192,0.9)" dur={22} origin={(i) => ({x: D.middleX, y: D.y, vx: Math.cos(i * 0.9) * (3 + (i % 5)), vy: Math.sin(i * 0.9) * (3 + (i % 4)) - 2})} />
      </div>
      {/* fields */}
      {UI.sheetFields.map((label, i) => {
        const F = SHEET_PARTS.fields;
        const y = F.y0 + i * F.step;
        return (
          <div key={label} style={{position: 'absolute', left: F.x, top: y + 14 * (1 - fieldIn(i)), opacity: fieldIn(i)}}>
            <div style={{...uiText(28, 500, C.muted), marginBottom: 10}}>{label}</div>
            <div style={{width: F.w, height: F.h - 8, borderRadius: 18, boxShadow: 'inset 0 0 0 1.5px rgba(141,154,192,0.45)', background: 'rgba(255,255,255,0.02)'}} />
          </div>
        );
      })}
    </div>
  );
};

// ── S6 · Organizer card (the back of the sheet) ──
const TYPE_STEP = 3;
const typed = (text: string, frame: number, start: number, chunk = 3) => {
  if (frame < start) return '';
  const n = Math.min(text.length, (Math.floor((frame - start) / TYPE_STEP) + 1) * chunk);
  return text.slice(0, n);
};

const OrgCard: React.FC<{frame: number}> = ({frame}) => {
  const F = B.formFill;
  const plus = frame >= B.plusPulse && frame < B.plusPulse + 16 ? Math.sin((Math.PI * (frame - B.plusPulse)) / 16) * 0.22 : 0;
  const fields = UI.orgFields;
  const starts = [F, F + 27, F + 36, F + 42, F + 48];
  const ticks = [F + 24, F + 33, F + 39, F + 45, F + 51];
  const press = frame >= B.submitPress && frame < B.submitPress + 12 ? 1 - 0.05 * Math.sin((Math.PI * (frame - B.submitPress)) / 12) : 1;
  const free = springAt(frame, B.freeChip, 'hero');
  const reviewIn = clamp01((frame - B.submitPress - 4) / 8);
  const checkedT = clamp01((frame - B.checked) / 10);
  return (
    <Glass style={{left: ORG_CARD.x, top: ORG_CARD.y, width: ORG_CARD.w, height: ORG_CARD.h}}>
      <div style={{position: 'absolute', left: ORG_PARTS.title.x - ORG_CARD.x, top: ORG_PARTS.title.y - ORG_CARD.y, display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{width: 56, height: 56, borderRadius: 28, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + plus})`, boxShadow: `0 0 ${30 * plus * 4}px rgba(47,107,255,0.7)`, ...uiText(44, 600, '#FFFFFF'), lineHeight: 1}}>+</div>
        <div style={{...uiText(44, 700)}}>{UI.orgTitle}</div>
      </div>
      {fields.map((fd, i) => {
        const y = ORG_PARTS.fields.y0 - ORG_CARD.y + i * ORG_PARTS.fields.step;
        const val = i === 0 ? typed(fd.value, frame, starts[i]) : i === 1 ? typed(fd.value, frame, starts[i], 2) : frame >= starts[i] ? fd.value : '';
        const tick = clamp01((frame - ticks[i]) / 6);
        const chip = i === 2 || i === 3;
        return (
          <div key={fd.label} style={{position: 'absolute', left: ORG_PARTS.fields.x - ORG_CARD.x, top: y, width: 760}}>
            <div style={{...uiText(28, 500, C.muted)}}>{fd.label}</div>
            <div style={{marginTop: 6, height: 44, display: 'flex', alignItems: 'center'}}>
              {chip ? (
                val ? <Chip label={val} height={40} style={{transform: `scale(${springAt(frame, starts[i], 'snap')})`, transformOrigin: 'left center'}} /> : null
              ) : (
                <span style={{...uiText(32, 500, (fd as {placeholder?: boolean}).placeholder ? 'rgba(141,154,192,0.7)' : C.white), ...TYPE.ages}}>{val}</span>
              )}
            </div>
            <div style={{position: 'absolute', right: 0, top: 26, opacity: tick}}>
              <CheckIcon size={34} color={C.blue} stroke={3.2} progress={tick} />
            </div>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: ORG_PARTS.fields.x - ORG_CARD.x, top: ORG_PARTS.footer.y - ORG_CARD.y, display: 'flex', alignItems: 'center', gap: 16, width: 780}}>
        <div style={{height: 68, padding: '0 30px', borderRadius: 34, background: C.blue, display: 'flex', alignItems: 'center', ...uiText(30, 700, '#FFFFFF'), transform: `scale(${press})`}}>{UI.orgSubmit}</div>
        <div style={{transform: `scale(${free})`, opacity: clamp01(free * 3)}}>
          <Chip label={UI.orgFree} height={48} />
        </div>
        <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, opacity: reviewIn, ...uiText(28, 600, C.muted)}}>
          {checkedT <= 0 ? (
            <>
              <span style={{width: 10, height: 10, borderRadius: 5, background: C.muted}} />
              {UI.orgInReview}
            </>
          ) : (
            <span style={{display: 'flex', alignItems: 'center', gap: 6, color: C.white}}>
              {UI.orgChecked}
              <CheckIcon size={30} color={C.blue} stroke={3.4} progress={checkedT} />
            </span>
          )}
        </div>
      </div>
    </Glass>
  );
};

/** The flip: the whole stage turns 180° around its vertical axis (perspective 1,800 px). */
const FlipStage: React.FC = () => {
  const frame = useCurrentFrame();
  const t = EASE.vtInOut(clamp01((frame - B.flip) / 24));
  const angle = 180 * t;
  const collapse = EASE.vtInOut(clamp01((frame - B.collapse) / 18));
  const cx = SHEET.x + SHEET.w / 2;
  const cy = SHEET.y + SHEET.h / 2;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, perspective: 1800, perspectiveOrigin: `${cx}px ${cy}px`, opacity: 1 - collapse}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transformStyle: 'preserve-3d', transform: `rotateY(${angle}deg) scale(${1 - 0.94 * collapse})`, transformOrigin: `${cx}px ${cy}px`}}>
        <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden'}}>
          <ApplySheet frame={frame} />
        </div>
        <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)'}}>
          {frame >= B.flip && <OrgCard frame={frame} />}
        </div>
      </div>
    </div>
  );
};

export const AfterStage: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < B.split) return null;
  const cam = afterCam(frame);
  const flipping = frame >= B.flip && frame < B.flip + 24;
  const s4 = frame >= B.stackIn && frame < B.sheetExpand + 24;
  const feedFade = 1 - clamp01((frame - B.sheetExpand) / 18);
  const star = starPose(frame);
  const starStage = toStage(cam, star.x, star.y);
  const homeStage = toStage(cam, SPEAKER_TAG.x, SPEAKER_TAG.y);
  const dotsOn = frame >= B.collapse + 8;
  const blow = springAt(frame, B.blowout, 'hero');
  const ringLabel = frame < B.blowout ? UI.ringLabelBefore : UI.ringLabelAfter;
  const labelT = frame < B.blowout ? EASE.vtOut(clamp01((frame - B.collapse - 12) / 12)) : 1;
  const labelSwap = clamp01((frame - B.blowout) / 10);
  const labelGone = 1 - clamp01((frame - B.logoRise) / 20);
  return (
    <AbsoluteFill style={{transform: `translate(${cam.ox * (1 - cam.s)}px, ${cam.oy * (1 - cam.s)}px) scale(${cam.s})`, transformOrigin: '0 0'}}>
      <Column frame={frame} />
      <CheckBadge frame={frame} />
      {s4 && (
        <div style={{opacity: feedFade}}>
          <ToggleAndCategory frame={frame} />
          {STACK_ORDER.map((k) => (
            <FeedCard key={k} frame={frame} k={k} />
          ))}
          <AgeField frame={frame} />
          <Ripple frame={frame} />
          {frame >= B.rippleHit && frame < B.rippleHit + 46 && (
            <CardParticles frame={frame} start={B.rippleHit} from={{x: FEED.x + STACK_OFF[0], y: stackY(0), w: FEED.cardW, h: FEED.cardH}} to={homeStage} origin={{x: AGE_FIELD.cx, y: AGE_FIELD.cy}} />
          )}
        </div>
      )}
      {frame >= B.sheetExpand &&
        frame < B.collapse + 20 &&
        (flipping ? (
          <CameraMotionBlur shutterAngle={180} samples={8}>
            <FlipStage />
          </CameraMotionBlur>
        ) : (
          <FlipStage />
        ))}
      {dotsOn && (
        <DotField frame={frame} collapse={B.collapse} blowout={B.blowout} drift={B.drift} stream={B.logoRise} logo={starStage} center={{x: DOTS.cx, y: DOTS.cy}} ringR={DOTS.ringR} blow={blow} />
      )}
      {dotsOn && labelGone > 0 && (
        <div style={{position: 'absolute', left: 0, width: 1080, top: DOTS.labelY - 22, textAlign: 'center', ...uiText(32, 600, C.muted), opacity: labelT * labelGone}}>
          <span style={{opacity: frame < B.blowout ? 1 : labelSwap, color: frame < B.blowout ? C.muted : C.white, padding: '6px 18px', borderRadius: 18, background: 'rgba(8,13,28,0.72)', boxShadow: '0 0 24px 12px rgba(8,13,28,0.6)'}}>{ringLabel}</span>
        </div>
      )}
      {frame >= B.collapse && frame < B.collapse + 24 && (
        <div
          style={{
            position: 'absolute',
            left: DOTS.cx - 14,
            top: DOTS.cy - 14,
            width: 28,
            height: 28,
            borderRadius: 14,
            background: C.white,
            boxShadow: `0 0 40px 10px rgba(141,184,255,0.8)`,
            opacity: clamp01((frame - B.collapse - 8) / 6) * (1 - clamp01((frame - B.blowout) / 6)),
          }}
        />
      )}
    </AbsoluteFill>
  );
};
