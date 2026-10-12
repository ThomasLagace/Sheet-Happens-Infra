# AGENTS.md

Sheet Happens Infra orchestre le frontend (React/Vite) et le backend
(API Laravel) sur un même réseau Docker Compose, avec Nginx en reverse
proxy. Les dépôts applicatifs sont clonés dans `frontend/` et `backend/`
(hors versionnage de ce dépôt) ; ce dépôt ne contient que l’infra locale.

## Commandes

```bash
cp .env.development .env       # variables Sail / Compose (si .env absent)
./clone-http.ps1               # Windows : clone Api → backend, Frontend → frontend
# ou : make clone-http / make clone-ssh
make composer-install          # composer install dans backend/ via image Sail PHP
make up                        # docker-compose up
make build                     # docker-compose up --build
make down                      # docker compose down
make migrate-fresh-seed        # migrate:fresh --seed via Sail dans backend/
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

- `docker-compose.yml` — services `frontend`, `web-server` (Nginx),
  `laravel.test` (Sail), `mysql`, `mailpit` ; réseau `sail`.
- `docker/nginx/default.conf` — reverse proxy : `/` → Vite
  (`frontend:5173`), `/api` → `laravel.test`.
- `docker/frontend/Dockerfile` — image Node pour le serveur de dev Vite.
- `Makefile` — cibles `up`, `down`, `build`, `clone-http`, `clone-ssh`,
  `composer-install`, `migrate-fresh-seed`.
- `clone-http.ps1` / `clone-ssh.ps1` — clones Windows équivalents aux
  cibles Make.
- `.env.development` / `.env.example` — modèle d’environnement Sail /
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
