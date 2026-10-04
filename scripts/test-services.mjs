import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { root } from './compile-tests.mjs';
const cache = path.join(root, 'node_modules/.cache'); mkdirSync(cache, { recursive: true });
const out = mkdtempSync(path.join(cache, 'spotlog-services-'));
try {
    execFileSync(path.join(root, 'node_modules/.bin/tsc'), ['--target', 'es2022', '--module', 'commonjs', '--strict', '--skipLibCheck', '--types', '@cloudflare/workers-types', '--noEmitOnError', '--rewriteRelativeImportExtensions', '--outDir', out, 'tide-worker/src/index.ts'], { cwd: root, stdio: 'inherit' });
    writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
    const require = createRequire(path.join(out, 'tests.cjs'));
    const worker = require('./tide-worker/src/index.js').default;
    const { readTextLimited } = require('./src/lib/http.js');
    assert.equal(await readTextLimited(new Request('https://test', {method:'POST', body:'éé'}), 3), null);
    assert.equal(await readTextLimited(new Request('https://test', {method:'POST', body:'éé'}), 4), 'éé');
    const tasks = []; const records = new Map();
    const env = { REPORTS: { put: async (key, value) => records.set(key, value), get: async key => records.get(key), list: async () => ({ keys: [] }) }, REPORTS_TOKEN: 'test' };
    const ctx = { waitUntil: task => tasks.push(task) };
    for (const body of ['null', '[]', '{', '{}', JSON.stringify({ kind: 'shape', shape: 'é'.repeat(1500) })]) {
        const response = await worker.fetch(new Request('https://test/report', { method: 'POST', body }), env, ctx);
        assert.equal(response.status, 400); assert.equal(records.size, 0);
    }
    const response = await worker.fetch(new Request('https://test/report', { method: 'POST', body: JSON.stringify({ kind: 'shape', plugin: '0.18.0' }) }), env, ctx);
    assert.equal(response.status, 204); await Promise.all(tasks); assert.equal(records.size, 1);
    console.log('Tide-worker checks passed: malformed/null JSON, byte limits and KV writes.');
} finally {rmSync(out, { recursive: true, force: true });}
