# Contributing to DiskScope · Contribuer à DiskScope

🌍 **[English](#english) · [Français](#français)**

DiskScope is a Tauri 2 desktop app (Rust backend + React/TypeScript frontend) for
disk-space analysis, fuzzy search and app uninstallation. Whether you found a bug,
have an idea, or want to write code — thank you, contributions are welcome! 🙌

---

## English

### Ways to contribute

- 🐞 **Report a bug** — something broken or behaving unexpectedly.
- 💡 **Suggest a feature** — an idea that fits DiskScope's scope (disk analysis,
  search, uninstall).
- 🌐 **Improve translations** — the UI ships in English and French.
- 📝 **Improve the docs** — typos, unclear steps, missing info.
- 🔧 **Submit code** — fixes and features via a pull request.

Please be respectful and constructive in issues, PRs and reviews. We want this to
be a friendly place to contribute.

### 🐞 Reporting a bug

**Before opening an issue:**

1. **Update to the latest release** — the bug may already be fixed. The current
   version is shown in the app's **About** tab.
2. **Search [existing issues](https://github.com/JoJoLaBagarre/diskscope/issues)**
   (open *and* closed) — someone may have reported it already. If so, add your
   details to that thread with a 👍 instead of opening a duplicate.

**A good bug report includes:**

- **DiskScope version** (from the About tab) and how you installed it
  (MSI / NSIS `.exe` / AppImage / `.deb` / `.rpm` / `.dmg`).
- **OS and version** — e.g. *Windows 11 23H2*, *macOS 14*, *Ubuntu 24.04*.
- **Steps to reproduce**, numbered: what you clicked / scanned, in order.
- **Expected vs. actual** — what you thought would happen, and what happened.
- **Screenshots or a short screen recording** for anything visual.
- **Logs** — launch DiskScope from a terminal with debug logging and paste the
  relevant lines:

  ```bash
  # macOS / Linux
  RUST_LOG=diskscope=debug /path/to/DiskScope
  ```

  ```powershell
  # Windows (PowerShell)
  $env:RUST_LOG = "diskscope=debug"; & "C:\path\to\DiskScope.exe"
  ```

> 🔒 **Security bugs are different.** DiskScope can delete files, empty the Recycle
> Bin and run uninstallers with elevation — please **do not** open a public issue.
> Follow the private process in [SECURITY.md](SECURITY.md) instead.

### 💡 Suggesting a feature

1. **Search existing requests** first to avoid duplicates.
2. Describe the **problem or motivation**, not only the solution — *what* are you
   trying to achieve and *why*?
3. Propose a **solution** and any **alternatives** you considered.
4. Keep DiskScope's **scope** in mind: it's a focused disk-analysis / search /
   uninstall tool, not a general file manager.

### 🔧 Submitting a pull request

1. **Fork** the repo and create a branch off `main`:

   ```bash
   git checkout -b feat/short-description   # or fix/…, docs/…, chore/…
   ```

2. **Keep the PR focused** — one concern per PR. Small, reviewable PRs get merged
   faster than large ones touching everything.
3. **Touch both i18n catalogs** if you add UI text: a key in `src/i18n/en.ts`
   *and* `src/i18n/fr.ts` (see [Adding UI strings](#adding-ui-strings-i18n)). The
   build fails if a key is missing.
4. **Run the quality gates** locally (see below) — CI runs them on Windows, Linux
   and macOS, so green-locally saves a round-trip.
5. **Write clear commits.** We use
   [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`,
   `docs:`, `chore:`, `build:`, `refactor:`, `test:`.
6. **Open the PR against `main`** and fill in the description:
   - **what** changed and **why**,
   - **how you verified** it (commands run, manual testing),
   - **link the issue** it resolves (`Closes #123`).
7. A maintainer will review. Push follow-up commits to address feedback — no need
   to force-push or squash; the PR is squash/merged on landing.

### Dev setup

```bash
npm install
npm run tauri dev      # hot-reloading dev window
```

### Quality gates

Your change must pass all of these (CI enforces them across Windows / Ubuntu / macOS):

```bash
# Backend (run from src-tauri/)
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test

# Frontend (run from the repo root)
npx tsc --noEmit       # type-check
npm run lint           # ESLint
npm run format:check   # Prettier
npm test               # Vitest
```

Handy fixers: `npm run format` (Prettier write) and `cargo fmt --all`.

### Project layout

```
src-tauri/        Rust backend
  src/
    commands.rs   IPC command surface (the one API the frontend calls)
    scan/         disk traversal, size tree, cache
    search/       fuzzy index + filesystem watcher
    apps/         installed-app enumeration + uninstall (per-OS behind cfg)
    platform/     OS abstractions (allocated size, recycle bin)
    state.rs      shared app state (lock-guarded scan/search)
src/              React + TypeScript frontend
  i18n/           string catalogs (en = source of truth, fr = typed mirror)
  hooks/          useScan, useSearch, useApps, useTrash, useSettings, …
  components/     one folder per view + shared common/
  api/tauri.ts    typed wrappers around invoke()/listen()
```

The **IPC boundary is identical on every OS**: platform specifics live in Rust
behind `cfg(target_os = …)`; the frontend calls one API. Unsupported actions
return a clear message — never `unimplemented!` or a panic.

### Adding UI strings (i18n)

1. Add the key + English text to `src/i18n/en.ts` (the source of truth).
2. Add the matching French text to `src/i18n/fr.ts`. The compiler fails if a key
   is missing — `fr.ts` is typed as `Record<TranslationKey, string>`.
3. Use it via `const { t } = useTranslation();` → `t("your.key")`. Use
   `{placeholder}` tokens for interpolation and `useFormat()` for locale-aware
   sizes / counts / dates.

### Conventions

- Keep the IPC surface OS-agnostic; push platform code behind `cfg`.
- Destructive actions always confirm and show exactly what will happen.
- Prefer reusing existing hooks / components over adding new ones.
- Slow background work (scan, batch delete) runs on a thread and streams progress
  via Tauri events — don't block the IPC thread or hold a write lock across
  syscalls.

---

## Français

DiskScope est une application de bureau Tauri 2 (backend Rust + frontend
React/TypeScript) pour l'analyse de l'espace disque, la recherche floue et la
désinstallation d'applications. Que tu aies trouvé un bug, une idée, ou que tu
veuilles écrire du code — merci, les contributions sont les bienvenues ! 🙌

### Comment contribuer

- 🐞 **Signaler un bug** — quelque chose de cassé ou au comportement inattendu.
- 💡 **Proposer une fonctionnalité** — une idée qui entre dans le périmètre de
  DiskScope (analyse disque, recherche, désinstallation).
- 🌐 **Améliorer les traductions** — l'interface est en anglais et en français.
- 📝 **Améliorer la documentation** — fautes, étapes floues, infos manquantes.
- 🔧 **Proposer du code** — corrections et fonctionnalités via une pull request.

Merci de rester respectueux et constructif dans les issues, PRs et revues. On veut
que ce soit un endroit agréable où contribuer.

### 🐞 Signaler un bug

**Avant d'ouvrir une issue :**

1. **Mets à jour vers la dernière version** — le bug est peut-être déjà corrigé.
   La version actuelle est affichée dans l'onglet **À propos** de l'application.
2. **Cherche dans les
   [issues existantes](https://github.com/JoJoLaBagarre/diskscope/issues)**
   (ouvertes *et* fermées) — quelqu'un l'a peut-être déjà signalé. Si oui, ajoute
   tes détails à ce fil avec un 👍 plutôt que d'ouvrir un doublon.

**Un bon rapport de bug contient :**

- **La version de DiskScope** (onglet À propos) et comment tu l'as installée
  (MSI / `.exe` NSIS / AppImage / `.deb` / `.rpm` / `.dmg`).
- **L'OS et sa version** — ex. *Windows 11 23H2*, *macOS 14*, *Ubuntu 24.04*.
- **Les étapes pour reproduire**, numérotées : ce que tu as cliqué / scanné, dans
  l'ordre.
- **Attendu vs. obtenu** — ce que tu pensais qu'il se passerait, et ce qui s'est
  réellement passé.
- **Captures d'écran ou une courte vidéo** pour tout ce qui est visuel.
- **Les logs** — lance DiskScope depuis un terminal avec les logs de débogage et
  colle les lignes pertinentes :

  ```bash
  # macOS / Linux
  RUST_LOG=diskscope=debug /chemin/vers/DiskScope
  ```

  ```powershell
  # Windows (PowerShell)
  $env:RUST_LOG = "diskscope=debug"; & "C:\chemin\vers\DiskScope.exe"
  ```

> 🔒 **Les failles de sécurité, c'est différent.** DiskScope peut supprimer des
> fichiers, vider la corbeille et lancer des désinstalleurs avec élévation —
> merci de **ne pas** ouvrir d'issue publique. Suis plutôt la procédure privée
> décrite dans [SECURITY.md](SECURITY.md).

### 💡 Proposer une fonctionnalité

1. **Cherche d'abord** dans les demandes existantes pour éviter les doublons.
2. Décris le **problème ou la motivation**, pas seulement la solution — *quoi*
   essaies-tu d'accomplir, et *pourquoi* ?
3. Propose une **solution** et les **alternatives** envisagées.
4. Garde en tête le **périmètre** de DiskScope : un outil ciblé d'analyse /
   recherche / désinstallation, pas un gestionnaire de fichiers généraliste.

### 🔧 Ouvrir une pull request

1. **Forke** le dépôt et crée une branche depuis `main` :

   ```bash
   git checkout -b feat/courte-description   # ou fix/…, docs/…, chore/…
   ```

2. **Garde la PR ciblée** — un seul sujet par PR. Les petites PRs faciles à relire
   sont fusionnées plus vite que les grosses qui touchent à tout.
3. **Modifie les deux catalogues i18n** si tu ajoutes du texte d'interface : une
   clé dans `src/i18n/en.ts` *et* `src/i18n/fr.ts` (voir
   [Ajouter des textes d'interface](#ajouter-des-textes-dinterface-i18n)). Le
   build échoue si une clé manque.
4. **Lance les contrôles qualité** en local (voir plus bas) — la CI les exécute
   sur Windows, Linux et macOS, alors « vert en local » t'évite un aller-retour.
5. **Écris des commits clairs.** On utilise les
   [Conventional Commits](https://www.conventionalcommits.org/) : `feat:`, `fix:`,
   `docs:`, `chore:`, `build:`, `refactor:`, `test:`.
6. **Ouvre la PR vers `main`** et remplis la description :
   - **quoi** a changé et **pourquoi**,
   - **comment tu l'as vérifié** (commandes lancées, tests manuels),
   - **lie l'issue** résolue (`Closes #123`).
7. Un mainteneur relira. Pousse des commits de suivi pour répondre aux retours —
   pas besoin de force-push ni de squash ; la PR est squash/mergée à la fin.

### Installation pour le développement

```bash
npm install
npm run tauri dev      # fenêtre de dev avec rechargement à chaud
```

### Contrôles qualité

Ton changement doit passer tous ces contrôles (la CI les impose sur Windows /
Ubuntu / macOS) :

```bash
# Backend (depuis src-tauri/)
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test

# Frontend (depuis la racine du dépôt)
npx tsc --noEmit       # vérification de types
npm run lint           # ESLint
npm run format:check   # Prettier
npm test               # Vitest
```

Correcteurs pratiques : `npm run format` (écriture Prettier) et `cargo fmt --all`.

### Structure du projet

```
src-tauri/        Backend Rust
  src/
    commands.rs   Surface de commandes IPC (l'unique API appelée par le front)
    scan/         Parcours disque, arbre des tailles, cache
    search/       Index flou + surveillance du système de fichiers
    apps/         Énumération + désinstallation d'apps (par OS derrière cfg)
    platform/     Abstractions OS (taille allouée, corbeille)
    state.rs      État partagé (scan/search protégés par verrou)
src/              Frontend React + TypeScript
  i18n/           Catalogues de chaînes (en = source de vérité, fr = miroir typé)
  hooks/          useScan, useSearch, useApps, useTrash, useSettings, …
  components/     Un dossier par vue + common/ partagé
  api/tauri.ts    Wrappers typés autour de invoke()/listen()
```

La **frontière IPC est identique sur tous les OS** : les spécificités de plateforme
vivent en Rust derrière `cfg(target_os = …)` ; le front appelle une seule API. Les
actions non prises en charge renvoient un message clair — jamais `unimplemented!`
ni un panic.

### Ajouter des textes d'interface (i18n)

1. Ajoute la clé + le texte anglais dans `src/i18n/en.ts` (la source de vérité).
2. Ajoute le texte français correspondant dans `src/i18n/fr.ts`. Le compilateur
   échoue si une clé manque — `fr.ts` est typé `Record<TranslationKey, string>`.
3. Utilise-la via `const { t } = useTranslation();` → `t("ta.cle")`. Emploie des
   jetons `{placeholder}` pour l'interpolation et `useFormat()` pour les tailles /
   nombres / dates adaptés à la langue.

### Conventions

- Garde la surface IPC indépendante de l'OS ; mets le code spécifique derrière `cfg`.
- Les actions destructrices confirment toujours et montrent exactement ce qui va
  se passer.
- Préfère réutiliser les hooks / composants existants plutôt qu'en ajouter.
- Le travail de fond lent (scan, suppression en lot) tourne sur un thread et diffuse
  sa progression via des événements Tauri — ne bloque pas le thread IPC et ne garde
  pas un verrou en écriture pendant un appel système.
