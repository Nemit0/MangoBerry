#!/usr/bin/env sh
set -eu

: "${AWS_REGION:?AWS_REGION not set}"
: "${SECRET_ID:?SECRET_ID not set}"

echo "Rendering runtime config.js from Secrets Manager ($SECRET_ID)…"
python3 /render_config.py "$AWS_REGION" "$SECRET_ID" "/usr/share/nginx/html/config.js"



echo "Starting nginx…"
exec nginx -g "daemon off;"