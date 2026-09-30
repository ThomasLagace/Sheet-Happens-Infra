# Documentation partagée pour agents IA

Ce dossier est la **source de vérité** des règles métier, skills et workflows
destinés à tout agent IA qui travaille sur ce dépôt. Les fichiers de
configuration propres à un outil (dossiers ou fichiers « dotfile » :
`.cursor/`, `.claude/`, `.github/`, `AGENTS.md`, etc.) **doivent pointer**
vers ces documents — en général via des **liens symboliques de fichier** —
plutôt que de dupliquer le contenu.

Éditer uniquement ici. Ne jamais coller une copie du Markdown dans un dossier
outil.

## Contenu

| Fichier | Rôle |
| ------- | ---- |
| [`scope.mdc`](scope.mdc) | Limites de portée infra + produit (toujours pertinentes) |
| [`local-stack.mdc`](local-stack.mdc) | Stack locale : Compose, Nginx, Sail, clones `frontend/` / `backend/` |
| [`verification.mdc`](verification.mdc) | Vérification des changements d’infra (pas de suite de tests produit ici) |
| [`ide-code-review/`](ide-code-review/) | Skill de revue in-IDE (complétude, scope, `check:agent-symlinks`, angles Security/Architecture/Dataflow/Cleanness) |
| [`akinator/`](akinator/) | Skill de clarification : questions jusqu’à brief concret ; docs d’abord ; mode sans opérateur (CI) |
| [`i-have-adhd/`](i-have-adhd/) | Skill de formatage de sortie pour lecteur TDAH (`/i-have-adhd` ; off via « stop adhd mode ») |
| [`caveman/`](caveman/) | Skill de communication ultra-compressée (`/caveman` ; niveaux lite/full/ultra + wenyan ; off via « stop caveman ») |

Le frontmatter YAML en tête de fichier (`description`, `globs`, `alwaysApply`,
etc.) est optionnel selon l’outil : ceux qui le comprennent l’utilisent ;
les autres lisent le corps Markdown.

Les **skills** partagés sont des dossiers (`agent/<nom>/SKILL.md`). Même
règle que pour les `.mdc` : source ici, lien fichier depuis l’emplacement
attendu par l’outil (Git mode `120000`).

Procédure complète, assertion et revue CI : [`AGENTS.md`](../AGENTS.md)
(`npm run check:agent-symlinks` →
[`scripts/check-agent-symlinks.mjs`](../scripts/check-agent-symlinks.mjs)).

## Convention : mapper les dotfiles vers `agent/`

Tout emplacement où un outil attend des règles, skills ou du contexte projet
doit référencer ce dossier, pas une seconde copie.

Schéma (placeholders — ne pas copier tels quels ; utiliser les vrais noms
sous `agent/` et le dossier attendu par l’outil) :

```text
agent/<règle>.mdc
agent/<skill>/SKILL.md

<dotfiles-outil>/rules/<règle>.mdc           →  agent/<règle>.mdc
<dotfiles-outil>/skills/<skill>/SKILL.md     →  agent/<skill>/SKILL.md
```

Pour un autre outil, créer des liens vers les **mêmes** cibles `agent/…`,
dans le répertoire que cet outil charge. L’assertion
`npm run check:agent-symlinks` découvre tous les symlinks Git vers `agent/`,
quel que soit le fournisseur.

Cartes d’entrée à la racine (`AGENTS.md`, `CLAUDE.md`, …) : garder un texte
court qui oriente vers ce dossier ; ne pas y recopier les règles.

## Prérequis Windows (équipe)

Les clones Windows doivent avoir `core.symlinks` activé, sinon Git écrit le
chemin cible comme texte plain et les outils chargent des « règles » invalides.
Voir [docs/agent-symlinks.md](../docs/agent-symlinks.md).

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
