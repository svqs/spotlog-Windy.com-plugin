/**
 * Applies a design saved in the Style Lab to Spotlog.
 *   node scripts/apply-design.mjs saved-design.json
 * The file is what the lab saves (design/current): { tokens: {...}, words: {...}, savedAt }.
 * Writes src/lib/design.ts with only what differs from Spotlog's own defaults.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadDesignLib, root } from './load-design-lib.mjs';

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/apply-design.mjs saved-design.json'); process.exit(1); }
let saved = JSON.parse(readFileSync(file, 'utf8'));
saved = saved.spotlogDesign || saved.data || saved; // "Copy settings as text", or a database row
const { theme, copy } = loadDesignLib();
const base = theme.THEME_DEFAULTS, words = copy.COPY;
const tokens = {}, changedWords = {}, skipped = [];
for (const [k, v] of Object.entries(saved.tokens || {})) {
    if (!(k in base)) { skipped.push(k); continue; }
    if (typeof v !== typeof base[k]) { skipped.push(k); continue; }
    if (typeof v === 'string' && !/^#[0-9a-f]{6}$/i.test(v) && !/^[a-z]+$/.test(v)) { skipped.push(k); continue; }
    if (v !== base[k]) tokens[k] = typeof v === 'string' ? v.toLowerCase() : v;
}
for (const [k, v] of Object.entries(saved.words || {})) {
    if (!(k in words) || typeof v !== 'string') { skipped.push(k); continue; }
    if (v !== words[k]) changedWords[k] = v;
}
const when = saved.savedAt ? new Date(Number(saved.savedAt)).toISOString() : new Date().toISOString();
const out = `/**
 * The design saved in the Style Lab and applied to Spotlog: only what differs from the defaults
 * (colours and shapes in theme.ts, wording in copy.ts). Written by \`node scripts/apply-design.mjs\`.
 */
export const DESIGN: { savedAt: string; tokens: Record<string, string | number | boolean>; words: Record<string, string> } = {
    savedAt: ${JSON.stringify(when)},
    tokens: ${JSON.stringify(tokens, null, 8).replace(/\n}$/, '\n    }')},
    words: ${JSON.stringify(changedWords, null, 8).replace(/\n}$/, '\n    }')},
};
`;
writeFileSync(path.join(root, 'src/lib/design.ts'), out);
console.log(`design.ts: ${Object.keys(tokens).length} design settings and ${Object.keys(changedWords).length} phrases differ from Spotlog's defaults` + (skipped.length ? `; skipped ${skipped.join(', ')}` : ''));
