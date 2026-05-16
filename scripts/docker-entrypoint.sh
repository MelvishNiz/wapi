#!/bin/sh
set -eu

escape_js() {
  printf "%s" "$1" | sed "s/\\\\/\\\\\\\\/g; s/'/\\\\'/g"
}

panel_api_url="${PANEL_API_URL:-${VITE_API_URL:-}}"

cat > /app/dist/runtime-config.js <<EOF
window.__WAPI_CONFIG__ = {
  API_URL: '$(escape_js "$panel_api_url")'
};
EOF

exec "$@"
