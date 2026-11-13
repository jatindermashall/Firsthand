# Deploying firsthand.decyb.com

## How it runs
- Hostinger VPS `srv2070339` (148.230.66.211), Docker Manager project **firsthand**, compose file `deploy/compose.vps.yaml`.
- Containers: `mysql` (MySQL 8.4, volume `mysql`), `api` (port 4000, internal only), `web` (published on `127.0.0.1:13015`).
- The shared Caddy proxy (`/srv/proxy`) terminates HTTPS and forwards `firsthand.decyb.com` → `127.0.0.1:13015`.
- Secrets (`DB_PASSWORD`, `DB_ROOT_PASSWORD`, `ADMIN_ACCESS_KEY`, optional `SMTP_URL`) live only in the Docker Manager project's environment.

## One-time setup (needs DNS and host access)
1. **DNS (Cloudflare, decyb.com zone):** add `A firsthand → 148.230.66.211` (and optionally `AAAA firsthand → 2a02:4780:63:c1a7::1`). DNS only (grey cloud) so Caddy can issue the certificate, or proxied with SSL mode Full (strict) once the certificate exists.
2. **Caddy:** copy `deploy/firsthand.caddy` to `/srv/proxy/sites/firsthand.caddy`, then reload:
   `docker exec hosting-proxy-caddy-1 caddy reload --config /etc/caddy/Caddyfile`
   (if the main Caddyfile doesn't import `sites/*`, paste the block into it instead).

## Releasing a change
1. Merge to `main` on GitHub.
2. Hostinger hPanel → VPS → Docker Manager → **firsthand** → redeploy/rebuild (or ask Claude to recreate the project). Images rebuild from `main`; the database and uploads volumes are kept.
3. Check https://firsthand.decyb.com and `docker logs firsthand-api-1`.

## Going from preview to real use
- Set `SMTP_URL` (e.g. a Hostinger mailbox: `smtps://user:password@smtp.hostinger.com:465`) — sign-in codes are then emailed and the on-screen preview code switches off.
- Set `SEED_DEMO=false` and start from an empty database before onboarding real businesses (sample data only loads into an empty database).
- Publish the legal documents listed on `/legal`.
