---
description: Local Docker stack — Compose services, Nginx proxy, Sail, clones
globs: docker-compose.yml,docker/**,Makefile,clone-*.ps1,.env.example,.env.development
alwaysApply: false
---

# Local stack (Compose + Nginx)

## Layout

- **`docker-compose.yml`**: `frontend` (Vite), `web-server` (Nginx),
  `laravel.test` (Laravel Sail PHP), `mysql`, `mailpit` on network `sail`.
- **`docker/nginx/default.conf`**: `/` → `http://frontend:5173` (WebSocket
  upgrade headers for Vite HMR); `/api` → `http://laravel.test`.
- **`docker/frontend/Dockerfile`**: Node image, `npm i`, `npm run dev -- --host`.
- **Clones**: `backend/` ← Sheet-Happens-Api, `frontend/` ← Sheet-Happens-Frontend
  via `make clone-http` / `clone-ssh` or `clone-*.ps1`. Never commit those dirs.

## Env

- Copy `.env.development` → `.env` before `make up`. Compose/Sail read DB and
  related vars from `.env` (see `.env.example` for the Laravel-oriented template).

## Make targets

- `make composer-install` runs Composer inside `laravelsail/php84-composer`
  against `./backend`.
- `make migrate-fresh-seed` uses `./backend/vendor/bin/sail artisan …`.
- Prefer extending the Makefile / Compose files over one-off undocumented
  docker commands in docs.

## Proxy contract

- Browser entrypoint for the joined stack is Nginx on port **80**.
- Keep `/` and `/api` routing consistent with the Frontend `VITE_API_URL` /
  Sanctum expectations used by the cloned apps. Do not invent alternate public
  paths without updating both nginx config and app docs.
