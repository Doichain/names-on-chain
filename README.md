# Names-On-Chain 
# A Doichain - PSBT Workshop

## Description
This workshop in five lessons shows how to look up, register and trade Doichain names.
The app builds the NameOp transactions as PSBTs and hands them over as animated QR codes;
DoiWallet signs and sends them. No private key is needed in the browser.

> [!WARNING]
> The app works on Doichain mainnet with real DOI, on the chain that is valid since block
> 431,017 (Doichain Core v31.1.5). Look names and transactions up on
> [doi-explorer.le-space.de](https://doi-explorer.le-space.de), not on explorer.doichain.org.
> DoiWallet signs every transaction, so check each output there before you sign.
> Read [Wallet and safety](docs/wallet-and-safety.md) first.

Live demo of this lesson: https://doichain.github.io/names-on-chain/lesson02/

## Lesson 1)
0. Clone this repo, then run `corepack enable` and `pnpm install --frozen-lockfile` (Node 22, see `.nvmrc`)
1. Connect to ElectrumX in src/routes/+layout.js
2. Validate name to be registered in src/lib/components/pricing.svelte
   - is name already registered? 
   - if yes - which address?
3. Build the project and add it to your local IPFS node ([how](docs/ipfs.md))
```
pnpm run build
ipfs add -r -Q --cid-version=1 public
```
4. Open http://localhost:8080/ipfs/{CID}/ with the CID that `ipfs add` printed, or
   see our version: https://doichain.github.io/names-on-chain/lesson01/
5. Checkout branch lesson02)

## Goal of this lesson
1. How to connect to Electrumx via secure websocket (wss) 
   a) src/lib/doichain/connectElectrum.js
   b) understanding the Electrum API https://electrum.readthedocs.io/en/latest/protocol.html
   c) (optionally) setting up a Doichain Node and an ElectrumX Node with SSL

2. NameOps, NameId, NameValue, Recipient (owner) 
   a) src/lib/doichain/nameShow.js
   b) what is a UTXO (unspent transaction output) 
   c) what are inputs and outputs of a transaction
   b) response of a nameShow command (tx history of the nameOp)

## Lesson 2)
1. Add an address input below the name input 
   - src/lib/components/pricing.svelte
2. Gather UTXOs and NameOps of this address (show name and expiration)
   - src/lib/doichain/utxoHelpers.js
3. Add an QR-Code scanner to scan an address
   - use src/lib/doichain/ScanModal.svelte
4. Show registered NameOps with expiration block
   - src/lib/components/pricing.svelte
5. Build the project and add it to your local IPFS node ([how](docs/ipfs.md))
```
pnpm run build
ipfs add -r -Q --cid-version=1 public
```
6. Open http://localhost:8080/ipfs/{CID}/ with the CID that `ipfs add` printed, or
   see our version: https://doichain.github.io/names-on-chain/lesson02/
7. Checkout branch lesson03)

## Goal of this lesson
1. Understanding UTXOS
2. Scanning address-QR-Codes from DoiWallet
3. Understanding expiration