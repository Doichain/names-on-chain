# Names-On-Chain

A hands-on PSBT and NameOp workshop on Doichain: register and trade names without keys in the browser.

> [!WARNING]
> The app works on Doichain mainnet with real DOI, on the chain of Doichain Core v31: its
> rules took effect at block 431,017, and at 431,018 it parted from the chain the old nodes
> kept mining. Look names and transactions up on
> [doi-explorer.le-space.de](https://doi-explorer.le-space.de), not on explorer.doichain.org.
> DoiWallet signs every transaction, so check each output there before you sign.
> Read [Wallet and safety](docs/wallet-and-safety.md) first.

**This branch: Lesson 1, talking to the chain.** The app connects to a Doichain server, checks
that the server follows the valid chain, and looks up who holds a name and until which block.

Live demo of this lesson: https://doichain.github.io/names-on-chain/lesson01/

## Start

```bash
git clone -b lesson01 https://github.com/Doichain/names-on-chain.git
cd names-on-chain
corepack enable && pnpm install --frozen-lockfile
pnpm dev
```

You need Node 22 (see `.nvmrc`). To publish a build from your own IPFS node, see [IPFS](docs/ipfs.md).

## In this lesson

- Talk to a blockchain server over a WebSocket.
- Find a name by the hash of its index script.
- Tell free, taken and expired names apart.

Step by step: [Lesson 1](docs/lessons/01-electrumx-name-lookup.md) ·
[Deutsch](docs/lessons/01-electrumx-name-lookup.de.md) ·
Next: [lesson02](https://github.com/Doichain/names-on-chain/tree/lesson02)

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
