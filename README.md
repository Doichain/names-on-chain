# Names-On-Chain

A hands-on PSBT and NameOp workshop on Doichain: register and trade names without keys in the browser.

> [!WARNING]
> The app works on Doichain mainnet with real DOI, on the chain of Doichain Core v31: its
> rules took effect at block 431,017, and at 431,018 it parted from the chain the old nodes
> kept mining. Look names and transactions up on
> [doi-explorer.le-space.de](https://doi-explorer.le-space.de), not on explorer.doichain.org.
> DoiWallet signs every transaction, so check each output there before you sign.
> Read [Wallet and safety](docs/wallet-and-safety.md) first.

**One repository, five apps.** Every lesson is an app of its own under `apps/`. The plumbing
no lesson teaches – the connection, the stores, the name helpers, the shared components and
the recorded server answers the tests speak to – lives in `packages/doichain`. Everything a
lesson teaches stays in that lesson's app, and the next lesson imports it from there:
`import { feeRateFor } from '@names-on-chain/lesson03/doichain/fees.js'`. A lesson app
therefore holds exactly what that lesson adds or changes.

Live demos of all lessons: https://doichain.github.io/names-on-chain/

## Start

```bash
git clone https://github.com/Doichain/names-on-chain.git
cd names-on-chain
corepack enable && pnpm install --frozen-lockfile
pnpm --filter @names-on-chain/lesson01 dev     # or lesson02 … lesson05
```

You need Node 22 (see `.nvmrc`). `pnpm run build` builds all five apps, `pnpm -r test:unit`
runs every unit test, `pnpm run test:integration` every browser test. To publish a build from
your own IPFS node, see [IPFS](docs/ipfs.md).

## The layout

```
apps/lesson01 … lesson05   one SvelteKit app per lesson, each with its own tests
packages/doichain          what more than one lesson uses, including the test simulator
docs/                      the lesson texts, in English and German
```

## All lessons

| Lesson | The app can | Demo |
| --- | --- | --- |
| [1 Talking to the chain](apps/lesson01) | look up who holds a name and until which block | [open](https://doichain.github.io/names-on-chain/lesson01/) |
| [2 Coins, name coins and expiry](apps/lesson02) | show the balance and the names of an address | [open](https://doichain.github.io/names-on-chain/lesson02/) |
| [3 A registration as a PSBT](apps/lesson03) | build the PSBT that registers a name, with coin selection and fee | [open](https://doichain.github.io/names-on-chain/lesson03/) |
| [4 The PSBT over QR](apps/lesson04) | hand the PSBT to DoiWallet as an animated QR code | [open](https://doichain.github.io/names-on-chain/lesson04/) |
| [5 Atomic name trading](apps/lesson05) | build a purchase that pays the holder and moves the name | [open](https://doichain.github.io/names-on-chain/lesson05/) |

## More

- [All pages of the workshop](docs/README.md) · [Deutsch](docs/README.de.md)
- [Getting started](docs/getting-started.md) · [Deutsch](docs/getting-started.de.md)
- [Wallet and safety](docs/wallet-and-safety.md) · [Deutsch](docs/wallet-and-safety.de.md)
- [The ideas behind it](docs/concepts.md) · [Deutsch](docs/concepts.de.md)
- [Under the hood](docs/under-the-hood.md) · [Deutsch](docs/under-the-hood.de.md)
- [Publish a lesson on IPFS](docs/ipfs.md) · [Deutsch](docs/ipfs.de.md)
- [For maintainers](docs/maintainers.md) · [Deutsch](docs/maintainers.de.md)
- DoiWallet: [Google Play](https://play.google.com/store/apps/details?id=org.doichain.doiwallet) ·
  [App Store](https://apps.apple.com/app/doiwallet/id1579900361) · [source code](https://github.com/Doichain/DoiWallet)
- [Issues](https://github.com/Doichain/names-on-chain/issues) · [MIT License](LICENSE)
