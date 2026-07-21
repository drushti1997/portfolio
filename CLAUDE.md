# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current State

This repository is **not yet scaffolded** — it contains no application code, no `package.json`, and is not currently a git repository. The only content is `.claude/PORTFOLIO_GUIDE.md`, a step-by-step build/deploy guide the user is following to stand up a personal portfolio site from scratch.

When the user asks to start building, follow the architecture and conventions documented in that guide rather than inventing a different structure. Key points from it are summarized below so you don't need to re-read the full guide every session.

## Intended Architecture (per PORTFOLIO_GUIDE.md)

A monorepo with these top-level services, orchestrated via `docker-compose.yml`:

```
client/     → React + Vite + Tailwind frontend
server/     → Node.js + Express backend API
api/        → Python FastAPI (optional, specialized features)
scraper/    → Python Celery (optional, background tasks)
database/   → SQL schema (database/schema.sql), loaded into Postgres on container init
```

Request flow: Cloudflare (DNS/CDN) → Vultr VPS → Nginx (in the `client` container) → routes `/api` to the `server` container (port 5000) and everything else to the built React app (`try_files ... /index.html`).

- Frontend and backend are separate Docker images; `client/Dockerfile` multi-stage builds the Vite app then serves it via `nginx:alpine`, with `client/nginx.conf` doing the `/api` reverse-proxy to `server:5000`.
- `server/Dockerfile` runs plain `node server.js` against `server/package.json`.
- Postgres data persists in a named volume (`pg_data`); schema is seeded from `database/schema.sql` via the Postgres image's `docker-entrypoint-initdb.d` mechanism.
- Secrets (`POSTGRES_PASSWORD`, `JWT_SECRET`, any API keys) are supplied via a root `.env` file locally, and via GitHub Actions repo secrets in CI — never committed. `.env.example` documents required keys without real values.

## Deployment Model

- Pushing to the `prod` branch (not `main`) triggers `.github/workflows/deploy.yaml`, which:
  1. `scp`s the full repo to `/opt/portfolio` on the Vultr VPS.
  2. Writes a fresh `.env` on the VPS from GitHub Actions secrets.
  3. Runs `docker-compose down || true && docker-compose up -d --build` on the VPS over SSH.
- Deploy auth uses a dedicated SSH keypair (`~/.ssh/vultr_deploy`) whose public key is installed in the VPS's `/root/.ssh/authorized_keys`; the private key lives only in the `VPS_SSH_KEY` GitHub secret.
- Cloudflare sits in front as DNS + CDN with an A record (proxied) pointing at the VPS's IPv4 address, SSL/TLS mode "Full" (or "Full (strict)").

## Expected Commands (once scaffolded)

```bash
npm run dev            # local dev with hot reload
npm run docker:up      # start full stack via docker-compose
npm run docker:down    # stop full stack

# on the VPS
docker ps
docker-compose logs -f
docker-compose down && docker-compose up -d --build
```

These are defined by root-level `package.json` scripts described in the guide — verify they exist once the repo is scaffolded, since they aren't present yet.
