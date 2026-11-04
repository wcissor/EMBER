// Gate 8: no organization names, handles or counts anywhere on screen. The only numbers allowed are the ages
// (13+, 14+, 16+, 14–29, 18+), the typed 16 and the hook post's "April 30".
// Scans every on-screen string in config.ts plus every JSX text literal in src/.
import {readFileSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';
const cfg = await import('../../src/config.ts');

const strings = [];
const push = (where, s) => typeof s === 'string' && s.trim() && strings.push({where, s});
cfg.LINES.forEach((l) => l.caption.forEach((c) => push(`caption L${l.id}`, c)));
Object.values(cfg.POSTS).forEach((p) => ['poster', 'sub', 'button'].forEach((k) => push(`post ${p.key}.${k}`, p[k])));
Object.entries(cfg.STAMPS).forEach(([k, v]) => push(`stamp ${k}`, v));
cfg.BARRAGE.forEach((v, i) => push(`barrage ${i}`, v));
Object.entries(cfg.DM).forEach(([k, v]) => push(`dm ${k}`, v));
cfg.CATEGORIES.forEach((c) => push('category', c));
cfg.ROLES.forEach((r) => ['title', 'format', 'age', 'category'].forEach((k) => push(`role ${r.key}.${k}`, r[k])));
for (const [k, v] of Object.entries(cfg.UI)) {
  if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'string' ? push(`ui ${k}[${i}]`, x) : (push(`ui ${k}[${i}].label`, x.label), push(`ui ${k}[${i}].value`, x.value))));
  else push(`ui ${k}`, v);
}
Object.entries(cfg.END_CARD).forEach(([k, v]) => (Array.isArray(v) ? v.forEach((x) => push(`end ${k}`, x)) : push(`end ${k}`, v)));
push('site url', cfg.SITE.url);

// JSX text literals (catch anything hardcoded in components), via the TypeScript parser
const ts = (await import('typescript')).default;
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));
for (const f of walk('src').filter((f) => f.endsWith('.tsx') && !f.endsWith('Lab.tsx'))) {
  const sf = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (n) => {
    if (n.kind === ts.SyntaxKind.JsxText && n.getText().trim()) push(`jsx ${f}`, n.getText().trim());
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

const ALLOWED_NUMBERS = new Set(['13+', '14+', '16+', '14–29', '18+', '16', 'Age 16', 'April 30']);
const ALLOWED_DOMAINS = new Set(['voluntrack.site']);
const BANNED = /\b(instagram|facebook|tiktok|whatsapp|telegram|linkedin|twitter|youtube|snapchat|google|unicef|red cross|inc\.?|llc|ltd|foundation|association|ngo|ministry)\b/i;
const problems = [];
for (const {where, s} of strings) {
  if (/@\w/.test(s)) problems.push(`${where}: handle "${s}"`);
  for (const d of s.match(/\b[\w-]+\.(com|org|net|az|io|site|app|co)\b/gi) ?? []) if (!ALLOWED_DOMAINS.has(d.toLowerCase())) problems.push(`${where}: domain "${d}"`);
  if (BANNED.test(s)) problems.push(`${where}: organization/platform name in "${s}"`);
  const nums = s.match(/\d+(?:[–-]\d+)?\+?/g) ?? [];
  for (const n of nums) {
    const ok = ALLOWED_NUMBERS.has(n) || (n === '30' && s.includes('April 30')) || (n === '16' && /Age 16|^16$/.test(s));
    if (!ok) problems.push(`${where}: number "${n}" in "${s}"`);
  }
}
const numbersSeen = [...new Set(strings.flatMap(({s}) => s.match(/\d+(?:[–-]\d+)?\+?/g) ?? []))];
console.log(JSON.stringify({strings: strings.length, numbersSeen, problems}, null, 1));
if (problems.length) process.exit(1);
