import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const work = mkdtempSync(path.join(tmpdir(), 'spotlog-package-test-'));
const archive = path.join(work, 'plugin.tar');
const manifestPath = path.join(root, 'dist/plugin.json');
const before = readFileSync(manifestPath, 'utf8');
try {
    execFileSync(process.execPath, [path.join(root, 'scripts/package-plugin.mjs'), archive], {
        env: { ...process.env, GITHUB_REPOSITORY: 'owner/spotlog', GITHUB_SHA: 'test-sha', GITHUB_REPOSITORY_OWNER: 'owner' },
    });
    const manifest = JSON.parse(before);
    const expected = ['plugin.min.js', 'plugin.json', 'package.json', ...(manifest.screenshot ? [manifest.screenshot] : [])];
    assert.deepEqual(execFileSync('tar', ['tf', archive], { encoding: 'utf8' }).trim().split('\n'), expected);
    const packed = JSON.parse(execFileSync('tar', ['xOf', archive, 'plugin.json'], { encoding: 'utf8' }));
    assert.deepEqual(packed, { ...manifest, repositoryName: 'owner/spotlog', commitSha: 'test-sha', repositoryOwner: 'owner' });
    assert.equal(readFileSync(manifestPath, 'utf8'), before, 'Packaging must not modify the build manifest');
    assert.deepEqual(execFileSync('tar', ['xOf', archive, 'plugin.min.js'], { maxBuffer: 10 * 1024 * 1024 }), readFileSync(path.join(root, 'dist/plugin.min.js')));
    console.log('Package checks passed: runtime files only, intact bundle and manifest, repository metadata.');
} finally {
    rmSync(work, { recursive: true, force: true });
}
