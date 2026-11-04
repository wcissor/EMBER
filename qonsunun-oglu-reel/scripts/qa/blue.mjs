// Gate 9 · Blue discipline: only elements tagged as VolunTrack may use the `blue` and `blueCore` tokens.
//  · the hex values live only in src/theme.ts; `C.blue` / `C.blueCore` are read only by src/vt.ts
//  · only VolunTrack files import src/vt.ts or src/chars/vtbits.tsx, each with the reason below
import {readFileSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';
const VT_FILES = {
  'src/vt.ts': 'the VolunTrack token module',
  'src/chars/vtbits.tsx': 'blue rooms, the halo, VolunTrack screens',
  'src/scenes/stages.tsx': "the son's windows, the deed windows, the kid's room once it turns blue, halos",
  'src/scenes/WorldScene.tsx': "facade spill of the blue (VolunTrack) windows",
  'src/scenes/Stairwell.tsx': "the son's phone light and the blue flood",
  'src/scenes/UIMoment.tsx': 'the VolunTrack UI itself',
  'src/scenes/Constellation.tsx': 'the window star and the logo',
  'src/scenes/useStems.ts': 'none (reads stems; no colour)',
  'src/Cover.tsx': "the son's blue window on the cover",
};
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));
const files = walk('src').filter((f) => /\.(tsx?|css)$/.test(f));
const problems = [];
const users = [];
for (const f of files) {
  const s = readFileSync(f, 'utf8');
  if (/#2F6BFF|#CFE0FF/i.test(s) && f !== 'src/theme.ts') problems.push(`${f}: blue hex outside theme.ts`);
  if (/\bC\.(blue|blueCore)\b/.test(s) && f !== 'src/vt.ts') problems.push(`${f}: reads C.blue/C.blueCore directly`);
  const imports = /from ['"](\.\.?\/)+(vt|chars\/vtbits)['"]|from ['"]\.\/vtbits['"]/.test(s);
  if (imports) {
    users.push(f);
    if (!VT_FILES[f]) problems.push(`${f}: imports VolunTrack colours but is not a VolunTrack element`);
  }
}
console.log(JSON.stringify({users: users.map((u) => ({file: u, why: VT_FILES[u]})), problems}, null, 1));
if (problems.length) process.exit(1);
