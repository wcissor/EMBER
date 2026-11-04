// Gate 2: every caption, interface text, CTA, URL and QR box from layout.ts sits inside the safe box.
const {READABLE, SAFE} = await import('../../src/layout.ts');
const rows = [];
let fail = 0;
for (const [name, b] of Object.entries(READABLE)) {
  const ok = b.x0 >= SAFE.x0 && b.x1 <= SAFE.x1 && b.y0 >= SAFE.y0 && b.y1 <= SAFE.y1;
  if (!ok) fail++;
  rows.push({name, box: `x ${b.x0}–${b.x1}, y ${b.y0}–${b.y1}`, ok});
}
console.log(JSON.stringify({safe: SAFE, rows, fail}, null, 1));
if (fail) process.exit(1);
