# AGENTS.md

Sheet Happens Infra orchestre le frontend (React/Vite) et le backend
(API Laravel) sur un même réseau Docker Compose, avec Nginx en reverse
proxy. Les dépôts applicatifs sont clonés dans `frontend/` et `backend/`
(hors versionnage de ce dépôt) ; ce dépôt ne contient que l’infra locale.

## Commandes

```bash
cp .env.development .env       # variables Compose (si .env absent) ; ou make ensure-env
./clone-http.ps1               # Windows : clone Api → backend, Frontend → frontend
# ou : make clone-http / make clone-ssh
make up-dev                    # crée les .env manquants puis docker compose up -d
make up                        # docker compose up -d
make build                     # docker-compose up --build
make down                      # docker compose down
make migrate-fresh-seed        # migrate:fresh --seed dans le service api
make smoke                     # assertions sur la stack démarrée (scripts/assert-stack.ps1)
make smoke-from-scratch        # down -v, rebuild, puis mêmes assertions
make php <commande>            # php <commande> dans le service api
```

Ce dépôt **n’a pas** de suite `npm run test` / `lint` / `format` de
produit : la validation locale passe par Compose (`make up` / `make build`).

Après toute addition ou modification de règles/skills sous `agent/`,
mettre à jour leurs copies dans `.cursor/` et `.claude/`. Avant de
considérer une tâche d’infra terminée, vérifier que la stack démarre (`make up`) sans erreur évidente sur les
services touchés.

## Langue

La documentation et les issues sont rédigées en **français**. Le code
(identifiants dans Makefile, Compose, scripts, commentaires dans le code)
et les commits sont écrit en **anglais**.

## Où trouver les choses

- `docker-compose.yml` — services `frontend`, `web-server` (Nginx), `api`
  (Laravel, php-fpm), `mysql`, `mailpit`, `phpmyadmin` ; réseau `sail`.
- `docker/nginx/default.conf` — reverse proxy : `/` → Vite
  (`frontend:5173`), `/api` et `/sanctum` → service `api` (FastCGI).
- `docker/frontend/` — image Node du serveur de dev Vite et
  `entrypoint.sh` (installe npm si Vite est introuvable).
- `docker/api/` — image PHP de l’API et `bootstrap.sh` (installe Composer
  si `vendor/autoload.php` manque).
- `scripts/` — `ensure-env.ps1` / `ensure-env.sh` (création des `.env`) et
  `assert-stack.ps1` (assertions de santé de la stack).
- `Makefile` — cibles `up`, `up-dev`, `ensure-env`, `down`, `build`,
  `clone-http`, `clone-ssh`, `migrate-fresh-seed`, `smoke`,
  `smoke-from-scratch`, `php`.
- `ARCHIVE.md` — journal des changements du projet, à lire avant de
  planifier un nouveau travail (voir le skill `keep-track`).
- `clone-http.ps1` / `clone-ssh.ps1` — clones Windows équivalents aux
  cibles Make.
- `.env.development` / `.env.example` — modèle d’environnement
  Compose (copier vers `.env`).
- `frontend/` et `backend/` — clones locaux des dépôts applicatifs
  (gitignorés) ; ne pas y committer depuis ce dépôt.

## Contraintes de portée à respecter

Les limites de ce dépôt (orchestration uniquement, pas de code produit
ici) et les limites produit Sheet Happens sont définies dans
[`agent/scope.mdc`](agent/scope.mdc). Ne pas élargir cette portée sans
demande explicite. Le code applicatif (UI, API métier) se modifie dans
les dépôts Frontend et Api, pas ici.

## Règles partagées pour agents

Les règles et skills partagés vivent dans [`agent/`](agent/) — source de
vérité. Chaque outil IA en reçoit une **copie** dans son dossier
(`.cursor/`, `.claude/`).

### Ajouter ou modifier une règle / un skill partagé

1. Éditer d’abord sous `agent/` :
   - règle : `agent/<nom>.mdc`
   - skill : `agent/<nom>/SKILL.md`
2. **Copier** le fichier modifié vers chaque outil (copie réelle, pas de
   lien symbolique) :
   - Cursor : `.cursor/rules/<nom>.mdc`, `.cursor/skills/<nom>/SKILL.md`
   - Claude : `.claude/rules/<nom>.md`, `.claude/skills/<nom>/SKILL.md`
3. Documenter l’entrée dans [`agent/README.md`](agent/README.md).

Les copies doivent rester identiques à `agent/` : ne jamais éditer une copie
seule. Les skills **personnels / natifs** d’un outil (sans pendant sous
`agent/`) restent hors de cette procédure.

