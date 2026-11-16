import React from 'react';
import kansasTarget from './kansas-target.json';
import {ANCHORS, LineId, TEXT} from './config';
import {BigNumber, BigWord, Clip, RowLabel, SourceTag, Still, TopShade, useT, useWords} from './components';
import {CaptureFrame, CollarDrawing, Crosshair, Detections, DottedFence, GlobeShot, MapZoom} from './drawings';
import {colors, Tone, type} from './theme';
import {SAFE} from './layout';
import {enter, prog} from './motion';
import geo from './geo.json';

/** Second credit line (place and date of satellite pictures), above the label row. */
const PlaceLine: React.FC<{text: string; at: number; until?: number}> = ({text, at, until = 1e9}) => {
  const t = useT();
  const o = enter(t, at, 0.3) * (1 - prog(t, until, 0.2));
  if (o <= 0) return null;
  return (
    <div data-text="label" style={{position: 'absolute', left: SAFE.x0, width: SAFE.x1 - SAFE.x0, top: 972, textAlign: 'center', color: colors.white, opacity: 0.75 * o, ...type.label, fontSize: 24, zIndex: 2}}>
      {text}
    </div>
  );
};

/** Lights going out: one sharp drop like a breaker, then a slow settle. */
const lightsOut = (t: number, at: number) => (t < at ? 0 : Math.min(0.8, 0.62 + (t - at) * 0.25));

// ---------- Hooks ----------
const H1: React.FC = () => {
  const {w, f, D, lang} = useWords();
  const A = ANCHORS[lang].H1;
  const T = TEXT[lang];
  const c1 = f(w(A.cut1) - 0.1);
  const c2 = f(w(A.cut2) - 0.1);
  const bust = f(w(A.bust));
  return (
    <>
      <Clip clip="H1-a" start={0} end={c1} inSec={0.4} scale={[1.0, 1.07]} />
      <Clip clip="H1-c" start={c1} end={c2} inSec={1.2} scale={[1.08, 1.0]} />
      <Clip clip="H1-a" start={c2} end={D} inSec={3.4} scale={[1.3, 1.38]} origin={[540, 1500]} dim={(t) => Math.max(0.3, lightsOut(t, bust))} />
      <TopShade strength={0.7} to={1000} />
      <BigNumber num={T.money} at={c2} tone="dark" top={330} extra={{text: T.bankrupt, at: bust + 0.05}} />
      <SourceTag text={T.srcH1} at={c2 + 0.2} />
    </>
  );
};

const H2: React.FC = () => {
  const {w, f, D, lang} = useWords();
  const A = ANCHORS[lang].H2;
  const T = TEXT[lang];
  const c1 = f(w(A.cut1) - 0.1);
  const c2 = f(w(A.cut2) - 0.1);
  return (
    <>
      <Clip clip="B2-a" start={0} end={c1} inSec={2.2} scale={[1.0, 1.06]} dim={() => 0.28} />
      <Clip clip="B2-a" start={c1} end={c2} inSec={2.2 + c1} scale={[1.32, 1.38]} origin={[540, 820]} dim={() => 0.28} />
      <Clip clip="B2-a" start={c2} end={D} inSec={6.4} scale={[1.08, 1.14]} dim={() => 0.28} />
      <TopShade strength={0.6} />
      <Crosshair x={520} y={860} at={-0.25} from={[380, 760]} fire={w(A.burn)} until={c1} />
      <Crosshair x={700} y={900} at={c1 + 0.05} fire={w(A.laser)} until={c2} />
      <Crosshair x={380} y={830} at={c1 + 0.25} fire={w(A.laser) + 0.12} until={c2} />
      <BigNumber num={T.c10k} at={0} tone="dark" top={330} />
      <RowLabel text={T.illustration} at={0} until={c2} />
      <SourceTag text={T.srcB2} at={0.3} />
    </>
  );
};

