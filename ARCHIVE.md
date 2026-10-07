# Archive

A running log of changes made to this project and the reasoning behind them.
Read this file before planning any new work; append one paragraph per change when you finish.

## 2026-09-22 — API bootstrap: stable APP_KEY, fail closed
The API container exited on boot because `.env` is excluded from the image while the mounted `backend/.env` has an empty `APP_KEY`, and a `vendor` volume hid the local Composer install with a production tree that could not load the app. `APP_KEY` and `DB_*` now come from the Infra environment at runtime and stay out of the image; the entrypoint never prints the key, refuses to generate one in production so Sanctum sessions survive deploys, waits for MySQL under `set -euo pipefail`, and php-fpm keeps that environment so encrypted cookies use the injected key.

## 2026-09-23 — Boot installs missing Composer and npm dependencies
`docker compose up -d` assumed `backend/vendor` and a populated frontend `node_modules` volume already existed, but the API bind mount hides the vendor tree baked into the image and an empty node volume has nothing to serve. Boot now installs Composer dependencies only when `vendor/autoload.php` is missing (dev dependencies for local/development/testing, `--no-dev` otherwise) and npm dependencies only when Vite cannot load, then leaves an existing install untouched — still no vendor volume, because that previously replaced a local Composer install with the image's production tree.

## 2026-09-30 — Frontend env injection, IPv4 origins, ignore files
Vite never saw infra-root `VITE_API_URL`, README still told people to register Sanctum on web routes, and Windows bind mounts plus `localhost`→`::1` were the usual hot-reload and ~30s delay traps; Compose now injects `VITE_API_URL` and `CHOKIDAR_USEPOLLING` into `frontend`, local origins prefer `127.0.0.1` (infra + frontend + backend Sanctum/CORS lists), docs match the Sanctum provider route, ignore rules live under each build context, and the useless root `.dockerignore` was removed — stack verify was blocked because Docker Desktop failed to stay up after images built.

## 2026-09-30 — Nginx: localhost redirects to 127.0.0.1
Opening the stack as `http://localhost` left the browser on a different origin than `VITE_API_URL=http://127.0.0.1` and still paid Windows’ `localhost`→`::1` cost, so Nginx now `301`s `Host: localhost` to `http://127.0.0.1$request_uri` and serves the app only on the IPv4 server block; the auth `/api/user` gate that still delays the login paint was left alone for a later fix.

## 2026-09-30 — Vite HMR through Nginx, not host :5173
After auth the Vite client was still advertising `directSocketHost=localhost:5173`, so the HMR WebSocket bypassed Nginx through Docker Desktop/WSL and produced failed upgrades/405s; HMR is now forced to `ws://127.0.0.1:80` when Compose sets `CHOKIDAR_USEPOLLING`, Nginx uses a proper `Connection` upgrade map, and the frontend service only `expose`s 5173 instead of publishing it on the host.

## 2026-09-30 — API boot seeds the ruleset catalog
A fresh Compose database migrated but left rulesets empty, so authenticated `GET /api/rulesets/current/character-creation-options` 404'd on `firstOrFail`; `backend/entrypoint.sh` now runs `db:seed --force` after migrate, relying on the catalog's `SeedsOnce` helpers so every boot stays idempotent.

## 2026-09-30 — Nginx fastcgi_cache for ruleset catalog
Character-creation catalog GETs were hitting MySQL on every navigation; Nginx now `fastcgi_cache`s that exact path with a shared cookie-agnostic key (Sanctum still enforced on miss), stores files on a `nginx-cache` volume shared with the API, and the API entrypoint purges that volume after migrate/seed so catalog updates are not served stale.

## 2026-09-30 — Bootstrap must exec bind-mounted entrypoint
Catalog 404s persisted after adding `db:seed` because `docker/api/bootstrap.sh` still `exec`'d the image's `/entrypoint.sh`, so the mounted `backend/entrypoint.sh` (seed + cache purge) never ran; bootstrap now starts `/var/www/html/entrypoint.sh` instead.

## 2026-09-30 — From-scratch smoke assert script
Needed a repeatable proof that Compose boots clean after volume wipe; added `scripts/assert-stack.ps1` plus `make smoke` / `make smoke-from-scratch` to wait for healthy services, confirm ruleset seeding, Sanctum/CSRF, catalog Nginx cache HIT, and frontend `VITE_API_URL` injection (PowerShell/`curl` quirks around `$args`, `-D -`, and JSON `--data` were fixed inside the script). Session debug NDJSON logging was removed after verification; the script remains as a plain reusable smoke assert.

## 2026-09-30 — make up-dev ensures .env files
Dev onboarding still required a manual `.env` copy; added `scripts/ensure-env.ps1` / `.sh` (infra from `.env.development`, frontend/backend from `.env.example`, never overwrite) and `make up-dev` / `make ensure-env` so one command prepares env then runs the same `docker compose up -d` as `make up`. The Makefile recipe must call PowerShell directly: Windows `make` uses `cmd.exe`, so a bash-style `command -v` check failed with `-v was unexpected at this time`.

## 2026-10-02 — Header create uses SPA navigate
The header “Créer un personnage” still felt slow (~1.5s) after Nginx cached the catalog because it was a hard `<a href>` that rebooted the SPA and waited on `/api/user` before `CreationOptionsProvider` could fetch; `Navbar.jsx` now uses the same `navigate()` path as Accueil and the empty character card (and the creation mobile brand likewise goes home via `navigate('/')`).

## 2026-10-07 — Creation catalog load keeps page chrome
Catalog fetch still gated step routes, but the provider early-returned a bare `creation-options-status` box on a blank canvas; it now mounts a static `CreationCatalogShell` (background, navbars, step strip without options-dependent steps) and overlays the shared `StatusBox` with “Chargement des éléments de création...” (error + Réessayer use the same shell), matching Home/sheet loading instead of a white screen.

## 2026-10-07 — Nginx image from config snippets
Catalog cache made loading screens hard to see and a single bind-mounted `default.conf` was awkward to toggle; `web-server` now builds from `docker/nginx` (`conf.d/` + `snippets/`), with `NGINX_CATALOG_CACHE` selecting the cached vs passthrough catalog location at image build time instead of using stock `nginx:latest` plus a host mount.
