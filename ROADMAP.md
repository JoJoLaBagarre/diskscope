# DiskScope — Roadmap d'améliorations

> Issu d'une revue multi-agents du code (moteur Rust, perf React, a11y, sécurité,
> UX/i18n, tests/CI). Ce document suit l'avancement : ce qui est **fait**, ce qui
> reste **à faire**, et le **backlog**.
>
> Légende impact / effort : 🟢 petit · 🟡 moyen · 🔴 large

---

## ✅ Quick wins — FAITS (2026-06-19)

Les huit quick wins identifiés ont été implémentés et vérifiés (lint, typecheck,
build, tests front + back, clippy, fmt — tous au vert).

### 1. Compilateur React 19 activé
- **Quoi** : le React Compiler (stable, v1) mémoïse automatiquement composants et
  hooks à la compilation → supprime le besoin de `React.memo`/`useMemo`/`useCallback`
  manuels sur les chemins chauds (lignes virtualisées, tuiles treemap).
- **Où** : [`vite.config.ts`](vite.config.ts) (plugin Babel `babel-plugin-react-compiler`,
  `target: "19"`), [`eslint.config.js`](eslint.config.js) (règle `react-compiler/react-compiler` en `error`),
  `package.json` (`babel-plugin-react-compiler@^1.0.0`, `eslint-plugin-react-compiler@^19.1.0-rc.2`).
- **Effet de bord corrigé** : la règle ESLint du compilateur refusant les
  `eslint-disable` de règles React, les deux `// eslint-disable-next-line
  react-hooks/exhaustive-deps` de [`LargestTable.tsx`](src/components/ScanView/LargestTable.tsx)
  et [`TreeExplorer.tsx`](src/components/ScanView/TreeExplorer.tsx) ont été retirés
  proprement en destructurant la fonction **stable** `clear` (`useSelection`) — zéro
  changement de comportement, plus de re-run parasite.
- **Vérification** : bundle de prod contient le runtime `react/compiler-runtime`
  (sentinelle `memo_cache_sentinel` présente) → le compilateur s'engage réellement.

### 2. Indicateur de focus clavier partagé (`:focus-visible`)
- **Quoi** : règle CSS commune donnant un anneau d'accent au focus clavier sur tous
  les `<button>` stylisés (`.nav-item`, `.btn`, `.btn-sm`, `.icon-btn`, `.tab`,
  `.seg-btn`, `.th`, `.crumb`, `.volume-card`). Corrige l'échec **WCAG 2.4.7**
  (focus invisible). Les champs texte sont exclus (ils ont déjà leur état de focus).
- **Où** : [`src/index.css`](src/index.css) (section « Keyboard focus ring »).

### 3. Chaîne FR codée en dur supprimée
- **Quoi** : « Analyse annulée. » était affichée en dur quelle que soit la langue.
  Remplacée par `t("picker.cancelled")` (clé déjà présente en EN/FR).
- **Où** : [`ScanView.tsx`](src/components/ScanView/ScanView.tsx) (ajout de `useTranslation`).

### 4. Annulation honorée dans les workers jwalk
- **Quoi** : le flag `cancel` n'était lu que dans la boucle consommateur ; les
  syscalls coûteux (`allocated_size` sur chaque fichier ≥ 1 MiB) tournaient sur les
  workers rayon sans jamais voir l'annulation → annulation « figée » plusieurs
  secondes sur un gros arbre. Le callback `process_read_dir` court-circuite
  désormais dès que l'annulation est demandée.
- **Où** : [`src-tauri/src/scan/walker.rs`](src-tauri/src/scan/walker.rs).

### 5. Sélection bornée top-N (au lieu d'un tri complet)
- **Quoi** : `largest()` triait *tous* les nœuds (jusqu'à plusieurs millions pour
  `ItemKind::All`) avant de tronquer. Désormais `select_nth_unstable_by` partitionne
  les `limit` plus gros en **O(n)**, puis trie seulement cette petite tranche.
- **Où** : [`src-tauri/src/scan/mod.rs`](src-tauri/src/scan/mod.rs) + 2 tests ajoutés
  (`largest_respects_limit_via_bounded_selection`, `largest_zero_limit_is_empty`).

