import { electrumServerVersion, connectedServer, electrumServerBanner } from './doichain-store.js';

export async function setupElectrumConnection(network) {
	const { connectElectrum } = await import('./connectElectrum.js');

	await connectElectrum(network);
	console.log('electrum connected');

	window.addEventListener('offline', handleOffline);
	window.addEventListener('online', () => handleOnline(network));
}

function handleOffline() {
	console.log('offline');
	electrumServerVersion.set('server disconnected');
	connectedServer.set('offline');
	electrumServerBanner.set('server disconnected');
}

async function handleOnline(network) {
	console.log('online');
	console.log('connecting to electrum', network);
	const { connectElectrum } = await import('./connectElectrum.js');
	await connectElectrum(network);
}
