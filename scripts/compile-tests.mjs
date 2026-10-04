import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function compileTests() {
    const cache = path.join(root, 'node_modules/.cache');
    mkdirSync(cache, { recursive: true });
    // A fresh output directory means compiler failures cannot fall back to last run's JavaScript.
    const out = mkdtempSync(path.join(cache, 'spotlog-tests-'));
    process.once('exit', () => rmSync(out, { recursive: true, force: true }));
    execFileSync(path.join(root, 'node_modules/.bin/tsc'), ['--project', path.join(root, 'tsconfig.tests.json'), '--outDir', out], { stdio: 'inherit' });
    writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
    return createRequire(path.join(out, 'tests.cjs'));
}
