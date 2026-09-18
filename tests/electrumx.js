import { readFileSync } from 'node:fs';

/** @param {string} file - in src/lib/doichain/__fixtures__ */
const fixture = (file) =>
	JSON.parse(
		readFileSync(new URL(`../src/lib/doichain/__fixtures__/${file}`, import.meta.url), 'utf8')
	);

const recorded = fixture('core31-electrumx.json');
const headers = fixture('chain-headers.json');

export { recorded, headers };

/**
 * Answers the app's WebSocket like a Doichain ElectrumX server would, from
 * answers recorded on a live server. Nothing leaves the test machine.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [options]
 * @param {string} [options.checkpointHex] the header the server shows for block
 *   431,018, the first block the two chains do not share; another one makes it
 *   a server on the old chain
 * @param {number} [options.tipHeight] the newest block the server knows; a
 *   height far ahead of the recorded name operations lets names expire
 * @param {Record<string, number>} [options.delay] milliseconds a method waits
 *   before it answers, to let a second question overtake the first
 * @returns {Promise<{drop: () => void}>} `drop` closes the connection, as a
 *   server that goes away does
 */
export async function simulateElectrumX(
	page,
	{ checkpointHex = headers.checkpoint.hex, tipHeight = headers.tip.height, delay = {} } = {}
) {
	/** @type {Record<string, (params: any[]) => any>} */
	const answers = {
		'server.version': () => recorded.serverVersion,
		'server.banner': () => 'Simulated Doichain ElectrumX for the smoke test',
		'server.ping': () => null,
		'blockchain.relayfee': () => headers.relayfee,
		'blockchain.headers.subscribe': () => ({ height: tipHeight, hex: headers.tip.hex }),
		'blockchain.block.header': ([height]) =>
			height === headers.checkpoint.height ? checkpointHex : undefined,
		'blockchain.scripthash.get_history': ([hash]) =>
			recorded.responses['blockchain.scripthash.get_history'][hash] ?? [],
		'blockchain.scripthash.listunspent': ([hash]) =>
			recorded.responses['blockchain.scripthash.listunspent'][hash] ?? [],
		'blockchain.transaction.get': ([txid]) => recorded.responses['blockchain.transaction.get'][txid]
	};
	/** the connection the app is using right now, so a test can pull it away */
	let socket;

	await page.routeWebSocket(/^wss?:\/\//, (ws) => {
		socket = ws;
		ws.onMessage((message) => {
			const request = JSON.parse(String(message));
			const answer = answers[request.method]?.(request.params ?? []);
			const reply = JSON.stringify(
				answer === undefined
					? { jsonrpc: '2.0', id: request.id, error: { code: 1, message: 'not recorded' } }
					: { jsonrpc: '2.0', id: request.id, result: answer }
			);
			const wait = delay[request.method];
			if (wait) setTimeout(() => ws.send(reply), wait);
			else ws.send(reply);
		});
	});

	return { drop: () => socket?.close() };
}
