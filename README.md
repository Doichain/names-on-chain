# Names-On-Chain 
# A Doichain - PSBT Workshop

## Description
This workshop in five lessons shows how to look up, register and trade Doichain names.
The app builds the NameOp transactions as PSBTs and hands them over as animated QR codes;
DoiWallet signs and sends them. No private key is needed in the browser.

Live demo of this lesson: https://doichain.github.io/names-on-chain/lesson05/

## Lesson 1)
0. Clone this repo and run ```npm i``` 
1. Connect to ElectrumX in src/routes/+layout.js
2. Validate name to be registered in src/lib/components/pricing.svelte
   - is name already registered? 
   - if yes - which address?
3. Build project and add to local ipfs node
```
npm run build
mv public lesson01 
ipfs add lesson01/
```
4. Run Brave browser and open ipfs url: ipfs://{cid of your ipfs add command} or
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
5. Build project and add to local ipfs node
```
npm run build
mv public lesson02
ipfs add -r lesson02
```
4. Run Brave browser and open ipfs url: ipfs://{cid of your ipfs add command} (or see our version: https://doichain.github.io/names-on-chain/lesson02/)
5. Checkout branch lesson03)

## Goal of this lesson
1. Understanding UTXOS
2. Scanning address-QR-Codes from DoiWallet
3. Understanding expiration

### Lesson 3)
1. Adding a feature box
   - src/lib/components/pricing.svelte
2. Adding a transaction calculation box (locked amount, mining fee, what leaves your coins, change)
   - src/lib/components/pricing.svelte
3. Generating a PSBT (partially signed Bitcoin transaction)
   - src/lib/components/pricing.svelte

### Lesson 4)
1. Implementing QR code generation for PSBTs
   - src/lib/components/pricing.svelte
2. Adding support for BBQR and BCUR formats
   - src/lib/components/pricing.svelte
3. Creating an animated QR code display
   - src/lib/components/pricing.svelte
4. Handling transaction signing and error cases
   - src/lib/doichain/signTransaction.js
5. Updating the UI to display transaction details and QR codes
   - src/lib/components/pricing.svelte

## Goal of this lesson
1. Understanding different QR code formats for cryptocurrency transactions (BBQR and BCUR)
2. Implementing animated QR codes for improved user experience
3. Handling and displaying transaction details in the UI
4. Error handling in transaction creation and QR code generation

## Steps to complete
1. Add QR code generation logic using BBQR and BCUR formats
2. Create functions for animating QR codes (`displayQrCodes` and `animateQrCodes`)
3. Update the reactive block to handle transaction signing and QR code generation
4. Modify the UI to display transaction details and the generated QR code
5. Implement error handling for transaction creation and QR code generation
6. Test the functionality with various inputs and edge cases

## Key concepts
- PSBT (Partially Signed Bitcoin Transactions)
- QR code formats for cryptocurrency transactions (BBQR and BCUR)
- Animated QR codes for multi-part data
- Reactive programming in Svelte
- Error handling in asynchronous operations

### Lesson 5) Marketplace

A name can change hands between people who do not trust each other: one transaction pays the seller and moves the name to the buyer, so either both happen or nothing does. Namecoin calls this [atomic name trading](https://www.namecoin.org/docs/name-owners/atomic-name-trading/). This lesson builds such a transaction as a PSBT and hands it to the wallet as a QR code.

The app uses the original bitcoinjs-lib. The PSBTs are signed in DoiWallet, a fork of BlueWallet whose bitcoinjs-lib fork understands name scripts.

#### How a purchase works

1. Enter a name. If it is taken, the app shows its owner and the block until which it is theirs.
2. Enter your address and a price in DOI. Your address pays, and it receives the name and your change.
3. The app builds one transaction:
   - inputs: your coins and the output that holds the name today
   - outputs: the price to the owner (plus whatever the old name output held beyond the locked 0.01 DOI), the name with its current value and 0.01 DOI locked to you, your change
4. You sign your inputs in DoiWallet. Then the owner signs the name input and sends the transaction.

Nothing that decides where money goes comes from the ElectrumX server: your address is the one you typed, the owner's address is read from the name script, and every amount is read from raw transactions whose hashes match their txids.

#### Sell offers are switched off

A seller could sign first with SIGHASH_SINGLE|ANYONECANPAY and pass the half-signed transaction around as an offer. DoiWallet signs only with SIGHASH_ALL, and an offer signed that way cannot be completed by a buyer, so the app builds purchases only.

#### Practice exercise

- Pick a taken name and build a purchase PSBT for it.
- Before signing, find each output in DoiWallet: the price for the owner, the name for you, your change.

#### Additional Resources

- [BIP 174: PSBT Format](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki)
- [Understanding Bitcoin Transactions](https://developer.bitcoin.org/devguide/transactions.html)
- [Bitcoin Script](https://en.bitcoin.it/wiki/Script)