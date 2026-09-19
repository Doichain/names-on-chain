# Lesson 1: Talking to the chain

[Deutsch](01-electrumx-name-lookup.de.md) · App [`apps/lesson01`](../../apps/lesson01) · [Live demo](https://doichain.github.io/names-on-chain/lesson01/) · Next: [Lesson 2](02-utxos-name-coins-expiry.md)

The app connects to a Doichain server and looks up names: who holds a name, and until which block.

![The app after a name check: the status line names chain, block and server, and the message under the field names the address that holds the name](../img/lesson01.png)

## What you learn

- How a web page talks to a blockchain server over a WebSocket.
- How a server finds a name: not by its text, but by the hash of a small script built from it.
- When a name is free, taken or expired.

## Where the code lives

The workshop is one repository. This lesson is the app `apps/lesson01`, and it holds
what this lesson writes: the name lookup (`nameShow.js`), the coins of an address
(`nameDoi.js`), the name check and the page. Two kinds of code come from outside it,
and the import always says which:

- `packages/doichain` — what no lesson teaches on its own: the ElectrumX connection,
  the store, the small components, the two translation catalogues, and the recorded
  server answers the tests speak to.
- The later lessons import from **this** app. Lesson 2 does not copy the name lookup,
  it writes `import { nameShow } from '@names-on-chain/lesson01/doichain/nameShow.js'`.
  So when lesson 4 reads `@names-on-chain/lesson03`, it means: you wrote this in
  lesson 3.

A lesson keeps its own copy of a file only when it changes it — and then the change
is the lesson.

## Start

```bash
git clone https://github.com/Doichain/names-on-chain.git
cd names-on-chain
corepack enable && pnpm install --frozen-lockfile
pnpm --filter @names-on-chain/lesson01 dev
```

You need Node 22 (see `.nvmrc`). Open the address the command prints, usually http://localhost:5173.

### Write it yourself

```bash
pnpm start-state lesson01
```

That empties the part of `nameShow.js` this lesson is about — looking a name up on the server — and leaves a
TODO in its place. The app still builds and still starts; it stops exactly there. When
you want the answer back:

```bash
git checkout apps/lesson01
```

## Checkpoint

- Within a second or two the status line under the title says **Connected · Mainnet · block …** and names the server.
- Type `doichain` and click **Check name**. The app says the name is available: it was registered before and expired at block 389030.
- Type `test/v31.1.4-canary-20260913`, a name registered after the chain split, and check it. The app names the address that holds it and the block until which it is theirs.
- Type something else. The message disappears and the field says **Not checked yet**: nothing goes to a server until you ask.

## How it works

### 1. Connecting to a server

`src/routes/+layout.js` starts the connection when the page loads. `packages/doichain/src/connectElectrum.js` picks one of the servers listed in `doichain-store.js` at random and opens a WebSocket to it with `electrum.ElectrumClient` from `@doichain/doichainjs-lib`. Requests and answers are JSON-RPC messages; the client gives up on one that stays unanswered, pings a silent server so the connection is not dropped, and says through `onclose` when it is gone. Which server to try next stays the app's decision.

A server answers with whatever chain its node follows, and it sends no proof. So before the app trusts any answer, it asks for block 431,018 and compares that block's hash with the one it knows (`electrum.verifyChain`, with the checkpoint the library carries). A server on the old chain counts as a failed attempt, and the app tries another one. `ConnectionStatus.svelte` shows each step.

Why 431,018 and not 431,017, the block the new rules took effect with? Because that one is on both chains: Doichain never enforced the difficulty field, so the old nodes accepted it as well. Both chains build their next block on it, and there they part.

### 2. Checking a name

`apps/lesson01/src/lib/components/pricing.svelte` hands the name to `checkName` in `nameValidation.js` when you click **Check name** or press Enter – never while you type, because every check hands the name to a server. `debounce.js` still sits in front of it, so a second click within 300 milliseconds asks only once. Then:

1. refuses names with spaces, with fewer than 4 characters or with more than 255 bytes,
2. asks the server for the history of the name (`nameShow.js`),
3. takes the newest operation and works out when the name expires (`nameExpiry.js`).

### 3. How the server finds a name

The server does not index names by their text. It indexes a script built from the name,

```
OP_NAME_UPDATE <name> <empty value> OP_2DROP OP_DROP OP_RETURN
```

under the SHA-256 hash of that script. `nameops.nameIndexScriptHash` from [doichainjs-lib](https://github.com/Doichain/doichainjs-lib) builds it. With this hash, `blockchain.scripthash.get_history` returns every transaction that wrote the name, and `blockchain.transaction.get` returns each transaction with its name operation already decoded.

### 4. Free, taken or expired

A name belongs to the address of its newest operation for 36,000 blocks, about 250 days. Then anybody may register it again. An operation that is still waiting to be mined has no block yet, and the app says so instead of guessing an expiry.

## Exercise

Look up a name without the app. Save this as `name-history.mjs` in the project folder and run `node name-history.mjs doichain`:

```js
import { nameops } from '@doichain/doichainjs-lib';

const name = (process.argv[2] ?? 'doichain').normalize('NFC');
const socket = new WebSocket('wss://big-parrot-60.doi.works:50004/');
const waiting = new Map();
let lastId = 0;

const request = (method, params = []) =>
	new Promise((resolve, reject) => {
		waiting.set(++lastId, { resolve, reject });
		socket.send(JSON.stringify({ jsonrpc: '2.0', id: lastId, method, params }) + '\n');
	});

socket.onmessage = (event) => {
	const message = JSON.parse(event.data);
	const call = waiting.get(message.id);
	if (!call) return; // a notification, not an answer
	waiting.delete(message.id);
	if (message.error) call.reject(new Error(message.error.message));
	else call.resolve(message.result);
};

socket.onopen = async () => {
	const history = await request('blockchain.scripthash.get_history', [
		nameops.nameIndexScriptHash(name)
	]);
	for (const { tx_hash, height } of history) {
		const tx = await request('blockchain.transaction.get', [tx_hash, true]);
		const output = tx.vout.find((vout) => vout.scriptPubKey.nameOp);
		const { op, value } = output.scriptPubKey.nameOp;
		console.log(`block ${height}: ${op} to ${output.scriptPubKey.address}, value "${value}"`);
	}
	socket.close();
};
```

It prints one operation in block 353030. Add 36,000 and you get 389030, the block the app names.

Then change the app: for a taken name, also show how many days are left, at ten minutes per block.

<details>
<summary><strong>Under the hood</strong></summary>

- **The index script, byte by byte.** For `doichain` it is `53 08 646f69636861696e 00 6d 75 6a`: `OP_3` (which Namecoin calls `OP_NAME_UPDATE`), a push of 8 bytes with the name, `OP_0` as the empty value, `OP_2DROP`, `OP_DROP`, `OP_RETURN`. The server stores the SHA-256 hash of these bytes in reverse byte order.
- **Bytes, not characters.** Names are stored as UTF-8 bytes; `münchen` takes 8 of them. The app normalizes a name to Unicode NFC before it hashes it, and it warns about characters beyond ASCII and about names that mix alphabets: names that look the same can differ in their bytes.
- **Requests and notifications.** A request carries an `id`, and its answer carries the same `id`. After `blockchain.headers.subscribe`, new blocks arrive as notifications without an `id`. The client pings every 90 seconds, because ElectrumX closes silent connections, and a request fails after 30 seconds without an answer.
- **What the checkpoint proves.** Only that the server's chain contains block 431,018 of the valid chain – the first block the two chains do not share. It proves nothing about newer blocks or about any transaction, and a server can still leave data out. The explorer link next to the server name lets you compare the newest block yourself.
- **Why the split matters for names.** Before block 431,017 the old rules let anybody overwrite a registered name. Since then only a transaction that spends the name's previous output can change it.

</details>

## Common problems

- **The status line keeps counting attempts.** Your network may block WebSockets on port 50004. Try another network.
- **"does not follow the valid Doichain chain".** That server is behind or on the old chain. The app moves on to another server by itself.
