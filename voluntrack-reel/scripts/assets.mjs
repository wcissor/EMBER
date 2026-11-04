// Records which generated/supplied assets exist so the composition can degrade gracefully (build/assets.json).
import {existsSync, writeFileSync, mkdirSync, readdirSync} from 'node:fs';
const count = (d, ext) => (existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(ext)).length : 0);
mkdirSync('build', {recursive: true});
const a = {
  studentStem: existsSync('public/audio/stems/student.wav'),
  vtStem: existsSync('public/audio/stems/vt.wav'),
  mix: existsSync('public/audio/mix.wav'),
  wall: existsSync('public/frames/wall.png'),
  logo: existsSync('public/logo.svg'),
  photo: existsSync('public/assets/volunteers.jpg'),
  stamps: count('public/stamps', '.png') > 0,
  grain: count('public/grain', '.png') >= 24,
};
writeFileSync('build/assets.json', JSON.stringify(a, null, 1));
console.log(a);
