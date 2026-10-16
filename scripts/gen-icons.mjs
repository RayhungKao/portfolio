// Rebuilds src/icons/svgs.ts from the .svg files in src/icons.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../src/icons/', import.meta.url);
const names = readdirSync(dir).filter((f) => f.endsWith('.svg')).map((f) => f.replace(/\.svg$/, '')).sort();
let out =
  '// Generated from the .svg files in this folder (they stay the source). Next has no ?raw import like Vite did.\n' +
  '// Regenerate with: node scripts/gen-icons.mjs\nexport const SVGS: Record<string, string> = {\n';
for (const n of names) out += `  ${JSON.stringify(n)}: ${JSON.stringify(readFileSync(new URL(`${n}.svg`, dir), 'utf8').trim())},\n`;
out += '};\n';
writeFileSync(new URL('svgs.ts', dir), out);
