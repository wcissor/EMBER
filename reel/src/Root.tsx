import React from 'react';
import {Composition} from 'remotion';
import timeline from './timeline.json';
import {Reel} from './Reel';
import {H, W} from './layout';
import './theme';

export const Root: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel}
    durationInFrames={timeline.durationInFrames}
    fps={timeline.fps}
    width={W}
    height={H}
    defaultProps={{textOnly: false, showSafeBox: false, hideCaptions: false}}
  />
);
