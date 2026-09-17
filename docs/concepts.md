# The ideas behind it

[Deutsch](concepts.de.md)

For readers who come from the web and meet a blockchain here for the first time.
Nothing on this page needs code.

## A chain of blocks is a public ledger

Doichain is a public ledger of coins. Everybody can read it, and everybody can
check it. A new page of the ledger, a block, is added about every ten minutes.
Once a page is deep enough in the pile, nobody can quietly change it.

## Coins are like banknotes

There is no account balance. Your address owns single pieces of money, each of
them one output of an earlier transaction, a UTXO. You spend such a piece whole
and get change back, exactly like paying 20 euros for a 12-euro book.

That is why a transaction lists **inputs** (the pieces you spend) and
**outputs** (who gets what, and the change back to you). What is left over
between them is the fee for the miners.

## A name lives in an output

Doichain adds names to this. A name sits in one output, in front of the usual
"pay to this address" part:

```
OP_NAME_DOI <name> <value> OP_2DROP OP_DROP <the address' script>
```

Whoever can spend that output owns the name. Moving the name means spending it
and writing the name into a new output.

Two things follow:

- **The 0.01 DOI in a name output are a deposit, not a fee.** They stay yours and
  move with the name. You get them back by spending the name output again.
- **A name is not forever.** 36,000 blocks, about 250 days, after its last
  operation, it is free again. Every registration or update sets the clock back
  to zero.

## A PSBT is a pre-filled form

The app never sees a private key. It fills in a transfer form: which pieces of
money to spend, who gets what, which name goes where. That form is a PSBT, a
partially signed transaction.

While nothing is signed, the form does nothing. You can copy it, show it, throw
it away. Only your wallet, which holds the key, can sign it, and only then can it
be sent. That is why the app can live on a static web page, and why it is never
worth attacking it for a key: there is none.

## The servers see your addresses

The app has no backend. It asks public ElectrumX servers, one of them at a time,
about names, addresses and transactions. Those servers learn which addresses and
names you are interested in, together with your IP address, and they could leave
something out. What they cannot do is make the app pay somewhere else: every
amount is read from the raw transaction it comes from, and every address in the
form is one you typed.

## Glossary

| Word | What it means |
| --- | --- |
| UTXO | One unspent piece of money, an output of an earlier transaction |
| Input, output | What a transaction spends, and where it goes |
| PSBT | A transaction that is complete except for the signatures |
| swartz | The cent of DOI: 1 DOI = 100,000,000 swartz |
| NameOp | A name operation in an output, `name_doi` in this workshop |
| Name value | Text that belongs to the name, at most 520 bytes |
| ElectrumX | A search service over the chain that the app asks |
| Script hash | The fingerprint under which a server finds an address or a name |
| Mempool | Transactions that are waiting to be put into a block |
| Block height | How many blocks came before; the app counts expiry in blocks |
| Fee rate | Price per byte of a transaction, in swartz per vbyte |
| Dust | A change amount too small to be worth an output; it goes to the miners |
| Confirmation | Your transaction is in a block |

## Where to go on

- [Wallet and safety](wallet-and-safety.md): real money, the valid chain, what
  to check before you sign.
- [Under the hood](under-the-hood.md): the same things in bytes and rules.
- [The lessons](README.md), from looking up a name to trading one.
