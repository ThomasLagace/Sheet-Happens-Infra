---
description: Local Docker stack — Compose services, Nginx proxy, clones
paths:
  - "docker-compose.yml"
  - "docker/**"
  - "Makefile"
  - "clone-*.ps1"
  - ".env.example"
  - ".env.development"
---

# Local stack (Compose + Nginx)

## Layout

- **`docker-compose.yml`**: `frontend` (Vite), `web-server` (Nginx),
  `api` (Laravel, php-fpm), `mysql`, `mailpit`, `phpmyadmin` on network `sail`.
- **`docker/nginx/default.conf`**: `/` → `http://frontend:5173` (WebSocket
  upgrade headers for Vite HMR); `/api` and `/sanctum` → `api` (FastCGI).
- **`docker/frontend/`**: Node image and `entrypoint.sh` (`npm ci` only when
  Vite cannot load). **`docker/api/`**: PHP image and `bootstrap.sh`
  (`composer install` only when `vendor/autoload.php` is missing).
- **Clones**: `backend/` ← Sheet-Happens-Api, `frontend/` ← Sheet-Happens-Frontend
  via `make clone-http` / `clone-ssh` or `clone-*.ps1`. Never commit those dirs.

## Env

- `make up-dev` creates missing `.env` files (infra, `frontend/`, `backend/`)
  then starts the stack; or copy `.env.development` → `.env` before `make up`.
  Compose reads DB and related vars from `.env`.

## Make targets

- Composer and npm dependencies are installed on first boot by the
  containers; there is no `make composer-install`.
- `make migrate-fresh-seed` runs `php artisan migrate:fresh --seed --force`
  in the `api` service; `make php <cmd>` runs any `php` command there.
- `make smoke` / `make smoke-from-scratch` run `scripts/assert-stack.ps1`.
- Prefer extending the Makefile / Compose files over one-off undocumented
  docker commands in docs.

## Proxy contract

- Browser entrypoint for the joined stack is Nginx on port **80**.
- Keep `/` and `/api` routing consistent with the Frontend `VITE_API_URL` /
  Sanctum expectations used by the cloned apps. Do not invent alternate public
  paths without updating both nginx config and app docs.
