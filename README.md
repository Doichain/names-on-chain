# Names-On-Chain

A hands-on PSBT and NameOp workshop on Doichain: register and trade names without keys in the browser.

> [!WARNING]
> The app works on Doichain mainnet with real DOI, on the chain that is valid since block
> 431,017 (Doichain Core v31.1.5). Look names and transactions up on
> [doi-explorer.le-space.de](https://doi-explorer.le-space.de), not on explorer.doichain.org.
> DoiWallet signs every transaction, so check each output there before you sign.
> Read [Wallet and safety](docs/wallet-and-safety.md) first.

**This branch: Lesson 5, atomic name trading.** For a taken name, the app builds one transaction that
pays the holder and moves the name to the buyer, so either both happen or nothing does.

Live demo of this lesson: https://doichain.github.io/names-on-chain/lesson05/

## Start

```bash
git clone -b lesson05 https://github.com/Doichain/names-on-chain.git
cd names-on-chain
corepack enable && pnpm install --frozen-lockfile
pnpm dev
```

You need Node 22 (see `.nvmrc`). To publish a build from your own IPFS node, see [IPFS](docs/ipfs.md).

## In this lesson

- How one transaction holds both halves of a trade.
- Who signs what, and in which order.
- What a seller checks before signing the last input.

Step by step: [Lesson 5](docs/lessons/05-atomic-name-trading.md) ·
[Deutsch](docs/lessons/05-atomic-name-trading.de.md) ·
Previous: [lesson04](https://github.com/Doichain/names-on-chain/tree/lesson04)

## All lessons

| Lesson | The app can | Demo |
| --- | --- | --- |
| [1 Talking to the chain](https://github.com/Doichain/names-on-chain/tree/lesson01) | look up who holds a name and until which block | [open](https://doichain.github.io/names-on-chain/lesson01/) |
| [2 Coins, name coins and expiry](https://github.com/Doichain/names-on-chain/tree/lesson02) | show the balance and the names of an address | [open](https://doichain.github.io/names-on-chain/lesson02/) |
| [3 A registration as a PSBT](https://github.com/Doichain/names-on-chain/tree/lesson03) | build the PSBT that registers a name, with coin selection and fee | [open](https://doichain.github.io/names-on-chain/lesson03/) |
| [4 The PSBT over QR](https://github.com/Doichain/names-on-chain/tree/lesson04) | hand the PSBT to DoiWallet as an animated QR code | [open](https://doichain.github.io/names-on-chain/lesson04/) |
| [5 Atomic name trading](https://github.com/Doichain/names-on-chain/tree/lesson05) | build a purchase that pays the holder and moves the name | [open](https://doichain.github.io/names-on-chain/lesson05/) |

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
