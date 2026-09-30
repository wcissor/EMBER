import { launch, newCtx, signIn } from './lib.mjs';
const b = await launch(); const ctx = await newCtx(b); const p = await ctx.newPage();
await p.addInitScript(() => { window.__long = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); });
await signIn(p, 'en');
for (let i = 0; i < 3; i++) {
  await p.evaluate(() => location.hash = '#/overview'); await p.reload();
  await p.waitForSelector('main h2.headline', { timeout: 15000 });
  const r = await p.evaluate(() => ({ headline: Math.round(performance.now()), fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime), long: window.__long }));
  console.log(JSON.stringify(r));
}
await b.close();
