// "Qonşunun qızı": the film (version A) and its re-cut openings. A-reply drops the first comment bubble (Instagram shows
// the real comment as a sticker). B opens on the column beat, C on a flash-forward to the confession; both then show the
// title card and continue. Variants re-use A's frames (Freeze), so every part renders once.
import React from 'react';
import {AbsoluteFill, Freeze, Img, staticFile, useCurrentFrame} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {ensureFonts} from './fonts';
import {LangProvider} from './lang';
import {TEXT, type Lang} from './config';
import {timelineFor, ASSETS} from './data';
import {clamp01, ease, EASE, lerp} from './motion';
import {type Cam} from './camera';
import {Captions, SafeBoxOverlay} from './overlays/Overlays';
import {CommentShot, EndCard2, Title2} from './overlays/Overlays2';
import {WorldScene2, WIDE} from './scenes/p2/World2';
import {Stairs2} from './scenes/p2/Stairs2';
import {Phone2} from './scenes/p2/Phone2';
import {Morning2} from './scenes/p2/Morning2';
import {End2} from './scenes/p2/End2';

ensureFonts();

/** the two real comments (screenshots from the post), pixel sizes */
export const COMMENT = {c1: {w: 696, h: 140}, c2: {w: 799, h: 148}};

export type Variant = 'A' | 'Areply' | 'B' | 'C';
export const VARIANTS: Variant[] = ['A', 'Areply', 'B', 'C'];
export const TITLE_LEN = 45;
const lang: Lang = 'az';

export type Seg = {kind: 'film'; from: number; to: number} | {kind: 'title'; len: number};
/** C's flash-forward: the confession, from just before the line to just after it. */
export const flashRange = (): [number, number] => {
  const TL = timelineFor(lang);
  const l = TL.lineFrames('P13');
  return [l.start - 5, l.end + 8];
};
export const segmentsFor = (v: Variant): Seg[] => {
  const B = timelineFor(lang).beats;
  if (v === 'A' || v === 'Areply') return [{kind: 'film', from: 0, to: B.end}];
  if (v === 'B') return [{kind: 'film', from: B.s2, to: B.deed1 - 9}, {kind: 'title', len: TITLE_LEN}, {kind: 'film', from: B.deed1 - 9, to: B.end}];
  const [a, b] = flashRange();
  return [{kind: 'film', from: a, to: b}, {kind: 'title', len: TITLE_LEN}, {kind: 'film', from: B.s2, to: B.end}];
};
export const durationFor = (v: Variant) => segmentsFor(v).reduce((n, s) => n + (s.kind === 'film' ? s.to - s.from : s.len), 0);

/** Frames that get camera motion blur: the punch-in on the door bang, the whip to her window. Never the loop's end. */
export const blurFrames = (): [number, number][] => {
  const B = timelineFor(lang).beats;
  return [[B.doorBang - 2, B.doorBang + 7], [B.whipToHer + 1, B.herWin - 1], [B.loopBack + 2, B.end - 4]];
};

const Grain2: React.FC<{at: number}> = ({at}) => {
  if (!ASSETS.grain) return null;
  const i = ((Math.floor(at) % 24) + 24) % 24;
  return <Img src={staticFile(`grain/g${String(i).padStart(2, '0')}.png`)} style={{position: 'absolute', inset: 0, width: 1080, height: 1920, opacity: 0.09, mixBlendMode: 'overlay', pointerEvents: 'none'}} />;
};