La revue vérifie que les copies correspondent à `agent/` : skill
[`agent/ide-code-review`](agent/ide-code-review/) (in-IDE) et prompt CI
[`.github/prompts/pr-review.md`](.github/prompts/pr-review.md) (bot PR).

## Documentation

- Vue d'ensemble du projet, installation, structure →
  [README.md](README.md)
- Normes de contribution, définition de « terminé », processus de PR →
  [CONTRIBUTING.md](CONTRIBUTING.md)
- Modèle de branches Git et workflow de tâche →
  [docs/git-conventions.md](docs/git-conventions.md)
- Inventaire des fichiers sous `agent/` → [agent/README.md](agent/README.md)

<!-- Les sections ci-dessous (en anglais) décrivent le fonctionnement attendu
de la stack Docker ; elles proviennent de `main`. -->

## Infrastructure expectations (stack Docker)

This repository is designed to run as a small containerized stack with a Laravel API backend and a Vite + React frontend behind a single Nginx reverse proxy.

### Required prerequisites

- The `make` command must be installed on the host machine.
- The Docker daemon must be running before any project startup step.
- Docker Compose support must be available through the local Docker installation.
- The project repositories must be cloned before the stack is started.

### Expected startup order

The infrastructure is expected to be started in this exact order:

1. `make clone-http`
   - Clones the backend repository into `backend/`.
   - Clones the frontend repository into `frontend/`.
2. `make up` (or `docker compose up -d`)
   - Starts the Docker services defined in `docker-compose.yml`.

`docker compose up -d` installs dependencies itself on first boot. The API bind-mounts `backend/`, which hides the `vendor` tree baked into the image, so `docker/api/bootstrap.sh` runs `composer install` only when `vendor/autoload.php` is missing and then execs `/var/www/html/entrypoint.sh` (the bind-mounted `backend/entrypoint.sh`), not the `/entrypoint.sh` copy baked into the image. Local, development, and testing environments install dev dependencies; production installs with `--no-dev`. An existing Composer install is left as-is — there is no `vendor` volume, because that previously hid a local install with the image's production tree. The frontend keeps `node_modules` in the `frontend-node-modules` volume and `docker/frontend/entrypoint.sh` runs `npm ci` only when Vite cannot be loaded in the container. Later boots skip both installs.

### Container traffic flow

All traffic between the containers is meant to pass through the Nginx service named `web-server` in `docker-compose.yml`.

- `web-server` is the public entry point and listens on port `80`.
- `docker/nginx/default.conf` defines the reverse-proxy rules.
- `/` is routed to the Vite + React frontend service.
- `/api` is routed to the Laravel backend service.
- `/sanctum` is also routed to the Laravel backend so the SPA CSRF cookie endpoint works correctly.

In other words:

- Browser request to `/` -> frontend service
- Browser request to `/api` -> Laravel API service
- Browser request to `/sanctum/csrf-cookie` -> Laravel Sanctum CSRF endpoint
- Browser request with `Host: localhost` -> Nginx `301` to `http://127.0.0.1$request_uri` so the SPA and `VITE_API_URL` stay on the same IPv4 origin
- Vite HMR WebSocket must use `127.0.0.1:80` through Nginx (`server.hmr.clientPort: 80` when `CHOKIDAR_USEPOLLING` is set). The frontend container must not publish host port `5173`, or the client falls back to `localhost:5173` via Docker Desktop/WSL and upgrades fail.
- `GET /api/rulesets/current/character-creation-options` is `fastcgi_cache`d in Nginx (cookie-agnostic key, `200` only). Sanctum still applies on cache miss. The `nginx-cache` volume is mounted on `web-server` and `api`; `backend/entrypoint.sh` deletes that cache tree after migrate/seed. Response header `X-Cache-Status` reports `MISS`/`HIT`/….

`web-server` should be the only ingress point for application traffic; direct frontend-to-backend communication is not the intended setup.

### Laravel SPA authentication notes

- `VITE_API_URL` must point to the public app origin that the browser can reach, usually `http://127.0.0.1` when the app is served through Nginx. Prefer `127.0.0.1` over `localhost` on Windows so the browser does not wait on a failed IPv6 lookup before falling back to IPv4. Compose injects `VITE_API_URL` from the infra root `.env` into the `frontend` service; Vite does not read the infra `.env` file from disk.
- `FRONTEND_URLS` and `SANCTUM_STATEFUL_DOMAINS` must include the local browser hostnames with `127.0.0.1` first, then `localhost` (and `laravel.test` when used) so authenticated Laravel session cookies are accepted.
- The frontend’s Axios client uses `withCredentials: true`, so the browser must receive the CSRF cookie from `/sanctum/csrf-cookie` before login or session-based requests.
- The nginx reverse proxy must expose `/sanctum` to Laravel; otherwise requests fail before the app can authenticate.
- On Docker Desktop for Windows, the frontend service sets `CHOKIDAR_USEPOLLING=true` and the Vite config keeps `server.watch.usePolling: true` so bind-mounted source changes trigger hot reload without inotify.