const H3: React.FC = () => {
  const {w, f, D, lang} = useWords();
  const A = ANCHORS[lang].H3;
  const T = TEXT[lang];
  const c1 = f(w(A.cut1) - 0.1);
  return (
    <>
      <Clip clip="B4-a2" start={0} end={c1} inSec={3.9} scale={[1.0, 1.05]} />
      <Clip clip="B4-a1" start={c1} end={D} inSec={1.2} scale={[1.04, 1.0]} />
      <DottedFence id="h3a" a={[[-30, 1050], [320, 1006], [700, 966], [1110, 912]]} at={-0.3} drawDur={1.1} />
      <DottedFence id="h3b" a={[[-30, 780], [380, 716], [760, 676], [1110, 632]]} at={c1} drawDur={0.5} />
      <RowLabel text={T.fence} at={0.2} />
      <SourceTag text={T.srcB4} at={0.6} />
    </>
  );
};

// ---------- Body ----------
const B1: React.FC = () => {
  const {w, f, D, lang} = useWords();
  const A = ANCHORS[lang].B1;
  const T = TEXT[lang];
  const c1 = f(w(A.cut1) - 0.1);
  return (
    <>
      <Clip clip="B1-a" start={0} end={c1} inSec={0.8} scale={[1.0, 1.05]} />
      <Clip clip="B1-a" start={c1} end={D} inSec={0.8 + c1} scale={[1.28, 1.33]} origin={[512, 664]} />
      <BigWord lines={T.outside} at={w(A.big) - 0.05} tone="bright" top={T.outside.length > 1 ? 300 : 360} />
    </>
  );
};

const B1b: React.FC = () => {
  const {w, f, D, lang} = useWords();
  const A = ANCHORS[lang].B1b;
  const c1 = f(w(A.cut1) - 0.1);
  return (
    <>
      <Clip clip="B1-b" start={0} end={c1} inSec={1.2} scale={[1.0, 1.06]} />
      <Clip clip="B1-a" start={c1} end={D} inSec={4.2} scale={[1.04, 1.1]} />
    </>
  );
};

const B2: React.FC = () => {
  const {w, f, D, lang} = useWords();
  const A = ANCHORS[lang].B2;
  const T = TEXT[lang];
  const c1 = f(w(A.cut1) - 0.1);
  const c2 = f(w(A.cut2) - 0.1);
  const c3 = f(w(A.cut3) - 0.1);
  const count = w(A.count);
  const cS = f(w(A.spot) - 0.1); // punch in as the detections appear
  return (
    <>
      <Clip clip="B2-a" start={0} end={cS} inSec={0.6} scale={[1.0, 1.04]} />
      <Clip clip="B2-a" start={cS} end={c1} inSec={0.6 + cS} scale={[1.2, 1.25]} origin={[540, 820]} />
      <Clip clip="B2-b" start={c1} end={c2} inSec={1.0} scale={[1.0, 1.04]} />
      <Clip clip="B2-a" start={c2} end={c3} inSec={5.6} scale={[1.06, 1.12]} dim={() => 0.28} />
      <Clip clip="B2-a" start={c3} end={D} inSec={5.6 + (c3 - c2)} scale={[1.36, 1.42]} origin={[540, 860]} dim={() => 0.28} />
      <Detections points={[[300, 640], [730, 560], [520, 860], [840, 930], [220, 980]]} at={w(A.spot)} />
      <Crosshair x={330} y={990} at={c1 + 0.05} from={[230, 900]} fire={w(A.burn) + 0.1} until={c2} />
      <Crosshair x={760} y={1030} at={c1 + 0.2} from={[860, 940]} fire={w(A.laser)} until={c2} />
      <Crosshair x={560} y={935} at={c1 + 0.35} fire={w(A.laser) + 0.18} until={c2} />
      {count < D ? <TopShade strength={0.6} /> : null}
      <BigNumber num={T.c10k} at={count} tone="dark" top={330} />
      <RowLabel text={T.illustration} at={w(A.spot)} until={c2} />
      <SourceTag text={T.srcB2} at={count + 0.2} />
    </>
  );
};

