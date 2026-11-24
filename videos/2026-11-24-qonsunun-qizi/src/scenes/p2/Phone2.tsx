// 5 · His phone, close (VolunTrack-tagged: the site's own colours live here). Drawn in code to match voluntrack.site,
// with demo data only (a fictional organiser, no counts, no real people). The flow is the site's: the role opens
// without an account → "sign in to apply" → sign-in (sped up) → Apply → the organiser's form in a new tab (a flash) →
// back on the role → the applied tick with confetti.
import React from 'react';
import {Img, random, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT} from '../../theme';
import {mix, rgba} from '../../color';
import {DEMO, type Lang} from '../../config';
import {clamp01, ease, EASE, lerp, springAt} from '../../motion';
import {timelineFor} from '../../data';
import {VT} from '../../vt';

// the phone on screen: body 640×1000 at (220, 70), screen inset 20 px (captions keep the rail below it)
const PH = {x: 220, y: 70, w: 640, h: 1000, r: 72};
const SC = {x: PH.x + 20, y: PH.y + 20, w: PH.w - 40, h: PH.h - 40, r: 56};
const NIGHT = '#0A1024';
const CARD = '#141C36';
const LINE = 'rgba(255,255,255,0.10)';
const SOFT = 'rgba(214,224,245,0.72)';
const GREEN = '#2FAF6A';

const text = (size: number, weight = 600, color = '#FFFFFF'): React.CSSProperties => ({fontFamily: FONT.ui, fontSize: size, fontWeight: weight, color, lineHeight: 1.18, letterSpacing: '-0.01em'});

/** The site's own images (voluntrack.site/static/images, read 24 Nov 2026): the header's logo-round.png and the
 *  link preview's og:image, story.png (the logo on navy, square), shown whole on its own navy. */
const SITE_LOGO = 'site/logo-round.png';
const SITE_PREVIEW = 'site/story.png';
const PREVIEW_BG = '#080E1C';

const Chip: React.FC<{label: string; color?: string; fill?: string}> = ({label, color = '#FFFFFF', fill = 'rgba(255,255,255,0.08)'}) => (
  <div style={{...text(28, 600, color), padding: '10px 22px', borderRadius: 999, background: fill, border: `1.5px solid ${LINE}`, whiteSpace: 'nowrap'}}>{label}</div>
);

