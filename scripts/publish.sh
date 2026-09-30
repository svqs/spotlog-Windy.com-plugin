#!/usr/bin/env bash
# Publishes Spotlog to windy-plugins.com (same steps as .github/workflows/publish-plugin.yml).
# Needs a "Windy Plugins API" key from https://api.windy.com/keys
#   WINDY_API_KEY=xxxx ./scripts/publish.sh
# The response contains the install URL: https://windy-plugins.com/<user id>/windy-plugin-spotlog/<version>/plugin.min.js
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${WINDY_API_KEY:-}" ]; then
  echo "Set WINDY_API_KEY first (https://api.windy.com/keys)" >&2
  exit 1
fi
command -v jq >/dev/null || { echo "jq is needed (brew install jq / apt install jq)" >&2; exit 1; }

npm run build
cd dist
tmp="$(mktemp -d)"
mv plugin.json "$tmp/plugin.json"
echo '{"repositoryName": "local", "commitSha": "local", "repositoryOwner": "local"}' > "$tmp/info.json"
jq -s '.[0] * .[1]' "$tmp/plugin.json" "$tmp/info.json" > plugin.json
tar cf ../plugin.tar .
cd ..
echo "Publishing $(jq -r .version dist/plugin.json)…"
curl -s --fail-with-body -XPOST 'https://node.windy.com/plugins/v1.0/upload' \
  -H "x-windy-api-key: ${WINDY_API_KEY}" \
  -F "plugin_archive=@plugin.tar"
echo
rm -f plugin.tar
