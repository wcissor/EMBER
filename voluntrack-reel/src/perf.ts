// Debug-only switches for render profiling (input prop `perf`, e.g. "noblur,noink,nograin"). Unused in the film.
import {getInputProps} from 'remotion';
const p = ((typeof window !== 'undefined' ? getInputProps() : {}) ?? {}) as {perf?: string};
const has = (k: string) => (p.perf ?? '').split(',').includes(k);
export const PERF = {noBlur: has('noblur'), noInk: has('noink'), noGrain: has('nograin'), noShadow: has('noshadow')};
