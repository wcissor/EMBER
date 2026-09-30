// QA: every route × az/ru/en × light/dark × 1440×900 / 390×844.
// Fails on console errors, horizontal page scroll, text overflow, missing keys, contrast < 4.5:1, axe violations.
import fs from 'fs';
import path from 'path';
import { launch, newCtx, watch, signIn, settle, URL0 } from './lib.mjs';
const AXE = fs.readFileSync(new URL('./node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const OUT = process.env.OUT || new URL('./screenshots', import.meta.url).pathname;
const LANGS = (process.env.LANGS || 'az,ru,en').split(',');
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const VPS = (process.env.VPS || '1440x900,390x844').split(',').map((v) => v.split('x').map(Number));
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const AXE_ON = process.env.AXE !== '0';
const N14 = 'nd_cyr6wckwnn';
const ROUTES = [
  ['signin', '#/signin'], ['consent', '#/consent'], ['overview', '#/overview'], ['map', '#/map'], ['nodes', '#/nodes'], ['node-N-14', '#/nodes/' + N14],
  ['gateways', '#/gateways'], ['gateway-GW-02', '#/gateways/GW02'], ['alerts', '#/alerts'], ['forecast', '#/forecast'], ['data', '#/data'], ['activity', '#/activity'],
  ...['general', 'members', 'notifications', 'security', 'support', 'api-keys', 'privacy', 'billing'].map((s) => ['settings-' + s, '#/settings/' + s]),
  ['legal', '#/legal'], ...['tos', 'privacy', 'dpa', 'subprocessors'].map((d) => ['legal-' + d, '#/legal/' + d]), ['help', '#/help'],
].filter(([n]) => !ONLY || ONLY.includes(n));

async function checks(page) {
  return page.evaluate(() => {
    const out = { hscroll: false, overflow: [], missing: [], contrast: [], h1: document.querySelectorAll('h1').length };
    out.hscroll = document.documentElement.scrollWidth > window.innerWidth + 1;
    const vis = (el) => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden],.sr-only,[aria-hidden="true"]'); };
    for (const el of document.querySelectorAll('label, button, a.btn, th, td, [role=gridcell], [role=columnheader], .tag, .chip, .nav-item, .tab, .menu-item, .count, .nav-badge, h1, h2, h3')) {
      if (!vis(el)) continue;
      if (el.closest('.vt-row[aria-busy]')) continue;
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'auto') out.overflow.push(`${el.tagName.toLowerCase()}.${(el.className && el.className.baseVal === undefined ? el.className : '').toString().split(' ')[0]} "${el.textContent.trim().slice(0, 40)}" ${el.scrollWidth}>${el.clientWidth}`);
    }
    const m = document.body.innerText.match(/\[[a-z]{1,5}\.[\w.-]+\]/g); if (m) out.missing = [...new Set(m)];
    // contrast sampling of text leaves
    const lum = (c) => { const a = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
    const parse = (s) => { const m2 = s.match(/rgba?\(([^)]+)\)/); if (!m2) return null; const p = m2[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; };
    const bgOf = (el) => { let stack = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); const c = parse(cs.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } } let base = [255, 255, 255]; for (const c of stack.reverse()) base = base.map((v, i) => v * (1 - c.a) + c.rgb[i] * c.a); return base; };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set(); let n = 0;
    while (walker.nextNode() && n < 400) {
      const tn = walker.currentNode; if (!tn.textContent.trim()) continue;
      const el = tn.parentElement; if (!el || seen.has(el) || !vis(el)) continue; seen.add(el); n++;
      if (el.closest('button:disabled, [aria-disabled="true"], input:disabled, select:disabled, .btn:disabled, svg, option')) continue;
      const cs = getComputedStyle(el); const fg = parse(cs.color); if (!fg) continue;
      let op = 1; for (let e = el; e; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity);
      const bg = bgOf(el); const f = fg.rgb.map((v, i) => v * fg.a * op + bg[i] * (1 - fg.a * op));
      const L1 = lum(f), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      if (ratio < 4.5) out.contrast.push(`${ratio.toFixed(2)} "${tn.textContent.trim().slice(0, 30)}" ${cs.color} on rgb(${bg.map(Math.round)})`);
    }
    return out;
  });
}
const report = { runs: 0, fails: [], started: new Date().toISOString() };
const b = await launch();
for (const [w, hgt] of VPS) for (const scheme of SCHEMES) for (const lang of LANGS) {
  const ctx = await newCtx(b, { w, h: hgt, scheme });
  const page = await ctx.newPage(); const errs = []; watch(page, errs);
  const dir = path.join(OUT, `${w}`, scheme, lang); fs.mkdirSync(dir, { recursive: true });
  let signedIn = false;
  for (const [name, hash0] of ROUTES) {
    if (name === 'signin') { await page.goto(`${URL0}?lang=${lang}&debug=1#/signin`); }
    else {
      if (!signedIn) { await signIn(page, lang); signedIn = true; }
      let hash = hash0;
      if (hash.includes('GW02')) hash = '#/gateways/' + await page.evaluate(() => dataGen.gwByName['GW-02'].id).catch(() => 'x');
      await page.evaluate((x) => { location.hash = x; }, hash);
    }
    await settle(page, name.startsWith('node') || name === 'overview' ? 900 : 500);
    const c = await checks(page);
    let axeV = [];
    if (AXE_ON) {
      await page.addScriptTag({ content: AXE }).catch(() => {});
      axeV = await page.evaluate(async () => { if (!window.axe) return ['axe not loaded']; const r = await axe.run(document, { preload: false, runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] }); return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`); });
    }
    const shot = path.join(dir, name + '.jpg');
    await page.screenshot({ path: shot, type: 'jpeg', quality: 60, fullPage: w > 500 });
    report.runs++;
    const problems = { console: errs.splice(0), hscroll: c.hscroll, overflow: c.overflow, missing: c.missing, contrast: c.contrast, axe: axeV, h1: c.h1 === 1 ? 0 : `h1 count ${c.h1}` };
    const bad = problems.console.length || problems.hscroll || problems.overflow.length || problems.missing.length || problems.contrast.length || problems.axe.length || problems.h1;
    if (bad) report.fails.push({ state: `${w} ${scheme} ${lang} ${name}`, ...Object.fromEntries(Object.entries(problems).filter(([, v]) => (Array.isArray(v) ? v.length : v))) });
    process.stdout.write(bad ? 'x' : '.');
  }
  await ctx.close();
}
await b.close();
report.finished = new Date().toISOString();
fs.writeFileSync(new URL('./report.json', import.meta.url).pathname, JSON.stringify(report, null, 1));
console.log(`\n${report.runs} states, ${report.fails.length} with problems`);
