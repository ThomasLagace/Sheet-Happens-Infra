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

## Attentes d’infrastructure (stack Docker)

Ce dépôt est conçu pour faire tourner une petite stack conteneurisée : une
API Laravel et un frontend Vite + React derrière un seul reverse proxy
Nginx.

### Prérequis

- La commande `make` doit être installée sur la machine hôte.
- Le démon Docker doit tourner avant toute étape de démarrage.
- Docker Compose doit être disponible via l’installation Docker locale.
- Les dépôts applicatifs doivent être clonés avant de démarrer la stack.

### Ordre de démarrage attendu

L’infrastructure se démarre dans cet ordre :

1. `make clone-http`
   - Clone le dépôt backend dans `backend/`.
   - Clone le dépôt frontend dans `frontend/`.
2. `make up` (ou `docker compose up -d`)
   - Démarre les services Docker définis dans `docker-compose.yml`.

`docker compose up -d` installe lui-même les dépendances au premier
démarrage. L’API monte `backend/` en bind mount, ce qui masque le dossier
`vendor` intégré à l’image ; `docker/api/bootstrap.sh` lance donc
`composer install` seulement si `vendor/autoload.php` est absent, puis
exécute `/var/www/html/entrypoint.sh` (le `backend/entrypoint.sh` monté),
et non la copie `/entrypoint.sh` de l’image. Les environnements `local`,
`development` et `testing` installent les dépendances de dev ; la
production installe avec `--no-dev`. Une installation Composer existante
est laissée telle quelle : il n’y a pas de volume `vendor`, car il
remplaçait auparavant l’installation locale par l’arbre de production de
l’image. Le frontend garde `node_modules` dans le volume
`frontend-node-modules`, et `docker/frontend/entrypoint.sh` lance `npm ci`
seulement si Vite ne peut pas être chargé dans le conteneur. Les
démarrages suivants sautent les deux installations.

### Flux de trafic entre conteneurs

Tout le trafic entre les conteneurs doit passer par le service Nginx
nommé `web-server` dans `docker-compose.yml`.

- `web-server` est le point d’entrée public et écoute sur le port `80`.
- `docker/nginx/default.conf` définit les règles de reverse proxy.
- `/` est routé vers le service frontend Vite + React.
- `/api` est routé vers le service backend Laravel.
- `/sanctum` est aussi routé vers Laravel pour que le endpoint du cookie
  CSRF de la SPA fonctionne.

Autrement dit :

- Requête navigateur vers `/` → service frontend
- Requête navigateur vers `/api` → service API Laravel
- Requête navigateur vers `/sanctum/csrf-cookie` → endpoint CSRF de
  Laravel Sanctum
- Requête navigateur avec `Host: localhost` → Nginx répond `301` vers
  `http://127.0.0.1$request_uri`, pour que la SPA et `VITE_API_URL`
  restent sur la même origine IPv4
- Le WebSocket HMR de Vite doit passer par `127.0.0.1:80` via Nginx
  (`server.hmr.clientPort: 80` quand `CHOKIDAR_USEPOLLING` est défini). Le
  conteneur frontend ne doit pas publier le port hôte `5173`, sinon le
  client retombe sur `localhost:5173` via Docker Desktop/WSL et les mises
  à niveau du WebSocket échouent.
- `GET /api/rulesets/current/character-creation-options` est mis en cache
  par `fastcgi_cache` dans Nginx (clé indépendante des cookies, réponses
  `200` seulement). Sanctum s’applique toujours en cas de cache manquant.
  Le volume `nginx-cache` est monté sur `web-server` et `api` ;
  `backend/entrypoint.sh` supprime ce cache après migrate/seed. L’en-tête
  de réponse `X-Cache-Status` indique `MISS`/`HIT`/….

`web-server` doit rester le seul point d’entrée du trafic applicatif ;
une communication directe frontend → backend n’est pas prévue.

### Authentification SPA Laravel

- `VITE_API_URL` doit pointer vers l’origine publique de l’application,
  joignable par le navigateur, en général `http://127.0.0.1` quand
  l’application est servie par Nginx. Préférer `127.0.0.1` à `localhost`
  sur Windows pour que le navigateur n’attende pas un échec de résolution
  IPv6 avant de retomber sur IPv4. Compose injecte `VITE_API_URL` depuis le
  `.env` racine de l’infra dans le service `frontend` ; Vite ne lit pas ce
  fichier `.env` sur le disque.
- `FRONTEND_URLS` et `SANCTUM_STATEFUL_DOMAINS` doivent inclure les noms
  d’hôte locaux du navigateur, `127.0.0.1` en premier, puis `localhost`
  (et `laravel.test` si utilisé), pour que les cookies de session Laravel
  soient acceptés.
- Le client Axios du frontend utilise `withCredentials: true` : le
  navigateur doit donc recevoir le cookie CSRF de `/sanctum/csrf-cookie`
  avant la connexion ou toute requête de session.
- Le reverse proxy Nginx doit exposer `/sanctum` à Laravel ; sinon les
  requêtes échouent avant que l’application puisse authentifier.
- Sur Docker Desktop pour Windows, le service frontend définit
  `CHOKIDAR_USEPOLLING=true` et la config Vite garde
  `server.watch.usePolling: true`, afin que les changements de sources
  montés en bind mount déclenchent le rechargement à chaud sans inotify.

### Notes de débogage et historique

- Cause initiale : la route Nginx pour `/sanctum` existait, mais Laravel
  n’exposait pas le endpoint CSRF de Sanctum dans l’application en cours
  d’exécution. Cela produisait un 404 sur
  `GET http://127.0.0.1/sanctum/csrf-cookie` alors que le proxy était
  joignable.
