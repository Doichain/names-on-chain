import { writable } from 'svelte/store';
import { DOICHAIN, DOICHAIN_REGTEST } from '$lib/doichain/doichain.js';

export const electrumServers = [
	{ network:'doichain-mainnet', host: 'big-parrot-60.doi.works', port: 50004, protocol: 'wss' },
	{ network:'doichain-mainnet', host: 'ugly-bird-70.doi.works', port: 50004, protocol: 'wss' },
	{ network:'doichain-mainnet', host: 'pink-deer-69.doi.works', port: 50004, protocol: 'wss' },
	{ network:'doichain-mainnet', host: 'itchy-jellyfish-89.doi.works', port: 50004, protocol: 'wss' },
	{ network:'doichain-regtest', host: 'localhost', port: 8443, protocol: 'wss' },
];

export const networks = [
	{ id: 'doichain-mainnet', text: 'Doichain-Mainnet', value: DOICHAIN },
	{ id: 'doichain-regtest', text: 'Doichain-Regtest', value: DOICHAIN_REGTEST }
];

export const scanOpen = writable(false)
export const scanData = writable()
export const network = writable(DOICHAIN);
export const connectedServer = writable('offline')
export const electrumClient = writable();
export const electrumServerVersion = writable('');
export const electrumServerBanner = writable('disconnected');
export const electrumBlockchainBlockHeadersSubscribe = writable()
export const electrumBlockchainRelayfee = writable();
export const electrumBlockchainBlockHeaders = writable();


