// VolunTrack light (section 1: "Blue means VolunTrack"). The `blue` and `blueCore` tokens are reachable only through
// this module, and only files that draw VolunTrack itself may import it (QA gate 9: scripts/qa/blue.mjs).
import {C} from './theme';
import {mix} from './color';

export const VT = {
  blue: C.blue,
  core: C.blueCore,
  /** the son's rim light and halo */
  rim: mix(C.blue, C.blueCore, 0.45),
  deep: mix(C.blue, '#05070F', 0.55),
};