- Première tentative de correction : `Sanctum::routes()` avait été ajouté
  dans un groupe `web` de `backend/routes/api.php` pour enregistrer le
  endpoint à la main. Cela ne correspondait pas à la version de Laravel
  Sanctum installée : le service provider du paquet définit déjà
  `/sanctum/csrf-cookie` automatiquement et n’expose aucune méthode
  statique `routes()`.
- Correction retenue : l’enregistrement manuel a été retiré, et la route
  du service provider de Sanctum est restée en place. La config a aussi
  été vérifiée pour `FRONTEND_URLS` et `SANCTUM_STATEFUL_DOMAINS`, avec les
  hôtes `127.0.0.1`, `localhost` et `laravel.test`, afin d’accepter les
  cookies de session dans le parcours navigateur local.
- Vérification : `php artisan route:list --name=csrf-cookie` montre que la
  route existe, et la requête passée par le proxy aboutit au lieu de
  renvoyer un 404.

### Contrat du backend Laravel

Le projet Laravel doit fonctionner comme un service d’API, pas comme une
application web classique.

- Le backend ne doit pas servir un site rendu côté serveur.
- Il ne doit pas reposer sur des routes web destinées au navigateur comme
  usage principal.
- L’API doit être exposée sous le chemin `/api` via le reverse proxy
  Nginx.
- Les routes web (vues Blade, page racine) ne font pas partie de
  l’architecture attendue et sont à éviter, sauf échafaudage de
  développement strictement temporaire.

Conception attendue : Laravel est un backend API seul derrière Nginx, et
le frontend fournit l’interface utilisateur.

### Politique d’hôtes du frontend

Le frontend Vite + React doit être aussi restrictif que possible sur les
hôtes autorisés.

- Il ne doit pas accepter de noms d’hôte externes arbitraires.
- Seules les valeurs d’hôte minimales nécessaires à la configuration
  locale Docker/Nginx doivent être acceptées.
- Le frontend doit être joignable via le proxy et ne doit pas être
  configuré avec un accès large par joker.

En bref, la stack doit rester volontairement étroite et locale : Nginx
est le point d’entrée public, `/api` va vers Laravel, `/` va vers le
frontend, et la configuration d’hôtes du frontend est la plus limitée
possible.

### Résumé opérationnel

Comportement d’exécution attendu :

- Vérifier que `make` est installé.
- Vérifier que Docker tourne.
- Lancer `make clone-http`.
- Lancer `make up` ou `docker compose up -d`. Les dépendances Composer et
  npm sont installées au premier démarrage si elles manquent.
- Accéder au projet via le reverse proxy Nginx sur le port `80`.
- Utiliser `/api` pour le trafic de l’API Laravel et `/` pour le frontend
  Vite + React.

Cette stack est une infrastructure locale minimale : le reverse proxy est
le routeur central du trafic et le backend reste centré sur l’API.

### Amorçage du conteneur

L’image de l’API Laravel (`docker/api/Dockerfile`) utilise
`backend/entrypoint.sh` comme point d’entrée. Le `backend/compose.yaml`
est celui de Laravel Sail et n’exécute pas ce script ; le
`docker-compose.yml` de ce dépôt, lui, l’exécute.

`.env` est exclu de l’image volontairement. `APP_KEY` et les paramètres de
base de données sont injectés à l’exécution par Compose (`env_file` et
`environment`) ou par les secrets de la plateforme d’infra. php-fpm est
configuré avec `clear_env = no` pour que ces variables atteignent les
workers. Un `APP_KEY=` ou `APP_KEY=""` vide est traité comme absent. Le
script n’affiche jamais la clé. En `production`, il refuse d’en générer
une, car une nouvelle clé à chaque déploiement invaliderait les sessions
Sanctum. Une clé n’est générée que pour `local`, `development` ou
`testing`, quand ni l’environnement ni `.env` n’en fournissent.
`.env.example` reste un modèle de dev (`APP_ENV=local`, `APP_DEBUG=true`) ;
les valeurs par défaut de l’image sont `APP_ENV=production` et
`APP_DEBUG=false`, et l’entrypoint ne copie pas cet exemple dans un
conteneur de production.

Le script s’exécute avec `set -euo pipefail`, attend que MySQL accepte les
connexions, puis lance `php artisan migrate --force` suivi de
`php artisan db:seed --force`. Le `DatabaseSeeder` par défaut charge le
catalogue du ruleset (`RulesetDatabaseSeeder`) ; ces seeders utilisent
`SeedsOnce`, donc un démarrage ultérieur ne crée pas de doublons.
`depends_on` avec `service_healthy` est aussi défini sur le service API.
Lancer les migrations depuis chaque réplique en même temps peut créer une
course ; un job de migration séparé ou `migrate --isolated` est la suite
prévue, pas le comportement actuel.

L’image de l’API exécute toujours `composer install --no-dev` au build,
pour qu’un conteneur sans bind mount du code puisse démarrer depuis
l’image seule. Compose local monte `backend/` par-dessus cet arbre : un
checkout sans dossier `vendor/` démarrerait donc sans dépendances.
`docker/api/bootstrap.sh` comble ce manque au démarrage du conteneur et ne
remplace pas `vendor/` quand `autoload.php` existe déjà. Composer est
copié dans l’image ; les anciennes images le téléchargent à la première
installation. L’image du frontend exécute toujours `npm i` au build, et le
volume nommé `node_modules` est ce que le serveur de dev utilise
réellement.