/** The picture of film frame f (scene by scene). */
const Picture: React.FC = () => {
  const f = useCurrentFrame();
  const B = timelineFor(lang).beats;
  if (f < B.stairs) return <WorldScene2 lang={lang} />;
  if (f < B.phoneIn) return <Stairs2 lang={lang} />;
  if (f < B.winGlow) return <Phone2 lang={lang} />;
  if (f < B.morning) return <WorldScene2 lang={lang} />;
  if (f < B.dusk) return <Morning2 lang={lang} />;
  // the end: the star, then the yard comes back up into the exact wide of frame 0
  const u = EASE.crane(clamp01((f - B.loopBack) / Math.max(1, B.end - 1 - B.loopBack)));
  const fall = 1 - u;
  return (
    <>
      <End2 lang={lang} />
      {f >= B.loopBack && (
        <div style={{position: 'absolute', inset: 0, transformOrigin: '540px 560px', transform: fall > 0 ? `translateY(${Math.pow(fall, 1.15) * 1750}px) scale(${lerp(1, 0.4, Math.pow(fall, 1.15))})` : undefined}}>
          <WorldScene2 lang={lang} at={f - (B.end - 1)} />
        </div>
      )}
    </>
  );
};

/** Film frame f with its overlays. */
const Film: React.FC<{bubble1: boolean; title: boolean}> = ({bubble1, title}) => {
  const f = useCurrentFrame();
  const B = timelineFor(lang).beats;
  const blur = blurFrames().some(([a, b]) => f >= a && f <= b);
  const loopAt = f >= B.loopBack ? f - (B.end - 1) : f;
  return (
    <>
      {blur ? (
        <CameraMotionBlur shutterAngle={180} samples={10}>
          <Picture />
        </CameraMotionBlur>
      ) : (
        <Picture />
      )}
      {bubble1 && <CommentShot src="comments/c1.png" w={COMMENT.c1.w} h={COMMENT.c1.h} at={B.bubble1} until={B.title - 4} />}
      {title && <Title2 at={B.title} until={B.title + 38} />}
      <CommentShot src="comments/c2.png" w={COMMENT.c2.w} h={COMMENT.c2.h} at={B.bubble2} until={Math.max(B.bubble2 + 46, timelineFor(lang).lineFrames('P20').end - 12)} />
      <Captions lang={lang} />
      <EndCard2 line={B.endLine} cta={B.cta} fadeFrom={B.loopBack} fadeTo={B.end - 3} />
      <Grain2 at={loopAt} />
    </>
  );
};

/** The title card of B and C: the night yard of frame 0, a slow push, the title stamp. */
const TitleCard: React.FC<{local: number}> = ({local}) => {
  const k = ease(local, 0, TITLE_LEN, EASE.inOut);
  const cam: Cam = {x: lerp(WIDE.x, 1240, k), y: lerp(WIDE.y, 1290, k), z: lerp(WIDE.z, 1.5, k)};
  return (
    <>
      <Freeze frame={0}>
        <WorldScene2 lang={lang} at={0} cam={cam} />
      </Freeze>
      <Freeze frame={local + 100}>
        <Title2 at={104} until={100 + TITLE_LEN - 8} />
      </Freeze>
      <Grain2 at={local} />
    </>
  );
};

export const Main: React.FC<{variant?: Variant; safeBox?: boolean; lang?: Lang}> = ({variant = 'A', safeBox}) => {
  const frame = useCurrentFrame();
  const segs = segmentsFor(variant);
  let at = frame;
  let seg: Seg = segs[0];
  for (const s of segs) {
    const len = s.kind === 'film' ? s.to - s.from : s.len;
    if (at < len) {
      seg = s;
      break;
    }
    at -= len;
  }
  const bubble1 = variant === 'A';
  const title = variant === 'A' || variant === 'Areply';
  return (
    <LangProvider lang={lang}>
      <AbsoluteFill style={{backgroundColor: '#080D1C', overflow: 'hidden'}}>
        {seg.kind === 'title' ? (
          <TitleCard local={at} />
        ) : seg.from + at === frame ? (
          <Film bubble1={bubble1} title={title} />
        ) : (
          <Freeze frame={seg.from + at}>
            <Film bubble1={bubble1} title={title} />
          </Freeze>
        )}
        {safeBox && <SafeBoxOverlay />}
      </AbsoluteFill>
    </LangProvider>
  );
};
