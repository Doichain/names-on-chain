import {
	connection,
	electrumBlockchainBlockHeadersSubscribe,
	electrumBlockchainRelayfee,
	electrumClient,
	electrumServerBanner,
	electrumServers,
	electrumServerVersion,
	connectedServer
} from './doichain-store.js';
import { electrum } from '@doichain/doichainjs-lib';

let _electrumClient;
electrumClient.subscribe((value) => (_electrumClient = value));

export const MAX_RETRIES = 25;
const RETRY_DELAY = 5000;

/** Wait before replacing a dropped connection; doubles after every failed attempt, up to a minute. */
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 60000;

let connecting;
let reconnectTimer;
let reconnectDelay = RECONNECT_DELAY;

/**
 * Connect to a random electrumx server in the electrumServers list
 * with a certain network (doichain-mainnet,doichain-testnet,..)
 *
 * sets a couple of svelte store variables
 *
 * A dropped connection is replaced on its own. The browser's online event and
 * a reconnect can ask at the same moment; both then wait for the same attempt.
 *
 * @param _network
 * @returns {Promise<string>} the connected server url
 */
export const connectElectrum = async (_network) => {
	if (!_network) return;
	if (!connecting) {
		connecting = connect(_network).finally(() => {
			connecting = undefined;
		});
	}
	return connecting;
};

async function connect(_network) {
	// never leave an old connection open next to the new one
	_electrumClient?.close?.();

	/** servers that failed the chain check are only asked again when no other is left */
	const refused = new Set();
	let retries = 0;
	let randomServer;
	while (retries < MAX_RETRIES) {
		const networkNodes = electrumServers.filter((n) => n.network === _network.name);
		const candidates = networkNodes.filter((n) => !refused.has(n.host));
		const pool = candidates.length > 0 ? candidates : networkNodes;
		randomServer = pool[Math.floor(Math.random() * pool.length)];
		_electrumClient = new electrum.ElectrumClient(
			`${randomServer.protocol}://${randomServer.host}:${randomServer.port}/`
		);

		try {
			electrumClient.set(_electrumClient);
			await _electrumClient.connect();
			// ElectrumX serves whatever chain its node follows: check before trusting any answer
			const chain = await electrum.verifyChain(_electrumClient, _network);
			if (!chain.ok) {
				_electrumClient.close();
				throw Object.assign(new Error(`chain check failed: ${chain.reason}`), {
					reason: chain.reason
				});
			}
			break;
		} catch (error) {
			console.error('Connection failed, retrying...', error);
			retries++;
			if (error.reason) refused.add(randomServer.host);
			const state = { attempt: retries, maxAttempts: MAX_RETRIES, host: randomServer.host };
			if (retries < MAX_RETRIES) {
				connection.set({ status: error.reason ?? 'retrying', ...state });
				electrumServerVersion.set(`retrying (${retries})`);
				connectedServer.set(`retrying (${retries} - ${randomServer.host})`);
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
			} else {
				connection.set({ status: 'failed', ...state });
				throw new Error('Max retries reached. Unable to connect to Electrum server.');
			}
		}
	}

	const client = _electrumClient;

	// new blocks arrive as notifications once the headers are subscribed below
	client.on('blockchain.headers.subscribe', (params) => {
		if (client === _electrumClient && params?.[0])
			electrumBlockchainBlockHeadersSubscribe.set(params[0]);
	});

	// a connection that drops on its own gets replaced
	client.onclose = () => {
		if (client !== _electrumClient) return; // already replaced by a newer connection
		connection.set({
			status: 'reconnecting',
			attempt: 0,
			maxAttempts: MAX_RETRIES,
			host: randomServer.host
		});
		connectedServer.set('offline');
		scheduleReconnect(_network);
	};

	const _electrumServerVersion = await client.request('server.version');
	electrumServerVersion.set(_electrumServerVersion);
	console.log('electrumServerVersion', _electrumServerVersion);

	const _connectedServer =
		randomServer.protocol + '://' + randomServer.host + ':' + randomServer.port;
	connectedServer.set(_connectedServer);
	connection.set({
		status: 'connected',
		attempt: 0,
		maxAttempts: MAX_RETRIES,
		host: randomServer.host
	});
	console.log('network', _connectedServer);

	const _electrumServerBanner = await client.request('server.banner');
	console.log('electrumServerBanner', _electrumServerBanner);
	electrumServerBanner.set(_electrumServerBanner);

	const _electrumBlockchainBlockHeadersSubscribe = await client.request(
		'blockchain.headers.subscribe'
	);
	electrumBlockchainBlockHeadersSubscribe.set(_electrumBlockchainBlockHeadersSubscribe);

	const _electrumBlockchainRelayfee = await client.request('blockchain.relayfee');
	electrumBlockchainRelayfee.set(_electrumBlockchainRelayfee);

	reconnectDelay = RECONNECT_DELAY;
	return _connectedServer;
}

function scheduleReconnect(_network) {
	if (reconnectTimer) return;
	reconnectTimer = setTimeout(async () => {
		reconnectTimer = undefined;
		try {
			await connectElectrum(_network);
		} catch (error) {
			console.error('Reconnect failed', error);
			reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
			scheduleReconnect(_network);
		}
	}, reconnectDelay);
}

export function getConnectionStatus(server) {
	if (!server || server === 'offline' || server === 'connecting' || server.includes('retry')) {
		return {
			isConnected: false,
			serverName: server || 'No server connected'
		};
	}
	return {
		isConnected: true,
		serverName: server
	};
}
