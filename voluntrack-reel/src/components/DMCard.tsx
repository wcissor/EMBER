import React from 'react';
import {interpolate} from 'remotion';
import {C, FONT, PAPER_CARD} from '../theme';
import {DM} from '../config';
import {EASE, clamp01, springAt} from '../motion';
import {Stamp} from './Stamp';

/** A generic, anonymous chat thread (section 3). 760×560, card-local coordinates. */
export const DMCard: React.FC<{frame: number; send: number; seen: number; seenStamp: number}> = ({frame, send, seen, seenStamp}) => {
  const W = 760;
  const H = 560;
  const sent = springAt(frame, send, 'snap');
  const sentVisible = frame >= send;
  const seenIn = clamp01((frame - seen) / 6);
  // "Seen" swells into a red SEEN stamp that hits on seenStamp
  const swell = clamp01((frame - (seenStamp - 7)) / 7);
  const labelGone = frame >= seenStamp - 1;
  const bubbleY = 300;
  const [seenWord, month] = DM.seenLabel.split(' · ');
  return (
    <div style={{position: 'absolute', width: W, height: H}}>
      <div style={{position: 'absolute', width: W, height: H, borderRadius: PAPER_CARD.radius, background: C.card, boxShadow: PAPER_CARD.shadow, overflow: 'hidden'}}>
        {/* header: grey avatar + grey bars */}
        <div style={{position: 'absolute', left: 0, top: 0, width: W, height: 104, borderBottom: `2px solid #EEECE8`}} />
        <div style={{position: 'absolute', left: 36, top: 26, width: 52, height: 52, borderRadius: '50%', background: C.grey}} />
        <div style={{position: 'absolute', left: 106, top: 36, width: 190, height: 16, borderRadius: 8, background: C.grey}} />
        <div style={{position: 'absolute', left: 106, top: 62, width: 110, height: 12, borderRadius: 6, background: C.grey}} />
        {/* earlier incoming bubbles (grey placeholders) */}
        <div style={{position: 'absolute', left: 36, top: 136, width: 330, height: 56, borderRadius: 28, background: '#EFEDE9'}} />
        <div style={{position: 'absolute', left: 36, top: 204, width: 230, height: 56, borderRadius: 28, background: '#EFEDE9'}} />
        {/* input bar */}
        <div style={{position: 'absolute', left: 36, top: H - 92, width: W - 72, height: 60, borderRadius: 30, border: '2px solid #E6E3DE'}} />
      </div>
      {/* the sent bubble */}
      {sentVisible && (
        <div
          style={{
            position: 'absolute',
            right: 36,
            top: interpolate(sent, [0, 1], [H - 100, bubbleY]),
            transform: `scale(${interpolate(sent, [0, 1], [0.85, 1])})`,
            transformOrigin: 'right bottom',
            opacity: clamp01(sent * 2),
            padding: '22px 30px',
            borderRadius: 34,
            borderBottomRightRadius: 10,
            background: C.ink,
            color: C.card,
            fontFamily: FONT.ui,
            fontWeight: 600,
            fontSize: 40,
            whiteSpace: 'nowrap',
          }}
        >
          {DM.bubble}
        </div>
      )}
      {/* micro label under the bubble */}
      {!labelGone && frame >= seen && (
        <div
          style={{
            position: 'absolute',
            right: 40,
            top: bubbleY + 112,
            opacity: seenIn,
            fontFamily: FONT.ui,
            fontWeight: 600,
            fontSize: 28,
            color: '#6F6B64',
            display: 'flex',
            gap: 8,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transform: `scale(${1 + 2.2 * EASE.slam(swell)})`,
              transformOrigin: 'center',
              color: swell > 0 ? C.stamp : '#6F6B64',
            }}
          >
            {seenWord}
          </span>
          <span style={{opacity: 1 - swell}}>· {month}</span>
        </div>
      )}
      {frame >= seenStamp - 1 && <Stamp text="SEEN" frame={frame} hit={seenStamp} x={W - 210} y={bubbleY + 120} rot={-7} fontSize={130} seed="seen" />}
    </div>
  );
};
