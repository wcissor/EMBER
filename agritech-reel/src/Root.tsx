import React from 'react';
import {Composition} from 'remotion';
import timeline from './timeline.json';
import {Beat, BeatProps, beatFrames} from './Beat';
import {Variant, VariantProps, variantFrames} from './Variant';
import {Cover, CoverProps} from './Cover';
import {H, W} from './layout';
import './theme';

export const Root: React.FC = () => (
  <>
    <Composition
      id="Beat"
      component={Beat}
      durationInFrames={60}
      fps={timeline.fps}
      width={W}
      height={H}
      defaultProps={{lang: 'en', line: 'H1', tail: false, textOnly: false, safeBox: false} as BeatProps}
      calculateMetadata={({props}) => ({durationInFrames: beatFrames(props)})}
    />
    <Composition
      id="Variant"
      component={Variant}
      durationInFrames={60}
      fps={timeline.fps}
      width={W}
      height={H}
      defaultProps={{lang: 'en', variant: 'A', textOnly: false, safeBox: false} as VariantProps}
      calculateMetadata={({props}) => ({durationInFrames: variantFrames(props)})}
    />
    <Composition id="Cover" component={Cover} durationInFrames={1} fps={timeline.fps} width={W} height={H} defaultProps={{lang: 'en'} as CoverProps} />
  </>
);