/** The chat with her message and the link card. */
const Chat: React.FC<{f: number; B: Record<string, number>}> = ({f, B}) => {
  const pop = springAt(f, B.msgPop, 'hero');
  const card = springAt(f, B.msgPop + 6, 'hero');
  const press = f >= B.linkTap && f < B.linkTap + 6 ? 0.97 : 1;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0E1222'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 150, background: '#151A2E', borderBottom: `1.5px solid ${LINE}`, display: 'flex', alignItems: 'flex-end', padding: '0 30px 22px', gap: 20}}>
        <div style={{...text(40, 600, SOFT)}}>‹</div>
        <div style={{width: 64, height: 64, borderRadius: 32, background: mix('#8A6A44', '#141C36', 0.3), display: 'flex', alignItems: 'center', justifyContent: 'center', ...text(30, 700)}}>Q</div>
        <div style={{...text(32, 700)}}>{DEMO.sender}</div>
      </div>
      <div style={{position: 'absolute', left: 30, top: 230, opacity: clamp01(pop * 1.5), transform: `translateY(${(1 - pop) * 30}px) scale(${0.9 + 0.1 * pop})`, transformOrigin: 'left bottom'}}>
        <div style={{...text(34, 500), background: '#262D47', padding: '20px 28px', borderRadius: '30px 30px 30px 8px', maxWidth: 440}}>Linki atdım, aç</div>
      </div>
      <div style={{position: 'absolute', left: 30, top: 350, width: 440, opacity: clamp01(card * 1.5), transform: `translateY(${(1 - card) * 30}px) scale(${(0.9 + 0.1 * card) * press})`, transformOrigin: 'left top', background: '#262D47', borderRadius: 30, overflow: 'hidden'}}>
        <div style={{height: 220, background: PREVIEW_BG, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Img src={staticFile(SITE_PREVIEW)} style={{width: 220, height: 220, display: 'block'}} />
        </div>
        <div style={{padding: '20px 26px 24px'}}>
          <div style={{...text(32, 700)}}>{DEMO.role}</div>
          <div style={{...text(26, 500, SOFT), marginTop: 6}}>{DEMO.org}</div>
          <div style={{...text(26, 600, VT.core), marginTop: 10}}>voluntrack.site</div>
        </div>
      </div>
    </div>
  );
};

/** The role page (voluntrack.site): category, title, organiser, details, the sticky button. */
const RolePage: React.FC<{f: number; B: Record<string, number>; state: 'guest' | 'member' | 'applied'}> = ({f, B, state}) => {
  const press = (at: number) => (f >= at && f < at + 6 ? 0.96 : 1);
  const tick = springAt(f, B.tick, 'hero');
  const btn = state === 'guest' ? DEMO.signUp : state === 'member' ? DEMO.apply : DEMO.applied;
  const fill = state === 'applied' ? mix(GREEN, VT.blue, 0.15) : VT.blue;
  return (
    <div style={{position: 'absolute', inset: 0, background: NIGHT}}>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(520px 420px at 80% 8%, ${rgba(VT.blue, 0.3)} 0%, rgba(0,0,0,0) 70%)`}} />
      {/* site header */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 150, display: 'flex', alignItems: 'flex-end', padding: '0 34px 24px', gap: 16, borderBottom: `1.5px solid ${LINE}`}}>
        <Img src={staticFile(SITE_LOGO)} style={{width: 56, height: 56, display: 'block'}} />
        <div style={{...text(34, 800)}}>VolunTrack</div>
        <div style={{flex: 1}} />
        <div style={{...text(24, 700, NIGHT), background: '#FFFFFF', borderRadius: 999, padding: '6px 16px'}}>AZ</div>
      </div>
      <div style={{position: 'absolute', left: 34, right: 34, top: 200}}>
        <div style={{display: 'flex'}}>
          <Chip label={DEMO.category} color="#FFFFFF" fill={rgba(GREEN, 0.85)} />
        </div>
        <div style={{...text(56, 800), marginTop: 26, letterSpacing: '-0.02em'}}>{DEMO.role}</div>
        <div style={{...text(30, 600, SOFT), marginTop: 12}}>{DEMO.org}</div>
        <div style={{display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap'}}>
          <Chip label={DEMO.place} />
          <Chip label={DEMO.age} />
          <Chip label={DEMO.when} />
        </div>
        <div style={{...text(30, 500, SOFT), marginTop: 32, lineHeight: 1.35}}>{DEMO.about}</div>
      </div>
      {/* the sticky apply bar */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 190, background: rgba(NIGHT, 0.96), borderTop: `1.5px solid ${LINE}`}}>
        <div
          style={{
            position: 'absolute', left: 34, right: 34, top: 40, height: 104, borderRadius: 999, background: fill, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            transform: `scale(${press(B.signTap) * press(B.applyTap) * (state === 'applied' ? 0.94 + 0.06 * tick : 1)})`,
            boxShadow: `0 16px 40px ${rgba(fill, 0.45)}`,
          }}
        >
          {state === 'applied' && (
            <svg width={44} height={44} viewBox="0 0 44 44">
              <circle cx={22} cy={22} r={20} fill="#FFFFFF" />
              <path d="M12 23 l7 7 l14 -15" stroke={GREEN} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={40} strokeDashoffset={40 * (1 - clamp01(tick * 1.2))} />
            </svg>
          )}
          <div style={{...text(36, 700)}}>{btn}</div>
        </div>
      </div>
    </div>
  );
};

/** Sign-in sheet, sped up: the email types itself, the password fills, "Daxil ol". */
const SignIn: React.FC<{f: number; at: number}> = ({f, at}) => {
  const up = springAt(f, at, 'settle');
  const down = ease(f, at + 18, 6, EASE.inOut);
  const typed = DEMO.email.slice(0, Math.floor(clamp01((f - at - 3) / 7) * DEMO.email.length));
  const dots = '•'.repeat(Math.floor(clamp01((f - at - 10) / 4) * 8));
  const press = f >= at + 15 && f < at + 19 ? 0.96 : 1;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 640, transform: `translateY(${(1 - up) * 640 + down * 680}px)`, background: '#141C36', borderRadius: '44px 44px 0 0', borderTop: `1.5px solid ${LINE}`, padding: '40px 34px'}}>
      <div style={{...text(40, 800)}}>Daxil ol</div>
      <div style={{...text(26, 600, SOFT), marginTop: 26}}>E-poçt</div>
      <div style={{...text(30, 500), marginTop: 10, height: 76, borderRadius: 20, background: NIGHT, border: `1.5px solid ${LINE}`, display: 'flex', alignItems: 'center', padding: '0 22px'}}>{typed}</div>
      <div style={{...text(26, 600, SOFT), marginTop: 22}}>Şifrə</div>
      <div style={{...text(30, 700), marginTop: 10, height: 76, borderRadius: 20, background: NIGHT, border: `1.5px solid ${LINE}`, display: 'flex', alignItems: 'center', padding: '0 22px', letterSpacing: '0.2em'}}>{dots}</div>
      <div style={{marginTop: 34, height: 96, borderRadius: 999, background: VT.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${press})`, ...text(34, 700)}}>Daxil ol</div>
    </div>
  );
};

