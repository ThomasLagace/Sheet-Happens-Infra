# Conventions Git — Sheet Happens Infra

Ces conventions s’alignent sur le dossier de démarrage du projet (contrat
d'équipe), adaptées à ce dépôt d’orchestration.

## Modèle de branches (git-flow)

- **`main`** — Branche d’intégration de ce dépôt. Personne ne programme
  directement dedans ; elle doit toujours rester une stack démarable.
  Chaque changement terminé arrive dans `main` via une pull request.
  (Les dépôts Frontend / Api utilisent aussi `develop` ; ce dépôt n’a
  pas de branche `develop` — cibler `main`.)
- **`feature/{tacheId}-nom-branche`** — Une branche par fonctionnalité
  principale, nommée avec l'identifiant de la tâche Jira. Exemple :
  `feature/P81-enhanced-agentic-doc`.
- **`bugfix/...`** — Une branche par résolution de problème non urgent.
- **`hotfix/...`** — Utilisée uniquement si `main` contient une erreur
  problématique. On corrige dans cette branche, puis on fusionne avec
  `main`.
- **`docs/...`** — Documentation qui ne fait pas partie d'une
  fonctionnalité de produit.

## Commits

- Des commits fréquents et descriptifs, plutôt que de gros commits qui
  mélangent plusieurs changements.
- Un `.gitattributes` doit être maintenu à la racine du projet pour
  uniformiser la gestion des fins de ligne entre Windows et Linux et
  éviter les conflits de commit qui en découlent.
- Les configs d’agents (`.cursor/`, `.claude/`) contiennent des **copies**
  de `agent/` : toute modification sous `agent/` doit être recopiée.

## Workflow de tâche

1. **À faire** → une tâche est créée.
2. **En cours** → la tâche est prise en charge, le développement se fait
   sur sa branche `feature`/`bugfix`.
3. **Attente de revue** → la tâche est terminée, une pull request est
   ouverte vers `main`.
4. **Revue en cours** → la pull request est en cours de révision.
    - Si des éléments doivent être changés, la tâche retourne en **En
      cours** (ou en **En attente** si elle bloque sur autre chose)
      jusqu'à ce que les modifications soient faites, puis repasse par la
      revue.
5. **Terminé** → la revue est terminée et approuvée, la pull request est
   fusionnée dans `main`.

## Ouvrir une pull request

Une pull request ne doit être ouverte que lorsque l'auteur a vérifié
que :

- l'ensemble de la fonctionnalité est complété ;
- la stack / la config concernée fonctionne sans erreur ;
- la tâche n'a pas entraîné de modification dans des fichiers hors de la
  portée réelle de la fonctionnalité ;
- `docker compose config` passe localement (voir
  [CONTRIBUTING.md](../CONTRIBUTING.md)) ;
- si la PR touche `agent/`, les copies sous `.cursor/` et `.claude/` sont à
  jour (voir [AGENTS.md](../AGENTS.md)).

## Validation et fusion

Pour être fusionnée dans `main`, une pull request doit obtenir :

- la validation d'un agent (revue automatisée/IA — le prompt CI
  [`.github/prompts/pr-review.md`](../.github/prompts/pr-review.md)
  vérifie notamment que les copies d’agents sont à jour) ;
- **et** la validation d'un humain, pour s'assurer que l'agent n'a pas
  laissé passer d'erreur.

Le merge vers `main` ne peut avoir lieu qu'une fois ces deux
validations obtenues.