### Debug notes and change log

- Initial root cause discovered: the app had the Nginx proxy route for `/sanctum`, but Laravel was not exposing the Sanctum CSRF endpoint in the running app. This produced a 404 on `GET http://127.0.0.1/sanctum/csrf-cookie` even though the proxy itself was reachable.
- First attempted fix: `Sanctum::routes()` was added inside a `web` group in `backend/routes/api.php` to register the CSRF endpoint manually. This did not match the installed Laravel Sanctum version for this project; the package’s service provider already defines `/sanctum/csrf-cookie` automatically and exposes no `routes()` static method.
- Correct fix applied: the manual registration was removed, and the default Laravel Sanctum service provider route remained in place. The app config was also verified for `FRONTEND_URLS` and `SANCTUM_STATEFUL_DOMAINS`, with the cookie hosts set to `127.0.0.1`, `localhost`, and `laravel.test` to allow session cookies across the local browser flow.
- Verification: `php artisan route:list --name=csrf-cookie` shows the route exists, and the proxied request resolves successfully instead of returning 404.

### Laravel backend contract

The Laravel project is intended to function as an API service, not as a standard web application.

- The backend should not be used as a server-rendered website.
- It should not rely on browser-facing web routes as its primary purpose.
- The API should be exposed through the `/api` path via the Nginx reverse proxy.
- Web routes such as Blade views or a root page are not part of the expected architecture and should be avoided unless they are strictly temporary development scaffolding.

The expected design is: Laravel is an API-only backend behind Nginx, while the frontend provides the user interface.

### Frontend host policy

The Vite + React frontend must be as restrictive as possible regarding allowed hosts.

- It should not allow arbitrary external hostnames.
- Only the minimal host values required for the local Docker/Nginx setup should be accepted.
- The frontend must be reachable through the proxy and should not be configured with broad wildcard host access.

In short, the stack should be intentionally narrow and local: Nginx handles the public entry point, `/api` goes to Laravel, `/` goes to the frontend, and the frontend host configuration is kept as limited as possible.

### Operational summary

The intended runtime behavior is:

- Ensure `make` is installed.
- Ensure Docker is running.
- Run `make clone-http`.
- Run `make up` or `docker compose up -d`. Composer and npm dependencies are installed on first boot when they are missing.
- Access the project through the Nginx reverse proxy on port `80`.
- Use `/api` for Laravel API traffic and `/` for the Vite + React frontend.

This stack is designed to run as a minimal, local infrastructure setup where the reverse proxy is the central traffic router and the backend remains API-focused.

### Container bootstrap notes

The Laravel API image (`docker/api/Dockerfile`) uses `backend/entrypoint.sh` as its entrypoint. `backend/compose.yaml` is Laravel Sail and does not run that script; this repository’s `docker-compose.yml` does.

`.env` is excluded from the image on purpose. `APP_KEY` and the database settings are injected at runtime by Compose (`env_file` plus `environment`) or by the Infra platform’s secrets. php-fpm is configured with `clear_env = no` so those variables reach the workers. An empty `APP_KEY=` or `APP_KEY=""` is treated as missing. The script never prints the key. In `production` it refuses to generate one, because a new key on each deploy would invalidate Sanctum sessions. A key is generated only for `local`, `development`, or `testing` when both the environment and `.env` lack one. `.env.example` stays a dev template (`APP_ENV=local`, `APP_DEBUG=true`); the image defaults are `APP_ENV=production` and `APP_DEBUG=false`, and the entrypoint does not copy that example into a production container.

The script runs with `set -euo pipefail`, waits until MySQL accepts connections, then runs `php artisan migrate --force` followed by `php artisan db:seed --force`. The default `DatabaseSeeder` loads the ruleset catalog (`RulesetDatabaseSeeder`); those seeders use `SeedsOnce`, so a later boot does not create duplicate catalog rows. `depends_on` with `service_healthy` is also set on the API service. Running migrations from every replica at once can race; a separate migration job or `migrate --isolated` is the follow-up, not the current behavior.

The API image still runs `composer install --no-dev` at build time so a container without the source bind mount can boot from the image alone. Local Compose bind-mounts `backend/` over that tree, so a checkout with no `vendor/` directory would otherwise start without dependencies. `docker/api/bootstrap.sh` fills that gap on container start and does not replace `vendor/` when `autoload.php` is already there. Composer is copied into the image; older images download it on first install. The frontend image still runs `npm i` at build time, and the named `node_modules` volume is what the dev server actually uses.
