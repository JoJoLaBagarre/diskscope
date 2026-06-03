<!--
Thanks for contributing to DiskScope! Fill in the sections below so reviewers
can understand and verify your change quickly. See CONTRIBUTING.md for the full
guide.
-->

## What does this PR do?

<!-- A clear, concise description of the change and the problem it solves. -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that changes existing behavior)
- [ ] Refactor / cleanup (no behavior change)
- [ ] Docs / i18n only

## Related issues

<!-- e.g. "Closes #12". Remove if none. -->

## How did you test it?

<!-- Describe what you actually ran/clicked. For UI changes, a screenshot or
short clip helps a lot. -->

## Checklist

- [ ] I read [CONTRIBUTING.md](../blob/main/CONTRIBUTING.md).
- [ ] My change is focused (one logical change per PR).
- [ ] Backend gates pass: `cargo fmt --all -- --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test` (in `src-tauri/`).
- [ ] Frontend typecheck passes: `npx tsc --noEmit`.
- [ ] If I added/changed UI text, I updated **both** `src/i18n/en.ts` and `src/i18n/fr.ts`.
- [ ] If I touched platform-specific code, I kept the IPC surface OS-agnostic (no panics / `unimplemented!`).
- [ ] Destructive actions still confirm and show what will happen.