const B3: React.FC = () => {
  const {w, f, D, lang} = useWords();
  const A = ANCHORS[lang].B3;
  const T = TEXT[lang];
  const c1 = f(w(A.cut1) - 0.12);
  return (
    <>
      <Clip clip="B3-a" start={0} end={c1} inSec={1.0} scale={[1.0, 1.06]} />
      <Clip clip="B3-d" start={c1} end={D} inSec={0.2} scale={[1.0, 1.05]} />
      <BigNumber num={T.c300k} at={w(A.count) - 0.05} tone="bright" top={330} />
      <SourceTag text={T.srcB3} at={w(A.count) + 0.2} />
    </>
  );
};

/** Collar, then the fence. `intro`: the B4 line opens on the New Zealand herd; B4s does not. */
const Collars: React.FC<{intro: boolean}> = ({intro}) => {
  const {w, f, D, lang, line} = useWords();
  const A = ANCHORS[lang][line as 'B4' | 'B4s'];
  const T = TEXT[lang];
  const t = useT();
  const c0 = intro ? f(w(A.cut1) - 0.1) : 0;
  const cS = f(w(A.sound) - 0.1);
  const cF = f(w(intro ? A.cut3 : A.cut2) - 0.1);
  const target: [number, number] = [575, 830];
  return (
    <>
      {intro ? <Clip clip="B4-a1" start={0} end={c0} inSec={0.3} scale={[1.0, 1.05]} /> : null}
      <Clip clip="B4-b" start={c0} end={cS} inSec={1.6} scale={[1.0, 1.03]} />
      <Clip clip="B4-b" start={cS} end={cF} inSec={1.6 + (cS - c0)} scale={[1.16, 1.2]} origin={target} />
      <Clip clip="B4-c" start={cF} end={D} inSec={1.0} scale={[1.0, 1.05]} />
      {intro ? <RowLabel text={T.nz} at={0.1} until={c0} /> : null}
      {t >= c0 && t < cF ? (
        <CollarDrawing
          cx={730} cy={520} R={200} at={Math.max(c0 + 0.05, w(A.collar) - 0.25)} to={target} label={T.collar}
          sound={w(A.sound)} vib={w(A.vib)} soundLabel={T.sound} vibLabel={T.vibration}
        />
      ) : null}
      <RowLabel text={T.illustration} at={c0 + 0.1} until={cF} />
      <DottedFence
        id="b4"
        a={[[-30, 640], [330, 600], [720, 618], [1110, 576]]}
        b={[[-30, 470], [330, 432], [720, 450], [1110, 410]]}
        at={cF + 0.05}
        move={w(A.app) - 0.15}
        drawDur={0.6}
      />
      <RowLabel text={T.fence} at={cF + 0.1} />
      <SourceTag text={T.srcB4} at={c0 + 0.2} />
    </>
  );
};
const B4: React.FC = () => <Collars intro />;
const B4s: React.FC = () => <Collars intro={false} />;

const B5: React.FC = () => {
  const {w, f, D, lang} = useWords();
  const A = ANCHORS[lang].B5;
  const T = TEXT[lang];
  const c1 = f(w(A.cut1) - 0.1);
  const c2 = f(w(A.cut2) - 0.1);
  const tx = kansasTarget.x;
  const ty = kansasTarget.y;
  const tone: Tone = 'dark';
  const t = useT();
  return (
    <>
      <GlobeShot start={0} end={c1} target={[-100.75, 37.7]} arrive={c1 - 0.25} cy={860} />
      <Still src="sat/kansas.jpg" w={1296} h={2304} start={c1} end={c2} scale={[1.0, 1.08]} center={[[648, 1120], [560, 1135]]}>
        <CaptureFrame x={tx} y={ty} r={kansasTarget.r} at={w(A.field) - 0.05} />
      </Still>
      <Still src="sat/kansas.jpg" w={1296} h={2304} start={c2} end={D} scale={[2.1, 2.2]} center={[[tx + 60, ty - 120], [tx + 55, ty - 110]]} />
      {/* behind the number: over the globe's bright polar ice and the bright fields alike */}
      <TopShade strength={0.72} to={1000} hold={70} />
      <BigNumber num={T.days} at={w(A.days) - 0.05} tone={tone} top={330} extra={{text: T.free, at: w(A.free), accent: true}} />
      <RowLabel text={T.orbit} at={0.15} until={c1} />
      <PlaceLine text={T.nasa} at={0.15} until={c1} />
      <PlaceLine text={T.kansas} at={c1 + 0.1} />
      <RowLabel text={T.s2credit} at={c1 + 0.1} />
      <SourceTag text={T.srcB5} at={Math.max(0.3, w(A.days))} />
    </>
  );
};