### 6. Instances `Intl` mémoïsées dans le formatage
- **Quoi** : `formatDate`/`formatCount` reconstruisaient un `Intl.DateTimeFormat` /
  `Intl.NumberFormat` à chaque appel (chemin chaud de scroll). Désormais une
  instance par langue est mise en cache au niveau module.
- **Où** : [`src/utils/format.ts`](src/utils/format.ts).

### 7. `cargo test` exécuté sur Windows en CI
- **Quoi** : les tests de la **frontière de sécurité** de désinstallation
  (`split_commandline`, `is_valid_subkey` — rejet du path-traversal) sont sous
  `#[cfg(target_os = "windows")]` ; le runner Ubuntu les compilait *out* → ils ne
  s'exécutaient jamais. Ajout d'une étape `cargo test` sur le runner Windows.
- **Où** : [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (job `build`).

### 8. Drop déterministe du watcher FS à la fermeture
- **Quoi** : le watcher `notify` n'était remplacé qu'au scan suivant ; il gardait un
  handle OS (`ReadDirectoryChangesW`) et un clone d'`AppHandle` vivants. Teardown
  déterministe ajouté sur `RunEvent::Exit`.
- **Où** : [`src-tauri/src/lib.rs`](src-tauri/src/lib.rs) (`build()` + `app.run(|…|)`).

---

## 🟡 Haute valeur

### ✅ FAITS (2026-06-19)

7 des 9 items réalisés et vérifiés (tsc, eslint, build, tests front 7/7, `cargo test`
32/32, clippy, fmt — tous au vert).

- [x] **`getItemKey` basé sur `entry.id`** dans `VirtualTable` — clé d'identité (et non
  d'index) pour React + le virtualizer, donc tri/suppression ré-associent le bon DOM.
  Câblé sur les 3 tables. → [`VirtualTable.tsx`](src/components/common/VirtualTable.tsx),
  `LargestTable.tsx`, `TreeExplorer.tsx`, `SearchView.tsx`.
- [x] **Taille sélectionnée incrémentale** dans `useSelection` — `Map<id, size>` + somme
  bornée à la sélection (au lieu de re-réduire toutes les lignes, jusqu'à 100k, à chaque
  clic). → [`useSelection.ts`](src/hooks/useSelection.ts).
- [x] **Découplage du hover treemap** — la teinte de survol passe en CSS pur (`.tile:hover`),
  le tableau de tuiles SVG ne dépend plus de l'état `hover` → plus de réconciliation au
  survol. → [`Treemap.tsx`](src/components/Treemap/Treemap.tsx), `index.css`.
- [x] **Recherche tenant compte du chemin** — scoring du basename d'abord, repli sur le
  chemin complet sinon (les hits de nom priment toujours). + 2 tests.
  → [`src-tauri/src/search/mod.rs`](src-tauri/src/search/mod.rs).
- [x] **Vue de répartition par type de fichier** — onglet « Par type » : agrégation des
  fichiers par extension (count + taille + part), commande Rust `extension_breakdown`
  (bornée top-N, + 2 tests). → `ExtensionTable.tsx`, `scan/mod.rs`, `commands.rs`.
- [x] **Export CSV / JSON** — bouton « Exporter » + dialog save (format selon l'extension
  choisie), commande Rust `export_scan` (échappement CSV RFC-4180, écriture off-thread).
  → `ScanResults.tsx`, `commands.rs`, `api/tauri.ts`.
- [x] **Régions live ARIA** — `role="status"`/`aria-live` sur le compteur de recherche, la
  complétion de scan (sr-only) et la progression de corbeille (WCAG 4.1.3).
  → `SearchView.tsx`, `ScanResults.tsx`, `ScanProgress.tsx`, `TrashProgressModal.tsx`.

### ⏳ RESTE (différés — entrelacés/risqués, à faire dans une passe dédiée)

- [ ] **Erreurs Rust mappées vers l'i18n** 🟡 — transversal : touche **chaque** commande
  + chaque site d'affichage (`useScan`, `SearchView`, `AppsView`…) et l'événement
  `scan://error`. Demande de basculer les `Result<_, String>` vers des **codes d'erreur**
  stables mappés côté front. À faire d'un bloc pour rester cohérent.
  > Note : les 2 nouvelles commandes (`export_scan`, `extension_breakdown`) renvoient déjà
  > des codes ASCII (`no_scan_loaded`) et leurs erreurs sont affichées via un toast traduit,
  > donc elles sont déjà prêtes pour cette migration.
- [ ] **Filtres d'exclusion / ignore** 🟡 — le plus délicat : le **cache de scan est keyé
  par le seul chemin racine** ([`cache.rs`](src-tauri/src/scan/cache.rs)). Ajouter des
  exclusions change les résultats sans changer la clé → un `try_load_cache` rendrait des
  résultats non filtrés. Demande d'intégrer les exclusions à la clé de cache (ou de
  désactiver le cache quand des exclusions sont actives) + UI d'options. À traiter avec
  la refonte cache.

