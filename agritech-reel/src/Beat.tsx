import React from 'react';
import {AbsoluteFill} from 'remotion';
import timeline from './timeline.json';
import {Lang, LineId} from './config';
import {BeatProvider, BottomShade, Captions, RutaMark, SafeBox, timingOf} from './components';
import {SCENES} from './scenes';
import {colors} from './theme';

export type BeatProps = {lang: Lang; line: LineId; tail?: boolean; textOnly?: boolean; safeBox?: boolean};

/**
 * One voice line with its pictures, rendered as its own muted file.
 * tail: the last TAIL frames of a variant, which show the hook's first shot just before its first frame,
 * so the reel loops without a visible jump.
 * textOnly (QA): only the text, on mid-grey, so white, olive and black text all stand out from the background.
 */
export const Beat: React.FC<BeatProps> = ({lang, line, tail = false, textOnly = false, safeBox = false}) => {
  const timing = timingOf(lang, line);
  const Scene = SCENES[line];
  return (
    <BeatProvider value={{lang, line, shift: tail ? -timeline.tail : 0, qa: {textOnly, safeBox}, timing}}>
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