/** The organiser's form, opened in a new tab (a flash). */
const OrgForm: React.FC = () => (
  <div style={{position: 'absolute', inset: 0, background: '#F4F2EC'}}>
    <div style={{height: 150, background: '#E6E2D8', display: 'flex', alignItems: 'flex-end', padding: '0 30px 22px'}}>
      <div style={{...text(24, 600, '#4A4A4A'), background: '#FFFFFF', borderRadius: 999, padding: '8px 20px'}}>forms · yeni tab</div>
    </div>
    <div style={{padding: '40px 34px'}}>
      <div style={{...text(38, 800, '#2A2A2A')}}>{DEMO.formTitle}</div>
      {['Ad, soyad', 'Telefon', 'Yaş'].map((l) => (
        <div key={l} style={{marginTop: 30}}>
          <div style={{...text(26, 600, '#555555')}}>{l}</div>
          <div style={{height: 64, marginTop: 10, borderBottom: '3px solid #B8B2A6'}} />
        </div>
      ))}
      <div style={{marginTop: 40, width: 220, height: 84, borderRadius: 16, background: '#5A6B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', ...text(30, 700)}}>Göndər</div>
    </div>
  </div>
);

/** A silhouette thumb that taps the screen (screen coordinates). */
const Thumb: React.FC<{f: number; taps: {at: number; x: number; y: number}[]}> = ({f, taps}) => {
  // between taps the thumb rests off the bottom-right corner
  const rest = {x: 980, y: 1500};
  let x = rest.x;
  let y = rest.y;
  let press = 0;
  for (const tp of taps) {
    const a = ease(f, tp.at - 8, 8, EASE.out);
    const b = ease(f, tp.at + 4, 9, EASE.inOut);
    if (f >= tp.at - 8 && f < tp.at + 13) {
      x = lerp(lerp(rest.x, tp.x, a), rest.x, b);
      y = lerp(lerp(rest.y, tp.y, a), rest.y, b);
      press = f >= tp.at && f < tp.at + 4 ? 1 : 0;
    }
  }
  if (x >= rest.x - 1 && y >= rest.y - 1) return null;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <g transform={`translate(${x} ${y}) rotate(-28) scale(${press ? 0.96 : 1})`}>
        <path d="M-46 0 q0 -60 46 -60 q46 0 46 60 l10 420 h-112 z" fill={C.shadow} />
        <path d="M-46 0 q0 -60 46 -60 q46 0 46 60" fill="none" stroke={mix(VT.core, '#FFFFFF', 0.3)} strokeWidth={3} opacity={0.5} />
      </g>
      {taps.map((tp) => {
        const k = clamp01((f - tp.at) / 12);
        if (f < tp.at || k >= 1) return null;
        return <circle key={tp.at} cx={tp.x} cy={tp.y - 58} r={20 + 70 * k} fill="none" stroke="#FFFFFF" strokeWidth={4} opacity={0.6 * (1 - k)} />;
      })}
    </svg>
  );
};

