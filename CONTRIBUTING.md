# Contribuer à Sheet Happens Infra

Ce guide décrit comment mettre en place l’environnement d’orchestration
locale, valider son travail avant de l'intégrer, et les normes attendues
sur ce dépôt.

## Mise en place

```bash
cp .env.development .env
./clone-http.ps1          # Windows ; ou make clone-http / make clone-ssh
make composer-install
make up
```

`frontend/` et `backend/` sont des clones des dépôts applicatifs (hors Git
de ce dépôt). L’API et le frontend sont joints sur le réseau Compose ;
Nginx écoute sur le port 80.

### Règles et skills IA

Les règles et skills IA partagés sont dans `agent/` (source de vérité) ;
chaque outil (`.cursor/`, `.claude/`) en reçoit une **copie** identique.
Procédure d’ajout : [AGENTS.md](AGENTS.md).

## Commandes à exécuter avant d'ouvrir une pull request

```bash
docker compose config          # la config Compose doit être valide
```

Il n’y a pas de `npm run test` / `lint` / `format` sur ce dépôt. Vérifier
manuellement que les services touchés démarrent (`make up` / `make build`)
et que le proxy Nginx se comporte comme prévu pour les chemins concernés
(`/`, `/api`).

Si des règles ou skills partagés sous `agent/` changent, leurs copies dans
`.cursor/` et `.claude/` doivent être mises à jour ; la revue PR automatisée
le vérifie (voir [AGENTS.md](AGENTS.md)).

## Normes de programmation

- Noms de services, volumes, cibles Make et scripts clairs et descriptifs.
- Respecter les conventions déjà présentes (Compose YAML, Makefile avec
  tabs, scripts shell / PowerShell courts).
- Éviter la duplication : une responsabilité claire par fichier
  (`docker/nginx/`, `docker/frontend/`, cibles Make).
- Ne pas versionner `frontend/` ni `backend/` : ce sont des clones locaux
  (voir `.gitignore`).
- Ne pas y implémenter de logique métier Sheet Happens (UI, API, règles
  D&D) : ces changements vont dans les dépôts Frontend et Api.
- Documenter les changements d’orchestration dans le README / `docs/` /
  ce fichier lorsque le comportement local pour l’équipe change.

## Définition de « terminé »

Une tâche d’infra est considérée comme terminée lorsque :

- le développement est complété et la stack se comporte conformément à
  l’objectif de la tâche ;
- le code respecte les normes ci-dessus et la portée de
  [`agent/scope.mdc`](agent/scope.mdc) ;
- les validations nécessaires sont présentes (Compose valide, chemins
  proxy cohérents, variables d’env documentées si ajoutées) ;
- la fonctionnalité a été vérifiée avec des cas normaux (démarrage,
  accès `/` et `/api` si concernés) ;
- aucun problème critique connu ne subsiste ;
- l'intégration dans `main` ne provoque pas de régression de stack ;
- la documentation pertinente a été mise à jour.

## Branches et pull requests

Voir [docs/git-conventions.md](docs/git-conventions.md) pour le modèle de
branches, le workflow de tâche et les conditions de fusion.

En résumé :

- développer dans une branche `feature/{tacheId}-nom-branche` ou
  `bugfix/...`, jamais directement dans `main` ;
- ouvrir la pull request vers `main` une fois la stack vérifiée
  localement (et copies `.cursor/` / `.claude/` à jour si `agent/` a
  changé) ;
- la fusion requiert la validation d'un agent **et** celle d'un humain.

## Documentation

Toute modification importante du fonctionnement de l’orchestration doit
être reflétée dans la documentation correspondante (README, ce fichier,
ou les documents sous `docs/`).

## Langue

- La documentation et les issues sont rédigées en **français**, avec une
  terminologie uniforme.
- Le code (identifiants, commentaires dans le code) et les commits sont
  écrit en **anglais**.
