# Documentation partagée pour agents IA

Ce dossier est la **source de vérité** des règles métier, skills et workflows
destinés à tout agent IA qui travaille sur ce dépôt. Les dossiers de
configuration des outils (`.cursor/`, `.claude/`) reçoivent une **copie
conforme** de ces documents (pas de lien symbolique). Les fichiers d’entrée
(`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`) ne sont pas
des copies : ils renvoient ici.

Éditer ici d’abord, puis recopier vers les dossiers d’outils.

## Contenu

| Fichier | Rôle |
| ------- | ---- |
| [`scope.mdc`](scope.mdc) | Limites de portée infra + produit (toujours pertinentes) |
| [`local-stack.mdc`](local-stack.mdc) | Stack locale : Compose, Nginx, clones `frontend/` / `backend/` |
| [`verification.mdc`](verification.mdc) | Vérification des changements d’infra (pas de suite de tests produit ici) |
| [`ide-code-review/`](ide-code-review/) | Skill de revue in-IDE (complétude, scope, copies `agent/`, angles Security/Architecture/Dataflow/Cleanness) |
| [`akinator/`](akinator/) | Skill de clarification : questions jusqu’à brief concret ; docs d’abord ; mode sans opérateur (CI) |
| [`i-have-adhd/`](i-have-adhd/) | Skill de formatage de sortie pour lecteur TDAH (`/i-have-adhd` ; off via « stop adhd mode ») |
| [`caveman/`](caveman/) | Skill de communication ultra-compressée (`/caveman` ; niveaux lite/full/ultra + wenyan ; off via « stop caveman ») |

Le frontmatter YAML en tête de fichier (`description`, `globs`, `alwaysApply`,
etc.) est optionnel selon l’outil : ceux qui le comprennent l’utilisent ;
les autres lisent le corps Markdown.

Les **skills** partagés sont des dossiers (`agent/<nom>/SKILL.md`). Même
règle que pour les `.mdc` : source ici, copie dans l’emplacement attendu par
l’outil.

Procédure complète et revue CI : [`AGENTS.md`](../AGENTS.md).

## Convention : copier vers les dotfiles des outils

Tout emplacement où un outil attend des règles, skills ou du contexte projet
reçoit une **copie conforme** des fichiers de ce dossier (pas de lien
symbolique). On édite ici d’abord, puis on recopie.

```text
agent/<règle>.mdc                →  .cursor/rules/<règle>.mdc
                                    .claude/rules/<règle>.md
agent/<skill>/SKILL.md           →  .cursor/skills/<skill>/SKILL.md
                                    .claude/skills/<skill>/SKILL.md
```

Pour un autre outil, copier les **mêmes** fichiers dans le répertoire que cet
outil charge.

Cartes d’entrée à la racine (`AGENTS.md`, `CLAUDE.md`, …) : garder un texte
court qui oriente vers ce dossier ; ne pas y recopier les règles.

## Ce qui reste hors de `agent/`

Uniquement la config **native** d’un outil (permissions CLI, launch, skills
**personnels** non partagés, secrets locaux) — pas les règles métier ni les
skills de projet :

- ex. `.cursor/cli.json`
- ex. `.claude/launch.json`
- prompts CI propres à GitHub Actions (ex. `.github/prompts/pr-review.md`)
  qui **référencent** la procédure / le check, sans dupliquer le contenu
  métier de `agent/`
- fichiers d’entrée racine (`AGENTS.md`, `CLAUDE.md`) qui **renvoient** ici
