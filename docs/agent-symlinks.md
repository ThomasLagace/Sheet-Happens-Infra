# Liens symboliques vers `agent/` et `core.symlinks` (Windows)

Les règles et skills partagés des agents vivent dans [`agent/`](../agent/).
Tout fichier de configuration d’outil IA qui doit les charger (dotfiles sous
`.cursor/`, `.claude/`, ou tout autre dossier d’agent) doit être un **lien
symbolique de fichier** vers le fichier correspondant dans `agent/`, pas une
copie.

Procédure d’ajout (tous outils) : [`AGENTS.md`](../AGENTS.md).

Sur Windows, Git ne restaure correctement ces liens que si `core.symlinks` est
activé **et** que le système autorise la création de liens symboliques.

Sans cela, un `git clone` ou `git checkout` écrit souvent un fichier texte
contenant uniquement le chemin cible (ex. un chemin relatif vers `agent/…`).
L’outil charge alors une règle ou un skill invalide.

## Une fois par machine (recommandé)

### 1. Autoriser les liens symboliques

Choisir **une** des options :

- **Mode développeur** (préféré) : Paramètres Windows → Confidentialité et
  sécurité → Pour les développeurs → activer **Mode développeur**.
- Ou lancer le terminal / Git en **administrateur** lorsque vous clonez ou
  extrayez (moins pratique au quotidien).

### 2. Activer `core.symlinks` pour Git

Sur cette machine, pour tous les dépôts :

```bash
git config --global core.symlinks true
```

Ou uniquement pour ce dépôt (si vous ne voulez pas le global) :

```bash
git config core.symlinks true
```

Vérifier :

```bash
git config --get core.symlinks
# doit afficher : true
```

### 3. Après un clone sans symlinks

Si un fichier censé être un lien vers `agent/` ne contient qu’un chemin au
lieu du contenu des règles, ou si `git checkout` affiche
`unable to create symlink ... Permission denied` :

1. Activer le **mode développeur** (étape 1) — requis sur Windows sans
   élévation administrateur.
2. Puis (adapter le chemin au dossier d’outil concerné) :

```bash
git config core.symlinks true
git checkout -f -- <dossier-des-liens-de-l-outil>
```

Ou re-cloner le dépôt après les étapes 1–2.

**Important :** tant que le mode développeur n’est pas actif, éditer et lire
les règles dans [`agent/`](../agent/) uniquement. Les fichiers-liens peuvent
n’être que le chemin cible (texte) et ne doivent pas être « réparés » en y
collant une copie du contenu Markdown.

## Vérification

### Assertion automatisée (requis après ajout / modification)

```bash
npm run check:agent-symlinks
```

Script : [`scripts/check-agent-symlinks.mjs`](../scripts/check-agent-symlinks.mjs)
(agnostique de l’outil / du fournisseur).

Il vérifie que :

- chaque `agent/*.mdc` et chaque `agent/<nom>/SKILL.md` a **au moins un**
  symlink Git (mode `120000`) quelque part dans le dépôt qui pointe vers
  lui ;
- la cible relative du symlink est correcte ;
- le contenu résolu dans le working tree correspond à la source sous
  `agent/` (échoue si le checkout Windows n’a écrit que le chemin en texte).

### Réparation après `git add .` (copies au lieu de symlinks)

Sous Windows, un hardlink / fichier plein dans le working tree fait souvent
enregistrer le **contenu** (mode `100644`) au lieu du symlink Git. Pour
réécrire l’index :

```bash
npm run fix:agent-symlinks
```

Un hook **pre-commit** sous [`.githooks/pre-commit`](../.githooks/pre-commit)
exécute la même réparation puis l’assertion. `npm install` (`prepare` →
[`scripts/install-git-hooks.mjs`](../scripts/install-git-hooks.mjs)) configure
ce clone avec :

- `core.hooksPath=.githooks`
- `core.symlinks=true` (local au dépôt)

Sans `npm install`, une fois par clone :

```bash
git config core.hooksPath .githooks
git config core.symlinks true
```

La même commande est exécutée par :

- la revue in-IDE ([`agent/ide-code-review`](../agent/ide-code-review/)) ;
- la revue PR CI ([`.github/prompts/pr-review.md`](../.github/prompts/pr-review.md)).

Contrôle manuel Git d’un lien :

```bash
git ls-files -s <chemin-du-lien>
# le mode doit être 120000 ; le blob est le chemin relatif vers agent/…
```

### Contrôle rapide dans l’éditeur

Ouvrir un lien attendu dans l’éditeur : il doit afficher le titre et le corps
de la règle ou du skill, **pas** une seule ligne de chemin vers `agent/…`.

En PowerShell (adapter le chemin au lien de l’outil) :

```powershell
Get-Item <chemin-du-lien> | Select-Object LinkType, Target
# LinkType doit être SymbolicLink ; Target doit pointer sous agent\
```

## Modifier ou ajouter des règles / skills

1. Éditer ou créer le fichier sous `agent/` uniquement.
2. Pour chaque outil qui doit charger le fichier, créer (ou mettre à jour) un
   lien symbolique **de fichier** depuis l’emplacement attendu par cet outil
   vers `agent/…`.

PowerShell, depuis la racine du dépôt :

```powershell
New-Item -ItemType SymbolicLink `
  -Path <chemin-attendu-par-l-outil>\<fichier> `
  -Target (Resolve-Path agent\<fichier>)
```

Même idée pour une **règle** (`.mdc`) ou un **skill** (`SKILL.md` dans le
dossier skill de l’outil → `agent/<skill>/SKILL.md`) : adapter les chemins au
layout de l’outil. Ne pas coller un chemin d’exemple d’un autre outil ou d’un
autre skill.

Sans privilège de symlink sous Windows, le checkout peut n’écrire que le
chemin cible en texte : activer le mode développeur puis
`git checkout -f --` sur le dossier de liens de l’outil.

3. Documenter le fichier dans [`agent/README.md`](../agent/README.md).
4. Vérifier : `npm run check:agent-symlinks` (voir aussi
   [`AGENTS.md`](../AGENTS.md)).

Ne pas remplacer un symlink par une copie du contenu : cela casse le partage
entre outils.

## Linux / macOS

`core.symlinks` est en général déjà `true`. Aucune étape Windows n’est
requise ; les clones créent des liens symboliques normaux.