/** Confetti from the button (category colours on the phone only). */
const Confetti: React.FC<{f: number; at: number; cx: number; cy: number}> = ({f, at, cx, cy}) => {
  const t = f - at;
  if (t < 0 || t > 40) return null;
  const cols = ['#FFFFFF', VT.core, '#F2C84B', GREEN, '#E2382F', '#7FA8FF'];
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {Array.from({length: 46}, (_, i) => {
        const a = -Math.PI / 2 + (random(`cf-a-${i}`) - 0.5) * 2.6;
        const v = 16 + random(`cf-v-${i}`) * 22;
        const x = cx + Math.cos(a) * v * t;
        const y = cy + Math.sin(a) * v * t + 0.9 * t * t;
        const r = random(`cf-r-${i}`) * 360 + t * (12 + random(`cf-s-${i}`) * 20);
        return <rect key={i} x={x - 7} y={y - 4} width={14} height={8} rx={2} fill={cols[i % cols.length]} transform={`rotate(${r} ${x} ${y})`} opacity={1 - clamp01((t - 26) / 14)} />;
      })}
    </svg>
  );
};

export const Phone2: React.FC<{lang: Lang}> = ({lang}) => {
  const f = useCurrentFrame();
  const B = timelineFor(lang).beats;
  const inK = springAt(f, B.phoneIn, 'settle');
  const pageIn = ease(f, B.pageOpen, 10, EASE.ui);
  const showForm = f >= B.formFlash && f < B.backRole;
  const formK = showForm ? ease(f, B.formFlash, 4, EASE.ui) * (1 - ease(f, B.backRole - 4, 4, EASE.inOut)) : 0;
  const state: 'guest' | 'member' | 'applied' = f < B.signTap + 20 ? 'guest' : f < B.tick ? 'member' : 'applied';
  const btnY = SC.y + SC.h - 190 + 40 + 52;
  const taps = [
    {at: B.linkTap, x: SC.x + 250, y: SC.y + 560},
    {at: B.signTap, x: 540, y: btnY},
    {at: B.signTap + 15, x: 540, y: SC.y + SC.h - 640 + 40 + 380 + 48},
    {at: B.applyTap, x: 540, y: btnY},
  ];
  const tilt = (1 - inK) * 8 + Math.sin(f / 40) * 0.6;
  return (
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(900px 900px at 50% 40%, ${mix(VT.deep, '#06091A', 0.4)} 0%, #05070F 75%)`}}>
      <div style={{position: 'absolute', left: PH.x, top: PH.y, width: PH.w, height: PH.h, transform: `translateY(${(1 - inK) * 260}px) rotate(${tilt}deg) scale(${0.92 + 0.08 * inK})`, transformOrigin: '50% 80%'}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: PH.r, background: '#05060B', boxShadow: `0 60px 140px rgba(0,0,0,0.7), 0 0 120px ${rgba(VT.blue, 0.25)}`, border: '3px solid #2A2F3E'}} />
        <div style={{position: 'absolute', left: SC.x - PH.x, top: SC.y - PH.y, width: SC.w, height: SC.h, borderRadius: SC.r, overflow: 'hidden', background: NIGHT}}>
          <Chat f={f} B={B} />
          {pageIn > 0 && (
            <div style={{position: 'absolute', inset: 0, transform: `translateX(${(1 - pageIn) * SC.w}px)`}}>
              <RolePage f={f} B={B} state={state} />
            </div>
          )}
          {f >= B.signTap && f < B.signTap + 26 && <SignIn f={f} at={B.signTap} />}
          {formK > 0 && (
            <div style={{position: 'absolute', inset: 0, opacity: formK, transform: `scale(${0.96 + 0.04 * formK})`}}>
              <OrgForm />
            </div>
          )}
          {/* status bar */}
          <div style={{position: 'absolute', left: 40, right: 40, top: 22, display: 'flex', justifyContent: 'space-between', ...text(24, 700, showForm ? '#2A2A2A' : '#FFFFFF')}}>
            <span>22:47</span>
            <span>●●● ▮</span>
          </div>
        </div>
      </div>
      <Confetti f={f} at={B.tick} cx={540} cy={btnY - 40} />
      <Thumb f={f} taps={taps} />
    </div>
  );
};
