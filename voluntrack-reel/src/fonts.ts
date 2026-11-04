// Google Fonts (Barlow Condensed 800, Inter variable) — the exact files @remotion/google-fonts references,
// fetched by scripts/fetch-fonts.mjs into public/fonts so rendering needs no network.
import {continueRender, delayRender, staticFile} from 'remotion';

let started = false;

export const ensureFonts = () => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('Loading Barlow Condensed + Inter');
  const faces = [
    new FontFace('Barlow Condensed', `url(${staticFile('fonts/barlow-condensed-800-latin.woff2')}) format('woff2')`, {weight: '800', style: 'normal'}),
    new FontFace('Inter', `url(${staticFile('fonts/inter-700-latin.woff2')}) format('woff2')`, {weight: '100 900', style: 'normal'}),
  ];
  Promise.all(faces.map((f) => f.load()))
    .then((loaded) => {
      loaded.forEach((f) => (document.fonts as unknown as {add: (f: FontFace) => void}).add(f));
      return document.fonts.ready;
    })
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error('Font load failed', err);
      continueRender(handle);
    });
};
