// Blue windows breathe with the voice that speaks from them: visualizeAudio on that voice's stem
// (public/audio/stems/<lang>/<voice>.wav), attack 2 frames, release 6. Voices without a take use the word timings.
import {staticFile} from 'remotion';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import type {Lang, Voice} from '../config';
import {ASSETS, VOICE_META} from '../data';
import {setStemEnv} from './voice';

const FPS = 30;

export const useStems = (lang: Lang) => {
  const real = ((VOICE_META[lang] as {voices?: string[]}).voices ?? []) as Voice[];
  const has = (v: Voice) => real.includes(v) && ASSETS.stems[lang]?.[v];
  const src = (v: Voice) => staticFile(`audio/stems/${lang}/${v}.wav`);
  const data = {
    ana: useAudioData(src('ana')),
    men: useAudioData(src('men')),
    qo: useAudioData(src('qo')),
    qq: useAudioData(src('qq')),
  };
  const raw = (v: Voice, f: number) => {
    const d = data[v];
    if (!d || f < 0) return 0;
    const bins = visualizeAudio({fps: FPS, frame: Math.floor(f), audioData: d, numberOfSamples: 32});
    const m = bins.reduce((a, b) => a + b, 0) / bins.length;
    return Math.min(1, m * 9);
  };
  setStemEnv(
    real.length
      ? (v: Voice, f: number) => {
          if (!has(v)) return Number.NaN;
          // attack 2 frames, release 6: run the follower over the last 8 frames
          let e = 0;
          for (let k = 8; k >= 0; k--) {
            const x = raw(v, f - k);
            e = x > e ? e + (x - e) / 2 : e + (x - e) / 6;
          }
          return e;
        }
      : null,
  );
};