const B6: React.FC = () => {
  const {w, f, D, lang} = useWords();
  const A = ANCHORS[lang].B6;
  const T = TEXT[lang];
  const c1 = f(w(A.cut1) - 0.1);
  const c2 = f(w(A.cut2) - 0.1);
  return (
    <>
      <Clip clip="B6-a" start={0} end={c1} inSec={0.5} scale={[1.0, 1.06]} />
      <Clip clip="B6-b" start={c1} end={c2} inSec={2.0} scale={[1.0, 1.05]} />
      <Clip clip="B6-b" start={c2} end={D} inSec={5.2} scale={[1.2, 1.25]} origin={[540, 900]} />
      <BigNumber num={T.c70} at={w(A.count) - 0.05} tone="bright" top={320} />
      <SourceTag text={T.srcB6} at={w(A.count) + 0.2} />
    </>
  );
};

const B7: React.FC = () => {
  const {w, f, D, lang} = useWords();
  const A = ANCHORS[lang].B7;
  const T = TEXT[lang];
  const c1 = f(w(A.cut1) - 0.1);
  const c2 = f(w(A.cut2) - 0.1);
  const land = Math.max(w(A.land) + 0.45, 1.0);
  const [bx0, by0, bx1, by1] = geo.aze.bboxKm;
  const ac: [number, number] = [(bx0 + bx1) / 2, (by0 + by1) / 2];
  return (
    <>
      {/* lands with the whole country between the number above and the credit lines below */}
      <MapZoom start={0} end={c1} from={{cx: ac[0] - 40, cy: ac[1] + 60, w: 2200}} to={{cx: ac[0], cy: ac[1], w: 1100}} land={land} label={T.aze} screenY={778} />
      <Still src="sat/kura-araz.jpg" w={1296} h={2304} start={c1} end={c2} scale={[1.0, 1.07]} center={[[648, 1200], [660, 1160]]} />
      <Still src="sat/kura-araz.jpg" w={1296} h={2304} start={c2} end={D} scale={[1.7, 1.78]} center={[[820, 1520], [800, 1500]]} />
      <TopShade strength={0.72} to={1000} hold={70} />
      <BigNumber num={T.c36} at={w(A.count) - 0.05} tone="dark" top={330} />
      <PlaceLine text={T.mapCredit} at={0.2} until={c1} />
      <PlaceLine text={T.kura} at={c1 + 0.1} />
      <RowLabel text={T.s2credit} at={c1 + 0.1} />
      <SourceTag text={T.srcB7} at={w(A.count) + 0.2} />
    </>
  );
};

const B8: React.FC = () => {
  const {w, D, lang, E} = useWords();
  const T = TEXT[lang];
  const t = useT();
  const done = E + 0.15;
  return (
    <>
      <Clip clip="B1-c" start={0} end={D} inSec={0.3} scale={[1.0, 1.06]} />
      <div style={{position: 'absolute', left: SAFE.x0, width: SAFE.x1 - SAFE.x0, top: 330, textAlign: 'center', zIndex: 2}}>
        <div data-text="big" style={{...type.question, color: colors.black}}>
          {T.question.map((word, i) => {
            const p = prog(t, w(i) - 0.03, 0.16);
            return (
              <span key={i} style={{display: 'inline-block', marginRight: i < T.question.length - 1 ? '0.24em' : 0, opacity: p, transform: `translateY(${(1 - p) * 12}px)`, color: i === T.questionKey ? colors.oliveDark : colors.black}}>
                {word}
              </span>
            );
          })}
        </div>
      </div>
      <RowLabel text={T.options} at={done} />
    </>
  );
};

export const SCENES: Record<LineId, React.FC> = {H1, H2, H3, B1, B1b, B2, B3, B4, B4s, B5, B6, B7, B8};
