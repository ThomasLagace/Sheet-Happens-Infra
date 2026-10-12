# Sheet-Happens-Infra

Ce dépôt regroupe le backend et le frontend des applications. Il
permet que les deux projet soit sous le même sous réseau. Son but
est aussi de permettre de rouler le projet avec une seule commande
globalement.

## Getting started

### Prérequis

Avoir la commande `make` et `docker-compose` d'installées.

### Rouler le projet

1. Pour cloner les apps : `make clone-http` ou `make clone-ssh` (sur Windows : `./clone-http.ps1` / `./clone-ssh.ps1`).
2. Démarrer en dev : `make up-dev` crée les `.env` manquants (infra depuis `.env.development`, `frontend/.env` et `backend/.env` depuis leurs `.env.example`) puis lance `docker compose up -d`. Sans préparation d’env : `make up` ou `docker compose up -d`. Au premier démarrage, les conteneurs installent Composer/npm si besoin ; un démarrage suivant réutilise `backend/vendor` et le volume `frontend-node-modules`.
3. Vérifier la stack : `make smoke` (déjà démarrée) ou `make smoke-from-scratch` (down `-v`, rebuild, assert). Le script `scripts/assert-stack.ps1` contrôle santé Compose, seed ruleset, Sanctum, cache Nginx du catalogue, et `VITE_API_URL` dans le conteneur frontend.
4. Créer seulement les `.env` sans démarrer : `make ensure-env` (ou `scripts/ensure-env.ps1` / `scripts/ensure-env.sh`).

### Authentification Laravel Sanctum

Le frontend est une SPA qui doit d’abord récupérer le cookie CSRF via `/sanctum/csrf-cookie` avant d’envoyer une requête de connexion ou de session. Le proxy Nginx doit donc rediriger `/sanctum` vers le service Laravel, pas seulement `/api`.

Le endpoint CSRF est enregistré par le service provider Sanctum (pas via des routes web Laravel ni un appel manuel à `Sanctum::routes()`). Nginx doit transmettre `/sanctum` au service API ; ensuite `php artisan route:list --name=csrf-cookie` confirme que la route existe.

Sur Windows, préférer `127.0.0.1` à `localhost` pour l’origine navigateur : la résolution IPv6 de `localhost` peut retarder les requêtes d’environ 30 secondes avant le repli IPv4.

Les variables importantes sont :

- `VITE_API_URL=http://127.0.0.1` dans la racine `.env.development` (injecté dans le conteneur `frontend` par Compose)
- `FRONTEND_URLS=http://127.0.0.1,http://localhost,http://localhost:5174,http://laravel.test` dans le backend `.env`
- `SANCTUM_STATEFUL_DOMAINS=127.0.0.1,localhost,localhost:5174,laravel.test` dans le backend `.env`

Sans ces valeurs, les cookies de session Sanctum ne sont pas acceptés et l’authentification via Laravel échoue.

### Script de bootstrap du conteneur

`docker/api/Dockerfile` démarre le backend avec `backend/entrypoint.sh`. Le `compose.yaml` Sail du dépôt API ne l’utilise pas : seul le dépôt API s’en sert.

`.env` est exclu de l’image. Ce n’est pas un oubli : la clé ne doit pas être copiée dans les couches Docker. Compose injecte `APP_KEY` et les variables `DB_*` depuis le `.env` de ce dépôt (copié depuis `.env.development`, où `APP_KEY` est vide). Au premier démarrage en `local`, `development` ou `testing`, si ni l’environnement ni `backend/.env` n’ont de clé, `entrypoint.sh` en génère une et l’écrit dans `backend/.env`. En déploiement, l’Infra fournit la clé par variable d’environnement ou secret. php-fpm a `clear_env = no`, donc les workers PHP voient ces variables. Le script n’écrit jamais la clé dans les logs. En production, une clé absente arrête le conteneur au lieu d’en générer une nouvelle, ce qui déconnecterait toutes les sessions Sanctum. `.env.example` reste un modèle de dev ; l’image force `APP_DEBUG=false` tant que l’Infra ne surcharge pas cette variable.

Le script utilise `set -euo pipefail`, attend MySQL, puis lance `php artisan migrate --force` et `php artisan db:seed --force` avant `php-fpm` (le catalogue ruleset est idempotent via `SeedsOnce`). L’image installe toujours Composer au build (`--no-dev`) pour un conteneur sans montage du code. En local, le montage de `backend/` masque ce `vendor` : `docker/api/bootstrap.sh` lance `composer install` seulement si `vendor/autoload.php` est absent, puis exécute `entrypoint.sh`. Le frontend fait de même avec npm quand Vite n’est pas chargeable dans le conteneur.
