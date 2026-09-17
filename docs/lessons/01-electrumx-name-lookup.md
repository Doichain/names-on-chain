# Lesson 1: Talking to the chain

[Deutsch](01-electrumx-name-lookup.de.md) · Branch [`lesson01`](https://github.com/Doichain/names-on-chain/tree/lesson01) · [Live demo](https://doichain.github.io/names-on-chain/lesson01/) · Next: [Lesson 2](02-utxos-name-coins-expiry.md)

The app connects to a Doichain server and looks up names: who holds a name, and until which block.

## What you learn

- How a web page talks to a blockchain server over a WebSocket.
- How a server finds a name: not by its text, but by the hash of a small script built from it.
- When a name is free, taken or expired.

## Start

```bash
git clone -b lesson01 https://github.com/Doichain/names-on-chain.git
cd names-on-chain
corepack enable && pnpm install --frozen-lockfile
pnpm dev
```

You need Node 22 (see `.nvmrc`). Open the address that `pnpm dev` prints, usually http://localhost:5173.

## Checkpoint

- Within a second or two the status line under the title says **Connected · Mainnet · block …** and names the server.
- Type `doichain`. The app says the name is available: it was registered before and expired at block 389030.
- Type `test/v31.1.4-canary-20260913`, a name registered after the chain split. The app names the address that holds it and the block until which it is theirs.

## How it works

### 1. Connecting to a server

`src/routes/+layout.js` starts the connection when the page loads. `src/lib/doichain/connectElectrum.js` picks one of the servers listed in `doichain-store.js` at random and opens a WebSocket to it with `electrumx-client.js`. Requests and answers are JSON-RPC messages.

A server answers with whatever chain its node follows, and it sends no proof. So before the app trusts any answer, it asks for block 431,017, the first block after Doichain's chain split, and compares that block's hash with the one it knows (`chainCheck.js`). A server on the old chain counts as a failed attempt, and the app tries another one. `ConnectionStatus.svelte` shows each step.

### 2. Checking a name

`src/lib/components/pricing.svelte` hands what you type to `checkName` in `nameValidation.js`. It waits until you stop typing for 300 milliseconds (`debounce.js`), then:

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
- **What the checkpoint proves.** Only that the server's chain contains block 431,017 of the valid chain. It proves nothing about newer blocks or about any transaction, and a server can still leave data out. The explorer link next to the server name lets you compare the newest block yourself.
- **Why the split matters for names.** Before block 431,017 the old rules let anybody overwrite a registered name. Since then only a transaction that spends the name's previous output can change it.

</details>

## Common problems

- **The status line keeps counting attempts.** Your network may block WebSockets on port 50004. Try another network.
- **"does not follow the valid Doichain chain".** That server is behind or on the old chain. The app moves on to another server by itself.
