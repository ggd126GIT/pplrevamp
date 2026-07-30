# VPS Deployment Runbook

**Target:** Hostinger KVM 1 — `srv1799389.hstgr.cloud` / `187.127.121.54` (IPv6 `2a02:4780:5e:efd9::1`)
**Spec:** Ubuntu 26.04 · 1 vCPU · 4 GB RAM · 50 GB disk · 4 TB bandwidth · Kuala Lumpur
**Stack:** Nginx → PM2 → `next start` :3000 → Supabase (existing project, unchanged)
**Companion doc:** `PRE-LAUNCH-CHECKLIST.md` — that file is *what must be true* at cutover; this file is *how to get there*.

---

## The key insight: Cloudflare is not a blocker for most of this

`srv1799389.hstgr.cloud` is a real hostname that already resolves to this VPS. So Phases A–C below
deploy the complete production site, with valid SSL and live Supabase, reachable at
`https://srv1799389.hstgr.cloud` — with **zero Cloudflare access required**.

Only Phase D (Resend email records) and Phase E (pointing the real domain) need the Cloudflare zone.
Do A–C now; do D and E whenever dashboard access is sorted.

Throughout A–C, keep `STAGING_PASSWORD` **set**, so the box stays password-gated and `noindex` while
you test. WordPress on the real domain is untouched the entire time.

---

## Phase 0 — Two things to verify first

**a) Node availability on Ubuntu 26.04.** This is a very new release and NodeSource's repo may not
carry it yet. Check what Ubuntu itself offers before adding third-party repos:

```bash
apt-cache policy nodejs
```

Next.js 16 needs Node `^20.9.0 || >=22`. **Do not use Node 20** — it went end-of-life in April 2026,
so the `Node 20` in `CLAUDE.md` is stale. Prefer 22 LTS or 24. If Ubuntu's own package is 22+, use it
and skip NodeSource entirely (§A3 has fallbacks).

**b) What is already serving on ports 80/443.** Both answer right now:

```bash
ss -tlnp | grep -E ':80|:443'
```

Likely Hostinger's default landing page or a preinstalled panel. Identify it and stop/disable it
before installing Nginx, or the two will fight over the ports.

---

## Phase A — Server preparation

### A1. Non-root user and key-based access

**A non-root user already exists: `gilbertd`** (this is the account behind the `sftp://187.127.121.54`
access — SFTP is not a separate service, it is the file-transfer side of SSH on port 22). Use it as the
deploy user; there is no need to create another. Confirm it has sudo:

```bash
ssh gilbertd@187.127.121.54
sudo -v          # if this fails, add it from root: usermod -aG sudo gilbertd
```

**Switch to key authentication before hardening.** From the Windows workstation:

```powershell
ssh-keygen -t ed25519 -C "gilbert-ppl-vps"
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh gilbertd@187.127.121.54 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
ssh gilbertd@187.127.121.54 "whoami"      # must not prompt for a password
```

> **Rotate the `gilbertd` password.** The original was a keyboard-walk pattern
> (`P@$$w0rd!...`) and was transmitted in plaintext. SSH on a public IPv4 is
> continuously brute-forced by automated scanners, so a guessable password on port 22 is a live
> exposure, not a theoretical one. Rotate it *after* key auth is confirmed working, so you always
> retain one working route in.

Only once the key works without prompting, harden:

```bash
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

> Disabling password auth means your SSH key is now the only way in. Hostinger's hPanel browser
> console is the recovery path if you lose it — verify that console works *before* you rely on it.

### A2. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Port 80 must stay open — Let's Encrypt's HTTP-01 challenge uses it, and it serves the HTTPS redirect.

### A3. Node 22 LTS + PM2

If Ubuntu's own `nodejs` is 22+, just `sudo apt install -y nodejs npm`. Otherwise, in order of
preference:

```bash
# Option 1 — NodeSource (may 404 on 26.04; if so, fall through)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Option 2 — nvm, per-user, always works
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc && nvm install 22 && nvm alias default 22
```

If you use nvm, PM2 must be installed under the same shell, and `pm2 startup` will print a command
containing the nvm path — run exactly what it prints.

```bash
node -v && npm -v      # expect v22.x
sudo npm install -g pm2
```

### A4. Swap — do not skip this

**1 vCPU / 4 GB is the tight configuration.** 4 GB usually survives `next build`, but this project
has ~30 routes, GSAP, Tiptap and Satori OG generation, and a single core means the build takes
several minutes with no headroom. 2 GB of swap turns a hard OOM kill into merely slow:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

**Fallback if the build still fails or is intolerably slow:** build on your Windows machine and rsync
the artefacts up (`.next/`, `public/`, `package.json`, `package-lock.json`, `node_modules/`). Slightly
awkward but entirely valid, and it keeps the 1 vCPU box doing nothing but serving.

---

## Phase B — Application and Supabase

### B1. Deploy key for the private repo

The repo is private, so the VPS needs its own read-only key:

```bash
ssh-keygen -t ed25519 -C "ppl-vps-deploy" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Paste that public key into GitHub → the `pplrevamp` repo → **Settings → Deploy keys → Add deploy key**.
Leave "Allow write access" **unchecked**. A deploy key is scoped to this one repo, unlike a personal
access token.

