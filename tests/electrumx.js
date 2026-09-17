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
 * @param {{checkpointHex?: string}} [options] the header the server shows for
 *   block 431,017; another block makes it a server on the old chain
 */
export async function simulateElectrumX(page, { checkpointHex = headers.checkpoint.hex } = {}) {
	/** @type {Record<string, (params: any[]) => any>} */
	const answers = {
		'server.version': () => recorded.serverVersion,
		'server.banner': () => 'Simulated Doichain ElectrumX for the smoke test',
		'server.ping': () => null,
		'blockchain.relayfee': () => headers.relayfee,
		'blockchain.headers.subscribe': () => ({ height: headers.tip.height, hex: headers.tip.hex }),
		'blockchain.block.header': ([height]) =>
			height === headers.checkpoint.height ? checkpointHex : undefined,
		'blockchain.scripthash.get_history': ([hash]) =>
			recorded.responses['blockchain.scripthash.get_history'][hash] ?? [],
		'blockchain.scripthash.listunspent': ([hash]) =>
			recorded.responses['blockchain.scripthash.listunspent'][hash] ?? [],
		'blockchain.transaction.get': ([txid]) => recorded.responses['blockchain.transaction.get'][txid]
	};
	await page.routeWebSocket(/^wss?:\/\//, (ws) => {
		ws.onMessage((message) => {
			const request = JSON.parse(String(message));
			const answer = answers[request.method]?.(request.params ?? []);
			ws.send(
				JSON.stringify(
					answer === undefined
						? { jsonrpc: '2.0', id: request.id, error: { code: 1, message: 'not recorded' } }
						: { jsonrpc: '2.0', id: request.id, result: answer }
				)
			);
		});
	});
}
