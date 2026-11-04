// S3 · The Turn: silence, the point of light, "Yes.", rays, and the wall splitting into quadrants.
import React from 'react';
import {AbsoluteFill, Freeze, Img, random, staticFile, useCurrentFrame} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {ASSETS, B} from '../data';
import {C} from '../theme';
import {SPEAKER_TAG} from '../layout';
import {EASE, clamp01} from '../motion';
import {BeforeWorld} from './BeforeWorld';
import {Flecks} from '../components/Canvas';

const SPLIT_DUR = 36;
const CX = SPEAKER_TAG.x;
const CY = SPEAKER_TAG.y;

/** The frozen wall: the pre-rendered still of the freeze frame when available, else the live frozen world. */
const Wall: React.FC = () =>
  ASSETS.wall ? (
    <Img src={staticFile('frames/wall.png')} style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920}} />
  ) : (
    <Freeze frame={B.freeze}>
      <BeforeWorld />
    </Freeze>
  );

const QUADS = [
  {key: 'tl', clip: `inset(0px ${1080 - CX}px ${1920 - CY}px 0px)`, dx: -1, dy: -1},
  {key: 'tr', clip: `inset(0px 0px ${1920 - CY}px ${CX}px)`, dx: 1, dy: -1},
  {key: 'bl', clip: `inset(${CY}px ${1080 - CX}px 0px 0px)`, dx: -1, dy: 1},
  {key: 'br', clip: `inset(${CY}px 0px 0px ${CX}px)`, dx: 1, dy: 1},
];

const Quad: React.FC<{q: (typeof QUADS)[number]}> = ({q}) => {
  const frame = useCurrentFrame();
  const t = EASE.vtInOut(clamp01((frame - B.split) / SPLIT_DUR));
  const x = q.dx * 760 * t;
  const y = q.dy * (q.dy < 0 ? CY + 40 : 1920 - CY + 40) * t;
  return (
    <AbsoluteFill style={{clipPath: q.clip, transform: `translate(${x}px, ${y}px) rotate(${q.dx * q.dy * 3 * t}deg)`, transformOrigin: `${CX}px ${CY}px`}}>
      <Wall />
    </AbsoluteFill>
  );
};

export const Turn: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < B.freeze || frame > B.split + SPLIT_DUR + 2) return null;
  const splitting = frame >= B.split;
  // two light rays shoot out along the star's points to the frame edges (8 frames)
  const rayT = EASE.vtOut(clamp01((frame - B.rays) / 8));
  const rayFade = 1 - clamp01((frame - B.split - 12) / 18);
  const showRays = frame >= B.rays;
  return (
    <AbsoluteFill>
      {!splitting ? (
        <Wall />
      ) : (
        QUADS.map((q) =>
          frame < B.split + SPLIT_DUR - 2 ? (
            <CameraMotionBlur key={q.key} shutterAngle={180} samples={8}>
              <Quad q={q} />
            </CameraMotionBlur>
          ) : (
            <Quad key={q.key} q={q} />
          ),
        )
      )}
      {splitting && (
        <Flecks
          frame={frame}
          start={B.split + 2}
          count={90}
          seed="split"
          color="#F4F1EC"
          dur={34}
          origin={(i) => {
            const onV = i % 2 === 0;
            const side = random(`fs-${i}`) < 0.5 ? -1 : 1;
            return onV
              ? {x: CX + side * 6, y: random(`fy-${i}`) * 1920, vx: side * (8 + random(`fv-${i}`) * 14), vy: (random(`fw-${i}`) - 0.5) * 10}
              : {x: random(`fx-${i}`) * 1080, y: CY + side * 6, vx: (random(`fw-${i}`) - 0.5) * 10, vy: side * (10 + random(`fv-${i}`) * 16)};
          }}
        />
      )}
      {showRays && rayFade > 0 && (
        <AbsoluteFill style={{opacity: rayFade}}>
          <svg width="1080" height="1920" style={{position: 'absolute', filter: 'blur(6px)'}}>
            <rect x={CX - CX * rayT} y={CY - 5} width={1080 * rayT} height={10} fill={C.blue} />
            <rect x={CX - 5} y={CY - CY * rayT} width={10} height={1920 * rayT} fill={C.blue} />
          </svg>
          <svg width="1080" height="1920" style={{position: 'absolute'}}>
            <rect x={CX - CX * rayT} y={CY - 2} width={1080 * rayT} height={4} fill={C.glow} />
            <rect x={CX - 2} y={CY - CY * rayT} width={4} height={1920 * rayT} fill={C.glow} />
            <rect x={CX - CX * rayT} y={CY - 0.75} width={1080 * rayT} height={1.5} fill="#FFFFFF" />
            <rect x={CX - 0.75} y={CY - CY * rayT} width={1.5} height={1920 * rayT} fill="#FFFFFF" />
          </svg>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
