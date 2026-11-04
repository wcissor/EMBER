// Exports the pure-data config/layout modules to build/*.json for the Python audio + QA scripts.
import {writeFileSync, mkdirSync} from 'node:fs';
const config = await import('../src/config.ts');
const layout = await import('../src/layout.ts');
mkdirSync('build', {recursive: true});
writeFileSync('build/config.json', JSON.stringify(config, null, 1));
writeFileSync('build/layout.json', JSON.stringify(layout, (k, v) => (typeof v === 'function' ? undefined : v), 1));
console.log('exported build/config.json, build/layout.json');