```bash
sudo mkdir -p /var/www && sudo chown gilbertd:gilbertd /var/www
git clone git@github.com:ggd126GIT/pplrevamp.git /var/www/ppl
cd /var/www/ppl
```

### B2. Supabase — the "add the database" step

**There is nothing to create.** Supabase project `ebnjvbppgcifxrcqozhj` is already your live
database: 7 tables with RLS, 3 SQL functions, the `blog-images` and `cvs` storage buckets, and the
three real staff accounts. Staging has been running against it for weeks. Production connects to the
same project — it is a hosted service, so "deploying to the VPS" changes nothing about it.

Wiring it up is entirely a matter of environment variables. Create `/var/www/ppl/.env.production`,
copying the **values** from your local `.env.local`:

```bash
nano /var/www/ppl/.env.production
```

```ini
# --- Supabase (copy values verbatim from local .env.local) ---
NEXT_PUBLIC_SUPABASE_URL=https://ebnjvbppgcifxrcqozhj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<sb_secret_... — server only, never NEXT_PUBLIC>

# --- Email ---
RESEND_API_KEY=<key>
# Leave RESEND_FROM / CONTACT_NOTIFY_EMAIL / JOBS_NOTIFY_EMAIL UNSET until Phase D.
# Setting them before the domain verifies makes Resend reject the send and the
# notification is lost silently (settleSends logs, never throws).

# --- Site ---
# Phase C value (testing on the Hostinger hostname):
NEXT_PUBLIC_SITE_URL=https://srv1799389.hstgr.cloud
# Phase E value (at cutover): https://www.pplsolutionsinc.com   — no trailing slash

# --- Keep the gate ON until go-live ---
STAGING_USER=ppl
STAGING_PASSWORD=<pick a fresh one>
```

```bash
chmod 600 /var/www/ppl/.env.production
```

Two traps, both previously bitten on Vercel:

- **`NEXT_PUBLIC_*` are inlined at build time.** This file must exist and be correct *before*
  `npm run build`. Changing one later requires a full rebuild, not just a PM2 restart.
- **Confirm `.env.production` is gitignored** before you ever commit from the server. Next's default
  ignore covers `.env*.local` — which does **not** match `.env.production`. Check
  `git check-ignore -v .env.production` returns a match; if it doesn't, add it.

### B3. Build

```bash
cd /var/www/ppl
npm ci
npm run build
```

Expect several minutes on 1 vCPU. `sharp` comes in via the lockfile and is what powers `next/image`
optimisation at runtime — if image routes 500 later, verify it installed for the right platform
(`node -e "require('sharp')"`).

> Housekeeping: `scripts/optimize-images.mjs` imports `sharp` but it is not declared in
> `package.json`. It only works today because something else pulls it in transitively. It doesn't
> affect deploys (`public/` is committed), but it should be added to `devDependencies`.

### B4. PM2

```bash
pm2 start npm --name ppl -- start
pm2 save
pm2 startup systemd -u gilbertd --hp /home/gilbertd
# then run the exact command pm2 prints, with sudo

pm2 status
curl -I http://localhost:3000    # expect 401 while STAGING_PASSWORD is set — that's the gate working
```

Keep it at a single instance. On 1 vCPU, cluster mode adds contention rather than throughput.

---

## Phase C — Nginx, SSL, and a full test on the Hostinger hostname

### C1. Nginx

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/ppl
```

```nginx
# Restore the visitor's real IP when Cloudflare proxies (Phase E onward).
# Harmless before then. Refresh from https://www.cloudflare.com/ips/ periodically.
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;
real_ip_header CF-Connecting-IP;

