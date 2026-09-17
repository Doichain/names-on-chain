# Under the hood

[Deutsch](under-the-hood.de.md)

For readers who know Bitcoin or Namecoin and want the bytes, the rules and the
trust model. Every number here was checked against Doichain Core v31.1.x, its
ElectrumX servers or the app's own tests.

## The name script

A name lives in front of an ordinary output script:

```
OP_NAME_DOI <name> <value> OP_2DROP OP_DROP <the holder's output script>
```

`OP_NAME_DOI` is `OP_10` (`0x5a`), Doichain's one-step name operation.
Registering `test` with the value `hello` for a P2PKH holder gives:

```
5a 04 74657374 05 68656c6c6f 6d 75 76a914…88ac
```

- Name and value are pushed **with their length in bytes**. A general script
  compiler would turn a one-byte value from `0x01` to `0x10` into `OP_1`…`OP_16`,
  and Doichain's parser reads no value then. An empty value is `00`.
- The holder's part is the real output script of the address, from
  `address.toOutputScript`. Copying only the hash out of a P2SH address would
  write a P2PKH script for a key nobody has.
- A transaction with a name output has **version `0x7100`**.

Namecoin's other operations still exist in Doichain Core: `OP_NAME_NEW`
(`OP_1`), `OP_NAME_FIRSTUPDATE` (`OP_2`), `OP_NAME_UPDATE` (`OP_3`). The parser
reads a name only with the number of pushes an operation expects: 1, 3 and 2,
and 2 for `OP_NAME_DOI`.

## How a server finds a name

ElectrumX does not index names. It indexes the script

```
OP_NAME_UPDATE <name> <empty value> OP_2DROP OP_DROP OP_RETURN
```

under its SHA-256 hash in reverse byte order. For `doichain` the script is
`53 08 646f69636861696e 00 6d 75 6a`. `nameops.nameIndexScriptHash` in
[doichainjs-lib](https://github.com/Doichain/doichainjs-lib) builds it; the app
normalizes the name to Unicode NFC first.

## Limits

| | |
| --- | --- |
| Name | at most 255 bytes (`MAX_NAME_LENGTH`) |
| Value | at most 520 bytes |
| Locked in a name output | 0.01 DOI (`NAME_LOCKED_AMOUNT`) |
| Expiry | 36,000 blocks after the last operation, 30 on regtest |

Doichain Core's consensus accepts values up to 1,023 bytes, but spending an
output runs its whole script, and the interpreter refuses every push longer than
520 bytes (`MAX_SCRIPT_ELEMENT_SIZE`). A longer value freezes the name and its
locked coin for good; Core's own RPCs stop at 520 (`MAX_VALUE_LENGTH_UI`), and so
does the app.

## The rules since the split

Doichain split on 11 September 2026 at block 431,017. Since that block, Doichain
Core v31.1.x applies strict ownership to `name_doi`:

- A **free or expired** name is registered without a name input; a registration
  that spends one is invalid.
- An **existing, unexpired** name may only be changed by a transaction that
  spends its previous name output, and that input must itself be a `name_doi`
  output with the same name. A name created the two-step way
  (`name_new` → `name_firstupdate`, twelve blocks apart) therefore stays in the
  `name_update` family.
- A transaction with a name input must carry a name output, and a transaction
  without a name operation must not spend one.

Before the split the old rules let anybody overwrite a registered name, which is
why "trustless trading" only holds from block 431,017 on.

## What the app builds

- **Inputs** carry the whole previous transaction (`nonWitnessUtxo`), so the
  wallet can check the amounts itself; SegWit inputs carry `witnessUtxo` too.
  Every amount and script is read from that raw transaction after checking that
  its hash is the txid being spent.
- **Coin selection** takes confirmed coins before unconfirmed ones, large before
  small, at most 20 of them.
- **The fee** is the estimated size in vbytes times the fee rate: at least 100
  swartz per vbyte, Doichain Core v31.1.x's `minrelaytxfee`. The public servers
  report 0.001 to 1 swartz per vbyte as their relay fee, so the app follows a
  server only upwards, to at most 1,000.
- **Change below 546 swartz** is dust; it goes to the miners instead of into an
  output.
- Before a PSBT leaves the builder, it is checked for version `0x7100` and
  exactly one name output.

## Signatures

- Buyer and seller both sign with `SIGHASH_ALL`, so each signature commits to all
  inputs and outputs. The buyer signs first, the holder of the name last; neither
  half works without the other.
- An open sell offer would need `SIGHASH_SINGLE|ANYONECANPAY`. DoiWallet signs
  only with `SIGHASH_ALL`, so the app builds purchases only.
- A name input at a **P2PKH** address is signed with the legacy sighash over the
  whole output script, name prefix included. A name input at a **P2WPKH**
  address needs BIP143 with the P2PKH template of the witness program as
  scriptCode. DoiWallet 7.0.4 signs the second case like the first, and Doichain
  Core refuses the transaction; the fix is in
  [doichainjs-lib 6.2.0](https://github.com/Doichain/doichainjs-lib) and reaches
  DoiWallet with its next update.

## What you still trust

- **The chain of a server.** ElectrumX sends no proofs. The app asks every server
  for block 431,017 and compares its hash with the one of the valid chain; a
  server that fails counts as a failed attempt. That says nothing about newer
  blocks, and a server can still leave a transaction out. The status line links
  the newest block in the explorer, so you can compare it yourself.
- **Amounts and addresses.** Neither comes from the server's JSON: amounts are
  read from raw transactions checked against their txids, the holder's address
  from the name script, and your own addresses are what you typed.
- **Your name, while you look it up.** Each check sends the hash of the name's
  index script to one server, which is why the app asks only when you press
  Check.

## Differences to Namecoin

| | Namecoin | Doichain |
| --- | --- | --- |
| Registration | `name_new` + `name_firstupdate`, 12 blocks apart | `name_doi` in one step |
| Expiry | 36,000 blocks | 36,000 blocks, 30 on regtest |
| Merged mining | AuxPoW chain ID 1 | AuxPoW chain ID 2 |
| Difficulty | retarget every 2016 blocks | DigiShield v3 per block since 431,017 |
| SegWit, Taproot | SegWit from 475,000, no Taproot | SegWit from 216,500, no Taproot |
| Name conventions | `d/` for .bit, `id/` for identities | `e/<64 hex>` for double opt-in proofs |
