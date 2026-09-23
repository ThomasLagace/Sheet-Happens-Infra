# Archive

A running log of changes made to this project and the reasoning behind them.
Read this file before planning any new work; append one paragraph per change when you finish.

## 2026-09-22 — API bootstrap: stable APP_KEY, fail closed
The API container exited on boot because `.env` is excluded from the image while the mounted `backend/.env` has an empty `APP_KEY`, and a `vendor` volume hid the local Composer install with a production tree that could not load the app. `APP_KEY` and `DB_*` now come from the Infra environment at runtime and stay out of the image; the entrypoint never prints the key, refuses to generate one in production so Sanctum sessions survive deploys, waits for MySQL under `set -euo pipefail`, and php-fpm keeps that environment so encrypted cookies use the injected key.

## 2026-09-23 — Boot installs missing Composer and npm dependencies
`docker compose up -d` assumed `backend/vendor` and a populated frontend `node_modules` volume already existed, but the API bind mount hides the vendor tree baked into the image and an empty node volume has nothing to serve. Boot now installs Composer dependencies only when `vendor/autoload.php` is missing (dev dependencies for local/development/testing, `--no-dev` otherwise) and npm dependencies only when Vite cannot load, then leaves an existing install untouched — still no vendor volume, because that previously replaced a local Composer install with the image's production tree.
