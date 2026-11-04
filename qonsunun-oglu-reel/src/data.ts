// Remotion-side data: the measured voice per language and the resolved timelines.
import az from '../public/audio/voice_timings-az.json';
import en from '../public/audio/voice_timings-en.json';
import meta from '../build/voice-meta.json';
import assets from '../build/assets.json';
import {resolveTimeline, type TimedLine, type Timeline} from './timeline';
import type {Lang} from './config';

const TLS: Record<Lang, Timeline> = {
  az: resolveTimeline(az as TimedLine[], 'az'),
  en: resolveTimeline(en as TimedLine[], 'en'),
};
export const timelineFor = (lang: Lang) => TLS[lang];
export const VOICE_META = meta as Record<Lang, {source: string; note?: string}>;

/** Which generated assets exist (written by scripts/assets.mjs). */
export const ASSETS = assets as {
  grain: boolean;
  concrete: boolean;
  mix: Record<Lang, boolean>;
  stems: Record<Lang, Record<string, boolean>>;
};
