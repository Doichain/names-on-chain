import { writable } from 'svelte/store';
import { DOICHAIN, DOICHAIN_REGTEST } from './doichain.js';

export const electrumServers = [
	{ network: 'doichain-mainnet', host: 'big-parrot-60.doi.works', port: 50004, protocol: 'wss' },
	{ network: 'doichain-mainnet', host: 'ugly-bird-70.doi.works', port: 50004, protocol: 'wss' },
	{ network: 'doichain-mainnet', host: 'pink-deer-69.doi.works', port: 50004, protocol: 'wss' },
	{
		network: 'doichain-mainnet',
		host: 'itchy-jellyfish-89.doi.works',
		port: 50004,
		protocol: 'wss'
	},
	{ network: 'doichain-regtest', host: 'localhost', port: 8443, protocol: 'wss' }
];

export const networks = [
	{ id: 'doichain-mainnet', text: 'Doichain-Mainnet', value: DOICHAIN },
	{ id: 'doichain-regtest', text: 'Doichain-Regtest', value: DOICHAIN_REGTEST }
];

export const scanOpen = writable(false);
export const scanData = writable();
export const network = writable(DOICHAIN);

/**
 * Where the connection to ElectrumX stands, for the status line:
 * connecting (first attempt), connected (host), retrying (attempt of maxAttempts,
 * host = the server that failed), wrongChain or unverified (host failed the
 * chain check), reconnecting (a connection dropped), offline (no network),
 * failed (gave up after maxAttempts).
 *
 * @type {import('svelte/store').Writable<{status: string, attempt: number, maxAttempts: number, host?: string}>}
 */
export const connection = writable({ status: 'connecting', attempt: 0, maxAttempts: 25 });

/** The connected server's URL, or 'connecting', 'offline', 'retrying (n - host)' */
export const connectedServer = writable('connecting');
export const electrumClient = writable();
export const electrumServerVersion = writable('');
export const electrumServerBanner = writable('disconnected');
export const electrumBlockchainBlockHeadersSubscribe = writable();
export const electrumBlockchainRelayfee = writable();
export const electrumBlockchainBlockHeaders = writable();
