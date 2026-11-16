import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import timeline from './timeline.json';
import {Lang, LineId, Variant as V} from './config';
import {Beat, beatFrames} from './Beat';

export type VariantProps = {lang: Lang; variant: V; textOnly?: boolean; safeBox?: boolean};

/** A whole variant, beat after beat, ending on the end card (or the loop tail, if timeline.tail > 0). For previews and checks. */
export const Variant: React.FC<VariantProps> = ({lang, variant, textOnly = false, safeBox = false}) => {
  const seq = (timeline.variants as Record<string, string[]>)[variant] as LineId[];
  let from = 0;
  const items = seq.map((line) => {
    const n = beatFrames({lang, line});
    const el = (
      <Sequence key={line} from={from} durationInFrames={n} name={line}>
        <Beat lang={lang} line={line} textOnly={textOnly} safeBox={safeBox} />
      </Sequence>
    );
    from += n;
    return el;
  });
  return (
    <AbsoluteFill>
      {items}
      {timeline.tail > 0 ? (
        <Sequence from={from} durationInFrames={timeline.tail} name="tail">
          <Beat lang={lang} line={seq[0]} tail textOnly={textOnly} safeBox={safeBox} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

export const variantFrames = (p: VariantProps) =>
  ((timeline.variants as Record<string, string[]>)[p.variant] as LineId[]).reduce((a, line) => a + beatFrames({lang: p.lang, line}), 0) + timeline.tail;