> Note : le compilateur React (quick win 1) couvre déjà la mémoïsation de `EntryRow`/
> `SearchHitRow` (automatique) ; la règle ESLint signalera tout composant chaud qui bail-out.

---

## 🔴 Gros chantiers — backlog

- [ ] **Sémantique accessible de la table virtuelle** 🔴 — rôles grid/list,
  `aria-rowcount`/`aria-rowindex`, roving tabindex, activation clavier (échecs WCAG
  1.3.1 + 2.1.1). → `VirtualTable.tsx`, `TreeExplorer.tsx`, `EntryRow.tsx`.
- [ ] **Réduire l'empreinte mémoire sur arbres géants** 🔴 — `HashMap<PathBuf,usize>`
  + `PathBuf` possédé par chaque `Node` stockent chaque chemin deux fois. Résoudre les
  liens parent pendant la traversée + ne garder que `name` → ~÷2 RAM crête.
- [ ] **Historique de scans + comparaison dans le temps** 🔴 — les scans sont déjà
  cachés sur disque mais jamais énumérés (capacité cœur TreeSize/WizTree).
- [ ] **Énumération apps Store all-users + launchers de jeux** 🔴 — manquent les
  paquets Store provisionnés, Steam/Epic/GOG, l'estimation de taille MSIX.

---

## ⚪ Polish — backlog

- [ ] `prefers-reduced-motion` (annuler spin/indeterminate/fade).
- [ ] États ARIA des bascules : `aria-sort` (en-têtes), `aria-current` (nav), `aria-selected` (tabs).
- [ ] Navigation treemap vers le haut (Backspace/Escape → niveau parent).
- [ ] Vraie pluralisation via `Intl.PluralRules` (au lieu des suffixes `(s)`/`(e)`).
- [ ] Cache versionné + écriture atomique (tmp+rename) + validation `mtime` au restore.
- [ ] Dédup des hardlinks (`HashSet<(dev,ino)>` sur Unix).
- [ ] Skip explicite des reparse points Windows (`FILE_ATTRIBUTE_REPARSE_POINT`).
- [ ] Restreindre `opener:default` à `allow-reveal-item-in-dir` + `open-url` scopé github.com.
- [ ] Action « Ouvrir » sur `EntryRow`/`SearchHitRow` (en plus de Reveal/Trash).
- [ ] Comparateur de tri par nom sans allocation (plus de double `to_lowercase()`).
- [ ] Double-check sous write lock dans `ensure_index` (évite le double build concurrent).
- [ ] `useUpdate` dans un provider unique (supprime la double vérification réseau).
- [ ] Test fonctionnel du walker sur un arbre temp réel (`tempfile`).
- [ ] Test de parité des placeholders i18n EN/FR + couverture d'`interpolate`.

---

## Notes techniques

- **Vérifications passées localement** : `npm run build` (tsc + vite, compilateur
  inclus), `npm run test` (7/7), `npx eslint .` (0 erreur), `cargo test` (28/28, dont
  les tests sécurité Windows-gated), `cargo clippy --all-targets -D warnings` (0),
  `cargo fmt --check` (0).
- **Pré-existant, hors périmètre des quick wins** :
  - `npm audit --audit-level=high` remonte une vuln **high** dans `vite`/`esbuild`/
    `launch-editor` (non liée aux ajouts ci-dessus). À traiter via un bump `vite`.
  - `prettier --check .` échoue sur des fichiers non touchés ici (`.github/ISSUE_TEMPLATE/*.yml`,
    `Sidebar.tsx`) — conséquence du `.prettierrc.json` modifié dans le working tree.
    Lancer `npx prettier --write .` une fois la config figée.
