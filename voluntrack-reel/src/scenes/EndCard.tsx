// S7 · End card: logo, headline (L22–L23 captions), URL, QR, CTA (L24 caption), hold, loop.
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import QRCode from 'qrcode';
import {B, TL} from '../data';
import {END_CARD, SITE} from '../config';
import {C, TYPE} from '../theme';
import {END} from '../layout';
import {EASE, clamp01, springAt} from '../motion';
import {ArrowDR, uiText} from '../components/UI';
import {LogoBack, LogoFront} from '../components/Logo';

/** QR: navy modules on a white tile, 300 px, error correction M, ≥4-module quiet zone, https://voluntrack.site. */
export const QR: React.FC<{size?: number}> = ({size = END.qr.size}) => {
  const {path, n, m, q} = useMemo(() => {
    const code = QRCode.create(SITE.qrTarget, {errorCorrectionLevel: 'M'});
    const N = code.modules.size;
    const mod = Math.floor(size / (N + 8));
    const quiet = (size - N * mod) / 2;
    let d = '';
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) if (code.modules.data[y * N + x]) d += `M${quiet + x * mod} ${quiet + y * mod}h${mod}v${mod}h-${mod}z`;
    return {path: d, n: N, m: mod, q: quiet};
  }, [size]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" data-qr={`${n}x${n} m${m} q${q}`}>
      <rect width={size} height={size} rx={22} fill="#FFFFFF" />
      <path d={path} fill={C.navy} />
    </svg>
  );
};

const Headline: React.FC<{frame: number}> = ({frame}) => {
  const rows = [
    {id: '22', text: END_CARD.headline[0]},
    {id: '23', text: END_CARD.headline[1]},
  ];
  return (
    <div style={{position: 'absolute', left: END.headline.x0, top: END.headline.y0, width: END.headline.x1 - END.headline.x0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      {rows.map(({id, text}) => {
        const words = TL.wordFrames(id);
        return (
          <div key={id} style={{display: 'flex', gap: 26, ...TYPE.headline, color: C.white, height: 103}}>
            {text.split(' ').map((w, i) => {
              const t = frame - (words[i]?.start ?? Infinity);
              const r = EASE.vtOut(clamp01(t / 8));
              const speaking = words[i] && frame < words[i].end;
              return (
                <span key={i} style={{display: 'inline-block', opacity: r * (speaking ? 1 : 0.92), transform: `translateY(${18 * (1 - r)}px)`}}>
                  {w}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/** End-card logo geometry: disc diameter = END.logo.h, centred at END.logo. */
export const LOGO_PROPS = (frame: number) => ({cx: END.logo.cx, cy: END.logo.cy, size: END.logo.h, frame, resolve: B.logoResolve});

/** The logo layers that sit in front of the star (ring, inner disc, diamonds, monogram). */
export const LogoTop: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < B.logoResolve - 26) return null;
  return <LogoFront {...LOGO_PROPS(frame)} />;
};

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < B.logoRise) return null;
  const urlIn = EASE.vtOut(clamp01((frame - B.urlQr) / 24));
  const qrRise = EASE.vtOut(clamp01((frame - B.urlQr) / 30));
  const sweep = clamp01((frame - B.urlQr - 16) / 26);
  const ctaWords = TL.wordFrames('24');
  const ctaText = END_CARD.cta.split(' ');
  const subIn = EASE.vtOut(clamp01((frame - (ctaWords[ctaWords.length - 1]?.end ?? Infinity)) / 16));
  const nudge = (at: number) => {
    const t = (frame - at) / 12;
    return t < 0 || t > 1 ? 0 : Math.sin(Math.PI * t);
  };
  const lastWordEnd = ctaWords[ctaWords.length - 1]?.end ?? Infinity;
  const n = 9 * (nudge(lastWordEnd + 2) + nudge(lastWordEnd + 20));
  const arrowIn = EASE.vtOut(clamp01((frame - (ctaWords[ctaWords.length - 1]?.start ?? Infinity)) / 10));
  // hold: from urlQr to the end the URL and QR never move (qrRise completes in 30 frames)
  return (
    <AbsoluteFill>
      <LogoBack {...LOGO_PROPS(frame)} />
      <Headline frame={frame} />
      <div style={{position: 'absolute', left: END.url.x0, width: END.url.x1 - END.url.x0, top: END.url.y0 + 6, textAlign: 'center', ...uiText(44, 600), letterSpacing: '0.01em', opacity: urlIn}}>{END_CARD.url}</div>
      {frame >= B.urlQr && (
        <div style={{position: 'absolute', left: END.qr.cx - END.qr.size / 2, top: END.qr.y0 + 40 * (1 - qrRise), width: END.qr.size, height: END.qr.size, opacity: clamp01(qrRise * 1.6), borderRadius: 22, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.45)'}}>
          <QR />
          {sweep > 0 && sweep < 1 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(115deg, rgba(255,255,255,0) ${sweep * 160 - 40}%, rgba(255,255,255,0.65) ${sweep * 160 - 25}%, rgba(255,255,255,0) ${sweep * 160 - 10}%)`,
                mixBlendMode: 'screen',
              }}
            />
          )}
        </div>
      )}
      {/* CTA = the caption for L24 */}
      <div style={{position: 'absolute', left: END.cta.x0, width: END.cta.x1 - END.cta.x0, top: END.cta.y0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, ...TYPE.caption, lineHeight: 1, color: C.white}}>
          {ctaText.map((w, i) => {
            const t = frame - (ctaWords[i]?.start ?? Infinity);
            const r = EASE.vtOut(clamp01(t / 6));
            return (
              <span key={i} style={{display: 'inline-block', opacity: r, transform: `translateY(${14 * (1 - r)}px)`}}>
                {w}
              </span>
            );
          })}
          <span style={{display: 'inline-block', opacity: arrowIn, transform: `translate(${n}px, ${n}px)`}}>
            <ArrowDR size={58} color={C.blue} stroke={3} />
          </span>
        </div>
        <div style={{marginTop: 10, ...uiText(30, 500, C.muted), opacity: subIn}}>{END_CARD.ctaSub}</div>
      </div>
    </AbsoluteFill>
  );
};
