#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# .ppl Solutions - production cutover.
#
# Run this ONLY after the Cloudflare A records for pplsolutionsinc.com and
# www.pplsolutionsinc.com have been pointed at this server AS DNS-ONLY
# (grey cloud). Certbot proves ownership over HTTP, which needs to reach this
# box directly; behind Cloudflare's proxy it cannot. Turn the orange cloud on
# AFTER this script succeeds.
#
#   Usage:  sudo /var/www/ppl/cutover.sh
#
# Run it as root: certbot and `nginx -t`/reload need it. The build and the pm2
# reload are dropped back to $APP_USER automatically (see run_as_app) — pm2 is
# per-user, and root's daemon has no `ppl` process, so running those as root
# would fail *after* the environment had already been rewritten.
#
# What it does, in order:
#   1. Refuses to run unless DNS actually points here (A *and* AAAA).
#   2. Expands the TLS certificate to cover the real domain.
#   3. Flips the app to the real hostname and REMOVES the password gate.
#   4. Rebuilds and reloads, as $APP_USER.
#
# Step 3 is the moment the site becomes public and indexable.
# ---------------------------------------------------------------------------
set -euo pipefail

APP_DIR=/var/www/ppl
ENV_FILE="$APP_DIR/.env.production"
CERT_NAME=w2.pplsolutionsinc.com
SITE_URL=https://www.pplsolutionsinc.com
MY_IP=187.127.121.54
MY_IP6=2a02:4780:5e:efd9::1
APP_USER=gilbertd

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

# pm2 keeps its daemon per-user under $HOME/.pm2, and the build must not leave
# root-owned files in .next (that breaks every later deploy.sh run). A login
# shell is required so HOME and PATH resolve to the app user's.
run_as_app() {
  if [[ $EUID -eq 0 ]]; then
    sudo -iu "$APP_USER" bash -lc "$1"
  else
    bash -lc "$1"
  fi
}

# --- 1. Pre-flight ---------------------------------------------------------
say "Pre-flight: does the real domain resolve to this server?"
fail=0
for host in pplsolutionsinc.com www.pplsolutionsinc.com; do
  got=$(dig +short A "$host" @1.1.1.1 | tr '\n' ' ')
  if [[ "$got" == *"$MY_IP"* ]]; then
    echo "  OK    $host A    -> $got"
  else
    echo "  WRONG $host A    -> ${got:-(nothing)}   expected $MY_IP"
    fail=1
  fi

  # Let's Encrypt PREFERS IPv6 when an AAAA exists. A leftover AAAA pointing at
  # the old WordPress box therefore sends the HTTP-01 challenge there and the
  # certificate expansion fails - even though the A record is perfect. Checking
  # only A is what made this a trap.
  got6=$(dig +short AAAA "$host" @1.1.1.1 | tr '\n' ' ')
  if [[ -z "${got6// /}" ]]; then
    echo "  OK    $host AAAA -> (none)"
  elif [[ "$got6" == *"$MY_IP6"* ]]; then
    echo "  OK    $host AAAA -> $got6"
  else
    echo "  WRONG $host AAAA -> $got6   (not this server)"
    fail=1
  fi
done
if [[ $fail -eq 1 ]]; then
  cat <<'MSG'

STOPPING. The domain does not point at this server yet.

  - If you have not moved the DNS records, do that first.
  - If you HAVE moved them but they show Cloudflare IPs (104.x / 172.67.x,
    or 2606:4700::/32), the records are PROXIED. Set them to DNS-only
    (grey cloud) for now; certbot cannot complete the HTTP challenge
    through the proxy.
  - If an AAAA is listed as WRONG, DELETE that record. Let's Encrypt prefers
    IPv6, so a stale AAAA sends the challenge to the old server and the
    certificate fails. Once the names are proxied again, Cloudflare serves
    its own IPv6 to visitors, so deleting it costs nothing. The original
    values are in docs/dns/pplsolutionsinc.com-zone-export-2026-07-31.txt.
  - DNS may also just need a minute to propagate.

Nothing has been changed.
MSG
  exit 1
fi

# --- 2. Certificate --------------------------------------------------------
say "Expanding the TLS certificate to cover the real domain"
certbot certonly --webroot -w /var/www/html \
  --cert-name "$CERT_NAME" \
  -d w2.pplsolutionsinc.com \
  -d pplsolutionsinc.com \
  -d www.pplsolutionsinc.com \
  --expand --non-interactive --agree-tos
nginx -t && systemctl reload nginx
echo "  certificate now covers:"
openssl x509 -in "/etc/letsencrypt/live/$CERT_NAME/fullchain.pem" -noout -text \
  | grep -A1 "Subject Alternative Name" | tail -1

# --- 3. Environment --------------------------------------------------------
say "Switching the app to the real hostname and removing the password gate"
ENV_BACKUP="$ENV_FILE.bak-$(date +%Y%m%d-%H%M%S)"
cp "$ENV_FILE" "$ENV_BACKUP"
sed -i "s|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=$SITE_URL|" "$ENV_FILE"
sed -i '/^STAGING_PASSWORD=/d; /^STAGING_USER=/d' "$ENV_FILE"

# The env file is mode 600 and owned by the app user. Editing it as root can
# leave it root-owned, and then the build below - which runs as $APP_USER -
# reads NO environment at all and silently ships a broken bundle.
if [[ $EUID -eq 0 ]]; then
  chown "$APP_USER:$APP_USER" "$ENV_FILE" "$ENV_BACKUP"
  chmod 600 "$ENV_FILE"
fi
if ! run_as_app "test -r $ENV_FILE"; then
  echo "STOPPING: $APP_USER cannot read $ENV_FILE. Restore from $ENV_BACKUP." >&2
  exit 1
fi

echo "  resulting keys (values hidden):"
sed -E 's/=.*/=<set>/' "$ENV_FILE" | sed 's/^/    /'

# --- 4. Rebuild ------------------------------------------------------------
# NEXT_PUBLIC_* is inlined at build time, so this MUST be a rebuild,
# not merely a pm2 restart.
say "Rebuilding as $APP_USER (required - NEXT_PUBLIC_* is baked in at build time)"
run_as_app "cd $APP_DIR && npm run build"
run_as_app "pm2 reload ppl --update-env && pm2 save --force"

# --- 5. Verify -------------------------------------------------------------
say "Verifying"
sleep 5
echo "  home:      $(curl -s -o /dev/null -w '%{http_code}' https://www.pplsolutionsinc.com/)   (expect 200, NOT 401)"
echo "  apex:      $(curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}' https://pplsolutionsinc.com/)"
echo "  robots:    $(curl -s https://www.pplsolutionsinc.com/robots.txt | head -2 | tr '\n' ' ')"
echo "  noindex:   $(curl -sI https://www.pplsolutionsinc.com/ | grep -ci x-robots-tag) (expect 0)"
echo "  sitemap:   $(curl -s https://www.pplsolutionsinc.com/sitemap.xml | grep -o 'https://[a-z0-9.]*' | sort -u | head -1)"

cat <<'MSG'

Done. Remaining manual steps:
  1. Turn the Cloudflare proxy ON (orange cloud) for @ and www, and set
     SSL/TLS mode to Full (strict). The proxy is what supplies cf-ipcountry,
     which the analytics reads.
  2. Re-run the checks above afterwards - going through the proxy can change
     the answers.
  3. Work through PRE-LAUNCH-CHECKLIST.md section 10.
  4. Leave the WordPress hosting running for a few days.
MSG
