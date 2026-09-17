# Getting started

[Deutsch](getting-started.de.md)

Everything you need to run a lesson, switch to the next one and check that the
code still works.

## What you need

- **Node 22.** The version is in `.nvmrc`; with nvm, `nvm use` picks it.
- **pnpm**, installed by Node itself: `corepack enable`. The version comes from
  `packageManager` in `package.json`, so everybody gets the same one.
- **A browser** for the app, and **DoiWallet** on a phone for the lessons where
  a transaction is signed ([Google Play](https://play.google.com/store/apps/details?id=org.doichain.doiwallet),
  [App Store](https://apps.apple.com/app/doiwallet/id1579900361)).
- **Some DOI** on an address of your own, from lesson 3 on: a registration locks
  0.01 DOI in the name and pays a mining fee. Read
  [Wallet and safety](wallet-and-safety.md) before you spend anything.

## Start a lesson

```bash
git clone -b lesson01 https://github.com/Doichain/names-on-chain.git
cd names-on-chain
corepack enable && pnpm install --frozen-lockfile
pnpm dev
```

`--frozen-lockfile` installs exactly the versions in `pnpm-lock.yaml`. Without
it, a fresh install would pick newer ones, and the lesson would differ from the
text.

## Switch to the next lesson

```bash
git switch lesson02
pnpm install --frozen-lockfile
pnpm dev
```

Each lesson is a branch, and each branch contains everything of the one before
it. The [lesson texts](README.md) say what changes.

## Build and publish

```bash
pnpm run build          # writes the static site to public/
pnpm run preview        # serves that build
```

The build needs no server of its own: it works under any path, so it can live on
GitHub Pages or on IPFS. [Publish a lesson on IPFS](ipfs.md) shows how.

## Check your changes

```bash
pnpm run lint               # Prettier and ESLint
pnpm run check              # svelte-check
pnpm exec vitest run        # unit tests
pnpm exec playwright test   # the app in a browser, against a simulated server
```

The browser tests bring their own answers, so they need no network. If
Playwright's own Chromium is not installed, point `CHROMIUM_PATH` at another
Chromium.

## Common problems

- **`ERR_PNPM_UNSUPPORTED_ENGINE` or strange build errors.** Another Node
  version is in front of Node 22. `node --version` should say `v22.…`.
- **`ERR_PNPM_UNEXPECTED_STORE`.** A pnpm from somewhere else is in front of the
  one corepack manages. `corepack enable`, then `pnpm --version` should print
  the version from `package.json`.
- **The status line keeps counting attempts.** The app talks to its servers over
  WebSockets on port 50004; some networks block that.
- **The camera does not start.** Browsers allow it only on HTTPS pages and on
  `localhost`. The scan dialog lets you paste the address instead.
- **Port 5173 is busy.** `pnpm dev --port 5174` uses another one.
