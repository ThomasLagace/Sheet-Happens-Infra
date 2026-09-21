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
3. Exécuter la commande `make composer-install`
4. Exécuter la commande `make up`

### Authentification Laravel Sanctum

Le frontend est une SPA qui doit d’abord récupérer le cookie CSRF via `/sanctum/csrf-cookie` avant d’envoyer une requête de connexion ou de session. Le proxy Nginx doit donc rediriger `/sanctum` vers le service Laravel, pas seulement `/api`.

Le 404 sur `GET http://localhost/sanctum/csrf-cookie` venait du fait que Laravel n’enregistrait pas les routes Sanctum : il fallait appeler `Sanctum::routes()` dans un groupe `web`, puis laisser Nginx transmettre `/sanctum` au service Laravel.

Les variables importantes sont :

- `VITE_API_URL=http://localhost` dans la racine `.env.development`
- `FRONTEND_URLS=http://localhost,http://laravel.test` dans le backend `.env`
- `SANCTUM_STATEFUL_DOMAINS=localhost,127.0.0.1,laravel.test` dans le backend `.env`

Sans ces valeurs, les cookies de session Sanctum ne sont pas acceptés et l’authentification via Laravel échoue.
