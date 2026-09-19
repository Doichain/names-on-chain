# For maintainers

[Deutsch](maintainers.de.md)

## One workspace, five apps

```
apps/lesson01 … apps/lesson05   one SvelteKit app per lesson
packages/doichain               what more than one lesson uses
docs/                           the lesson texts, English and German
```

A lesson app contains what that lesson teaches, and nothing else: its routes, the
Doichain code the text walks through, its own tests. Everything a later lesson
only *uses* — the ElectrumX connection, the stores, the name helpers, the small
components, the translations, the recorded server answers and the simulator the
tests speak to — lives in `@names-on-chain/doichain` and is imported from there.

That is the rule for the split:

> What a lesson teaches stays in that lesson's app. What the next lesson builds
> on moves into the package.

The package is not a hiding place. It is the sentence "you wrote this in the
lesson before" made into code, so the lesson text can point at the import.

## Fixing something

Fix it once, in the app that has the problem or in the package, with a test if
code changes. There is no forward merging any more: one file, one fix, one CI
run.

The five lesson branches are frozen, and so is `step1`, the first version of the
workshop. Each head carries a tag — `lesson01-branch-final` … `lesson05-branch-final`
and `step1-branch-final` — and a repository ruleset refuses every push, force-push
and deletion on them. They are not deleted: links of the form `…/tree/lesson03`
keep resolving, and `git log` keeps the history. The tags are what to check out
when you want to see how a lesson looked before the workspace.

## Texts and translations

- The apps' texts live in `packages/doichain/src/i18n/en.json` and `de.json` —
  one catalogue for all five apps. `catalogue.test.js` fails when a key is
  missing in one language.
- Every page in `docs/` has a German twin with `.de.md`. The README is English
  only.

## Checks

```bash
pnpm run lint                 # Prettier and ESLint, whole workspace
pnpm run check                # svelte-check, every app
pnpm -r test:unit             # unit tests: the package once, then every app
pnpm run test:integration     # browser tests, against a simulated ElectrumX
```

A single app, while you work on it:

```bash
pnpm --filter @names-on-chain/lesson03 dev
pnpm --filter @names-on-chain/lesson03 test:integration
```

Each app builds and previews on a port of its own — 4181 for lesson01 up to 4185
for lesson05 — so the five browser suites never answer each other's requests. If
Playwright's own Chromium is not installed, `pnpm --filter @names-on-chain/lesson01 exec
playwright install chromium` fetches it, or point `CHROMIUM_PATH` at another Chromium.

The browser tests also take the screenshots the lesson texts show and write them
to `docs/img/`. They check the state in the picture on the way, so a screenshot
that can no longer be reached fails the run instead of ageing quietly. Only a run
with `SCREENSHOTS=1` writes them, so a normal run leaves the repository clean.
After a visible change:

```bash
SCREENSHOTS=1 pnpm --filter @names-on-chain/lesson03 test:integration screenshots
```

CI runs lint, check, unit tests, build and the browser tests once for the whole
workspace on every push and pull request.

## Publishing

- **GitHub Pages:** every push to `main` builds all five apps and publishes
  `apps/lessonNN/public` under
  https://doichain.github.io/names-on-chain/lessonNN/
  (`.github/workflows/pages.yml`). The paths are the same as before the
  workspace.
- **IPFS:** the same workflow pins the site through Aleph once the repository
  secret `ALEPH_PRIVATE_KEY` is set. How to publish a lesson from your own node:
  [IPFS](ipfs.md).
- **Links:** `.github/workflows/links.yml` checks the links in the README and in
  `docs/` once a week.
