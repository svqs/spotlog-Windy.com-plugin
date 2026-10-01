/** Loads src/lib/theme.ts, copy.ts and design.ts in Node (for the Style Lab build and for applying a saved design). */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadDesignLib() {
    const out = path.join(root, 'node_modules/.cache/spotlog-design');
    mkdirSync(out, { recursive: true });
    execFileSync(path.join(root, 'node_modules/.bin/tsc'), [
        '--outDir', out, '--module', 'commonjs', '--target', 'es2020', '--skipLibCheck', '--esModuleInterop', '--noEmitOnError', 'false',
        ...['theme', 'copy', 'design'].map(n => path.join(root, 'src/lib', n + '.ts')),
    ], { stdio: 'inherit' });
    writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
    // copy.ts uses a Svelte store; Node only needs its starting value
    const load = Module._load;
    Module._load = function (req, ...rest) {
        if (req === 'svelte/store') return { writable: v => ({ subscribe: f => (f(v), () => {}), set() {} }) };
        return load.call(this, req, ...rest);
    };
    const require = createRequire(path.join(out, 'x.js'));
    const theme = require('./theme.js');
    const copy = require('./copy.js');
    const design = require('./design.js');
    Module._load = load;
    return { theme, copy, design };
}
