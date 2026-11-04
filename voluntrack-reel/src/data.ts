// Remotion-side data: the measured voice, the placement, and the resolved timeline.
import timings from '../public/audio/voice_timings.json';
import placement from '../build/placement.json';
import assets from '../build/assets.json';
import {resolveTimeline, type TimedLine, type Placement} from './timeline';

export const TL = resolveTimeline(timings as TimedLine[], placement as unknown as Placement);
export const B = TL.beats;

/** Which generated assets exist (written by scripts/assets.mjs). */
export const ASSETS = assets as {
  studentStem: boolean;
  vtStem: boolean;
  mix: boolean;
  wall: boolean;
  logo: boolean;
  photo: boolean;
  stamps: boolean;
  grain: boolean;
};
