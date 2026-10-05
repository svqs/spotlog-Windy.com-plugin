# Plugin upload size, 2026-10-05

Implemented in 0.18.3 after Windy rejected the upload as too large. No upload was attempted during this work;
the server's exact limit and acceptance remain unverified.

## Findings and changes

Both publishing paths archived every file in `dist/`, including the unminified development bundle and its large
source map. The Style Lab editor and preview themselves were never in this archive.

`scripts/package-plugin.mjs` now stages an explicit set of runtime files: `plugin.min.js`, `plugin.json`,
`package.json` and the optional screenshot named in the manifest. Both the manual publisher and GitHub workflow
use it. Repository metadata is added to the staged manifest; the local build manifest stays intact.
Development JS and source maps remain available locally for debugging, the harness and the Style Lab.

The shared application CSS loses comments and formatting whitespace through PostCSS. Declaration values,
selector whitespace and scoping are preserved; no UI, fonts, application features or stored data were removed.

## Measurements

Comparable fresh builds from the current source, with and without CSS compaction (version 0.18.3):

| File | Before | After |
|---|---:|---:|
| Minified plugin | 430,603 bytes | 419,040 bytes |
| Minified plugin, gzip estimate | 148,043 bytes | 146,036 bytes |
| Upload tar, including metadata | 4,341,760 bytes | 432,640 bytes |

The upload archive shrinks about 90%; the executable bundle shrinks about 2.7%. Tar padding/metadata may vary
slightly between operating systems. Gzip is a local estimate, not a guarantee of Windy's response encoding.

## Validation

- Fast checks: lint, copy coverage, version pair, Svelte/TypeScript, core, prediction, 46 learning scenarios and service tests.
- Package regression checks: file allowlist, intact executable bytes, repository metadata, unchanged local manifest.
- Full stylesheet declaration comparison before/after compaction: every property, value and `!important` preserved.
- Browser checks: 50-step development and minified e2e flows, layout/data scenarios, focused regressions including
  live Style Lab overrides, and eight learning scenarios. Phone screenshots inspected.

CI now verifies the archive and repeats the e2e flow against `plugin.min.js`. The change does not establish
Windy's size limit; the owner must retry publishing to confirm server acceptance.
