# Sheet-Happens-Infra

Ce dépôt regroupe le backend et le frontend des applications. Il
permet que les deux projets soient sous le même sous-réseau. Son but
est aussi de permettre de rouler le projet avec une seule commande
globalement.

Nginx reverse-proxifie `/` vers le serveur de dev Vite et `/api` vers
l’API Laravel (Sail) sur le réseau Docker Compose `sail`.

## Prérequis

- [Node.js](https://nodejs.org/) et npm (hooks Git / assertion `agent/`).
- `make` et `docker-compose` (ou Docker Compose v2).
- Sur Windows : scripts `clone-http.ps1` / `clone-ssh.ps1` à la place des
  cibles Make de clone si besoin.

## Installation

```bash
npm install
cp .env.development .env
```

Puis cloner les dépôts applicatifs et installer les dépendances PHP du
backend :

```bash
./clone-http.ps1          # Windows ; ou make clone-http / make clone-ssh
make composer-install
```

`npm install` configure aussi ce clone Git (`core.hooksPath=.githooks`,
`core.symlinks=true`) et active le hook pre-commit qui répare les symlinks
`agent/`. **Lancer `npm install` au moins une fois avant tout commit** — sinon
ces hooks et réglages ne sont pas en place.

## Démarrage

```bash
make up
```

- App via Nginx : `http://localhost` (port 80)
- Vite exposé aussi sur `http://localhost:5173`
- Mailpit dashboard : port `8025` (voir `.env`)

## Commandes disponibles

| Commande                       | Description                                                                 |
| ------------------------------ | --------------------------------------------------------------------------- |
| `make up`                      | Démarre la stack Docker Compose.                                            |
| `make build`                   | `docker-compose up --build`.                                                |
| `make down`                    | Arrête la stack.                                                            |
| `make clone-http` / `clone-ssh`| Clone Api → `backend/`, Frontend → `frontend/`.                             |
| `make composer-install`        | `composer install` dans `backend/` via image Sail PHP.                      |
| `make migrate-fresh-seed`      | `migrate:fresh --seed` via Sail dans `backend/`.                            |
| `npm run check:agent-symlinks` | Vérifie que chaque source sous `agent/` a un symlink outil Git valide.      |
| `npm run fix:agent-symlinks`   | Réécrit l’index si `git add` a transformé des liens `agent/` en copies.   |

## Structure du projet

```
agent/              Règles et skills partagés pour agents IA (source de vérité)
scripts/            Outils repo (ex. check-agent-symlinks.mjs)
docker/
  frontend/         Dockerfile du service Vite
  nginx/            Reverse proxy (`/` → frontend, `/api` → laravel.test)
docker-compose.yml  Services frontend, web-server, laravel.test, mysql, mailpit
Makefile            Cibles d’orchestration
clone-*.ps1         Clones Windows
frontend/           Clone local Sheet-Happens-Frontend (gitignoré)
backend/            Clone local Sheet-Happens-Api (gitignoré)
```

Sur Windows, activer le mode développeur avant de cloner pour que les liens
des configs d’agents vers `agent/` fonctionnent — détails dans
[docs/agent-symlinks.md](docs/agent-symlinks.md). Après le clone,
`npm install` active `core.symlinks=true` et les hooks pour ce dépôt.
Procédure d’ajout / assertion : [AGENTS.md](AGENTS.md).

## Documentation du projet

- [CONTRIBUTING.md](CONTRIBUTING.md) — mise en place, normes, définition de
  « terminé », processus de pull request.
- [AGENTS.md](AGENTS.md) — repères pour les agents IA (commandes, procédure
  règles/skills sous `agent/`, assertion des symlinks).
- [docs/agent-symlinks.md](docs/agent-symlinks.md) — liens symboliques vers
  `agent/`, `core.symlinks` (Windows), vérification.
- [docs/git-conventions.md](docs/git-conventions.md) — modèle de branches
  Git et workflow de tâche.