server {
    listen 80;
    listen [::]:80;
    server_name srv1799389.hstgr.cloud pplsolutionsinc.com www.pplsolutionsinc.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name srv1799389.hstgr.cloud pplsolutionsinc.com www.pplsolutionsinc.com;

    # Certbot fills these in (C2).

    client_max_body_size 4M;   # CV uploads are capped at 2 MB in-app; leave headroom

    gzip on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_types text/plain text/css application/javascript application/json
               image/svg+xml application/xml font/woff2;

    # Immutable, content-hashed build output — cache hard, bypass the Node process.
    location /_next/static/ {
        alias /var/www/ppl/.next/static/;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        'upgrade';
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ppl /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### C2. SSL for the Hostinger hostname

Because `srv1799389.hstgr.cloud` is not behind Cloudflare, plain Certbot works immediately:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d srv1799389.hstgr.cloud
sudo systemctl status certbot.timer     # auto-renewal
```

**Do not** pass `-d pplsolutionsinc.com` yet — that domain still points at Cloudflare/WordPress and
the challenge would fail. It gets added in Phase E.

### C3. Full end-to-end test

Visit `https://srv1799389.hstgr.cloud`, authenticate through the staging gate, and verify against
`PRE-LAUNCH-CHECKLIST.md` §10 — but on this hostname instead of the real domain:

- [ ] All pages render; GSAP animations run; reduced-motion and mobile behave
- [ ] Staff login works; `/admin/*` redirects when unauthenticated
- [ ] Contact form → row lands in `inquiries` (email will not deliver yet — expected, Phase D)
- [ ] Job application → CV uploads to the `cvs` bucket (proves `SUPABASE_SERVICE_ROLE_KEY` is right)
- [ ] `/api/track` returns 204 and rows land in `page_views`
- [ ] `/admin/analytics` renders; `/admin` "Where form notifications go" panel reads correctly
- [ ] Old WordPress redirects resolve (`/about-us` → `/about`, `/faq` → `/resources/faq`, …)
- [ ] Custom 404

At this point the site is fully proven on the VPS and only email + domain remain.

### C4. Deploy script

`/var/www/ppl/deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /var/www/ppl
git pull --ff-only origin master
npm ci
npm run build
pm2 reload ppl --update-env
pm2 save
echo "deployed: $(git rev-parse --short HEAD)"
```

```bash
chmod +x /var/www/ppl/deploy.sh
```

From now on a release is `ssh gilbertd@187.127.121.54 '/var/www/ppl/deploy.sh'`. Note this replaces
Vercel's automatic build-on-push — pushing to `master` no longer deploys anything by itself.

> `pm2 reload` is not zero-downtime on a single instance, and the rebuild happens in place, so the
> live site is briefly serving a half-written `.next`. At this traffic level that is acceptable. If
> it stops being acceptable, switch to building into a timestamped directory and flipping a symlink.

---

## Phase D — Resend email (needs Cloudflare)

Add the three records recorded verbatim in `PRE-LAUNCH-CHECKLIST.md` §2 — all under `send.`, none
touching the Microsoft 365 root MX/SPF — as **DNS-only (grey cloud)**. Cloudflare's Name field is
relative to the zone, so enter it exactly as written, without the domain suffix.

Verify in Resend (`not_started` → `pending` → `verified`), then and only then add to
`.env.production` and rebuild:

```ini
RESEND_FROM=".ppl Solutions <noreply@send.pplsolutionsinc.com>"
CONTACT_NOTIFY_EMAIL=sales@pplsolutionsinc.com
JOBS_NOTIFY_EMAIL=careers@pplsolutionsinc.com
```

This phase is fully independent of the VPS — it can be done before, during or after Phases A–C.

---

## Phase E — Domain cutover (needs Cloudflare)

Only once Phase C passes and you are ready to retire WordPress.

1. **Record the rollback target.** Note the current `@` and `www` record values in Cloudflare
   *before* editing — that is the WordPress origin and your one-click way back.
2. **Lower TTL** on `@` and `www` to 60s a few hours ahead.
3. **Pre-flight the app:** run the `PRE-LAUNCH-CHECKLIST.md` §8 cleanup SQL (staging-tagged
   inquiries, page_views, events; test applications and their orphaned CVs; junk posts and jobs),
   rotate the `admin12345` password, then set `NEXT_PUBLIC_SITE_URL=https://www.pplsolutionsinc.com`,
   **remove `STAGING_PASSWORD`**, and `./deploy.sh`.
4. **Set SSL/TLS mode to Full (strict)** in Cloudflare *before* repointing. If it is currently
   "Flexible", leaving it there once traffic reaches an HTTPS origin produces a redirect loop.
5. **Repoint** `@` and `www` to `187.127.121.54`, proxy **on** (orange cloud) — that is what supplies
   `cf-ipcountry`, which `geoFromHeaders()` already reads, so country analytics keeps working. City
   and region go null on the free tier; accepted.
6. **Extend the certificate:** `sudo certbot --nginx -d srv1799389.hstgr.cloud -d pplsolutionsinc.com -d www.pplsolutionsinc.com`
   (works once DNS resolves to the VPS).
7. **Verify** the full `PRE-LAUNCH-CHECKLIST.md` §10 list against the real domain — especially that
   `robots.txt` no longer says `Disallow: /`, that the `x-robots-tag: noindex` header is gone, and
   that `sitemap.xml` and canonical tags use the real domain.
8. **Keep WordPress running** for at least a few days. Rollback is one DNS edit.

---

## Appendix — externally discoverable DNS inventory (captured 2026-07-30)

Queried from outside via 1.1.1.1. **This is not a complete zone dump** — DNS has no enumeration, so
only record names that were guessed appear here. Treat it as a safety net, never as an authoritative
export.

| Name | Type | Value |
|---|---|---|
| `@` | A | `104.21.62.148`, `172.67.136.180` — **Cloudflare proxy, not the origin** |
| `www` | A | `104.21.62.148`, `172.67.136.180` — same |
| `@` | MX | `pplsolutionsinc-com.mail.protection.outlook.com` (pri 0) |
| `@` | TXT | `v=spf1 include:spf.protection.outlook.com -all` |
| `@` | TXT | `MS=ms32013859` (Microsoft 365 domain verification) |
| `@` | TXT | `google-site-verification=IZIejwU-Z4dVceiC4xRBlYcUmoSJXWz6lmWm7KHURJk` |
| `@` | TXT | `ahrefs-site-verification_d0630dda…` |
| `_dmarc` | TXT | `v=DMARC1; p=none;` |
| `autodiscover` | CNAME | `autodiscover.outlook.com` |
| `lyncdiscover` | CNAME | `webdir.online.lync.com` |
| `sip` | CNAME | `sipdir.online.lync.com` |
| `enterpriseregistration` | CNAME | `enterpriseregistration.windows.net` |
| `enterpriseenrollment` | CNAME | `enterpriseenrollment-s.manage.microsoft.com` |
| `send.*` | — | **nothing exists** — clean slate for Resend, as expected |
| `selector1/2._domainkey` | — | not published (M365 DKIM signing appears not to be enabled) |

**Three consequences that matter:**

1. **The WordPress origin IP is not externally discoverable.** `@` and `www` resolve to Cloudflare's
   proxy, which is the point of the orange cloud. The rollback target therefore exists *only* inside
   the Cloudflare dashboard — record it there before editing anything (Phase E step 1). Without it,
   a failed cutover has no fast way back.
2. **The zone carries live Microsoft 365 mail plus Intune/Entra device management.** Root MX, SPF,
   `autodiscover`, `enterpriseregistration` and `enterpriseenrollment` are all load-bearing for the
   client's email and device enrolment. Breaking any of them is a company-wide outage, not a website
   problem. This is why Phase D confines every new record to `send.`.
3. **DMARC is `p=none`** — monitoring only, no enforcement. A Resend subdomain will not be rejected
   on alignment grounds. It also means nothing currently protects the domain from spoofing; worth
   raising with the client separately, but out of scope for launch.

---

## Known trade-offs of this target

- **1 vCPU** — builds are slow and happen on the live box. Mitigated by swap; escapable by building
  locally and rsyncing.
- **City/region geolocation is lost.** Vercel's edge headers gave city-level data; Cloudflare's free
  tier gives country only. Restoring city needs an Nginx MaxMind GeoIP module. Nothing in the UI
  displays city today, so this is cosmetic.
- **No preview deployments.** Vercel gave a URL per push; the VPS has one environment. Local
  `npm run dev` becomes the review surface.
- **You now own patching.** `sudo apt update && sudo apt upgrade` and Node security releases are your
  responsibility. Hostinger's weekly backups are on; confirm they cover `/var/www` and that you have
  actually tested a restore.
