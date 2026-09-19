# Lesson 2: Coins, name coins and expiry

[Deutsch](02-utxos-name-coins-expiry.de.md) · App [`apps/lesson02`](../../apps/lesson02) · [Live demo](https://doichain.github.io/names-on-chain/lesson02/) · Previous: [Lesson 1](01-electrumx-name-lookup.md) · Next: [Lesson 3](03-name-registration-psbt.md)

Below the name, the app gets an address field. For an address it shows the balance and the names the address holds, each with the block at which it expires.

![The app with an address entered: below the field the balance, and under it the name the address holds with the block until which it is valid](../img/lesson02.png)

## What you learn

- What UTXOs are: the separate coins an address owns.
- How a server finds the coins of an address, and how a coin that holds a name differs from an ordinary one.
- How to read an address from a QR code, or take it pasted.

## What you bring along

From lesson 1, imported rather than copied:

- `@names-on-chain/lesson01/doichain/nameShow.js` — who holds a name, and until which
  block.
- `@names-on-chain/lesson01/doichain/nameDoi.js` — the coins of an address.

New in `apps/lesson02`: `addressValidation.js`, which lessons 3 to 5 import from here.
`nameValidation.js` and `utxoHelpers.js` change in this lesson, so this app has its own.

## Start

```bash
pnpm --filter @names-on-chain/lesson02 dev
```

## Checkpoint

- Enter a Doichain address from DoiWallet: `M…` or `N…` (P2PKH) or `dc1q…` (P2WPKH). A wrong or Bitcoin address is marked as invalid.
- Below the field you see **Balance: … DOI, coins locked in names included**.
- If the address holds names, each shows up with the block at which it expires, or as expired, or as not in a block yet.
- The scan button next to the field opens a dialog. It reads a QR code with the camera; without a camera it says why and lets you paste the address. A scanned `doichain:` payment link becomes the bare address.

## How it works

### 1. An address is an output script

`isAddressOf` in `apps/lesson02/src/lib/doichain/addressValidation.js` turns the text into the output script it stands for, with `address.toOutputScript` from doichainjs-lib. That checks the checksum, the prefix of the network and the address type in one go. `cleanAddressInput` strips spaces and a `doichain:` payment link.

### 2. The coins of an address

`getUTXOSFromAddress` in `nameDoi.js` hashes that output script with SHA-256 and asks `blockchain.scripthash.listunspent` for the unspent outputs, the coins. For each coin it loads the transaction that created it, because only there can it see whether the coin carries a name.

### 3. Coins and name coins

`getUtxosAndNamesOfAddress` in `utxoHelpers.js` sorts them: coins without a name go to the list of spendable coins, coins with a name operation become the list of names. The balance adds up both.

### 4. Expiry

`pricing.svelte` shows each name with `nameExpiry`: valid until the block of its last operation plus 36,000, how many blocks are left, expired, or still waiting for a block. The newest block comes from the server's header subscription and updates on its own.

## Exercise

- Show "about D days left" next to each name, at ten minutes per block.
- The network is fixed to mainnet in several places. Find every use of `DOICHAIN` that should use the `network` store instead, so the lesson could run on regtest.

<details>
<summary><strong>Under the hood</strong></summary>

- **Two kinds of address.** A P2PKH address (`M…`, `N…`) stands for `76 a9 14 <20 bytes> 88 ac`: `OP_DUP OP_HASH160 <hash of the public key> OP_EQUALVERIFY OP_CHECKSIG`. A P2WPKH address (`dc1q…`) stands for `00 14 <20 bytes>`: a SegWit version 0 program. Doichain has no Taproot; a `dc1p…` address is refused.
- **Script hash.** The server indexes each output script under its SHA-256 hash in reverse byte order, the same scheme lesson 1 used for names.
- **swartz and DOI.** Amounts on chain are integers in swartz; 1 DOI = 100,000,000 swartz. The app converts only for display.
- **Locked, not burned.** A registration puts 0.01 DOI into the name's output. The coin stays yours and moves with the name when you update or sell it. It cannot be spent on its own, and once the name expires it can no longer be spent at all.
- **Regtest.** On regtest a name expires after 30 blocks, so expiry can be tried out in minutes.

</details>

## Common problems

- **"This is not a valid Doichain address."** The address belongs to another network, has a typo, or is a Taproot address.
- **The camera does not start.** Browsers allow the camera only on HTTPS pages and on `localhost`. Paste the address instead.
