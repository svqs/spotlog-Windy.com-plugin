# spotlog tide errors (Cloudflare Worker)

Receives the small error reports the plugin sends when Windy's tide forecast misbehaves for a Premium user
(see `docs/forecast.md` → Tides), keeps them for 30 days, and can push a notification to your phone.

- `POST /report`: from the plugin (only from windy.com).
- `GET /reports`: for you, with `Authorization: Bearer <REPORTS_TOKEN>`.

A report holds the error kind, HTTP status, the answer's structure without values, the plugin version, the time and
the country Cloudflare sees. No coordinates, no user id, no IP address.

## What gets reported

| What happens | In the plugin | Report |
|---|---|---|
| User isn't Premium | no tide, no request | no |
| 401/403 and Premium has lapsed | no tide | no |
| 401/403 while still Premium | saved without tide | `unauthorized-premium` |
| Offline / connection fails (after one retry) | saved without tide | no (the user's connection) |
| Timeout or 5xx (after one retry) | saved without tide | `timeout` / `server` |
| 404 or another 4xx | saved without tide | `not-found` / `client` |
| 200 with a different structure | saved without tide | `shape` (+ the structure) |
| 200 but under two highs/lows, or the window misses now | saved without tide | `too-few-extremes` / `stale-window` |

## Deploy (free Cloudflare account)

```sh
cd tide-worker
npx wrangler login
npx wrangler kv namespace create REPORTS      # paste the id into wrangler.toml
npx wrangler secret put REPORTS_TOKEN         # any long random string
npx wrangler secret put NOTIFY_URL            # optional: e.g. https://ntfy.sh/<private-topic> for a phone push
npx wrangler deploy
```

Then put the URL in `src/lib/links.ts → TIDE_REPORT_URL` (`https://spotlog-tide-errors.<your-subdomain>.workers.dev/report`)
and ship a new version. Until then the plugin sends nothing.

Read reports:

```sh
curl -H "Authorization: Bearer <REPORTS_TOKEN>" https://spotlog-tide-errors.<your-subdomain>.workers.dev/reports
```

With `NOTIFY_URL` set you get one push per error kind per day.
