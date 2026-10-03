# Build, publish, sync server, security

## Build

```bash
npm install
npm run build                 # dist/plugin.js, dist/plugin.min.js, dist/plugin.json
python3 harness/assemble.py   # harness/sandbox.html (single file: fake Windy + example data + the plugin)
node scripts/build-lab.mjs    # harness/stylelab/index.html + preview.html
```

`plugin.min.js` is ~400 KB (~140 KB gzipped). That includes ~48 KB of embedded fonts and the CSS; the rest is compiled Svelte.

## Versions

Bump `version` in **both** `package.json` and `src/pluginConfig.ts` for every shipped change. The install URL contains
the version.

## Publishing to windy-plugins.com

> **Only publish when the owner asks for it explicitly.** Publishing uploads a new version under her Windy account. She
> installs it on her phone herself.

- **From GitHub:** Actions › **publish-plugin** › Run workflow (`.github/workflows/publish-plugin.yml`, on `main`).
  It builds, then uploads `dist/` to `https://node.windy.com/plugins/v1.0/upload` with the `WINDY_API_KEY` secret. The
  run summary shows the **install URL**:
  `https://windy-plugins.com/<user id>/windy-plugin-spotlog/<version>/plugin.min.js`.
- **From a terminal:** `WINDY_API_KEY=… ./scripts/publish.sh`. It does the same steps.
- **Installing:** windy.com/plugins › Load plugin directly from URL › paste the install URL › Install untrusted plugin.
  Each version has its own URL, so a new upload doesn't change installs until someone loads it.
  An install on desktop is listed on the user's other devices too (that's how the owner gets it on her phone).
  Loading a new version in her browser therefore updates her phone after a full reload.
- **Testing without publishing:** `npm start` serves `https://localhost:9999/plugin.js` in watch mode. Open it once and
  accept the certificate, then load it at <https://www.windy.com/developer-mode>. This needs a terminal on the same
  computer as the browser.
- The key is a "Windy Plugins API" key from <https://api.windy.com/keys>. It lives **only** in GitHub › Settings ›
  Secrets › Actions › `WINDY_API_KEY`. Never put it in a file, a commit, a log or chat.
- **If an upload fails** (exit 22 = Windy answered with an error), the reason is in the step log ("Windy answered:").
  Common causes:
  - the version already exists (bump it);
  - an invalid or expired key;
  - a bad `plugin.json`.

## Repository and the owner's Mac

- GitHub: `svqs/spotlog-windy.com-plugin` (private). Work lands on `main`.
- The owner keeps a clone in `~/Documents/SophisVibe/spotlog-Windy.com-plugin`. When an agent has access to her
  computer, it syncs that clone after each push. One way is a git bundle copied over, then
  `git fetch ./x.bundle main:refs/remotes/origin/main && git merge --ff-only origin/main`.

## Account sync server (optional, `supabase/`)

Windy's plugin API has no per-user storage, so the diary can live in a small Supabase project:

1. Create a project in an EU region.
2. Run `supabase/setup.sql` (table `spotlog_diary`, row-level security, no public access).
3. `supabase functions deploy spotlog --no-verify-jwt`. The function checks the Windy login itself.
4. Secrets:
   - `ALLOW_UNVERIFIED_TEST_IDS=<windy user ids>` for private testing;
   - `WINDY_VERIFY_URL=…` once Windy says how to verify their token.
5. Put the function URL into `src/lib/cloudConfig.ts`, then build and publish.

**Open question for Windy:** may a plugin send `userToken` to its own server, and how does the server verify it? Until
that's answered, only allow-listed test ids may sync. Never release sync publicly without verification.

## Security and privacy

**What protects users**
- **No `{@html}` with user text.** Map labels and popups go through `escapeHtml`. `rich()` is only for copy.
- **Everything loaded is validated** (`normalise`). Uploads are capped at 25 MB. GPS files are capped at 40 MB and reduced to ~400 points (2 000 max when loading).
- **No secrets in the plugin.** No trackers, no ads, no third-party requests except Windy's own APIs and the optional
  sync function.
- **No spotlog accounts:** identity comes from the Windy login. Spotlog only opens for logged-in Premium users. That
  check is client-side, a UX gate and not a security boundary.

**Known limits**
- Every plugin on windy.com shares the page and its `localStorage`. An untrusted plugin could read the diary.
- In browser-only mode, clearing site data deletes the diary. Users should use "Download a copy" as a backup.
- GPS tracks can reveal start points. They're only shown to the user. Trim them if sharing ever comes.
- GDPR: say what is stored and where, and keep "Delete everything" (also on the server when sync is on).
