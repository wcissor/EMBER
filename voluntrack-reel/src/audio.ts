// Audio reactivity (section 4): only the star (VolunTrack stem) and the squiggle (student stem) react,
// each to its own voice stem, via useAudioData + visualizeAudio (32 samples, smoothed). Text never reacts.
import {useAudioData, visualizeAudio, type AudioData} from '@remotion/media-utils';
import {staticFile} from 'remotion';
import {DURATION_FRAMES, FPS} from './config';
import {ASSETS} from './data';

export type Features = {
  low: Float32Array; // 0..1, low-band energy
  high: Float32Array; // 0..1, high-band energy
  bloom: Float32Array; // 0..1, loudness envelope (attack 2 frames, release 10)
  bars: Float32Array[]; // 24 bars per frame for the squiggle
};

const cache = new WeakMap<AudioData, Features>();

const percentile = (arr: Float32Array, p: number) => {
  const v = Array.from(arr).filter((x) => x > 1e-4).sort((a, b) => a - b);
  if (!v.length) return 1;
  return v[Math.min(v.length - 1, Math.floor(v.length * p))] || 1;
};

const compute = (audio: AudioData): Features => {
  const hit = cache.get(audio);
  if (hit) return hit;
  const N = DURATION_FRAMES;
  const low = new Float32Array(N);
  const high = new Float32Array(N);
  const rms = new Float32Array(N);
  const bars: Float32Array[] = [];
  const wave = audio.channelWaveforms[0];
  const spf = audio.sampleRate / FPS;
  for (let f = 0; f < N; f++) {
    const spec = visualizeAudio({fps: FPS, frame: f, audioData: audio, numberOfSamples: 32, smoothing: true});
    let l = 0;
    for (let i = 0; i < 4; i++) l += spec[i];
    let h = 0;
    for (let i = 8; i < 24; i++) h += spec[i];
    low[f] = l / 4;
    high[f] = h / 16;
    bars.push(Float32Array.from(spec.slice(0, 24)));
    const s0 = Math.floor(f * spf);
    const s1 = Math.min(wave.length, Math.floor((f + 1) * spf));
    let acc = 0;
    for (let s = s0; s < s1; s++) acc += wave[s] * wave[s];
    rms[f] = s1 > s0 ? Math.sqrt(acc / (s1 - s0)) : 0;
  }
  const nl = percentile(low, 0.95);
  const nh = percentile(high, 0.95);
  const nr = percentile(rms, 0.95);
  const bloom = new Float32Array(N);
  const atk = 1 - Math.exp(-1 / 2);
  const rel = 1 - Math.exp(-1 / 10);
  let env = 0;
  for (let f = 0; f < N; f++) {
    low[f] = Math.min(1, low[f] / nl);
    high[f] = Math.min(1, high[f] / nh);
    const target = Math.min(1, rms[f] / nr);
    env += (target - env) * (target > env ? atk : rel);
    bloom[f] = env;
  }
  // light smoothing on the bands so the points do not jitter
  for (const arr of [low, high]) {
    let e = 0;
    for (let f = 0; f < N; f++) {
      e += (arr[f] - e) * (arr[f] > e ? atk : rel);
      arr[f] = e;
    }
  }
  const nb = percentile(Float32Array.from(bars.flatMap((b) => Array.from(b))), 0.97);
  bars.forEach((b) => b.forEach((v, i) => (b[i] = Math.min(1, v / nb))));
  const out = {low, high, bloom, bars};
  cache.set(audio, out);
  return out;
};

const ZERO: Features = {
  low: new Float32Array(DURATION_FRAMES),
  high: new Float32Array(DURATION_FRAMES),
  bloom: new Float32Array(DURATION_FRAMES),
  bars: [],
};

/** Features of one voice stem; zeros (idle) until the stem exists. */
export const useVoiceFeatures = (voice: 'S' | 'V'): Features => {
  const has = voice === 'S' ? ASSETS.studentStem : ASSETS.vtStem;
  // `has` is a build-time constant, so the hook order never changes between renders.
  const data = has ? useAudioData(staticFile(voice === 'S' ? 'audio/stems/student.wav' : 'audio/stems/vt.wav')) : null;
  if (!data) return ZERO;
  return compute(data);
};

export const sample = (arr: Float32Array, frame: number) => {
  const f = Math.max(0, Math.min(arr.length - 1, Math.floor(frame)));
  return arr[f] ?? 0;
};
