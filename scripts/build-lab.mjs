/**
 * Builds the Style Lab: harness/stylelab/index.html (the editor) and harness/stylelab/preview.html
 * (the real Spotlog with the fake Windy and example data, which the editor shows live).
 * Run after `npm run build`:  node scripts/build-lab.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadDesignLib, root } from './load-design-lib.mjs';

const { theme, copy, design } = loadDesignLib();
const h = p => path.join(root, 'harness', p);
const data = {
    look: theme.THEME, // Spotlog's look today (defaults + the applied design)
    words: Object.fromEntries(Object.keys(copy.COPY).map(k => [k, design.DESIGN.words[k] ?? copy.COPY[k]])),
    groups: copy.COPY_GROUPS,
    applied: design.DESIGN.savedAt || '',
};
const lab = readFileSync(h('stylelab.src.html'), 'utf8').replace('/*SPOTLOG_DATA*/', 'const SPOTLOG = ' + JSON.stringify(data) + ';');
writeFileSync(h('stylelab/index.html'), lab);

// the preview: the sandbox page, told it runs inside the lab
const mock = readFileSync(h('mock-windy.js'), 'utf8');
let plugin = readFileSync(path.join(root, 'dist/plugin.js'), 'utf8');
// Preview pages are committed and compared in CI; only the uploaded build needs volatile timestamps.
plugin = plugin.replace(/"built": \d+/, '"built": 0').replace(/"builtReadable": "[^"]*"/, '"builtReadable": ""');
plugin = plugin.replace(/\nexport \{[^}]*\};?\s*/, '\n').replace(/\/\/# sourceMappingURL=.*/, '').replace(/<\/script/g, '<\\/script');
const bridge = readFileSync(h('preview-bridge.js'), 'utf8');
const sandbox = readFileSync(h('sandbox.src.html'), 'utf8')
    .replace('<script>\n/*MOCK*/', `<script>\n${bridge}\n</script>\n<script>\n/*MOCK*/`)
    .replace('/*MOCK*/', () => mock)
    .replace('/*PLUGIN*/', () => plugin)
    .replace('</style>', '  /* inside the Style Lab: just the map and Spotlog */\n  .sb-top, .sb-legend { display: none !important; }\n</style>');
writeFileSync(h('stylelab/preview.html'), '<!doctype html>\n<html lang="en">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + sandbox);
console.log('Style Lab built:', Object.keys(theme.THEME).length, 'design settings,', Object.keys(copy.COPY).length, 'phrases');
