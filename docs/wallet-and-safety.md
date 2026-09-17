# Wallet and safety

[Deutsch](wallet-and-safety.de.md)

The lessons work with real money on Doichain mainnet. Read this before you
register or trade a name.

## Mainnet and the valid chain

- The app talks to ElectrumX servers on Doichain mainnet. A registration locks
  0.01 DOI in the name output and pays a transaction fee; a purchase moves the
  price to the seller.
- Doichain split on 11 September 2026. The valid chain is the one of Doichain
  Core v31.1.5, from block 431,017 on, and the app's servers follow it.
- Look up transactions and names on
  [doi-explorer.le-space.de](https://doi-explorer.le-space.de). The old explorer
  at explorer.doichain.org still shows the other chain, with different blocks,
  names and confirmations.

## Who holds the keys

- The app never sees a private key. It builds an unsigned PSBT (a partially
  signed transaction) and shows it as a QR code.
- DoiWallet signs and sends the transaction. Before you sign, find every output
  in DoiWallet: the name with its value and holder, the amounts that go to
  others, and your change.
- DoiWallet signs with `SIGHASH_ALL` only. That is why the app builds purchases,
  where the buyer signs first and the holder of the name signs last, but no
  sell offers.
- DoiWallet 7.0.4 cannot sign a name input held by a P2WPKH address (`dc1q…`)
  correctly, and Doichain Core refuses the transaction. Lesson 5 warns about
  such names. The fix is in doichainjs-lib 6.2.0 and reaches DoiWallet with its
  next update.

## What the servers can and cannot do

- The app reads amounts and scripts from the raw previous transactions and
  checks that they hash to the txids it spends. A server cannot make it pay more
  than it shows.
- A server can still leave transactions out. A name it does not report looks
  free. Check names that matter to you on the explorer.
- Every address you enter and every name you check reaches an ElectrumX server.

## Registering a name

- **Front-running:** `name_doi` registers a name in one step. Whoever sees your
  registration in the mempool can send a registration for the same name, and
  the one mined first wins. Namecoin's two steps `name_new` and
  `name_firstupdate` hide the name until it is committed, but a name registered
  that way cannot be transferred with `name_doi` later.
- **Expiry:** a name expires 36,000 blocks, about 250 days, after its last
  operation. After that, anybody can register it again.
- **Length:** a name takes at most 255 bytes on chain, and the app asks for at
  least 4 characters. `ü` takes two bytes.
- **Look-alikes:** names that look the same can consist of different bytes. The
  app registers names in Unicode NFC and warns about names beyond ASCII and
  names that mix alphabets.
- **Holder address:** in this app only legacy addresses (`M…`, `N…`) and P2WPKH
  addresses (`dc1q…`) can hold a name. A name sent to a P2SH (`6…`) or Taproot
  address could never be spent again, so the app refuses such addresses.

## Trading a name

- A purchase is one transaction: either the seller gets the price and the buyer
  gets the name, or nothing happens.
- Doichain enforces strict name ownership from block 431,017 on. Before that
  block, a registration could overwrite a name that someone else held.

## Practising

The app is fixed to mainnet for now. A regtest mode, for practising with
Doichain Core v31.1.5 and worthless coins, is planned. Until then, use small
amounts.

## Privacy

- The app has no server of its own. The ElectrumX servers it connects to see the
  addresses and names you enter.
- Older commits of this repository contain a test PSBT with real mainnet
  addresses and a zipped build (`public.zip`, 1.3 MB). They stay in the history;
  the lessons don't need them.
