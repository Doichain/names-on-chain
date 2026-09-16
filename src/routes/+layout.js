import { network } from '$lib/doichain/doichain-store.js'  // import svelte store
import { browser } from '$app/environment'; // if we are not rendering on a server side this is true
import { setupElectrumConnection } from '$lib/doichain/electrumConnection.js'; // connects and manages the connection to an electrums server

export const prerender = true; // build an empty page shell with relative asset paths, so the app runs under any sub-path (GitHub Pages, IPFS gateways)
export const ssr = false; // everything else happens in the browser, so server side rendering is switched off for the whole svelte app

let _network;
network.subscribe((value) => _network = value);

if (browser) {
    setupElectrumConnection(_network);
}