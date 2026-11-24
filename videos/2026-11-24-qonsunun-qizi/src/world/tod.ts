// Time of day for the courtyard set: 0 = part 1's blue-hour night, 1 = morning daylight. Scenes call setDay() before
// they render the World (same render pass), and the world kit mixes every night colour toward its day colour.
import {mix} from '../color';

let DAY = 0;
export const setDay = (d: number) => {
  DAY = Math.max(0, Math.min(1, d));
};
export const day = () => DAY;
/** night colour → day colour at the current time of day */
export const dn = (night: string, dayColor: string) => (DAY <= 0 ? night : DAY >= 1 ? dayColor : mix(night, dayColor, DAY));
/** lights (lamps, lit windows) fade out by day */
export const lights = () => 1 - DAY;
