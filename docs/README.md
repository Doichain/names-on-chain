# The workshop, page by page

[Deutsch](README.de.md)

Every page has two tracks: the text explains what happens, and the sections
called "Under the hood" give the bytes, the rules and the trust model for
readers who want them.

## Start here

- [Getting started](getting-started.md): what you need, how to start a lesson,
  how to switch to the next, how to check your changes.
- [Wallet and safety](wallet-and-safety.md): the app works with real money on
  Doichain mainnet. What to check before you sign, and what the servers see.

## The five lessons

| Lesson | The app can | App | Demo |
| --- | --- | --- | --- |
| [1 Talking to the chain](lessons/01-electrumx-name-lookup.md) | look up who holds a name and until which block | [`apps/lesson01`](../apps/lesson01) | [open](https://doichain.github.io/names-on-chain/lesson01/) |
| [2 Coins, name coins and expiry](lessons/02-utxos-name-coins-expiry.md) | show the balance and the names of an address | [`apps/lesson02`](../apps/lesson02) | [open](https://doichain.github.io/names-on-chain/lesson02/) |
| [3 A registration as a PSBT](lessons/03-name-registration-psbt.md) | build the PSBT that registers a name | [`apps/lesson03`](../apps/lesson03) | [open](https://doichain.github.io/names-on-chain/lesson03/) |
| [4 The PSBT over QR](lessons/04-psbt-over-qr-and-signing.md) | hand the PSBT to DoiWallet as an animated QR code | [`apps/lesson04`](../apps/lesson04) | [open](https://doichain.github.io/names-on-chain/lesson04/) |
| [5 Atomic name trading](lessons/05-atomic-name-trading.md) | build a purchase that pays the holder and moves the name | [`apps/lesson05`](../apps/lesson05) | [open](https://doichain.github.io/names-on-chain/lesson05/) |

## Background

- [The ideas behind it](concepts.md): chain, coins, names, PSBT and a glossary,
  for readers who come from the web.
- [Under the hood](under-the-hood.md): name scripts byte by byte, the consensus
  rules since block 431,017, fees, signatures and what you still trust.
- [Publish a lesson on IPFS](ipfs.md): build it, add it to your own node, keep it
  reachable.
- [For maintainers](maintainers.md): the workspace, what belongs in the shared
  package, the checks and how the lessons are published.

Every page here has a German twin, linked at its top.
