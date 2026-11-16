import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import timeline from './timeline.json';
import {Lang, LineId} from './config';
import {BeatProvider, BottomShade, Captions, RutaMark, SafeBox, timingOf} from './components';
import {SCENES} from './scenes';
import {EndCard} from './EndCard';
import {colors} from './theme';

export type BeatProps = {lang: Lang; line: LineId; tail?: boolean; textOnly?: boolean; safeBox?: boolean; freezeAt?: number};

/**
 * One voice line with its pictures, rendered as its own muted file.
 * tail: the last TAIL frames of a variant, which show the hook's first shot just before its first frame,
 * so the reel loops without a visible jump.
 * textOnly (QA): only the text, on mid-grey, so white, olive and black text all stand out from the background.
 * END: the end card, which closes the last frame of B8 onto its horizon and lands on the RUTA logo.
 * freezeAt: hold the beat on this frame (used for the end card's background), through the same time shift as the tail.
 */
export const Beat: React.FC<BeatProps> = ({lang, line, tail = false, textOnly = false, safeBox = false, freezeAt}) => {
  const timing = timingOf(lang, line);
  const frame = useCurrentFrame();
  const shift = freezeAt !== undefined ? freezeAt - frame : tail ? -timeline.tail : 0;
  if (line === 'END') {
    const b8 = timingOf(lang, 'B8').frames;
    return (
      <BeatProvider value={{lang, line, shift: 0, qa: {textOnly, safeBox}, timing}}>
        <AbsoluteFill style={{backgroundColor: textOnly ? '#808080' : colors.black, overflow: 'hidden'}}>
          <EndCard prev={<Beat lang={lang} line="B8" textOnly={textOnly} freezeAt={b8 - 1} />} />
          {safeBox ? (
            <AbsoluteFill style={{zIndex: 20}}>
              <SafeBox />
            </AbsoluteFill>
          ) : null}
        </AbsoluteFill>
      </BeatProvider>
    );
  }
  const Scene = SCENES[line];
  return (
    <BeatProvider value={{lang, line, shift, qa: {textOnly, safeBox}, timing}}>
      <AbsoluteFill style={{backgroundColor: textOnly ? '#808080' : colors.black, overflow: 'hidden'}}>
        <Scene />
        {textOnly ? null : <BottomShade />}
        {line === 'B8' ? null : <Captions />}
        <RutaMark />
        {safeBox ? <SafeBox /> : null}
      </AbsoluteFill>
    </BeatProvider>
  );
};

export const beatFrames = (p: BeatProps) => (p.tail ? timeline.tail : timingOf(p.lang, p.line).frames);
