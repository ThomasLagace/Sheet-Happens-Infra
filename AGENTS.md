# AGENTS.md

Sheet Happens Infra orchestre le frontend (React/Vite) et le backend
(API Laravel) sur un même réseau Docker Compose, avec Nginx en reverse
proxy. Les dépôts applicatifs sont clonés dans `frontend/` et `backend/`
(hors versionnage de ce dépôt) ; ce dépôt ne contient que l’infra locale.

## Commandes

```bash
npm install                    # configure ce clone Git (core.hooksPath, core.symlinks) via prepare
cp .env.development .env       # variables Sail / Compose (si .env absent)
./clone-http.ps1               # Windows : clone Api → backend, Frontend → frontend
# ou : make clone-http / make clone-ssh
make composer-install          # composer install dans backend/ via image Sail PHP
make up                        # docker-compose up
make build                     # docker-compose up --build
make down                      # docker compose down
make migrate-fresh-seed        # migrate:fresh --seed via Sail dans backend/
npm run check:agent-symlinks   # chaque source agent/ a ≥1 symlink outil (tout fournisseur) + contenu résolu
npm run fix:agent-symlinks     # réécrit l’index si git add a transformé des liens en copies
```

Ce dépôt **n’a pas** de suite `npm run test` / `lint` / `format` de
produit : la validation locale passe par Compose (`make up` / `make build`)
et, lorsque `agent/` ou les liens d’outils changent,
`npm run check:agent-symlinks`.

Exécuter `npm run check:agent-symlinks` après toute addition ou
modification de règles/skills sous `agent/` (ou de leurs liens sous un
dossier d’outil). Avant de considérer une tâche d’infra terminée,
vérifier que la stack démarre (`make up`) sans erreur évidente sur les
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
vérité unique pour tous les outils IA. Ne jamais coller une copie du
contenu dans un dossier d’outil (`.cursor/`, etc.). Sur Windows :
[docs/agent-symlinks.md](docs/agent-symlinks.md).

### Ajouter ou modifier une règle / un skill partagé

**Avant toute manipulation de symlinks** (création, réparation, `git add` sur
des chemins sous `.cursor/` / autre dotfile outil, `fix:agent-symlinks`,
etc.) : si `npm install` n’a pas encore été lancé sur ce clone, **demander à
l’opérateur de le faire** (ou l’exécuter). Le script `prepare` configure
`core.hooksPath=.githooks` et `core.symlinks=true` pour ce dépôt — sans ça,
les hooks de réparation et le checkout des liens ne sont pas en place.
Indices qu’install n’a pas tourné : `git config --get core.hooksPath` n’est
pas `.githooks`, ou `core.symlinks` n’est pas `true`.

1. Créer ou éditer **uniquement** sous `agent/` :
   - règle : `agent/<nom>.mdc`
   - skill : `agent/<nom>/SKILL.md`
2. Pour **chaque** outil qui doit charger ce fichier, créer un **lien
   symbolique de fichier** depuis l’emplacement attendu par cet outil vers
   `agent/…` (pas une copie). Ex. placeholders :
   `<dotfiles-outil>/…/<fichier>` → `agent/<fichier>` ou
   `agent/<skill>/SKILL.md`.
3. Vérifier que Git enregistre un symlink (`mode 120000`), pas un fichier
   normal : `git ls-files -s <chemin-du-lien>`
4. Documenter l’entrée dans [`agent/README.md`](agent/README.md).
5. **Assert** (agnostique de l’outil) : chaque source sous `agent/` a au
   moins un symlink Git vers elle, et chaque lien résout vers le même
   contenu — `npm run check:agent-symlinks`
   ([`scripts/check-agent-symlinks.mjs`](scripts/check-agent-symlinks.mjs)).
   Ne pas considérer l’ajout terminé tant que cette commande échoue.
   Si `git add` a transformé des liens en copies (fréquent sous Windows) :
   `npm run fix:agent-symlinks` réécrit l’index en mode `120000`. Un hook
   pre-commit (`.githooks/`, activé par `npm install` / `prepare`) fait la
   même réparation avant chaque commit.

Les skills **personnels / natifs** d’un outil (sans pendant sous `agent/`)
restent hors de cette procédure.

La même assertion est rejouée en revue : skill
[`agent/ide-code-review`](agent/ide-code-review/) (in-IDE) et prompt CI
[`.github/prompts/pr-review.md`](.github/prompts/pr-review.md) (bot PR).

## Documentation

- Vue d'ensemble du projet, installation, structure →
  [README.md](README.md)
- Normes de contribution, définition de « terminé », processus de PR →
  [CONTRIBUTING.md](CONTRIBUTING.md)
- Modèle de branches Git et workflow de tâche →
  [docs/git-conventions.md](docs/git-conventions.md)
- `agent/` et liens depuis les configs d’outils IA (`core.symlinks` sur
  Windows, `npm run check:agent-symlinks`) →
  [docs/agent-symlinks.md](docs/agent-symlinks.md)
- Inventaire des fichiers sous `agent/` → [agent/README.md](agent/README.md)
