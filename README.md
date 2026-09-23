# Sheet-Happens-Infra

Ce dépôt regroupe le backend et le frontend des applications. Il
permet que les deux projet soit sous le même sous réseau. Son but
est aussi de permettre de rouler le projet avec une seule commande
globalement.

## Getting started

### Prérequis

Avoir la commande `make` et `docker-compose` d'installées.

### Rouler le projet

1. Copier le fichier `.env.development` dans `.env` (`cp .env.development .env`)
2. Pour rouler ce dépôt il faut utiliser `make clone-http` ou
   `make clone-ssh`, sur windows utiliser les scripts `./clone-http.ps1`
   et `./clone-ssh.ps1`.
3. Exécuter `make up` ou `docker compose up -d`. Au premier démarrage, les conteneurs installent les dépendances Composer et npm si elles sont absentes. Un démarrage suivant réutilise `backend/vendor` et le volume `frontend-node-modules`.

### Authentification Laravel Sanctum

Le frontend est une SPA qui doit d’abord récupérer le cookie CSRF via `/sanctum/csrf-cookie` avant d’envoyer une requête de connexion ou de session. Le proxy Nginx doit donc rediriger `/sanctum` vers le service Laravel, pas seulement `/api`.

Le 404 sur `GET http://localhost/sanctum/csrf-cookie` venait du fait que Laravel n’enregistrait pas les routes Sanctum : il fallait appeler `Sanctum::routes()` dans un groupe `web`, puis laisser Nginx transmettre `/sanctum` au service Laravel.

Les variables importantes sont :

- `VITE_API_URL=http://localhost` dans la racine `.env.development`
- `FRONTEND_URLS=http://localhost,http://laravel.test` dans le backend `.env`
- `SANCTUM_STATEFUL_DOMAINS=localhost,127.0.0.1,laravel.test` dans le backend `.env`

Sans ces valeurs, les cookies de session Sanctum ne sont pas acceptés et l’authentification via Laravel échoue.

### Script de bootstrap du conteneur

`docker/api/Dockerfile` démarre le backend avec `backend/entrypoint.sh`. Le `compose.yaml` Sail du dépôt API ne l’utilise pas : seul le dépôt API s’en sert.

`.env` est exclu de l’image. Ce n’est pas un oubli : la clé ne doit pas être copiée dans les couches Docker. Compose injecte `APP_KEY` et les variables `DB_*` depuis le `.env` de ce dépôt (celui copié depuis `.env.development`). En déploiement, l’Infra fournit la même clé par variable d’environnement ou secret. php-fpm a `clear_env = no`, donc les workers PHP voient ces variables. Le script n’écrit jamais la clé dans les logs. En production, une clé absente arrête le conteneur au lieu d’en générer une nouvelle, ce qui déconnecterait toutes les sessions Sanctum. `.env.example` reste un modèle de dev ; l’image force `APP_DEBUG=false` tant que l’Infra ne surcharge pas cette variable.

Le script utilise `set -euo pipefail`, attend MySQL, puis lance `php artisan migrate --force` avant `php-fpm`. L’image installe toujours Composer au build (`--no-dev`) pour un conteneur sans montage du code. En local, le montage de `backend/` masque ce `vendor` : `docker/api/bootstrap.sh` lance `composer install` seulement si `vendor/autoload.php` est absent, puis exécute `entrypoint.sh`. Le frontend fait de même avec npm quand Vite n’est pas chargeable dans le conteneur.
