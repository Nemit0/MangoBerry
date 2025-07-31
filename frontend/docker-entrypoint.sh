#!/bin/bash
set -Eeuo pipefail

# ---------------- Configuration ----------------
BACKEND_HOST="${BACKEND_HOST:-backend}"                                   # Compose service name
BACKEND_PORT="${BACKEND_PORT:-8000}"
ENDPOINT_PATH="${ENDPOINT_PATH:-/admin/runtime_frontend_env?allow_multiple=false}"
BACKEND_URL="http://${BACKEND_HOST}:${BACKEND_PORT}${ENDPOINT_PATH}"
ENV_JS_PATH="/usr/share/nginx/html/env.js"
RETRIES="${RETRIES:-30}"
SLEEP_SECS="${SLEEP_SECS:-2}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-3}"

echo "[entrypoint] Waiting for backend at ${BACKEND_URL} ..."

# ---------------- Wait for backend ----------------
attempt=0
while (( attempt < RETRIES )); do
  if curl -fsS --connect-timeout "${CONNECT_TIMEOUT}" "${BACKEND_URL}" >/dev/null; then
    break
  fi
  attempt=$((attempt + 1))
  echo "[entrypoint] Backend not ready (attempt ${attempt}/${RETRIES}). Sleeping ${SLEEP_SECS}s..."
  sleep "${SLEEP_SECS}"
done

if (( attempt == RETRIES )); then
  echo "[entrypoint][WARN] Backend didn’t become ready after $((RETRIES * SLEEP_SECS))s. Using default env.js."
  cat > "${ENV_JS_PATH}" <<'EOF'
window.__ENV__ = window.__ENV__ || {};
window.__ENV__.REACT_APP_KAKAO_MAP_APP_KEY = "";
EOF
else
  echo "[entrypoint] Backend reachable. Fetching runtime env…"
  JSON="$(curl -fsS "${BACKEND_URL}" || echo '{}')"

  KEY="$(printf '%s' "${JSON}" | jq -r '.REACT_APP_KAKAO_MAP_API_KEY // .REACT_APP_KAKAO_MAP_APP_KEY // empty')"

  if [[ -z "${KEY}" || "${KEY}" == "null" ]]; then
    echo "[entrypoint][WARN] Key field missing in response. Writing empty value."
    KEY=""
  fi

  cat > "${ENV_JS_PATH}" <<EOF
// Auto-generated at container start. Do not edit by hand.
window.__ENV__ = window.__ENV__ || {};
window.__ENV__.REACT_APP_KAKAO_MAP_APP_KEY = "${KEY}";
EOF

  echo "[entrypoint] Wrote ${ENV_JS_PATH} (size: $(wc -c < "${ENV_JS_PATH}") bytes)."
fi

echo "[entrypoint] Starting Nginx..."
exec nginx -g 'daemon off;'