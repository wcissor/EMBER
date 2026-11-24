// Gate 8: no organization names, handles or counts anywhere on screen; no numbers on bibs, shirts or signs.
// The only numbers allowed are the ages on the role cards and the typed 16. Scans every on-screen string in config.ts,
// every JSX/SVG text literal in src/, and every string literal rendered inside <text> elements.
import {readFileSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';
const cfg = await import('../../src/config.ts');
const strings = [];
const push = (where, s) => typeof s === 'string' && s.trim() && strings.push({where, s});
for (const l of cfg.LINES) for (const lang of cfg.LANGS) l[lang].caption.forEach((c) => push(`caption L${l.id} ${lang}`, c));
for (const lang of cfg.LANGS) {
  Object.entries(cfg.TEXT[lang]).forEach(([k, v]) => push(`text ${lang}.${k}`, v));
  Object.values(cfg.SPEAKERS[lang]).forEach((v) => push(`speaker ${lang}`, v));
}
cfg.ROLES.forEach((r) => {
  push(`role ${r.key}.age`, r.age);
  for (const lang of cfg.LANGS) ['title', 'format', 'category'].forEach((k) => push(`role ${r.key}.${lang}.${k}`, r[lang][k]));
});
push('window D subtitle', `${cfg.WINDOW_D_SUBTITLE.from} → ${cfg.WINDOW_D_SUBTITLE.to}`);
const ts = (await import('typescript')).default;
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));
for (const f of walk('src').filter((f) => f.endsWith('.tsx') && !/Lab2?\.tsx$|GlyphTest\.tsx$/.test(f))) {
  const sf = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (n) => {
    if (n.kind === ts.SyntaxKind.JsxText && n.getText().trim()) push(`jsx ${f}`, n.getText().trim());
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
const ALLOWED_NUMBERS = new Set(cfg.ROLES.map((r) => r.age).concat([cfg.TEXT.az.typed]));
const BANNED = /\b(instagram|facebook|tiktok|whatsapp|telegram|linkedin|twitter|youtube|snapchat|google|unicef|red cross|inc\.?|llc|ltd|foundation|association|ngo|ministry|asan|dost)\b/i;
const problems = [];
for (const {where, s} of strings) {
  if (/@\w/.test(s)) problems.push(`${where}: handle "${s}"`);
  for (const d of s.match(/\b[\w-]+\.(com|org|net|az|io|site|app|co)\b/gi) ?? []) if (d.toLowerCase() !== 'voluntrack.site') problems.push(`${where}: domain "${d}"`);
  if (BANNED.test(s)) problems.push(`${where}: organization/platform name in "${s}"`);
  for (const n of s.match(/\d+(?:[–-]\d+)?\+?/g) ?? []) if (!ALLOWED_NUMBERS.has(n)) problems.push(`${where}: number "${n}" in "${s}"`);
}
const numbersSeen = [...new Set(strings.flatMap(({s}) => s.match(/\d+(?:[–-]\d+)?\+?/g) ?? []))];
console.log(JSON.stringify({strings: strings.length, numbersSeen, allowed: [...ALLOWED_NUMBERS], problems}, null, 1));
if (problems.length) process.exit(1);
