// The star: the only thing that crosses from one world to the other. It is VolunTrack's voice.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Star} from '../components/Star';
import {sample, useVoiceFeatures} from '../audio';
import {starPose} from './choreo';
import {B} from '../data';

export const StarLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const vt = useVoiceFeatures('V');
  const pose = starPose(frame);
  if (pose.opacity <= 0 || pose.size <= 0) return null;
  const drive = {low: sample(vt.low, frame), high: sample(vt.high, frame), loud: sample(vt.bloom, frame)};
  return <Star x={pose.x} y={pose.y} size={pose.size} frame={frame} drive={drive} flare={pose.flare} squashY={pose.squashY} glint={pose.glint} opacity={pose.opacity} onPaper={frame < B.split + 6} />;
};
