# Names-On-Chain 
# A Doichain - PSBT Workshop

## Description
This workshop in five lessons shows how to look up, register and trade Doichain names.
The app builds the NameOp transactions as PSBTs and hands them over as animated QR codes;
DoiWallet signs and sends them. No private key is needed in the browser.

Live demo of this lesson: https://doichain.github.io/names-on-chain/lesson01/

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
