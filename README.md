# Sheet-Happens-Infra

Ce dépôt regroupe le backend et le frontend des applications. Il
permet que les deux projets soient sous le même sous-réseau. Son but
est aussi de permettre de rouler le projet avec une seule commande
globalement.

Nginx reverse-proxifie `/` vers le serveur de dev Vite et `/api` vers
l’API Laravel (service `api`, php-fpm) sur le réseau Docker Compose `sail`.

## Prérequis

- `make` et `docker-compose` (ou Docker Compose v2).
- Sur Windows : scripts `clone-http.ps1` / `clone-ssh.ps1` à la place des
  cibles Make de clone si besoin.

## Installation et démarrage

1. Pour cloner les apps : `make clone-http` ou `make clone-ssh` (sur Windows : `./clone-http.ps1` / `./clone-ssh.ps1`).
2. Démarrer en dev : `make up-dev` crée les `.env` manquants (infra depuis `.env.development`, `frontend/.env` et `backend/.env` depuis leurs `.env.example`) puis lance `docker compose up -d`. Sans préparation d’env : `make up` ou `docker compose up -d`. Au premier démarrage, les conteneurs installent Composer/npm si besoin ; un démarrage suivant réutilise `backend/vendor` et le volume `frontend-node-modules`.
3. Vérifier la stack : `make smoke` (déjà démarrée) ou `make smoke-from-scratch` (down `-v`, rebuild, assert). Le script `scripts/assert-stack.ps1` contrôle santé Compose, seed ruleset, Sanctum, cache Nginx du catalogue, et `VITE_API_URL` dans le conteneur frontend.
4. Créer seulement les `.env` sans démarrer : `make ensure-env` (ou `scripts/ensure-env.ps1` / `scripts/ensure-env.sh`).

Accès : `http://127.0.0.1` (port 80, via Nginx ; `http://localhost` est
redirigé vers `127.0.0.1`). Vite n’est plus publié sur l’hôte : le HMR passe
par Nginx. Mailpit : port `8025` (voir `.env`).

## Commandes disponibles

| Commande                        | Description                                                                 |
| ------------------------------- | --------------------------------------------------------------------------- |
| `make up`                       | `docker compose up -d`.                                                     |
| `make up-dev`                   | Crée les `.env` manquants puis `docker compose up -d`.                      |
| `make ensure-env`               | Crée seulement les `.env` manquants.                                        |
| `make build`                    | `docker-compose up --build`.                                                |
| `make down`                     | Arrête la stack.                                                            |
| `make clone-http` / `clone-ssh` | Clone Api → `backend/`, Frontend → `frontend/`.                             |
| `make migrate-fresh-seed`       | `migrate:fresh --seed` dans le service `api`.                               |
| `make smoke`                    | Vérifie la stack démarrée (`scripts/assert-stack.ps1`).                     |
| `make smoke-from-scratch`       | `down -v`, rebuild, puis mêmes vérifications.                               |
| `make php <commande>`           | Exécute `php <commande>` dans le service `api`.                             |

## Structure du projet

```
agent/              Règles et skills partagés pour agents IA (source de vérité)
docker/
  api/              Dockerfile de l’API et bootstrap.sh
  frontend/         Dockerfile du service Vite et entrypoint.sh
  nginx/            Reverse proxy (`/` → frontend, `/api` et `/sanctum` → api)
scripts/            ensure-env.* (création des .env), assert-stack.ps1
docker-compose.yml  Services frontend, web-server, api, mysql, mailpit, phpmyadmin
ARCHIVE.md          Journal des changements du projet
Makefile            Cibles d’orchestration
clone-*.ps1         Clones Windows
frontend/           Clone local Sheet-Happens-Frontend (gitignoré)
backend/            Clone local Sheet-Happens-Api (gitignoré)
```

Les configs d’agents (`.cursor/`, `.claude/`) contiennent des copies de
`agent/`. Procédure d’ajout : [AGENTS.md](AGENTS.md).

## Documentation du projet

- [CONTRIBUTING.md](CONTRIBUTING.md) — mise en place, normes, définition de
  « terminé », processus de pull request.
- [AGENTS.md](AGENTS.md) — repères pour les agents IA (commandes, procédure
  règles/skills sous `agent/` et copies vers les outils).
- [docs/git-conventions.md](docs/git-conventions.md) — modèle de branches
  Git et workflow de tâche.

## Authentification Laravel Sanctum

Le frontend est une SPA qui doit d’abord récupérer le cookie CSRF via `/sanctum/csrf-cookie` avant d’envoyer une requête de connexion ou de session. Le proxy Nginx doit donc rediriger `/sanctum` vers le service Laravel, pas seulement `/api`.

Le endpoint CSRF est enregistré par le service provider Sanctum (pas via des routes web Laravel ni un appel manuel à `Sanctum::routes()`). Nginx doit transmettre `/sanctum` au service API ; ensuite `php artisan route:list --name=csrf-cookie` confirme que la route existe.

Sur Windows, préférer `127.0.0.1` à `localhost` pour l’origine navigateur : la résolution IPv6 de `localhost` peut retarder les requêtes d’environ 30 secondes avant le repli IPv4.

Les variables importantes sont :

- `VITE_API_URL=http://127.0.0.1` dans la racine `.env.development` (injecté dans le conteneur `frontend` par Compose)
- `FRONTEND_URLS=http://127.0.0.1,http://localhost,http://localhost:5174,http://laravel.test` dans le backend `.env`
- `SANCTUM_STATEFUL_DOMAINS=127.0.0.1,localhost,localhost:5174,laravel.test` dans le backend `.env`

Sans ces valeurs, les cookies de session Sanctum ne sont pas acceptés et l’authentification via Laravel échoue.

## Script de bootstrap du conteneur

`docker/api/Dockerfile` démarre le backend avec `backend/entrypoint.sh`. Le `compose.yaml` Sail du dépôt API ne l’utilise pas : seul le dépôt API s’en sert.

`.env` est exclu de l’image. Ce n’est pas un oubli : la clé ne doit pas être copiée dans les couches Docker. Compose injecte `APP_KEY` et les variables `DB_*` depuis le `.env` de ce dépôt (celui copié depuis `.env.development`). En déploiement, l’Infra fournit la même clé par variable d’environnement ou secret. php-fpm a `clear_env = no`, donc les workers PHP voient ces variables. Le script n’écrit jamais la clé dans les logs. En production, une clé absente arrête le conteneur au lieu d’en générer une nouvelle, ce qui déconnecterait toutes les sessions Sanctum. `.env.example` reste un modèle de dev ; l’image force `APP_DEBUG=false` tant que l’Infra ne surcharge pas cette variable.

Le script utilise `set -euo pipefail`, attend MySQL, puis lance `php artisan migrate --force` et `php artisan db:seed --force` avant `php-fpm` (le catalogue ruleset est idempotent via `SeedsOnce`). L’image installe toujours Composer au build (`--no-dev`) pour un conteneur sans montage du code. En local, le montage de `backend/` masque ce `vendor` : `docker/api/bootstrap.sh` lance `composer install` seulement si `vendor/autoload.php` est absent, puis exécute `entrypoint.sh`. Le frontend fait de même avec npm quand Vite n’est pas chargeable dans le conteneur.
