# For maintainers

[Deutsch](maintainers.de.md)

## One branch per lesson

The lessons build on each other, and so do the branches:

```
lesson01 → lesson02 → lesson03 → lesson04 → lesson05 → main
```

Each branch contains everything of the branch before it. `main` is lesson 5 plus the workflows that publish every lesson and check links.

## Fixing something

1. Fix it on the earliest branch that has the problem, with a test if code changes.
2. Merge it forward, one branch after the other:

   ```bash
   git switch lesson02 && git merge lesson01
   git switch lesson03 && git merge lesson02
   git switch lesson04 && git merge lesson03
   git switch lesson05 && git merge lesson04
   git switch main && git merge lesson05
   ```

3. Run the checks on every branch, then push each branch with its own `git push`, `main` last. A single push of several branches starts CI for only one of them.

Three rules keep the forward merges cheap:

- **Never squash** a pull request into a lesson branch. The next forward merge would bring its changes a second time, as conflicts. Use a merge commit or a rebase.
- **Turn on rerere** with `git config rerere.enabled true`. Git then remembers how you resolved a conflict and resolves the same conflict in the next branch by itself.
- **`src/lib/components/pricing.svelte` differs in every lesson.** On a conflict there, keep the lesson's own version and apply your change to it again.

## Each branch keeps its README

Every branch has a README about its own lesson. `.gitattributes` marks `README.md` with `merge=ours`, so a forward merge keeps the README of the branch you merge into. Git needs this driver once per clone:

```bash
git config merge.ours.driver true
```

Without it, git merges READMEs like any other file, and the conflicts show up.

The lesson texts in `docs/lessons/` and the other pages in `docs/` are the same on every branch and merge forward like code.

## Texts and translations

- The app's texts live in `src/lib/i18n/en.json` and `de.json`, identical on every branch. Add a key on `lesson01` and merge it forward, even if only a later lesson uses it. `catalogue.test.js` fails when a key is missing in one language.
- Every page in `docs/` has a German twin with `.de.md`. The READMEs are English only.

## Checks

```bash
pnpm run lint               # Prettier and ESLint
pnpm run check              # svelte-check
pnpm exec vitest run        # unit tests
pnpm exec playwright test   # browser tests in Chromium, against a simulated ElectrumX
```

The browser tests also take the screenshots the lesson texts show and write them to `docs/img/`. They check the state in the picture on the way, so a screenshot that can no longer be reached fails the run instead of ageing quietly. Only a run with `SCREENSHOTS=1` writes them, so a normal run leaves the repository clean. After a visible change, run `SCREENSHOTS=1 pnpm exec playwright test screenshots` and commit what it wrote.

CI runs all four on every push to a lesson branch or `main`. The smoke tests build the app and start their own preview on port 4180. If Playwright's own Chromium is not installed, set `CHROMIUM_PATH` to another Chromium.

## Publishing

- **GitHub Pages:** every push to `main` builds all five lessons from their branch heads (`.github/workflows/pages.yml`) and publishes them under https://doichain.github.io/names-on-chain/.
- **IPFS:** the same workflow pins the site through Aleph once the repository secret `ALEPH_PRIVATE_KEY` is set. How to publish a lesson from your own node: [IPFS](ipfs.md).
- **Links:** `.github/workflows/links.yml` checks the links in the README and in `docs/` of every branch once a week.
