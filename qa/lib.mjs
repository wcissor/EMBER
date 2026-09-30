import { chromium } from 'playwright';
import fs from 'fs';
export const URL0 = new URL('../aglink-console.html', import.meta.url).href;
const FD = new URL('./fonts/', import.meta.url).pathname;
export async function launch() { return chromium.launch(); }
export async function newCtx(browser, { w = 1440, h = 900, scheme = 'light' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 1, hasTouch: w < 500, isMobile: false });
  // Optional: serve Google Fonts from ./fonts (download once with fetch-fonts.sh) so runs are reproducible offline.
  if (!fs.existsSync(FD + 'css.css')) return ctx;
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: fs.readFileSync(FD + 'css.css', 'utf8'), headers: { 'access-control-allow-origin': '*' } }));
  await ctx.route('https://fonts.gstatic.com/**', (r) => { const f = FD + new URL(r.request().url()).pathname.slice(1).replace(/\//g, '_'); if (fs.existsSync(f)) r.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(f), headers: { 'access-control-allow-origin': '*' } }); else r.abort(); });
  return ctx;
}
export function watch(page, errs) {
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
}
export async function signIn(page, lang = 'en', email) {
  await page.goto(`${URL0}?lang=${lang}&debug=1#/signin`);
  await page.waitForSelector('form button[type=submit]');
  if (email) await page.fill('input[type=email]', email);
  await page.click('form button[type=submit]');
  await page.waitForFunction(() => !location.hash.includes('signin'), null, { timeout: 15000 });
  await page.waitForTimeout(400);
}
export async function settle(page, ms = 600) {
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(ms);
}
