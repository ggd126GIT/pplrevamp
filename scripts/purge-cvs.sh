#!/usr/bin/env bash
# Daily CV retention purge. Called by cron; see DEPLOY-VPS.md C5.
#
# This exists as a script rather than a one-liner in the crontab because the
# command needs nested quoting (a $(...) inside a double-quoted header inside a
# cron line), and crontab mangles it — an earlier attempt silently installed an
# EMPTY crontab. A script file gives cron nothing to quote.
#
# Reads the secret from the env file at run time so it lives in exactly one
# place. Putting it in the crontab would be a second copy to rotate, and would
# expose it in `ps` while curl runs.
set -euo pipefail

ENV_FILE=${ENV_FILE:-/var/www/ppl/.env.production}
URL=${URL:-http://127.0.0.1:3000/api/cron/purge-cvs}

if [ ! -r "$ENV_FILE" ]; then
  echo "$(date -Is) purge-cvs: cannot read $ENV_FILE" >&2
  exit 1
fi

SECRET=$(grep -m1 '^CRON_SECRET=' "$ENV_FILE" | cut -d= -f2-)
if [ -z "$SECRET" ]; then
  # Not an error worth alerting on: an unset secret deliberately means the
  # purge is switched off, not misconfigured.
  echo "$(date -Is) purge-cvs: CRON_SECRET unset, purge disabled"
  exit 0
fi

# --fail so a non-2xx is a real failure with a message, rather than a silent
# success that writes an error body into the log.
echo "$(date -Is) $(curl -fsS -X POST -H "Authorization: Bearer $SECRET" "$URL")"
