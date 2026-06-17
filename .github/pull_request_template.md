<!--
Thanks for contributing to DiskScope! · Merci de contribuer à DiskScope !
Fill in the sections below so reviewers can understand and verify your change.
Remplis les sections pour qu'on comprenne et vérifie ton changement.
Full guide · Guide complet: https://github.com/JoJoLaBagarre/diskscope/blob/main/CONTRIBUTING.md
-->

## What does this PR do? · Que fait cette PR ?

<!-- A clear description of the change and the problem it solves.
     Une description claire du changement et du problème résolu. -->

## Type of change · Type de changement

- [ ] 🐞 Bug fix · Correction de bug
- [ ] ✨ New feature · Nouvelle fonctionnalité
- [ ] 💥 Breaking change · Changement cassant
- [ ] ♻️ Refactor / cleanup (no behaviour change) · Refactorisation (sans changement de comportement)
- [ ] 📝 Docs / i18n only · Docs / i18n uniquement

## Related issues · Issues liées

<!-- e.g. "Closes #12". Remove if none. · ex. « Closes #12 ». Retire si aucune. -->

## How did you test it? · Comment l'as-tu testé ?

<!-- What you actually ran/clicked. A screenshot or short clip helps a lot for UI.
     Ce que tu as réellement lancé/cliqué. Une capture ou courte vidéo aide pour l'UI. -->

## Checklist · Liste de vérification

- [ ] I read the [contributing guide](https://github.com/JoJoLaBagarre/diskscope/blob/main/CONTRIBUTING.md). · J'ai lu le guide de contribution.
- [ ] My change is **focused** — one logical change per PR. · Mon changement est **ciblé** — un seul sujet par PR.
- [ ] Branched off `main`, with a clear [Conventional Commits](https://www.conventionalcommits.org/) title (`feat:`, `fix:`, `docs:`…). · Branche depuis `main`, titre en Conventional Commits.
- [ ] **Backend gates** pass, from `src-tauri/`: `cargo fmt --all -- --check` · `cargo clippy --all-targets -- -D warnings` · `cargo test`.
- [ ] **Frontend gates** pass, from the repo root: `npx tsc --noEmit` · `npm run lint` · `npm run format:check` · `npm test`.
- [ ] If I added/changed UI text, I updated **both** `src/i18n/en.ts` and `src/i18n/fr.ts`. · Texte d'interface mis à jour dans **les deux** catalogues.
- [ ] Platform-specific code keeps the IPC surface OS-agnostic (no panics / `unimplemented!`). · Le code spécifique garde l'IPC indépendant de l'OS.
- [ ] Destructive actions still confirm and show what will happen. · Les actions destructrices confirment toujours et montrent ce qui va se passer.
